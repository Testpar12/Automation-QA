# Development Guide

## Project Architecture

### Backend (Node.js/TypeScript)

```
backend/src/
├── config/          # Configuration files
│   ├── index.ts     # Main config loader
│   ├── constants.ts # App constants
│   └── database.ts  # DB connection
├── middleware/      # Express middleware
│   ├── auth.ts      # JWT authentication
│   └── errorHandler.ts
├── routes/          # API routes
│   ├── auth.ts      # Authentication
│   ├── projects.ts  # Projects CRUD
│   ├── sites.ts     # Sites CRUD
│   ├── runs.ts      # Test runs
│   └── issues.ts    # Issues/tickets
├── services/        # Business logic
│   ├── testRunner.ts    # Main test orchestrator
│   ├── pageCrawler.ts   # Page discovery
│   ├── visualAnalyzer.ts # Visual checks
│   ├── formTester.ts    # Form testing
│   └── issueCreator.ts  # Issue generation
└── index.ts         # App entry point
```

### Frontend (React/TypeScript)

```
frontend/src/
├── components/      # Reusable components
│   ├── Layout.tsx   # Main layout
│   └── ProtectedRoute.tsx
├── contexts/        # React contexts
│   └── AuthContext.tsx
├── pages/           # Page components
│   ├── LoginPage.tsx
│   ├── ProjectsPage.tsx
│   ├── ProjectDetailPage.tsx
│   ├── SiteDetailPage.tsx
│   └── IssuesPage.tsx
├── services/        # API clients
│   ├── api.ts       # Axios instance
│   ├── authService.ts
│   ├── projectService.ts
│   ├── siteService.ts
│   ├── runService.ts
│   └── issueService.ts
└── types/           # TypeScript types
    └── index.ts
```

## Key Workflows

### Test Run Flow

1. User clicks "Run Test" on a site
2. `POST /api/runs` creates a run record (status: Pending)
3. TestRunner.executeRun() starts asynchronously:
   - Updates status to Running
   - Launches Playwright browser
   - PageCrawler discovers URLs (sitemap + crawl)
   - For each page:
     - Navigate and wait for load
     - Capture screenshot
     - Get DOM snapshot
     - VisualAnalyzer checks layout issues
     - FormTester finds and tests forms
     - IssueCreator generates issues
   - Updates status to Completed/Failed
4. Frontend polls for updates every 5 seconds

### Issue Workflow

```
New → Open (For Dev) → Ready for QA → Resolved
                    ↓
                Rejected
```

- QA reviews and assigns: New → Open (For Dev)
- Dev fixes and marks: Open (For Dev) → Ready for QA
- QA re-tests: Ready for QA → Resolved or Open (For Dev)
- Either role can reject: → Rejected

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login with email/password
- `GET /api/auth/me` - Get current user

### Projects
- `GET /api/projects` - List all projects
- `GET /api/projects/:id` - Get project details
- `POST /api/projects` - Create project (qa_lead only)
- `PATCH /api/projects/:id` - Update project (qa_lead only)
- `DELETE /api/projects/:id` - Delete project (qa_lead only)

### Sites
- `GET /api/sites?project_id=X` - List sites
- `GET /api/sites/:id` - Get site details
- `POST /api/sites` - Create site (qa_lead only)
- `PATCH /api/sites/:id` - Update site (qa_lead only)
- `DELETE /api/sites/:id` - Delete site (qa_lead only)

### Runs
- `GET /api/runs?site_id=X` - List runs
- `GET /api/runs/:id` - Get run details + pages + issues
- `POST /api/runs` - Start test run (qa, qa_lead)

### Issues
- `GET /api/issues?filters` - List issues with filters
- `GET /api/issues/:id` - Get issue + comments + history
- `PATCH /api/issues/:id` - Update issue
- `POST /api/issues/:id/comments` - Add comment

## Database Schema

Key tables:
- **users** - User accounts with roles
- **projects** - Top-level organization
- **sites** - Websites under projects
- **runs** - Test run records
- **pages** - Pages discovered/tested in runs
- **visual_anomalies** - Layout issues detected
- **form_tests** - Form test results
- **issues** - Issues/tickets created
- **issue_comments** - Comments on issues
- **issue_status_history** - Status change tracking

## Configuration

### Crawler Settings

Edit `backend/src/config/constants.ts`:

```typescript
export const CRAWL_CONFIG = {
  MAX_DEPTH: 2,           // How deep to crawl
  MAX_PAGES: 30,          // Max pages per run
  VIEWPORT_WIDTH: 1440,   // Screenshot width
  VIEWPORT_HEIGHT: 900,   // Screenshot height
  PAGE_TIMEOUT: 30000,    // Page load timeout
};

export const EXCLUDED_PATTERNS = [
  '/wp-admin',
  '/login',
  // Add more patterns to exclude
];
```

### Form Testing

Customize test data in `FORM_CONFIG`:

```typescript
export const FORM_CONFIG = {
  TEST_DATA: {
    email: `qa+${Date.now()}@example.com`,
    name: 'QA Test User',
    // Customize test values
  },
};
```

## Adding New Features

### Add a New API Endpoint

1. Create route handler in `backend/src/routes/`
2. Add authentication/authorization middleware
3. Import and register in `backend/src/index.ts`
4. Create service in `frontend/src/services/`
5. Use in React components

### Add a New Page

1. Create component in `frontend/src/pages/`
2. Add route in `frontend/src/App.tsx`
3. Add navigation link in `Layout.tsx`

### Add a New Role Permission

1. Update `USER_ROLES` in `backend/src/config/constants.ts`
2. Update database enum in `database/schema.sql`
3. Add authorization checks in routes
4. Update UI to show/hide features

## Testing

### Manual Testing Checklist

- [ ] Login/logout
- [ ] Create project (qa_lead)
- [ ] Create site (qa_lead)
- [ ] Run test (qa, qa_lead)
- [ ] View test results
- [ ] Filter issues
- [ ] Update issue status
- [ ] Add issue comments
- [ ] Developer workflow (status changes)

### Test Sites

Good test sites for development:
- https://example.com (simple, fast)
- Your own staging sites
- Local development servers

## Performance Optimization

### Backend

- Connection pooling (already configured in pg)
- Limit crawl depth and pages
- Use database indexes (already added)
- Cache repeated queries if needed

### Frontend

- React.memo for expensive components
- Debounce search/filter inputs
- Paginate large lists
- Lazy load images

## Security Considerations

- Passwords hashed with bcrypt
- JWT tokens with expiration
- Role-based access control on all endpoints
- SQL injection prevention via parameterized queries
- XSS prevention via React's built-in escaping

## Common Issues

### Slow Test Runs

- Reduce MAX_PAGES in config
- Reduce PAGE_TIMEOUT
- Check network speed to target site

### Out of Memory

- Browser automation is memory-intensive
- Close browser after each run
- Consider queue system for multiple runs

### Screenshot Storage

- MVP1 uses local filesystem
- For production, use S3/cloud storage
- Implement cleanup of old screenshots

## Future Enhancements (Post-MVP1)

- Mobile/tablet viewports
- CI/CD integration
- Scheduled runs
- Email notifications
- PDF reports
- Figma comparison
- AI-powered issue analysis
- Visual regression baselines
- Component library testing
