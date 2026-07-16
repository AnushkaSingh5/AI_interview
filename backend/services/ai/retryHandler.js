/**
 * Retry Handler utility with custom backoff delays for network/service calls
 */

exports.executeWithRetry = async (fn, maxAttempts = 4, baseDelays = [2000, 5000, 10000, 20000], retryableErrorPredicate = () => true) => {
  let attempt = 0;

  while (attempt < maxAttempts) {
    attempt++;
    try {
      return await fn(attempt);
    } catch (error) {
      const isLastAttempt = attempt >= maxAttempts;
      const isRetryable = retryableErrorPredicate(error);

      console.error(`[Retry Handler] Attempt ${attempt}/${maxAttempts} failed. Error: ${error.message}`);

      if (isLastAttempt || !isRetryable) {
        throw error;
      }

      const delayMs = baseDelays[attempt - 1] || 2000;
      console.log(`[Retry Handler] Rate-limit (429/503) warning. Retrying in ${delayMs}ms...`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
};
