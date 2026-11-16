// 이미지 불러오기
// 불러온 이미지는 IMG[이름]으로 꺼내 사용
import { W, H, PANELS, CHAR_SCALE, MEMBERS, RUN_FRAMES, HEART_IMG, OBSTACLES } from './config.js';

export const IMG = {};

// [이름, 폴더, 키]: assets/폴더/이름.png를 IMG[키 또는 이름]으로
const assetList = [
  ...MEMBERS.flatMap(m => [
    ...Array.from({ length: RUN_FRAMES }, (_, i) => [`${m.id}_run${i + 1}`, `characters/${m.id}`]),
    [m.id + '_jump', `characters/${m.id}`],
    [m.id + '_gameover', `characters/${m.id}`],
    [m.play, `characters/${m.id}`, 'play_' + m.id],   // 시작 화면 악기와 이름이 같아 키 분리
    [m.common, 'common'],
    ['uwek_' + m.id, 'uwek'],
  ]),
  ...Array.from({ length: PANELS }, (_, i) => ['bg_far' + (i + 1), 'backgrounds']),
  ['bg_ground', 'backgrounds'],
  [HEART_IMG, 'uwek'],
  ...Object.values(OBSTACLES).flat().map(o => [o.img, 'obstacles']),
  ...['background', 'lamp', 'title', 'button'].map(n => [n, 'common']),
];

function shrink(img, w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const x = c.getContext('2d');
  x.imageSmoothingQuality = 'high';
  x.drawImage(img, 0, 0, w, h);
  return c;
}

export function loadAssets() {
  return Promise.all(assetList.map(([n, dir, key = n]) => new Promise((ok, fail) => {
    const src = `assets/${dir}/${n}.png`;
    const img = new Image();
    let tries = 0;
    img.onload = () => {
      if (dir.startsWith('characters/')) {
        IMG[key] = shrink(img, Math.round(img.width * CHAR_SCALE), Math.round(img.height * CHAR_SCALE));
      } else if (dir === 'obstacles') {
        IMG[key] = img;   // 원본 그대로 (그릴 때 OBSTACLES 크기로)
      } else if (dir === 'uwek') {
        IMG[key] = shrink(img, Math.round(img.width * 96 / img.height), 96);
      } else {
        IMG[key] = shrink(img, W, H);
      }
      ok();
    };
    img.onerror = () => {
      if (++tries > 2) return fail(new Error('에셋을 불러오지 못했어요: ' + src));
      setTimeout(() => { img.src = src + '?retry=' + tries; }, 300 * tries);
    };
    img.src = src;
  })));
}
