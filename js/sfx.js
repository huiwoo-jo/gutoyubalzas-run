// 효과음, 타이틀 브금 (assets/sounds)
// 효과음은 Web Audio: 처음에 한 번 받아 디코딩, 지연 없이 재생하고 겹쳐도 끊기지 않음
import { SFX_VOLUME, TITLE_BGM_VOLUME } from './config.js';

const SFX = ['jump', 'slide', 'gameover', 'eat', 'join_gito', 'join_beobyoung', 'join_donghun', 'join_jangdan'];
const ONE_AT_A_TIME = new Set(['jump', 'slide', 'gameover']);   // 다시 나면 앞 소리 끊기

const url = name => `assets/sounds/${name}.m4a`;
const ctx = new AudioContext();
const out = ctx.createGain();
out.gain.value = SFX_VOLUME;
out.connect(ctx.destination);

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
  if (!buf) return;   // 없는 효과음 (천진우 합류 등), 아직 불러오는 중
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

// 타이틀 브금: Web Audio로 반복 (iOS는 오디오 태그 볼륨을 무시해 효과음보다 크게 들림)
const titleOut = ctx.createGain();
titleOut.gain.value = TITLE_BGM_VOLUME;
titleOut.connect(ctx.destination);
let titleBuf = null, titleSrc = null, titleAt = 0, titleOffset = 0, titleWanted = false;
fetch(url('title_bgm_icecream'))
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

// 자동 재생 차단(소리 꺼진 상태)도 멈춘 것으로 봄
export const titleBgmPaused = () => !titleSrc || ctx.state !== 'running';

export function pauseTitleBgm() {
  titleWanted = false;
  if (!titleSrc) return;
  titleOffset += ctx.currentTime - titleAt;   // 이어서 재생할 위치
  titleSrc.stop();
  titleSrc = null;
}

export function stopTitleBgm() {
  pauseTitleBgm();
  titleOffset = 0;
}
