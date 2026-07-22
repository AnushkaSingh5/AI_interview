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
    focusAreas,
    selectedTopics,
    hrTopics,
    useResume,
    useProjects,
    useExperience,
    questionDistribution
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

  // Format work experience details
  const experienceList = (resumeData?.experience || []).map(exp =>
    `- Company: ${exp.company}\n  Role: ${exp.position}\n  Details: ${exp.description}`
  ).join('\n');

  // Base prompt header & instructions
  const baseHeader = `You are an expert technical interviewer at a premium tech corporation (e.g. ${company || 'Google'}). 
Generate a personalized set of exactly ${questionCount} interview questions for a candidate.
Target Role: "${role}"
Experience Level: "${experienceLevel}"
Difficulty: "${difficulty}"
Preferred Language: "${preferredLanguage}"
Total Questions Required: ${questionCount}
`;

  const outputSchemaInstruction = `
JSON Output Format:
You MUST return ONLY a valid JSON array of objects. Do not include markdown code block fences (like \`\`\`json) or any conversational text.
[
  {
    "questionNumber": 1,
    "questionType": "technical" or "hr" or "resume", 
    "topic": "topic name (e.g. React, Node.js, Systems, Behavioral, Projects)",
    "difficulty": "${difficulty}",
    "question": "Question text...",
    "expectedAnswer": "Brief summary of key concepts required in the answer...",
    "hints": ["Hint option 1", "Hint option 2"]
  }
]
`;

  // Dynamic Prompt Construction based on interviewType
  if (interviewType === 'ResumeBased') {
    return `${baseHeader}
--- CANDIDATE RESUME DETAILS ---
Skills: ${uniqueSkills.join(', ') || 'None provided'}
Projects:
${projectsList || 'No projects listed'}
Work Experience:
${experienceList || 'No work experience listed'}

--- SPECIAL INSTRUCTIONS FOR RESUME BASED MODE ---
1. Generate interview questions strictly using the candidate's resume, projects, work experience, and listed skills.
2. Ask project-based questions detailing their actual architectural and tool choices.
3. Ask technology questions specifically related to projects they implemented.
4. Do NOT ask generic technical questions or generic HR questions that are completely unrelated to their resume.
5. Provide expected answers and 2 guidance hints per question.
${outputSchemaInstruction}
`;
  }

  if (interviewType === 'Technical') {
    const topicsToUse = (selectedTopics && selectedTopics.length > 0) ? selectedTopics : (focusAreas && focusAreas.length > 0 ? focusAreas : ['Software Engineering']);
    return `${baseHeader}
--- TARGET TECHNICAL TOPICS ---
Topics: ${topicsToUse.join(', ')}

--- SPECIAL INSTRUCTIONS FOR TECHNICAL MODE ---
1. Generate technical interview questions strictly from the chosen technical topics: ${topicsToUse.join(', ')}.
2. Do NOT use or reference the candidate's resume context, personal projects, or work history.
3. Focus on code optimization, system design principles, data structures, algorithms, and core domain knowledge.
4. Distribute the questions reasonably across the selected topics.
5. Provide expected answers and 2 guidance hints per question.
${outputSchemaInstruction}
`;
  }

  if (interviewType === 'HR') {
    const topicsToUse = (hrTopics && hrTopics.length > 0) ? hrTopics : ['Communication', 'Behavioral', 'Leadership', 'Conflict Resolution'];
    return `${baseHeader}
--- TARGET HR & BEHAVIORAL TOPICS ---
Topics: ${topicsToUse.join(', ')}

--- SPECIAL INSTRUCTIONS FOR HR MODE ---
1. Generate HR, behavioral, situational, and culture-fit questions covering: ${topicsToUse.join(', ')}.
2. Focus on situational conflicts, leadership opportunities, team communication, and personal growth goals.
3. Do NOT ask any coding, system architecture, syntax, or technical configuration questions.
4. Provide expected answers (STAR method targets) and 2 guidance hints per question.
${outputSchemaInstruction}
`;
  }

  if (interviewType === 'Mixed') {
    const techCount = Math.max(1, Math.round(questionCount * (questionDistribution?.technical || 60) / 100));
    const hrCount = Math.max(1, Math.round(questionCount * (questionDistribution?.hr || 20) / 100));
    const resumeCount = Math.max(0, questionCount - (techCount + hrCount));

    const techTopics = (selectedTopics && selectedTopics.length > 0) ? selectedTopics : ['JavaScript', 'System Design'];
    const hTopics = (hrTopics && hrTopics.length > 0) ? hrTopics : ['Behavioral', 'Communication'];

    return `${baseHeader}
--- CANDIDATE RESUME DETAILS ---
Skills: ${uniqueSkills.join(', ') || 'None'}
Projects:
${projectsList || 'None'}

--- TARGET THEMES ---
Technical Topics: ${techTopics.join(', ')}
HR Topics: ${hTopics.join(', ')}

--- SPECIAL INSTRUCTIONS FOR MIXED MODE ---
1. Generate a total of ${questionCount} questions following this distribution split:
   - Generate exactly ${techCount} Technical questions covering: ${techTopics.join(', ')}
   - Generate exactly ${hrCount} HR/Behavioral questions covering: ${hTopics.join(', ')}
   - Generate exactly ${resumeCount} Resume-based questions referencing the candidate's projects or experience.
2. Mix the questions naturally.
3. Provide expected answers and 2 guidance hints per question.
${outputSchemaInstruction}
`;
  }

  if (interviewType === 'Custom') {
    const techTopics = selectedTopics || [];
    const hTopics = hrTopics || [];
    const resumeIncluded = useResume || useProjects || useExperience;

    return `${baseHeader}
--- CANDIDATE RESUME DETAILS ---
Skills: ${uniqueSkills.join(', ') || 'None'}
Projects:
${projectsList || 'None'}

--- CUSTOM DEFINED TOPICS ---
Technical: ${techTopics.join(', ') || 'General Technical'}
HR/Behavioral: ${hTopics.join(', ') || 'General HR'}
Resume Reference Allowed: ${resumeIncluded ? 'Yes' : 'No'}

--- SPECIAL INSTRUCTIONS FOR CUSTOM MODE ---
1. Generate exactly ${questionCount} questions.
2. Select questions only from the manually specified technical topics (${techTopics.join(', ')}) and HR topics (${hTopics.join(', ')}).
3. If Resume Reference is Allowed, include questions connecting these topics to the candidate's resume/projects. Otherwise, ignore resume context completely.
4. Provide expected answers and 2 guidance hints per question.
${outputSchemaInstruction}
`;
  }

  // Fallback Mixed distribution if type is unknown
  return `${baseHeader}
Skills: ${uniqueSkills.join(', ')}
Projects: ${projectsList}
Instructions: Generate exactly ${questionCount} questions blending Technical and behavioral elements.
${outputSchemaInstruction}
`;
};
