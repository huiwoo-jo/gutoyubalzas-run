// 화면 그리기 (state 읽기 전용, 점수 팝업 정리만 예외)
import {
  W, H, GROUND_Y, SPEED, PANEL_ORDER, BG_PARALLAX, GATHER_LENGTH, FEVER_LENGTH, FEVER_NOTE_MULT,
  MAX_HEARTS, HEART_IMG, CHAR_SCALE, CHAR_FOOT, RUN_FRAMES, RUN_FPS, PX_PER_M, RANK_SHOW, MEMBERS,
  OBSTACLES, IS_TOUCH, LEADER_X, FALL_STAGGER_MS, FALL_MS, INTRO_FADE_MS, INTRO_WALK_MS, STAGE_FLOOR,
} from './config.js';
import { IMG } from './assets.js';
import { state, speedNow, multiplier, pose, phaseDist, mapDist, midFevers } from './game.js';
import { loadRanking, loadMyBest } from './storage.js';
import { nameFormOpen } from './input.js';
import { playedSongs, shownSongs } from './bgm.js';
import { adFor, ticketConcert } from './ads.js';

const ctx = document.getElementById('game').getContext('2d');

function drawCover(name) { ctx.drawImage(IMG[name], 0, 0); }

function drawText(text, y, size = 48, color = '#fff') {
  ctx.font = `bold ${size}px sans-serif`; ctx.textAlign = 'center';
  ctx.lineWidth = 8; ctx.strokeStyle = '#000'; ctx.strokeText(text, W / 2, y);
  ctx.fillStyle = color; ctx.fillText(text, W / 2, y);
}

// 우웩이 아이콘: 높이 h, (cx, cy) 중심
function drawUwek(name, cx, cy, h) {
  const img = IMG[name], w = img.width * h / img.height;
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(img, Math.round(cx - w / 2), Math.round(cy - h / 2), w, h);
  ctx.imageSmoothingEnabled = false;
}

// ===== 배경 =====
// 모으기: PANEL_ORDER 순서로 배경 패널 흐름 (구간이 바뀌면 처음부터)
function drawPanels() {
  const bgX = mapDist() * BG_PARALLAX;
  const first = Math.floor(bgX / W);
  for (let p = first; p <= first + 1 && p < PANEL_ORDER.length; p++) {
    const x = Math.round(p * W - bgX);
    ctx.drawImage(IMG['bg_far' + PANEL_ORDER[p]], x, 0);
    if (PANEL_ORDER[p] === 1) {                       // 빈 벽 패널: 가운데 조명 아래 광고판
      const ad = adFor(state.round, p);
      if (ad) drawBillboard(ad, x + 400, 168);
    }
  }
}

