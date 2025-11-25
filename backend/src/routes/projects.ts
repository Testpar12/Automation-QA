import { Router, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { Project, Site, User } from '../models';

const router = Router();

// Get all projects
router.get('/', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const projects = await Project.find()
      .populate('created_by', 'first_name last_name')
      .sort({ created_at: -1 })
      .lean();

    // Get site counts for each project
    const projectsWithCounts = await Promise.all(
      projects.map(async (project) => {
        const siteCount = await Site.countDocuments({ project_id: project._id });
        const createdBy = project.created_by as any;
        return {
          ...project,
          id: project._id.toString(),
          site_count: siteCount,
          created_by_name: createdBy ? `${createdBy.first_name} ${createdBy.last_name}` : null
        };
      })
    );

    res.json({ projects: projectsWithCounts });
  } catch (error) {
    next(error);
  }
});

// Get single project
router.get('/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.params.id || req.params.id === 'undefined' || req.params.id === 'null') {
      return res.status(400).json({ error: 'Invalid project ID' });
    }

    const project = await Project.findById(req.params.id)
      .populate('created_by', 'first_name last_name')
      .lean();

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const siteCount = await Site.countDocuments({ project_id: project._id });
    const createdBy = project.created_by as any;

    const projectWithCounts = {
      ...project,
      id: project._id.toString(),
      site_count: siteCount,
      created_by_name: createdBy ? `${createdBy.first_name} ${createdBy.last_name}` : null
    };

    res.json({ project: projectWithCounts });
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

      const project = await Project.create({
        name,
        client_name: client_name || null,
        created_by: req.user!.id
      });

      res.status(201).json({ 
        project: {
          ...project.toObject(),
          id: project._id.toString()
        }
      });
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
      const updateData: any = {};

      if (name !== undefined) {
        updateData.name = name;
      }

      if (client_name !== undefined) {
        updateData.client_name = client_name;
      }

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }

      const project = await Project.findByIdAndUpdate(
        req.params.id,
        updateData,
        { new: true, runValidators: true }
      );

      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      res.json({ 
        project: {
          ...project.toObject(),
          id: project._id.toString()
        }
      });
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
      const project = await Project.findByIdAndDelete(req.params.id);

      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      res.json({ message: 'Project deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
