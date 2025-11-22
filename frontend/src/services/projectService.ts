import api from './api';
import { Project } from '../types';

export const projectService = {
  async getAll(): Promise<Project[]> {
    const response = await api.get('/projects');
    return response.data.projects;
  },

  async getById(id: string): Promise<Project> {
    const response = await api.get(`/projects/${id}`);
    return response.data.project;
  },

  async create(data: { name: string; client_name?: string }): Promise<Project> {
    const response = await api.post('/projects', data);
    return response.data.project;
  },

  async update(id: string, data: { name?: string; client_name?: string }): Promise<Project> {
    const response = await api.patch(`/projects/${id}`, data);
    return response.data.project;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/projects/${id}`);
  },
};
