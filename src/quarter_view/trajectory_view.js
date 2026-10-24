export function createTrajectoryView(canvas, status) {
  const ctx = canvas.getContext('2d');
  const width = canvas.width,
    height = canvas.height,
    pad = 24;
  let previousEntry, previousCount, previousTime, previousActive;
  function draw(entry) {
    const count = entry?.samples.length || 0,
      time = entry?.samples.at(-1)?.time;
    if (previousEntry === entry && previousCount === count && previousTime === time && previousActive === entry?.active)
      return;
    previousEntry = entry;
    previousCount = count;
    previousTime = time;
    previousActive = entry?.active;
    ctx.clearRect(0, 0, width, height);
    if (!entry?.samples.length) {
      status.textContent = '공격하면 실제 판정의 궤적이 표시됩니다.';
      return;
    }
    const samples = entry.samples,
      points = samples.flatMap((s) => s.polygons.flat());
    const minX = Math.min(-30, ...points.map((p) => p.x)),
      maxX = Math.max(110, ...points.map((p) => p.x));
    const minY = Math.min(-20, ...points.map((p) => p.y)),
      maxY = Math.max(150, ...points.map((p) => p.y));
    const scale = Math.min((width - pad * 2) / (maxX - minX), (height - pad * 2) / (maxY - minY));
    const point = (p) => ({
      x: (width - (maxX - minX) * scale) / 2 + (p.x - minX) * scale,
      y: height - pad - (p.y - minY) * scale,
    });
    const zero = point({ x: 0, y: 0 });
    ctx.strokeStyle = '#71826a88';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(pad, zero.y);
    ctx.lineTo(width - pad, zero.y);
    ctx.moveTo(zero.x, pad);
    ctx.lineTo(zero.x, height - pad);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.font = '10px sans-serif';
    ctx.fillStyle = '#b4c4ac';
    ctx.fillText('앞(공격 방향) →', width - 90, zero.y - 5);
    ctx.fillText(entry.plane === 'height' ? '높이 ↑' : '옆 방향 ↑', zero.x + 4, 12);
    const last = samples.at(-1);
    samples.forEach((sample, index) => {
      ctx.strokeStyle = '#ffad45';
      ctx.globalAlpha = index === samples.length - 1 && entry.active ? 0.9 : 0.18;
      ctx.lineWidth = 1;
      for (const polygon of sample.polygons) {
        ctx.beginPath();
        polygon.forEach((p, i) => {
          const s = point(p);
          if (i) ctx.lineTo(s.x, s.y);
          else ctx.moveTo(s.x, s.y);
        });
        ctx.closePath();
        ctx.stroke();
      }
    });
    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#8de2ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    samples.forEach((sample, i) => {
      const p = point(sample.center);
      if (i) ctx.lineTo(p.x, p.y);
      else ctx.moveTo(p.x, p.y);
    });
    ctx.stroke();
    samples.forEach((sample, i) => {
      if (samples.length > 10 && i !== 0 && i !== samples.length - 1 && i % Math.ceil(samples.length / 6)) return;
      const p = point(sample.center);
      ctx.fillStyle = i === 0 ? '#ffffff' : i === samples.length - 1 ? '#ffad45' : '#8de2ff';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText(String(i + 1), p.x + 5, p.y - 4);
    });
    const start = point(samples[0].center),
      end = point(last.center);
    ctx.fillStyle = '#fff';
    ctx.font = '10px sans-serif';
    ctx.fillText('시작', start.x - 28, start.y + 3);
    ctx.fillStyle = '#ffcf8c';
    ctx.fillText(entry.active ? '현재' : '끝', end.x - 22, end.y + 14);
    status.textContent = `${entry.active ? '공격 중' : '최근 공격 완료'} · ${samples.length}개 판정 기록 · 번호 순서로 이동`;
  }
  return { draw };
}
