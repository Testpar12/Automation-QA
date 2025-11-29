import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { projectService } from '../services/projectService';
import { siteService } from '../services/siteService';
import { Project, Site } from '../types';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';

const ProjectDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    base_url: '',
    environment: 'Staging' as 'Staging' | 'Production' | 'Other',
  });
  const { user } = useAuth();

  const canCreateSite = user?.role === 'qa_lead';

  useEffect(() => {
    if (id && id !== 'undefined') {
      loadData();
    } else {
      setLoading(false);
    }
  }, [id]);

  const loadData = async () => {
    if (!id || id === 'undefined') return;
    
    try {
      const [projectData, sitesData] = await Promise.all([
        projectService.getById(id),
        siteService.getAll(id),
      ]);
      setProject(projectData);
      setSites(sitesData);
    } catch (error) {
      console.error('Failed to load project:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || id === 'undefined') return;

    try {
      await siteService.create({
        project_id: id,
        ...formData,
      });
      setShowCreateModal(false);
      setFormData({ name: '', base_url: '', environment: 'Staging' });
      loadData();
    } catch (error) {
      console.error('Failed to create site:', error);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-12">Loading...</div>
      </Layout>
    );
  }

  if (!project) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-gray-600">Project not found</p>
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
        <Link to="/projects" className="text-primary-600 hover:underline mb-2 inline-block">
          ← Back to Projects
        </Link>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold mb-2">{project.name}</h1>
            {project.client_name && (
              <p className="text-gray-600">{project.client_name}</p>
            )}
          </div>
          <div className="flex gap-2">
            <Link
              to={`/issues?project_id=${id}`}
              className="btn btn-secondary"
            >
              View Issues
            </Link>
            {canCreateSite && (
              <button onClick={() => setShowCreateModal(true)} className="btn btn-primary">
                + New Site
              </button>
            )}
          </div>
        </div>
      </div>

      <h2 className="text-xl font-semibold mb-4">Sites</h2>

      {sites.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-500 mb-4">No sites yet</p>
          {canCreateSite && (
            <button onClick={() => setShowCreateModal(true)} className="btn btn-primary">
              Create Your First Site
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sites.map((site) => (
            <div key={site.id} className="card">
              <div className="flex justify-between items-start mb-3">
                <h3 className="text-lg font-semibold">{site.name}</h3>
                <span className="badge badge-new">{site.environment}</span>
              </div>
              <p className="text-sm text-gray-600 mb-3 truncate">{site.base_url}</p>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">
                  {site.open_issues_count || 0} open issue(s)
                </span>
                <Link to={`/sites/${site.id}`} className="text-primary-600 hover:underline">
                  View →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Site Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-4">Create Site</h2>
            <form onSubmit={handleCreateSite} className="space-y-4">
              <div>
                <label className="label">Site Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="label">Base URL *</label>
                <input
                  type="url"
                  value={formData.base_url}
                  onChange={(e) => setFormData({ ...formData, base_url: e.target.value })}
                  className="input"
                  placeholder="https://example.com"
                  required
                />
              </div>
              <div>
                <label className="label">Environment *</label>
                <select
                  value={formData.environment}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      environment: e.target.value as 'Staging' | 'Production' | 'Other',
                    })
                  }
                  className="input"
                >
                  <option value="Staging">Staging</option>
                  <option value="Production">Production</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="flex space-x-3">
                <button type="submit" className="btn btn-primary flex-1">
                  Create
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn btn-secondary flex-1"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default ProjectDetailPage;