// 광고판 (480×250): 매달린 검은 판, 노란 테두리, 깜빡이는 전구, 왼쪽 이미지, 오른쪽 글
const BOARD_W = 480, BOARD_H = 250;
function drawBillboard(ad, x, y) {
  const t = performance.now();
  // 매다는 줄
  ctx.fillStyle = '#4a5560';
  ctx.fillRect(x + 60, 122, 4, y - 122); ctx.fillRect(x + BOARD_W - 64, 122, 4, y - 122);
  // 그림자, 판, 테두리
  ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(x + 8, y + 8, BOARD_W, BOARD_H);
  ctx.fillStyle = '#ffd34d'; ctx.fillRect(x, y, BOARD_W, BOARD_H);
  ctx.fillStyle = '#111'; ctx.fillRect(x + 6, y + 6, BOARD_W - 12, BOARD_H - 12);
  // 테두리 전구 (번갈아 깜빡임)
  const on = Math.floor(t / 400) % 2;
  for (let i = 0; i < 16; i++) {
    const bx = x + 12 + i * ((BOARD_W - 30) / 15);
    for (const by of [y - 1, y + BOARD_H - 7]) {
      ctx.fillStyle = (i + on) % 2 ? '#fff6c8' : '#b8862a';
      ctx.fillRect(Math.round(bx), by, 8, 8);
    }
  }
  // 포스터, 앨범 표지 (가운데 기준 잘라 채움)
  const ix = x + 22, iy = y + 22, iw = 180, ih = BOARD_H - 44;
  ctx.fillStyle = '#2a2a2a'; ctx.fillRect(ix, iy, iw, ih);
  const img = ad.img;
  if (img && img.complete && img.naturalWidth) {
    const s = Math.max(iw / img.naturalWidth, ih / img.naturalHeight);
    const sw = iw / s, sh = ih / s;
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(img, (img.naturalWidth - sw) / 2, (img.naturalHeight - sh) / 2, sw, sh, ix, iy, iw, ih);
    ctx.imageSmoothingEnabled = false;
  } else {
    ctx.fillStyle = '#555'; ctx.font = 'bold 64px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('♪', ix + iw / 2, iy + ih / 2 + 22);
  }
  // 글
  const tx = ix + iw + 20, tw = x + BOARD_W - 22 - tx;
  const concert = ad.tag === 'UPCOMING';
  ctx.textAlign = 'left'; ctx.font = 'bold 16px sans-serif';
  const tagW = ctx.measureText(ad.tag).width + 16;
  ctx.fillStyle = concert ? '#f9c' : '#ffd34d'; ctx.fillRect(tx, y + 30, tagW, 26);
  ctx.fillStyle = '#111'; ctx.fillText(ad.tag, tx + 8, y + 49);
  ctx.font = 'bold 28px sans-serif'; ctx.fillStyle = '#fff';
  ctx.fillText(fit(ad.title, tw), tx, y + 100);
  ctx.font = 'bold 18px sans-serif'; ctx.fillStyle = concert ? '#f9c' : '#ffd34d';
  ctx.fillText(fit(ad.lines[0], tw), tx, y + 140);
  ctx.font = '16px sans-serif'; ctx.fillStyle = '#aaa';
  ctx.fillText(fit(ad.lines[1], tw), tx, y + 168);
  // 가운데 조명 반사
  ctx.fillStyle = 'rgba(255,240,190,.07)'; ctx.fillRect(x, y, BOARD_W, BOARD_H);
}

// 피버: 시작 화면 무대, 깜빡이는 조명, 색 빛줄기
const BEAM_COLORS = ['255,80,120', '255,211,77', '80,210,255', '180,90,255'];
function drawFeverStage(t) {
  drawCover('background');
  // 조명 이미지 좌우 복제, 번갈아 깜빡임
  for (const [k, dx] of [[0, -420], [1, 0], [2, 420]]) {
    ctx.globalAlpha = 0.45 + 0.55 * Math.max(0, Math.sin(t / 180 + k * 2.1));
    ctx.drawImage(IMG.lamp, dx, 0);
  }
  ctx.globalAlpha = 1;
  // 색 빛줄기 (위에서 아래로, 좌우로 흔들림)
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 6; i++) {
    const x = 110 + i * 212, angle = Math.sin(t / 650 + i * 1.3) * 0.55;
    const color = BEAM_COLORS[(i + Math.floor(t / 900)) % BEAM_COLORS.length];
    ctx.save();
    ctx.translate(x, 30);
    ctx.rotate(angle);
    const g = ctx.createLinearGradient(0, 0, 0, 640);
    g.addColorStop(0, `rgba(${color},.55)`); g.addColorStop(1, `rgba(${color},0)`);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(-14, 0); ctx.lineTo(14, 0); ctx.lineTo(120, 640); ctx.lineTo(-120, 640); ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

// ===== 달리는 화면 =====
function drawWorld() {
  const { dist } = state;
  const t = performance.now();
  if (state.phase === 'fever') drawFeverStage(t); else drawPanels();

  // 바닥 (가로 반복, 피버 중 까만 무대 바닥)
  if (state.phase === 'fever') {
    drawFeverFloor();
  } else {
    const gx = -Math.round(dist % W);
    ctx.drawImage(IMG.bg_ground, gx, 0);
    ctx.drawImage(IMG.bg_ground, gx + W, 0);
  }

  // 속도선: 빠를수록 많고 길게
  const fast = Math.min(2, speedNow() / SPEED - 1);
  if (fast > 0.2) {
    ctx.fillStyle = 'rgba(255,255,255,.55)';
    const n = Math.floor(fast * 14), len = 40 + fast * 160;
    for (let k = 0; k < n; k++) {
      const y = 120 + ((k * 97) % 480);
      const x = W - ((dist * 1.5 + k * 337) % (W + len));
      ctx.fillRect(Math.round(x), y, len, 3);
    }
  }

  for (const o of state.obstacles) drawObstacle(o, Math.round(o.x - dist));
  for (const n of state.notes) {
    if (!n.taken) drawNote(Math.round(n.x - dist), Math.round(n.y + Math.sin(t / 200 + n.x) * 4));
  }
  // 회복 하트 (위아래로 둥실)
  const heartIcon = state.solo ? 'uwek_' + state.solo : HEART_IMG;   // 캐릭터 달리기는 그 멤버 우웩이
  for (const h of state.heartItems) {
    if (!h.taken) drawUwek(heartIcon, h.x - dist, h.y + Math.sin(t / 250) * 6, 56);
  }

  // 멤버 (뒤에서 앞 순서, 무적 시간 깜빡임)
  const blink = t < state.invincibleUntil && Math.floor(t / 80) % 2;
  if (blink && state.scene === 'play') return;
  const over = state.scene === 'fall' || state.scene === 'gameover';
  const fps = RUN_FPS * speedNow() / SPEED;   // 빨라질수록 발도 빨라짐
  for (let i = state.crew.length - 1; i >= 0; i--) {
    const p = pose(i);
    // 게임 오버: 천진우부터 차례로 쓰러짐 (공중에 있던 멤버도 바닥으로)
    const fall = over ? Math.min(1, Math.max(0, (t - state.fallTime - i * FALL_STAGGER_MS) / FALL_MS)) : 0;
    drawMember(state.crew[i].id, state.crew[i].x, fall > 0 ? GROUND_Y : p.y, {
      air: !over && p.y < GROUND_Y, sliding: !over && p.sliding, fall,
      frame: over ? 0 : Math.floor(t / 1000 * fps + i) % RUN_FRAMES,  // 멤버마다 발 엇갈리게
    });
  }
}

// 피버 바닥: 까만 무대 바닥
function drawFeverFloor() {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);
}

