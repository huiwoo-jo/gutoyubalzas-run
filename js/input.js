// 입력: 키보드, 터치 조작과 랭킹 이름 입력
import { state, reset, jump, hooks, startIntro, registerScore } from './game.js';
import { loadName, saveName } from './storage.js';
import { playBgm, fadeOutBgm, shownSongs, songUrl } from './bgm.js';
import { songButtonPos } from './render.js';
import { ticketConcert, resetAds } from './ads.js';
import { W, RANK_SHOW } from './config.js';

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

hooks.onReset = () => { hideNameForm(); resetAds(); };
hooks.onGameOver = result => {
  fadeOutBgm();   // 브금은 서서히 줄이고, 목록은 게임 오버 전까지 들은 곡만
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
  Object.assign(ticketLink.style, { left: `${r.left + r.width / 2}px`, top: `${r.top + 620 * k}px`, fontSize: `${20 * k}px` });
}

// Space, 탭: 장면에 따라 시작, 다시 하기, 점프
function press() {
  if (state.scene === 'title') { playBgm(); return startIntro(); }
  if (state.scene === 'gameover') { if (!nameFormOpen()) { playBgm(); reset(); } return; }
  jump();
}

addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT') return;   // 이름 입력 중에는 게임 조작 무시
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
  if (state.scene === 'play' && e.clientX - r.left < r.width / 2) state.slideHeld = true;
  else press();
});
addEventListener('pointerup', () => { state.slideHeld = false; });
