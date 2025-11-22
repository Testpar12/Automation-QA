import { chromium, Browser, Page } from 'playwright';
import { query } from '../config/database';
import { config } from '../config';
import { CRAWL_CONFIG, EXCLUDED_PATTERNS } from '../config/constants';
import { PageCrawler } from './pageCrawler.js';
import { VisualAnalyzer } from './visualAnalyzer.js';
import { FormTester } from './formTester.js';
import { IssueCreator } from './issueCreator.js';
import logger from '../utils/logger';
import path from 'path';
import fs from 'fs/promises';

export class TestRunner {
  private browser: Browser | null = null;

  async executeRun(runId: string, site: any) {
    try {
      logger.info(`Starting test run ${runId} for site ${site.name}`);

      // Update run status to Running
      await query(
        'UPDATE runs SET status = $1 WHERE id = $2',
        ['Running', runId]
      );

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
      await query(
        `UPDATE runs 
         SET status = $1, completed_at = NOW(), pages_processed = $2, issues_created = $3
         WHERE id = $4`,
        ['Completed', pagesProcessed, issuesCreated, runId]
      );

      logger.info(`Completed test run ${runId}: ${pagesProcessed} pages, ${issuesCreated} issues`);

    } catch (error: any) {
      logger.error(`Test run ${runId} failed:`, error);

      await query(
        `UPDATE runs 
         SET status = $1, completed_at = NOW(), error_message = $2
         WHERE id = $3`,
        ['Failed', error.message, runId]
      );
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
      const pageResult = await query(
        `INSERT INTO pages (run_id, url, status_code, screenshot_url, dom_snapshot)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [runId, url, statusCode, screenshotPath, domSnapshot]
      );

      const pageId = pageResult.rows[0].id;

      // 3. Run visual analysis
      const visualAnalyzer = new VisualAnalyzer();
      const visualAnomalies = await visualAnalyzer.analyze(page, domSnapshot);

      for (const anomaly of visualAnomalies) {
        await query(
          `INSERT INTO visual_anomalies (page_id, anomaly_type, category, message, severity)
           VALUES ($1, $2, $3, $4, $5)`,
          [pageId, anomaly.type, anomaly.category, anomaly.message, anomaly.severity]
        );
      }

      // 4. Test forms
      const formTester = new FormTester();
      const formResults = await formTester.testForms(page, url);

      for (const formResult of formResults) {
        await query(
          `INSERT INTO form_tests 
           (page_id, form_selector, form_fields, test_result, submit_status, 
            success_indicators, error_indicators, error_message)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            pageId,
            formResult.selector,
            JSON.stringify(formResult.fields),
            formResult.result,
            formResult.submitStatus,
            formResult.successIndicators,
            formResult.errorIndicators,
            formResult.errorMessage,
          ]
        );
      }

      // 5. Create issues
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
      });

      issuesCreated = createdIssues;

    } catch (error: any) {
      logger.error(`Error processing page ${url}:`, error);

      // Save page as failed
      await query(
        `INSERT INTO pages (run_id, url, render_failed, render_error)
         VALUES ($1, $2, true, $3)`,
        [runId, url, error.message]
      );
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
