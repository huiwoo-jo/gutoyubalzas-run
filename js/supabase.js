// Supabase REST: 광고판, 랭킹 공용 (키는 js/env.js, publishable 키만)
let base = '', key = '';

export const sbReady = import('./env.js')
  .catch(() => ({}))
  .then(env => {
    base = (env.SUPABASE_URL || '').replace(/\/$/, '');
    key = env.SUPABASE_KEY || '';
    return !!(base && key);
  });

export const storageUrl = path => `${base}/storage/v1/object/public/images/${path.split('/').map(encodeURIComponent).join('/')}`;

// path: 'table?query', init: fetch 옵션 (headers 합침)
export async function sb(path, init = {}) {
  if (!(await sbReady)) throw new Error('SUPABASE_URL, SUPABASE_KEY 없음');
  const res = await fetch(`${base}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: key, 'Content-Type': 'application/json', ...init.headers },   // publishable 키는 JWT가 아니라 apikey만
  });
  if (!res.ok) throw new Error(`${res.status} ${path.split('?')[0]}`);
  return res;
}
