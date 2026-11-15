// 시작점: 화면 크기, 에셋 로딩, 게임 루프
import { W, H, IS_TOUCH } from './config.js';
import { loadAssets } from './assets.js';
import { state, reset, update } from './game.js';
import { render } from './render.js';
import { showTitle, syncSongLinks, syncTicketLink } from './input.js';
import { syncBgmCard } from './bgm.js';
import { loadAds } from './ads.js';
import { refreshRanking } from './storage.js';

const canvas = document.getElementById('game');
const nameForm = document.getElementById('nameForm');
const ui = document.getElementById('ui');
if (IS_TOUCH) document.body.setAttribute('data-touch', '');   // 터치 버튼, 회전 안내 (style.css)

// 비율 유지, 창 가운데에 꽉 차게
function fit() {
  const s = Math.min(innerWidth / W, innerHeight / H);
  const cw = W * s, ch = H * s, left = (innerWidth - cw) / 2, top = (innerHeight - ch) / 2;
  Object.assign(canvas.style, { width: cw + 'px', height: ch + 'px', left: left + 'px', top: top + 'px' });
  Object.assign(ui.style, { width: cw + 'px', height: ch + 'px', left: left + 'px', top: top + 'px' });
  ui.style.setProperty('--s', s);
  // PC 플레이 중 오른쪽 위 아이콘: 유튜브 브금 카드(창 오른쪽 위 222×270)와 겹치면 카드 왼쪽으로
  const under = top < 8 + 270 && left + cw > innerWidth - 230;
  ui.style.setProperty('--card-gap', under ? `${left + cw - (innerWidth - 230)}px` : '0px');
  nameForm.style.left = left + cw / 2 + 'px';        // 이름 입력칸은 게임 화면 60% 높이
  nameForm.style.top = top + ch * 0.6 + 'px';
}
// 휴대폰 회전: 회전 직후 창 크기가 이전 값으로 오는 브라우저(iOS Safari 등)가 있어 자리 잡은 뒤 한 번 더
function refit() {
  fit();
  requestAnimationFrame(fit);
  setTimeout(fit, 350);
}
addEventListener('resize', refit);
addEventListener('orientationchange', refit);
screen.orientation?.addEventListener('change', refit);
visualViewport?.addEventListener('resize', refit);   // 주소창이 접히고 펴질 때
fit();

let last = performance.now();
function loop(now) {
  const dt = Math.min(0.033, (now - last) / 1000); // 탭 전환 후 순간이동 방지
  last = now;
  update(dt);
  render();
  syncSongLinks();
  syncTicketLink();
  if (document.body.dataset.scene !== state.scene) document.body.dataset.scene = state.scene;   // 장면별 HTML 표시 (style.css)
  document.body.toggleAttribute('data-paused', state.paused);
  syncBgmCard(['intro', 'play', 'fall'].includes(state.scene));
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

loadAds();          // 광고판 (실패해도 게임 진행)
refreshRanking();   // 서버 랭킹 (실패해도 게임 진행)
loadAssets()
  .then(showTitle)
  .catch(err => { state.errorMsg = err.message; state.scene = 'error'; console.error(err); });

// 테스트용: ?debug 시 콘솔에서 window.game으로 상태 확인
if (new URLSearchParams(location.search).has('debug')) window.game = { state, reset };
