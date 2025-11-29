import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { runService } from '../services/runService';
import { baselineService, VisualDiff } from '../services/baselineService';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import { config } from '../config';

interface RunDetail {
  id: string;
  site_id: string;
  site_name: string;
  base_url: string;
  triggered_by_name: string;
  status: 'Pending' | 'Running' | 'Completed' | 'Failed';
  started_at: string;
  completed_at?: string;
  pages_processed: number;
  issues_created: number;
  error_message?: string;
}

interface Page {
  id: string;
  url: string;
  status_code?: number;
  screenshot_url?: string;
  render_failed?: boolean;
  render_error?: string;
}

interface IssueSummary {
  type: string;
  count: number;
}

const RunDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [run, setRun] = useState<RunDetail | null>(null);
  const [pages, setPages] = useState<Page[]>([]);
  const [issueSummary, setIssueSummary] = useState<IssueSummary[]>([]);
  const [visualDiffs, setVisualDiffs] = useState<VisualDiff[]>([]);
  const [loading, setLoading] = useState(true);

  const canStopTest = user?.role === 'qa' || user?.role === 'qa_lead';

  useEffect(() => {
    if (id && id !== 'undefined') {
      loadData();
      const interval = setInterval(loadData, 3000); // Refresh every 3 seconds
      return () => clearInterval(interval);
    } else {
      setLoading(false);
    }
  }, [id]);

  const loadData = async () => {
    if (!id || id === 'undefined') return;

    try {
      const data = await runService.getById(id);
      setRun(data.run as any);
      setPages(data.pages || []);
      setIssueSummary(data.issue_summary || []);
      
      // Load visual diffs
      try {
        const diffs = await baselineService.getVisualDiffsForRun(id);
        setVisualDiffs(diffs);
      } catch (error) {
        console.error('Failed to load visual diffs:', error);
      }
    } catch (error) {
      console.error('Failed to load run:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStopTest = async () => {
    if (!id || id === 'undefined') return;
    
    if (!confirm('Are you sure you want to stop this test run?')) {
      return;
    }

    try {
      await runService.stop(id);
      await loadData();
    } catch (error) {
      console.error('Failed to stop test run:', error);
      alert('Failed to stop test run');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusClasses = {
      Pending: 'badge badge-new',
      Running: 'badge badge-ready',
      Completed: 'badge badge-resolved',
      Failed: 'badge badge-critical',
    };
    return statusClasses[status as keyof typeof statusClasses] || 'badge';
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-12">Loading...</div>
      </Layout>
    );
  }

  if (!run) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-gray-600">Run not found</p>
          <Link to="/projects" className="text-blue-600 hover:underline mt-4 inline-block">
            Back to Projects
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">Test Run Details</h1>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <Link to={`/sites/${run.site_id}`} className="text-blue-600 hover:underline">
                {run.site_name}
              </Link>
              <span>•</span>
              <span>Triggered by {run.triggered_by_name}</span>
              <span>•</span>
              <span>{new Date(run.started_at).toLocaleString()}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={getStatusBadge(run.status)}>{run.status}</span>
            {canStopTest && (run.status === 'Running' || run.status === 'Pending') && (
              <button
                onClick={handleStopTest}
                className="btn bg-red-600 hover:bg-red-700 text-white"
              >
                Stop Test
              </button>
            )}
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="card">
            <div className="text-sm text-gray-600 mb-1">Status</div>
            <div className="text-2xl font-bold">{run.status}</div>
          </div>
          <div className="card">
            <div className="text-sm text-gray-600 mb-1">Pages Processed</div>
            <div className="text-2xl font-bold">{run.pages_processed || 0}</div>
          </div>
          <div className="card">
            <div className="text-sm text-gray-600 mb-1">Issues Created</div>
            <div className="text-2xl font-bold">{run.issues_created || 0}</div>
          </div>
          <div className="card">
            <div className="text-sm text-gray-600 mb-1">Duration</div>
            <div className="text-2xl font-bold">
              {run.completed_at
                ? `${Math.round((new Date(run.completed_at).getTime() - new Date(run.started_at).getTime()) / 1000)}s`
                : run.status === 'Running'
                ? `${Math.round((Date.now() - new Date(run.started_at).getTime()) / 1000)}s`
                : '-'}
            </div>
          </div>
        </div>

        {run.error_message && (
          <div className="card bg-red-50 border-red-200 mb-6">
            <h3 className="font-semibold text-red-800 mb-2">Error</h3>
            <p className="text-red-600">{run.error_message}</p>
          </div>
        )}

        {/* Issue Summary */}
        {issueSummary.length > 0 && (
          <div className="card mb-6">
            <h2 className="text-xl font-semibold mb-4">Issues by Type</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {issueSummary.map((item) => (
                <div key={item.type} className="text-center p-3 bg-gray-50 rounded">
                  <div className="text-sm text-gray-600 mb-1">{item.type}</div>
                  <div className="text-2xl font-bold">{item.count}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Visual Regression Results */}
        {visualDiffs.length > 0 && (
          <div className="card mb-6">
            <h2 className="text-xl font-semibold mb-4">Visual Regression Results</h2>
            <div className="space-y-3">
              {visualDiffs.map((diff) => (
                <div
                  key={diff.id}
                  className={`p-4 rounded border-2 ${
                    diff.passed
                      ? 'bg-green-50 border-green-200'
                      : 'bg-red-50 border-red-200'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <div className="font-semibold">
                        {diff.passed ? '✓ Passed' : '✗ Failed'} - Baseline Comparison
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        Difference: {diff.difference_percentage.toFixed(2)}% ({diff.pixel_diff_count.toLocaleString()} pixels)
                      </div>
                      <div className="text-sm text-gray-600">
                        Threshold: {diff.threshold_percentage}%
                      </div>
                    </div>
                    <span
                      className={`badge ${
                        diff.passed ? 'badge-resolved' : 'badge-critical'
                      }`}
                    >
                      {diff.passed ? 'PASS' : 'FAIL'}
                    </span>
                  </div>
                  {diff.diff_screenshot_path && !diff.passed && (
                    <div className="mt-2">
                      <a
                        href={`${config.apiBaseUrl}${diff.diff_screenshot_path.replace(/\\/g, '/').replace(/^.*uploads/, '/uploads')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline text-sm"
                      >
                        View Diff Image →
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pages */}
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Pages ({pages.length})</h2>
          {pages.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              {run.status === 'Running' ? 'Processing pages...' : 'No pages processed'}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3">URL</th>
                    <th className="text-left py-2 px-3">Status Code</th>
                    <th className="text-left py-2 px-3">Screenshot</th>
                    <th className="text-left py-2 px-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {pages.map((page) => (
                    <tr key={page.id} className="border-b hover:bg-gray-50">
                      <td className="py-2 px-3 max-w-md">
                        <a
                          href={page.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline text-sm break-all"
                        >
                          {page.url}
                        </a>
                      </td>
                      <td className="py-2 px-3">
                        <span
                          className={`inline-block px-2 py-1 rounded text-xs ${
                            page.status_code === 200
                              ? 'bg-green-100 text-green-800'
                              : page.status_code
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {page.status_code || '-'}
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        {page.screenshot_url ? (
                          <a
                            href={page.screenshot_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline text-sm"
                          >
                            View
                          </a>
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        )}
                      </td>
                      <td className="py-2 px-3">
                        {page.render_failed ? (
                          <span className="text-red-600 text-sm" title={page.render_error}>
                            Failed
                          </span>
                        ) : (
                          <span className="text-green-600 text-sm">Success</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default RunDetailPage;
