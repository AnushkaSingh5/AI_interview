let app;
let initError = null;

try {
  app = require('../server');
} catch (err) {
  initError = err;
  console.error('[Server Initialization Fatal Error]:', err);
}

module.exports = (req, res) => {
  if (initError) {
    return res.status(500).json({
      success: false,
      error: 'Backend Initialization Error',
      message: initError.message,
      stack: initError.stack
    });
  }
  return app(req, res);
};
