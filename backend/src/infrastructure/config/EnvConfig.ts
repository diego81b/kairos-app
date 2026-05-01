export const EnvConfig = () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  api: {
    port: parseInt(process.env.API_PORT || '3001', 10),
    host: process.env.API_HOST || '0.0.0.0',
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  },
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    name: process.env.DB_NAME || 'kairos_dev',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshExpiresDays: parseInt(process.env.JWT_REFRESH_EXPIRES_DAYS || '7', 10),
  },
  encryption: {
    key: process.env.ENCRYPTION_KEY || '0000000000000000000000000000000000000000000000000000000000000000',
  },
  plugins: {
    // Absolute path to the directory containing local plugin packages.
    // Each sub-directory must have a kairos-plugin.json manifest.
    // Leave empty to disable local plugin discovery.
    localPath: process.env.PLUGIN_LOCAL_PATH || '',
  },
})

export type AppConfig = ReturnType<typeof EnvConfig>
