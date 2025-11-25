import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  
  database: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/qa_automation',
  },
  
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  
  upload: {
    dir: process.env.UPLOAD_DIR || './uploads',
    screenshotDir: process.env.SCREENSHOT_DIR || './uploads/screenshots',
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10), // 10MB
  },
  
  crawler: {
    maxDepth: parseInt(process.env.MAX_CRAWL_DEPTH || '2', 10),
    maxPages: parseInt(process.env.MAX_PAGES_PER_RUN || '30', 10),
    viewport: {
      width: parseInt(process.env.VIEWPORT_WIDTH || '1440', 10),
      height: parseInt(process.env.VIEWPORT_HEIGHT || '900', 10),
    },
    pageTimeout: parseInt(process.env.PAGE_TIMEOUT || '30000', 10),
  },
};
