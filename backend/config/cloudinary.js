const cloudinary = require('cloudinary').v2;

let isCloudinaryConfigured = false;

if (
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
  isCloudinaryConfigured = true;
  console.log('Cloudinary service configured successfully');
} else {
  console.warn('WARNING: Cloudinary credentials missing. Resume storage will fall back to local folder storage.');
}

module.exports = {
  cloudinary,
  isCloudinaryConfigured
};
