import express from 'express';
import cors from 'cors';
import path from 'path';
import { config } from './config';
import { connectDatabase } from './config/database';
import { errorHandler } from './middleware/errorHandler';
import logger from './utils/logger';

// Routes
import authRoutes from './routes/auth';
import projectRoutes from './routes/projects';
import siteRoutes from './routes/sites';
import runRoutes from './routes/runs';
import issueRoutes from './routes/issues';
import baselineRoutes from './routes/baselines';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files (screenshots)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use('/screenshots', express.static(path.join(__dirname, '../uploads/screenshots')));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/sites', siteRoutes);
app.use('/api/runs', runRoutes);
app.use('/api/issues', issueRoutes);
app.use('/api', baselineRoutes);

// Error handler
app.use(errorHandler);

// Connect to database and start server
const PORT = config.port;

connectDatabase().then(() => {
  app.listen(PORT, () => {
    logger.info(`🚀 Server running on port ${PORT}`);
    logger.info(`Environment: ${config.nodeEnv}`);
    logger.info(`Health check: http://localhost:${PORT}/health`);
  });
}).catch((error) => {
  logger.error('Failed to connect to database:', error);
  process.exit(1);
});

export default app;
