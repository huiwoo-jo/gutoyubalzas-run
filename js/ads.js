// 광고판: Mortals Log의 앞으로 있을 공연, 구매 가능한 앨범을 빈 벽(bg_far1)에 랜덤 배치
import { SITE_URL } from './config.js';
import { sb, sbReady, storageUrl } from './supabase.js';

let concerts = [];    // 앞으로 있을 공연 (가까운 순)
let albums = [];      // 구매 링크가 있는 앨범
let picked = {};      // 광고판 자리별로 고른 광고: 같은 자리는 계속 같은 광고, null이면 빈 벽
const AD_CHANCE = 0.5;    // 빈 벽 자리에 광고판이 붙을 확률 (앞 자리에 광고가 있으면 빈 벽)
let last = { round: -1, ad: false, kind: '' };

// Mortals Log 공연 상세 주소 (Mortals Log의 GenerateScheduleId, CONCERT_TYPE_LABEL과 같게)
const BAND_LABEL = '구토유발자들(천진우, 기토, 양동훈, 리장단, 법영이)';
const CONCERT_KIND = {
  SOLO: '단독 콘서트', JOIN: '합동 콘서트', TOUR: '전국 투어', LISTENING: '음악감상회', FESTIVAL: '페스티벌',
  BAND: BAND_LABEL, BAND_TOUR: `${BAND_LABEL} · 전국 투어`,
};
function concertPage(c) {
  const type = c.is_band_performance ? (c.is_tour ? 'BAND_TOUR' : 'BAND') : c.is_tour ? 'TOUR' : c.concert_type;
  const src = `${c.start_date.replace(/[^0-9]/g, '')}-${`[${CONCERT_KIND[type]}] ${c.title}`.replace(/\s/g, '')}-CONCERT`;
  return `${SITE_URL}/schedule/${btoa(encodeURIComponent(src)).replace(/[=/+]/g, '').slice(0, 25)}`;
}

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
    const [concertRows, albumRows] = await Promise.all([
      get(`concerts?select=title,concert_type,is_tour,is_band_performance,start_date,end_date,location,poster_image_path,ticketing&is_published=eq.true`   // 비공개 제외 (RLS로도 막힘)
        + `&or=(start_date.gte.${today},end_date.gte.${today})&order=start_date`),
      get('albums?select=album_type,volume,title,image_key,release_date,cover_image_path,album_links(kind,url)&is_published=eq.true'),
    ]);
    concerts = concertRows.map(c => {
      const ticketing = c.ticketing || [];
      const link = ticketing.filter(t => !t.soldOut).map(t => t.ticketingLink).find(u => /^https?:\/\//.test(u || '')) || '';   // 매진 항목 제외
      return {
        tag: 'UPCOMING', title: c.title,
        lines: [`${dayLabel(c.start_date)}${c.end_date ? ' ~' : ''}  ${dDay(c.start_date)}`, c.location || ''],
        img: loadImage(c.poster_image_path && storageUrl(c.poster_image_path)),
        link,
        page: concertPage(c),
        soldOut: !link && ticketing.some(t => t.soldOut),
      };
    });
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

const pick = list => list[Math.floor(Math.random() * list.length)];

// 새 게임: 광고 재배치
export function resetAds() { picked = {}; last = { round: -1, ad: false, kind: '' }; }

// 게임 오버 버튼용 공연들 (가까운 순)
const TICKET_MAX = 3;   // ponytail: 화면에 들어가는 개수, 공연이 더 많아지면 넘김 UI
export const ticketConcerts = () => concerts.slice(0, TICKET_MAX);

// 빈 벽 자리별 광고 선택 (앞에서부터 차례로 호출)
// 앞 자리에 광고가 있으면 빈 벽, 아니면 AD_CHANCE 확률로 광고
// 공연, 앨범 번갈아 (한쪽이 없으면 있는 쪽만)
export function adFor(round, slot) {
  const key = `${round}-${slot}`;
  if (key in picked) return picked[key];
  if (last.round !== round) last = { round, ad: false, kind: Math.random() < 0.5 ? 'album' : 'concert' };
  let ad = null;
  if (!last.ad && Math.random() < AD_CHANCE) {
    const kind = !concerts.length ? 'album' : !albums.length ? 'concert' : last.kind === 'concert' ? 'album' : 'concert';
    if (kind === 'concert') ad = pick(concerts);
    else if (albums.length) {
      ad = pick(albums);
      if (ad.cover && !ad.img) ad.img = loadImage(ad.cover);
    }
    if (ad) last.kind = kind;
  }
  last.ad = !!ad;
  picked[key] = ad;
  return ad;
}
