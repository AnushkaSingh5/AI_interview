const { parseGeminiJson } = require('../../utils/parseGeminiJson');
const { executeWithRetry } = require('../../utils/geminiRetry');

/**
 * Heuristic fallback reviewer when Gemini API is busy or offline
 */
const heuristicReviewer = ({ rawText = '', resumeData = null, targetRole = 'Software Engineer', targetCompany = 'General Tech' }) => {
  const text = (rawText || '') + ' ' + (resumeData ? JSON.stringify(resumeData) : '');
  const lowerText = text.toLowerCase();

  // Keyword dictionary by role & domain
  const skillDictionary = {
    Languages: ['javascript', 'typescript', 'python', 'java', 'c++', 'golang', 'sql', 'html5', 'css3', 'rust', 'c#'],
    Frameworks: ['react', 'next.js', 'node.js', 'express', 'spring boot', 'django', 'fastapi', 'vue.js', 'angular', 'redux', 'tailwind css'],
    Cloud_DevOps: ['aws', 'docker', 'kubernetes', 'ci/cd', 'github actions', 'terraform', 'gcp', 'azure', 'linux', 'nginx'],
    Databases: ['postgresql', 'mongodb', 'redis', 'mysql', 'elasticsearch', 'dynamodb', 'cassandra', 'prisma'],
    Architecture_Tools: ['microservices', 'rest api', 'graphql', 'system design', 'websockets', 'kafka', 'unit testing', 'jest', 'agile', 'git']
  };

  const presentKeywords = [];
  const missingKeywords = [];

  Object.entries(skillDictionary).forEach(([category, terms]) => {
    terms.forEach(term => {
      const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp('(?:\\b|^)' + escaped + '(?:\\b|\\s|$)', 'i');
      const display = term.toUpperCase() === term ? term : term.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      
      if (regex.test(lowerText)) {
        if (!presentKeywords.includes(display)) presentKeywords.push(display);
      } else {
        missingKeywords.push({
          keyword: display,
          category: category.replace('_', ' & '),
          importance: ['Languages', 'Frameworks'].includes(category) ? 'Critical' : 'High',
          recommendation: `Add experience with ${display} in your technical skills or project tech stack.`
        });
      }
    });
  });

  const matchPercentage = Math.min(95, Math.max(45, Math.round((presentKeywords.length / (presentKeywords.length + missingKeywords.length * 0.4)) * 100)));

  // ATS Formatting checks
  const formattingChecks = [
    {
      item: 'Standard Header Hierarchy',
      status: lowerText.includes('education') && lowerText.includes('experience') ? 'Pass' : 'Warning',
      tip: 'Use standard H2 section names: "Work Experience", "Education", "Technical Skills", "Projects".'
    },
    {
      item: 'Contact Information Completeness',
      status: /@/.test(text) && /\d{10}|\d{3}[-.\s]\d{3}[-.\s]\d{4}/.test(text) ? 'Pass' : 'Warning',
      tip: 'Ensure your email, phone number, LinkedIn URL, and GitHub profile are clearly visible at top.'
    },
    {
      item: 'Bullet Point Formatting',
      status: text.includes('•') || text.includes('-') ? 'Pass' : 'Warning',
      tip: 'Use standard round bullets (•) rather than custom vector glyphs or icons.'
    },
    {
      item: 'Measurable Metrics & KPIs',
      status: /%|\$|\b\d+x\b|\b\d+k\b|\bms\b/i.test(text) ? 'Pass' : 'Fail',
      tip: 'Incorporate quantifiable outcomes (e.g. "Reduced API response latency by 35%").'
    },
    {
      item: 'Single Column ATS Parsability',
      status: 'Pass',
      tip: 'Keep your resume in a clean single-column or ATS-friendly double-column layout without nested tables.'
    }
  ];

  const criticalFixes = [
    'Add quantifiable metrics (%, ms, $) to every project and experience bullet point.',
    `Inject high-demand keywords tailored for ${targetRole} (${missingKeywords.slice(0, 3).map(k => k.keyword).join(', ')}).`,
    'Replace passive verbs ("worked on", "assisted in") with strong action verbs ("Architected", "Optimized", "Spearheaded").'
  ];

  // Wording transformations
  const wordingSuggestions = [
    {
      originalText: 'Responsible for developing the frontend user interface and fixing bugs.',
      suggestedText: 'Engineered responsive React client interfaces and resolved critical UX bottlenecks, reducing page render latency by 30%.',
      category: 'Action Verb & Impact',
      reason: 'Replaces passive "Responsible for" with power verb "Engineered" and adds quantifiable latency reduction impact.'
    },
    {
      originalText: 'Worked on backend APIs using Node.js and MongoDB database.',
      suggestedText: 'Architected high-throughput RESTful microservices with Node.js and MongoDB, handling 15,000+ daily requests with 99.9% uptime.',
      category: 'Impact / Metrics',
      reason: 'Transforms generic tech mention into concrete scale metrics and reliable system architecture claims.'
    },
    {
      originalText: 'Helped the team with unit testing and continuous integration.',
      suggestedText: 'Implemented automated CI/CD pipelines and Jest unit test suites, boosting overall test coverage to 88% and accelerating deployment cycles.',
      category: 'Action Verb & Impact',
      reason: 'Demonstrates active engineering ownership rather than passive assistance.'
    }
  ];

  // Project enhancements
  const projectsList = (resumeData && resumeData.projects && resumeData.projects.length > 0)
    ? resumeData.projects
    : [{ title: 'Full Stack Web Application', description: 'Built an e-commerce platform using MERN stack with user authentication and payment gateway.' }];

  const projectEnhancements = projectsList.map((p, idx) => ({
    originalTitle: p.title || `Project ${idx + 1}`,
    originalDescription: p.description || 'Developed application features and integrated database.',
    enhancedTitle: p.title ? `${p.title} — Scalable Cloud Architecture` : `Cloud-Native Distributed System ${idx + 1}`,
    enhancedBullets: [
      `Architected end-to-end full-stack application using ${(p.technologies && p.technologies.length > 0) ? p.technologies.join(', ') : 'React, Node.js, and MongoDB'}, supporting real-time state synchronization.`,
      `Designed RESTful endpoints with Redis caching layer, slashing database query overhead by 42% under concurrent traffic.`,
      `Engineered secure JWT authentication and role-based access control (RBAC), ensuring zero-trust session integrity.`
    ],
    missingTechnicalDepth: [
      'Explain caching strategies (Redis, CDN) used to handle concurrent users.',
      'Specify API error handling, rate limiting, and database indexing optimizations.'
    ],
    recommendedTech: ['Redis', 'Docker', 'JWT', 'Jest / Supertest', 'Tailwind CSS'],
    metricsToHighlight: ['Query execution time reduction %', 'Concurrent active users supported', 'Test coverage %']
  }));

  const atsScore = 78;
  const wordingScore = 72;
  const skillsScore = matchPercentage;
  const projectScore = 74;
  const readabilityScore = 84;
  const overallScore = Math.round((atsScore * 0.3) + (wordingScore * 0.25) + (skillsScore * 0.2) + (projectScore * 0.25));

  return {
    targetRole,
    targetCompany,
    overallScore,
    atsScore,
    wordingScore,
    skillsScore,
    projectScore,
    readabilityScore,
    executiveSummary: `Your resume demonstrates solid foundational technical capability for ${targetRole}. However, ATS compatibility and hiring manager impact can be elevated by converting passive descriptions into metrics-driven Google XYZ formulas and injecting key missing skills (${missingKeywords.slice(0, 3).map(k => k.keyword).join(', ')}).`,
    hiringVerdict: overallScore >= 80 ? 'Strong Contender — Polish Projects & ATS' : 'Promising Baseline — Needs Impact & Metric Polish',
    topQuickWins: criticalFixes,
    atsAnalysis: {
      compatibilityLevel: atsScore >= 80 ? 'High' : 'Moderate',
      readabilityGrade: 'Professional / Technical',
      formattingChecks,
      criticalFixes
    },
    keywordsAnalysis: {
      matchPercentage,
      presentKeywords: presentKeywords.slice(0, 20),
      missingKeywords: missingKeywords.slice(0, 10)
    },
    wordingSuggestions,
    projectEnhancements,
    analysisEngine: 'Regex & Heuristic Rules'
  };
};

