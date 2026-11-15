// 랭킹 (서버: Supabase run_rankings) 및 플레이어 이름 (브라우저)
import { NAME_KEY, PLAYER_KEY, RANK_STORE } from './config.js';
import { sb } from './supabase.js';

const TABLE = 'run_rankings';
const FIELDS = 'name,score,round,distance,notes,mode,created_at';
const ORDER = 'order=score.desc,created_at.asc';
// 랭킹 묶음: 'crew' 5인 달리기, 'solo' 캐릭터 달리기 (mode가 멤버 id)
export const groupOf = mode => (mode === 'crew' ? 'crew' : 'solo');
const groupFilter = group => (group === 'crew' ? 'mode=eq.crew' : 'mode=neq.crew');

// 이 브라우저의 무작위 ID (내 기록 모아 보기용, 처음 한 번 만들어 저장)
function playerId() {
  try {
    let id = localStorage.getItem(PLAYER_KEY);
    if (!id) {
      id = crypto.randomUUID?.() ?? '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, c => (c ^ (Math.random() * 16) >> (c / 4)).toString(16));
      localStorage.setItem(PLAYER_KEY, id);
    }
    return id;
  } catch { return null; }   // 저장 불가 (사생활 보호 모드 등): 내 기록 없이 진행
}
let top = [];      // 서버 상위 RANK_STORE개 (화면은 매 프레임 이걸 읽음)
let myBest = null; // 이 브라우저 최고 기록

export const loadRanking = () => top;
export const loadMyBest = () => myBest;

// 서버에서 상위 기록, 내 최고 기록 다시 받기 (group 랭킹, 실패하면 이전 값 유지, 성공 여부 반환)
export async function refreshRanking(group = 'crew') {
  try {
    const id = playerId(), f = groupFilter(group);
    const [all, mine] = await Promise.all([
      sb(`${TABLE}?select=${FIELDS}&${f}&${ORDER}&limit=${RANK_STORE}`).then(r => r.json()),
      id ? sb(`${TABLE}?select=score&${f}&player=eq.${id}&order=score.desc&limit=1`).then(r => r.json()) : [],
    ]);
    top = all;
    myBest = mine[0] || null;
    return true;
  } catch (err) {
    console.warn('랭킹을 불러오지 못했어요', err);
    return false;
  }
}

// 랭킹 창용 상위 기록 (period: 'today' 오늘 0시 이후, 'all' 전체, 'mine' 이 브라우저 기록, group: 'crew', 'solo'), 실패하면 null
export async function fetchRanking(period, group = 'crew') {
  const d = new Date(); d.setHours(0, 0, 0, 0);
  const id = playerId();
  if (period === 'mine' && !id) return [];
  const filter = period === 'today' ? `&created_at=gte.${encodeURIComponent(d.toISOString())}`
    : period === 'mine' ? `&player=eq.${id}` : '';
  try {
    return await (await sb(`${TABLE}?select=${FIELDS}&${groupFilter(group)}${filter}&${ORDER}&limit=${RANK_STORE}`)).json();
  } catch (err) {
    console.warn('랭킹을 불러오지 못했어요', err);
    return null;
  }
}

// 기록 등록 (r: 게임 결과 { score, round, distance, notes, mode }): { rank: 같은 모드에서 몇 위, saved: 서버 저장 성공 여부 }
export async function addRanking(name, r) {
  const { score, round, distance, notes, mode } = r;
  try {
    await sb(TABLE, { method: 'POST', body: JSON.stringify({ name, score, round, distance, notes, mode, player: playerId() }), headers: { Prefer: 'return=minimal' } });
    // 내 점수보다 높은 기록 수 + 1 = 순위
    const res = await sb(`${TABLE}?select=id&${groupFilter(groupOf(mode))}&score=gt.${score}`, { method: 'HEAD', headers: { Prefer: 'count=exact' } });
    const higher = Number((res.headers.get('content-range') || '').split('/')[1]) || 0;
    await refreshRanking(groupOf(mode));
    return { rank: higher + 1, saved: true };
  } catch (err) {
    console.warn('랭킹을 저장하지 못했어요', err);
    return { rank: 0, saved: false };
  }
}

export function loadName() {
  try { return localStorage.getItem(NAME_KEY) || ''; } catch { return ''; }
}

export function saveName(name) {
  try { localStorage.setItem(NAME_KEY, name); } catch { /* 저장 못 해도 이번 판은 진행 */ }
}
