import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { baselineService, Baseline } from '../services/baselineService';
import Layout from '../components/Layout';

const BaselinesPage: React.FC = () => {
  const { siteId } = useParams<{ siteId: string }>();
  const [baselines, setBaselines] = useState<Baseline[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createType, setCreateType] = useState<'screenshot' | 'figma' | 'manual'>('manual');

  // Form states
  const [pageUrl, setPageUrl] = useState('');
  const [viewportWidth, setViewportWidth] = useState(1440);
  const [viewportHeight, setViewportHeight] = useState(900);
  const [figmaFileKey, setFigmaFileKey] = useState('');
  const [figmaNodeId, setFigmaNodeId] = useState('');
  const [figmaAccessToken, setFigmaAccessToken] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  useEffect(() => {
    if (siteId) {
      loadBaselines();
    }
  }, [siteId]);

  const loadBaselines = async () => {
    try {
      setLoading(true);
      const data = await baselineService.getBaselinesForSite(siteId!);
      setBaselines(data);
    } catch (error) {
      console.error('Failed to load baselines:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateManualBaseline = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!uploadFile) {
      alert('Please select an image file');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('image', uploadFile);
      formData.append('site_id', siteId!);
      formData.append('page_url', pageUrl);
      formData.append('viewport_width', viewportWidth.toString());
      formData.append('viewport_height', viewportHeight.toString());

      await baselineService.uploadManualBaseline(formData);
      setShowCreateModal(false);
      resetForm();
      loadBaselines();
    } catch (error: any) {
      alert('Failed to create baseline: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleCreateFigmaBaseline = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await baselineService.createFigmaBaseline({
        site_id: siteId!,
        page_url: pageUrl,
        figma_file_key: figmaFileKey,
        figma_node_id: figmaNodeId,
        figma_access_token: figmaAccessToken,
        viewport_width: viewportWidth,
        viewport_height: viewportHeight,
      });

      setShowCreateModal(false);
      resetForm();
      loadBaselines();
    } catch (error: any) {
      alert('Failed to create Figma baseline: ' + (error.response?.data?.error || error.message));
    }
  };

  const resetForm = () => {
    setPageUrl('');
    setViewportWidth(1440);
    setViewportHeight(900);
    setFigmaFileKey('');
    setFigmaNodeId('');
    setFigmaAccessToken('');
    setUploadFile(null);
  };

  const handleToggleActive = async (baseline: Baseline) => {
    try {
      if (baseline.is_active) {
        await baselineService.deactivateBaseline(baseline.id);
      } else {
        await baselineService.activateBaseline(baseline.id);
      }
      loadBaselines();
    } catch (error) {
      alert('Failed to update baseline status');
    }
  };

  const handleDelete = async (baselineId: string) => {
    if (!confirm('Are you sure you want to delete this baseline?')) return;

    try {
      await baselineService.deleteBaseline(baselineId);
      loadBaselines();
    } catch (error) {
      alert('Failed to delete baseline');
    }
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
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-3xl font-bold">Visual Baselines</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn btn-primary"
        >
          + Create Baseline
        </button>
      </div>

      {baselines.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-600 mb-4">No baselines created yet</p>
          <p className="text-sm text-gray-500">
            Create baselines to enable visual regression testing
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {baselines.map((baseline) => (
            <div key={baseline.id} className="card">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold">{baseline.page_url}</h3>
                    <span
                      className={`badge ${
                        baseline.baseline_type === 'figma'
                          ? 'badge-open'
                          : baseline.baseline_type === 'screenshot'
                          ? 'badge-ready'
                          : 'badge-new'
                      }`}
                    >
                      {baseline.baseline_type}
                    </span>
                    <span
                      className={`badge ${
                        baseline.is_active ? 'badge-resolved' : 'badge-rejected'
                      }`}
                    >
                      {baseline.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  <div className="text-sm text-gray-600 space-y-1">
                    <p>Viewport: {baseline.viewport_width}x{baseline.viewport_height}</p>
                    {baseline.figma_file_key && (
                      <p>Figma: {baseline.figma_file_key} / {baseline.figma_node_id}</p>
                    )}
                    <p>Created: {new Date(baseline.created_at).toLocaleString()}</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleToggleActive(baseline)}
                    className="btn btn-secondary text-sm"
                  >
                    {baseline.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                  <button
                    onClick={() => handleDelete(baseline.id)}
                    className="btn btn-danger text-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Baseline Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4">Create Baseline</h2>

            <div className="mb-4">
              <label className="label">Baseline Type</label>
              <select
                value={createType}
                onChange={(e) => setCreateType(e.target.value as any)}
                className="input"
              >
                <option value="manual">Manual Upload</option>
                <option value="figma">Figma Design</option>
              </select>
            </div>

            <form onSubmit={createType === 'figma' ? handleCreateFigmaBaseline : handleCreateManualBaseline}>
              <div className="mb-4">
                <label className="label">Page URL</label>
                <input
                  type="url"
                  value={pageUrl}
                  onChange={(e) => setPageUrl(e.target.value)}
                  className="input"
                  required
                  placeholder="https://example.com/page"
                />
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="label">Viewport Width</label>
                  <input
                    type="number"
                    value={viewportWidth}
                    onChange={(e) => setViewportWidth(parseInt(e.target.value))}
                    className="input"
                    required
                  />
                </div>
                <div>
                  <label className="label">Viewport Height</label>
                  <input
                    type="number"
                    value={viewportHeight}
                    onChange={(e) => setViewportHeight(parseInt(e.target.value))}
                    className="input"
                    required
                  />
                </div>
              </div>

              {createType === 'manual' && (
                <div className="mb-4">
                  <label className="label">Upload Image</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                    className="input"
                    required
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Upload a reference screenshot or design mockup
                  </p>
                </div>
              )}

              {createType === 'figma' && (
                <>
                  <div className="mb-4">
                    <label className="label">Figma File Key</label>
                    <input
                      type="text"
                      value={figmaFileKey}
                      onChange={(e) => setFigmaFileKey(e.target.value)}
                      className="input"
                      required
                      placeholder="e.g., abc123def456"
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      Found in the Figma file URL: figma.com/file/FILE_KEY/...
                    </p>
                  </div>

                  <div className="mb-4">
                    <label className="label">Figma Node ID</label>
                    <input
                      type="text"
                      value={figmaNodeId}
                      onChange={(e) => setFigmaNodeId(e.target.value)}
                      className="input"
                      required
                      placeholder="e.g., 123:456"
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      Right-click on a frame in Figma → Copy/Paste → Copy as → Copy link (node ID is at the end)
                    </p>
                  </div>

                  <div className="mb-4">
                    <label className="label">Figma Access Token</label>
                    <input
                      type="password"
                      value={figmaAccessToken}
                      onChange={(e) => setFigmaAccessToken(e.target.value)}
                      className="input"
                      required
                      placeholder="Your Figma personal access token"
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      Generate at: figma.com/settings (Account Settings → Personal Access Tokens)
                    </p>
                  </div>
                </>
              )}

              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    resetForm();
                  }}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create Baseline
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default BaselinesPage;
