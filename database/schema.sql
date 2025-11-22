-- Autonomous Web QA Platform - Database Schema
-- MVP1 Version

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('qa', 'qa_lead', 'dev')),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Projects table
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    client_name VARCHAR(255),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sites table
CREATE TABLE sites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    base_url TEXT NOT NULL,
    environment VARCHAR(50) NOT NULL CHECK (environment IN ('Staging', 'Production', 'Other')),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Test runs table
CREATE TABLE runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    triggered_by UUID REFERENCES users(id),
    status VARCHAR(50) NOT NULL CHECK (status IN ('Pending', 'Running', 'Completed', 'Failed')),
    pages_processed INTEGER DEFAULT 0,
    issues_created INTEGER DEFAULT 0,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    error_message TEXT
);

-- Pages discovered during runs
CREATE TABLE pages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    run_id UUID NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    status_code INTEGER,
    screenshot_url TEXT,
    dom_snapshot TEXT,
    render_failed BOOLEAN DEFAULT FALSE,
    render_error TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Visual anomalies detected
CREATE TABLE visual_anomalies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    page_id UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
    anomaly_type VARCHAR(100) NOT NULL, -- 'horizontal_scroll', 'overlapping_elements', 'viewport_overflow'
    category VARCHAR(50) DEFAULT 'layout',
    message TEXT NOT NULL,
    severity VARCHAR(50) DEFAULT 'Major',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Forms detected and tested
CREATE TABLE form_tests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    page_id UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
    form_selector TEXT,
    form_fields JSONB, -- Array of field info
    test_result VARCHAR(50) NOT NULL CHECK (test_result IN ('Passed', 'Failed')),
    submit_status INTEGER,
    success_indicators TEXT[],
    error_indicators TEXT[],
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Issues (tickets)
CREATE TABLE issues (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    run_id UUID NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
    page_id UUID REFERENCES pages(id) ON DELETE SET NULL,
    url TEXT NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('Visual', 'Form')),
    title VARCHAR(500),
    description TEXT,
    screenshot_url TEXT,
    severity VARCHAR(50) NOT NULL DEFAULT 'Major' CHECK (severity IN ('Critical', 'Major', 'Minor', 'Trivial')),
    status VARCHAR(50) NOT NULL DEFAULT 'New' CHECK (status IN ('New', 'Open (For Dev)', 'Ready for QA', 'Resolved', 'Rejected')),
    assigned_to UUID REFERENCES users(id),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Issue comments
CREATE TABLE issue_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    issue_id UUID NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    comment TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Issue status history
CREATE TABLE issue_status_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    issue_id UUID NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    from_status VARCHAR(50),
    to_status VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_sites_project ON sites(project_id);
CREATE INDEX idx_runs_site ON runs(site_id);
CREATE INDEX idx_runs_status ON runs(status);
CREATE INDEX idx_pages_run ON pages(run_id);
CREATE INDEX idx_visual_anomalies_page ON visual_anomalies(page_id);
CREATE INDEX idx_form_tests_page ON form_tests(page_id);
CREATE INDEX idx_issues_site ON issues(site_id);
CREATE INDEX idx_issues_status ON issues(status);
CREATE INDEX idx_issues_type ON issues(type);
CREATE INDEX idx_issue_comments_issue ON issue_comments(issue_id);
CREATE INDEX idx_issue_status_history_issue ON issue_status_history(issue_id);

-- Updated at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sites_updated_at BEFORE UPDATE ON sites
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_issues_updated_at BEFORE UPDATE ON issues
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default admin user (password: Admin123!)
-- Password hash generated with bcrypt, rounds=10
INSERT INTO users (email, password_hash, role, first_name, last_name)
VALUES (
    'admin@example.com',
    '$2b$10$rKVZ9Y3oHYBYwIbZJQKXg.UKH2kLp5aVZMU6Y3oL0YDXYVXqZJKUi',
    'qa_lead',
    'Admin',
    'User'
);
