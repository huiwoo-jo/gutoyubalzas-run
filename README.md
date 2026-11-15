# 천진우와 구토유발자들 RUN

천진우와 구토유발자들 멤버가 등장하는 도트 무한 달리기 웹 게임입니다.

## 실행

이미지를 불러오기 때문에 파일을 바로 열지 말고 정적 서버로 실행합니다.
`serve.py`는 브라우저 캐시를 끈 서버라, 코드를 고친 뒤 새로고침만 해도 바로 반영됩니다.

```bash
python3 serve.py
```

브라우저에서 http://localhost:8765 접속

## 파일 구조

빌드 도구 없이 브라우저 기본 모듈(ES modules)로 나눠져 있습니다.

| 파일 | 역할 |
| --- | --- |
| `index.html` | 화면 뼈대 (캔버스, 이름 입력칸) |
| `css/style.css` | 스타일 |
| `js/config.js` | 설정 값 (속도, 점수, 배경 순서, 멤버) |
| `js/assets.js` | 이미지 불러오기 |
| `js/storage.js` | 랭킹 (서버), 마지막 이름 (브라우저) |
| `js/supabase.js` | Supabase 접속 (광고판, 랭킹 공용) |
| `js/game.js` | 게임 상태와 규칙 (물리, 합류·이탈, 장애물, 음표, 점수) |
| `js/render.js` | 화면 그리기 |
| `js/input.js` | 키보드 · 터치 조작, 이름 입력 |
| `js/bgm.js` | 브금 (유튜브 재생목록에서 랜덤 곡) |
| `js/sfx.js` | 효과음, 타이틀 브금 |
| `js/joincard.js` | 멤버 합류 카드 (악기 든 멤버, 왼쪽에서 슬라이드, 게임 화면 크기에 맞춰 축소) |
| `js/ads.js` | 빈 벽 광고판 (Mortals Log의 가장 가까운 공연 · 구매 가능한 앨범) |
| `js/main.js` | 시작점 (로딩, 게임 루프) |
| `assets/characters/멤버/` | 멤버별 달리기(`멤버_run1~3`) · 점프(`멤버_jump`) · 악기 든 모습(`멤버_악기`, 합류 카드) |
| `assets/backgrounds/` | 배경 패널(`bg_far1~11`) · 바닥(`bg_ground`) |
| `assets/common/` | 시작 화면 (배경, 조명, 로고, START 버튼, 멤버 악기) · 피버 타임 무대 |
| `assets/icons/` | 버튼 아이콘 (흰색 도트 svg: `rank`, `instagram`, `help`, `home`, `info`, `slide`, `jump`, 누른 상태 `slide_on`, `jump_on`, `rotate_phone`), 파비콘(`favicon`, `apple-touch-icon`: 기본 우웩이), 파일만 바꾸면 교체 |
| `assets/obstacles/` | 장애물 이미지 (`amp`: 바닥 앰프, `truss`: 천장 조명 트러스) |
| `assets/sounds/` | 타이틀 브금(`title_bgm_icecream`: '아이스크림' 8bit 편곡 버전), 효과음(`jump`, `slide`, `eat`, `join_멤버`, `gameover`) |
| `assets/uwek/` | 우웩이 (`uwek_멤버`: 진행 바 아이콘, `uwek_jinwoo`: 하트, `uwek_all`: 단체) |

## 조작

| 동작 | 키보드 | 터치 |
| --- | --- | --- |
| 시작 | START 버튼 클릭 | START 버튼 탭 |
| 점프 | Space / ↑ | JUMP 버튼 (오른쪽 아래) 또는 화면 오른쪽 탭 |
| 슬라이딩 | ↓ 누르고 있기 | SLIDE 버튼 (왼쪽 아래) 또는 화면 왼쪽 누르고 있기 |
| 자동 플레이 (테스트용) | A | `?auto` 주소 |
| 랭킹 이름 등록 (게임 오버 후) | 이름 입력 후 등록 버튼 (취소 버튼: 건너뛰기) | 같음 |

