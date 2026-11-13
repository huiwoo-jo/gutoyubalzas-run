// 랭킹 및 플레이어 이름 저장
// TODO: 현재는 로컬에서만 저장

import { RANK_KEY, NAME_KEY, RANK_STORE } from './config.js';

export function loadRanking() {
  try {
    const list = JSON.parse(localStorage.getItem(RANK_KEY) || '[]');
    return Array.isArray(list) ? list.filter(r => r && typeof r.score === 'number') : [];
  } catch { return []; }
}

function saveRanking(list) {
  try { localStorage.setItem(RANK_KEY, JSON.stringify(list)); return true; } catch { return false; }
}

// 기록 추가: { rank: 몇 위인지, saved: 저장 성공 여부 }
// 상위 RANK_STORE개까지 보관
export function addRanking(name, score) {
  const list = loadRanking();
  const entry = { name, score, date: new Date().toISOString().slice(0, 10) };
  list.push(entry);
  list.sort((a, b) => b.score - a.score);
  const saved = saveRanking(list.slice(0, RANK_STORE));
  return { rank: list.indexOf(entry) + 1, saved };
}

export function loadName() {
  try { return localStorage.getItem(NAME_KEY) || ''; } catch { return ''; }
}

export function saveName(name) {
  try { localStorage.setItem(NAME_KEY, name); } catch { /* 저장 못 해도 이번 판은 진행 */ }
}
