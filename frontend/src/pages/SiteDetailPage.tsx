import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { siteService } from '../services/siteService';
import { runService } from '../services/runService';
import { Site, Run } from '../types';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';

const SiteDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [site, setSite] = useState<Site | null>(null);
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningTest, setRunningTest] = useState(false);
  const { user } = useAuth();

  const canRunTest = user?.role === 'qa' || user?.role === 'qa_lead';

  useEffect(() => {
    if (id && id !== 'undefined') {
      loadData();
      const interval = setInterval(loadData, 5000); // Refresh every 5 seconds
      return () => clearInterval(interval);
    } else {
      setLoading(false);
    }
  }, [id]);

  const loadData = async () => {
    if (!id || id === 'undefined') return;

    try {
      const [siteData, runsData] = await Promise.all([
        siteService.getById(id),
        runService.getAll(id),
      ]);
      setSite(siteData);
      setRuns(runsData);
    } catch (error) {
      console.error('Failed to load site:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRunTest = async () => {
    if (!id || id === 'undefined') return;

    setRunningTest(true);
    try {
      await runService.create(id);
      await loadData();
    } catch (error) {
      console.error('Failed to start test run:', error);
      alert('Failed to start test run');
    } finally {
      setRunningTest(false);
    }
  };

  const handleStopTest = async (runId: string) => {
    if (!confirm('Are you sure you want to stop this test run?')) {
      return;
    }

    try {
      await runService.stop(runId);
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

  if (!site) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-gray-600">Site not found</p>
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
        <Link
          to={`/projects/${site.project_id}`}
          className="text-primary-600 hover:underline mb-2 inline-block"
        >
          ← Back to Project
        </Link>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold mb-2">{site.name}</h1>
            <p className="text-gray-600 mb-2">{site.base_url}</p>
            <span className="badge badge-new">{site.environment}</span>
          </div>
          <div className="flex gap-3">
            <Link
              to={`/sites/${site.id}/baselines`}
              className="btn btn-secondary"
            >
              📊 Manage Baselines
            </Link>
            {canRunTest && (
              <button
                onClick={handleRunTest}
                disabled={runningTest}
                className="btn btn-primary"
              >
                {runningTest ? 'Starting...' : '▶ Run Test'}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="card">
          <div className="text-sm text-gray-600 mb-1">Open Issues</div>
          <div className="text-2xl font-bold">{site.open_issues_count || 0}</div>
        </div>
        <div className="card">
          <div className="text-sm text-gray-600 mb-1">Total Runs</div>
          <div className="text-2xl font-bold">{runs.length}</div>
        </div>
        <div className="card">
          <div className="text-sm text-gray-600 mb-1">Last Run</div>
          <div className="text-sm">
            {site.last_run_at
              ? new Date(site.last_run_at).toLocaleString()
              : 'Never'}
          </div>
        </div>
      </div>

      <h2 className="text-xl font-semibold mb-4">Test Runs</h2>

      {runs.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-500 mb-4">No test runs yet</p>
          {canRunTest && (
            <button onClick={handleRunTest} className="btn btn-primary">
              Run First Test
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {runs.map((run) => (
            <div key={run.id} className="card">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className={getStatusBadge(run.status)}>{run.status}</span>
                    <span className="text-sm text-gray-500">
                      {new Date(run.started_at).toLocaleString()}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600">
                    Triggered by: {run.triggered_by_name}
                  </div>
                  {run.status === 'Completed' && (
                    <div className="flex gap-4 mt-2 text-sm">
                      <span>Pages: {run.pages_processed}</span>
                      <span>Issues: {run.issues_created}</span>
                    </div>
                  )}
                  {run.error_message && (
                    <div className="text-sm text-red-600 mt-2">{run.error_message}</div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Link to={`/runs/${run.id}`} className="btn btn-secondary text-sm">
                    View Details
                  </Link>
                  {run.issues_created > 0 && (
                    <Link
                      to={`/issues?run_id=${run.id}`}
                      className="btn btn-primary text-sm"
                    >
                      View Issues ({run.issues_created})
                    </Link>
                  )}
                  {canRunTest && (run.status === 'Running' || run.status === 'Pending') && (
                    <button
                      onClick={() => handleStopTest(run.id)}
                      className="btn bg-red-600 hover:bg-red-700 text-white text-sm"
                    >
                      Stop
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Layout>
  );
};

export default SiteDetailPage;
