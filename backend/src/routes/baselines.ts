import express, { Request, Response } from 'express';
import { body, param, query } from 'express-validator';
import { isMongoId } from 'validator';
import { VisualBaseline } from '../models';
import { VisualRegressionTester } from '../services/visualRegressionTester';
import { FigmaIntegration } from '../services/figmaIntegration';
import { authenticate, AuthRequest } from '../middleware/auth';
import multer from 'multer';
import path from 'path';
import { config } from '../config';

const router = express.Router();
const visualTester = new VisualRegressionTester();
const figmaIntegration = new FigmaIntegration();

// Configure multer for baseline image uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(config.upload.screenshotDir, 'manual-baselines');
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'baseline-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed'));
    }
    cb(null, true);
  }
});

// Get all baselines for a site
router.get('/sites/:siteId/baselines', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { siteId } = req.params;

    if (!isMongoId(siteId)) {
      return res.status(400).json({ error: 'Invalid site ID' });
    }

    const baselines = await VisualBaseline.find({ site_id: siteId })
      .sort({ created_at: -1 })
      .populate('created_by', 'email first_name last_name');

    const baselineList = baselines.map(b => ({
      id: b._id.toString(),
      site_id: b.site_id.toString(),
      page_url: b.page_url,
      baseline_type: b.baseline_type,
      screenshot_path: b.screenshot_path,
      figma_file_key: b.figma_file_key,
      figma_node_id: b.figma_node_id,
      viewport_width: b.viewport_width,
      viewport_height: b.viewport_height,
      is_active: b.is_active,
      created_by: b.created_by,
      created_at: b.created_at,
      updated_at: b.updated_at,
    }));

    res.json(baselineList);
  } catch (error: any) {
    console.error('Failed to get baselines:', error);
    res.status(500).json({ error: 'Failed to get baselines' });
  }
});

// Create baseline from screenshot (auto-generated during test run)
router.post('/baselines/screenshot',
  authenticate,
  [
    body('site_id').notEmpty().custom(isMongoId),
    body('page_url').isURL(),
    body('screenshot_path').notEmpty(),
    body('viewport_width').isInt({ min: 1 }),
    body('viewport_height').isInt({ min: 1 }),
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const { site_id, page_url, screenshot_path, viewport_width, viewport_height } = req.body;

      const baseline = await visualTester.createBaseline({
        siteId: site_id,
        pageUrl: page_url,
        screenshotPath: screenshot_path,
        baselineType: 'screenshot',
        viewportWidth: viewport_width,
        viewportHeight: viewport_height,
        createdBy: (req as any).user.userId,
      });

      res.status(201).json({
        id: baseline._id.toString(),
        site_id: baseline.site_id.toString(),
        page_url: baseline.page_url,
        baseline_type: baseline.baseline_type,
        screenshot_path: baseline.screenshot_path,
        viewport_width: baseline.viewport_width,
        viewport_height: baseline.viewport_height,
        is_active: baseline.is_active,
        created_at: baseline.created_at,
      });
    } catch (error: any) {
      console.error('Failed to create baseline:', error);
      res.status(500).json({ error: 'Failed to create baseline' });
    }
  }
);

// Upload manual baseline image
router.post('/baselines/manual',
  authenticate,
  upload.single('image'),
  [
    body('site_id').notEmpty().custom(isMongoId),
    body('page_url').isURL(),
    body('viewport_width').isInt({ min: 1 }),
    body('viewport_height').isInt({ min: 1 }),
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No image file uploaded' });
      }

      const { site_id, page_url, viewport_width, viewport_height } = req.body;

      const baseline = await visualTester.createBaseline({
        siteId: site_id,
        pageUrl: page_url,
        screenshotPath: req.file.path,
        baselineType: 'manual',
        viewportWidth: parseInt(viewport_width),
        viewportHeight: parseInt(viewport_height),
        createdBy: (req as any).user.userId,
      });

      res.status(201).json({
        id: baseline._id.toString(),
        site_id: baseline.site_id.toString(),
        page_url: baseline.page_url,
        baseline_type: baseline.baseline_type,
        screenshot_path: baseline.screenshot_path,
        viewport_width: baseline.viewport_width,
        viewport_height: baseline.viewport_height,
        is_active: baseline.is_active,
        created_at: baseline.created_at,
      });
    } catch (error: any) {
      console.error('Failed to upload baseline:', error);
      res.status(500).json({ error: 'Failed to upload baseline' });
    }
  }
);