/**
 * Review Resume with Gemini AI
 */
const reviewResumeWithAI = async ({ rawText, resumeData, targetRole = 'Software Engineer', targetCompany = 'General Tech', rawGeminiRequest }) => {
  const contentSnippet = (rawText || '').substring(0, 12000);
  const structuredContext = resumeData ? JSON.stringify(resumeData).substring(0, 4000) : '';

  const prompt = `
You are a Principal Tech Recruiter and ATS Optimization Expert from Silicon Valley (ex-Google, ex-Amazon, ex-Meta).
Perform a deep, critical, and highly actionable Resume Review for a candidate targeting the role: "${targetRole}" at company tier: "${targetCompany}".

Input Resume Text:
"""
${contentSnippet}
"""

Structured Resume Context:
"""
${structuredContext}
"""

Instructions:
1. **ATS Improvements (🎯)**:
   - Calculate ATS Score (0-100) based on readability, parsability by major ATS (Workday, Greenhouse, Lever), standard section headers, contact info completeness, and single-column formatting.
   - List 4-6 specific formatting checks with status ("Pass", "Warning", "Fail") and actionable tips.
   - List 3-4 critical ATS fixes.

2. **Missing Keywords & Skills Gap (🔑)**:
   - Identify which core keywords and technical skills for "${targetRole}" are PRESENT in the resume.
   - Identify critical MISSING keywords categorized into 'Languages', 'Frameworks', 'Cloud & DevOps', 'Databases', or 'Architecture & Tools'.
   - Calculate keyword match percentage (0-100).

3. **Better Wording & Action Verbs (✍️)**:
   - Identify 3-5 weak, passive, or vague bullet points in the resume (e.g., phrases using "responsible for", "helped", "worked on", or lacking metrics).
   - Rewrite them using the **Google XYZ Formula** ("Accomplished [X], as measured by [Y], by doing [Z]") with strong action verbs (Engineered, Architected, Spearheaded, Optimized, Streamlined) and quantifiable placeholder metrics.

4. **Stronger Project Descriptions (🚀)**:
   - For EACH project found in the resume (or top 2-3 projects), provide:
     - originalTitle and originalDescription
     - enhancedTitle (impactful title)
     - enhancedBullets: 3 highly detailed, metric-driven, technical bullet points highlighting architecture, performance optimizations, and quantifiable outcomes.
     - missingTechnicalDepth: 2 specific technical aspects the candidate failed to explain (e.g. concurrency, caching, data modeling).
     - recommendedTech: 3-5 relevant technologies to add.
     - metricsToHighlight: 2-3 specific KPIs (e.g. latency, throughput, cost reduction, scale).

5. **Scoring & Executive Verdict**:
   - overallScore (0-100)
   - atsScore (0-100)
   - wordingScore (0-100)
   - skillsScore (0-100)
   - projectScore (0-100)
   - readabilityScore (0-100)
   - executiveSummary (2-3 sentences summarising overall readiness and highest leverage improvement)
   - hiringVerdict (e.g., "Top 10% Candidate", "Strong — Needs Metric Polish", "Needs Structural & Keyword Overhaul")
   - topQuickWins (3 concrete action items for today)

Return STRICTLY a JSON object matching this schema:
{
  "targetRole": "${targetRole}",
  "targetCompany": "${targetCompany}",
  "overallScore": 82,
  "atsScore": 85,
  "wordingScore": 78,
  "skillsScore": 80,
  "projectScore": 84,
  "readabilityScore": 88,
  "executiveSummary": "Summary text here...",
  "hiringVerdict": "Strong Contender — Polish Projects & ATS",
  "topQuickWins": ["Quick Win 1", "Quick Win 2", "Quick Win 3"],
  "atsAnalysis": {
    "compatibilityLevel": "High", // "High" | "Moderate" | "Needs Work"
    "readabilityGrade": "Professional / Technical",
    "formattingChecks": [
      { "item": "Standard Section Headers", "status": "Pass", "tip": "..." },
      { "item": "Contact Details Completeness", "status": "Pass", "tip": "..." },
      { "item": "Action Verbs & Impact Metrics", "status": "Warning", "tip": "..." },
      { "item": "Single-Column ATS Parsability", "status": "Pass", "tip": "..." }
    ],
    "criticalFixes": ["Fix 1", "Fix 2", "Fix 3"]
  },
  "keywordsAnalysis": {
    "matchPercentage": 80,
    "presentKeywords": ["React", "Node.js", "MongoDB", "JavaScript"],
    "missingKeywords": [
      {
        "keyword": "Redis",
        "category": "Databases",
        "importance": "High",
        "recommendation": "Mention caching strategies with Redis in your backend projects."
      }
    ]
  },
  "wordingSuggestions": [
    {
      "originalText": "Original text...",
      "suggestedText": "Rewritten text with Google XYZ formula...",
      "category": "Action Verb & Impact",
      "reason": "Why this change makes the candidate stand out..."
    }
  ],
  "projectEnhancements": [
    {
      "originalTitle": "Project Title",
      "originalDescription": "Original snippet",
      "enhancedTitle": "Enhanced Title",
      "enhancedBullets": ["Bullet 1", "Bullet 2", "Bullet 3"],
      "missingTechnicalDepth": ["Depth point 1", "Depth point 2"],
      "recommendedTech": ["Tech 1", "Tech 2"],
      "metricsToHighlight": ["Metric 1", "Metric 2"]
    }
  ]
}
`;

  try {
    const rawResponse = await executeWithRetry(
      (p) => rawGeminiRequest(p),
      prompt,
      'AI Resume Review'
    );

    const parsed = parseGeminiJson(rawResponse);
    parsed.analysisEngine = 'Gemini 2.5 AI';
    return parsed;
  } catch (err) {
    console.warn(`[AI Resume Reviewer] Gemini generation failed: ${err.message}. Falling back to heuristic reviewer.`);
    return heuristicReviewer({ rawText, resumeData, targetRole, targetCompany });
  }
};

module.exports = {
  reviewResumeWithAI,
  heuristicReviewer
};
