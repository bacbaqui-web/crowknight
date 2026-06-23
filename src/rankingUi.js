import { RANKING_KEY } from './gameConfig.js';
import { formatSurvivalTime } from './scoreFormat.js';

export function loadRankings() {
  try {
    return (JSON.parse(localStorage.getItem(RANKING_KEY)) || []).sort(
      (a, b) => Number(b.score || 0) - Number(a.score || 0)
    );
  } catch {
    return [];
  }
}

export function saveRankings(rankings) {
  localStorage.setItem(RANKING_KEY, JSON.stringify(rankings));
}

export function recordRankingEntry(rankings, score, survivalTime = 0, kills = 0, name = '주인공', message = '') {
  if (score < 0) return rankings;

  const nextRankings = [
    ...rankings,
    {
      name,
      message,
      score,
      survivalTime,
      kills,
      date: new Date().toISOString(),
    },
  ].sort((a, b) => b.score - a.score);

  saveRankings(nextRankings);
  return nextRankings;
}

export function bindResultScreen({ retryRunButton, rankingForm, rankingName, rankingMessage }, actions) {
  retryRunButton?.addEventListener('click', actions.startRun);
  rankingForm?.addEventListener('submit', (event) => {
    event.preventDefault();
    const name = rankingName.value.trim();
    const message = rankingMessage.value.trim();
    if (!name) {
      rankingName.focus();
      return;
    }

    actions.recordRanking(name, message);
    rankingForm.querySelector('button[type="submit"]').disabled = true;
    actions.renderRankingList();
    actions.renderSettingsRankingList();
  });
}

export function showResultScreen(elements, state, actions) {
  const {
    resultScreen,
    resultScore,
    resultSurvival,
    resultKills,
    rankingName,
    rankingMessage,
    rankingForm,
    rankingList,
  } = elements;

  if (!resultScreen) {
    actions.showStartScreen();
    return false;
  }

  actions.hideStartScreen();
  resultScore.textContent = `${state.score}점`;
  resultSurvival.textContent = formatSurvivalTime(state.survivalTime);
  resultKills.textContent = `${state.kills}명`;
  rankingName.value = '';
  rankingMessage.value = '';
  rankingForm.querySelector('button[type="submit"]').disabled = false;
  renderRankingList(rankingList, state.rankings);
  resultScreen.hidden = false;
  return true;
}

export function hideResultScreen(resultScreen) {
  if (resultScreen) resultScreen.hidden = true;
  return false;
}

export function renderRankingList(rankingList, rankings) {
  if (!rankingList) return;

  rankingList.innerHTML = '';
  const list = rankings.slice(0, 10);
  if (!list.length) {
    const empty = document.createElement('li');
    empty.className = 'ranking-empty';
    empty.textContent = '아직 등록된 기록이 없습니다';
    rankingList.append(empty);
    return;
  }

  list.forEach((entry, index) => {
    const item = document.createElement('li');
    const rank = document.createElement('b');
    const head = document.createElement('div');
    const name = document.createElement('strong');
    const score = document.createElement('span');
    const detail = document.createElement('p');
    const message = document.createElement('small');

    rank.textContent = `${index + 1}`;
    name.textContent = entry.name || '이름 없음';
    score.textContent = `${Number(entry.score || 0)}점`;
    detail.textContent = `생존 ${formatSurvivalTime(entry.survivalTime ?? entry.distance ?? 0)} / 처치 ${Number(entry.kills || 0)}`;
    message.textContent = entry.message || '';
    head.append(name, score);
    item.append(rank, head, detail);
    if (entry.message) item.append(message);
    rankingList.append(item);
  });
}

export function renderSettingsRankingList(settingsRankingList, rankings, onDeleteRanking) {
  if (!settingsRankingList) return;

  settingsRankingList.innerHTML = '';
  if (!rankings.length) {
    const empty = document.createElement('li');
    empty.className = 'settings-ranking-empty';
    empty.textContent = '아직 등록된 기록이 없습니다';
    settingsRankingList.append(empty);
    return;
  }

  rankings.forEach((entry, index) => {
    const item = document.createElement('li');
    const name = document.createElement('strong');
    const score = document.createElement('span');
    const record = document.createElement('span');
    const message = document.createElement('small');
    const remove = document.createElement('button');

    name.textContent = `${index + 1}. ${entry.name || '이름 없음'}`;
    score.textContent = `${Number(entry.score || 0)}점`;
    record.textContent = `${formatSurvivalTime(entry.survivalTime ?? entry.distance ?? 0)} / ${Number(entry.kills || 0)}K`;
    message.textContent = entry.message || '-';
    remove.className = 'settings-ranking-delete';
    remove.type = 'button';
    remove.setAttribute('aria-label', `${index + 1}위 기록 삭제`);
    remove.textContent = '×';
    remove.addEventListener('click', () => onDeleteRanking(index));

    item.append(name, score, record, message, remove);
    settingsRankingList.append(item);
  });
}

export function syncSettingsRankingToggle(settingsRankingPanel, settingsRankingToggle) {
  if (!settingsRankingPanel || !settingsRankingToggle) return;

  const isCollapsed = settingsRankingPanel.classList.contains('is-collapsed');
  settingsRankingToggle.classList.toggle('is-flipped', isCollapsed);
  settingsRankingToggle.setAttribute('aria-expanded', String(!isCollapsed));
  settingsRankingToggle.setAttribute('aria-label', isCollapsed ? '랭킹 펼치기' : '랭킹 접기');
}

export function bindSettingsRankingToggle(settingsRankingPanel, settingsRankingToggle) {
  settingsRankingToggle?.addEventListener('click', () => {
    settingsRankingPanel?.classList.toggle('is-collapsed');
    syncSettingsRankingToggle(settingsRankingPanel, settingsRankingToggle);
    settingsRankingToggle.blur();
  });

  syncSettingsRankingToggle(settingsRankingPanel, settingsRankingToggle);
}
