import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  email: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  role: 'qa' | 'qa_lead' | 'dev';
  created_at: Date;
  updated_at: Date;
}

const UserSchema = new Schema<IUser>({
  email: { type: String, required: true, unique: true },
  password_hash: { type: String, required: true },
  first_name: { type: String, required: true },
  last_name: { type: String, required: true },
  role: { type: String, enum: ['qa', 'qa_lead', 'dev'], default: 'qa' },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

export const User = mongoose.model<IUser>('User', UserSchema);

export interface IProject extends Document {
  name: string;
  client_name?: string;
  created_by: mongoose.Types.ObjectId;
  created_at: Date;
  updated_at: Date;
}

const ProjectSchema = new Schema<IProject>({
  name: { type: String, required: true },
  client_name: { type: String },
  created_by: { type: Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

export const Project = mongoose.model<IProject>('Project', ProjectSchema);

export interface ISite extends Document {
  project_id: mongoose.Types.ObjectId;
  name: string;
  base_url: string;
  environment: 'Staging' | 'Production' | 'Other';
  created_by: mongoose.Types.ObjectId;
  created_at: Date;
  updated_at: Date;
}

const SiteSchema = new Schema<ISite>({
  project_id: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
  name: { type: String, required: true },
  base_url: { type: String, required: true },
  environment: { type: String, enum: ['Staging', 'Production', 'Other'], default: 'Staging' },
  created_by: { type: Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

export const Site = mongoose.model<ISite>('Site', SiteSchema);

export interface IRun extends Document {
  site_id: mongoose.Types.ObjectId;
  status: 'Pending' | 'Running' | 'Completed' | 'Failed';
  triggered_by: mongoose.Types.ObjectId;
  started_at?: Date;
  completed_at?: Date;
  pages_processed?: number;
  issues_created?: number;
  error_message?: string;
  created_at: Date;
  updated_at: Date;
}

const RunSchema = new Schema<IRun>({
  site_id: { type: Schema.Types.ObjectId, ref: 'Site', required: true },
  status: { type: String, enum: ['Pending', 'Running', 'Completed', 'Failed'], default: 'Pending' },
  triggered_by: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  started_at: { type: Date, default: Date.now },
  completed_at: { type: Date },
  pages_processed: { type: Number, default: 0 },
  issues_created: { type: Number, default: 0 },
  error_message: { type: String },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

export const Run = mongoose.model<IRun>('Run', RunSchema);

export interface IPage extends Document {
  run_id: mongoose.Types.ObjectId;
  url: string;
  title?: string;
  status_code?: number;
  screenshot_url?: string;
  dom_snapshot?: string;
  load_time_ms?: number;
  render_failed?: boolean;
  render_error?: string;
  depth?: number;
  created_at: Date;
}

const PageSchema = new Schema<IPage>({
  run_id: { type: Schema.Types.ObjectId, ref: 'Run', required: true },
  url: { type: String, required: true },
  title: { type: String },
  status_code: { type: Number },
  screenshot_url: { type: String },
  dom_snapshot: { type: String },
  load_time_ms: { type: Number },
  render_failed: { type: Boolean, default: false },
  render_error: { type: String },
  depth: { type: Number, default: 0 },
  created_at: { type: Date, default: Date.now },
});

export const Page = mongoose.model<IPage>('Page', PageSchema);

export interface IIssue extends Document {
  project_id: mongoose.Types.ObjectId;
  site_id: mongoose.Types.ObjectId;
  run_id: mongoose.Types.ObjectId;
  page_id?: mongoose.Types.ObjectId;
  type: 'Visual' | 'Form' | 'Performance' | 'Accessibility' | 'SEO' | 'Broken Link' | 'JavaScript Error' | 'Other';
  severity: 'Critical' | 'Major' | 'Minor' | 'Trivial';
  title: string;
  description: string;
  url?: string;
  screenshot_url?: string;
  status: 'New' | 'Open (For Dev)' | 'Ready for QA' | 'Resolved' | 'Rejected';
  assigned_to?: mongoose.Types.ObjectId;
  created_by?: mongoose.Types.ObjectId;
  created_at: Date;
  updated_at: Date;
}

const IssueSchema = new Schema<IIssue>({
  project_id: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
  site_id: { type: Schema.Types.ObjectId, ref: 'Site', required: true },
  run_id: { type: Schema.Types.ObjectId, ref: 'Run', required: true },
  page_id: { type: Schema.Types.ObjectId, ref: 'Page' },
  type: { type: String, enum: ['Visual', 'Form', 'Performance', 'Accessibility', 'SEO', 'Broken Link', 'JavaScript Error', 'Other'], required: true },
  severity: { type: String, enum: ['Critical', 'Major', 'Minor', 'Trivial'], default: 'Major' },
  title: { type: String, required: true },
  description: { type: String, required: true },
  url: { type: String },
  screenshot_url: { type: String },
  status: { type: String, enum: ['New', 'Open (For Dev)', 'Ready for QA', 'Resolved', 'Rejected'], default: 'New' },
  assigned_to: { type: Schema.Types.ObjectId, ref: 'User' },
  created_by: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

export const Issue = mongoose.model<IIssue>('Issue', IssueSchema);

export interface IIssueComment extends Document {
  issue_id: mongoose.Types.ObjectId;
  user_id: mongoose.Types.ObjectId;
  comment: string;
  created_at: Date;
}

const IssueCommentSchema = new Schema<IIssueComment>({
  issue_id: { type: Schema.Types.ObjectId, ref: 'Issue', required: true },
  user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  comment: { type: String, required: true },
  created_at: { type: Date, default: Date.now },
});

export const IssueComment = mongoose.model<IIssueComment>('IssueComment', IssueCommentSchema);

export interface IIssueStatusHistory extends Document {
  issue_id: mongoose.Types.ObjectId;
  user_id: mongoose.Types.ObjectId;
  from_status: string;
  to_status: string;
  created_at: Date;
}

const IssueStatusHistorySchema = new Schema<IIssueStatusHistory>({
  issue_id: { type: Schema.Types.ObjectId, ref: 'Issue', required: true },
  user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  from_status: { type: String, required: true },
  to_status: { type: String, required: true },
  created_at: { type: Date, default: Date.now },
});

export const IssueStatusHistory = mongoose.model<IIssueStatusHistory>('IssueStatusHistory', IssueStatusHistorySchema);

// Visual Regression Models
export interface IVisualBaseline extends Document {
  site_id: mongoose.Types.ObjectId;
  page_url: string;
  baseline_type: 'screenshot' | 'figma' | 'manual';
  screenshot_path?: string;
  figma_file_key?: string;
  figma_node_id?: string;
  figma_image_url?: string;
  viewport_width: number;
  viewport_height: number;
  is_active: boolean;
  created_by: mongoose.Types.ObjectId;
  created_at: Date;
  updated_at: Date;
}

const VisualBaselineSchema = new Schema<IVisualBaseline>({
  site_id: { type: Schema.Types.ObjectId, ref: 'Site', required: true },
  page_url: { type: String, required: true },
  baseline_type: { type: String, enum: ['screenshot', 'figma', 'manual'], required: true },
  screenshot_path: { type: String },
  figma_file_key: { type: String },
  figma_node_id: { type: String },
  figma_image_url: { type: String },
  viewport_width: { type: Number, required: true },
  viewport_height: { type: Number, required: true },
  is_active: { type: Boolean, default: true },
  created_by: { type: Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

export const VisualBaseline = mongoose.model<IVisualBaseline>('VisualBaseline', VisualBaselineSchema);

export interface IVisualDiff extends Document {
  run_id: mongoose.Types.ObjectId;
  page_id: mongoose.Types.ObjectId;
  baseline_id: mongoose.Types.ObjectId;
  current_screenshot_path: string;
  diff_screenshot_path?: string;
  difference_percentage: number;
  pixel_diff_count: number;
  passed: boolean;
  threshold_percentage: number;
  created_at: Date;
}

const VisualDiffSchema = new Schema<IVisualDiff>({
  run_id: { type: Schema.Types.ObjectId, ref: 'Run', required: true },
  page_id: { type: Schema.Types.ObjectId, ref: 'Page', required: true },
  baseline_id: { type: Schema.Types.ObjectId, ref: 'VisualBaseline', required: true },
  current_screenshot_path: { type: String, required: true },
  diff_screenshot_path: { type: String },
  difference_percentage: { type: Number, required: true },
  pixel_diff_count: { type: Number, required: true },
  passed: { type: Boolean, required: true },
  threshold_percentage: { type: Number, default: 0.1 },
}, { timestamps: { createdAt: 'created_at', updatedAt: false } });

export const VisualDiff = mongoose.model<IVisualDiff>('VisualDiff', VisualDiffSchema);
