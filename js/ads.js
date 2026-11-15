// 광고판: Mortals Log의 가장 가까운 공연, 구매 가능한 앨범을 빈 벽(bg_far1)에 랜덤 배치
import { SITE_URL } from './config.js';
import { sb, sbReady, storageUrl } from './supabase.js';

let concert = null;   // 가장 가까운 공연: 없으면 null
let albums = [];      // 구매 링크가 있는 앨범
let picked = {};      // 광고판 자리별로 고른 광고: 같은 자리는 계속 같은 광고, null이면 빈 벽
const AD_CHANCE = 0.5;    // 빈 벽 자리에 광고판이 붙을 확률 (앞 자리에 광고가 있으면 빈 벽)
let last = { round: -1, ad: false, kind: '' };

const ALBUM_KIND = { LP: '정규', EP: 'EP', SP: '싱글', LV: '라이브 앨범', VN: '바이닐' };
const WEEK = ['일', '월', '화', '수', '목', '금', '토'];

function loadImage(url) {
  if (!url) return null;
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.src = url;
  return img;
}

function dayLabel(iso) {
  const d = new Date(iso + 'T00:00:00');
  return `${d.getMonth() + 1}.${String(d.getDate()).padStart(2, '0')} (${WEEK[d.getDay()]})`;
}

function dDay(iso) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const n = Math.round((new Date(iso + 'T00:00:00') - today) / 86400000);
  return n <= 0 ? 'D-DAY' : `D-${n}`;
}

const localToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const get = path => sb(path).then(r => r.json());

export async function loadAds() {
  if (!(await sbReady)) { console.warn('SUPABASE_URL·KEY가 없어 광고판 없이 진행합니다.'); return; }
  const today = localToday();

  try {
    const [concerts, albumRows] = await Promise.all([
      get(`concerts?select=title,start_date,end_date,location,poster_image_path,ticketing&is_published=eq.true`
        + `&or=(start_date.gte.${today},end_date.gte.${today})&order=start_date&limit=1`),
      get('albums?select=album_type,volume,title,image_key,release_date,cover_image_path,album_links(kind,url)&is_published=eq.true'),
    ]);
    const c = concerts[0];
    if (c) {
      concert = {
        tag: 'UPCOMING', title: c.title,
        lines: [`${dayLabel(c.start_date)}${c.end_date ? ' ~' : ''}  ${dDay(c.start_date)}`, c.location || ''],
        img: loadImage(c.poster_image_path && storageUrl(c.poster_image_path)),
        link: (c.ticketing || []).map(t => t.ticketingLink).find(u => /^https?:\/\//.test(u || '')) || '',
      };
    }
    albums = albumRows
      .filter(a => a.album_links.some(l => l.kind === 'store'))
      .map(a => {
        const year = a.release_date.slice(0, 4);
        const kind = a.album_type === 'LP' ? `정규 ${a.volume}집` : ALBUM_KIND[a.album_type] || a.album_type;
        const cover = a.cover_image_path ? storageUrl(a.cover_image_path)
          : a.image_key && `${SITE_URL}/images/albums/${a.album_type}_${year}_${encodeURIComponent(a.image_key)}.webp`;
        return { tag: 'NOW ON SALE', title: a.title, lines: [`${kind} · ${year}`, '앨범 구매 가능'], cover };
      });
  } catch (err) {
    console.warn('광고판 정보를 불러오지 못해 광고판 없이 진행합니다.', err);
  }
}

// 새 게임: 광고 재배치
export function resetAds() { picked = {}; last = { round: -1, ad: false, kind: '' }; }

// 게임 오버 예매하기 버튼용 공연 (예매 링크 없으면 null)
export const ticketConcert = () => (concert && concert.link ? concert : null);

// 빈 벽 자리별 광고 선택 (앞에서부터 차례로 호출)
// 앞 자리에 광고가 있으면 빈 벽, 아니면 AD_CHANCE 확률로 광고
// 공연, 앨범 번갈아 (한쪽이 없으면 있는 쪽만)
export function adFor(round, slot) {
  const key = `${round}-${slot}`;
  if (key in picked) return picked[key];
  if (last.round !== round) last = { round, ad: false, kind: Math.random() < 0.5 ? 'album' : 'concert' };
  let ad = null;
  if (!last.ad && Math.random() < AD_CHANCE) {
    const kind = !concert ? 'album' : !albums.length ? 'concert' : last.kind === 'concert' ? 'album' : 'concert';
    if (kind === 'concert') ad = concert;
    else if (albums.length) {
      ad = albums[Math.floor(Math.random() * albums.length)];
      if (ad.cover && !ad.img) ad.img = loadImage(ad.cover);
    }
    if (ad) last.kind = kind;
  }
  last.ad = !!ad;
  picked[key] = ad;
  return ad;
}
