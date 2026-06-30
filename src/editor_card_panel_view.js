export function renderEditorDataCard(container, { title, className = '', open = true }, renderBody) {
  const card = document.createElement('details');
  card.className = ['editor-data-card', className].filter(Boolean).join(' ');
  card.open = open;

  const summary = document.createElement('summary');
  summary.className = 'editor-data-card-title';
  summary.textContent = title;

  const body = document.createElement('div');
  body.className = 'editor-data-card-body';

  card.append(summary, body);
  container.append(card);
  renderBody?.(body, card);
  return card;
}
