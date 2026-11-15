// 입력: 키보드, 터치 조작과 랭킹 이름 입력
import { state, reset, jump, hooks, startIntro, registerScore, runMode } from './game.js';
import { loadName, saveName, refreshRanking, fetchRanking, groupOf } from './storage.js';
import { playBgm, fadeOutBgm, pauseBgm, resumeBgm, shownSongs, songUrl } from './bgm.js';
import { playTitleBgm, stopTitleBgm, pauseTitleBgm, stopSfx } from './sfx.js';
import { songButtonPos } from './render.js';
import { ticketConcert, resetAds } from './ads.js';
import { showJoinCard, hideJoinCard, drawFit } from './joincard.js';
import { W, H, RANK_SHOW, RANK_STORE, START_BTN, IS_TOUCH } from './config.js';

const canvas = document.getElementById('game');
const nameForm = document.getElementById('nameForm');
const nameInput = document.getElementById('nameInput');
const nameCancel = document.getElementById('nameCancel');
const songLinks = document.getElementById('songLinks');
const ticketLink = document.getElementById('ticketLink');

export const nameFormOpen = () => nameForm.style.display === 'flex';


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

hooks.onReset = () => {
  hideNameForm(); resetAds(); hideJoinCard(); stopSfx('gameover');
  if (IS_TOUCH) playTitleBgm();   // 터치 기기는 플레이 중에도 타이틀 브금
  else stopTitleBgm();
};
hooks.onJoin = showJoinCard;
hooks.onGameOver = result => {
  fadeOutBgm();   // 브금은 서서히 줄이고, 목록은 게임 오버 전까지 들은 곡만
  if (IS_TOUCH) stopTitleBgm();   // 게임 오버 효과음 뒤 다시 (sfx.js)
  refreshRanking(groupOf(runMode()));   // 이번 모드 랭킹, 그사이 다른 사람 기록 반영
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
  const x = IS_TOUCH ? W / 2 + 250 : W / 2, y = IS_TOUCH ? 420 : 600;   // 휴대폰은 랭킹 오른쪽 (render.js drawGameOver)
  Object.assign(ticketLink.style, { left: `${r.left + x * k}px`, top: `${r.top + y * k}px`, fontSize: `${Math.max(14, 20 * k)}px`, maxWidth: `${520 * k}px` });   // 휴대폰에서도 읽히게
}

// 플레이 방법(?), 만든 사람들(!) 창
const openDialog = () => document.querySelector('dialog[open]');
// 창 열기: 닫기 버튼에 포커스가 가며 아래로 스크롤되는 것 막기
function showDialog(id) {
  const d = document.getElementById(id);
  d.showModal();
  d.scrollTop = 0;
  paginate(d);
}

// 창이 화면에 다 안 들어가면 .page 단위로 나눠 ←, → 버튼으로 넘기기 (스크롤 대신)
function paginate(d) {
  const pages = [...d.querySelectorAll('.page')];
  let nav = d.querySelector('.pager');
  if (!nav) {
    nav = document.createElement('nav');
    nav.className = 'pager';
    nav.innerHTML = '<button type="button" class="prev" aria-label="이전 쪽">←</button><span></span><button type="button" class="next" aria-label="다음 쪽">→</button>';
    nav.querySelector('.prev').addEventListener('click', () => showPage(d, +d.dataset.page - 1));
    nav.querySelector('.next').addEventListener('click', () => showPage(d, +d.dataset.page + 1));
    d.querySelector('form[method="dialog"]').prepend(nav);   // 닫기 버튼과 같은 줄
  }
  pages.forEach(p => { p.hidden = false; });
  nav.hidden = true;
  delete d.dataset.page;
  if (pages.length > 1 && d.scrollHeight > d.clientHeight + 4) showPage(d, 0);   // 한 번에 다 보이면 그대로 (반올림 오차 4px 허용)
}

