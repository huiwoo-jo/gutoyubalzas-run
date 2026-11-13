# 로컬 정적 서버 (캐시 끔)
# .env.local 중 PUBLIC_ENV만 /js/env.js로 제공
# 실행: python3 serve.py (http://localhost:8765)
# 배포: python3 serve.py build (js/env.js 생성, 환경 변수 우선)
import http.server
import json
import os
import sys



ROOT = os.path.dirname(os.path.abspath(__file__))
PUBLIC_ENV = ['SUPABASE_URL', 'SUPABASE_KEY']   # 브라우저에 공개할 키


def read_env(path=os.path.join(ROOT, '.env.local')):
    env = {}
    if os.path.exists(path):
        for line in open(path, encoding='utf-8'):
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                k, v = line.split('=', 1)
                env[k.strip()] = v.strip().strip('"\'')
    return env


def env_module():
    env = {**read_env(), **{k: os.environ[k] for k in PUBLIC_ENV if os.environ.get(k)}}
    return ''.join(f'export const {k} = {json.dumps(env.get(k, ""))};\n' for k in PUBLIC_ENV).encode()


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path.split('?')[0] == '/js/env.js':   # .env.local에서 생성
            body = env_module()
            self.send_response(200)
            self.send_header('Content-Type', 'text/javascript; charset=utf-8')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        super().do_GET()

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()


class Server(http.server.ThreadingHTTPServer):
    # 기본 대기열(5)이면 동시 요청 시 연결 끊김 (ERR_CONNECTION_RESET)
    request_queue_size = 128


def build():
    body = env_module()
    os.makedirs(os.path.join(ROOT, 'js'), exist_ok=True)
    open(os.path.join(ROOT, 'js', 'env.js'), 'wb').write(body)
    missing = [k for k in PUBLIC_ENV if f'{k} = ""' in body.decode()]
    print('js/env.js 생성' + (f' (비어 있음: {", ".join(missing)} → 광고판 없이 동작)' if missing else ''))


if __name__ == '__main__':
    if sys.argv[1:2] == ['build']:
        build()
    else:
        port = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
        os.chdir(ROOT)
        Server(('', port), NoCacheHandler).serve_forever()
