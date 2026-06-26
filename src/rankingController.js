import { addRemoteRankingEntry, deleteRemoteRankingEntry, loadRemoteRankings } from './firebaseRankings.js';
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
} from './rankingUi.js';

export function createRankingController({
  elements,
  startRun,
  getRunResult,
  getPlayerName,
  hideStartScreen,
  showStartScreen,
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
    retryRunButton,
  } = elements;
  let rankings = loadStoredRankings();

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
    if (!removed?.remotePath) return;

    const deleted = await deleteRemoteRankingEntry(removed);
    if (!deleted) return;

    syncFromFirebase();
  }

  function saveRankings() {
    saveStoredRankings(rankings);
  }

  async function syncFromFirebase() {
    const remoteRankings = await loadRemoteRankings();
    if (!remoteRankings) return false;

    rankings = remoteRankings;
    saveRankings();
    renderRankingList();
    renderSettingsRankingList();
    return true;
  }

  async function recordRanking(name, message) {
    const { score, survivalTime, kills } = getRunResult();
    if (score < 0) return;

    const entry = createRankingEntry(score, survivalTime, kills, name || getPlayerName(), message);
    rankings = sortRankingEntries([...rankings, entry]);
    saveRankings();

    const remoteEntry = await addRemoteRankingEntry(entry);
    if (!remoteEntry) return;

    const synced = await syncFromFirebase();
    if (synced) return;

    rankings = sortRankingEntries(rankings.map((item) => (item === entry ? remoteEntry : item)));
    saveRankings();
  }

  return {
    getRankings,
    hideResultScreen,
    renderSettingsRankingList,
    showResultScreen,
    syncFromFirebase,
  };
}
