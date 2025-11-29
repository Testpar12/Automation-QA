import api from './api';
import { Run } from '../types';

export const runService = {
  async getAll(siteId?: string): Promise<Run[]> {
    const response = await api.get('/runs', {
      params: siteId ? { site_id: siteId } : {},
    });
    return response.data.runs;
  },

  async getById(id: string): Promise<{ run: Run; pages: any[]; issue_summary: any[] }> {
    const response = await api.get(`/runs/${id}`);
    return response.data;
  },

  async create(siteId: string): Promise<Run> {
    const response = await api.post('/runs', { site_id: siteId });
    return response.data.run;
  },

  async createCustom(siteId: string, pages: string[]): Promise<Run> {
    const response = await api.post('/runs/custom', { 
      site_id: siteId,
      custom_pages: pages 
    });
    return response.data.run;
  },

  async stop(id: string): Promise<Run> {
    const response = await api.patch(`/runs/${id}/stop`);
    return response.data.run;
  },
};
