// 게임 설정 값

// 화면
export const W = 1280, H = 720;          // 논리 해상도 (원본 2560×1440의 1/2)
export const GROUND_Y = 634;             // bg_ground 바닥 윗면 (원본 1268px / 2)

// 배경
// 1: 기본 패널
export const PANELS = 11;
export const PANEL_ORDER = [4, 1, 2, 5, 1, 3, 7, 1, 6, 9, 1, 8, 10, 1, 11];
export const BG_PARALLAX = 0.5;          // 배경은 바닥보다 느리게
export const panelDist = i => Math.max(0, i - 0.3) * W / BG_PARALLAX;    // i번째 패널이 화면에 70% 들어온 시점

// 한 사이클
export const GATHER_LENGTH = (PANEL_ORDER.length - 1) * W / BG_PARALLAX;
export const FEVER_LENGTH = 6000;        // 피버 타임 거리
export const RESUME_COUNT_MS = 3000;     // 이어하기 전 3, 2, 1
export const LAP_FEVER_DELAY_S = 2;      // 맵 끝에서 이만큼 더 달린 뒤 피버 (두 모드 같음, 중간 피버는 바로)
export const SOLO_FEVERS = 2;            // 캐릭터 달리기: 한 바퀴 중간에 더 넣는 피버 횟수 (맵은 이어서)
export const FEVER_NOTE_MULT = 2;        // 피버 중 음표 점수 배수
export const FEVER_NOTE_GAP = 110;       // 피버 중 음표 간격

// 속도 및 물리
export const SPEED = 420;                // 시작 속도 px/s
export const SPEED_UP = 0.9;             // 첫 모으기 끝 속도 = SPEED × (1 + SPEED_UP)
export const LATE_ACCEL = 0.012;         // 그 뒤로 달린 거리 1px당 추가 속도
export const MAX_SPEED = 1400;
export const GRAVITY = 2600, JUMP_V = -1000;

// 하트(우웩이, 목숨)
export const MAX_HEARTS = 3;             // 시작 하트 = 최대 하트
export const HEART_CHANCE = 0.15;        // 하트가 모자랄 때 장애물 하나당 회복 하트가 나올 확률
export const HEART_Y = 160;              // 회복 하트 높이

// 캐릭터
export const CHAR_SCALE = 0.48;          // 384×512 캐릭터: 실제 몸 높이 약 140px
export const CHAR_FOOT = 410;
export const SLIDE_FOOT = 226;           // 슬라이딩 그림(멤버_slide, 442×282)에서 발 끝 y            // 원본 캔버스에서 발 끝 y
export const RUN_FRAMES = 3;             // 달리기 프레임 수 (멤버_run1~3)
export const RUN_FPS = 9;                // 시작 속도일 때 달리기 애니메이션 속도 (빨라지면 같이 빨라짐)
export const LEADER_X = 560, GAP = 95;   // 선두 위치, 멤버 간격
export const INVINCIBLE_MS = 1200;       // 부딪힌 뒤 무적 시간
export const FALL_STAGGER_MS = 110;      // 게임 오버 때 멤버가 차례로 쓰러지는 간격
export const FALL_MS = 220;              // 한 명이 쓰러지는 데 걸리는 시간

// 시작 연출
export const INTRO_FADE_MS = 400;        // 로고, 버튼 사라지는 시간
export const INTRO_WALK_MS = 1600;       // 걸어오는 시간
export const INTRO_MS = INTRO_FADE_MS + INTRO_WALK_MS + 300;
export const STAGE_FLOOR = 584;          // 시작 화면 무대 바닥 높이 (원본 1168px / 2)
export const PX_PER_M = 100;             // 거리 표시용

// 점수
export const SCORE_PER_PX = 0.02;        // 거리 점수
export const DODGE_SCORE = 10;           // 장애물 하나 피할 때
export const NOTE_SCORE = 20;            // 음표 하나
export const NEAR_MISS_PX = 18;          // 이만큼 가깝게 피하면 아슬아슬 보너스
export const NEAR_MISS_SCORE = 30;

