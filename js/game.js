// 게임 상태와 규칙
// 사이클: 모으기(천진우부터 리장단까지 합류), 피버 타임(무대, 장애물 없음, 음표 2배), 다시 모으기
// 목숨: 하트 3개 (충돌 시 1개 차감, 하트 아이템으로 1개 회복, 0개면 게임 오버)
import {
  W, GROUND_Y, SPEED, SPEED_UP, LATE_ACCEL, MAX_SPEED, GRAVITY, JUMP_V,
  GATHER_LENGTH, FEVER_LENGTH, LAP_FEVER_DELAY_S, SOLO_FEVERS, PANEL_ORDER, BG_PARALLAX, FEVER_NOTE_MULT, FEVER_NOTE_GAP,
  MAX_HEARTS, HEART_CHANCE, HEART_Y, INTRO_MS,
  OBSTACLES, PX_PER_M, TEMPO, LEADER_X, GAP, INVINCIBLE_MS, SCORE_PER_PX, DODGE_SCORE, NOTE_SCORE, NEAR_MISS_PX, NEAR_MISS_SCORE, MEMBERS,
} from './config.js';
import { addRanking } from './storage.js';
import { playSfx, stopSfx } from './sfx.js';

// scene: loading | error | title | intro(천진우 걸어 나옴) | play | fall | gameover
// phase (play 중): gather | fever
export const state = {
  scene: 'loading',
  errorMsg: '',
  auto: new URLSearchParams(location.search).has('auto'), // 테스트용 자동 플레이 (A 키 또는 ?auto)
  slideHeld: false,
  solo: null,             // 캐릭터 달리기 멤버 id (null이면 5인 달리기)
  paused: false,          // 창을 벗어나면 멈춤 (input.js)
  countdownUntil: 0,      // 이어하기 카운트다운 끝 시각
  dist: 0,                // 총 달린 거리
  speed: SPEED,           // 현재 속도 px/s
  phase: 'gather',
  phaseStart: 0,          // 현재 구간이 시작된 dist
  mapBase: 0,             // 이번 바퀴에서 중간 피버 전까지 달린 맵 거리
  feverWait: 0,           // 맵 끝에서 피버를 기다린 시간
  round: 1,               // 몇 번째 모으기인지
  leader: { y: GROUND_Y, vy: 0, sliding: false },
  crew: [],
  joined: new Set(),      // 이번 모으기에서 합류한 멤버
  obstacles: [],
  nextObstacleAt: 0,
  notes: [],              // { x(월드), y, taken }
  nextNoteAt: 0,          // 피버 중 다음 음표 위치
  hearts: MAX_HEARTS,
  heartItems: [],         // 길에 떠 있는 회복 하트 { x(월드), y, taken }
  history: [],            // 선두의 [이동거리, y, sliding] 기록 (뒤 멤버가 그대로 따라 함)
  noteCount: 0,
  score: 0,
  autoUsed: false,
  invincibleUntil: 0,
  flashAt: -1e9,          // 구간이 바뀔 때 화면 번쩍임
  hintAt: -1e9,           // START 후 조작 안내 시작 시각 (render.js)
  popups: [],
  introStart: 0,
  fallTime: 0,
  lastResult: null,
};

// 달리기 선두: 캐릭터 달리기는 고른 멤버, 5인 달리기는 천진우
export const leaderMember = () => MEMBERS.find(m => m.id === state.solo) || MEMBERS[0];
export const runMode = () => state.solo || 'crew';   // 랭킹 모드 ('crew' 또는 멤버 id)
// 브금 빠르기 (1 = 원래 속도)
export const bgmTempo = () => Math.min(TEMPO.MAX, 1 + (state.round - 1) * TEMPO.ROUND_STEP) + (state.phase === 'fever' ? TEMPO.FEVER : 0);

