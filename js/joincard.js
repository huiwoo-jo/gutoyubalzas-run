// 멤버 합류 카드: 악기 든 멤버를 점수 아래로 슬라이드 (브금 카드 크기, 창이 작으면 축소)
import { W } from './config.js';
import { IMG } from './assets.js';

const canvas = document.getElementById('game');
const card = document.getElementById('joinCard');
const pic = document.getElementById('joinPic');
const SIZE = pic.width;
const crops = {};

// 그림이 있는 영역 (투명 여백 제외, 1/8 축소로 계산)
function cropOf(img) {
  const s = 8, w = Math.ceil(img.width / s), h = Math.ceil(img.height / s);
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.drawImage(img, 0, 0, w, h);
  const a = g.getImageData(0, 0, w, h).data;
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (a[(y * w + x) * 4 + 3] > 16) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  }
  if (x1 < 0) return { x: 0, y: 0, w: img.width, h: img.height };   // 전부 투명
  const x = Math.max(0, (x0 - 1) * s), y = Math.max(0, (y0 - 1) * s);
  return { x, y, w: Math.min(img.width, (x1 + 2) * s) - x, h: Math.min(img.height, (y1 + 2) * s) - y };
}

// 이미지의 그림 영역을 (x, y, w, h) 칸 바닥에 맞춰 높이 기준으로 그리기 (scale: 칸 높이 대비 크기, 플레이 방법 그림에도 사용)
export function drawFit(g, name, x, y, w, h, scale = 1) {
  const img = IMG[name];
  if (!img) return;
  const b = crops[name] ||= cropOf(img);
  const k = h * 0.9 * scale / b.h, dw = b.w * k, dh = b.h * k;
  g.drawImage(img, b.x, b.y, b.w, b.h, x + (w - dw) / 2, y + h - dh, dw, dh);
}

export function showJoinCard(m, count) {
  const g = pic.getContext('2d');
  g.clearRect(0, 0, SIZE, SIZE);
  g.imageSmoothingEnabled = false;
  drawFit(g, 'play_' + m.id, SIZE * 0.05, SIZE * 0.05, SIZE * 0.9, SIZE * 0.95);
  document.getElementById('joinName').textContent = `${m.name} 합류!`;
  document.getElementById('joinSub').textContent = `구토유발자들 ×${count}`;

  const r = canvas.getBoundingClientRect(), s = r.width / W;   // 점수, 하트, BEST 아래
  card.style.setProperty('--x', `${r.left + 16 * s}px`);
  card.style.setProperty('--s', Math.min(1, s));
  card.style.top = `${r.top + 196 * s}px`;
  card.classList.remove('show');
  void card.offsetWidth;   // 연달아 합류 시 애니메이션 재시작
  card.classList.add('show');
}

export function hideJoinCard() {
  card.classList.remove('show');
}
