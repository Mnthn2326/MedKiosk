import config from './config/index.js';
import app from './app.js';
import logger from './utils/logger.js';

const PORT = config.port;

app.listen(PORT, () => {
  logger.info(`MedNotes backend running on port ${PORT}`);
  logger.info(`Environment: ${config.nodeEnv}`);
  logger.info(`Health check: http://localhost:${PORT}/api/v1/health`);
});
