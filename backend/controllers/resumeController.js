const path = require('path');
const fs = require('fs');
const { cloudinary, isCloudinaryConfigured } = require('../config/cloudinary');
const { extractText, parseStructuredData } = require('../utils/parser');
const User = require('../models/User');
const Resume = require('../models/Resume');
const ResumeData = require('../models/ResumeData');
const ResumeReview = require('../models/ResumeReview');
const aiService = require('../services/aiService');
const { calculateCompletionScore } = require('./profileController');

// Helper to stream upload file buffer to Cloudinary
const uploadStreamToCloudinary = (fileBuffer, originalName) => {
  return new Promise((resolve, reject) => {
    const ext = path.extname(originalName);
    const base = path.basename(originalName, ext).replace(/[^a-zA-Z0-9]/g, '_');
    const publicId = `${Date.now()}_${base}`;

    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'raw', // needed for non-image files like pdf/docx
        folder: 'resumes',
        public_id: publicId
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    stream.end(fileBuffer);
  });
};

// Helper to save buffer to local uploads folder (fallback)
const saveFileLocally = (fileBuffer, originalName) => {
  const uploadDir = path.join(__dirname, '../uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const fileId = `${Date.now()}_${originalName.replace(/\s+/g, '_')}`;
  const filePath = path.join(uploadDir, fileId);
  fs.writeFileSync(filePath, fileBuffer);

  return {
    secure_url: `/uploads/${fileId}`,
    public_id: fileId
  };
};

// Helper to delete uploaded files (Cloudinary or local)
const deleteUploadedFile = async (publicId, isCloudinary) => {
  if (!publicId) return;

  if (isCloudinary && isCloudinaryConfigured) {
    try {
      await cloudinary.uploader.destroy(publicId, { resource_type: 'raw' });
      console.log(`Cloudinary file ${publicId} deleted successfully`);
    } catch (error) {
      console.error(`Error deleting Cloudinary file ${publicId}:`, error.message);
    }
  } else {
    try {
      const filePath = path.join(__dirname, '../uploads', publicId);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`Local file ${publicId} deleted successfully`);
      }
    } catch (error) {
      console.error(`Error deleting local file ${publicId}:`, error.message);
    }
  }
};