// Create baseline from Figma
router.post('/baselines/figma',
  authenticate,
  [
    body('site_id').notEmpty().custom(isMongoId),
    body('page_url').isURL(),
    body('figma_file_key').notEmpty(),
    body('figma_node_id').notEmpty(),
    body('figma_access_token').notEmpty(),
    body('viewport_width').isInt({ min: 1 }),
    body('viewport_height').isInt({ min: 1 }),
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const {
        site_id,
        page_url,
        figma_file_key,
        figma_node_id,
        figma_access_token,
        viewport_width,
        viewport_height,
      } = req.body;

      const baseline = await figmaIntegration.createFigmaBaseline({
        siteId: site_id,
        pageUrl: page_url,
        figmaFileKey: figma_file_key,
        figmaNodeId: figma_node_id,
        figmaAccessToken: figma_access_token,
        viewportWidth: viewport_width,
        viewportHeight: viewport_height,
        createdBy: (req as any).user.userId,
      });

      res.status(201).json({
        id: baseline._id.toString(),
        site_id: baseline.site_id.toString(),
        page_url: baseline.page_url,
        baseline_type: baseline.baseline_type,
        figma_file_key: baseline.figma_file_key,
        figma_node_id: baseline.figma_node_id,
        viewport_width: baseline.viewport_width,
        viewport_height: baseline.viewport_height,
        is_active: baseline.is_active,
        created_at: baseline.created_at,
      });
    } catch (error: any) {
      console.error('Failed to create Figma baseline:', error);
      res.status(500).json({ error: error.message || 'Failed to create Figma baseline' });
    }
  }
);

// List Figma frames
router.post('/figma/frames',
  authenticate,
  [
    body('figma_file_key').notEmpty(),
    body('figma_access_token').notEmpty(),
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const { figma_file_key, figma_access_token } = req.body;

      const frames = await figmaIntegration.listFigmaFrames(
        figma_file_key,
        figma_access_token
      );

      res.json(frames);
    } catch (error: any) {
      console.error('Failed to list Figma frames:', error);
      res.status(500).json({ error: error.message || 'Failed to list Figma frames' });
    }
  }
);

// Refresh Figma baseline
router.post('/baselines/:id/refresh',
  authenticate,
  [
    param('id').custom(isMongoId),
    body('figma_access_token').notEmpty(),
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { figma_access_token } = req.body;

      await figmaIntegration.refreshFigmaBaseline(id, figma_access_token);

      res.json({ message: 'Baseline refreshed successfully' });
    } catch (error: any) {
      console.error('Failed to refresh baseline:', error);
      res.status(500).json({ error: error.message || 'Failed to refresh baseline' });
    }
  }
);

// Deactivate baseline
router.patch('/baselines/:id/deactivate',
  authenticate,
  param('id').custom(isMongoId),
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;

      await visualTester.deactivateBaseline(id);

      res.json({ message: 'Baseline deactivated successfully' });
    } catch (error: any) {
      console.error('Failed to deactivate baseline:', error);
      res.status(500).json({ error: 'Failed to deactivate baseline' });
    }
  }
);

// Activate baseline
router.patch('/baselines/:id/activate',
  authenticate,
  param('id').custom(isMongoId),
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;

      await VisualBaseline.findByIdAndUpdate(id, { is_active: true });

      res.json({ message: 'Baseline activated successfully' });
    } catch (error: any) {
      console.error('Failed to activate baseline:', error);
      res.status(500).json({ error: 'Failed to activate baseline' });
    }
  }
);

// Delete baseline
router.delete('/baselines/:id',
  authenticate,
  param('id').custom(isMongoId),
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;

      await VisualBaseline.findByIdAndDelete(id);

      res.json({ message: 'Baseline deleted successfully' });
    } catch (error: any) {
      console.error('Failed to delete baseline:', error);
      res.status(500).json({ error: 'Failed to delete baseline' });
    }
  }
);

// Get visual diffs for a run
router.get('/runs/:runId/visual-diffs', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { runId } = req.params;

    if (!isMongoId(runId)) {
      return res.status(400).json({ error: 'Invalid run ID' });
    }

    const diffs = await visualTester.getVisualDiffsForRun(runId);

    const diffList = diffs.map(d => ({
      id: d._id.toString(),
      run_id: d.run_id.toString(),
      page_id: d.page_id.toString(),
      baseline_id: d.baseline_id.toString(),
      current_screenshot_path: d.current_screenshot_path,
      diff_screenshot_path: d.diff_screenshot_path,
      difference_percentage: d.difference_percentage,
      pixel_diff_count: d.pixel_diff_count,
      passed: d.passed,
      threshold_percentage: d.threshold_percentage,
      created_at: d.created_at,
      page: d.page_id,
      baseline: d.baseline_id,
    }));

    res.json(diffList);
  } catch (error: any) {
    console.error('Failed to get visual diffs:', error);
    res.status(500).json({ error: 'Failed to get visual diffs' });
  }
});

export default router;
