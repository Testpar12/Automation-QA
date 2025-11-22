import { Router, Response, NextFunction } from 'express';
import { body, query as validQuery, validationResult } from 'express-validator';
import { authenticate, AuthRequest } from '../middleware/auth';
import { query } from '../config/database';

const router = Router();

// Get issues with filters
router.get('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { project_id, site_id, run_id, status, type, severity } = req.query;

    let queryText = `
      SELECT 
        i.*,
        p.name as project_name,
        s.name as site_name,
        u.first_name || ' ' || u.last_name as created_by_name,
        a.first_name || ' ' || a.last_name as assigned_to_name
      FROM issues i
      JOIN projects p ON p.id = i.project_id
      JOIN sites s ON s.id = i.site_id
      LEFT JOIN users u ON u.id = i.created_by
      LEFT JOIN users a ON a.id = i.assigned_to
      WHERE 1=1
    `;

    const values: any[] = [];
    let paramCount = 1;

    if (project_id) {
      queryText += ` AND i.project_id = $${paramCount++}`;
      values.push(project_id);
    }

    if (site_id) {
      queryText += ` AND i.site_id = $${paramCount++}`;
      values.push(site_id);
    }

    if (run_id) {
      queryText += ` AND i.run_id = $${paramCount++}`;
      values.push(run_id);
    }

    if (status) {
      queryText += ` AND i.status = $${paramCount++}`;
      values.push(status);
    }

    if (type) {
      queryText += ` AND i.type = $${paramCount++}`;
      values.push(type);
    }

    if (severity) {
      queryText += ` AND i.severity = $${paramCount++}`;
      values.push(severity);
    }

    queryText += ' ORDER BY i.created_at DESC LIMIT 1000';

    const result = await query(queryText, values);

    res.json({ issues: result.rows });
  } catch (error) {
    next(error);
  }
});

// Get single issue
router.get('/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const issueResult = await query(
      `SELECT 
        i.*,
        p.name as project_name,
        s.name as site_name,
        u.first_name || ' ' || u.last_name as created_by_name,
        a.first_name || ' ' || a.last_name as assigned_to_name
      FROM issues i
      JOIN projects p ON p.id = i.project_id
      JOIN sites s ON s.id = i.site_id
      LEFT JOIN users u ON u.id = i.created_by
      LEFT JOIN users a ON a.id = i.assigned_to
      WHERE i.id = $1`,
      [req.params.id]
    );

    if (issueResult.rows.length === 0) {
      return res.status(404).json({ error: 'Issue not found' });
    }

    // Get comments
    const commentsResult = await query(
      `SELECT 
        c.*,
        u.first_name || ' ' || u.last_name as user_name,
        u.role as user_role
      FROM issue_comments c
      JOIN users u ON u.id = c.user_id
      WHERE c.issue_id = $1
      ORDER BY c.created_at ASC`,
      [req.params.id]
    );

    // Get status history
    const historyResult = await query(
      `SELECT 
        h.*,
        u.first_name || ' ' || u.last_name as user_name
      FROM issue_status_history h
      JOIN users u ON u.id = h.user_id
      WHERE h.issue_id = $1
      ORDER BY h.created_at DESC`,
      [req.params.id]
    );

    res.json({
      issue: issueResult.rows[0],
      comments: commentsResult.rows,
      history: historyResult.rows,
    });
  } catch (error) {
    next(error);
  }
});

// Update issue (qa, qa_lead, dev with restrictions)
router.patch(
  '/:id',
  authenticate,
  [
    body('title').optional().trim(),
    body('description').optional().trim(),
    body('severity').optional().isIn(['Critical', 'Major', 'Minor', 'Trivial']),
    body('status').optional().isIn(['New', 'Open (For Dev)', 'Ready for QA', 'Resolved', 'Rejected']),
    body('assigned_to').optional().isUUID(),
  ],
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { title, description, severity, status, assigned_to } = req.body;

      // Get current issue
      const currentIssue = await query('SELECT * FROM issues WHERE id = $1', [req.params.id]);
      
      if (currentIssue.rows.length === 0) {
        return res.status(404).json({ error: 'Issue not found' });
      }

      const issue = currentIssue.rows[0];

      // Check permissions for status changes
      if (status && status !== issue.status) {
        if (req.user!.role === 'dev') {
          // Dev can only change from "Open (For Dev)" to "Ready for QA" or "Rejected"
          if (
            issue.status !== 'Open (For Dev)' ||
            !['Ready for QA', 'Rejected'].includes(status)
          ) {
            return res.status(403).json({
              error: 'Developers can only change status from "Open (For Dev)" to "Ready for QA" or "Rejected"',
            });
          }
        }

        // Record status change
        await query(
          `INSERT INTO issue_status_history (issue_id, user_id, from_status, to_status)
           VALUES ($1, $2, $3, $4)`,
          [req.params.id, req.user!.id, issue.status, status]
        );
      }

      // Build update query
      const updates: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      if (title !== undefined) {
        updates.push(`title = $${paramCount++}`);
        values.push(title);
      }

      if (description !== undefined) {
        updates.push(`description = $${paramCount++}`);
        values.push(description);
      }

      if (severity !== undefined && req.user!.role !== 'dev') {
        updates.push(`severity = $${paramCount++}`);
        values.push(severity);
      }

      if (status !== undefined) {
        updates.push(`status = $${paramCount++}`);
        values.push(status);
      }

      if (assigned_to !== undefined && req.user!.role !== 'dev') {
        updates.push(`assigned_to = $${paramCount++}`);
        values.push(assigned_to);
      }

      if (updates.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }

      values.push(req.params.id);

      const result = await query(
        `UPDATE issues 
         SET ${updates.join(', ')}
         WHERE id = $${paramCount}
         RETURNING *`,
        values
      );

      res.json({ issue: result.rows[0] });
    } catch (error) {
      next(error);
    }
  }
);

// Add comment to issue
router.post(
  '/:id/comments',
  authenticate,
  [body('comment').trim().notEmpty().withMessage('Comment is required')],
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { comment } = req.body;

      // Check issue exists
      const issueCheck = await query('SELECT id FROM issues WHERE id = $1', [req.params.id]);
      
      if (issueCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Issue not found' });
      }

      const result = await query(
        `INSERT INTO issue_comments (issue_id, user_id, comment)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [req.params.id, req.user!.id, comment]
      );

      res.status(201).json({ comment: result.rows[0] });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
