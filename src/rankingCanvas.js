import { formatSurvivalTime } from './scoreFormat.js';

export function drawRankingHud(ctx, { rankings, battleActive, lastRecordedScore }) {
  const x = 724;
  const y = 48;
  ctx.save();
  ctx.fillStyle = 'rgba(10, 11, 16, .64)';
  ctx.fillRect(x - 12, y - 26, 220, 174);
  ctx.fillStyle = '#f4f7fb';
  ctx.font = '14px sans-serif';
  ctx.fillText('생존 랭킹', x, y);

  const list = rankings.slice(0, 5);
  if (!list.length) {
    ctx.fillStyle = '#aeb6c7';
    ctx.fillText('아직 기록 없음', x, y + 24);
  } else {
    list.forEach((entry, index) => {
      const rowY = y + 24 + index * 28;
      ctx.fillStyle = index === 0 ? '#7cc3a2' : '#d9deec';
      const survivalTime = Number(entry.survivalTime ?? entry.distance ?? 0);
      const kills = Number(entry.kills || 0);
      ctx.fillText(`${index + 1}. ${entry.name} ${entry.score}점`, x, rowY);
      if (survivalTime || kills) {
        ctx.fillStyle = '#9fa7b8';
        ctx.fillText(`생존 ${formatSurvivalTime(survivalTime)} / 처치 ${kills}`, x + 18, rowY + 13);
      }
    });
  }

  if (!battleActive && lastRecordedScore > 0) {
    ctx.fillStyle = '#f0b35b';
    ctx.fillText(`방금 기록 ${lastRecordedScore}점`, x, y + 160);
  }
  ctx.restore();
}
