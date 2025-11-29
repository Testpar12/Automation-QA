import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import { VisualBaseline } from '../models';
import { config } from '../config';
import logger from '../utils/logger';

export interface FigmaConfig {
  fileKey: string;
  nodeId: string;
  accessToken: string;
}

export interface FigmaFrame {
  name: string;
  nodeId: string;
  imageUrl: string;
}

export class FigmaIntegration {
  private readonly FIGMA_API_BASE = 'https://api.figma.com/v1';

  async fetchFigmaDesign(
    fileKey: string,
    nodeId: string,
    accessToken: string
  ): Promise<string> {
    try {
      // Get image URL from Figma
      const imageUrl = await this.getFigmaImageUrl(fileKey, nodeId, accessToken);

      // Download the image
      const imageBuffer = await this.downloadImage(imageUrl);

      // Save to disk
      const savedPath = await this.saveImage(fileKey, nodeId, imageBuffer);

      logger.info(`Downloaded Figma design: ${fileKey}/${nodeId}`);
      return savedPath;
    } catch (error) {
      logger.error('Error fetching Figma design:', error);
      throw error;
    }
  }

  private async getFigmaImageUrl(
    fileKey: string,
    nodeId: string,
    accessToken: string
  ): Promise<string> {
    const url = `${this.FIGMA_API_BASE}/images/${fileKey}`;
    
    try {
      const response = await axios.get(url, {
        params: {
          ids: nodeId,
          format: 'png',
          scale: 2, // 2x for retina displays
        },
        headers: {
          'X-Figma-Token': accessToken,
        },
      });

      logger.info('Figma API response:', JSON.stringify(response.data, null, 2));

      if (!response.data.images || !response.data.images[nodeId]) {
        logger.error('Figma response missing images:', {
          hasImages: !!response.data.images,
          nodeId: nodeId,
          availableNodes: response.data.images ? Object.keys(response.data.images) : [],
          fullResponse: response.data
        });
        throw new Error('Failed to get image URL from Figma');
      }

      return response.data.images[nodeId];
    } catch (error: any) {
      if (error.response) {
        logger.error('Figma API error response:', {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        });
      }
      throw error;
    }
  }

  private async downloadImage(imageUrl: string): Promise<Buffer> {
    const response = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
    });

    return Buffer.from(response.data);
  }

  private async saveImage(fileKey: string, nodeId: string, imageBuffer: Buffer): Promise<string> {
    const figmaDir = path.join(config.upload.screenshotDir, 'figma-baselines');
    await fs.mkdir(figmaDir, { recursive: true });

    const filename = `${fileKey}-${nodeId}-${Date.now()}.png`;
    const filepath = path.join(figmaDir, filename);

    // Optimize and save the image
    await sharp(imageBuffer)
      .png({ compressionLevel: 6 })
      .toFile(filepath);

    return filepath;
  }

  async createFigmaBaseline(params: {
    siteId: string;
    pageUrl: string;
    figmaFileKey: string;
    figmaNodeId: string;
    figmaAccessToken: string;
    viewportWidth: number;
    viewportHeight: number;
    createdBy: string;
  }): Promise<any> {
    // Fetch the Figma design
    const screenshotPath = await this.fetchFigmaDesign(
      params.figmaFileKey,
      params.figmaNodeId,
      params.figmaAccessToken
    );

    // Get the image URL for reference
    const imageUrl = await this.getFigmaImageUrl(
      params.figmaFileKey,
      params.figmaNodeId,
      params.figmaAccessToken
    );

    // Create baseline record
    const baseline = await VisualBaseline.create({
      site_id: params.siteId,
      page_url: params.pageUrl,
      baseline_type: 'figma',
      screenshot_path: screenshotPath,
      figma_file_key: params.figmaFileKey,
      figma_node_id: params.figmaNodeId,
      figma_image_url: imageUrl,
      viewport_width: params.viewportWidth,
      viewport_height: params.viewportHeight,
      is_active: true,
      created_by: params.createdBy,
    });

    logger.info(`Created Figma baseline for ${params.pageUrl}`);
    return baseline;
  }

  async refreshFigmaBaseline(baselineId: string, accessToken: string): Promise<void> {
    const baseline = await VisualBaseline.findById(baselineId);

    if (!baseline || baseline.baseline_type !== 'figma') {
      throw new Error('Invalid baseline or not a Figma baseline');
    }

    // Fetch updated design
    const newScreenshotPath = await this.fetchFigmaDesign(
      baseline.figma_file_key!,
      baseline.figma_node_id!,
      accessToken
    );

    // Get updated image URL
    const newImageUrl = await this.getFigmaImageUrl(
      baseline.figma_file_key!,
      baseline.figma_node_id!,
      accessToken
    );

    // Delete old screenshot if it exists
    if (baseline.screenshot_path) {
      try {
        await fs.unlink(baseline.screenshot_path);
      } catch (error) {
        logger.warn('Failed to delete old Figma screenshot:', error);
      }
    }

    // Update baseline
    await VisualBaseline.findByIdAndUpdate(baselineId, {
      screenshot_path: newScreenshotPath,
      figma_image_url: newImageUrl,
    });

    logger.info(`Refreshed Figma baseline ${baselineId}`);
  }

  async getFigmaFile(fileKey: string, accessToken: string): Promise<any> {
    const url = `${this.FIGMA_API_BASE}/files/${fileKey}`;

    const response = await axios.get(url, {
      headers: {
        'X-Figma-Token': accessToken,
      },
    });

    return response.data;
  }

  async listFigmaFrames(fileKey: string, accessToken: string): Promise<FigmaFrame[]> {
    const fileData = await this.getFigmaFile(fileKey, accessToken);
    const frames: FigmaFrame[] = [];

    const traverseNodes = (node: any) => {
      if (node.type === 'FRAME' || node.type === 'COMPONENT') {
        frames.push({
          name: node.name,
          nodeId: node.id,
          imageUrl: '', // Will be fetched separately if needed
        });
      }

      if (node.children) {
        node.children.forEach(traverseNodes);
      }
    };

    if (fileData.document && fileData.document.children) {
      fileData.document.children.forEach(traverseNodes);
    }

    return frames;
  }
}