// 시작 연출: 선두 멤버 등장 후 reset()으로 출발 (solo: 캐릭터 달리기 멤버 id, 없으면 5인 달리기)
export function startIntro(solo = null) {
  state.solo = solo;
  state.scene = 'intro';
  state.introStart = performance.now();
  playSfx(solo ? 'join_' + solo : 'intro_crew');   // 등장 연출: 캐릭터 달리기는 그 멤버 합류음
}

// 알림: 새 판 시작, 넘어짐(마지막 충돌), 게임 오버, 멤버 합류, 구간 바뀜(피버, 라운드) (input.js에서 처리)
export const hooks = { onReset() {}, onFall() {}, onGameOver() {}, onJoin() {}, onPhase() {} };

export function reset() {
  Object.assign(state, {
    dist: 0,
    speed: SPEED,
    phase: 'gather',
    phaseStart: 0,
    mapBase: 0,
    feverWait: 0,
    round: 1,
    leader: { y: GROUND_Y, vy: 0, sliding: false },
    crew: [{ ...leaderMember(), x: LEADER_X }],
    joined: new Set([leaderMember().id]),
    obstacles: [],
    nextObstacleAt: 1400,
    notes: [],
    nextNoteAt: 0,
    hearts: MAX_HEARTS,
    heartItems: [],
    history: [],
    noteCount: 0,
    score: 0,
    autoUsed: state.auto,
    invincibleUntil: 0,
    flashAt: -1e9,
    popups: [],
    paused: false,
    countdownUntil: 0,
    scene: 'play',
  });
  playSfx('gamestart');
  hooks.onReset();
}

// 현재 구간에서 달린 거리
export const phaseDist = () => state.dist - state.phaseStart;

// 이번 바퀴 맵에서 달린 거리 (중간 피버 동안은 멈춤)
export const mapDist = () => state.mapBase + (state.phase === 'gather' ? phaseDist() : 0);

// 다음 피버 지점: 캐릭터 달리기는 맵을 패널 경계로 나눠 중간 피버, 마지막은 바퀴 끝
export const midFevers = () => state.solo
  ? Array.from({ length: SOLO_FEVERS }, (_, k) => Math.round((PANEL_ORDER.length - 1) * (k + 1) / (SOLO_FEVERS + 1)) * W / BG_PARALLAX)
  : [];
const nextFeverAt = () => midFevers().find(at => at > state.mapBase) ?? GATHER_LENGTH;

// 목표 속도: 첫 모으기 동안 진행만큼, 이후 달린 거리만큼 증가
function targetSpeed() {
  const first = SPEED * (1 + SPEED_UP * Math.min(1, state.dist / GATHER_LENGTH));
  const speed = Math.min(MAX_SPEED, first + Math.max(0, state.dist - GATHER_LENGTH) * LATE_ACCEL);
  // 피버는 최소 첫 피버 속도 (캐릭터 달리기 중간 피버가 가속 끝나기 전에 와도 똑같이 빠르게)
  return state.phase === 'fever' ? Math.max(speed, SPEED * (1 + SPEED_UP)) : speed;
}

// 현재 속도: 목표 속도를 따라 서서히 바뀜 (피버 시작, 끝에 급가속, 급감속 없이)
const SPEED_EASE_S = 0.8;
export const speedNow = () => state.speed;

export const multiplier = () => state.crew.length;

export function jump() {
  const { leader } = state;
  if (state.scene === 'play' && leader.y >= GROUND_Y && !leader.sliding) { leader.vy = JUMP_V; playSfx('jump'); }
}

export function leaderBox() {
  const h = state.leader.sliding ? 70 : 130;
  return { x: LEADER_X - 40, y: state.leader.y - h, w: 80, h };
}

export function obstacleRect(o) {
  const x = o.x - state.dist;
  return o.type === 'jump'
    ? { x, y: GROUND_Y - o.h, w: o.w, h: o.h }
    : { x, y: o.top, w: o.w, h: o.bottom - o.top };
}