- **휴대폰, 태블릿** (터치 기기): 처음에 가로로 돌리라는 안내가 전체 화면으로 뜨고, 누르면 시작 화면으로 넘어갑니다. 지원하는 브라우저(안드로이드 크롬 등)는 이때 전체 화면, 가로 고정을 시도합니다 (iOS는 지원 안 함).
- 플레이 중에는 흰색 SLIDE, JUMP 버튼이 나오고, 세로로 돌리면 일시정지됩니다.

## 규칙

- **모으기**: 천진우로 시작해 배경의 멤버 스티커 패널이 나올 때마다 멤버가 합류합니다 (기토 → 법영이 → 양동훈 → 리장단).
- **피버 타임**: 5명이 모인 뒤 무대(시작 화면 배경)로 바뀌어 조명이 번쩍이고, 장애물 없이 음표가 쏟아집니다 (음표 점수 ×2).
- 피버가 끝나면 천진우 혼자부터 다시 모읍니다 (ROUND 2, 3 …). 속도는 계속 빨라집니다.
- **하트**: 3개로 시작해 부딪힐 때마다 1개씩 줄고, 0개면 게임 오버입니다. 길에 떠 있는 하트(우웩이)를 먹으면 1개 회복합니다 (최대 3개).
- 점수 = 달린 거리 + 장애물 회피 + 아슬아슬 회피 + 음표, 모두 함께 달리는 멤버 수만큼 배율이 붙습니다.
- 게임 오버 후 이름을 입력하면 랭킹에 등록되고 몇 위인지 알려 줍니다 (화면에는 상위 5명). 기록은 Mortals Log Supabase의 `run_rankings` 테이블에 저장되며, 자동 플레이 기록은 저장되지 않습니다.
- 랭킹 테이블은 `supabase/run_rankings.sql`을 Supabase SQL Editor에서 한 번 실행해 만듭니다 (누구나 읽기, 추가만 가능).
- 기록마다 점수와 함께 라운드, 거리, 음표 수, 날짜를 저장하고, 시작 화면의 트로피 버튼에서 오늘, 전체, 내 기록을 볼 수 있습니다. 내 기록은 브라우저마다 만든 무작위 ID로 모읍니다 (개인정보 아님, 다른 브라우저나 기기 기록은 따로). 저장 항목은 이름 입력칸, 랭킹 창, 만든 사람들 창의 '기록 저장 안내'에서 볼 수 있습니다.
- 플레이 중 왼쪽 위에 전체 1위(`BEST`)와 내 최고 기록(`MY`)이 함께 나옵니다.
- 게임 중 다른 창을 누르거나 탭을 바꾸면 일시정지되고, Space 또는 클릭으로 다시 시작합니다.

## 브금

시작할 때마다 유튜브 재생목록에서 랜덤으로 한 곡을 틀고, 게임 오버 화면에 이번 판 곡 제목을 보여 줍니다.

- `js/config.js`의 `BGM_PLAYLIST`에 재생목록 ID(주소의 `list=` 뒤 값)를 넣습니다. 채널 전체 영상을 쓰려면 채널 ID(`UC…`)의 앞 두 글자를 `UU`로 바꿔 넣습니다.
- 유튜브 정책상 플레이어는 숨기지 않고 화면 오른쪽 위에 200×200으로 보여 줍니다.
- 휴대폰, 태블릿(터치 기기)은 화면이 작아 플레이어가 게임을 가리므로, 유튜브 대신 게임 중에도 타이틀 브금('아이스크림' 8bit 편곡 버전)을 반복 재생합니다 (게임 오버 곡 목록 없음).
- 퍼가기가 막힌 영상은 건너뛰고, 인터넷이 없으면 브금 없이 진행됩니다. 유튜브 광고가 나올 수 있습니다.
- 시작 화면, 게임 오버 화면(효과음이 끝난 뒤)에는 타이틀 브금(`assets/sounds`)이 나옵니다. 브라우저가 자동 재생을 막으면 START 외의 곳을 누르면 타이틀 브금이 나옵니다.
- 점프, 슬라이딩, 음표 먹기, 멤버 합류, 게임 오버 효과음이 나옵니다. 크기는 `SFX_VOLUME`, `TITLE_BGM_VOLUME`으로 조절합니다.

## 광고판

빈 벽 패널(`bg_far1`)마다 광고판이 붙고, Mortals Log(Supabase)의 **가장 가까운 공연**과 **구매 링크가 있는 앨범** 중 하나가 랜덤으로 나옵니다. 주소·키 설정은 아래 '키 설정'을 보세요. 키가 없거나 불러오지 못하면 광고판 없이 게임만 진행됩니다.

