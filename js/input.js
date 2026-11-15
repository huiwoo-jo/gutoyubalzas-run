// 입력: 키보드, 터치 조작과 랭킹 이름 입력
import { state, reset, jump, hooks, startIntro, registerScore } from './game.js';
import { loadName, saveName, refreshRanking, fetchRanking } from './storage.js';
import { playBgm, fadeOutBgm, pauseBgm, resumeBgm, shownSongs, songUrl } from './bgm.js';
import { playTitleBgm, stopTitleBgm, stopSfx } from './sfx.js';
import { songButtonPos } from './render.js';
import { ticketConcert, resetAds } from './ads.js';
import { showJoinCard, hideJoinCard, drawFit } from './joincard.js';
import { W, H, RANK_SHOW, RANK_STORE, START_BTN } from './config.js';

const canvas = document.getElementById('game');
const nameForm = document.getElementById('nameForm');
const nameInput = document.getElementById('nameInput');
const nameCancel = document.getElementById('nameCancel');
const songLinks = document.getElementById('songLinks');
const ticketLink = document.getElementById('ticketLink');

export const nameFormOpen = () => nameForm.style.display === 'flex';

// 터치 기기 (휴대폰, 태블릿): 플레이 버튼, 가로 회전 안내
export const isTouch = matchMedia('(pointer: coarse)').matches;

export function showTitle() {
  state.scene = 'title';
  hideNameForm();
  playTitleBgm();   // 자동 재생 차단 시 무음
}

// 게임 오버 후 이름 입력칸 (마지막 이름 미리 채움)
function showNameForm() {
  nameForm.style.display = 'flex';
  nameInput.value = loadName();
  nameInput.classList.remove('invalid');
  nameInput.focus();
  nameInput.select();
}

function hideNameForm() {
  nameForm.style.display = 'none';
  nameInput.blur();
}

hooks.onReset = () => { hideNameForm(); resetAds(); hideJoinCard(); stopSfx('gameover'); stopTitleBgm(); };
hooks.onJoin = showJoinCard;
hooks.onGameOver = result => {
  fadeOutBgm();   // 브금은 서서히 줄이고, 목록은 게임 오버 전까지 들은 곡만
  refreshRanking();   // 그사이 다른 사람 기록 반영
  if (result.canRank) showNameForm();
};

// 등록 버튼 (이름이 비어 있으면 막음)
nameForm.addEventListener('submit', e => {
  e.preventDefault();
  const name = nameInput.value.trim().slice(0, 6);
  if (!name) { nameInput.classList.add('invalid'); nameInput.focus(); return; }
  saveName(name);
  registerScore(name);
  hideNameForm();
});
nameInput.addEventListener('input', () => nameInput.classList.remove('invalid'));
// 등록, 취소는 버튼으로만 (Enter 막음)
nameInput.addEventListener('keydown', e => { if (e.key === 'Enter') e.preventDefault(); });
// 취소 버튼: 등록하지 않고 닫기
nameCancel.addEventListener('click', hideNameForm);

// 게임 오버 브금 목록의 곡별 '듣기' 버튼 (매 프레임 호출)
export function syncSongLinks() {
  const songs = state.scene === 'gameover' && !nameFormOpen() ? shownSongs(RANK_SHOW) : [];
  while (songLinks.children.length < songs.length) {
    const a = document.createElement('a');
    a.target = '_blank'; a.rel = 'noopener'; a.textContent = '▶ 듣기';
    songLinks.append(a);
  }
  while (songLinks.children.length > songs.length) songLinks.lastChild.remove();
  if (!songs.length) return;
  const r = canvas.getBoundingClientRect(), k = r.width / W;   // 게임 화면 좌표를 창 좌표로
  songs.forEach((song, n) => {
    const a = songLinks.children[n], p = songButtonPos(n);
    const url = songUrl(song);
    if (a.href !== url) { a.href = url; a.title = song.title; }
    Object.assign(a.style, { left: `${r.left + p.x * k}px`, top: `${r.top + p.y * k}px`, fontSize: `${16 * k}px` });
  });
}

// 게임 오버 '예매하기' 버튼: 가장 가까운 공연 (매 프레임 호출)
export function syncTicketLink() {
  const c = state.scene === 'gameover' && !nameFormOpen() ? ticketConcert() : null;
  ticketLink.style.display = c ? 'block' : 'none';
  if (!c) return;
  if (ticketLink.href !== c.link) { ticketLink.href = c.link; ticketLink.textContent = `🎫 ${c.title} 예매하기`; }
  const r = canvas.getBoundingClientRect(), k = r.width / W;
  Object.assign(ticketLink.style, { left: `${r.left + r.width / 2}px`, top: `${r.top + 600 * k}px`, fontSize: `${20 * k}px` });
}

