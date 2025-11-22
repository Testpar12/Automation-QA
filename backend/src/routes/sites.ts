import { Router, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { query } from '../config/database';

const router = Router();

// Get all sites
router.get('/', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const projectId = req.query.project_id;
    
    let queryText = `
      SELECT 
        s.*,
        p.name as project_name,
        u.first_name || ' ' || u.last_name as created_by_name,
        (
          SELECT COUNT(*) 
          FROM issues 
          WHERE site_id = s.id 
          AND status NOT IN ('Resolved', 'Rejected')
        ) as open_issues_count,
        (
          SELECT MAX(started_at) 
          FROM runs 
          WHERE site_id = s.id
        ) as last_run_at
      FROM sites s
      JOIN projects p ON p.id = s.project_id
      LEFT JOIN users u ON u.id = s.created_by
    `;

    const values: any[] = [];

    if (projectId) {
      queryText += ' WHERE s.project_id = $1';
      values.push(projectId);
    }

    queryText += ' ORDER BY s.created_at DESC';

    const result = await query(queryText, values);

    res.json({ sites: result.rows });
  } catch (error) {
    next(error);
  }
});

// Get single site
router.get('/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await query(
      `SELECT 
        s.*,
        p.name as project_name,
        u.first_name || ' ' || u.last_name as created_by_name,
        (
          SELECT COUNT(*) 
          FROM issues 
          WHERE site_id = s.id 
          AND status NOT IN ('Resolved', 'Rejected')
        ) as open_issues_count,
        (
          SELECT id
          FROM runs 
          WHERE site_id = s.id
          ORDER BY started_at DESC
          LIMIT 1
        ) as last_run_id
      FROM sites s
      JOIN projects p ON p.id = s.project_id
      LEFT JOIN users u ON u.id = s.created_by
      WHERE s.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Site not found' });
    }

    res.json({ site: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

// Create site (qa_lead only)
router.post(
  '/',
  authenticate,
  authorize('qa_lead'),
  [
    body('project_id').isUUID().withMessage('Valid project ID is required'),
    body('name').trim().notEmpty().withMessage('Site name is required'),
    body('base_url').isURL().withMessage('Valid base URL is required'),
    body('environment').isIn(['Staging', 'Production', 'Other']),
  ],
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { project_id, name, base_url, environment } = req.body;

      // Verify project exists
      const projectCheck = await query(
        'SELECT id FROM projects WHERE id = $1',
        [project_id]
      );

      if (projectCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Project not found' });
      }

      const result = await query(
        `INSERT INTO sites (project_id, name, base_url, environment, created_by)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [project_id, name, base_url, environment, req.user!.id]
      );

      res.status(201).json({ site: result.rows[0] });
    } catch (error) {
      next(error);
    }
  }
);

// Update site (qa_lead only)
router.patch(
  '/:id',
  authenticate,
  authorize('qa_lead'),
  [
    body('name').optional().trim().notEmpty(),
    body('base_url').optional().isURL(),
    body('environment').optional().isIn(['Staging', 'Production', 'Other']),
  ],
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { name, base_url, environment } = req.body;
      const updates: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      if (name !== undefined) {
        updates.push(`name = $${paramCount++}`);
        values.push(name);
      }

      if (base_url !== undefined) {
        updates.push(`base_url = $${paramCount++}`);
        values.push(base_url);
      }

      if (environment !== undefined) {
        updates.push(`environment = $${paramCount++}`);
        values.push(environment);
      }

      if (updates.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }

      values.push(req.params.id);

      const result = await query(
        `UPDATE sites 
         SET ${updates.join(', ')}
         WHERE id = $${paramCount}
         RETURNING *`,
        values
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Site not found' });
      }

      res.json({ site: result.rows[0] });
    } catch (error) {
      next(error);
    }
  }
);

// Delete site (qa_lead only)
router.delete(
  '/:id',
  authenticate,
  authorize('qa_lead'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await query(
        'DELETE FROM sites WHERE id = $1 RETURNING id',
        [req.params.id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Site not found' });
      }

      res.json({ message: 'Site deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
