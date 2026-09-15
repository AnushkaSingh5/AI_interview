const CoverLetter = require('../models/CoverLetter');
const ResumeData = require('../models/ResumeData');
const User = require('../models/User');
const { generateCoverLetter, refineCoverLetter } = require('../services/ai/coverLetterGenerator');

/**
 * @route   POST /api/cover-letter/generate
 * @desc    Generate a tailored cover letter using Gemini AI
 * @access  Private
 */
exports.generate = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const {
      jobTitle,
      companyName,
      jobDescription,
      hiringManager,
      tone = 'Professional',
      length = 'Standard',
      customInstructions,
      focusPoints = []
    } = req.body;

    if (!jobTitle || !companyName) {
      return res.status(400).json({
        success: false,
        message: 'Job title and company name are required.'
      });
    }

    const user = await User.findById(userId);
    const resumeData = await ResumeData.findOne({ user: userId });

    const aiResult = await generateCoverLetter({
      resumeData,
      user,
      jobTitle: jobTitle.trim(),
      companyName: companyName.trim(),
      jobDescription: (jobDescription || '').trim(),
      hiringManager: (hiringManager || 'Hiring Manager').trim(),
      tone,
      length,
      customInstructions: (customInstructions || '').trim(),
      focusPoints
    });

    return res.status(200).json({
      success: true,
      message: 'Cover letter generated successfully!',
      data: {
        letterContent: aiResult.letterContent,
        matchScore: aiResult.matchScore || 85,
        matchedKeywords: aiResult.matchedKeywords || [],
        missingKeywords: aiResult.missingKeywords || [],
        keyStrengths: aiResult.keyStrengths || [],
        companyName: companyName.trim(),
        jobTitle: jobTitle.trim(),
        tone,
        length
      }
    });
  } catch (error) {
    console.error('[CoverLetterController] Generation error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to generate cover letter with AI.',
      error: error.message
    });
  }
};

/**
 * @route   POST /api/cover-letter/refine
 * @desc    Refine or polish existing cover letter text
 * @access  Private
 */
exports.refine = async (req, res) => {
  try {
    const { existingContent, instruction, tone = 'Professional' } = req.body;

    if (!existingContent || !instruction) {
      return res.status(400).json({
        success: false,
        message: 'Existing cover letter content and refinement instruction are required.'
      });
    }

    const refineResult = await refineCoverLetter({
      existingContent,
      instruction,
      tone
    });

    return res.status(200).json({
      success: true,
      message: 'Cover letter refined successfully!',
      refinedContent: refineResult.refinedContent,
      changeSummary: refineResult.changeSummary || 'Refined based on instruction'
    });
  } catch (error) {
    console.error('[CoverLetterController] Refine error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to refine cover letter.',
      error: error.message
    });
  }
};

/**
 * @route   GET /api/cover-letter
 * @desc    Get user's saved cover letters
 * @access  Private
 */
exports.getCoverLetters = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const coverLetters = await CoverLetter.find({ user: userId }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: coverLetters.length,
      coverLetters
    });
  } catch (error) {
    console.error('[CoverLetterController] Fetch error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve cover letters.',
      error: error.message
    });
  }
};

/**
 * @route   GET /api/cover-letter/:id
 * @desc    Get single cover letter
 * @access  Private
 */
exports.getCoverLetterById = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const coverLetter = await CoverLetter.findOne({ _id: req.params.id, user: userId });

    if (!coverLetter) {
      return res.status(404).json({
        success: false,
        message: 'Cover letter not found.'
      });
    }

    return res.status(200).json({
      success: true,
      coverLetter
    });
  } catch (error) {
    console.error('[CoverLetterController] Fetch by ID error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve cover letter.',
      error: error.message
    });
  }
};

/**
 * @route   POST /api/cover-letter
 * @desc    Save a new cover letter
 * @access  Private
 */
exports.createCoverLetter = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const {
      title,
      companyName,
      jobTitle,
      jobDescription,
      hiringManager,
      tone,
      length,
      content,
      matchScore,
      matchedKeywords,
      missingKeywords,
      keyStrengths,
      customNotes
    } = req.body;

    if (!content) {
      return res.status(400).json({
        success: false,
        message: 'Cover letter content is required.'
      });
    }

    const finalTitle = title || `${companyName || 'Custom'} - ${jobTitle || 'Application'}`;

    const newLetter = new CoverLetter({
      user: userId,
      title: finalTitle.trim(),
      companyName: companyName ? companyName.trim() : '',
      jobTitle: jobTitle ? jobTitle.trim() : '',
      jobDescription: jobDescription || '',
      hiringManager: hiringManager || 'Hiring Manager',
      tone: tone || 'Professional',
      length: length || 'Standard',
      content: content.trim(),
      matchScore: Number(matchScore) || 85,
      matchedKeywords: Array.isArray(matchedKeywords) ? matchedKeywords : [],
      missingKeywords: Array.isArray(missingKeywords) ? missingKeywords : [],
      keyStrengths: Array.isArray(keyStrengths) ? keyStrengths : [],
      customNotes: customNotes || ''
    });

    await newLetter.save();

    return res.status(201).json({
      success: true,
      message: 'Cover letter saved successfully!',
      coverLetter: newLetter
    });
  } catch (error) {
    console.error('[CoverLetterController] Save error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to save cover letter.',
      error: error.message
    });
  }
};

/**
 * @route   PUT /api/cover-letter/:id
 * @desc    Update an existing cover letter
 * @access  Private
 */
exports.updateCoverLetter = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const letter = await CoverLetter.findOne({ _id: req.params.id, user: userId });

    if (!letter) {
      return res.status(404).json({
        success: false,
        message: 'Cover letter not found.'
      });
    }

    const {
      title,
      companyName,
      jobTitle,
      content,
      tone,
      length,
      customNotes,
      isFavorite
    } = req.body;

    if (title !== undefined) letter.title = title.trim();
    if (companyName !== undefined) letter.companyName = companyName.trim();
    if (jobTitle !== undefined) letter.jobTitle = jobTitle.trim();
    if (content !== undefined) letter.content = content.trim();
    if (tone !== undefined) letter.tone = tone;
    if (length !== undefined) letter.length = length;
    if (customNotes !== undefined) letter.customNotes = customNotes.trim();
    if (isFavorite !== undefined) letter.isFavorite = Boolean(isFavorite);

    await letter.save();

    return res.status(200).json({
      success: true,
      message: 'Cover letter updated successfully!',
      coverLetter: letter
    });
  } catch (error) {
    console.error('[CoverLetterController] Update error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update cover letter.',
      error: error.message
    });
  }
};

/**
 * @route   DELETE /api/cover-letter/:id
 * @desc    Delete a cover letter
 * @access  Private
 */
exports.deleteCoverLetter = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const result = await CoverLetter.findOneAndDelete({ _id: req.params.id, user: userId });

    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Cover letter not found.'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Cover letter deleted successfully.'
    });
  } catch (error) {
    console.error('[CoverLetterController] Delete error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete cover letter.',
      error: error.message
    });
  }
};
