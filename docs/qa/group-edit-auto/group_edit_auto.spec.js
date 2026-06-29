import { test, expect } from '@playwright/test';
import fs from 'fs';

const QA_DIR = 'docs/qa/group-edit-auto';
const URL = 'http://127.0.0.1:4173/setting.html';

function writeJson(name, value) {
  fs.mkdirSync(QA_DIR, { recursive: true });
  fs.writeFileSync(`${QA_DIR}/${name}`, JSON.stringify(value, null, 2));
}

async function screenshot(page, name) {
  await page.screenshot({ path: `${QA_DIR}/${name}.png`, fullPage: true });
}

test('scan setting editor dom for group edit qa', async ({ page }) => {
  const consoleMessages = [];
  const pageErrors = [];
  const badResponses = [];
  page.on('console', (message) => consoleMessages.push(`${message.type()}: ${message.text()}`));
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('response', (response) => {
    if (response.status() >= 400) badResponses.push(`${response.status()}:${response.url()}`);
  });

  await page.goto(URL, { waitUntil: 'networkidle' });
  await screenshot(page, '01-loaded');

  const scan = await page.evaluate(() => {
    const simple = (element) => ({
      tag: element.tagName.toLowerCase(),
      id: element.id || '',
      cls: typeof element.className === 'string' ? element.className : '',
      text: (element.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 120),
      aria: element.getAttribute('aria-label') || '',
      title: element.getAttribute('title') || '',
      dataset: { ...element.dataset },
    });

    return {
      buttons: [...document.querySelectorAll('button')].map(simple),
      pickers: [...document.querySelectorAll('[data-picker]')].map((picker) => ({
        picker: picker.dataset.picker,
        childCount: picker.children.length,
        children: [...picker.children].map(simple),
      })),
      selects: [...document.querySelectorAll('select')].map((select) => ({
        id: select.id,
        value: select.value,
        options: [...select.options].map((option) => ({
          value: option.value,
          text: option.textContent.trim(),
        })),
      })),
      poseFieldsText: document.querySelector('#posePartFields')?.textContent?.replace(/\s+/g, ' ').trim() || '',
      partFieldsText: document.querySelector('#partFields')?.textContent?.replace(/\s+/g, ' ').trim() || '',
      canvasRect: document.querySelector('#gameCanvas')?.getBoundingClientRect().toJSON?.() || null,
    };
  });

  writeJson('01-scan.json', { scan, consoleMessages, pageErrors, badResponses });
  expect(scan.pickers.some((picker) => picker.picker === 'pose')).toBeTruthy();
  expect(scan.selects.some((select) => select.id === 'posePartSelect')).toBeTruthy();
});