// 뒤 멤버: GAP*i 전의 선두 상태 재생
export function pose(i) {
  if (i === 0) return { y: state.leader.y, sliding: state.leader.sliding };
  const at = state.dist - i * GAP;
  const { history } = state;
  for (let k = history.length - 1; k >= 0; k--) {
    if (history[k][0] <= at) return { y: history[k][1], sliding: history[k][2] };
  }
  return { y: GROUND_Y, sliding: false };
}

function addPopup(text, color = '#fff') {
  state.popups.push({ text, color, y: GROUND_Y - 190, t: performance.now() });
}

// ===== 구간 전환 =====
function startFever() {
  state.mapBase = mapDist();
  state.feverWait = 0;
  Object.assign(state, {
    phase: 'fever', phaseStart: state.dist, obstacles: [], heartItems: [],
    nextNoteAt: state.dist + 300, flashAt: performance.now(),
  });
  addPopup('FEVER TIME! 음표 ×' + FEVER_NOTE_MULT, '#ff6bd5');
  hooks.onPhase();
}

function endFever() {
  const lap = state.mapBase >= GATHER_LENGTH;   // 바퀴 끝 피버면 다음 라운드, 중간 피버면 맵 이어서
  Object.assign(state, {
    phase: 'gather', phaseStart: state.dist, nextObstacleAt: state.dist + 900, flashAt: performance.now(),
  });
  if (lap) {
    Object.assign(state, {
      mapBase: 0, round: state.round + 1,
      crew: [{ ...leaderMember(), x: LEADER_X }], joined: new Set([leaderMember().id]),
    });
    addPopup(state.solo ? `ROUND ${state.round}` : `ROUND ${state.round} · 다시 모으자!`, '#ffd34d');
  }
  hooks.onPhase();
}

// ===== 장애물, 음표, 하트 =====
function spawnObstacle() {
  const low = Math.random() < 0.55;
  const x = state.dist + W + 40;
  const kinds = low ? OBSTACLES.jump : OBSTACLES.slide;
  const { img, w, h, hitW = w } = kinds[Math.floor(Math.random() * kinds.length)];
  const o = low   // w: 충돌 너비, drawW: 그림 너비
    ? { type: 'jump', img, x, w: hitW, drawW: w, h, minGap: Infinity }
    : { type: 'slide', img, x, w: hitW, drawW: w, top: 0, bottom: h, minGap: Infinity };
  state.obstacles.push(o);

  // 간격은 속도에 비례
  const gap = (speedNow() / SPEED) * (600 + Math.random() * 600);
  state.nextObstacleAt = state.dist + gap;
  spawnNotes(o);

  // 장애물 사이: 하트 부족 시 가끔 회복 하트, 아니면 음표 한 줄
  const mid = o.x + gap / 2;
  const heartWaiting = state.heartItems.some(h => !h.taken);
  if (state.hearts < MAX_HEARTS && !heartWaiting && Math.random() < HEART_CHANCE) {
    state.heartItems.push({ x: mid, y: GROUND_Y - HEART_Y, taken: false });
  } else if (gap > 900 && Math.random() < 0.7) {
    for (let k = -2; k <= 2; k++) state.notes.push({ x: mid + k * 50, y: GROUND_Y - 70, taken: false });
  }
}

// 장애물 음표: 점프 장애물 위는 점프 궤적, 슬라이딩 장애물 아래는 낮게
function spawnNotes(o) {
  const speed = speedNow();
  if (o.type === 'jump') {
    const takeoff = o.x - speed * 0.15 - 40;     // 자동 플레이 점프 지점과 같은 기준 (선두 중심의 월드 x)
    for (let k = 1; k <= 5; k++) {
      const t = k * 0.13;
      const height = -JUMP_V * t - GRAVITY / 2 * t * t;
      state.notes.push({ x: takeoff + speed * t, y: GROUND_Y - height - 70, taken: false });
    }
  } else {
    for (let k = 0; k < 4; k++) state.notes.push({ x: o.x + k * 40, y: GROUND_Y - 35, taken: false });
  }
}

