// 효과음, 타이틀 브금 (assets/sounds)
// 효과음은 Web Audio: 처음에 한 번 받아 디코딩, 지연 없이 재생하고 겹쳐도 끊기지 않음
import { SFX_VOLUME, TITLE_BGM_VOLUME, TOUCH_BOOST, IS_TOUCH } from './config.js';

const SFX = ['jump', 'slide', 'gameover', 'eat', 'eat_uwek', 'hit', 'gamestart', 'intro_crew', 'join_jinwoo', 'join_gito', 'join_beobyoung', 'join_donghun', 'join_jangdan'];
const ONE_AT_A_TIME = new Set(['jump', 'slide', 'hit', 'gamestart', 'gameover']);   // 다시 나면 앞 소리 끊기

const url = name => `assets/sounds/${name}.m4a`;
// iOS: 게임 소리로 재생 (무음 모드, 낮은 음량 영향 줄이기, 지원하는 Safari만)
if (navigator.audioSession) navigator.audioSession.type = 'playback';

const ctx = new AudioContext();
const boost = IS_TOUCH ? TOUCH_BOOST : 1;
// 리미터: 소리를 키워도 겹칠 때 찢어지지 않게
const master = ctx.createDynamicsCompressor();
master.threshold.value = -3; master.knee.value = 0; master.ratio.value = 20; master.attack.value = 0.003; master.release.value = 0.1;
master.connect(ctx.destination);
const out = ctx.createGain();
out.gain.value = SFX_VOLUME * boost;
out.connect(master);

const buffers = {};   // 이름: 디코딩된 소리
const playing = {};   // 이름: 재생 중인 소리 (ONE_AT_A_TIME만)
SFX.forEach(name => fetch(url(name))
  .then(r => r.arrayBuffer())
  .then(b => ctx.decodeAudioData(b))
  .then(buf => { buffers[name] = buf; })
  .catch(err => console.warn('효과음을 불러오지 못했어요: ' + name, err)));

// 자동 재생 정책: 첫 입력 때 소리 켜기
const unlock = () => { if (ctx.state === 'suspended') ctx.resume(); };
addEventListener('pointerdown', unlock);
addEventListener('keydown', unlock);

export function playSfx(name) {
  const buf = buffers[name];
  if (!buf) return;   // 없는 효과음, 아직 불러오는 중
  if (ONE_AT_A_TIME.has(name)) stopSfx(name);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.connect(out);
  if (name === 'gameover') src.onended = () => { if (playing.gameover === src) playTitleBgm(); };   // 끝까지 들으면 타이틀 브금
  if (ONE_AT_A_TIME.has(name)) playing[name] = src;
  src.start();
}

export function stopSfx(name) {
  const src = playing[name];
  if (!src) return;
  delete playing[name];
  src.onended = null;
  src.stop();
}

// 타이틀 브금: Web Audio로 반복
const titleOut = ctx.createGain();
titleOut.gain.value = TITLE_BGM_VOLUME * boost;
titleOut.connect(master);
let titleBuf = null, titleSrc = null, titleAt = 0, titleOffset = 0, titleWanted = false;
fetch(url('title_bgm'))
  .then(r => r.arrayBuffer())
  .then(b => ctx.decodeAudioData(b))
  .then(buf => { titleBuf = buf; if (titleWanted) playTitleBgm(); })
  .catch(err => console.warn('타이틀 브금을 불러오지 못했어요', err));

export function playTitleBgm() {
  titleWanted = true;
  if (titleSrc || !titleBuf) return;   // 재생 중, 아직 불러오는 중이면 끝나고 재생
  unlock();
  titleSrc = ctx.createBufferSource();
  titleSrc.buffer = titleBuf;
  titleSrc.loop = true;
  titleSrc.connect(titleOut);
  titleSrc.start(0, titleOffset % titleBuf.duration);
  titleAt = ctx.currentTime;
}

// 게임 플레이 브금: Web Audio로 반복
const gameBgmOut = ctx.createGain();
gameBgmOut.gain.value = TITLE_BGM_VOLUME * boost;
gameBgmOut.connect(master);
let gameBgmBuf = null, gameBgmSrc = null, gameBgmAt = 0, gameBgmOffset = 0, gameBgmWanted = false;
if (IS_TOUCH) fetch(url('game_bgm'))   // PC는 유튜브 브금이라 받지 않음 (2MB)
  .then(r => r.arrayBuffer())
  .then(b => ctx.decodeAudioData(b))
  .then(buf => { gameBgmBuf = buf; if (gameBgmWanted) playGameBgm(); })
  .catch(err => console.warn('게임 브금을 불러오지 못했어요', err));

let gameFade = 0;   // 진행 중인 페이드 아웃 (새로 재생하면 취소)
export function playGameBgm() {
  gameBgmWanted = true;
  clearTimeout(gameFade);
  gameBgmOut.gain.cancelScheduledValues(ctx.currentTime);
  gameBgmOut.gain.setValueAtTime(TITLE_BGM_VOLUME * boost, ctx.currentTime);   // 페이드 아웃 뒤 음량 되돌리기
  if (gameBgmSrc || !gameBgmBuf) return;   // 재생 중, 아직 불러오는 중이면 끝나고 재생
  unlock();
  gameBgmSrc = ctx.createBufferSource();
  gameBgmSrc.buffer = gameBgmBuf;
  gameBgmSrc.loop = true;
  gameBgmSrc.connect(gameBgmOut);
  gameBgmSrc.start(0, gameBgmOffset % gameBgmBuf.duration);
  gameBgmAt = ctx.currentTime;
}

// 자동 재생 차단(소리 꺼진 상태)도 멈춘 것으로 봄
export const titleBgmPaused = () => !titleSrc || ctx.state !== 'running';

export function pauseTitleBgm() {
  titleWanted = false;
  if (!titleSrc) return;
  titleOffset += ctx.currentTime - titleAt;   // 일시정지한 위치 기억
  titleSrc.stop();
  titleSrc = null;
}

export function stopTitleBgm() {
  pauseTitleBgm();
  titleOffset = 0;
}

export function pauseGameBgm() {
  gameBgmWanted = false;
  if (!gameBgmSrc) return;
  gameBgmOffset += ctx.currentTime - gameBgmAt;   // 일시정지한 위치 기억
  gameBgmSrc.stop();
  gameBgmSrc = null;
}

export function stopGameBgm() {
  pauseGameBgm();
  gameBgmOffset = 0;
}

// 게임 오버 직전: ms 동안 줄인 뒤 멈춤
export function fadeOutGameBgm(ms = 800) {
  gameBgmWanted = false;
  const t = ctx.currentTime;
  gameBgmOut.gain.cancelScheduledValues(t);
  gameBgmOut.gain.setValueAtTime(gameBgmOut.gain.value, t);
  gameBgmOut.gain.linearRampToValueAtTime(0, t + ms / 1000);
  clearTimeout(gameFade);
  gameFade = setTimeout(stopGameBgm, ms);
}

