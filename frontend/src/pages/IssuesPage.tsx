import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { issueService } from '../services/issueService';
import { Issue } from '../types';
import Layout from '../components/Layout';

const IssuesPage: React.FC = () => {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    loadIssues();
  }, [searchParams]);

  const loadIssues = async () => {
    try {
      const filters = {
        status: searchParams.get('status') || undefined,
        type: searchParams.get('type') || undefined,
        site_id: searchParams.get('site_id') || undefined,
        run_id: searchParams.get('run_id') || undefined,
      };
      const data = await issueService.getAll(filters);
      setIssues(data);
    } catch (error) {
      console.error('Failed to load issues:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateFilter = (key: string, value: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (value) {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
    setSearchParams(newParams);
  };

  const getStatusBadge = (status: string) => {
    const statusClasses = {
      New: 'badge badge-new',
      'Open (For Dev)': 'badge badge-open',
      'Ready for QA': 'badge badge-ready',
      Resolved: 'badge badge-resolved',
      Rejected: 'badge badge-rejected',
    };
    return statusClasses[status as keyof typeof statusClasses] || 'badge';
  };

  const getSeverityBadge = (severity: string) => {
    const severityClasses = {
      Critical: 'badge badge-critical',
      Major: 'badge badge-major',
      Minor: 'badge badge-minor',
      Trivial: 'badge badge-trivial',
    };
    return severityClasses[severity as keyof typeof severityClasses] || 'badge';
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-12">Loading...</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <h1 className="text-3xl font-bold mb-6">Issues</h1>

      {/* Filters */}
      <div className="card mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="label">Status</label>
            <select
              value={searchParams.get('status') || ''}
              onChange={(e) => updateFilter('status', e.target.value)}
              className="input"
            >
              <option value="">All</option>
              <option value="New">New</option>
              <option value="Open (For Dev)">Open (For Dev)</option>
              <option value="Ready for QA">Ready for QA</option>
              <option value="Resolved">Resolved</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>
          <div>
            <label className="label">Type</label>
            <select
              value={searchParams.get('type') || ''}
              onChange={(e) => updateFilter('type', e.target.value)}
              className="input"
            >
              <option value="">All</option>
              <option value="Visual">Visual</option>
              <option value="Form">Form</option>
            </select>
          </div>
          <div>
            <label className="label">Severity</label>
            <select
              value={searchParams.get('severity') || ''}
              onChange={(e) => updateFilter('severity', e.target.value)}
              className="input"
            >
              <option value="">All</option>
              <option value="Critical">Critical</option>
              <option value="Major">Major</option>
              <option value="Minor">Minor</option>
              <option value="Trivial">Trivial</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => setSearchParams({})}
              className="btn btn-secondary w-full"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Issues List */}
      {issues.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-500">No issues found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {issues.map((issue) => (
            <Link
              key={issue.id}
              to={`/issues/${issue.id}`}
              className="card block hover:shadow-md transition-shadow"
            >
              <div className="flex gap-4">
                {issue.screenshot_url && (
                  <img
                    src={issue.screenshot_url}
                    alt="Screenshot"
                    className="w-32 h-20 object-cover rounded"
                  />
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={getStatusBadge(issue.status)}>{issue.status}</span>
                    <span className={getSeverityBadge(issue.severity)}>{issue.severity}</span>
                    <span className="badge">{issue.type}</span>
                  </div>
                  <h3 className="font-semibold mb-1">
                    {issue.title || `${issue.type} Issue`}
                  </h3>
                  <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                    {issue.description}
                  </p>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span>{issue.site_name}</span>
                    <span>•</span>
                    <span className="truncate max-w-md">{issue.url}</span>
                    <span>•</span>
                    <span>{new Date(issue.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {issues.length > 0 && (
        <div className="text-center text-gray-500 text-sm mt-6">
          Showing {issues.length} issue(s)
        </div>
      )}
    </Layout>
  );
};

export default IssuesPage;