// 장애물: assets/obstacles 이미지를 충돌 범위 크기로 (config.js OBSTACLES)
function drawObstacle(o, x) {
  const { img } = OBSTACLES[o.type];
  if (o.type === 'jump') ctx.drawImage(IMG[img], x, GROUND_Y - o.h, o.w, o.h);
  else ctx.drawImage(IMG[img], x, o.top, o.w, o.bottom - o.top);
}

// 음표 (임시 도트, 4px 도트 9×11칸)
const NOTE_PIXELS = [
  '....##...',
  '....###..',
  '....#.##.',
  '....#..##',
  '....#...#',
  '....#....',
  '....#....',
  '.####....',
  '#####....',
  '#####....',
  '.###.....',
];
function drawNote(cx, cy) {
  const s = 4, ox = cx - 18, oy = cy - 22;
  const each = fn => NOTE_PIXELS.forEach((row, y) => [...row].forEach((c, x) => { if (c === '#') fn(ox + x * s, oy + y * s); }));
  ctx.fillStyle = '#000'; each((x, y) => ctx.fillRect(x - 2, y - 2, s + 4, s + 4)); // 외곽선
  ctx.fillStyle = '#ffd34d'; each((x, y) => ctx.fillRect(x, y, s, s));
}

// frame: 달리기 프레임 (0~RUN_FRAMES-1), fall: 쓰러진 정도 (0 서 있음, 1 누움)
// 슬라이딩, 넘어지기는 달리기 이미지 변형 (임시)
function drawMember(id, x, footY, { air = false, sliding = false, fall = 0, frame = 0 } = {}) {
  const img = IMG[id + (air ? '_jump' : '_run' + (frame + 1))];
  x = Math.round(x); footY = Math.round(footY);
  ctx.save();
  if (fall > 0) {       // 넘어지기: 뒤로 눕힘 (임시)
    ctx.translate(x + 70 * fall, footY - 62 * fall);
    ctx.rotate(-Math.PI / 2 * fall);
  } else if (sliding) { // 슬라이딩: 납작하게 (높이 약 75px)
    ctx.translate(x, footY);
    ctx.scale(1.15, 0.55);
  } else {
    ctx.translate(x, footY);
  }
  ctx.drawImage(img, -Math.round(img.width / 2), -Math.round(CHAR_FOOT * CHAR_SCALE));
  ctx.restore();
}

