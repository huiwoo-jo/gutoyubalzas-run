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

// 타이틀 브금: 긴 반복 곡이라 오디오 태그
const titleBgm = new Audio(url('title_bgm_icecream'));
titleBgm.volume = TITLE_BGM_VOLUME;
titleBgm.loop = true;
titleBgm.preload = 'auto';

export function playTitleBgm() {
  if (titleBgm.paused) titleBgm.play().catch(() => {});   // 자동 재생 차단 시 무시
}

export const titleBgmPaused = () => titleBgm.paused;

export function stopTitleBgm() {
  titleBgm.pause();
  titleBgm.currentTime = 0;
}
