/**
 * Safe Polling Helper
 * 
 * ✅ PHASE 2B: Debounce/Throttle polling replacement
 * Prevents overlapping calls and limits frequency
 */

export function startSafePoll(fn: () => Promise<void>, intervalMs = 60000) {
  let running = false;
  let timer: ReturnType<typeof setTimeout> | null = null;

  async function run() {
    if (running) {
      console.log('⏭️ Skipping poll - previous call still running');
      return; // Skip if previous still running
    }
    
    running = true;
    try {
      await fn();
    } catch (err) {
      // Swallow or log: don't crash the host
      console.error('❌ Poll error:', err);
    } finally {
      running = false;
      timer = setTimeout(run, intervalMs);
    }
  }

  // Start first run without delay
  timer = setTimeout(run, 0);

  return {
    stop() {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
    }
  };
}

/**
 * Debounced function executor
 * Delays execution until after wait milliseconds have elapsed since last call
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttled function executor
 * Ensures function is called at most once per specified time period
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}
