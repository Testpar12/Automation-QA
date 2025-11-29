import { Router, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { Run, Site, User, Page, Issue } from '../models';
import { TestRunner } from '../services/testRunner';

const router = Router();

// Get runs for a site
router.get('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { site_id } = req.query;

    const filter: any = {};
    if (site_id && site_id !== 'undefined' && site_id !== 'null') {
      filter.site_id = site_id;
    }

    const runs = await Run.find(filter)
      .populate('triggered_by', 'first_name last_name')
      .populate('site_id', 'name')
      .sort({ started_at: -1 })
      .limit(50)
      .lean();

    const runsWithData = runs.map(run => {
      const triggeredBy = run.triggered_by as any;
      const site = run.site_id as any;
      return {
        ...run,
        id: run._id.toString(),
        site_id: site?._id?.toString() || run.site_id,
        triggered_by_name: triggeredBy ? `${triggeredBy.first_name} ${triggeredBy.last_name}` : null,
        site_name: site?.name || null
      };
    });

    res.json({ runs: runsWithData });
  } catch (error) {
    next(error);
  }
});

// Get single run
router.get('/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.params.id || req.params.id === 'undefined' || req.params.id === 'null') {
      return res.status(400).json({ error: 'Invalid run ID' });
    }

    const runDoc = await Run.findById(req.params.id)
      .populate('triggered_by', 'first_name last_name')
      .populate('site_id', 'name base_url')
      .lean();

    if (!runDoc) {
      return res.status(404).json({ error: 'Run not found' });
    }

    const triggeredBy = runDoc.triggered_by as any;
    const site = runDoc.site_id as any;

    const run = {
      ...runDoc,
      id: runDoc._id.toString(),
      site_id: site?._id?.toString() || runDoc.site_id,
      triggered_by_name: triggeredBy ? `${triggeredBy.first_name} ${triggeredBy.last_name}` : null,
      site_name: site?.name || null,
      base_url: site?.base_url || null
    };

    // Get pages for this run
    const pages = await Page.find({ run_id: req.params.id })
      .select('_id url status_code screenshot_url render_failed render_error')
      .sort({ created_at: 1 })
      .lean();

    const pagesWithId = pages.map(p => ({ ...p, id: p._id.toString() }));

    // Get issue summary (need to import Issue)
    const issueSummary = await Issue.aggregate([
      { $match: { run_id: req.params.id } },
      { $group: { _id: '$type', count: { $sum: 1 } } },
      { $project: { type: '$_id', count: 1, _id: 0 } }
    ]);

    res.json({ 
      run,
      pages: pagesWithId,
      issue_summary: issueSummary,
    });
  } catch (error) {
    next(error);
  }
});

// Start a new test run (qa and qa_lead)
router.post(
  '/',
  authenticate,
  authorize('qa', 'qa_lead'),
  [
    body('site_id').isMongoId().withMessage('Valid site ID is required'),
  ],
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { site_id } = req.body;

      // Verify site exists
      const site = await Site.findById(site_id).lean();

      if (!site) {
        return res.status(404).json({ error: 'Site not found' });
      }

      // Create run record
      const run = await Run.create({
        site_id,
        triggered_by: req.user!.id,
        status: 'Pending'
      });

      // Start test runner asynchronously
      const testRunner = new TestRunner();
      testRunner.executeRun(run._id.toString(), site).catch(err => {
        console.error('Test run failed:', err);
      });

      res.status(201).json({ 
        run: {
          ...run.toObject(),
          id: run._id.toString()
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// Start a custom test run with specific pages (qa and qa_lead)
router.post(
  '/custom',
  authenticate,
  authorize('qa', 'qa_lead'),
  [
    body('site_id').isMongoId().withMessage('Valid site ID is required'),
    body('custom_pages').isArray().withMessage('Custom pages must be an array'),
    body('custom_pages.*').notEmpty().withMessage('Page URLs cannot be empty'),
  ],
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { site_id, custom_pages } = req.body;

      // Verify site exists
      const site = await Site.findById(site_id).lean();

      if (!site) {
        return res.status(404).json({ error: 'Site not found' });
      }

      // Validate and normalize custom pages
      const normalizedPages = custom_pages.map((page: string) => {
        const trimmed = page.trim();
        
        // If it's a relative path, prepend the base URL
        if (trimmed.startsWith('/')) {
          return `${site.base_url.replace(/\/$/, '')}${trimmed}`;
        }
        
        // If it's already a full URL, use as-is
        if (trimmed.startsWith('http')) {
          return trimmed;
        }
        
        // Otherwise, assume it's a path and prepend base URL
        return `${site.base_url.replace(/\/$/, '')}/${trimmed}`;
      });

      // Create run record
      const run = await Run.create({
        site_id,
        triggered_by: req.user!.id,
        status: 'Pending'
      });

      // Start test runner with custom pages
      const testRunner = new TestRunner();
      testRunner.executeCustomRun(run._id.toString(), site, normalizedPages).catch(err => {
        console.error('Custom test run failed:', err);
      });

      res.status(201).json({ 
        run: {
          ...run.toObject(),
          id: run._id.toString()
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// Stop a running test (qa and qa_lead)
router.patch(
  '/:id/stop',
  authenticate,
  authorize('qa', 'qa_lead'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.params.id || req.params.id === 'undefined' || req.params.id === 'null') {
        return res.status(400).json({ error: 'Invalid run ID' });
      }

      const run = await Run.findById(req.params.id);

      if (!run) {
        return res.status(404).json({ error: 'Run not found' });
      }

      if (run.status !== 'Running' && run.status !== 'Pending') {
        return res.status(400).json({ error: 'Run is not active' });
      }

      // Update run status to Failed with stopped message
      const updatedRun = await Run.findByIdAndUpdate(
        req.params.id,
        {
          status: 'Failed',
          completed_at: new Date(),
          error_message: 'Stopped by user'
        },
        { new: true }
      );

      res.json({ 
        run: {
          ...updatedRun!.toObject(),
          id: updatedRun!._id.toString()
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