// 저장
export const NAME_KEY = 'gutoRun.name';       // 마지막 입력 이름 (브라우저)
export const PLAYER_KEY = 'gutoRun.player';   // 내 기록용 무작위 ID (브라우저)
export const RANK_SHOW = 5;              // 게임 오버 화면에 보여 줄 순위 수
export const RANK_STORE = 10;           // 서버에서 받아 올 상위 기록 수

// 멤버별 캐릭터 및 우웩이 (common: 시작 화면 악기, play: 합류 카드의 악기 든 모습)
export const MEMBERS = [
  { id: 'jinwoo',    name: '천진우', panel: 0,  common: 'jinwoo_mike', play: 'jinwoo_mike' },
  { id: 'gito',      name: '기토',   panel: 3,  common: 'gito_guitar', play: 'gito_saxophone' },
  { id: 'beobyoung', name: '법영이', panel: 6,  common: 'beobyoung_guitar', play: 'beobyoung_guitar' },
  { id: 'donghun',   name: '양동훈', panel: 9,  common: 'donghun_guitar', play: 'donghun_base' },
  { id: 'jangdan',   name: '리장단', panel: 12, common: 'jangdan_drum', play: 'jangdan_drum' },
].map(m => ({ ...m, joinDist: panelDist(m.panel) }));
export const START_BTN = { x: 514, y: 300, w: 244, h: 68 };   // 시작 화면 START 버튼 영역 (common/button 그림 기준)
// 장애물: assets/obstacles/이름.png를 w×h(게임 화면 px)로 그림, 크기가 곧 충돌 범위 (hitW: 충돌 너비만 왼쪽부터 따로, 종류 중 무작위)
export const OBSTACLES = {
  jump: [    // 바닥 (점프로 넘기)
    { img: 'burning_trash', w: 76, h: 97 },               // 타는 쓰레기
    { img: 'mold_meat', w: 124, h: 76 },                  // 곰팡이 고기
  ],
  slide: [   // 천장 (슬라이딩으로 지나가기, 위에서 바닥 95px 위까지)
    { img: 'rainbow_uwek', w: 206, hitW: 108, h: GROUND_Y - 95 },   // 무지개 우웩이 (충돌은 무지개 줄기만, 머리 아래 투명 부분 제외)
  ],
};
export const HEART_IMG = 'uwek_default';  // 5인 달리기에서 목숨으로 쓰는 우웩이 (캐릭터 달리기는 그 멤버 우웩이)

// 터치 기기 (휴대폰, 태블릿): 플레이 버튼, 가로 회전 안내, 유튜브 대신 타이틀 브금
export const IS_TOUCH = matchMedia('(pointer: coarse)').matches;

// 브금: 유튜브 재생목록 ID (주소의 list= 뒤 값) 비워 두면 브금 없음
export const BGM_PLAYLIST = 'PLgiJpwmxCJ6dj1PHhREG_x0w-N9gq-4Lr';
export const BGM_VOLUME = 50;            // 0~100

// 효과음, 타이틀 브금 (assets/sounds)
export const SFX_VOLUME = 0.9;           // 0~1
export const TITLE_BGM_VOLUME = 0.35;    // 0~1 (효과음이 묻히지 않게 낮게)
// 브금 빠르기: 라운드마다 ROUND_STEP씩 (최대 MAX), 피버 타임은 FEVER만큼 더 (유튜브는 지원하는 배속 중 가까운 값)
export const TEMPO = { ROUND_STEP: 0.05, MAX: 1.15, FEVER: 0.1 };
export const TOUCH_BOOST = 1.6;          // 휴대폰, 태블릿은 스피커가 작아 전체 소리를 키움 (리미터로 찢어짐 방지)

// 광고판: Mortals Log의 공연, 앨범을 랜덤사용
export const SITE_URL = 'https://mortals-log.vercel.app';
