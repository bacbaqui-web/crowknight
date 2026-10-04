import {
  addRemoteRankingEntry,
  deleteRemoteRankingEntry,
  loadRemoteRankings,
} from './firebase_ranking_storage_helper.js';
import {
  bindResultScreen as bindResultScreenControls,
  bindSettingsRankingToggle,
  createRankingEntry,
  hideResultScreen as hideResultScreenView,
  loadRankings as loadStoredRankings,
  renderRankingList as renderRankingListView,
  renderSettingsRankingList as renderSettingsRankingListView,
  saveRankings as saveStoredRankings,
  showResultScreen as showResultScreenView,
  sortRankingEntries,
} from './ranking_view.js';

export function createRankingController({
  elements,
  remoteEnabled = true,
  startRun,
  getRunResult,
  getPlayerName,
  hideStartScreen,
  showStartScreen,
  onRankingsChange,
}) {
  const {
    rankingList,
    settingsRankingList,
    settingsRankingPanel,
    settingsRankingToggle,
    rankingForm,
    rankingName,
    rankingMessage,
    resultScreen,
    resultScore,
    resultSurvival,
    resultKills,
    resultBossKills,
    retryRunButton,
  } = elements;
  let rankings = remoteEnabled ? loadStoredRankings() : [];
  let submission = null;
  notifyRankingsChange();

  bindResultScreenControls(
    { retryRunButton, rankingForm, rankingName, rankingMessage },
    {
      startRun,
      recordRanking: (name, message) => recordRanking(name, message),
      renderRankingList,
      renderSettingsRankingList,
    }
  );
  bindSettingsRankingToggle(settingsRankingPanel, settingsRankingToggle);

  function getRankings() {
    return rankings;
  }

  function showResultScreen() {
    return showResultScreenView(
      {
        resultScreen,
        resultScore,
        resultSurvival,
        resultKills,
        resultBossKills,
        rankingName,
        rankingMessage,
        rankingForm,
        rankingList,
      },
      { ...getRunResult(), rankings },
      { hideStartScreen, showStartScreen }
    );
  }

  function hideResultScreen() {
    submission = null;
    return hideResultScreenView(resultScreen);
  }

  function renderRankingList() {
    renderRankingListView(rankingList, rankings);
  }

  function renderSettingsRankingList() {
    renderSettingsRankingListView(settingsRankingList, rankings, deleteRankingAt);
  }

  async function deleteRankingAt(index) {
    const [removed] = rankings.splice(index, 1);
    saveRankings();
    renderSettingsRankingList();
    renderRankingList();
    notifyRankingsChange();
    if (!removed?.remotePath) return;

    if (!remoteEnabled) return;
    const deleted = await deleteRemoteRankingEntry(removed);
    if (!deleted) return;

    syncFromFirebase();
  }

  function saveRankings() {
    if (remoteEnabled) saveStoredRankings(rankings);
  }

  async function syncFromFirebase() {
    if (!remoteEnabled) return false;
    const remoteRankings = await loadRemoteRankings();
    if (!remoteRankings) return false;

    rankings = remoteRankings;
    saveRankings();
    renderRankingList();
    renderSettingsRankingList();
    notifyRankingsChange();
    return true;
  }

  async function recordRanking(name, message) {
    const { score, survivalTime, kills, bossKills } = getRunResult();
    if (!Number.isFinite(score) || score < 0) return { ok: false, message: '유효한 플레이 기록이 없습니다.' };
    if (submission?.saved) return { ok: true, message: '이미 저장한 기록입니다.' };

    if (!submission) {
      const entry = createRankingEntry(score, survivalTime, kills, name || getPlayerName(), message, bossKills);
      submission = { entry, saved: false };
      rankings = sortRankingEntries([...rankings, entry]);
    } else {
      submission.entry.name = name || getPlayerName();
      submission.entry.message = message;
    }
    saveRankings();
    notifyRankingsChange();
    if (!remoteEnabled) {
      submission.saved = true;
      return { ok: true, message: '테스트 기록을 저장했습니다.' };
    }

    const remoteEntry = await addRemoteRankingEntry(submission.entry);
    if (!remoteEntry) return { ok: false, message: '공개 랭킹 제출에 실패했습니다. 다시 시도해 주세요.' };
    submission.saved = true;
    const entry = submission.entry;
    rankings = sortRankingEntries(rankings.map((item) => (item === entry ? remoteEntry : item)));
    saveRankings();
    notifyRankingsChange();
    await syncFromFirebase();
    return { ok: true, message: '공개 랭킹에 등록했습니다.' };
  }

  function notifyRankingsChange() {
    onRankingsChange?.(rankings);
  }

  return {
    getRankings,
    hideResultScreen,
    renderSettingsRankingList,
    showResultScreen,
    syncFromFirebase,
  };
}
