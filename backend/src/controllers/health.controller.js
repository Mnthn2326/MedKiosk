import { getHealthStatus } from '../services/health.service.js';

export async function healthCheck(req, res, next) {
  try {
    const health = await getHealthStatus();
    const statusCode = health.status === 'ok' ? 200 : 503;
    res.status(statusCode).json(health);
  } catch (error) {
    next(error);
  }
}
