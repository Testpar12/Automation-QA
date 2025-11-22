import { query } from '../config/database';
import { VisualAnomaly } from './visualAnalyzer';
import { FormTestResult } from './formTester';
import logger from '../utils/logger';

interface IssueCreationParams {
  runId: string;
  pageId: string;
  siteId: string;
  projectId: string;
  url: string;
  screenshotUrl: string;
  visualAnomalies: VisualAnomaly[];
  formResults: FormTestResult[];
}

export class IssueCreator {
  async createIssuesForPage(params: IssueCreationParams): Promise<number> {
    let issueCount = 0;

    // 1. Create Visual issue if there are visual anomalies
    if (params.visualAnomalies.length > 0) {
      await this.createVisualIssue(params);
      issueCount++;
    }

    // 2. Create Form issues for failed forms
    for (const formResult of params.formResults) {
      if (formResult.result === 'Failed') {
        await this.createFormIssue(params, formResult);
        issueCount++;
      }
    }

    return issueCount;
  }

  private async createVisualIssue(params: IssueCreationParams): Promise<void> {
    const { projectId, siteId, runId, pageId, url, screenshotUrl, visualAnomalies } = params;

    // Build description from all anomalies
    const description = visualAnomalies
      .map((a) => `• ${a.message}`)
      .join('\n');

    const title = `Visual Layout Issues on ${this.getPageTitle(url)}`;

    // Determine severity: use highest severity from anomalies
    const severity = this.getHighestSeverity(visualAnomalies.map((a) => a.severity));

    await query(
      `INSERT INTO issues 
       (project_id, site_id, run_id, page_id, url, type, title, description, 
        screenshot_url, severity, status)
       VALUES ($1, $2, $3, $4, $5, 'Visual', $6, $7, $8, $9, 'New')`,
      [projectId, siteId, runId, pageId, url, title, description, screenshotUrl, severity]
    );

    logger.info(`Created visual issue for ${url}`);
  }

  private async createFormIssue(
    params: IssueCreationParams,
    formResult: FormTestResult
  ): Promise<void> {
    const { projectId, siteId, runId, pageId, url, screenshotUrl } = params;

    const title = `Form Submission Failed on ${this.getPageTitle(url)}`;

    let description = `Form: ${formResult.selector}\n\n`;
    
    if (formResult.errorMessage) {
      description += `Error: ${formResult.errorMessage}\n\n`;
    }

    if (formResult.errorIndicators && formResult.errorIndicators.length > 0) {
      description += `Error indicators found: ${formResult.errorIndicators.join(', ')}\n\n`;
    }

    if (formResult.submitStatus) {
      description += `HTTP Status: ${formResult.submitStatus}\n\n`;
    }

    description += `Fields tested:\n`;
    formResult.fields.forEach((field) => {
      description += `• ${field.name} (${field.type})${field.required ? ' [required]' : ''}\n`;
    });

    await query(
      `INSERT INTO issues 
       (project_id, site_id, run_id, page_id, url, type, title, description, 
        screenshot_url, severity, status)
       VALUES ($1, $2, $3, $4, $5, 'Form', $6, $7, $8, 'Major', 'New')`,
      [projectId, siteId, runId, pageId, url, title, description, screenshotUrl]
    );

    logger.info(`Created form issue for ${url}`);
  }

  private getPageTitle(url: string): string {
    try {
      const urlObj = new URL(url);
      const path = urlObj.pathname;
      
      if (path === '/' || path === '') {
        return 'Homepage';
      }

      // Get last segment
      const segments = path.split('/').filter(Boolean);
      const lastSegment = segments[segments.length - 1];
      
      // Clean up and capitalize
      return lastSegment
        .replace(/[-_]/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase())
        .substring(0, 50);
    } catch {
      return 'Page';
    }
  }

  private getHighestSeverity(severities: string[]): string {
    const order = ['Critical', 'Major', 'Minor', 'Trivial'];

    for (const severity of order) {
      if (severities.includes(severity)) {
        return severity;
      }
    }

    return 'Major';
  }
}