// 피버 음표: 물결 모양 (낮은 건 달리면서, 높은 건 점프로)
function spawnFeverNotes() {
  while (state.nextNoteAt < state.dist + W + 40 && state.nextNoteAt < state.phaseStart + FEVER_LENGTH) {
    const wave = Math.sin(state.nextNoteAt / 260);
    state.notes.push({ x: state.nextNoteAt, y: GROUND_Y - 70 - Math.max(0, wave) * 150, taken: false });
    state.nextNoteAt += FEVER_NOTE_GAP;
  }
}

// 자동 플레이: 앞 장애물 거리 기준 점프, 슬라이딩
function autoPilot(speed) {
  const front = LEADER_X + 40;
  const next = state.obstacles.find(o => o.x - state.dist + o.w > LEADER_X - 40);
  state.slideHeld = false;
  if (!next) return;
  const gap = next.x - state.dist - front;
  if (next.type === 'jump' && gap < speed * 0.15) jump();
  if (next.type === 'slide' && gap < speed * 0.3) state.slideHeld = true;
}

// 충돌: 하트 1개 차감 후 잠깐 무적, 하트가 없으면 넘어짐 (계속 달리면 true)
function hit() {
  state.hearts--;
  playSfx('hit');
  if (state.hearts > 0) {
    state.invincibleUntil = performance.now() + INVINCIBLE_MS;
    addPopup('아야! 우웩이 -1', '#f77');
    return true;
  }
  state.scene = 'fall';
  stopSfx('slide');
  state.fallTime = performance.now();
  hooks.onFall();   // 브금 줄이기 (타격음, 게임 오버음과 겹치지 않게)
  return false;
}

// 게임 오버 (자동 플레이 판은 랭킹 제외)
function gameOver() {
  state.scene = 'gameover';
  playSfx('gameover');
  const final = Math.floor(state.score);
  state.lastResult = { score: final, rank: 0, name: '', saved: true, autoUsed: state.autoUsed,
    canRank: !state.autoUsed && final > 0,
    round: state.round, distance: Math.floor(state.dist / PX_PER_M), notes: state.noteCount, mode: runMode() };
  hooks.onGameOver(state.lastResult);
}

// 입력한 이름으로 랭킹 등록
export async function registerScore(name) {
  const r = state.lastResult;
  if (!r || !r.canRank || r.rank || r.saving) return;
  Object.assign(r, { name, saving: true });
  Object.assign(r, await addRanking(name, r), { saving: false });
}

// 선두 몸통과 겹치는지 (음표, 하트 먹기)
function touches(box, item, pad = 20) {
  const x = item.x - state.dist;
  return x > box.x - pad && x < box.x + box.w + pad && item.y > box.y - pad && item.y < box.y + box.h + pad;
}

