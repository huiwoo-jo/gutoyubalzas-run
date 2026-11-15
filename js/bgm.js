// 브금: 유튜브 공식 임베드 플레이어(IFrame API)로 재생목록에서 랜덤 곡 사용
// 유튜브 정책상 플레이어는 숨기지 않고 200×200으로 반영

import { BGM_PLAYLIST, BGM_VOLUME, IS_TOUCH } from './config.js';

// 터치 기기는 화면이 작아 플레이어가 게임을 가려서 유튜브 대신 타이틀 브금 (sfx.js)
const USE_YOUTUBE = !!BGM_PLAYLIST && !IS_TOUCH;

const ENDED = 0, PLAYING = 1, CUED = 5;
const $ = id => document.getElementById(id);

let player = null;
let ready = false;
let ids = [];            // 재생목록의 영상 ID들
let wantPlay = false;    // 목록을 받기 전에 시작을 누른 경우
let failures = 0;        // 연달아 재생 실패한 횟수: 무한 반복 방지
const now = { id: '', title: '' };   // 지금 틀고 있는 곡
let played = [];         // 이번 판에 나온 곡 { id, title }
let recording = false;   // 플레이 중에만 기록
let fadeTimer = 0;

export const playedSongs = () => played;

export const songUrl = song => `https://www.youtube.com/watch?v=${song.id}`;

// 게임 오버 목록에 보일 곡 (max줄 초과 시 max-1곡)
export const shownSongs = max => (played.length > max ? played.slice(0, max - 1) : played);

// 게임 오버: 기록 중지, ms 동안 페이드 아웃 후 일시정지
export function fadeOutBgm(ms = 2000) {
  recording = false;
  if (!player || !ready) return;
  clearInterval(fadeTimer);
  const start = performance.now();
  fadeTimer = setInterval(() => {
    const k = Math.min(1, (performance.now() - start) / ms);
    player.setVolume(Math.round(BGM_VOLUME * (1 - k)));
    if (k >= 1) { clearInterval(fadeTimer); player.pauseVideo(); }
  }, 50);
}

// 일시정지, 다시 시작 (게임 중에만)
export function pauseBgm() {
  if (player && ready) player.pauseVideo();
}

export function resumeBgm() {
  if (player && ready && recording) player.playVideo();
}

function pickRandom() {
  if (!ids.length) return '';
  if (ids.length === 1) return ids[0];
  let id;
  do { id = ids[Math.floor(Math.random() * ids.length)]; } while (id === now.id);
  return id;
}

function playRandom() {
  const id = pickRandom();
  if (!id) return;
  now.id = id;
  now.title = '';
  player.loadVideoById(id);
}

// 게임 시작 시 입력 처리 안에서 호출 (브라우저 자동 재생 정책)
export function playBgm() {
  if (!USE_YOUTUBE) return;
  played = [];           // 새 판: 브금 기록 비우기
  recording = true;
  if (!ready || !ids.length) { wantPlay = true; return; }
  clearInterval(fadeTimer);   // 페이드 아웃 중이면 멈추고 소리 되돌리기
  player.setVolume(BGM_VOLUME);
  failures = 0;
  playRandom();
}

function onStateChange(e) {
  if (e.data === CUED && !ids.length) {            // 재생목록을 다 받았을 때
    ids = player.getPlaylist() || [];
    if (wantPlay) { wantPlay = false; playRandom(); }
  } else if (e.data === PLAYING) {
    failures = 0;
    const title = player.getVideoData().title || '';
    if (recording && title && title !== now.title) played.push({ id: now.id, title });   // 일시정지 후 재개는 다시 넣지 않음
    now.title = title;
  } else if (e.data === ENDED) {
    playRandom();                                  // 곡이 끝나면 다음 랜덤 곡
  }
}

// 카드 표시: 곡 제목 및 가수
function updateCard() {
  if (!ready) return;
  const d = player.getVideoData() || {};
  if (!d.title) return;
  $('bgmTitle').textContent = '♪ ' + d.title;
  $('bgmArtist').textContent = (d.author || '').replace(/ - Topic$/, '');
}

// 퍼가기가 막힌 영상 등은 건너뛰고 다른 곡
function onError() {
  if (++failures < 5) playRandom();
}

export const bgmEnabled = USE_YOUTUBE;

// 브금 카드 표시 (게임 중이거나 소리가 날 때만, 매 프레임 호출)
export function syncBgmCard(inGame) {
  if (!bgmEnabled) return;
  const sounding = ready && player.getPlayerState() === PLAYING;
  const show = inGame || sounding;
  $('bgmCard').style.opacity = show ? '1' : '0';
  $('bgmCard').style.pointerEvents = show ? '' : 'none';
}

function init() {
  if (!USE_YOUTUBE) return;
  $('bgmCard').style.display = 'flex';
  $('bgmCard').style.opacity = '0';
  setInterval(updateCard, 500);
  window.onYouTubeIframeAPIReady = () => {
    player = new YT.Player('bgm', {
      width: 200, height: 200,
      playerVars: { playsinline: 1, rel: 0, controls: 0 },
      events: {
        onReady: () => {
          ready = true;
          player.setVolume(BGM_VOLUME);
          player.cuePlaylist({ listType: 'playlist', list: BGM_PLAYLIST });
        },
        onStateChange,
        onError,
      },
    });
  };
  const s = document.createElement('script');
  s.src = 'https://www.youtube.com/iframe_api';
  s.onerror = () => console.warn('유튜브 플레이어를 불러오지 못해 브금 없이 진행합니다.');
  document.head.append(s);
}

init();
