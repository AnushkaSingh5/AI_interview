/**
 * Response Validator utility to parse, clean, and validate AI candidate responses
 */

// Helper to balance brackets and extract clean JSON substring if raw JSON parsing fails
const balanceBracesAndParse = (str) => {
  const firstBracket = str.indexOf('[');
  if (firstBracket === -1) throw new Error('No open bracket found');
  
  let openBrackets = 0;
  let inString = false;
  let escape = false;
  
  for (let i = firstBracket; i < str.length; i++) {
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
      if (char === '[') {
        openBrackets++;
      } else if (char === ']') {
        openBrackets--;
        if (openBrackets === 0) {
          const candidate = str.substring(firstBracket, i + 1);
          return JSON.parse(candidate);
        }
      }
    }
  }
  throw new Error('Brackets could not be balanced');
};

const { parseGeminiJson } = require('../../utils/jsonParser');

exports.validateAIResponse = (rawResponseText, expectedCount, sessionDifficulty) => {
  if (!rawResponseText || typeof rawResponseText !== 'string') {
    return { isValid: false, errors: ['Response is empty or not a string'] };
  }

  let parsedArray = null;
  const errors = [];

  // 1. Safe JSON parsing via centralized parseGeminiJson helper
  try {
    parsedArray = parseGeminiJson(rawResponseText);
  } catch (parseError) {
    return { 
      isValid: false, 
      errors: [`Gemini JSON parse error: ${parseError.message}`] 
    };
  }

  if (!Array.isArray(parsedArray)) {
    return { isValid: false, errors: ['AI response is not a valid JSON array'] };
  }

  // 2. Validate structures and remove duplicates
  const seenQuestions = new Set();
  const cleanedQuestions = [];

  parsedArray.forEach((item, idx) => {
    const qText = item.question?.trim();
    if (!qText) {
      errors.push(`Question at index ${idx} is missing "question" text.`);
      return;
    }

    // Check for duplicates (case insensitive)
    const lowerQ = qText.toLowerCase();
    if (seenQuestions.has(lowerQ)) {
      console.warn(`[AI Service] Duplicate question filtered: "${qText}"`);
      return; // Skip duplicate
    }
    seenQuestions.add(lowerQ);

    // Assert defaults for missing optional fields
    const qType = (item.questionType || item.type || 'technical').toLowerCase();
    const typeVal = ['technical', 'behavioral', 'hr', 'project'].includes(qType) ? qType : 'technical';

    const cleanItem = {
      questionNumber: cleanedQuestions.length + 1,
      questionType: typeVal,
      topic: item.topic || 'General',
      difficulty: item.difficulty || sessionDifficulty || 'Medium',
      question: qText,
      expectedAnswer: item.expectedAnswer || 'Candidate should demonstrate core understanding of the topic.',
      hints: Array.isArray(item.hints) ? item.hints.slice(0, 2) : ['Consider the basics of the topic.', 'Think about performance and edge cases.']
    };

    // Make sure hints array has exactly 2 elements
    while (cleanItem.hints.length < 2) {
      cleanItem.hints.push('Recall the main concepts.');
    }

    cleanedQuestions.push(cleanItem);
  });

  // 3. Count validation check
  if (cleanedQuestions.length === 0) {
    errors.push('No valid questions parsed from AI output.');
  }

  return {
    isValid: errors.length === 0,
    errors,
    questions: cleanedQuestions
  };
};
