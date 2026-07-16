const { PDFParse } = require('pdf-parse');
const mammoth = require('mammoth');
const axios = require('axios');
const aiService = require('../services/aiService');

// Extract raw text from memory buffer based on MIME type
const extractText = async (buffer, mimeType) => {
  if (mimeType === 'application/pdf') {
    const parser = new PDFParse({ data: buffer });
    await parser.load();
    const data = await parser.getText();
    return data.text;
  } else if (
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    mimeType === 'application/msword'
  ) {
    const data = await mammoth.extractRawText({ buffer });
    return data.value;
  } else {
    throw new Error('Unsupported document format for text extraction');
  }
};

// Fallback heuristic keyword parser when Gemini key is missing/fails
const heuristicParser = (text) => {
  const data = {
    personalInformation: { name: '', email: '', phone: '', bio: '' },
    education: [],
    experience: [],
    projects: [],
    certifications: [],
    achievements: [],
    technicalSkills: [],
    softSkills: [],
    programmingLanguages: [],
    frameworks: [],
    databases: [],
    tools: [],
    interests: []
  };

  // 1. Extract email using Regex
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const emails = text.match(emailRegex);
  if (emails && emails.length > 0) {
    data.personalInformation.email = emails[0];
  }

  // 2. Extract phone using Regex
  const phoneRegex = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
  const phones = text.match(phoneRegex);
  if (phones && phones.length > 0) {
    data.personalInformation.phone = phones[0];
  }

  // 3. Estimate name from first lines
  const rawLines = text.split('\n').map(l => l.trim());
  const lines = rawLines.filter(l => l.length > 0);
  if (lines.length > 0) {
    if (!lines[0].includes('@')) {
      data.personalInformation.name = lines[0];
    }
  }

  // 4. Keyword lists for skills grouping
  const languagesList = ['javascript', 'typescript', 'python', 'java', 'c++', 'golang', 'go', 'ruby', 'php', 'swift', 'kotlin', 'rust', 'c#', 'sql', 'html', 'css'];
  const frameworksList = ['react', 'angular', 'vue', 'express', 'django', 'flask', 'next.js', 'vite', 'spring boot', 'laravel', 'asp.net', 'spring'];
  const databasesList = ['mongodb', 'postgresql', 'mysql', 'redis', 'sqlite', 'dynamodb', 'cassandra', 'oracle'];
  const toolsList = ['git', 'docker', 'kubernetes', 'aws', 'azure', 'gcp', 'jenkins', 'terraform', 'jira', 'figma', 'webpack', 'npm', 'yarn'];
  const softList = ['communication', 'leadership', 'teamwork', 'problem solving', 'critical thinking', 'time management', 'adaptability', 'creativity'];

  const lowerText = text.toLowerCase();

  const scanKeywords = (list, targetArray) => {
    list.forEach(kw => {
      const escapedKw = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp('(?:\\b|^)' + escapedKw + '(?:\\b|\\s|$)', 'i');
      if (regex.test(lowerText) && !targetArray.includes(kw)) {
        const displayVal = kw.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        targetArray.push(displayVal);
      }
    });
  };

  scanKeywords(languagesList, data.programmingLanguages);
  scanKeywords(frameworksList, data.frameworks);
  scanKeywords(databasesList, data.databases);
  scanKeywords(toolsList, data.tools);
  scanKeywords(softList, data.softSkills);

  data.technicalSkills = [
    ...data.programmingLanguages,
    ...data.frameworks,
    ...data.databases,
    ...data.tools
  ];

  // Smart Section parsing
  let currentSection = '';
  let activeExperience = null;
  let activeProject = null;

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i];
    if (!line) continue;

    // Detect section transition
    const upperLine = line.toUpperCase();
    if (upperLine === 'EDUCATION' || upperLine === 'ACADEMIC BACKGROUND') {
      currentSection = 'EDUCATION';
      continue;
    } else if (upperLine === 'EXPERIENCE' || upperLine === 'WORK EXPERIENCE' || upperLine === 'EMPLOYMENT HISTORY') {
      currentSection = 'EXPERIENCE';
      continue;
    } else if (upperLine === 'PROJECTS' || upperLine === 'PERSONAL PROJECTS') {
      currentSection = 'PROJECTS';
      continue;
    } else if (upperLine === 'SKILLS' || upperLine === 'TECHNICAL SKILLS') {
      currentSection = 'SKILLS';
      continue;
    } else if (upperLine === 'CERTIFICATIONS' || upperLine === 'ACHIEVEMENTS') {
      currentSection = 'OTHER';
      continue;
    }

    // Process line within current section
    if (currentSection === 'EDUCATION') {
      const yearRangeMatch = line.match(/(\d{4})[-–—\s]+(\d{2,4}|Present)/);
      const singleYearMatch = line.match(/\b(19\d{2}|20\d{2})\b/);
      let startDate = 'YYYY';
      let endDate = 'YYYY';
      if (yearRangeMatch) {
        startDate = yearRangeMatch[1];
        endDate = yearRangeMatch[2].length === 2 ? '20' + yearRangeMatch[2] : yearRangeMatch[2];
      } else if (singleYearMatch) {
        startDate = singleYearMatch[1];
        endDate = singleYearMatch[1];
      }

      const cleanLine = line.replace(/(\d{4})[-–—\s]+(\d{2,4}|Present)/g, '').trim();
      const parts = cleanLine.split(/[-–—,]/).map(p => p.trim()).filter(p => p.length > 0);
      
      let degree = 'Degree (e.g. B.S.)';
      let institution = 'University / School Name';
      let fieldOfStudy = 'Field of Study';
      let gpa = '';

      if (parts.length > 0) {
        degree = parts[0];
        if (degree.toLowerCase().includes('b.tech') || degree.toLowerCase().includes('bachelor')) {
          fieldOfStudy = 'Computer Science and Engineering';
        }
      }
      if (parts.length > 1) {
        institution = parts[1];
      }
      
      const gpaMatch = line.match(/CGPA:\s*([\d.]+)/i) || line.match(/(\d+)%/);
      if (gpaMatch) {
        gpa = gpaMatch[1] + (line.includes('%') ? '%' : '');
      }

      data.education.push({
        institution,
        degree,
        fieldOfStudy,
        startDate,
        endDate,
        gpa
      });

    } else if (currentSection === 'EXPERIENCE') {
      const isBullet = line.startsWith('–') || line.startsWith('-') || line.startsWith('•');
      
      if (!isBullet) {
        const durationMatch = line.match(/(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)?\s*\d{4}\s*[-–—]\s*(Present|\d{4}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)?\s*\d{4})/gi);
        let duration = 'MM/YYYY - Present';
        let cleanLine = line;
        
        if (durationMatch) {
          duration = durationMatch[0].trim();
          cleanLine = line.replace(duration, '').trim();
        }

        const parts = cleanLine.split(/[-–—]/).map(p => p.trim()).filter(p => p.length > 0);
        let company = 'Company / Employer';
        let position = 'Job Title / Role';

        if (parts.length > 0) {
          company = parts[0];
        }
        if (parts.length > 1) {
          position = parts[1];
        }

        activeExperience = {
          company,
          position,
          startDate: duration.split(/[-–—]/)[0]?.trim() || 'MM/YYYY',
          endDate: duration.split(/[-–—]/)[1]?.trim() || 'Present',
          description: ''
        };
        data.experience.push(activeExperience);
      } else {
        if (activeExperience) {
          const bulletText = line.replace(/^[–\-•]\s*/, '').trim();
          activeExperience.description += (activeExperience.description ? '\n' : '') + '• ' + bulletText;
        }
      }

    } else if (currentSection === 'PROJECTS') {
      const isBullet = line.startsWith('–') || line.startsWith('-') || line.startsWith('•');
      
      if (!isBullet) {
        const parts = line.split(/[-–—]/).map(p => p.trim()).filter(p => p.length > 0);
        let title = parts[0] || 'Project Title';
        
        activeProject = {
          title,
          description: '',
          technologies: []
        };
        data.projects.push(activeProject);
      } else {
        if (activeProject) {
          const bulletText = line.replace(/^[–\-•]\s*/, '').trim();
          activeProject.description += (activeProject.description ? '\n' : '') + '• ' + bulletText;
          
          const allSkills = [...languagesList, ...frameworksList, ...databasesList, ...toolsList];
          allSkills.forEach(skill => {
            const escapedKw = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp('(?:\\b|^)' + escapedKw + '(?:\\b|\\s|$)', 'i');
            if (regex.test(bulletText) && !activeProject.technologies.includes(skill)) {
              const displayVal = skill.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
              activeProject.technologies.push(displayVal);
            }
          });
        }
      }
    }
  }

  // Fallbacks if empty
  if (data.education.length === 0) {
    data.education.push({
      institution: 'University / School Name',
      degree: 'Degree (e.g. B.S.)',
      fieldOfStudy: 'Field of Study',
      startDate: 'YYYY',
      endDate: 'YYYY',
      gpa: ''
    });
  }
  if (data.experience.length === 0) {
    data.experience.push({
      company: 'Company / Employer',
      position: 'Job Title / Role',
      startDate: 'MM/YYYY',
      endDate: 'Present',
      description: 'Provide details about your role and achievements.'
    });
  }
  if (data.projects.length === 0) {
    data.projects.push({
      title: 'Project Title',
      description: 'Brief description of what you built.',
      technologies: []
    });
  }

  return data;
};

const parseStructuredData = async (text) => {
  try {
    console.log(`[Parser Utility] Directing text to AI service parser layer...`);
    const structuredData = await aiService.parseResumeWithAI(text);
    console.log(`[Parser Utility] AI extraction completed successfully!`);
    return structuredData;
  } catch (error) {
    console.error(`[Parser Utility] AI parsing failed completely:`, error.message);
    console.log(`[Parser Utility] Fallback: Executing heuristic keyword parsing.`);
    return heuristicParser(text);
  }
};

module.exports = {
  extractText,
  parseStructuredData
};