// 플레이 방법(?), 만든 사람들(!) 창
const openDialog = () => document.querySelector('dialog[open]');
// 창 열기: 닫기 버튼에 포커스가 가며 아래로 스크롤되는 것 막기
function showDialog(id) {
  const d = document.getElementById(id);
  d.showModal();
  d.scrollTop = 0;
}
document.getElementById('helpBtn').addEventListener('click', () => { showDialog('helpDialog'); drawHowto(); });   // 열린 뒤 크기 재서 그림

// 창 안 그림: 칸마다 캐릭터 이미지 (data-squash: 슬라이딩처럼 납작하게)
function drawHowto() {
  for (const c of document.querySelectorAll('dialog[open] canvas[data-pics]')) {
    const names = c.dataset.pics.split(','), S = 2;   // 2배로 그려 선명하게
    c.width = c.clientWidth * S; c.height = c.clientHeight * S;
    const g = c.getContext('2d'), cell = Math.min(c.width / names.length, c.height * 1.2);
    const x0 = (c.width - cell * names.length) / 2;
    g.imageSmoothingEnabled = false;
    if ('squash' in c.dataset) { g.translate(0, c.height); g.scale(1.25, 0.6); g.translate(-c.width * 0.1, -c.height); }
    names.forEach((n, i) => drawFit(g, n, x0 + cell * i, 0, cell, c.height));
  }
}
document.getElementById('rankBtn').addEventListener('click', openRanking);
// 다른 창 위에 겹쳐 열기 (기록 저장 안내)
document.querySelectorAll('[data-open]').forEach(b => b.addEventListener('click', () => showDialog(b.dataset.open)));
document.getElementById('homeBtn').addEventListener('click', goHome);
document.getElementById('infoBtn').addEventListener('click', () => { showDialog('creditDialog'); drawHowto(); });

// 랭킹 창: 오늘, 전체 탭 (열거나 탭을 바꿀 때마다 서버에서 받기)
const rankTabs = document.querySelectorAll('#rankDialog [data-period]');
rankTabs.forEach(b => b.addEventListener('click', () => showRanking(b.dataset.period)));

function openRanking() {
  showDialog('rankDialog');
  showRanking('all');
}

const ymd = d => `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
const RANK_NOTE = {
  today: () => `${ymd(new Date())} 오늘 등록된 기록 중 상위 ${RANK_STORE}위`,
  all: () => `지금까지 등록된 전체 기록 중 상위 ${RANK_STORE}위`,
  mine: () => `이 브라우저에서 등록한 내 기록 중 상위 ${RANK_STORE}개`,
};

async function showRanking(period) {
  rankTabs.forEach(b => b.setAttribute('aria-selected', b.dataset.period === period));
  document.getElementById('rankNote').textContent = RANK_NOTE[period]();
  const list = document.getElementById('rankList');
  const msg = text => { list.innerHTML = ''; const li = document.createElement('li'); li.className = 'msg'; li.textContent = text; list.append(li); };
  msg('불러오는 중');
  const rows = await fetchRanking(period);
  if (!document.querySelector(`#rankDialog [data-period="${period}"][aria-selected="true"]`)) return;   // 그사이 탭 바뀜
  if (!rows) return msg('랭킹을 불러오지 못했어요');
  if (!rows.length) return msg({ today: '오늘 기록이 아직 없어요', mine: '등록한 기록이 아직 없어요' }[period] || '아직 기록이 없어요');
  list.innerHTML = '';
  rows.forEach((r, i) => list.append(rankRow(r, i + 1)));
}

// 한 줄: 순위, 이름과 기록(거리, 음표, 날짜), 라운드, 점수
function rankRow(r, rank) {
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const li = el('li', rank <= 3 ? 'top' + rank : '');
  const info = el('span', 'info');
  info.append(el('span', 'name', r.name));   // 다른 사람이 쓴 이름이라 textContent로
  const meta = [r.distance != null && `${r.distance.toLocaleString()}m`, r.notes != null && `♪ ${r.notes}`, ymd(new Date(r.created_at))].filter(Boolean);
  info.append(el('span', 'meta', meta.join(' · ')));
  li.append(el('span', 'no', rank), info);
  if (r.round) li.append(el('span', 'round', `ROUND ${r.round}`));
  li.append(el('span', 'score', r.score.toLocaleString()));
  return li;
}

