export interface User {
  id: string;
  email: string;
  password_hash: string;
  role: 'qa' | 'qa_lead' | 'dev';
  first_name?: string;
  last_name?: string;
  created_at: Date;
  updated_at: Date;
}

export interface Project {
  id: string;
  name: string;
  client_name?: string;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

export interface Site {
  id: string;
  project_id: string;
  name: string;
  base_url: string;
  environment: 'Staging' | 'Production' | 'Other';
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

export interface Run {
  id: string;
  site_id: string;
  triggered_by: string;
  status: 'Pending' | 'Running' | 'Completed' | 'Failed';
  pages_processed: number;
  issues_created: number;
  started_at: Date;
  completed_at?: Date;
  error_message?: string;
}

export interface Page {
  id: string;
  run_id: string;
  url: string;
  status_code?: number;
  screenshot_url?: string;
  dom_snapshot?: string;
  render_failed: boolean;
  render_error?: string;
  created_at: Date;
}

export interface VisualAnomaly {
  id: string;
  page_id: string;
  anomaly_type: string;
  category: string;
  message: string;
  severity: string;
  created_at: Date;
}

export interface FormTest {
  id: string;
  page_id: string;
  form_selector?: string;
  form_fields?: any;
  test_result: 'Passed' | 'Failed';
  submit_status?: number;
  success_indicators?: string[];
  error_indicators?: string[];
  error_message?: string;
  created_at: Date;
}

export interface Issue {
  id: string;
  project_id: string;
  site_id: string;
  run_id: string;
  page_id?: string;
  url: string;
  type: 'Visual' | 'Form';
  title?: string;
  description?: string;
  screenshot_url?: string;
  severity: 'Critical' | 'Major' | 'Minor' | 'Trivial';
  status: 'New' | 'Open (For Dev)' | 'Ready for QA' | 'Resolved' | 'Rejected';
  assigned_to?: string;
  created_by?: string;
  created_at: Date;
  updated_at: Date;
}

export interface IssueComment {
  id: string;
  issue_id: string;
  user_id: string;
  comment: string;
  created_at: Date;
}

export interface IssueStatusHistory {
  id: string;
  issue_id: string;
  user_id: string;
  from_status?: string;
  to_status: string;
  created_at: Date;
}
