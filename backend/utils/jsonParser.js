/**
 * Centralized, robust JSON Parser & Extractor for Gemini AI Responses.
 */

const STRICT_JSON_PROMPT_FOOTER = `

CRITICAL FORMATTING INSTRUCTIONS:
- Return ONLY valid JSON.
- Do NOT include markdown formatting or code fences (e.g. do NOT use \`\`\`json or \`\`\`).
- Do NOT include explanations, preamble, or commentary.
- Do NOT include code comments or trailing commas before closing braces } or brackets ].
- Ensure all keys and strings are properly enclosed in double quotes.
`;

/**
 * Parses and cleans raw Gemini text into a valid JavaScript Object/Array.
 * @param {string} rawText - Raw text response from Gemini API
 * @returns {object|array} Parsed JSON data
 */
const parseGeminiJson = (rawText) => {
  if (!rawText || typeof rawText !== 'string' || rawText.trim().length === 0) {
    throw new Error('Raw Gemini response is empty or non-string');
  }

  // 1. Log complete raw Gemini response for debugging
  console.log('[Gemini Raw Response]:\n', rawText);

  let cleaned = rawText.trim();

  // 2. Remove markdown code fences if present (```json ... ``` or ``` ...)
  cleaned = cleaned.replace(/```(?:json|javascript|js)?/gi, '').replace(/```/g, '').trim();

  // 3. Extract the first valid JSON object ({...}) or array ([...])
  const firstBrace = cleaned.indexOf('{');
  const firstBracket = cleaned.indexOf('[');

  let startIdx = -1;
  let endIdx = -1;

  if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    // Expecting Object
    startIdx = firstBrace;
    endIdx = cleaned.lastIndexOf('}');
  } else if (firstBracket !== -1) {
    // Expecting Array
    startIdx = firstBracket;
    endIdx = cleaned.lastIndexOf(']');
  }

  if (startIdx !== -1 && endIdx > startIdx) {
    cleaned = cleaned.substring(startIdx, endIdx + 1);
  }

  // 4. Remove trailing commas before closing braces/brackets (common Gemini error)
  cleaned = cleaned.replace(/,\s*([\}\]])/g, '$1');

  // 5. Attempt standard JSON.parse
  try {
    const parsed = JSON.parse(cleaned);
    console.log('[parseGeminiJson] Successfully parsed JSON output.');
    return parsed;
  } catch (parseError) {
    console.warn('[parseGeminiJson] Primary JSON parse failed:', parseError.message);

    // 6. Secondary fallback: Attempt brace/bracket balancing parsing
    try {
      const balanced = balanceJsonStructure(cleaned);
      const parsedBalanced = JSON.parse(balanced);
      console.log('[parseGeminiJson] Successfully parsed JSON after structure balancing.');
      return parsedBalanced;
    } catch (recoveryError) {
      console.error('[parseGeminiJson Error] All parsing attempts failed.');
      console.error('[parseGeminiJson Failure Details]:', {
        parseErrorMessage: parseError.message,
        recoveryErrorMessage: recoveryError.message,
        cleanedSnippet: cleaned.substring(0, 300)
      });
      console.error('[parseGeminiJson Raw Output]:\n', rawText);
      throw new Error(`Invalid Gemini JSON syntax: ${parseError.message}`);
    }
  }
};

/**
 * Secondary helper to balance braces/brackets if raw string contains truncated content
 */
const balanceJsonStructure = (str) => {
  let openBraces = 0;
  let openBrackets = 0;
  let inString = false;
  let escape = false;

  const isArray = str.startsWith('[');
  const startIdx = isArray ? str.indexOf('[') : str.indexOf('{');
  if (startIdx === -1) throw new Error('No open brace/bracket found');

  for (let i = startIdx; i < str.length; i++) {
    const char = str[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (char === '\\') {
      escape = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (!inString) {
      if (char === '{') openBraces++;
      if (char === '}') openBraces--;
      if (char === '[') openBrackets++;
      if (char === ']') openBrackets--;

      if (isArray && openBrackets === 0) {
        return str.substring(startIdx, i + 1).replace(/,\s*([\}\]])/g, '$1');
      } else if (!isArray && openBraces === 0) {
        return str.substring(startIdx, i + 1).replace(/,\s*([\}\]])/g, '$1');
      }
    }
  }
  throw new Error('Braces/brackets could not be balanced');
};

module.exports = {
  parseGeminiJson,
  STRICT_JSON_PROMPT_FOOTER
};
