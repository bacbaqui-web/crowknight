export function createUpdateHistoryController({ modal, openButton, closeButton, list } = {}) {
  if (!modal || !openButton || !closeButton || !list) return { close: () => {} };

  openButton.addEventListener('click', open);
  closeButton.addEventListener('click', close);
  modal.addEventListener('pointerdown', (event) => {
    if (event.target === modal) close();
  });
  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !modal.hidden) close();
  });

  async function open() {
    modal.hidden = false;
    openButton.setAttribute('aria-expanded', 'true');
    list.textContent = '업데이트 내역을 불러오는 중입니다.';
    const releases = await loadReleases();
    renderReleases(list, releases);
    closeButton.focus();
  }

  function close() {
    modal.hidden = true;
    openButton.setAttribute('aria-expanded', 'false');
    openButton.focus();
  }

  return { close };
}

async function loadReleases() {
  try {
    const response = await window.fetch(`./changelog.json?t=${Date.now()}`, { cache: 'no-cache' });
    if (!response.ok) return [];
    const payload = await response.json();
    return Array.isArray(payload?.releases) ? payload.releases : [];
  } catch {
    return [];
  }
}

function renderReleases(root, releases) {
  root.replaceChildren();
  if (!releases.length) {
    root.textContent = '업데이트 내역을 불러오지 못했습니다.';
    return;
  }

  releases.forEach((release) => {
    const article = document.createElement('article');
    const heading = document.createElement('h3');
    const versionLabel = document.createElement('span');
    const dateLabel = document.createElement('small');
    const title = document.createElement('p');
    const changes = document.createElement('ul');

    const version = String(release?.version || '버전 정보 없음');
    const date = String(release?.date || '').trim();
    versionLabel.textContent = version;
    heading.append(versionLabel);
    if (date) {
      dateLabel.textContent = `- ${date}`;
      heading.append(dateLabel);
    }
    title.textContent = String(release?.title || '업데이트');
    (Array.isArray(release?.changes) ? release.changes : []).forEach((change) => {
      const item = document.createElement('li');
      item.textContent = String(change);
      changes.append(item);
    });
    article.append(heading, title, changes);
    root.append(article);
  });
}
