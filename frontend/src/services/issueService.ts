import api from './api';
import { Issue, IssueComment, IssueStatusHistory } from '../types';

export const issueService = {
  async getAll(filters?: {
    project_id?: string;
    site_id?: string;
    run_id?: string;
    status?: string;
    type?: string;
    severity?: string;
  }): Promise<Issue[]> {
    const response = await api.get('/issues', { params: filters });
    return response.data.issues;
  },

  async getById(
    id: string
  ): Promise<{ issue: Issue; comments: IssueComment[]; history: IssueStatusHistory[] }> {
    const response = await api.get(`/issues/${id}`);
    return response.data;
  },

  async update(
    id: string,
    data: {
      title?: string;
      description?: string;
      severity?: string;
      status?: string;
      assigned_to?: string;
    }
  ): Promise<Issue> {
    const response = await api.patch(`/issues/${id}`, data);
    return response.data.issue;
  },

  async addComment(id: string, comment: string): Promise<IssueComment> {
    const response = await api.post(`/issues/${id}/comments`, { comment });
    return response.data.comment;
  },
};
