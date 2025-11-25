import { Router, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { Project, Site, User, Issue, Run } from '../models';

const router = Router();

// Get all sites
router.get('/', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const projectId = req.query.project_id;
    
    const filter: any = {};
    if (projectId && projectId !== 'undefined' && projectId !== 'null') {
      filter.project_id = projectId;
    }

    const sites = await Site.find(filter)
      .populate('project_id', 'name')
      .populate('created_by', 'first_name last_name')
      .sort({ created_at: -1 })
      .lean();

    // Get additional data for each site
    const sitesWithData = await Promise.all(
      sites.map(async (site) => {
        const openIssuesCount = await Issue.countDocuments({
          site_id: site._id,
          status: { $nin: ['Resolved', 'Rejected'] }
        });

        const lastRun = await Run.findOne({ site_id: site._id })
          .sort({ started_at: -1 })
          .select('started_at')
          .lean();

        const project = site.project_id as any;
        const createdBy = site.created_by as any;

        return {
          ...site,
          id: site._id.toString(),
          project_name: project?.name || null,
          created_by_name: createdBy ? `${createdBy.first_name} ${createdBy.last_name}` : null,
          open_issues_count: openIssuesCount,
          last_run_at: lastRun?.started_at || null
        };
      })
    );

    res.json({ sites: sitesWithData });
  } catch (error) {
    next(error);
  }
});

// Get single site
router.get('/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.params.id || req.params.id === 'undefined' || req.params.id === 'null') {
      return res.status(400).json({ error: 'Invalid site ID' });
    }

    const site = await Site.findById(req.params.id)
      .populate('project_id', 'name')
      .populate('created_by', 'first_name last_name')
      .lean();

    if (!site) {
      return res.status(404).json({ error: 'Site not found' });
    }

    const openIssuesCount = await Issue.countDocuments({
      site_id: site._id,
      status: { $nin: ['Resolved', 'Rejected'] }
    });

    const lastRun = await Run.findOne({ site_id: site._id })
      .sort({ started_at: -1 })
      .select('_id')
      .lean();

    const project = site.project_id as any;
    const createdBy = site.created_by as any;

    const siteWithData = {
      ...site,
      id: site._id.toString(),
      project_name: project?.name || null,
      created_by_name: createdBy ? `${createdBy.first_name} ${createdBy.last_name}` : null,
      open_issues_count: openIssuesCount,
      last_run_id: lastRun?._id?.toString() || null
    };

    res.json({ site: siteWithData });
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
    body('project_id').isMongoId().withMessage('Valid project ID is required'),
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
      const project = await Project.findById(project_id);

      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      const site = await Site.create({
        project_id,
        name,
        base_url,
        environment,
        created_by: req.user!.id
      });

      res.status(201).json({ 
        site: {
          ...site.toObject(),
          id: site._id.toString()
        }
      });
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
      const updateData: any = {};

      if (name !== undefined) {
        updateData.name = name;
      }

      if (base_url !== undefined) {
        updateData.base_url = base_url;
      }

      if (environment !== undefined) {
        updateData.environment = environment;
      }

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }

      const site = await Site.findByIdAndUpdate(
        req.params.id,
        updateData,
        { new: true, runValidators: true }
      );

      if (!site) {
        return res.status(404).json({ error: 'Site not found' });
      }

      res.json({ 
        site: {
          ...site.toObject(),
          id: site._id.toString()
        }
      });
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
      const site = await Site.findByIdAndDelete(req.params.id);

      if (!site) {
        return res.status(404).json({ error: 'Site not found' });
      }

      res.json({ message: 'Site deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
