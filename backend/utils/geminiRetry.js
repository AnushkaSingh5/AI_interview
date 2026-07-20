/**
 * Single-retry executor for Gemini AI API requests
 */
const { parseGeminiJson, STRICT_JSON_PROMPT_FOOTER } = require('./parseGeminiJson');
const { logAiEvent } = require('./logger');

/**
 * Sends a prompt to Gemini API with automatic 1-time retry on JSON parsing failure.
 * @param {Function} requestFn - Async function(prompt) returning raw response text
 * @param {string} prompt - Initial prompt text
 * @param {string} featureName - Feature label for logging
 * @returns {Promise<object|array>} Parsed JSON data
 */
const executeWithRetry = async (requestFn, prompt, featureName = 'Generic AI') => {
  const fullPrompt = prompt + STRICT_JSON_PROMPT_FOOTER;
  let rawResponse = '';

  // Attempt 1
  try {
    rawResponse = await requestFn(fullPrompt);
    return parseGeminiJson(rawResponse, featureName);
  } catch (firstErr) {
    logAiEvent({
      feature: featureName,
      status: 'RETRY_INITIATED',
      rawResponse,
      error: new Error(`Attempt 1 parse failed: ${firstErr.message}. Executing 1-time simplified retry prompt.`)
    });

    // Attempt 2: Simplified formatting prompt
    const retryPrompt = `Re-format the content below into 100% valid, strict JSON matching the expected schema. Return ONLY JSON with NO markdown code fences, NO preambles, and NO trailing commas:\n\n${rawResponse || prompt}` + STRICT_JSON_PROMPT_FOOTER;

    try {
      const retryRawResponse = await requestFn(retryPrompt);
      return parseGeminiJson(retryRawResponse, `${featureName} (Retry Attempt)`);
    } catch (retryErr) {
      logAiEvent({
        feature: featureName,
        status: 'RETRY_FAILED',
        rawResponse: rawResponse,
        error: retryErr,
        fallbackUsed: true
      });
      throw retryErr;
    }
  }
};

module.exports = {
  executeWithRetry
};
