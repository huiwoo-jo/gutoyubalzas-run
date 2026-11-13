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
export const FEVER_NOTE_MULT = 2;        // 피버 중 음표 점수 배수
export const FEVER_NOTE_GAP = 110;       // 피버 중 음표 간격

// 속도 및 물리
export const SPEED = 420;                // 시작 속도 px/s
export const SPEED_UP = 0.9;             // 첫 모으기 끝 속도 = SPEED × (1 + SPEED_UP)
export const LATE_ACCEL = 0.012;         // 그 뒤로 달린 거리 1px당 추가 속도
export const MAX_SPEED = 1400;
export const GRAVITY = 2600, JUMP_V = -1000;

// 하트(목숨)
export const MAX_HEARTS = 3;             // 시작 하트 = 최대 하트
export const HEART_CHANCE = 0.15;        // 하트가 모자랄 때 장애물 하나당 회복 하트가 나올 확률
export const HEART_Y = 160;              // 회복 하트 높이

// 캐릭터
export const CHAR_SCALE = 0.12;          // 1536×2048 캐릭터: 실제 몸 높이 약 140px
export const CHAR_FOOT = 1640;           // 원본 캔버스에서 발 끝 y
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
// TODO: 현재는 로컬 환경에서만 저장됨
export const RANK_KEY = 'gutoRun.ranking.v1', NAME_KEY = 'gutoRun.name';
export const RANK_SHOW = 5;              // 게임 오버 화면에 보여 줄 순위 수
export const RANK_STORE = 10;           // 보관할 기록 수

// 멤버별 캐릭터 및 우웩이
export const MEMBERS = [
  { id: 'jinwoo',    name: '천진우', panel: 0,  common: 'jinwoo_mike' },
  { id: 'gito',      name: '기토',   panel: 3,  common: 'gito_guitar' },
  { id: 'beobyoung', name: '법영이', panel: 6,  common: 'beobyoung_guitar' },
  { id: 'donghun',   name: '양동훈', panel: 9,  common: 'donghun_guitar' },
  { id: 'jangdan',   name: '리장단', panel: 12, common: 'jangdan_drum' },
].map(m => ({ ...m, joinDist: panelDist(m.panel) }));
export const HEART_IMG = 'uwek_default';  // 목숨으로 쓰는 우웩이

// 브금: 유튜브 재생목록 ID (주소의 list= 뒤 값) 비워 두면 브금 없음
export const BGM_PLAYLIST = 'PLgiJpwmxCJ6dj1PHhREG_x0w-N9gq-4Lr';
export const BGM_VOLUME = 50;            // 0~100

// 광고판: Mortals Log의 공연, 앨범을 랜덤사용
export const SITE_URL = 'https://mortals-log.vercel.app';