// 홈 버튼 (게임 오버, 일시정지): 시작 화면으로
function goHome() {
  openDialog()?.close();
  state.paused = false;
  fadeOutBgm(300);
  stopSfx('slide');
  stopSfx('gameover');
  hideJoinCard();
  showTitle();
}

// 시작 화면 START 버튼 위인지 (창 좌표)
function onStart(e) {
  const r = canvas.getBoundingClientRect();
  const x = (e.clientX - r.left) * W / r.width, y = (e.clientY - r.top) * H / r.height;
  return x >= START_BTN.x && x <= START_BTN.x + START_BTN.w && y >= START_BTN.y && y <= START_BTN.y + START_BTN.h;
}

function start() {
  stopTitleBgm(); playBgm(); startIntro();
}

// 창을 벗어나면 일시정지 (다른 창 클릭, 탭 전환)
function pauseGame() {
  if (state.scene !== 'play' || state.paused) return;
  state.paused = true;
  state.slideHeld = false;
  stopSfx('slide');
  pauseBgm();
}

function resumeGame() {
  state.paused = false;
  resumeBgm();
}

addEventListener('blur', pauseGame);
// 플레이 중 세로로 돌리면 일시정지
matchMedia('(orientation: portrait)').addEventListener('change', e => { if (isTouch && e.matches) pauseGame(); });

// 터치 플레이 버튼: 점프, 누르고 있으면 슬라이딩
const jumpBtn = document.getElementById('jumpBtn'), slideBtn = document.getElementById('slideBtn');
jumpBtn.addEventListener('pointerdown', e => { e.preventDefault(); jump(); });
slideBtn.addEventListener('pointerdown', e => { e.preventDefault(); state.slideHeld = true; });
for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) slideBtn.addEventListener(ev, () => { state.slideHeld = false; });

// 가로 회전 안내: 처음 한 번, 누르면 닫고 가능하면 전체 화면, 가로 고정 (iOS는 지원 안 함)
const guide = document.getElementById('rotateGuide');
if (isTouch) document.body.setAttribute('data-guide', '');
guide.addEventListener('click', async () => {
  document.body.removeAttribute('data-guide');
  playTitleBgm();   // 첫 터치에 타이틀 브금
  try {
    await document.documentElement.requestFullscreen?.();
    await screen.orientation?.lock?.('landscape');
  } catch { /* 지원 안 하는 브라우저는 그대로 */ }
});
document.addEventListener('visibilitychange', () => { if (document.hidden) pauseGame(); });

// Space, 탭: 장면에 따라 다시 하기, 점프 (시작 화면은 START 버튼으로만 시작)
function press() {
  if (state.paused) return resumeGame();
  if (state.scene === 'title') return playTitleBgm();   // 자동 재생 차단 시 타이틀 브금 켜기
  if (state.scene === 'gameover') { if (!nameFormOpen()) { playBgm(); reset(); } return; }
  jump();
}

addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT' || openDialog()) return;   // 이름 입력, 창이 열려 있으면 게임 조작 무시
  if (['Space', 'ArrowUp', 'KeyW'].includes(e.code)) { e.preventDefault(); press(); }
  if (['ArrowDown', 'KeyS'].includes(e.code)) { e.preventDefault(); state.slideHeld = true; }
  if (e.code === 'KeyA') {
    state.auto = !state.auto;
    state.slideHeld = false;
    if (state.auto && state.scene === 'play') state.autoUsed = true;
  }
});
addEventListener('keyup', e => { if (['ArrowDown', 'KeyS'].includes(e.code)) state.slideHeld = false; });

// 터치, 클릭: 화면 왼쪽 슬라이딩(누르고 있기), 오른쪽 점프
canvas.addEventListener('pointerdown', e => {
  const r = canvas.getBoundingClientRect();
  if (state.paused) resumeGame();
  else if (state.scene === 'title' && onStart(e)) start();
  else if (state.scene === 'play' && e.clientX - r.left < r.width / 2) state.slideHeld = true;
  else press();
});
canvas.addEventListener('pointermove', e => {
  canvas.style.cursor = state.scene === 'title' && onStart(e) ? 'pointer' : '';
});
addEventListener('pointerup', () => { state.slideHeld = false; });