// ===== 상단, HUD =====
// 모으기: 진행 바 위 멤버별 우웩이 (합류 전 멤버는 합류 지점에 흐리게)
// 피버: 남은 피버 시간 바
function drawProgress() {
  const x0 = 300, x1 = W - 300, y = 46;
  const local = phaseDist();
  ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(x0 - 30, y - 30, x1 - x0 + 60, 60);
  if (state.phase === 'fever') {
    const left = Math.max(0, 1 - local / FEVER_LENGTH);
    ctx.fillStyle = '#444'; ctx.fillRect(x0, y + 8, x1 - x0, 8);
    ctx.fillStyle = '#ff6bd5'; ctx.fillRect(x0, y + 8, (x1 - x0) * left, 8);
    ctx.font = 'bold 24px sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#ff6bd5';
    ctx.fillText(`FEVER TIME · 음표 ×${FEVER_NOTE_MULT}`, W / 2, y - 2);
    return;
  }
  const progress = Math.min(1, mapDist() / GATHER_LENGTH);
  ctx.fillStyle = '#444'; ctx.fillRect(x0, y - 4, x1 - x0, 8);
  ctx.fillStyle = '#ffd34d'; ctx.fillRect(x0, y - 4, (x1 - x0) * progress, 8);
  ctx.fillStyle = '#ff6bd5';   // 중간 피버 지점
  for (const at of midFevers()) ctx.fillRect(Math.round(x0 + (x1 - x0) * at / GATHER_LENGTH) - 3, y - 10, 6, 20);
  MEMBERS.forEach((m, i) => {
    if (state.solo && m.id !== state.solo) return;   // 캐릭터 달리기는 고른 멤버만
    const joined = state.joined.has(m.id);
    const at = joined ? progress : m.joinDist / GATHER_LENGTH;
    ctx.globalAlpha = joined ? 1 : 0.35;
    drawUwek('uwek_' + m.id, x0 + (x1 - x0) * at - (joined && !state.solo ? i * 16 : 0), y, 48);
    ctx.globalAlpha = 1;
  });
}

function drawHud() {
  ctx.textAlign = 'left'; ctx.font = 'bold 30px sans-serif';
  ctx.lineWidth = 6; ctx.strokeStyle = '#000';
  const s = Math.floor(state.score).toLocaleString();
  ctx.strokeText(s, 24, 58); ctx.fillStyle = '#fff'; ctx.fillText(s, 24, 58);
  ctx.font = 'bold 22px sans-serif';
  const sub = `×${multiplier()}   ♪ ${state.noteCount}   ${Math.floor(state.dist / PX_PER_M).toLocaleString()}m`;
  ctx.strokeText(sub, 24, 88); ctx.fillStyle = '#ffd34d'; ctx.fillText(sub, 24, 88);
  // 하트 (우웩이): 남은 하트는 진하게, 잃은 하트는 흐리게
  for (let i = 0; i < MAX_HEARTS; i++) {
    ctx.globalAlpha = i < state.hearts ? 1 : 0.2;
    drawUwek(state.solo ? 'uwek_' + state.solo : HEART_IMG, 44 + i * 46, 126, 44);   // 캐릭터 달리기는 그 멤버 우웩이
  }
  ctx.globalAlpha = 1;

  // 전체 1위, 내 최고 기록 (서버)
  const best = loadRanking()[0], mine = loadMyBest();
  const b = [best && 'BEST ' + best.score.toLocaleString(), mine && 'MY ' + mine.score.toLocaleString()].filter(Boolean).join('   ');
  if (b) {
    ctx.textAlign = 'left'; ctx.font = 'bold 20px sans-serif';   // 오른쪽 위는 브금 플레이어 자리
    ctx.strokeText(b, 24, 176); ctx.fillStyle = '#ddd'; ctx.fillText(b, 24, 176);
  }
  // 점수 팝업 (1초 동안 떠오름)
  const now = performance.now();
  state.popups = state.popups.filter(p => now - p.t < 1000);
  for (const p of state.popups) {
    const k = (now - p.t) / 1000;
    ctx.globalAlpha = 1 - k;
    drawText(p.text, p.y - k * 40, 30, p.color);
    ctx.globalAlpha = 1;
  }
  // START 후 조작 안내: 진행 바 아래에 4초, 마지막 1초 동안 사라짐
  const hint = (now - state.hintAt) / 1000;
  if (state.scene === 'play' && hint < 4) {
    ctx.globalAlpha = Math.min(1, 4 - hint);
    drawText(IS_TOUCH ? 'JUMP 버튼으로 점프 · SLIDE 버튼을 누르고 있으면 슬라이딩' : 'Space, ↑ 점프 · ↓ 누르고 있으면 슬라이딩', 112, IS_TOUCH ? 30 : 26, '#fff');
    ctx.globalAlpha = 1;
  }
  // 구간이 바뀔 때 번쩍임 (0.4초)
  const flash = 1 - (now - state.flashAt) / 400;
  if (flash > 0) { ctx.fillStyle = `rgba(255,255,255,${flash})`; ctx.fillRect(0, 0, W, H); }
  if (state.auto) {
    ctx.font = 'bold 22px sans-serif'; ctx.textAlign = 'left'; ctx.fillStyle = '#ffd34d';
    ctx.fillText('AUTO (A로 끄기) · 랭킹 저장 안 됨', 20, H - 20);
  }
}

