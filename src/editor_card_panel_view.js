export function renderEditorDataCard(
  container,
  { title, className = '', open = true, collapsible = true },
  renderBody
) {
  const card = document.createElement(collapsible ? 'details' : 'section');
  card.className = ['editor-data-card', className].filter(Boolean).join(' ');
  if (collapsible) card.open = open;
  else card.setAttribute('aria-label', title);

  if (collapsible) {
    const summary = document.createElement('summary');
    summary.className = 'editor-data-card-title';
    summary.textContent = title;
    card.append(summary);
  }

  const body = document.createElement('div');
  body.className = 'editor-data-card-body';

  card.append(body);
  container.append(card);
  renderBody?.(body, card);
  return card;
}