function showPage(d, n) {
  const pages = [...d.querySelectorAll('.page')], nav = d.querySelector('.pager');
  d.dataset.page = n;
  pages.forEach((p, i) => { p.hidden = i !== n; });
  nav.hidden = false;
  nav.querySelector('span').textContent = `${n + 1} / ${pages.length}`;
  nav.querySelector('.prev').disabled = n === 0;
  nav.querySelector('.next').disabled = n === pages.length - 1;
  drawHowto();   // 새로 보이는 그림
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
    const scale = names.length > 1 ? 0.7 : 1;
    names.forEach((n, i) => drawFit(g, n, x0 + cell * i, 0, cell, c.height, scale));
  }
}

document.getElementById('rankBtn').addEventListener('click', openRanking);
// 다른 창 위에 겹쳐 열기 (기록 저장 안내)
document.querySelectorAll('[data-open]').forEach(b => b.addEventListener('click', () => showDialog(b.dataset.open)));
document.getElementById('homeBtn').addEventListener('click', goHome);
document.getElementById('infoBtn').addEventListener('click', () => { showDialog('creditDialog'); drawHowto(); });

// 랭킹 창: 오늘, 전체 탭 (열거나 탭을 바꿀 때마다 서버에서 받기)
const rankTabs = document.querySelectorAll('#rankDialog [data-period]');
const groupTabs = document.querySelectorAll('#rankDialog [data-group]');
let rankPeriod = 'all', rankGroup = 'crew';   // 랭킹 창 기간, 모드 (5인, 캐릭터)
rankTabs.forEach(b => b.addEventListener('click', () => showRanking(b.dataset.period)));
groupTabs.forEach(b => b.addEventListener('click', () => { rankGroup = b.dataset.group; showRanking(rankPeriod); }));

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
  rankPeriod = period;
  rankTabs.forEach(b => b.setAttribute('aria-selected', b.dataset.period === period));
  groupTabs.forEach(b => b.setAttribute('aria-selected', b.dataset.group === rankGroup));
  document.getElementById('rankNote').textContent = RANK_NOTE[period]();
  const list = document.getElementById('rankList');
  const msg = text => { list.innerHTML = ''; const ol = document.createElement('ol'); ol.className = 'rank'; const li = document.createElement('li'); li.className = 'msg'; li.textContent = text; ol.append(li); list.append(ol); paginate(document.getElementById('rankDialog')); };
  msg('불러오는 중');
  const group = rankGroup;
  const rows = await fetchRanking(period, group);
  if (period !== rankPeriod || group !== rankGroup) return;   // 그사이 탭 바뀜
  if (!rows) return msg('랭킹을 불러오지 못했어요');
  if (!rows.length) return msg({ today: '오늘 기록이 아직 없어요', mine: '등록한 기록이 아직 없어요' }[period] || '아직 기록이 없어요');
  list.innerHTML = '';
  for (let i = 0; i < rows.length; i += 5) {   // 5줄씩 묶어 화면이 낮으면 쪽 나눔
    const ol = document.createElement('ol');
    ol.className = 'rank page';
    rows.slice(i, i + 5).forEach((r, k) => ol.append(rankRow(r, i + k + 1)));
    list.append(ol);
  }
  paginate(document.getElementById('rankDialog'));
  drawHowto();   // 캐릭터 달리기 멤버 우웩이
}

