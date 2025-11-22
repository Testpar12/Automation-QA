import { Router, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { query } from '../config/database';
import { TestRunner } from '../services/testRunner';

const router = Router();

// Get runs for a site
router.get('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { site_id } = req.query;

    let queryText = `
      SELECT 
        r.*,
        u.first_name || ' ' || u.last_name as triggered_by_name,
        s.name as site_name
      FROM runs r
      LEFT JOIN users u ON u.id = r.triggered_by
      LEFT JOIN sites s ON s.id = r.site_id
    `;

    const values: any[] = [];

    if (site_id) {
      queryText += ' WHERE r.site_id = $1';
      values.push(site_id);
    }

    queryText += ' ORDER BY r.started_at DESC LIMIT 50';

    const result = await query(queryText, values);

    res.json({ runs: result.rows });
  } catch (error) {
    next(error);
  }
});

// Get single run
router.get('/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const runResult = await query(
      `SELECT 
        r.*,
        u.first_name || ' ' || u.last_name as triggered_by_name,
        s.name as site_name,
        s.base_url
      FROM runs r
      LEFT JOIN users u ON u.id = r.triggered_by
      LEFT JOIN sites s ON s.id = r.site_id
      WHERE r.id = $1`,
      [req.params.id]
    );

    if (runResult.rows.length === 0) {
      return res.status(404).json({ error: 'Run not found' });
    }

    const run = runResult.rows[0];

    // Get pages for this run
    const pagesResult = await query(
      `SELECT id, url, status_code, screenshot_url, render_failed, render_error
       FROM pages
       WHERE run_id = $1
       ORDER BY created_at`,
      [req.params.id]
    );

    // Get issue summary
    const issuesResult = await query(
      `SELECT type, COUNT(*) as count
       FROM issues
       WHERE run_id = $1
       GROUP BY type`,
      [req.params.id]
    );

    res.json({ 
      run,
      pages: pagesResult.rows,
      issue_summary: issuesResult.rows,
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
    body('site_id').isUUID().withMessage('Valid site ID is required'),
  ],
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { site_id } = req.body;

      // Verify site exists
      const siteResult = await query(
        'SELECT * FROM sites WHERE id = $1',
        [site_id]
      );

      if (siteResult.rows.length === 0) {
        return res.status(404).json({ error: 'Site not found' });
      }

      const site = siteResult.rows[0];

      // Create run record
      const runResult = await query(
        `INSERT INTO runs (site_id, triggered_by, status)
         VALUES ($1, $2, 'Pending')
         RETURNING *`,
        [site_id, req.user!.id]
      );

      const run = runResult.rows[0];

      // Start test runner asynchronously
      const testRunner = new TestRunner();
      testRunner.executeRun(run.id, site).catch(err => {
        console.error('Test run failed:', err);
      });

      res.status(201).json({ run });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
