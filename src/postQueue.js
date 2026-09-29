const DEFAULT_CONCURRENCY = 3;
const DEFAULT_MAX_PENDING = 500;
const COMPLETED_CACHE_SIZE = 5000;

/** Bounds concurrent filtering/forwarding and suppresses duplicate updates. */
export function createPostQueue(handler, {
  concurrency = DEFAULT_CONCURRENCY,
  maxPending = DEFAULT_MAX_PENDING,
} = {}) {
  const pending = [];
  const inFlight = new Map();
  const completed = new Map();
  let active = 0;

  function rememberCompleted(key) {
    completed.set(key, Date.now());
    if (completed.size > COMPLETED_CACHE_SIZE) {
      const oldestKey = completed.keys().next().value;
      completed.delete(oldestKey);
    }
  }

  function drain() {
    while (active < concurrency && pending.length > 0) {
      const item = pending.shift();
      active += 1;
      Promise.resolve()
        .then(() => handler(item.post))
        .then((result) => {
          rememberCompleted(item.key);
          item.resolve(result);
        })
        .catch((error) => {
          console.error(`[Queue] Post ${item.key} failed after retries:`, error.message);
          item.resolve({ status: "failed", error });
        })
        .finally(() => {
          inFlight.delete(item.key);
          active -= 1;
          drain();
        });
    }
  }

  return {
    enqueue(post) {
      const key = `${post.channelId}:${post.messageId}`;
      if (completed.has(key)) return Promise.resolve({ status: "duplicate" });
      if (inFlight.has(key)) return inFlight.get(key);
      if (pending.length >= maxPending) {
        console.error(`[Queue] Dropping post ${key}: pending queue is full (${maxPending}).`);
        return Promise.resolve({ status: "dropped", reason: "queue_full" });
      }

      let resolve;
      const result = new Promise((done) => { resolve = done; });
      inFlight.set(key, result);
      pending.push({ key, post, resolve });
      drain();
      return result;
    },
    getStats() {
      return { active, pending: pending.length, completed: completed.size };
    },
  };
}