// 한 줄: 순위, 이름과 기록(거리, 음표, 날짜), 라운드, 점수
function rankRow(r, rank) {
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const li = el('li', rank <= 3 ? 'top' + rank : '');
  const info = el('span', 'info');
  info.append(el('span', 'name', r.name));   // 다른 사람이 쓴 이름이라 textContent로
  const meta = [r.distance != null && `${r.distance.toLocaleString()}m`, r.notes != null && `♪ ${r.notes}`, ymd(new Date(r.created_at))].filter(Boolean);
  info.append(el('span', 'meta', meta.join(' · ')));
  li.append(el('span', 'no', rank));
  if (r.mode && r.mode !== 'crew') {   // 캐릭터 달리기: 달린 멤버
    const c = el('canvas', 'runner');
    c.dataset.pics = 'uwek_' + r.mode;
    li.append(c);
  }
  li.append(info);
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

// START: 달리기 모드 선택 창 (5인 달리기, 캐릭터 달리기 → 멤버 선택)
const modeDialog = document.getElementById('modeDialog');
const modeBack = modeDialog.querySelector('.back');
function showModeView(view) {
  modeDialog.querySelectorAll('.modeView').forEach(v => { v.hidden = v.dataset.view !== view; });
  modeBack.hidden = view !== 'members';
  drawHowto();
}
function start() {
  showDialog('modeDialog');
  showModeView('modes');
}
modeDialog.querySelectorAll('.modePick').forEach(b => b.addEventListener('click', () => {
  if (b.dataset.mode === 'crew') run(null);
  else showModeView('members');
}));
modeDialog.querySelectorAll('.memberPick').forEach(b => b.addEventListener('click', () => run(b.dataset.solo)));   // 합류음은 startIntro에서
modeBack.addEventListener('click', () => showModeView('modes'));

// 고른 모드로 출발 (solo: 멤버 id, null이면 5인 달리기)
function run(solo) {
  modeDialog.close();
  if (!IS_TOUCH) stopTitleBgm();
  refreshRanking(solo ? 'solo' : 'crew');   // 플레이 중 BEST, MY도 이 모드 기준
  playBgm(); startIntro(solo);
}

// 창을 벗어나면 일시정지 (다른 창 클릭, 탭 전환)
function pauseGame() {
  if (state.scene !== 'play' || state.paused) return;
  state.paused = true;
  state.slideHeld = false;
  stopSfx('slide');
  pauseBgm();
  if (IS_TOUCH) pauseTitleBgm();
}

function resumeGame() {
  state.paused = false;
  resumeBgm();
  if (IS_TOUCH) playTitleBgm();
}

addEventListener('blur', pauseGame);
// 세로 화면: 가로로 돌리기 전까지 안내로 막기 (플레이 중이면 일시정지)
const portrait = matchMedia('(orientation: portrait)');
function syncPortrait() {
  const on = IS_TOUCH && portrait.matches;
  document.body.toggleAttribute('data-portrait', on);
  if (on) pauseGame();
}
portrait.addEventListener('change', syncPortrait);
syncPortrait();

// 터치 플레이 버튼: 점프, 누르고 있으면 슬라이딩
const jumpBtn = document.getElementById('jumpBtn'), slideBtn = document.getElementById('slideBtn');
// 누르는 동안 버튼 반전 (.on), 슬라이딩은 누른 손가락을 뗄 때까지 유지
let slidePointer = null;
for (const b of [jumpBtn, slideBtn]) {
  b.addEventListener('contextmenu', e => e.preventDefault());   // 길게 누를 때 메뉴 막기
  b.addEventListener('pointerdown', e => {
    e.preventDefault();
    try { b.setPointerCapture(e.pointerId); } catch { /* 지원 안 하면 그대로 */ }   // 손가락이 버튼 밖으로 밀려도 계속 이 버튼
    b.classList.add('on');
    if (b === jumpBtn) jump();
    else { slidePointer = e.pointerId; state.slideHeld = true; }
  });
  for (const ev of ['pointerup', 'pointercancel']) b.addEventListener(ev, e => {
    b.classList.remove('on');
    if (b === slideBtn && e.pointerId === slidePointer) { slidePointer = null; state.slideHeld = false; }
  });
}

// 가로 회전 안내: 처음 한 번, 누르면 닫고 가능하면 전체 화면, 가로 고정 (iOS는 지원 안 함)
const guide = document.getElementById('rotateGuide');
if (IS_TOUCH) document.body.setAttribute('data-guide', '');
guide.addEventListener('click', async () => {
  if (document.body.hasAttribute('data-portrait')) return;   // 세로면 진행 안 함
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
addEventListener('pointerup', e => { if (e.pointerId !== slidePointer) state.slideHeld = slidePointer !== null; });   // 다른 손가락을 떼도 SLIDE 버튼 슬라이딩은 유지
