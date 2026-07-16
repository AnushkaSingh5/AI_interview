/**
 * Prompt Builder utility to construct structured AI interview generation prompts
 */

exports.buildQuestionPrompt = (user, resumeData, session) => {
  const {
    interviewType,
    role,
    company,
    experienceLevel,
    difficulty,
    questionCount,
    preferredLanguage,
    focusAreas
  } = session;

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

  // 3. Define distribution split based on interviewType
  let splitExplanation = '';
  if (interviewType === 'Mixed') {
    const techCount = Math.ceil(questionCount * 0.5);
    const hrCount = Math.ceil(questionCount * 0.2);
    const behavioralCount = Math.ceil(questionCount * 0.2);
    const projectCount = questionCount - (techCount + hrCount + behavioralCount);
    splitExplanation = `Provide exactly ${questionCount} questions with this approximate distribution:
    - ${techCount} Technical questions
    - ${hrCount} HR questions
    - ${behavioralCount} Behavioral questions
    - ${projectCount > 0 ? projectCount : 0} Project-based questions (specifically referencing candidate's projects: ${resumeData?.projects?.map(p=>p.title).join(', ') || 'N/A'})`;
  } else if (interviewType === 'Technical') {
    const techCount = Math.ceil(questionCount * 0.7);
    const projectCount = Math.ceil(questionCount * 0.2);
    const behavioralCount = questionCount - (techCount + projectCount);
    splitExplanation = `Provide exactly ${questionCount} questions with this approximate distribution:
    - ${techCount} Technical questions
    - ${projectCount} Project-based questions (specifically referencing candidate's projects: ${resumeData?.projects?.map(p=>p.title).join(', ') || 'N/A'})
    - ${behavioralCount > 0 ? behavioralCount : 0} Behavioral/Logic questions`;
  } else {
    // HR Interview
    const hrCount = Math.ceil(questionCount * 0.6);
    const behavioralCount = questionCount - hrCount;
    splitExplanation = `Provide exactly ${questionCount} questions with this approximate distribution:
    - ${hrCount} Behavioral/HR questions
    - ${behavioralCount} Situational/Leadership questions`;
  }

  // 4. Construct final prompt string
  return `
You are an expert technical interviewer at a premium tech corporation. Your goal is to generate a personalized set of interview questions for a candidate based on their profile, config details, and uploaded resume.

--- CANDIDATE TARGET PARAMETERS ---
Target Role: ${role}
Target Company: ${company || 'General Tech Company'}
Experience Level: ${experienceLevel}
Preferred Language: ${preferredLanguage}
Difficulty: ${difficulty}
Total Questions Required: ${questionCount}
Focus Areas: ${focusAreas?.join(', ') || 'General'}

--- CANDIDATE SKILLS & TECH TAGS ---
Skills: ${uniqueSkills.join(', ') || 'None provided'}

--- CANDIDATE RESUME PROJECTS ---
${projectsList || 'No projects listed'}

--- INSTRUCTIONS ---
1. Generate realistic interview questions.
2. ${splitExplanation}
3. The questions must challenge the candidate appropriately for a "${difficulty}" difficulty level.
4. Ensure project-based questions mention the specific projects (e.g. "In your project LaunchCart...") from their resume.
5. Focus areas should be heavily emphasized in technical questions.
6. Provide an expectedAnswer summary outlining the core concepts the candidate should include in their response.
7. Provide 2 helpful hints that guide the candidate if they struggle.
8. You MUST return ONLY a valid JSON array of objects. Do not include markdown code block fences (like \`\`\`json) or any conversational text.

JSON Schema Output Format:
[
  {
    "questionNumber": 1,
    "questionType": "technical", 
    "topic": "topic name (e.g. React, Node.js, Systems, Behavioral, Projects)",
    "difficulty": "${difficulty}",
    "question": "Question text...",
    "expectedAnswer": "Brief summary of key concepts required in the answer...",
    "hints": ["Hint option 1", "Hint option 2"]
  }
]
`;
};