function drawRanking(x, y, count, highlight) {
  const list = loadRanking().slice(0, count);
  const m = IS_TOUCH ? 1.3 : 1;   // 휴대폰은 화면이 작아 크게 (브금 목록이 없어 자리 넉넉)
  const half = 170 * m, row = 34 * m;
  ctx.fillStyle = 'rgba(0,0,0,.7)'; ctx.fillRect(x - half, y - 40 * m, half * 2, 52 * m + Math.max(1, list.length) * row);
  ctx.textAlign = 'center'; ctx.font = `bold ${24 * m}px sans-serif`; ctx.fillStyle = '#ffd34d';
  ctx.fillText(state.solo ? 'RANKING · 캐릭터 달리기' : 'RANKING', x, y - 8 * m);   // 이번 모드 랭킹
  ctx.font = `bold ${22 * m}px sans-serif`;
  if (!list.length) { ctx.fillStyle = '#aaa'; ctx.fillText('아직 기록이 없어요', x, y + 30 * m); }
  list.forEach((r, i) => {
    const ry = y + 30 * m + i * row;
    ctx.fillStyle = i + 1 === highlight ? '#ffd34d' : '#fff';
    ctx.textAlign = 'left'; ctx.fillText(`${i + 1}. ${r.name}`, x - half + 20 * m, ry);
    ctx.textAlign = 'right'; ctx.fillText(r.score.toLocaleString(), x + half - 20 * m, ry);
  });
}

// 이번 판 브금 목록 (max줄 초과 시 마지막 줄 '외 N곡')
export const SONGS_X = W / 2 + 190, SONGS_Y = 340, SONG_ROW = 34;
// i번째 곡 '듣기' 버튼 위치 (게임 화면 좌표, input.js에서 링크 배치)
export const songButtonPos = i => ({ x: SONGS_X + 118, y: SONGS_Y + 30 + i * SONG_ROW - 8 });

function drawSongs(x, y, max) {
  const list = playedSongs();
  if (!list.length) return;
  const shown = shownSongs(max);
  const rows = shown.length + (list.length > shown.length ? 1 : 0);
  ctx.fillStyle = 'rgba(0,0,0,.7)'; ctx.fillRect(x - 170, y - 40, 340, 52 + rows * 34);
  ctx.textAlign = 'center'; ctx.font = 'bold 24px sans-serif'; ctx.fillStyle = '#f9c';
  ctx.fillText(`♪ 이번 판 브금${list.length > 1 ? ` (${list.length}곡)` : ''}`, x, y - 8);
  ctx.font = 'bold 22px sans-serif'; ctx.textAlign = 'left'; ctx.fillStyle = '#fff';
  shown.forEach((s, i) => ctx.fillText(fit(`${i + 1}. ${s.title}`, 220), x - 150, y + 30 + i * SONG_ROW));
  if (rows > shown.length) {
    ctx.fillStyle = '#aaa';
    ctx.fillText(`외 ${list.length - shown.length}곡`, x - 150, y + 30 + shown.length * SONG_ROW);
  }
}