## 키 설정

광고판용 Supabase 주소·키는 코드에 넣지 않고 환경 변수로 관리합니다. 브라우저가 읽는 `js/env.js`로 바뀌며, 이 파일은 git에 올리지 않습니다.

| 이름 | 값 |
| --- | --- |
| `SUPABASE_URL` | Mortals Log Supabase 프로젝트 주소 |
| `SUPABASE_KEY` | **publishable(anon) 키만** (service_role 키 금지) |

- **로컬**: 프로젝트 폴더의 `.env.local`에 위 두 값을 적고 `python3 serve.py`로 실행하면, 서버가 `/js/env.js`를 그때그때 만들어 줍니다.
- **배포**: 배포 서비스의 환경 변수에 위 두 값을 넣고, 빌드 명령을 `python3 serve.py build`로 지정합니다. 이 명령이 `js/env.js` 파일을 만들고, 그 뒤 프로젝트 폴더를 그대로 정적 사이트로 올리면 됩니다. 환경 변수가 `.env.local`보다 우선합니다.
- **Vercel**: `vercel.json`에 빌드 명령과 출력 폴더가 들어 있어, 저장소를 가져온 뒤 Settings > Environment Variables에 `SUPABASE_URL`, `SUPABASE_KEY`만 넣으면 됩니다. `main`에 올라가면 자동으로 배포됩니다.

## 임시 처리된 에셋

아래는 전용 에셋이 없어 코드로 대신 그리고 있습니다. `assets/`에 추가되면 교체합니다.

- 슬라이딩 / 넘어지기: `run1` 이미지를 찌그러뜨리거나 눕혀서 표현
- 음표
- 장애물(앰프, 조명 트러스)은 `assets/obstacles/amp.png`, `truss.png` 이미지 파일입니다. 그림만 바꾸려면 png만 교체하고, 크기와 충돌 범위는 `js/config.js`의 `OBSTACLES`에서 바꿉니다.

## 설정 값

`js/config.js`에서 속도(`SPEED`, `SPEED_UP`, `MAX_SPEED`), 배경 순서(`PANEL_ORDER`), 점수(`NOTE_SCORE` 등)를 바꿀 수 있습니다.

## 테스트

주소에 `?debug`를 붙이면 브라우저 콘솔에서 `window.game.state`로 게임 상태를 보고 바꿀 수 있습니다. (예: `game.state.dist = 9000`으로 기토 합류 구간으로 이동)

## 만든 사람들

천진우와 구토유발자들을 응원하는 팬이 만든 비공식 게임입니다. 캐릭터와 음악의 권리는 각 권리자에게 있습니다.
시작 화면 오른쪽 위의 `i` 버튼(게임 오버 화면에도 있음)에서 볼 수 있습니다. 그 옆에는 `?` 플레이 방법, 인스타그램(@gutoyubalzas) 바로가기, 트로피(랭킹)가 있습니다.

| 역할 | 이름 |
| --- | --- |
| 출연 | 천진우와 구토유발자들 ([@gutoyubalzas](https://www.instagram.com/gutoyubalzas/)): 천진우 [@1000_jinwoo](https://www.instagram.com/1000_jinwoo/), 기토 [@_guitae](https://www.instagram.com/_guitae/), 법영이 [@beob_young](https://www.instagram.com/beob_young/), 양동훈 [@yadohoo](https://www.instagram.com/yadohoo/), 리장단 [@leejangdan](https://www.instagram.com/leejangdan/) |
| 게임 개발 | 눈사람 ([카카오톡 오픈채팅](https://open.kakao.com/o/sButobqi)) |
| '아이스크림' 8bit 편곡, 효과음 | 권주부 ([@hj.gwon.kr](https://www.instagram.com/hj.gwon.kr/))|
| 캐릭터, 그래픽 디자인 | 광순 ([@_gwangsun](https://www.instagram.com/_gwangsun/)) |
| 게임 중 음악 | PC: 천진우의 곡을 유튜브에서 랜덤 재생 / 모바일, 태블릿: '아이스크림' 8bit 편곡 버전 |
