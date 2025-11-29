import fs from 'fs/promises';
import path from 'path';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
import sharp from 'sharp';
import { VisualBaseline, VisualDiff } from '../models';
import { config } from '../config';
import logger from '../utils/logger';

export interface VisualComparisonResult {
  passed: boolean;
  differencePercentage: number;
  pixelDiffCount: number;
  diffImagePath?: string;
  baselineId: string;
}

export class VisualRegressionTester {
  private readonly diffThreshold = 0.1; // Default 0.1% difference allowed

  async compareScreenshots(
    runId: string,
    pageId: string,
    pageUrl: string,
    currentScreenshotPath: string,
    siteId: string
  ): Promise<VisualComparisonResult[]> {
    const results: VisualComparisonResult[] = [];

    try {
      // Find active baselines for this page
      const baselines = await VisualBaseline.find({
        site_id: siteId,
        page_url: pageUrl,
        is_active: true,
      });

      if (baselines.length === 0) {
        logger.info(`No baselines found for ${pageUrl}`);
        return results;
      }

      // Compare against each baseline
      for (const baseline of baselines) {
        try {
          const result = await this.compareWithBaseline(
            runId,
            pageId,
            currentScreenshotPath,
            baseline
          );

          results.push(result);

          // Save diff result to database
          await VisualDiff.create({
            run_id: runId,
            page_id: pageId,
            baseline_id: baseline._id,
            current_screenshot_path: currentScreenshotPath,
            diff_screenshot_path: result.diffImagePath,
            difference_percentage: result.differencePercentage,
            pixel_diff_count: result.pixelDiffCount,
            passed: result.passed,
            threshold_percentage: this.diffThreshold,
          });

          logger.info(
            `Visual comparison for ${pageUrl} vs ${baseline.baseline_type}: ${result.passed ? 'PASSED' : 'FAILED'} (${result.differencePercentage.toFixed(2)}% diff)`
          );
        } catch (error) {
          logger.error(`Failed to compare with baseline ${baseline._id}:`, error);
        }
      }
    } catch (error) {
      logger.error('Error in visual regression testing:', error);
    }

    return results;
  }

  private async compareWithBaseline(
    runId: string,
    pageId: string,
    currentScreenshotPath: string,
    baseline: any
  ): Promise<VisualComparisonResult> {
    // Get baseline image path
    let baselineImagePath: string;

    if (baseline.baseline_type === 'screenshot' || baseline.baseline_type === 'manual') {
      baselineImagePath = baseline.screenshot_path;
    } else if (baseline.baseline_type === 'figma') {
      baselineImagePath = baseline.screenshot_path; // Figma images are downloaded and stored
    } else {
      throw new Error(`Unknown baseline type: ${baseline.baseline_type}`);
    }

    if (!baselineImagePath) {
      throw new Error('Baseline image path is missing');
    }

    // Load both images
    const [baselineImg, currentImg] = await Promise.all([
      this.loadImage(baselineImagePath),
      this.loadImage(currentScreenshotPath),
    ]);

    // Resize images to match if needed
    const { img1, img2 } = await this.normalizeImages(baselineImg, currentImg);

    // Create diff image
    const { width, height } = img1;
    const diff = new PNG({ width, height });

    // Compare images
    const pixelDiffCount = pixelmatch(
      img1.data,
      img2.data,
      diff.data,
      width,
      height,
      { threshold: 0.1 }
    );

    const totalPixels = width * height;
    const differencePercentage = (pixelDiffCount / totalPixels) * 100;
    const passed = differencePercentage <= this.diffThreshold;

    // Save diff image
    const diffImagePath = await this.saveDiffImage(runId, pageId, diff, baseline._id.toString());

    return {
      passed,
      differencePercentage,
      pixelDiffCount,
      diffImagePath,
      baselineId: baseline._id.toString(),
    };
  }

  private async loadImage(imagePath: string): Promise<PNG> {
    let fullPath = imagePath;
    
    // If path is not absolute, make it relative to the project root
    if (!path.isAbsolute(imagePath)) {
      fullPath = path.join(__dirname, '../../', imagePath);
    }
    
    // If path doesn't exist, try different common locations
    const fs = require('fs').promises;
    if (!await fs.access(fullPath).then(() => true).catch(() => false)) {
      // Try with uploads prefix if not present
      if (!imagePath.includes('uploads')) {
        const withUploads = path.join(__dirname, '../../uploads', imagePath);
        if (await fs.access(withUploads).then(() => true).catch(() => false)) {
          fullPath = withUploads;
        }
      }
    }
    
    console.log(`Loading image from: ${fullPath}`);
    const imageBuffer = await fs.readFile(fullPath);
    const png = PNG.sync.read(imageBuffer);
    return png;
  }

  private async normalizeImages(
    img1: PNG,
    img2: PNG
  ): Promise<{ img1: PNG; img2: PNG }> {
    // If images are the same size, return as-is
    if (img1.width === img2.width && img1.height === img2.height) {
      return { img1, img2 };
    }

    // Resize to match the larger dimensions
    const targetWidth = Math.max(img1.width, img2.width);
    const targetHeight = Math.max(img1.height, img2.height);

    const [resized1, resized2] = await Promise.all([
      this.resizeImage(img1, targetWidth, targetHeight),
      this.resizeImage(img2, targetWidth, targetHeight),
    ]);

    return { img1: resized1, img2: resized2 };
  }

  private async resizeImage(img: PNG, width: number, height: number): Promise<PNG> {
    const buffer = PNG.sync.write(img);
    const resizedBuffer = await sharp(buffer)
      .resize(width, height, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
      .png()
      .toBuffer();

    return PNG.sync.read(resizedBuffer);
  }

  private async saveDiffImage(
    runId: string,
    pageId: string,
    diff: PNG,
    baselineId: string
  ): Promise<string> {
    const diffDir = path.join(config.upload.screenshotDir, runId, 'diffs');
    await fs.mkdir(diffDir, { recursive: true });

    const filename = `diff-${pageId}-${baselineId}-${Date.now()}.png`;
    const filepath = path.join(diffDir, filename);

    const buffer = PNG.sync.write(diff);
    await fs.writeFile(filepath, buffer);

    return filepath;
  }

  async createBaseline(params: {
    siteId: string;
    pageUrl: string;
    screenshotPath: string;
    baselineType: 'screenshot' | 'manual';
    viewportWidth: number;
    viewportHeight: number;
    createdBy: string;
  }): Promise<any> {
    const baseline = await VisualBaseline.create({
      site_id: params.siteId,
      page_url: params.pageUrl,
      baseline_type: params.baselineType,
      screenshot_path: params.screenshotPath,
      viewport_width: params.viewportWidth,
      viewport_height: params.viewportHeight,
      is_active: true,
      created_by: params.createdBy,
    });

    logger.info(`Created baseline for ${params.pageUrl}`);
    return baseline;
  }

  async getBaselinesForSite(siteId: string): Promise<any[]> {
    return await VisualBaseline.find({ site_id: siteId, is_active: true });
  }

  async deactivateBaseline(baselineId: string): Promise<void> {
    await VisualBaseline.findByIdAndUpdate(baselineId, { is_active: false });
  }

  async getVisualDiffsForRun(runId: string): Promise<any[]> {
    return await VisualDiff.find({ run_id: runId })
      .populate('baseline_id')
      .populate('page_id');
  }
}
