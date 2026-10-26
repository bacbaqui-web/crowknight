const grid = document.querySelector('#candidates');
const status = document.querySelector('#status');
const loop = document.querySelector('#loop');
const filters = document.querySelector('#filters');
const players = [];
let activeFilter = '새 후보';
const stopAll = (except = null) => {
  for (const audio of players) {
    if (audio !== except) {
      audio.pause();
      audio.currentTime = 0;
      audio.closest('article').classList.remove('active');
    }
  }
};
function matchesFilter(card, filter) {
  if (filter === '새 후보') return card.dataset.status === 'new' || card.dataset.compare === 'true';
  if (filter === '적용한 소리') return card.dataset.status === 'approved';
  if (filter === '이전 후보') return card.dataset.status === 'previous';
  return card.dataset.status === 'new' && card.dataset.category === filter;
}
async function init() {
  const response = await window.fetch('./candidates.json');
  if (!response.ok) throw new Error('후보 목록을 불러오지 못했습니다.');
  const candidates = await response.json();
  for (const category of ['새 후보', '방패 방어', '명중', '적용한 소리', '이전 후보']) {
    const button = document.createElement('button');
    button.textContent = category;
    button.type = 'button';
    button.setAttribute('aria-pressed', String(category === activeFilter));
    button.addEventListener('click', () => {
      activeFilter = category;
      stopAll();
      for (const other of filters.children) other.setAttribute('aria-pressed', String(other === button));
      for (const card of grid.children) card.hidden = !matchesFilter(card, category);
      status.textContent = `${category} 후보를 비교해 보세요.`;
    });
    filters.append(button);
  }
  for (const item of candidates) {
    const card = document.createElement('article');
    card.dataset.category = item.category;
    card.dataset.status = item.status;
    card.dataset.compare = String(Boolean(item.compare));
    card.hidden = !matchesFilter(card, activeFilter);
    const label = document.createElement('span');
    label.className = 'num';
    label.textContent = `후보 ${String(item.id).padStart(2, '0')} · ${item.category}`;
    const duration = document.createElement('span');
    duration.className = 'duration';
    const title = document.createElement('h2');
    title.textContent = item.title;
    const author = document.createElement('small');
    author.textContent = item.author;
    const note = document.createElement('p');
    note.className = `note ${item.approved ? 'approved' : 'muted'}`;
    note.textContent =
      item.note ||
      (item.approved
        ? `✓ ${item.category} 적용`
        : item.category === '발걸음'
          ? '이전 발걸음 후보 · 기존 게임 소스 유지로 결정'
          : item.status === 'previous'
            ? '이전 후보 · 이번 선택에서 보류'
            : '새 후보 · 아직 게임에 적용하지 않음');
    const audio = document.createElement('audio');
    audio.controls = true;
    audio.preload = 'metadata';
    audio.src = item.src;
    audio.volume = 0.7;
    audio.setAttribute('aria-label', `후보 ${item.id} ${item.title}`);
    audio.addEventListener('loadedmetadata', () => {
      duration.textContent = `${audio.duration.toFixed(2)}초`;
    });
    audio.addEventListener('play', () => {
      stopAll(audio);
      card.classList.add('active');
      status.textContent = `후보 ${item.id} · ${item.title} 재생 중`;
    });
    audio.addEventListener('pause', () => card.classList.remove('active'));
    audio.addEventListener('ended', () => {
      status.textContent = `후보 ${item.id} 재생 완료`;
    });
    audio.addEventListener('error', () => {
      note.textContent = '로딩 실패 · 원본 보기에서 들어주세요.';
    });
    players.push(audio);
    const actions = document.createElement('div');
    actions.className = 'actions';
    const replay = document.createElement('button');
    replay.type = 'button';
    replay.textContent = `${item.id}번 듣기`;
    replay.addEventListener('click', () => {
      audio.currentTime = 0;
      audio.play().catch(() => {
        status.textContent = '오디오 재생 버튼을 눌러주세요.';
      });
    });
    const link = document.createElement('a');
    link.textContent = '원본 보기 ↗';
    link.href = item.url;
    link.target = '_blank';
    link.rel = 'noopener';
    actions.append(replay, link);
    card.append(label, duration, title, author, note, audio, actions);
    grid.append(card);
  }
}
loop.addEventListener('change', () =>
  players.forEach((a) => {
    a.loop = loop.checked;
  })
);
init().catch((error) => {
  status.textContent = error.message;
});
