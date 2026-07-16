const axios = require('axios');
const path = require('path');

// Ensure GEMINI_API_KEY is present on load
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error('\n========================================================================');
  console.error('CRITICAL CONFIGURATION ERROR: GEMINI_API_KEY is missing in backend/.env!');
  console.error('The server cannot start without a valid Gemini API key.');
  console.error('========================================================================\n');
  throw new Error('GEMINI_API_KEY is not defined in environment variables.');
}

// Log loaded masked key for debugging
const maskedKey = apiKey.length > 8 ? `${apiKey.substring(0, 6)}...${apiKey.substring(apiKey.length - 4)}` : '***';
console.log(`[AI Service] Initialize: API Key successfully loaded (${maskedKey})`);

/**
 * Sends a minimal prompt to Gemini to verify if the API key and connection are healthy.
 * @returns {Promise<{ success: boolean, model: string, responseTimeMs: number }>}
 */
const checkHealth = async () => {
  const model = process.env.GEMINI_MODEL || 'gemini-3.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const startTime = Date.now();

  try {
    const response = await axios.post(
      url,
      {
        contents: [{ parts: [{ text: 'Hello' }] }]
      },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000 // 30 seconds timeout for health check
      }
    );

    const duration = Date.now() - startTime;
    if (response.data && response.data.candidates) {
      return {
        success: true,
        model,
        responseTimeMs: duration
      };
    }
    throw new Error('Invalid response structure returned during health check');
  } catch (error) {
    const duration = Date.now() - startTime;
    const status = error.response?.status || 'TIMEOUT/NETWORK';
    const message = error.message;
    const body = error.response?.data ? JSON.stringify(error.response.data) : 'N/A';

    console.error(`[AI Service] Health check failed in ${duration}ms: Status=${status}, Message=${message}, Body=${body}`);
    throw {
      success: false,
      model,
      responseTimeMs: duration,
      errorStatus: status,
      errorMessage: message,
      errorDetails: error.response?.data
    };
  }
};

/**
 * Extracts and parses raw resume text into structured JSON schema using Gemini.
 * @param {string} text - Raw text extracted from PDF/DOCX resume file
 * @returns {Promise<object>} Parsed structured resume JSON object
 */
