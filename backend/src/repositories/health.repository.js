import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function checkDatabaseConnection() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { connected: true };
  } catch (error) {
    return { connected: false, error: error.message };
  }
}

export { prisma };
