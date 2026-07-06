const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);

if (!isLocalEditorHost()) {
  document.body.innerHTML = `
    <main style="min-height:100vh;display:grid;place-items:center;background:#0b0f18;color:#f5f7fb;font-family:system-ui,sans-serif;padding:24px;text-align:center;">
      <section style="max-width:520px;">
        <h1 style="font-size:28px;margin:0 0 12px;">Crow Knight Editor</h1>
        <p style="margin:0;color:#aab4c5;line-height:1.6;">setting.html은 로컬 제작 전용 페이지입니다. 로컬 dev server에서만 실행해 주세요.</p>
      </section>
    </main>
  `;
  throw new Error('setting.html is local-only.');
}

function isLocalEditorHost() {
  return window.location.protocol === 'file:' || LOCAL_HOSTS.has(window.location.hostname);
}