// 너비 w를 넘는 글자는 말줄임
function fit(text, w) {
  if (ctx.measureText(text).width <= w) return text;
  while (text.length > 1 && ctx.measureText(text + '…').width > w) text = text.slice(0, -1);
  return text + '…';
}

// ===== 장면별 =====
function drawTitle() {
  drawCover('background');
  drawCover('lamp');
  MEMBERS.forEach(m => drawCover(m.common));
  drawCover('title');
  drawCover('button');
}

// 시작 연출: 로고, 버튼 페이드 아웃 후 천진우가 무대 가운데로 걸어옴
function drawIntro(t) {
  const e = t - state.introStart;
  drawCover('background');
  drawCover('lamp');
  MEMBERS.forEach(m => drawCover(m.common));
  const fade = 1 - Math.min(1, e / INTRO_FADE_MS);
  if (fade > 0) {
    ctx.globalAlpha = fade;
    drawCover('title');
    drawCover('button');
    ctx.globalAlpha = 1;
  }
  const k = Math.min(1, Math.max(0, (e - INTRO_FADE_MS) / INTRO_WALK_MS));
  const x = -100 + (LEADER_X + 100) * (1 - (1 - k) * (1 - k));  // 끝에서 천천히 멈춤
  const walking = k < 1;
  const step = walking ? Math.floor(e / 160) % RUN_FRAMES : 0;   // 걷는 박자 (달리기보다 느리게)
  const bob = walking && step % 2 ? -4 : 0;                       // 저벅저벅
  drawMember(state.solo || 'jinwoo', x, STAGE_FLOOR + bob, { frame: step });   // 캐릭터 달리기는 고른 멤버가 걸어 나옴
}

function drawGameOver() {
  const r = state.lastResult;
  ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(0, 0, W, H);
  drawText('GAME OVER', 150, 64);
  drawText(`${r.score.toLocaleString()}점 · ${Math.floor(state.dist / PX_PER_M).toLocaleString()}m · ROUND ${state.round}`, 220, 40, '#ffd34d');
  if (nameFormOpen()) {   // 이름 입력 중 (입력칸은 HTML, 화면 60% 높이)
    drawText('랭킹에 남길 이름을 입력해 주세요', 320, 32, '#7ef');
    return;
  }
  if (r.autoUsed) drawText('자동 플레이 기록은 랭킹에 저장되지 않아요', 270, 22, '#aaa');
  else if (r.saving) drawText('랭킹 등록 중...', 270, 26, '#7ef');
  else if (r.rank) drawText(`${r.name} · ${r.rank}위 등록!`, 270, 26, '#7ef');
  else if (r.name && !r.saved) drawText('랭킹 서버에 저장하지 못했어요', 270, 26, '#f77');
  const songs = playedSongs().length > 0;
  // 휴대폰은 예매하기 버튼을 랭킹 오른쪽에 (아래에 두면 글자를 가림, input.js syncTicketLink)
  const rankX = songs ? W / 2 - 190 : IS_TOUCH && ticketConcert() ? W / 2 - 220 : W / 2;
  drawRanking(rankX, IS_TOUCH ? 330 : 340, RANK_SHOW, r.rank);   // 브금이 있으면 랭킹 옆에 브금 목록
  if (songs) drawSongs(SONGS_X, SONGS_Y, RANK_SHOW);
  drawText(IS_TOUCH ? '화면을 눌러 다시 하기' : 'Space / 탭 다시 하기', H - 50, 24);   // 맨 아래는 팬메이드 안내
}

export function render() {
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, W, H);
  if (state.scene === 'loading') return drawText('불러오는 중...', H / 2);
  if (state.scene === 'error') return drawText(state.errorMsg, H / 2, 28);
  if (state.scene === 'title') return drawTitle();
  if (state.scene === 'intro') return drawIntro(performance.now());
  drawWorld();
  drawProgress();
  drawHud();
  if (state.scene === 'gameover') drawGameOver();
  if (state.paused) {
    ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(0, 0, W, H);
    drawText('일시정지', H / 2 - 20, 56);
    drawText(IS_TOUCH ? '화면을 눌러 다시 시작' : 'Space 또는 클릭으로 다시 시작', H / 2 + 40, 28, '#ffd34d');
  }
}