// @desc    Upload and parse resume file
// @route   POST /api/resume/upload
// @access  Private
exports.uploadResume = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload a PDF or DOCX file' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Delete existing resume if any
    if (user.resumeId) {
      const oldResume = await Resume.findById(user.resumeId);
      if (oldResume) {
        const isCloudy = oldResume.cloudinaryId && !oldResume.cloudinaryId.startsWith('178'); // Check if it was Cloudinary
        await deleteUploadedFile(oldResume.cloudinaryId, isCloudy);
        await ResumeData.deleteOne({ resume: oldResume._id });
        await Resume.deleteOne({ _id: oldResume._id });
      }
    }

    let fileUrl = '';
    let cloudinaryId = '';
    let isCloudy = false;

    // Upload to Cloudinary (or local storage fallback)
    if (isCloudinaryConfigured) {
      const uploadResult = await uploadStreamToCloudinary(req.file.buffer, req.file.originalname);
      fileUrl = uploadResult.secure_url;
      cloudinaryId = uploadResult.public_id;
      isCloudy = true;
    } else {
      const localResult = saveFileLocally(req.file.buffer, req.file.originalname);
      fileUrl = localResult.secure_url;
      cloudinaryId = localResult.public_id;
    }

    // Extract text and call parser engine while measuring processing time
    const startParseTime = Date.now();
    const extractedText = await extractText(req.file.buffer, req.file.mimetype);

    // Call parser engine (Gemini API with Regex fallback)
    const structuredData = await parseStructuredData(extractedText);
    const endParseTime = Date.now();
    const processingTimeSec = parseFloat(((endParseTime - startParseTime) / 1000).toFixed(1));

    const apiKey = process.env.GEMINI_API_KEY;
    const parserUsed = apiKey ? 'Gemini AI' : 'Regex Heuristic';
    const parsingStatus = 'Success';

    // Create Resume Entry
    const resume = await Resume.create({
      user: user._id,
      fileName: req.file.originalname,
      fileUrl: fileUrl,
      cloudinaryId: cloudinaryId,
      fileType: path.extname(req.file.originalname).substring(1).toLowerCase(),
      extractedText: extractedText,
      parserUsed,
      parsingStatus,
      processingTimeSec
    });

    // Create or Update ResumeData Entry referencing Resume & User
    let resumeData = await ResumeData.findOne({ user: user._id });
    if (resumeData) {
      Object.assign(resumeData, {
        resume: resume._id,
        ...structuredData
      });
      await resumeData.save();
    } else {
      resumeData = await ResumeData.create({
        user: user._id,
        resume: resume._id,
        ...structuredData
      });
    }

    // Link ResumeData back to Resume
    resume.extractedData = resumeData._id;
    await resume.save();

    // Link Resume to User and recalculate completion score
    user.resumeId = resume._id;
    
    // Sync personal info from parsed resume to user profile if empty
    if (!user.fullName && structuredData.personalInformation?.name) {
      user.fullName = structuredData.personalInformation.name;
    }
    if (!user.phone && structuredData.personalInformation?.phone) {
      user.phone = structuredData.personalInformation.phone;
    }
    if (!user.bio && structuredData.personalInformation?.bio) {
      user.bio = structuredData.personalInformation.bio;
    }
    if (user.skills.length === 0 && structuredData.technicalSkills?.length > 0) {
      user.skills = structuredData.technicalSkills;
    }
    if (user.frameworks.length === 0 && structuredData.frameworks?.length > 0) {
      user.frameworks = structuredData.frameworks;
    }
    if (user.databases.length === 0 && structuredData.databases?.length > 0) {
      user.databases = structuredData.databases;
    }
    if (user.tools.length === 0 && structuredData.tools?.length > 0) {
      user.tools = structuredData.tools;
    }
    if (user.softSkills.length === 0 && structuredData.softSkills?.length > 0) {
      user.softSkills = structuredData.softSkills;
    }

    const score = calculateCompletionScore(user, resumeData);
    user.profileCompletion = score;
    user.isProfileCompleted = score === 100;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Resume uploaded and parsed successfully',
      resume,
      resumeData,
      user
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user's resume metadata
// @route   GET /api/resume
// @access  Private
exports.getResume = async (req, res, next) => {
  try {
    if (!req.user.resumeId) {
      return res.status(200).json({ success: true, resume: null });
    }

    const resume = await Resume.findById(req.user.resumeId).populate('extractedData');
    res.status(200).json({
      success: true,
      resume
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get structured resume data
// @route   GET /api/resume/data
// @access  Private
exports.getResumeData = async (req, res, next) => {
  try {
    let resumeData = await ResumeData.findOne({ user: req.user._id });
    if (!resumeData) {
      // Return empty portfolio skeleton if none exists yet
      resumeData = {
        user: req.user._id,
        personalInformation: {
          name: req.user.fullName || req.user.name || '',
          email: req.user.email || '',
          phone: req.user.phone || '',
          bio: req.user.bio || ''
        },
        education: [],
        experience: [],
        projects: [],
        technicalSkills: [],
        softSkills: []
      };
    }

    res.status(200).json({
      success: true,
      resumeData
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update structured resume data
// @route   PUT /api/resume/data
// @access  Private
// @desc    Update structured resume data
exports.updateResumeData = async (req, res, next) => {
  try {
    let resumeData = await ResumeData.findOne({ user: req.user._id });
    if (!resumeData) {
      resumeData = new ResumeData({ user: req.user._id });
    }

    // Update fields from req.body
    const fields = [
      'personalInformation',
      'education',
      'experience',
      'projects',
      'certifications',
      'achievements',
      'technicalSkills',
      'softSkills',
      'programmingLanguages',
      'frameworks',
      'databases',
      'tools',
      'interests'
    ];

    fields.forEach(field => {
      if (req.body[field] !== undefined) {
        resumeData[field] = req.body[field];
      }
    });

    await resumeData.save();

    // Sync skills with user profile on save
    const user = await User.findById(req.user._id);
    if (user) {
      if (resumeData.technicalSkills?.length > 0) user.skills = resumeData.technicalSkills;
      if (resumeData.frameworks?.length > 0) user.frameworks = resumeData.frameworks;
      if (resumeData.databases?.length > 0) user.databases = resumeData.databases;
      if (resumeData.tools?.length > 0) user.tools = resumeData.tools;
      if (resumeData.softSkills?.length > 0) user.softSkills = resumeData.softSkills;

      const score = calculateCompletionScore(user, resumeData);
      user.profileCompletion = score;
      user.isProfileCompleted = score === 100;
      await user.save();
    }

    res.status(200).json({
      success: true,
      message: 'Extracted information updated successfully',
      resumeData
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete user's resume and structured data
// @route   DELETE /api/resume
// @access  Private
exports.deleteResume = async (req, res, next) => {
  try {
    if (!req.user.resumeId) {
      return res.status(400).json({ success: false, message: 'No resume found to delete' });
    }

    const resume = await Resume.findById(req.user.resumeId);
    if (!resume) {
      return res.status(404).json({ success: false, message: 'Resume not found' });
    }

    // Delete file from storage (Cloudinary or local)
    const isCloudy = resume.cloudinaryId && !resume.cloudinaryId.startsWith('178');
    await deleteUploadedFile(resume.cloudinaryId, isCloudy);

    // Decouple ResumeData: unset resume file reference but preserve structured data
    await ResumeData.updateOne({ user: req.user._id }, { $unset: { resume: "" } });
    await Resume.deleteOne({ _id: resume._id });

    // Update User reference
    const user = await User.findById(req.user._id);
    user.resumeId = undefined;

    // Recalculate completion score
    const resumeData = await ResumeData.findOne({ user: user._id });
    const score = calculateCompletionScore(user, resumeData);
    user.profileCompletion = score;
    user.isProfileCompleted = score === 100;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Resume deleted successfully',
      user
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Preview Resume Details / Serve File
// @route   GET /api/resume/preview
// @access  Private
exports.previewResume = async (req, res, next) => {
  try {
    if (!req.user.resumeId) {
      return res.status(404).json({ success: false, message: 'No resume found for this user' });
    }

    const resume = await Resume.findById(req.user.resumeId);
    if (!resume) {
      return res.status(404).json({ success: false, message: 'Resume not found' });
    }

    // Redirect to the file URL or return JSON
    res.status(200).json({
      success: true,
      fileUrl: resume.fileUrl,
      fileName: resume.fileName,
      fileType: resume.fileType,
      uploadDate: resume.uploadDate
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Generate comprehensive AI Resume Review (Better Wording, Missing Keywords, ATS, Projects)
// @route   POST /api/resume/review
// @access  Private
exports.generateResumeReview = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    let resume = null;
    if (user.resumeId) {
      resume = await Resume.findById(user.resumeId);
    }

    const resumeData = await ResumeData.findOne({ user: user._id });
    if (!resume && !resumeData) {
      return res.status(400).json({
        success: false,
        message: 'No resume or structured profile data found. Please upload a resume first.'
      });
    }

    const targetRole = req.body.targetRole || user.targetRole || 'Software Engineer';
    const targetCompany = req.body.targetCompany || 'General Tech';

    console.log(`[Resume Review Controller] Initiating AI review for user ${user._id} (Role: ${targetRole}, Company: ${targetCompany})...`);

    const rawText = resume?.extractedText || '';
    const reviewResult = await aiService.reviewResume({
      rawText,
      resumeData,
      targetRole,
      targetCompany
    });

    // Save review snapshot in MongoDB
    const review = await ResumeReview.create({
      user: user._id,
      resume: resume?._id,
      targetRole: reviewResult.targetRole || targetRole,
      targetCompany: reviewResult.targetCompany || targetCompany,
      overallScore: reviewResult.overallScore || 75,
      atsScore: reviewResult.atsScore || 75,
      wordingScore: reviewResult.wordingScore || 70,
      skillsScore: reviewResult.skillsScore || 75,
      projectScore: reviewResult.projectScore || 70,
      readabilityScore: reviewResult.readabilityScore || 80,
      executiveSummary: reviewResult.executiveSummary || '',
      hiringVerdict: reviewResult.hiringVerdict || 'Good Foundation - Needs Targeted Polish',
      topQuickWins: reviewResult.topQuickWins || [],
      atsAnalysis: reviewResult.atsAnalysis || {},
      keywordsAnalysis: reviewResult.keywordsAnalysis || {},
      wordingSuggestions: reviewResult.wordingSuggestions || [],
      projectEnhancements: reviewResult.projectEnhancements || [],
      analysisEngine: reviewResult.analysisEngine || 'Gemini AI'
    });

    res.status(200).json({
      success: true,
      message: 'AI Resume Review completed successfully',
      review
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user's latest AI Resume Review
// @route   GET /api/resume/review/latest
// @access  Private
exports.getLatestResumeReview = async (req, res, next) => {
  try {
    const review = await ResumeReview.findOne({ user: req.user._id }).sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      review: review || null
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user's AI Resume Review history
// @route   GET /api/resume/review/history
// @access  Private
exports.getResumeReviewHistory = async (req, res, next) => {
  try {
    const reviews = await ResumeReview.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(10);
    res.status(200).json({
      success: true,
      count: reviews.length,
      reviews
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Quick upload resume and immediately run AI Review in one step
// @route   POST /api/resume/review/quick-upload
// @access  Private
exports.quickUploadAndReview = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload a PDF or DOCX file' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Delete existing resume file if any
    if (user.resumeId) {
      const oldResume = await Resume.findById(user.resumeId);
      if (oldResume) {
        const isCloudy = oldResume.cloudinaryId && !oldResume.cloudinaryId.startsWith('178');
        await deleteUploadedFile(oldResume.cloudinaryId, isCloudy);
        await ResumeData.deleteOne({ resume: oldResume._id });
        await Resume.deleteOne({ _id: oldResume._id });
      }
    }

    let fileUrl = '';
    let cloudinaryId = '';
    let isCloudy = false;

    if (isCloudinaryConfigured) {
      const uploadResult = await uploadStreamToCloudinary(req.file.buffer, req.file.originalname);
      fileUrl = uploadResult.secure_url;
      cloudinaryId = uploadResult.public_id;
      isCloudy = true;
    } else {
      const localResult = saveFileLocally(req.file.buffer, req.file.originalname);
      fileUrl = localResult.secure_url;
      cloudinaryId = localResult.public_id;
    }

    const startParseTime = Date.now();
    const extractedText = await extractText(req.file.buffer, req.file.mimetype);
    const structuredData = await parseStructuredData(extractedText);
    const endParseTime = Date.now();
    const processingTimeSec = parseFloat(((endParseTime - startParseTime) / 1000).toFixed(1));

    const resume = await Resume.create({
      user: user._id,
      fileName: req.file.originalname,
      fileUrl: fileUrl,
      cloudinaryId: cloudinaryId,
      fileType: path.extname(req.file.originalname).substring(1).toLowerCase(),
      extractedText: extractedText,
      parserUsed: 'Gemini AI',
      parsingStatus: 'Success',
      processingTimeSec
    });

    let resumeData = await ResumeData.findOne({ user: user._id });
    if (resumeData) {
      Object.assign(resumeData, {
        resume: resume._id,
        ...structuredData
      });
      await resumeData.save();
    } else {
      resumeData = await ResumeData.create({
        user: user._id,
        resume: resume._id,
        ...structuredData
      });
    }

    resume.extractedData = resumeData._id;
    await resume.save();

    user.resumeId = resume._id;
    const score = calculateCompletionScore(user, resumeData);
    user.profileCompletion = score;
    user.isProfileCompleted = score === 100;
    await user.save();

    // Now run AI Review directly
    const targetRole = req.body.targetRole || user.targetRole || 'Software Engineer';
    const targetCompany = req.body.targetCompany || 'General Tech';

    const reviewResult = await aiService.reviewResume({
      rawText: extractedText,
      resumeData,
      targetRole,
      targetCompany
    });

    const review = await ResumeReview.create({
      user: user._id,
      resume: resume._id,
      targetRole: reviewResult.targetRole || targetRole,
      targetCompany: reviewResult.targetCompany || targetCompany,
      overallScore: reviewResult.overallScore || 75,
      atsScore: reviewResult.atsScore || 75,
      wordingScore: reviewResult.wordingScore || 70,
      skillsScore: reviewResult.skillsScore || 75,
      projectScore: reviewResult.projectScore || 70,
      readabilityScore: reviewResult.readabilityScore || 80,
      executiveSummary: reviewResult.executiveSummary || '',
      hiringVerdict: reviewResult.hiringVerdict || 'Good Foundation - Needs Targeted Polish',
      topQuickWins: reviewResult.topQuickWins || [],
      atsAnalysis: reviewResult.atsAnalysis || {},
      keywordsAnalysis: reviewResult.keywordsAnalysis || {},
      wordingSuggestions: reviewResult.wordingSuggestions || [],
      projectEnhancements: reviewResult.projectEnhancements || [],
      analysisEngine: reviewResult.analysisEngine || 'Gemini AI'
    });

    res.status(200).json({
      success: true,
      message: 'Resume uploaded and analyzed with AI successfully',
      resume,
      resumeData,
      review
    });
  } catch (error) {
    next(error);
  }
};

// @desc    1-Click sync missing keywords to ResumeData and User profile
// @route   POST /api/resume/review/sync-keywords
// @access  Private
exports.syncMissingKeywords = async (req, res, next) => {
  try {
    const { keywords } = req.body;
    if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
      return res.status(400).json({ success: false, message: 'Please provide an array of keywords to sync' });
    }

    let resumeData = await ResumeData.findOne({ user: req.user._id });
    if (!resumeData) {
      resumeData = new ResumeData({ user: req.user._id, technicalSkills: [] });
    }

    const currentSkills = resumeData.technicalSkills || [];
    const newSkills = [...currentSkills];

    keywords.forEach(kw => {
      const cleanKw = String(kw).trim();
      if (cleanKw && !newSkills.some(s => s.toLowerCase() === cleanKw.toLowerCase())) {
        newSkills.push(cleanKw);
      }
    });

    resumeData.technicalSkills = newSkills;
    await resumeData.save();

    const user = await User.findById(req.user._id);
    if (user) {
      user.skills = newSkills;
      const score = calculateCompletionScore(user, resumeData);
      user.profileCompletion = score;
      user.isProfileCompleted = score === 100;
      await user.save();
    }

    res.status(200).json({
      success: true,
      message: `Successfully added ${keywords.length} keywords to your technical profile`,
      technicalSkills: newSkills,
      profileCompletion: user?.profileCompletion || 100
    });
  } catch (error) {
    next(error);
  }
};

// @desc    1-Click apply enhanced project description to ResumeData
// @route   POST /api/resume/review/apply-project
// @access  Private
exports.applyProjectEnhancement = async (req, res, next) => {
  try {
    const { projectIndex, title, enhancedDescription, technologies } = req.body;

    let resumeData = await ResumeData.findOne({ user: req.user._id });
    if (!resumeData) {
      return res.status(404).json({ success: false, message: 'Resume structured data not found' });
    }

    if (!resumeData.projects || resumeData.projects.length === 0) {
      // Add as first project
      resumeData.projects = [{
        title: title || 'Full Stack Project',
        description: enhancedDescription,
        technologies: technologies || []
      }];
    } else {
      const idx = (projectIndex !== undefined && projectIndex >= 0 && projectIndex < resumeData.projects.length) ? projectIndex : 0;
      if (title) resumeData.projects[idx].title = title;
      if (enhancedDescription) resumeData.projects[idx].description = enhancedDescription;
      if (technologies && technologies.length > 0) {
        const mergedTech = Array.from(new Set([...(resumeData.projects[idx].technologies || []), ...technologies]));
        resumeData.projects[idx].technologies = mergedTech;
      }
    }

    await resumeData.save();

    res.status(200).json({
      success: true,
      message: 'Project description updated with AI enhancement successfully',
      projects: resumeData.projects
    });
  } catch (error) {
    next(error);
  }
};

