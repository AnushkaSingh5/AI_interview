const mongoose = require('mongoose');

const EducationSchema = new mongoose.Schema({
  institution: { type: String, default: '' },
  degree: { type: String, default: '' },
  fieldOfStudy: { type: String, default: '' },
  startDate: { type: String, default: '' },
  endDate: { type: String, default: '' },
  gpa: { type: String, default: '' }
}, { _id: false });

const ExperienceSchema = new mongoose.Schema({
  company: { type: String, default: '' },
  position: { type: String, default: '' },
  startDate: { type: String, default: '' },
  endDate: { type: String, default: '' },
  description: { type: String, default: '' }
}, { _id: false });

const ProjectSchema = new mongoose.Schema({
  title: { type: String, default: '' },
  description: { type: String, default: '' },
  technologies: { type: [String], default: [] }
}, { _id: false });

const ResumeDataSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    resume: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Resume'
    },
    personalInformation: {
      name: { type: String, default: '' },
      email: { type: String, default: '' },
      phone: { type: String, default: '' },
      bio: { type: String, default: '' }
    },
    education: {
      type: [EducationSchema],
      default: []
    },
    experience: {
      type: [ExperienceSchema],
      default: []
    },
    projects: {
      type: [ProjectSchema],
      default: []
    },
    certifications: {
      type: [String],
      default: []
    },
    achievements: {
      type: [String],
      default: []
    },
    technicalSkills: {
      type: [String],
      default: []
    },
    softSkills: {
      type: [String],
      default: []
    },
    programmingLanguages: {
      type: [String],
      default: []
    },
    frameworks: {
      type: [String],
      default: []
    },
    databases: {
      type: [String],
      default: []
    },
    tools: {
      type: [String],
      default: []
    },
    interests: {
      type: [String],
      default: []
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('ResumeData', ResumeDataSchema);