// ===== 매 프레임 =====
export function update(dt) {
  const now = performance.now();
  if (state.paused || now < state.countdownUntil) return;   // 일시정지, 이어하기 카운트다운 중
  if (state.scene === 'title' && state.auto) reset();
  if (state.scene === 'intro' && now - state.introStart > INTRO_MS) { reset(); state.flashAt = now; state.hintAt = now; }
  if (state.scene === 'fall' && now - state.fallTime > 1000) gameOver();
  if (state.scene === 'gameover' && state.auto && now - state.fallTime > 3500) reset();
  if (state.scene !== 'play') return;

  state.speed += (targetSpeed() - state.speed) * (1 - Math.exp(-dt / SPEED_EASE_S));
  const speed = state.speed;
  state.dist += speed * dt;
  state.score += speed * dt * SCORE_PER_PX * multiplier();
  if (state.auto) { state.autoUsed = true; autoPilot(speed); }

  // 선두 물리
  const { leader } = state;
  const sliding = state.slideHeld && leader.y >= GROUND_Y;
  if (sliding !== leader.sliding) sliding ? playSfx('slide') : stopSfx('slide');
  leader.sliding = sliding;
  leader.vy += GRAVITY * dt;
  leader.y = Math.min(GROUND_Y, leader.y + leader.vy * dt);
  if (leader.y >= GROUND_Y) leader.vy = 0;
  state.history.push([state.dist, leader.y, leader.sliding]);
  while (state.history.length && state.history[0][0] < state.dist - GAP * 5) state.history.shift();

  // 구간 진행
  const local = phaseDist();
  if (state.phase === 'gather') {
    const map = mapDist(), feverAt = nextFeverAt();
    // 자기 패널이 나오면 합류 (화면 왼쪽에서 달려 들어옴, 캐릭터 달리기는 합류 없음)
    for (const m of state.solo ? [] : MEMBERS) {
      if (map >= m.joinDist && !state.joined.has(m.id)) {
        state.joined.add(m.id);
        state.crew.push({ ...m, x: -120 });
        addPopup(m.name + ' 합류! ×' + state.crew.length, '#ffd34d');
        playSfx('join_' + m.id);
        hooks.onJoin(m, state.crew.length);
      }
    }
    // 장애물은 피버 직전 한 화면 전까지
    if (state.dist > state.nextObstacleAt && map + W * 1.5 < feverAt) spawnObstacle();
    if (map >= feverAt) {
      const wait = feverAt >= GATHER_LENGTH ? LAP_FEVER_DELAY_S : 0;   // 맵 끝은 조금 더 달린 뒤
      state.feverWait += dt;
      if (state.feverWait >= wait) startFever();
    }
  } else {
    spawnFeverNotes();
    if (local >= FEVER_LENGTH) endFever();
  }
  state.crew.forEach((c, i) => { c.x = Math.min(LEADER_X - i * GAP, c.x + 500 * dt); });

  // 충돌은 선두만 판정 (뒤 멤버는 같은 지점에서 똑같이 피함)
  const box = leaderBox();
  for (const o of state.obstacles) {
    const r = obstacleRect(o);
    if (!(box.x < r.x + r.w && box.x + box.w > r.x)) continue;
    const gapY = o.type === 'jump' ? r.y - (box.y + box.h) : box.y - (r.y + r.h);
    if (gapY < 0) {
      if (now < state.invincibleUntil || o.hit) continue;
      o.hit = true;
      if (!hit()) return;
    } else {
      o.minGap = Math.min(o.minGap, gapY);
    }
  }

  // 지나간 장애물: 회피 점수 (+ 아슬아슬 보너스)
  for (const o of state.obstacles) {
    if (!o.scored && !o.hit && o.x - state.dist + o.w < LEADER_X - 40) {
      o.scored = true;
      state.score += DODGE_SCORE * multiplier();
      if (o.minGap < NEAR_MISS_PX) {
        state.score += NEAR_MISS_SCORE * multiplier();
        addPopup('아슬아슬! +' + NEAR_MISS_SCORE * multiplier(), '#7ef');
      }
    }
  }
  state.obstacles = state.obstacles.filter(o => o.x - state.dist + o.drawW > 0);   // 그림이 화면 왼쪽으로 다 나가면

  // 음표 먹기 (피버 중 배수)
  const noteMult = state.phase === 'fever' ? FEVER_NOTE_MULT : 1;
  for (const n of state.notes) {
    if (!n.taken && touches(box, n)) {
      n.taken = true;
      state.noteCount++;
      playSfx('eat');
      state.score += NOTE_SCORE * multiplier() * noteMult;
    }
  }
  state.notes = state.notes.filter(n => n.x - state.dist > -100);

  // 하트 먹기 (최대 MAX_HEARTS)
  for (const h of state.heartItems) {
    if (!h.taken && touches(box, h, 28)) {
      h.taken = true;
      playSfx('eat_uwek');
      if (state.hearts < MAX_HEARTS) { state.hearts++; addPopup('우웩이 +1', '#ff8fb1'); }
    }
  }
  state.heartItems = state.heartItems.filter(h => h.x - state.dist > -100);
}
