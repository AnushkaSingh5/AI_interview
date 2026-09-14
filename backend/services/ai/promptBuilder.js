const { getCompanyStyle } = require('../../config/companyStyles');

exports.buildQuestionPrompt = (user, resumeData, session, adaptiveContext = null) => {
  const {
    interviewType,
    role,
    company,
    experienceLevel,
    difficulty,
    questionCount,
    preferredLanguage,
    focusAreas = [],
    selectedTopics = [],
    hrTopics = []
  } = session;

  const companyStyle = getCompanyStyle(company);

  const allTopics = [...(focusAreas || []), ...(selectedTopics || [])];
  const allTopicsLower = allTopics.map(t => t.toLowerCase());

  const hasCoding = interviewType === 'FullLoop' || allTopicsLower.some(t => 
    t.includes('dsa') || t.includes('coding') || t.includes('array') || t.includes('string') || 
    t.includes('tree') || t.includes('graph') || t.includes('dp') || t.includes('algorithm') || 
    t.includes('heap') || t.includes('recursion') || t.includes('pointers') || t.includes('binary search')
  );

  const hasSystemDesign = interviewType === 'FullLoop' || allTopicsLower.some(t => 
    t.includes('system design') || t.includes('distributed') || t.includes('caching') || 
    t.includes('microservice') || t.includes('scalability') || t.includes('database') || t.includes('kafka')
  );

  // 1. Format profile skills and resume tech tags
  const skillsList = [
    ...(user.skills || []),
    ...(user.frameworks || []),
    ...(user.databases || []),
    ...(user.tools || []),
    ...(resumeData?.technicalSkills || []),
    ...(resumeData?.programmingLanguages || []),
    ...(resumeData?.frameworks || []),
    ...(resumeData?.databases || []),
    ...(resumeData?.tools || [])
  ];
  const uniqueSkills = Array.from(new Set(skillsList.map(s => s.trim()))).filter(s => s.length > 0);

  // 2. Format resume project descriptions
  const projectsList = (resumeData?.projects || []).map(p => 
    `- Title: ${p.title}\n  Description: ${p.description}\n  Tech Stack: ${p.technologies?.join(', ') || 'N/A'}`
  ).join('\n');

  // Format work experience details
  const experienceList = (resumeData?.experience || []).map(exp =>
    `- Company: ${exp.company}\n  Role: ${exp.position}\n  Details: ${exp.description}`
  ).join('\n');

  let specialRoundInstructions = '';
  if (companyStyle) {
    specialRoundInstructions += `
--- COMPANY-SPECIFIC INTERVIEW STYLE FOR ${companyStyle.name.toUpperCase()} ---
Tagline / Hiring Theme: "${companyStyle.tagline}"
Technical Expectations:
${companyStyle.technicalStyle}
Behavioral & Cultural Expectations:
${companyStyle.behavioralStyle}
Evaluation Rubric Priority:
${companyStyle.rubricHighlights.map(r => `  - ${r}`).join('\n')}

Instructions for this ${companyStyle.name} interview set:
1. Frame technical questions strictly in ${companyStyle.name}'s real-world interview style.
2. If behavioral questions are included, strictly test candidate alignment with ${companyStyle.name}'s cultural pillars (e.g., STAR format for Amazon LP, Googleyness for Google, Growth Mindset for Microsoft, Core CS / Client consulting for Infosys/TCS/Accenture).
3. Ensure difficulty and depth match ${companyStyle.name}'s hiring standards.
`;
  }

  if (interviewType === 'FullLoop') {
    specialRoundInstructions += `
--- FULL-LOOP MULTI-ROUND ONSITE SIMULATION MODE ---
You MUST structure the ${questionCount} questions into 3 progressive rounds:
1. Round 1 (First questions): Core Technical, Architectural Concepts, & Behavioral screening questions (tagged "technical" or "behavioral").
2. Round 2: A practical Algorithmic Coding Challenge (tagged "coding") testing data structures / problem solving with test cases.
3. Round 3: A Distributed System Design Architecture Challenge (tagged "system_design") testing high scale, databases, and caching.
`;
  } else {
    if (hasCoding) {
      specialRoundInstructions += `
- Include at least 1-2 interactive Algorithmic Coding Challenge question(s) (tagged "questionType": "coding") testing candidate logic and implementation with sample test cases.
`;
    }
    if (hasSystemDesign) {
      specialRoundInstructions += `
- Include at least 1 interactive System Design Architecture Challenge question (tagged "questionType": "system_design") evaluating distributed components, APIs, and data modeling.
`;
    }
  }

  const baseHeader = `You are an expert Principal Bar Raiser Technical Interviewer at ${company ? company : 'a top tier tech company'}. 
Generate a personalized set of exactly ${questionCount} interview questions for a candidate tailored to ${company || 'industry best practices'}.
Target Role: "${role}"
Target Employer: "${company || 'General Tech'}"
Experience Level: "${experienceLevel}"
Difficulty: "${difficulty}"
Preferred Language: "${preferredLanguage}"
Total Questions Required: ${questionCount}
Selected Focus Topics: ${allTopics.join(', ') || (companyStyle ? companyStyle.focusAreas.join(', ') : 'Full Stack / Core Engineering')}
${specialRoundInstructions}
`;

  const outputSchemaInstruction = `
JSON Output Format:
You MUST return ONLY a valid JSON array of objects. Do not include markdown code block fences (like \`\`\`json) or conversational text.
[
  {
    "questionNumber": 1,
    "questionType": "technical" | "coding" | "system_design" | "behavioral" | "project",
    "topic": "Topic Name (e.g., Arrays, System Design, React, Kafka, Redis, Trees)",
    "difficulty": "${difficulty}",
    "question": "Question text / problem description...",
    "expectedAnswer": "Key criteria, expected complexity or architecture points required...",
    "hints": ["Hint 1", "Hint 2"],
    "codingDetails": {
      "problemId": "slug-name",
      "functionName": "solutionFunction",
      "starterTemplates": {
        "javascript": "function solution(args) {\n  // Code here\n}",
        "python": "def solution(args):\n    pass",
        "java": "class Solution {\n    public int solution(int[] args) {\n        return 0;\n    }\n}",
        "cpp": "#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    int solution(vector<int>& args) {\n        return 0;\n    }\n};",
        "c": "int solution(int* args, int size) {\n    return 0;\n}"
      },
      "sampleTestCases": [
        { "input": "[2, 7, 11, 15], 9", "expectedOutput": "[0, 1]", "explanation": "2 + 7 = 9" }
      ],
      "constraints": ["1 <= n <= 10^5"]
    },
    "systemDesignDetails": {
      "overview": "Problem statement for architecture challenge...",
      "functionalRequirements": ["Requirement 1", "Requirement 2"],
      "nonFunctionalRequirements": ["Low latency <20ms", "99.99% Availability"],
      "scaleEstimates": ["100M DAU", "10,000 QPS"]
    }
  }
]
`;

  return `${baseHeader}
--- CANDIDATE RESUME & SKILLS ---
Skills: ${uniqueSkills.join(', ') || 'General Engineering'}
Projects:
${projectsList || 'Standard Engineering Projects'}
Work Experience:
${experienceList || 'N/A'}

${outputSchemaInstruction}
`;
};
