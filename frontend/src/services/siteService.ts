import api from './api';
import { Site } from '../types';

export const siteService = {
  async getAll(projectId?: string): Promise<Site[]> {
    const response = await api.get('/sites', {
      params: projectId ? { project_id: projectId } : {},
    });
    return response.data.sites;
  },

  async getById(id: string): Promise<Site> {
    const response = await api.get(`/sites/${id}`);
    return response.data.site;
  },

  async create(data: {
    project_id: string;
    name: string;
    base_url: string;
    environment: 'Staging' | 'Production' | 'Other';
  }): Promise<Site> {
    const response = await api.post('/sites', data);
    return response.data.site;
  },

  async update(
    id: string,
    data: {
      name?: string;
      base_url?: string;
      environment?: 'Staging' | 'Production' | 'Other';
    }
  ): Promise<Site> {
    const response = await api.patch(`/sites/${id}`, data);
    return response.data.site;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/sites/${id}`);
  },
};
