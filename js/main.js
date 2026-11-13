// 시작점: 화면 크기, 에셋 로딩, 게임 루프
import { W, H } from './config.js';
import { loadAssets } from './assets.js';
import { state, reset, update } from './game.js';
import { render } from './render.js';
import { showTitle, syncSongLinks, syncTicketLink } from './input.js';
import { syncBgmCard } from './bgm.js';
import { loadAds } from './ads.js';

const canvas = document.getElementById('game');
const nameForm = document.getElementById('nameForm');

// 비율 유지, 창 가운데에 꽉 차게
function fit() {
  const s = Math.min(innerWidth / W, innerHeight / H);
  const cw = W * s, ch = H * s, left = (innerWidth - cw) / 2, top = (innerHeight - ch) / 2;
  Object.assign(canvas.style, { width: cw + 'px', height: ch + 'px', left: left + 'px', top: top + 'px' });
  nameForm.style.left = left + cw / 2 + 'px';        // 이름 입력칸은 게임 화면 60% 높이
  nameForm.style.top = top + ch * 0.6 + 'px';
}
addEventListener('resize', fit);
fit();

let last = performance.now();
function loop(now) {
  const dt = Math.min(0.033, (now - last) / 1000); // 탭 전환 후 순간이동 방지
  last = now;
  update(dt);
  render();
  syncSongLinks();
  syncTicketLink();
  syncBgmCard(['intro', 'play', 'fall'].includes(state.scene));
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

loadAds();   // 광고판 (실패해도 게임 진행)
loadAssets()
  .then(showTitle)
  .catch(err => { state.errorMsg = err.message; state.scene = 'error'; console.error(err); });

// 테스트용: ?debug 시 콘솔에서 window.game으로 상태 확인
if (new URLSearchParams(location.search).has('debug')) window.game = { state, reset };
