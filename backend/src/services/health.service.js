import { checkDatabaseConnection } from '../repositories/health.repository.js';

export async function getHealthStatus() {
  const dbStatus = await checkDatabaseConnection();

  return {
    status: dbStatus.connected ? 'ok' : 'degraded',
    service: 'mednotes-backend',
    timestamp: new Date().toISOString(),
    database: dbStatus.connected ? 'connected' : 'disconnected',
    ...(dbStatus.error && { databaseError: dbStatus.error }),
  };
}
