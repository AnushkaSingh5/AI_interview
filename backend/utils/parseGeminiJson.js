/**
 * Shared Gemini JSON Parser & Extractor
 */
const { logAiEvent } = require('./logger');

const STRICT_JSON_PROMPT_FOOTER = `

CRITICAL INSTRUCTIONS:
- Return ONLY valid JSON.
- Do NOT include markdown code fences (like \`\`\`json).
- Do NOT include explanations, preamble, or commentary.
- Do NOT include comments or trailing commas before closing braces } or brackets ].
- Ensure all quotes and JSON keys are properly enclosed in double quotes.
`;

/**
 * Parses raw Gemini response text into a valid JavaScript Object or Array.
 * @param {string} responseText - Raw text output from Gemini
 * @param {string} featureName - Name of the feature requesting parsing
 * @returns {object|array} Parsed JSON data
 */
const parseGeminiJson = (responseText, featureName = 'Generic AI') => {
  if (!responseText || typeof responseText !== 'string' || responseText.trim().length === 0) {
    logAiEvent({
      feature: featureName,
      status: 'PARSE_FAILED',
      error: new Error('Gemini response is empty or non-string')
    });
    throw new Error('Gemini response is empty or non-string');
  }

  let cleaned = responseText.trim();

  // 1. Remove markdown code blocks (```json ... ``` or ``` ...)
  cleaned = cleaned.replace(/```(?:json|javascript|js)?/gi, '').replace(/```/g, '').trim();

  // 2. Remove leading/trailing text outside JSON structure
  const firstBrace = cleaned.indexOf('{');
  const firstBracket = cleaned.indexOf('[');

  let startIdx = -1;
  let endIdx = -1;

  if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    // Expecting JSON Object
    startIdx = firstBrace;
    endIdx = cleaned.lastIndexOf('}');
  } else if (firstBracket !== -1) {
    // Expecting JSON Array
    startIdx = firstBracket;
    endIdx = cleaned.lastIndexOf(']');
  }

  if (startIdx !== -1 && endIdx > startIdx) {
    cleaned = cleaned.substring(startIdx, endIdx + 1);
  }

  // 3. Remove trailing commas before } or ]
  cleaned = cleaned.replace(/,\s*([\}\]])/g, '$1');

  // 4. Attempt standard JSON.parse
  try {
    const parsed = JSON.parse(cleaned);
    logAiEvent({
      feature: featureName,
      status: 'PARSE_SUCCESSFUL',
      rawResponse: responseText,
      cleanedJson: parsed
    });
    return parsed;
  } catch (parseError) {
    console.warn(`[parseGeminiJson] Initial parse failed for ${featureName}: ${parseError.message}. Attempting structure balancing...`);

    // 5. Attempt bracket/brace balancing recovery
    try {
      const balancedStr = balanceJsonStructure(cleaned);
      const parsedBalanced = JSON.parse(balancedStr);
      logAiEvent({
        feature: featureName,
        status: 'PARSE_SUCCESSFUL_WITH_RECOVERY',
        rawResponse: responseText,
        cleanedJson: parsedBalanced
      });
      return parsedBalanced;
    } catch (recoveryError) {
      logAiEvent({
        feature: featureName,
        status: 'PARSE_FAILED',
        rawResponse: responseText,
        cleanedJson: cleaned,
        error: new Error(`JSON parse failed: ${parseError.message} | Recovery error: ${recoveryError.message}`)
      });
      throw new Error(`Failed to parse Gemini response for ${featureName}: ${parseError.message}`);
    }
  }
};

/**
 * Helper to balance braces/brackets if raw string contains trailing text
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
