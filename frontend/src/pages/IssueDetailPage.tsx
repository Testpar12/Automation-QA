import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { issueService } from '../services/issueService';
import { Issue, IssueComment, IssueStatusHistory } from '../types';
import Layout from '../components/Layout';

const IssueDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [issue, setIssue] = useState<Issue | null>(null);
  const [comments, setComments] = useState<IssueComment[]>([]);
  const [history, setHistory] = useState<IssueStatusHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [editedIssue, setEditedIssue] = useState<Partial<Issue>>({});
  const [showAnnotations, setShowAnnotations] = useState(true);
  const [selectedViewport, setSelectedViewport] = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // Get unique viewports from metadata
  const getViewports = () => {
    if (!issue?.metadata?.issues) return [];
    const viewports = new Set<string>();
    issue.metadata.issues.forEach(metaIssue => {
      if (metaIssue.viewport) {
        viewports.add(metaIssue.viewport);
      }
    });
    return Array.from(viewports);
  };

  useEffect(() => {
    if (id) {
      loadIssue();
    }
  }, [id]);

  const loadIssue = async () => {
    if (!id) return;
    
    try {
      const data = await issueService.getById(id);
      setIssue(data.issue);
      setComments(data.comments);
      setHistory(data.history);
      setEditedIssue({
        title: data.issue.title,
        description: data.issue.description,
        severity: data.issue.severity,
        status: data.issue.status,
        assigned_to: data.issue.assigned_to,
      });
    } catch (error) {
      console.error('Failed to load issue:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!id || !issue) return;

    try {
      await issueService.update(id, editedIssue);
      await loadIssue();
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update issue:', error);
      alert('Failed to update issue');
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !newComment.trim()) return;

    try {
      await issueService.addComment(id, newComment);
      setNewComment('');
      await loadIssue();
    } catch (error) {
      console.error('Failed to add comment:', error);
      alert('Failed to add comment');
    }
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

  if (!issue) {
    return (
      <Layout>
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold mb-4">Issue Not Found</h2>
          <Link to="/issues" className="btn btn-primary">
            Back to Issues
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mb-6">
        <Link to="/issues" className="text-blue-600 hover:underline">
          ← Back to Issues
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Issue Details */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-2xl font-bold">
                {issue.title || `${issue.type} Issue`}
              </h1>
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="btn btn-secondary btn-sm"
              >
                {isEditing ? 'Cancel' : 'Edit'}
              </button>
            </div>

            <div className="flex gap-2 mb-4">
              <span className={getStatusBadge(issue.status)}>{issue.status}</span>
              <span className={getSeverityBadge(issue.severity)}>{issue.severity}</span>
              <span className="badge">{issue.type}</span>
            </div>

            {isEditing ? (
              <div className="space-y-4">
                <div>
                  <label className="label">Title</label>
                  <input
                    type="text"
                    value={editedIssue.title || ''}
                    onChange={(e) =>
                      setEditedIssue({ ...editedIssue, title: e.target.value })
                    }
                    className="input"
                  />
                </div>

                <div>
                  <label className="label">Description</label>
                  <textarea
                    value={editedIssue.description || ''}
                    onChange={(e) =>
                      setEditedIssue({ ...editedIssue, description: e.target.value })
                    }
                    rows={6}
                    className="input"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Status</label>
                    <select
                      value={editedIssue.status || ''}
                      onChange={(e) =>
                        setEditedIssue({ ...editedIssue, status: e.target.value as Issue['status'] })
                      }
                      className="input"
                    >
                      <option value="New">New</option>
                      <option value="Open (For Dev)">Open (For Dev)</option>
                      <option value="Ready for QA">Ready for QA</option>
                      <option value="Resolved">Resolved</option>
                      <option value="Rejected">Rejected</option>
                    </select>
                  </div>

                  <div>
                    <label className="label">Severity</label>
                    <select
                      value={editedIssue.severity || ''}
                      onChange={(e) =>
                        setEditedIssue({ ...editedIssue, severity: e.target.value as Issue['severity'] })
                      }
                      className="input"
                    >
                      <option value="Critical">Critical</option>
                      <option value="Major">Major</option>
                      <option value="Minor">Minor</option>
                      <option value="Trivial">Trivial</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button onClick={handleUpdate} className="btn btn-primary">
                    Save Changes
                  </button>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-gray-700 whitespace-pre-wrap mb-4">
                  {issue.description || 'No description provided'}
                </p>
              </div>
            )}

            {/* Screenshot with Annotations */}
            {issue.screenshot_url && (
              <div className="mt-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold">Screenshot</h3>
                  <div className="flex gap-2">
                    {getViewports().length > 0 && (
                      <select
                        value={selectedViewport || ''}
                        onChange={(e) => setSelectedViewport(e.target.value || null)}
                        className="text-sm px-3 py-1 border border-gray-300 rounded"
                      >
                        <option value="">All Issues</option>
                        {getViewports().map(vp => (
                          <option key={vp} value={vp}>{vp}</option>
                        ))}
                      </select>
                    )}
                    {issue.metadata?.issues && issue.metadata.issues.some(i => i.elements && i.elements.length > 0) && (
                      <button
                        onClick={() => setShowAnnotations(!showAnnotations)}
                        className="text-sm px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded"
                      >
                        {showAnnotations ? 'Hide' : 'Show'} Markers
                      </button>
                    )}
                  </div>
                </div>
                <div className="border rounded bg-gray-50 p-4 overflow-auto">
                  <div className="relative inline-block" style={{ maxWidth: '100%' }}>
                    <img
                      ref={imgRef}
                      src={issue.screenshot_url}
                      alt="Issue screenshot"
                      className="border rounded shadow-sm"
                      style={{ 
                        maxWidth: '100%',
                        height: 'auto',
                        display: 'block'
                      }}
                    />
                    {showAnnotations && issue.metadata?.issues && imgRef.current && (
                      <svg
                        className="absolute top-0 left-0 pointer-events-none"
                        style={{
                          width: imgRef.current.width,
                          height: imgRef.current.height
                        }}
                      >
                        {issue.metadata.issues
                          .filter(metaIssue => !selectedViewport || metaIssue.viewport === selectedViewport)
                          .map((metaIssue, issueIdx) =>
                          metaIssue.elements?.slice(0, 10).map((element, elemIdx) => {
                            const scaleX = imgRef.current!.width / imgRef.current!.naturalWidth;
                            const scaleY = imgRef.current!.height / imgRef.current!.naturalHeight;
                            const scaledX = element.x * scaleX;
                            const scaledY = element.y * scaleY;
                            const scaledWidth = element.width * scaleX;
                            const scaledHeight = element.height * scaleY;
                            
                            // Only show if element is visible in viewport
                            if (scaledX < 0 || scaledY < 0 || scaledX > imgRef.current!.width) {
                              return null;
                            }
                            
                            return (
                              <g key={`${issueIdx}-${elemIdx}`}>
                                <rect
                                  x={scaledX}
                                  y={scaledY}
                                  width={scaledWidth}
                                  height={scaledHeight}
                                  fill="rgba(255, 0, 0, 0.15)"
                                  stroke="#ef4444"
                                  strokeWidth="2"
                                  strokeDasharray="4,4"
                                />
                                {elemIdx < 5 && ( // Only label first 5 to avoid clutter
                                  <text
                                    x={scaledX + 4}
                                    y={scaledY - 4}
                                    fill="#dc2626"
                                    fontSize="11"
                                    fontWeight="bold"
                                    style={{ textShadow: '0 0 3px white, 0 0 3px white' }}
                                  >
                                    #{elemIdx + 1}
                                  </text>
                                )}
                              </g>
                            );
                          })
                        )}
                      </svg>
                    )}
                  </div>
                </div>
                {issue.metadata?.issues && showAnnotations && (
                  <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded">
                    <h4 className="font-semibold text-sm mb-3 text-blue-900">🔍 Detected Issues:</h4>
                    <div className="space-y-3">
                      {issue.metadata.issues
                        .filter(metaIssue => !selectedViewport || metaIssue.viewport === selectedViewport)
                        .map((metaIssue, idx) => (
                        <div key={idx} className="text-sm bg-white p-3 rounded border border-blue-100">
                          <div className="flex items-start gap-2">
                            <span className="font-semibold text-red-600 min-w-fit">
                              [{metaIssue.severity}]
                            </span>
                            <div className="flex-1">
                              <div className="font-medium text-gray-900">{metaIssue.type}</div>
                              <div className="text-gray-600 mt-1">{metaIssue.description}</div>
                              {metaIssue.viewport && (
                                <div className="text-xs text-gray-500 mt-1">
                                  Viewport: {metaIssue.viewport}
                                </div>
                              )}
                              {metaIssue.elements && metaIssue.elements.length > 0 && (
                                <div className="mt-2 text-xs">
                                  <span className="inline-block px-2 py-1 bg-red-100 text-red-700 rounded">
                                    {metaIssue.elements.length > 10 
                                      ? `${metaIssue.elements.length} elements (showing first 10)` 
                                      : `${metaIssue.elements.length} element(s) marked`}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Issue Info */}
            <div className="mt-6 pt-6 border-t space-y-2 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-gray-500">URL:</span>
                  <a
                    href={issue.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline ml-2"
                  >
                    {issue.url}
                  </a>
                </div>
                <div>
                  <span className="text-gray-500">Site:</span>
                  <Link
                    to={`/sites/${issue.site_id}`}
                    className="text-blue-600 hover:underline ml-2"
                  >
                    {issue.site_name}
                  </Link>
                </div>
                <div>
                  <span className="text-gray-500">Project:</span>
                  <Link
                    to={`/projects/${issue.project_id}`}
                    className="text-blue-600 hover:underline ml-2"
                  >
                    {issue.project_name}
                  </Link>
                </div>
                <div>
                  <span className="text-gray-500">Test Run:</span>
                  <Link
                    to={`/runs/${issue.run_id}`}
                    className="text-blue-600 hover:underline ml-2"
                  >
                    View Run
                  </Link>
                </div>
                <div>
                  <span className="text-gray-500">Created:</span>
                  <span className="ml-2">
                    {new Date(issue.created_at).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Updated:</span>
                  <span className="ml-2">
                    {new Date(issue.updated_at).toLocaleString()}
                  </span>
                </div>
                {issue.created_by_name && (
                  <div>
                    <span className="text-gray-500">Created By:</span>
                    <span className="ml-2">{issue.created_by_name}</span>
                  </div>
                )}
                {issue.assigned_to_name && (
                  <div>
                    <span className="text-gray-500">Assigned To:</span>
                    <span className="ml-2">{issue.assigned_to_name}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Comments */}
          <div className="card">
            <h2 className="text-xl font-bold mb-4">Comments</h2>

            {comments.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No comments yet</p>
            ) : (
              <div className="space-y-4 mb-6">
                {comments.map((comment) => (
                  <div key={comment.id} className="border-l-4 border-blue-500 pl-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold">{comment.user_name}</span>
                      <span className="badge badge-sm">{comment.user_role}</span>
                      <span className="text-sm text-gray-500">
                        {new Date(comment.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-gray-700 whitespace-pre-wrap">
                      {comment.comment}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Add Comment Form */}
            <form onSubmit={handleAddComment} className="mt-6">
              <label className="label">Add Comment</label>
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                rows={3}
                className="input mb-2"
                placeholder="Write a comment..."
              />
              <button
                type="submit"
                disabled={!newComment.trim()}
                className="btn btn-primary"
              >
                Add Comment
              </button>
            </form>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status History */}
          <div className="card">
            <h2 className="text-lg font-bold mb-4">History</h2>
            {history.length === 0 ? (
              <p className="text-gray-500 text-sm">No history yet</p>
            ) : (
              <div className="space-y-3">
                {history.map((item) => (
                  <div key={item.id} className="text-sm">
                    <div className="font-semibold">{item.user_name}</div>
                    <div className="text-gray-600">
                      {item.from_status ? (
                        <>
                          Changed status from{' '}
                          <span className={getStatusBadge(item.from_status)}>
                            {item.from_status}
                          </span>{' '}
                          to{' '}
                          <span className={getStatusBadge(item.to_status)}>
                            {item.to_status}
                          </span>
                        </>
                      ) : (
                        <>
                          Set status to{' '}
                          <span className={getStatusBadge(item.to_status)}>
                            {item.to_status}
                          </span>
                        </>
                      )}
                    </div>
                    <div className="text-gray-500 text-xs">
                      {new Date(item.created_at).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="card">
            <h2 className="text-lg font-bold mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <Link
                to={`/runs/${issue.run_id}`}
                className="block w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-center font-medium transition-colors"
              >
                View Test Run
              </Link>
              <Link
                to={`/sites/${issue.site_id}`}
                className="block w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-center font-medium transition-colors"
              >
                View Site
              </Link>
              <Link
                to={`/projects/${issue.project_id}`}
                className="block w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-center font-medium transition-colors"
              >
                View Project
              </Link>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default IssueDetailPage;
