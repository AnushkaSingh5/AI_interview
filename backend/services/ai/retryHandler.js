/**
 * Retry Handler utility with exponential backoff for network/service calls
 */

exports.executeWithRetry = async (fn, maxAttempts = 3, initialDelayMs = 1000, retryableErrorPredicate = () => true) => {
  let attempt = 0;
  let delay = initialDelayMs;

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

      console.log(`[Retry Handler] Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 2; // Exponential backoff
    }
  }
};
