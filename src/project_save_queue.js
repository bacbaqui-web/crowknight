// Keep save sequencing and recovery separate from project schema and browser storage.
export function createProjectSaveQueue({ write, onStatus, setTimer = setTimeout, clearTimer = clearTimeout }) {
  let pending = Promise.resolve({ ok: true });
  let timer = 0;
  let scheduled = null;
  let failed = null;
  let writing = 0;

  function schedule(state) {
    scheduled = state;
    failed = null;
    clearTimer(timer);
    onStatus({ pending: true });
    timer = setTimer(enqueue, 300);
  }

  function enqueue() {
    const state = scheduled;
    if (state === null) return;
    scheduled = null;
    writing += 1;
    pending = pending.then(async () => {
      let result;
      try {
        result = await write(state);
      } catch (error) {
        result = { ok: false, error: error.message };
      }
      writing -= 1;
      if (!result.ok) failed = state;
      else failed = null;
      onStatus(writing || scheduled !== null ? { pending: true } : result);
      return result;
    });
  }

  async function flush() {
    let result;
    do {
      clearTimer(timer);
      enqueue();
      result = await pending;
    } while (scheduled !== null || writing);
    if (!result.ok) throw new Error(result.error || '베타 저장에 실패했습니다.');
    return result;
  }

  async function retry() {
    if (scheduled === null && failed !== null) scheduled = failed;
    return flush();
  }

  return { schedule, flush, retry, isDirty: () => scheduled !== null || writing > 0 || failed !== null };
}
