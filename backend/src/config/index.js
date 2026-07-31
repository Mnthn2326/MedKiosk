import 'dotenv/config';

const config = {
  port: parseInt(process.env.PORT, 10) || 3001,
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL,
};

export default config;
