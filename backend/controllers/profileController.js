const User = require('../models/User');
const ResumeData = require('../models/ResumeData');

// Helper to calculate profile completion score (0 to 100)
const calculateCompletionScore = (user, resumeData) => {
  let completedCount = 0;
  
  const isPersonalDone = !!(user?.fullName || user?.name);
  const isContactDone = !!(user?.phone && user.phone.trim().length > 0);
  const isBioDone = !!(user?.bio && user.bio.trim().length > 0);
  const isExpLevelDone = !!(user?.experienceLevel && user.experienceLevel.trim().length > 0);
  const isTargetRoleDone = !!(user?.targetRole && user.targetRole.trim().length > 0);
  const isTargetCompanyDone = !!(user?.targetCompany && user.targetCompany.trim().length > 0);
  const isPrefLangDone = !!(user?.preferredLanguage && user.preferredLanguage.trim().length > 0);
  const isResumeDone = !!user?.resumeId;
  const isEducationDone = !!(resumeData?.education && resumeData.education.length > 0);
  const isExperienceDone = !!(resumeData?.experience && resumeData.experience.length > 0);
  const isSkillsDone = !!(
    (user?.skills && user.skills.length > 0) ||
    (user?.frameworks && user.frameworks.length > 0) ||
    (user?.databases && user.databases.length > 0) ||
    (user?.tools && user.tools.length > 0) ||
    (user?.softSkills && user.softSkills.length > 0) ||
    (resumeData?.technicalSkills && resumeData.technicalSkills.length > 0) ||
    (resumeData?.programmingLanguages && resumeData.programmingLanguages.length > 0) ||
    (resumeData?.frameworks && resumeData.frameworks.length > 0) ||
    (resumeData?.databases && resumeData.databases.length > 0) ||
    (resumeData?.tools && resumeData.tools.length > 0)
  );
  const isProjectsDone = !!(resumeData?.projects && resumeData.projects.length > 0);

  if (isPersonalDone) completedCount++;
  if (isContactDone) completedCount++;
  if (isBioDone) completedCount++;
  if (isExpLevelDone) completedCount++;
  if (isTargetRoleDone) completedCount++;
  if (isTargetCompanyDone) completedCount++;
  if (isPrefLangDone) completedCount++;
  if (isResumeDone) completedCount++;
  if (isEducationDone) completedCount++;
  if (isExperienceDone) completedCount++;
  if (isSkillsDone) completedCount++;
  if (isProjectsDone) completedCount++;

  return Math.round((completedCount / 12) * 100);
};

// @desc    Get user profile details
// @route   GET /api/users/profile
// @access  Private
exports.getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).populate('resumeId');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Recalculate completion score to ensure database value is in sync on query load
    const resumeData = await ResumeData.findOne({ user: user._id });
    const currentScore = calculateCompletionScore(user, resumeData);
    
    if (user.profileCompletion !== currentScore) {
      user.profileCompletion = currentScore;
      user.isProfileCompleted = currentScore === 100;
      await user.save();
    }

    res.status(200).json({
      success: true,
      user
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user profile details
// @route   PUT /api/users/profile
// @access  Private
exports.updateProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const fieldsToUpdate = [
      'fullName',
      'name',
      'phone',
      'bio',
      'experienceLevel',
      'targetRole',
      'targetCompany',
      'preferredLanguage',
      'preferredDifficulty',
      'skills',
      'frameworks',
      'databases',
      'tools',
      'softSkills'
    ];

    // Update keys
    fieldsToUpdate.forEach((field) => {
      if (req.body[field] !== undefined) {
        user[field] = req.body[field];
      }
    });

    // Fetch user's ResumeData if exists to accurately calculate completion score
    const resumeData = await ResumeData.findOne({ user: user._id });

    // Recalculate completion metrics
    const score = calculateCompletionScore(user, resumeData);
    user.profileCompletion = score;
    user.isProfileCompleted = score === 100;

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user
    });
  } catch (error) {
    next(error);
  }
};

module.exports.calculateCompletionScore = calculateCompletionScore;
