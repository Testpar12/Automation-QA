import { Router, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { query } from '../config/database';

const router = Router();

// Get all projects
router.get('/', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await query(`
      SELECT 
        p.*,
        COUNT(DISTINCT s.id) as site_count,
        u.first_name || ' ' || u.last_name as created_by_name
      FROM projects p
      LEFT JOIN sites s ON s.project_id = p.id
      LEFT JOIN users u ON u.id = p.created_by
      GROUP BY p.id, u.first_name, u.last_name
      ORDER BY p.created_at DESC
    `);

    res.json({ projects: result.rows });
  } catch (error) {
    next(error);
  }
});

// Get single project
router.get('/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await query(
      `SELECT 
        p.*,
        COUNT(DISTINCT s.id) as site_count,
        u.first_name || ' ' || u.last_name as created_by_name
      FROM projects p
      LEFT JOIN sites s ON s.project_id = p.id
      LEFT JOIN users u ON u.id = p.created_by
      WHERE p.id = $1
      GROUP BY p.id, u.first_name, u.last_name`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json({ project: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

// Create project (qa_lead only)
router.post(
  '/',
  authenticate,
  authorize('qa_lead'),
  [
    body('name').trim().notEmpty().withMessage('Project name is required'),
    body('client_name').optional().trim(),
  ],
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { name, client_name } = req.body;

      const result = await query(
        `INSERT INTO projects (name, client_name, created_by)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [name, client_name || null, req.user!.id]
      );

      res.status(201).json({ project: result.rows[0] });
    } catch (error) {
      next(error);
    }
  }
);

// Update project (qa_lead only)
router.patch(
  '/:id',
  authenticate,
  authorize('qa_lead'),
  [
    body('name').optional().trim().notEmpty(),
    body('client_name').optional().trim(),
  ],
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { name, client_name } = req.body;
      const updates: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      if (name !== undefined) {
        updates.push(`name = $${paramCount++}`);
        values.push(name);
      }

      if (client_name !== undefined) {
        updates.push(`client_name = $${paramCount++}`);
        values.push(client_name);
      }

      if (updates.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }

      values.push(req.params.id);

      const result = await query(
        `UPDATE projects 
         SET ${updates.join(', ')}
         WHERE id = $${paramCount}
         RETURNING *`,
        values
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Project not found' });
      }

      res.json({ project: result.rows[0] });
    } catch (error) {
      next(error);
    }
  }
);

// Delete project (qa_lead only)
router.delete(
  '/:id',
  authenticate,
  authorize('qa_lead'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await query(
        'DELETE FROM projects WHERE id = $1 RETURNING id',
        [req.params.id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Project not found' });
      }

      res.json({ message: 'Project deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
