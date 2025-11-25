import { Router, Response, NextFunction } from 'express';
import { body, query as validQuery, validationResult } from 'express-validator';
import { authenticate, AuthRequest } from '../middleware/auth';
import { Issue, IssueComment, IssueStatusHistory, User, Run, Page, Site } from '../models';

const router = Router();

// Get issues with filters
router.get('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { project_id, site_id, run_id, status, type, severity } = req.query;

    const filter: any = {};

    if (project_id && project_id !== 'undefined' && project_id !== 'null') {
      filter.project_id = project_id;
    }

    if (site_id && site_id !== 'undefined' && site_id !== 'null') {
      filter.site_id = site_id;
    }

    if (run_id && run_id !== 'undefined' && run_id !== 'null') {
      filter.run_id = run_id;
    }

    if (status) {
      filter.status = status;
    }

    if (type) {
      filter.type = type;
    }

    if (severity) {
      filter.severity = severity;
    }

    const issues = await Issue.find(filter)
      .populate('project_id', 'name')
      .populate('site_id', 'name')
      .populate('created_by', 'first_name last_name')
      .populate('assigned_to', 'first_name last_name')
      .sort({ created_at: -1 })
      .limit(1000)
      .lean();

    const issuesWithData = issues.map(issue => {
      const project = issue.project_id as any;
      const site = issue.site_id as any;
      const createdBy = issue.created_by as any;
      const assignedTo = issue.assigned_to as any;

      return {
        ...issue,
        id: issue._id.toString(),
        project_name: project?.name || null,
        site_name: site?.name || null,
        created_by_name: createdBy ? `${createdBy.first_name} ${createdBy.last_name}` : null,
        assigned_to_name: assignedTo ? `${assignedTo.first_name} ${assignedTo.last_name}` : null
      };
    });

    res.json({ issues: issuesWithData });
  } catch (error) {
    next(error);
  }
});

// Get single issue
router.get('/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.params.id || req.params.id === 'undefined' || req.params.id === 'null') {
      return res.status(400).json({ error: 'Invalid issue ID' });
    }

    const issueDoc = await Issue.findById(req.params.id)
      .populate('project_id', 'name')
      .populate('site_id', 'name')
      .populate('created_by', 'first_name last_name')
      .populate('assigned_to', 'first_name last_name')
      .lean();

    if (!issueDoc) {
      return res.status(404).json({ error: 'Issue not found' });
    }

    const project = issueDoc.project_id as any;
    const site = issueDoc.site_id as any;
    const createdBy = issueDoc.created_by as any;
    const assignedTo = issueDoc.assigned_to as any;

    const issue = {
      ...issueDoc,
      id: issueDoc._id.toString(),
      project_name: project?.name || null,
      site_name: site?.name || null,
      created_by_name: createdBy ? `${createdBy.first_name} ${createdBy.last_name}` : null,
      assigned_to_name: assignedTo ? `${assignedTo.first_name} ${assignedTo.last_name}` : null
    };

    // Get comments
    const commentsData = await IssueComment.find({ issue_id: req.params.id })
      .populate('user_id', 'first_name last_name role')
      .sort({ created_at: 1 })
      .lean();

    const comments = commentsData.map(comment => {
      const user = comment.user_id as any;
      return {
        ...comment,
        id: comment._id.toString(),
        user_name: user ? `${user.first_name} ${user.last_name}` : null,
        user_role: user?.role || null
      };
    });

    // Get status history
    const historyData = await IssueStatusHistory.find({ issue_id: req.params.id })
      .populate('user_id', 'first_name last_name')
      .sort({ created_at: -1 })
      .lean();

    const history = historyData.map(h => {
      const user = h.user_id as any;
      return {
        ...h,
        id: h._id.toString(),
        user_name: user ? `${user.first_name} ${user.last_name}` : null
      };
    });

    res.json({
      issue,
      comments,
      history,
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
    body('assigned_to').optional().isMongoId(),
  ],
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      if (!req.params.id || req.params.id === 'undefined' || req.params.id === 'null') {
        return res.status(400).json({ error: 'Invalid issue ID' });
      }

      const { title, description, severity, status, assigned_to } = req.body;

      // Get current issue
      const currentIssue = await Issue.findById(req.params.id);
      
      if (!currentIssue) {
        return res.status(404).json({ error: 'Issue not found' });
      }

      // Check permissions for status changes
      if (status && status !== currentIssue.status) {
        if (req.user!.role === 'dev') {
          // Dev can only change from "Open (For Dev)" to "Ready for QA" or "Rejected"
          if (
            currentIssue.status !== 'Open (For Dev)' ||
            !['Ready for QA', 'Rejected'].includes(status)
          ) {
            return res.status(403).json({
              error: 'Developers can only change status from "Open (For Dev)" to "Ready for QA" or "Rejected"',
            });
          }
        }

        // Record status change
        await IssueStatusHistory.create({
          issue_id: req.params.id,
          user_id: req.user!.id,
          from_status: currentIssue.status,
          to_status: status
        });
      }

      // Build update object
      const updateData: any = {};

      if (title !== undefined) {
        updateData.title = title;
      }

      if (description !== undefined) {
        updateData.description = description;
      }

      if (severity !== undefined && req.user!.role !== 'dev') {
        updateData.severity = severity;
      }

      if (status !== undefined) {
        updateData.status = status;
      }

      if (assigned_to !== undefined && req.user!.role !== 'dev') {
        updateData.assigned_to = assigned_to;
      }

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }

      const issue = await Issue.findByIdAndUpdate(
        req.params.id,
        updateData,
        { new: true, runValidators: true }
      );

      if (!issue) {
        return res.status(404).json({ error: 'Issue not found' });
      }

      res.json({ 
        issue: {
          ...issue.toObject(),
          id: issue._id.toString()
        }
      });
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

      if (!req.params.id || req.params.id === 'undefined' || req.params.id === 'null') {
        return res.status(400).json({ error: 'Invalid issue ID' });
      }

      const { comment } = req.body;

      // Check issue exists
      const issueExists = await Issue.findById(req.params.id);
      
      if (!issueExists) {
        return res.status(404).json({ error: 'Issue not found' });
      }

      const newComment = await IssueComment.create({
        issue_id: req.params.id,
        user_id: req.user!.id,
        comment
      });

      res.status(201).json({ 
        comment: {
          ...newComment.toObject(),
          id: newComment._id.toString()
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
