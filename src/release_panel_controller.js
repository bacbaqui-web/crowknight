import { flushProjectSave, retryProjectSave } from './project_storage_helper.js';

export function createReleasePanel({ mode, revision }) {
  if (mode === 'published') return { markPlayed() {} };
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname);
  const panel = document.createElement('nav');
  panel.className = 'release-panel';
  panel.setAttribute('aria-label', '제작과 배포');
  const label = document.createElement('strong');
  label.textContent = mode === 'editor' ? 'SETTING' : 'BETA';
  const message = document.createElement('span');
  message.className = 'release-status';
  message.setAttribute('role', 'status');
  message.textContent =
    mode === 'editor' ? '수정 내용은 베타에 자동 저장됩니다.' : '테스트 기록은 공개 랭킹에 등록되지 않습니다.';
  const link = document.createElement('a');
  link.href = mode === 'editor' ? './beta.html' : './setting.html';
  link.textContent = mode === 'editor' ? '베타 플레이' : '세팅으로';
  if (mode === 'editor') {
    const retry = document.createElement('button');
    retry.type = 'button';
    retry.textContent = '저장 다시 시도';
    retry.hidden = true;
    panel.append(retry);
    retry.addEventListener('click', async () => {
      retry.disabled = true;
      try {
        await retryProjectSave();
      } catch (error) {
        message.textContent = error.message;
      } finally {
        retry.disabled = false;
      }
    });
    link.addEventListener('click', async (event) => {
      event.preventDefault();
      try {
        await flushProjectSave();
        window.location.assign('./beta.html');
      } catch (error) {
        message.textContent = error.message;
      }
    });
    window.addEventListener('project-save-status', (event) => {
      const result = event.detail;
      retry.hidden = result.ok !== false;
      message.textContent = result.pending ? '베타 저장 중…' : result.ok ? '베타에 저장했습니다.' : result.error;
      message.classList.toggle('is-error', result.ok === false);
    });
  }
  const button = document.createElement('button');
  button.type = 'button';
  button.disabled = true;
  button.textContent = '공개 배포';
  button.title = '현재 베타를 플레이한 뒤 공개 버전에 반영합니다.';
  panel.append(label, link);
  if (mode === 'beta' && local) panel.append(button);
  if (mode === 'beta' && !local) {
    link.hidden = true;
    message.textContent = '공개 베타입니다. 배포는 로컬 제작툴에서 진행합니다.';
  }
  panel.append(message);
  document.body.append(panel);

  button.addEventListener('click', async () => {
    button.disabled = true;
    message.textContent = '검증한 베타를 공개 배포 중…';
    try {
      const response = await window.fetch('./api/project/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ revision }),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || '배포 실패');
      message.textContent = result.message;
      const applied = await waitForPublishedRevision(result.url, revision);
      message.textContent = applied
        ? '공개 게임에 반영했습니다.'
        : '배포 요청은 전송했습니다. 공개 반영을 아직 확인하지 못했습니다.';
      if (applied) {
        const published = document.createElement('a');
        published.href = result.url;
        published.target = '_blank';
        published.rel = 'noopener';
        published.textContent = '공개 게임 열기';
        panel.append(published);
      }
    } catch (error) {
      message.textContent = error.message;
      message.classList.add('is-error');
      button.disabled = false;
    }
  });

  return {
    markPlayed() {
      if (mode === 'beta' && local) button.disabled = false;
    },
  };
}

async function waitForPublishedRevision(baseUrl, revision) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await window.fetch(`${baseUrl}data/published.json?t=${Date.now()}`, { cache: 'no-store' });
      if (response.ok && (await response.json()).revision === revision) return true;
    } catch {
      // A Pages deployment or temporary network failure may still be in progress.
    }
    await new Promise((resolve) => window.setTimeout(resolve, 3000));
  }
  return false;
}
