import { chromium, Browser, Page } from 'playwright';
import { Run, Site, Page as PageModel } from '../models';
import { config } from '../config';
import { CRAWL_CONFIG, EXCLUDED_PATTERNS } from '../config/constants';
import { PageCrawler } from './pageCrawler.js';
import { VisualAnalyzer } from './visualAnalyzer.js';
import { FormTester } from './formTester.js';
import { IssueCreator } from './issueCreator.js';
import { BrokenLinkDetector } from './brokenLinkDetector.js';
import { AccessibilityTester } from './accessibilityTester.js';
import { PerformanceTester } from './performanceTester.js';
import { SEOTester } from './seoTester.js';
import { MobileTester } from './mobileTester.js';
import { JSErrorDetector } from './jsErrorDetector.js';
import { VisualRegressionTester } from './visualRegressionTester.js';
import logger from '../utils/logger';
import path from 'path';
import fs from 'fs/promises';

export class TestRunner {
  private browser: Browser | null = null;

  async executeRun(runId: string, site: any) {
    try {
      logger.info(`Starting test run ${runId} for site ${site.name}`);

      // Update run status to Running
      await Run.findByIdAndUpdate(runId, {
        status: 'Running'
      });

      // Launch browser
      this.browser = await chromium.launch({
        headless: true,
      });

      // 1. Crawl and discover pages
      const crawler = new PageCrawler(this.browser);
      const urls = await crawler.discoverPages(site.base_url);
      
      logger.info(`Discovered ${urls.length} pages for run ${runId}`);

      // 2. Process each page
      let pagesProcessed = 0;
      let issuesCreated = 0;

      for (const url of urls) {
        try {
          const pageResult = await this.processPage(runId, url, site);
          pagesProcessed++;
          issuesCreated += pageResult.issuesCreated;
        } catch (error) {
          logger.error(`Failed to process page ${url}:`, error);
        }
      }

      // Update run as completed
      await Run.findByIdAndUpdate(runId, {
        status: 'Completed',
        completed_at: new Date(),
        pages_processed: pagesProcessed,
        issues_created: issuesCreated
      });

      logger.info(`Completed test run ${runId}: ${pagesProcessed} pages, ${issuesCreated} issues`);

    } catch (error: any) {
      logger.error(`Test run ${runId} failed:`, error);

      await Run.findByIdAndUpdate(runId, {
        status: 'Failed',
        completed_at: new Date(),
        error_message: error.message
      });
    } finally {
      if (this.browser) {
        await this.browser.close();
      }
    }
  }

  private async processPage(runId: string, url: string, site: any): Promise<{ issuesCreated: number }> {
    const page = await this.browser!.newPage({
      viewport: {
        width: CRAWL_CONFIG.VIEWPORT_WIDTH,
        height: CRAWL_CONFIG.VIEWPORT_HEIGHT,
      },
    });

    let issuesCreated = 0;
    let pageDoc = null;

    try {
      // Navigate to page
      const response = await page.goto(url, {
        waitUntil: 'networkidle',
        timeout: CRAWL_CONFIG.PAGE_TIMEOUT,
      });

      // Wait additional time for dynamic content
      await page.waitForTimeout(CRAWL_CONFIG.NETWORK_IDLE_TIMEOUT);

      const statusCode = response?.status() || 0;

      if (statusCode !== 200) {
        logger.warn(`Page ${url} returned status ${statusCode}`);
      }

      // Capture screenshot
      const screenshotPath = await this.captureScreenshot(page, runId, url);

      // Get DOM snapshot
      const domSnapshot = await page.content();

      // Save page record
      pageDoc = await PageModel.create({
        run_id: runId,
        url,
        status_code: statusCode,
        screenshot_url: screenshotPath,
        dom_snapshot: domSnapshot
      });

      const pageId = pageDoc._id.toString();

      // 3. Run visual analysis
      const visualAnalyzer = new VisualAnalyzer();
      const visualAnomalies = await visualAnalyzer.analyze(page, domSnapshot);

      // 4. Test forms
      const formTester = new FormTester();
      const formResults = await formTester.testForms(page, url);

      // 5. Detect broken links
      const brokenLinkDetector = new BrokenLinkDetector();
      const brokenLinks = await brokenLinkDetector.detectBrokenLinks(page, url);

      // 6. Test accessibility
      const accessibilityTester = new AccessibilityTester();
      const accessibilityIssues = await accessibilityTester.testAccessibility(page);

      // 7. Measure performance
      const performanceTester = new PerformanceTester();
      const performanceResult = await performanceTester.measurePerformance(page);

      // 8. Test SEO
      const seoTester = new SEOTester();
      const seoIssues = await seoTester.testSEO(page);

      // 9. Test mobile responsiveness
      const mobileTester = new MobileTester();
      const mobileIssues = await mobileTester.testMobileResponsiveness(page, this.browser!);

      // 10. Detect JavaScript errors
      const jsErrorDetector = new JSErrorDetector();
      const jsErrors = await jsErrorDetector.detectJSErrors(page);

      // 11. Visual regression testing (compare with baselines)
      const visualRegressionTester = new VisualRegressionTester();
      const visualDiffs = await visualRegressionTester.compareScreenshots(
        runId,
        pageId,
        url,
        screenshotPath,
        site.id
      );

      // 12. Create issues
      const issueCreator = new IssueCreator();
      const createdIssues = await issueCreator.createIssuesForPage({
        runId,
        pageId,
        siteId: site.id,
        projectId: site.project_id,
        url,
        screenshotUrl: screenshotPath,
        visualAnomalies,
        formResults,
        brokenLinks,
        accessibilityIssues,
        performanceResult,
        seoIssues,
        mobileIssues,
        jsErrors,
        visualDiffs,
      });

      issuesCreated = createdIssues;

    } catch (error: any) {
      logger.error(`Error processing page ${url}:`, error);

      // Only save failed page if we didn't already create a successful one
      if (!pageDoc) {
        await PageModel.create({
          run_id: runId,
          url,
          render_failed: true,
          render_error: error.message
        });
      } else {
        // Update the existing page to mark it as failed
        await PageModel.findByIdAndUpdate(pageDoc._id, {
          render_failed: true,
          render_error: error.message
        });
      }
    } finally {
      await page.close();
    }

    return { issuesCreated };
  }

  private async captureScreenshot(page: Page, runId: string, url: string): Promise<string> {
    const screenshotDir = path.join(config.upload.screenshotDir, runId);
    await fs.mkdir(screenshotDir, { recursive: true });

    const filename = `${Date.now()}-${url.replace(/[^a-z0-9]/gi, '_').substring(0, 50)}.png`;
    const filepath = path.join(screenshotDir, filename);

    await page.screenshot({
      path: filepath,
      fullPage: true,
    });

    // Return relative path for storage
    return `/screenshots/${runId}/${filename}`;
  }
}
