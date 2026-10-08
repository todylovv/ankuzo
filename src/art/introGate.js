/** Wait for critical resources, allowing both skip and a bounded deadline. */
export function waitForIntro(tasks, { minMs = 1200, timeoutMs = 12000, signal, onProgress } = {}) {
  return new Promise(resolve => {
    let complete = false, settled = 0, resourcesReady = tasks.length === 0, minimumReady = minMs <= 0;
    let minimumTimer, deadlineTimer;
    const finish = (timedOut = false, aborted = false) => {
      if (complete) return;
      complete = true;
      clearTimeout(minimumTimer); clearTimeout(deadlineTimer);
      signal?.removeEventListener('abort', skip);
      resolve({ timedOut, aborted });
    };
    const skip = () => finish(false, true);
    const check = () => { if (resourcesReady && minimumReady) finish(); };
    const checkpoint = () => {
      if (complete) return;
      settled += 1;
      onProgress?.(settled, tasks.length);
      resourcesReady = settled === tasks.length;
      check();
    };
    // Attach both handlers immediately: late errors after a skip must remain handled.
    tasks.forEach(task => Promise.resolve(task).then(checkpoint, checkpoint));
    signal?.addEventListener('abort', skip, { once: true });
    minimumTimer = setTimeout(() => { minimumReady = true; check(); }, Math.max(0, minMs));
    deadlineTimer = setTimeout(() => finish(true), Math.max(0, timeoutMs));
    if (signal?.aborted) skip();
    else check();
  });
}
