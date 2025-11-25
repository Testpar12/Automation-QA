import api from './api';

export interface Baseline {
  id: string;
  site_id: string;
  page_url: string;
  baseline_type: 'screenshot' | 'figma' | 'manual';
  screenshot_path?: string;
  figma_file_key?: string;
  figma_node_id?: string;
  viewport_width: number;
  viewport_height: number;
  is_active: boolean;
  created_by: any;
  created_at: string;
  updated_at: string;
}

export interface VisualDiff {
  id: string;
  run_id: string;
  page_id: string;
  baseline_id: string;
  current_screenshot_path: string;
  diff_screenshot_path?: string;
  difference_percentage: number;
  pixel_diff_count: number;
  passed: boolean;
  threshold_percentage: number;
  created_at: string;
  page?: any;
  baseline?: any;
}

export interface FigmaFrame {
  name: string;
  nodeId: string;
  imageUrl: string;
}

class BaselineService {
  async getBaselinesForSite(siteId: string): Promise<Baseline[]> {
    const response = await api.get(`/sites/${siteId}/baselines`);
    return response.data;
  }

  async createScreenshotBaseline(data: {
    site_id: string;
    page_url: string;
    screenshot_path: string;
    viewport_width: number;
    viewport_height: number;
  }): Promise<Baseline> {
    const response = await api.post('/baselines/screenshot', data);
    return response.data;
  }

  async uploadManualBaseline(formData: FormData): Promise<Baseline> {
    const response = await api.post('/baselines/manual', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  async createFigmaBaseline(data: {
    site_id: string;
    page_url: string;
    figma_file_key: string;
    figma_node_id: string;
    figma_access_token: string;
    viewport_width: number;
    viewport_height: number;
  }): Promise<Baseline> {
    const response = await api.post('/baselines/figma', data);
    return response.data;
  }

  async listFigmaFrames(data: {
    figma_file_key: string;
    figma_access_token: string;
  }): Promise<FigmaFrame[]> {
    const response = await api.post('/figma/frames', data);
    return response.data;
  }

  async refreshFigmaBaseline(baselineId: string, figmaAccessToken: string): Promise<void> {
    await api.post(`/baselines/${baselineId}/refresh`, {
      figma_access_token: figmaAccessToken,
    });
  }

  async deactivateBaseline(baselineId: string): Promise<void> {
    await api.patch(`/baselines/${baselineId}/deactivate`);
  }

  async activateBaseline(baselineId: string): Promise<void> {
    await api.patch(`/baselines/${baselineId}/activate`);
  }

  async deleteBaseline(baselineId: string): Promise<void> {
    await api.delete(`/baselines/${baselineId}`);
  }

  async getVisualDiffsForRun(runId: string): Promise<VisualDiff[]> {
    const response = await api.get(`/runs/${runId}/visual-diffs`);
    return response.data;
  }
}

export const baselineService = new BaselineService();
