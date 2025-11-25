export interface User {
  id: string;
  email: string;
  role: 'qa' | 'qa_lead' | 'dev';
  first_name?: string;
  last_name?: string;
}

export interface Project {
  id: string;
  name: string;
  client_name?: string;
  site_count?: number;
  created_by: string;
  created_by_name?: string;
  created_at: string;
  updated_at: string;
}

export interface Site {
  id: string;
  project_id: string;
  project_name?: string;
  name: string;
  base_url: string;
  environment: 'Staging' | 'Production' | 'Other';
  open_issues_count?: number;
  last_run_id?: string;
  last_run_at?: string;
  created_by: string;
  created_by_name?: string;
  created_at: string;
  updated_at: string;
}

export interface Run {
  id: string;
  site_id: string;
  site_name?: string;
  triggered_by: string;
  triggered_by_name?: string;
  status: 'Pending' | 'Running' | 'Completed' | 'Failed';
  pages_processed: number;
  issues_created: number;
  started_at: string;
  completed_at?: string;
  error_message?: string;
}

export interface Issue {
  id: string;
  project_id: string;
  project_name?: string;
  site_id: string;
  site_name?: string;
  run_id: string;
  page_id?: string;
  url: string;
  type: 'Visual' | 'Form';
  title?: string;
  description?: string;
  screenshot_url?: string;
  metadata?: {
    issues?: Array<{
      type: string;
      severity: string;
      description: string;
      viewport?: string;
      elements?: Array<{
        x: number;
        y: number;
        width: number;
        height: number;
        selector?: string;
      }>;
    }>;
    viewportScreenshots?: Record<string, string>; // viewport -> screenshot path
  };
  severity: 'Critical' | 'Major' | 'Minor' | 'Trivial';
  status: 'New' | 'Open (For Dev)' | 'Ready for QA' | 'Resolved' | 'Rejected';
  assigned_to?: string;
  assigned_to_name?: string;
  created_by?: string;
  created_by_name?: string;
  created_at: string;
  updated_at: string;
}

export interface IssueComment {
  id: string;
  issue_id: string;
  user_id: string;
  user_name: string;
  user_role: string;
  comment: string;
  created_at: string;
}

export interface IssueStatusHistory {
  id: string;
  issue_id: string;
  user_id: string;
  user_name: string;
  from_status?: string;
  to_status: string;
  created_at: string;
}