const parseResumeWithAI = async (text) => {
  // 1. Validate input text (Step 8)
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    throw new Error('Resume text extraction is empty or invalid');
  }

  const rawLength = text.length;
  console.log(`[AI Service] Starting resume parse. Raw character count: ${rawLength}`);

  // 2. Payload Validation & Trimming/Chunking (Step 7)
  const maxSafeChars = 12000;
  const trimmedText = rawLength > maxSafeChars ? text.substring(0, maxSafeChars) : text;
  if (rawLength > maxSafeChars) {
    console.log(`[AI Service] Payload size warning: Text length (${rawLength}) exceeded limit of ${maxSafeChars}. Automatically trimmed.`);
  }

  const prompt = `
You are an expert resume parser. Analyze the following raw resume text and extract it into a structured JSON object matching this schema. Make sure to categorize skills, experience, education, projects, certifications, achievements, soft skills, programming languages, frameworks, databases, and tools.

JSON Schema:
{
  "personalInformation": {
    "name": "Extract full name",
    "email": "Extract email address",
    "phone": "Extract phone number",
    "bio": "Write a short professional summary bio based on the resume"
  },
  "education": [
    {
      "institution": "School/University name",
      "degree": "Degree name",
      "fieldOfStudy": "Field of study",
      "startDate": "Start date or year",
      "endDate": "End date/year or Present",
      "gpa": "GPA if present"
    }
  ],
  "experience": [
    {
      "company": "Company name",
      "position": "Job title",
      "startDate": "Start date",
      "endDate": "End date or Present",
      "description": "Short description of duties and achievements"
    }
  ],
  "projects": [
    {
      "title": "Project title",
      "description": "Project details",
      "technologies": ["Array of tools/technologies used"]
    }
  ],
  "certifications": ["Array of strings"],
  "achievements": ["Array of strings"],
  "technicalSkills": ["Array of general technical skills"],
  "softSkills": ["Array of soft skills"],
  "programmingLanguages": ["Array of programming languages like Python, JavaScript, Java, C++, Go, etc."],
  "frameworks": ["Array of frameworks like React, Node.js, Express, Angular, Vue, Django, Flask, etc."],
  "databases": ["Array of databases like MongoDB, PostgreSQL, MySQL, Redis, DynamoDB, etc."],
  "tools": ["Array of tools like Git, Docker, Kubernetes, AWS, Jenkins, Jira, etc."],
  "interests": ["Array of interests"]
}

Resume Raw Text:
${trimmedText}
`;

  const model = process.env.GEMINI_MODEL || 'gemini-3.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { responseMimeType: 'application/json' }
  };

  const payloadSize = Buffer.byteLength(JSON.stringify(payload));
  console.log(`[AI Service] Request details: Prompt Length=${prompt.length} chars, Payload Size=${payloadSize} bytes, Model=${model}`);

  // 3. Request execution with exponential backoff retry loop (Steps 5 & 6)
  let attempts = 0;
  const maxAttempts = 1; // Fails immediately and falls back to local template questions
  let backoffDelay = 1000;
  let response;
  let duration = 0;

  while (attempts < maxAttempts) {
    attempts++;
    const startTime = Date.now();
    try {
      console.log(`[AI Service] Sending Gemini request (Attempt ${attempts}/${maxAttempts}, Timeout=60s)...`);
      response = await axios.post(url, payload, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 60000 // 60 seconds timeout (Step 5)
      });
      
      duration = Date.now() - startTime;
      console.log(`[AI Service] Request succeeded in ${duration}ms.`);
      break; // break loop on success
    } catch (error) {
      duration = Date.now() - startTime;
      const status = error.response?.status || 'TIMEOUT/NETWORK';
      const errMsg = error.message;
      const errBody = error.response?.data ? JSON.stringify(error.response.data, null, 2) : 'N/A';

      console.error(`[AI Service] Request failed on attempt ${attempts}/${maxAttempts} in ${duration}ms (Model=${model}, InputLength=${prompt.length}):`);
      console.error(`  - HTTP Status: ${status}`);
      console.error(`  - Error Message: ${errMsg}`);
      if (error.response?.data) {
        console.error(`  - Response Body: ${errBody}`);
      }

      // Check if the failure is a temporary status code or a timeout/network drop (Step 6)
      const retryableStatuses = [429, 500, 502, 503, 504];
      const isTimeoutOrNetwork = !error.response || error.code === 'ECONNABORTED';
      const isRetryable = retryableStatuses.includes(status) || isTimeoutOrNetwork;

      if (isRetryable && attempts < maxAttempts) {
        console.log(`[AI Service] Temporary issue detected. Retrying in ${backoffDelay}ms using backoff...`);
        await new Promise((resolve) => setTimeout(resolve, backoffDelay));
        backoffDelay *= 2; // exponential backoff
      } else {
        console.error(`[AI Service] Max attempts reached or non-retryable error. Propagating failure.`);
        throw new Error(`Gemini request failed: ${errMsg} (Status: ${status})`);
      }
    }
  }

  // 4. Validate and sanitize Gemini JSON response (Step 12)
  if (!response || !response.data) {
    throw new Error('No response data received from Gemini API');
  }

  const textResponse = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!textResponse) {
    throw new Error('Invalid empty text candidate returned by Gemini API');
  }

  console.log(`[AI Service] Response text received (${textResponse.length} chars). Validating JSON structure...`);
  
  // Helper to balance braces and extract clean JSON substring (Step 12)
  const balanceBracesAndParse = (str) => {
    const firstBrace = str.indexOf('{');
    if (firstBrace === -1) throw new Error('No open brace found');
    
    let openBrackets = 0;
    let inString = false;
    let escape = false;
    
    for (let i = firstBrace; i < str.length; i++) {
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
        if (char === '{') {
          openBrackets++;
        } else if (char === '}') {
          openBrackets--;
          if (openBrackets === 0) {
            const candidate = str.substring(firstBrace, i + 1);
            return JSON.parse(candidate);
          }
        }
      }
    }
    throw new Error('Braces could not be balanced');
  };

  let parsedData;
  try {
    parsedData = JSON.parse(textResponse);
  } catch (parseError) {
    console.warn(`[AI Service] JSON parse failed on raw text. Executing markdown fence cleanup & brace balancing recovery...`);
    // Clean markdown syntax blocks
    let cleanedText = textResponse.trim();
    if (cleanedText.startsWith('```')) {
      cleanedText = cleanedText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
    }
    
    try {
      parsedData = balanceBracesAndParse(cleanedText);
      console.log(`[AI Service] JSON recovery (brace balanced parsing) successful!`);
    } catch (recoveryError) {
      console.error(`[AI Service] JSON recovery failed:`, recoveryError.message);
      console.error(`[AI Service] Unparseable content:\n${textResponse}`);
      throw new Error(`Gemini response contains invalid JSON syntax: ${parseError.message}`);
    }
  }

  return parsedData;
};

module.exports = {
  checkHealth,
  parseResumeWithAI
};
