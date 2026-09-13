const axios = require('axios');
const { parseGeminiJson } = require('../../utils/parseGeminiJson');

const apiKey = process.env.GEMINI_API_KEY;

/**
 * Reviews candidate's code quality, time/space complexity, edge cases, and best practices using Gemini AI
 */
async function reviewCodeQuality({
  problemTitle,
  problemDescription,
  difficulty,
  language,
  userCode,
  testCasesPassed,
  totalTestCases,
  executionResults = []
}) {
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const prompt = `
You are a Staff Software Engineer & Technical Bar Raiser at a top tier tech company conducting a live coding interview.
Evaluate the candidate's code submission for the following algorithmic challenge.

PROBLEM:
Title: ${problemTitle}
Difficulty: ${difficulty}
Description:
${problemDescription}

SUBMISSION DETAILS:
Language: ${language}
Test Cases Result: ${testCasesPassed} out of ${totalTestCases} passed.
Candidate's Code:
\`\`\`${language}
${userCode}
\`\`\`

Execution Results:
${JSON.stringify(executionResults.slice(0, 5), null, 2)}

Provide a strict, professional, comprehensive code review and evaluation in JSON matching this exact schema:
{
  "overallScore": 85,
  "correctnessScore": 90,
  "codeQualityScore": 85,
  "efficiencyScore": 80,
  "timeComplexity": "O(N)",
  "spaceComplexity": "O(1)",
  "timeComplexityOptimal": "O(N)",
  "spaceComplexityOptimal": "O(1)",
  "codeElegance": "Clear variable naming, logical structure, and efficient loop construct.",
  "cleanCodePractices": [
    "Used meaningful descriptive variable names",
    "Handled null/boundary checks upfront",
    "Clean early return pattern"
  ],
  "edgeCasesHandled": [
    "Empty input arrays",
    "Single-element inputs",
    "Negative values"
  ],
  "missedEdgeCases": [
    "Extremely large integer overflow"
  ],
  "strengths": [
    "Optimal linear time complexity",
    "Modular function structure",
    "Concise condition checks"
  ],
  "areasForImprovement": [
    "Consider extracting repetitive logic into helper functions",
    "Add explanatory comments for the two-pointer step"
  ],
  "suggestedOptimizations": "The solution is already linear, but could avoid auxiliary memory by swapping in-place.",
  "optimalSolutionCode": "// Optimal reference code snippet in ${language}\\nfunction solution(...) { ... }",
  "interviewerVerdict": "Strong Hire",
  "detailedFeedback": "The candidate demonstrated solid algorithmic intuition, wrote clean syntactic code, and successfully passed all primary test cases with optimal time complexity."
}

Rules:
1. "overallScore", "correctnessScore", "codeQualityScore", "efficiencyScore" must be integers between 0 and 100.
2. If no code was written or test cases failed completely, adjust scores proportionally (e.g. 0-20).
3. "interviewerVerdict" must be one of: "Strong Hire", "Hire", "Leaning Hire", "Leaning No Hire", "No Hire".
4. Return ONLY valid JSON without extra markdown backticks.
`;

  try {
    const payload = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json' }
    };

    const response = await axios.post(url, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 35000
    });

    const candidateText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidateText) {
      throw new Error('Empty response from Gemini');
    }

    const parsed = parseGeminiJson ? parseGeminiJson(candidateText) : JSON.parse(candidateText);
    return parsed;
  } catch (err) {
    console.warn('[AI Code Reviewer] Gemini evaluation error, using fallback review:', err.message);

    // Fallback heuristic scoring if AI call times out
    const passPercentage = totalTestCases > 0 ? Math.round((testCasesPassed / totalTestCases) * 100) : 50;
    return {
      overallScore: passPercentage,
      correctnessScore: passPercentage,
      codeQualityScore: Math.min(90, Math.max(50, passPercentage - 5)),
      efficiencyScore: Math.min(90, Math.max(50, passPercentage)),
      timeComplexity: "O(N)",
      spaceComplexity: "O(1)",
      timeComplexityOptimal: "O(N)",
      spaceComplexityOptimal: "O(1)",
      codeElegance: passPercentage >= 80 ? "Well-structured algorithm with clean syntax." : "Functional code with opportunities for cleaner structuring.",
      cleanCodePractices: [
        "Consistent indentation",
        "Proper function naming",
        "Structured logic flow"
      ],
      edgeCasesHandled: [
        "Standard test cases",
        "Boundary values"
      ],
      missedEdgeCases: [
        "Edge cases with duplicate or empty sets"
      ],
      strengths: [
        "Solves the main test cases",
        "Readable structure"
      ],
      areasForImprovement: [
        "Improve memory efficiency",
        "Add inline code documentation"
      ],
      suggestedOptimizations: "Review standard time and space complexities to ensure optimal bounds.",
      optimalSolutionCode: `// Optimal ${language} solution\n// Function implementation demonstrating optimal time & space complexity`,
      interviewerVerdict: passPercentage >= 80 ? "Hire" : passPercentage >= 50 ? "Leaning Hire" : "Leaning No Hire",
      detailedFeedback: `Candidate passed ${testCasesPassed} of ${totalTestCases} test cases with a pass score of ${passPercentage}%.`
    };
  }
}

module.exports = {
  reviewCodeQuality
};
