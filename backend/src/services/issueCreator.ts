import { Issue } from '../models';
import { VisualAnomaly } from './visualAnalyzer';
import { FormTestResult } from './formTester';
import { BrokenLink } from './brokenLinkDetector';
import { AccessibilityIssue } from './accessibilityTester';
import { PerformanceIssue } from './performanceTester';
import { SEOIssue } from './seoTester';
import { MobileIssue } from './mobileTester';
import { JSError } from './jsErrorDetector';
import { VisualComparisonResult } from './visualRegressionTester';
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
  brokenLinks?: BrokenLink[];
  accessibilityIssues?: AccessibilityIssue[];
  performanceResult?: { metrics: any; issues: PerformanceIssue[] };
  seoIssues?: SEOIssue[];
  mobileIssues?: MobileIssue[];
  jsErrors?: JSError[];
  visualDiffs?: VisualComparisonResult[];
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

    // 3. Create Broken Link issues
    if (params.brokenLinks && params.brokenLinks.length > 0) {
      await this.createBrokenLinkIssue(params);
      issueCount++;
    }

    // 4. Create Accessibility issues
    if (params.accessibilityIssues && params.accessibilityIssues.length > 0) {
      await this.createAccessibilityIssue(params);
      issueCount++;
    }

    // 5. Create Performance issues
    if (params.performanceResult && params.performanceResult.issues.length > 0) {
      await this.createPerformanceIssue(params);
      issueCount++;
    }

    // 6. Create SEO issues
    if (params.seoIssues && params.seoIssues.length > 0) {
      await this.createSEOIssue(params);
      issueCount++;
    }

    // 7. Create Mobile Responsiveness issues
    if (params.mobileIssues && params.mobileIssues.length > 0) {
      await this.createMobileIssue(params);
      issueCount++;
    }

    // 8. Create JavaScript Error issues
    if (params.jsErrors && params.jsErrors.length > 0) {
      await this.createJSErrorIssue(params);
      issueCount++;
    }

    // 9. Create Visual Regression issues
    if (params.visualDiffs && params.visualDiffs.length > 0) {
      const failedDiffs = params.visualDiffs.filter(d => !d.passed);
      if (failedDiffs.length > 0) {
        await this.createVisualRegressionIssue(params, failedDiffs);
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

    await Issue.create({
      project_id: projectId,
      site_id: siteId,
      run_id: runId,
      page_id: pageId,
      url,
      type: 'Visual',
      title,
      description,
      screenshot_url: screenshotUrl,
      severity,
      status: 'New'
    });

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

    await Issue.create({
      project_id: projectId,
      site_id: siteId,
      run_id: runId,
      page_id: pageId,
      url,
      type: 'Form',
      title,
      description,
      screenshot_url: screenshotUrl,
      severity: 'Major',
      status: 'New'
    });

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

  private async createBrokenLinkIssue(params: IssueCreationParams): Promise<void> {
    const { projectId, siteId, runId, pageId, url, screenshotUrl, brokenLinks } = params;

    const description = brokenLinks!
      .slice(0, 10) // Limit to first 10 broken links
      .map((link) => `• ${link.url}\n  Status: ${link.statusCode} ${link.statusText}\n  Found in: ${link.sourceElement}`)
      .join('\n\n');

    const title = `${brokenLinks!.length} Broken Link(s) on ${this.getPageTitle(url)}`;

    // Critical if 5+ broken links, Major if 2-4, Minor if 1
    const severity = brokenLinks!.length >= 5 ? 'Critical' : brokenLinks!.length >= 2 ? 'Major' : 'Minor';

    await Issue.create({
      project_id: projectId,
      site_id: siteId,
      run_id: runId,
      page_id: pageId,
      url,
      type: 'Broken Link',
      title,
      description: description + (brokenLinks!.length > 10 ? `\n\n... and ${brokenLinks!.length - 10} more` : ''),
      screenshot_url: screenshotUrl,
      severity,
      status: 'New'
    });

    logger.info(`Created broken link issue for ${url}`);
  }

  private async createAccessibilityIssue(params: IssueCreationParams): Promise<void> {
    const { projectId, siteId, runId, pageId, url, screenshotUrl, accessibilityIssues } = params;

    const description = accessibilityIssues!
      .map((issue) => `[${issue.severity}] ${issue.type}\n${issue.description}\n${issue.element ? `Element: ${issue.element}\n` : ''}Recommendation: ${issue.recommendation}`)
      .join('\n\n');

    const title = `${accessibilityIssues!.length} Accessibility Issue(s) on ${this.getPageTitle(url)}`;

    const severity = this.getHighestSeverity(accessibilityIssues!.map((i) => i.severity));

    await Issue.create({
      project_id: projectId,
      site_id: siteId,
      run_id: runId,
      page_id: pageId,
      url,
      type: 'Accessibility',
      title,
      description,
      screenshot_url: screenshotUrl,
      severity,
      status: 'New'
    });

    logger.info(`Created accessibility issue for ${url}`);
  }

  private async createPerformanceIssue(params: IssueCreationParams): Promise<void> {
    const { projectId, siteId, runId, pageId, url, screenshotUrl, performanceResult } = params;

    const description = performanceResult!.issues
      .map((issue) => `[${issue.severity}] ${issue.type}\n${issue.description}\nCurrent: ${issue.value} | Threshold: ${issue.threshold}\nRecommendation: ${issue.recommendation}`)
      .join('\n\n');

    const title = `${performanceResult!.issues.length} Performance Issue(s) on ${this.getPageTitle(url)}`;

    const severity = this.getHighestSeverity(performanceResult!.issues.map((i) => i.severity));

    await Issue.create({
      project_id: projectId,
      site_id: siteId,
      run_id: runId,
      page_id: pageId,
      url,
      type: 'Performance',
      title,
      description,
      screenshot_url: screenshotUrl,
      severity,
      status: 'New'
    });

    logger.info(`Created performance issue for ${url}`);
  }

  private async createSEOIssue(params: IssueCreationParams): Promise<void> {
    const { projectId, siteId, runId, pageId, url, screenshotUrl, seoIssues } = params;

    const description = seoIssues!
      .map((issue) => `[${issue.severity}] ${issue.type}\n${issue.description}\n${issue.currentValue ? `Current: ${issue.currentValue}\n` : ''}Recommendation: ${issue.recommendation}`)
      .join('\n\n');

    const title = `${seoIssues!.length} SEO Issue(s) on ${this.getPageTitle(url)}`;

    const severity = this.getHighestSeverity(seoIssues!.map((i) => i.severity));

    await Issue.create({
      project_id: projectId,
      site_id: siteId,
      run_id: runId,
      page_id: pageId,
      url,
      type: 'SEO',
      title,
      description,
      screenshot_url: screenshotUrl,
      severity,
      status: 'New'
    });

    logger.info(`Created SEO issue for ${url}`);
  }

  private async createMobileIssue(params: IssueCreationParams): Promise<void> {
    const { projectId, siteId, runId, pageId, url, screenshotUrl, mobileIssues } = params;

    const description = mobileIssues!
      .map((issue) => `[${issue.severity}] ${issue.type}\n${issue.description}\n${issue.viewport ? `Viewport: ${issue.viewport}\n` : ''}Recommendation: ${issue.recommendation}`)
      .join('\n\n');

    const title = `${mobileIssues!.length} Mobile Responsiveness Issue(s) on ${this.getPageTitle(url)}`;

    const severity = this.getHighestSeverity(mobileIssues!.map((i) => i.severity));

    // Prepare metadata with element positions
    const metadata = {
      issues: mobileIssues!.map(issue => ({
        type: issue.type,
        severity: issue.severity,
        description: issue.description,
        viewport: issue.viewport,
        elements: issue.elements || []
      }))
    };

    await Issue.create({
      project_id: projectId,
      site_id: siteId,
      run_id: runId,
      page_id: pageId,
      url,
      type: 'Other',
      title,
      description,
      screenshot_url: screenshotUrl,
      metadata, // Store element positions and issue details
      severity,
      status: 'New'
    });

    logger.info(`Created mobile issue for ${url}`);
  }

  private async createJSErrorIssue(params: IssueCreationParams): Promise<void> {
    const { projectId, siteId, runId, pageId, url, screenshotUrl, jsErrors } = params;

    const description = jsErrors!
      .slice(0, 10) // Limit to first 10 errors
      .map((error) => `• ${error.message}\n${error.source ? `  Source: ${error.source}:${error.lineno}:${error.colno}\n` : ''}${error.stack ? `  Stack: ${error.stack.substring(0, 200)}...\n` : ''}`)
      .join('\n\n');

    const title = `${jsErrors!.length} JavaScript Error(s) on ${this.getPageTitle(url)}`;

    // Critical if 5+ errors, Major if 2-4, Minor if 1
    const severity = jsErrors!.length >= 5 ? 'Critical' : jsErrors!.length >= 2 ? 'Major' : 'Minor';

    await Issue.create({
      project_id: projectId,
      site_id: siteId,
      run_id: runId,
      page_id: pageId,
      url,
      type: 'JavaScript Error',
      title,
      description: description + (jsErrors!.length > 10 ? `\n\n... and ${jsErrors!.length - 10} more errors` : ''),
      screenshot_url: screenshotUrl,
      severity,
      status: 'New'
    });

    logger.info(`Created JavaScript error issue for ${url}`);
  }

  private async createVisualRegressionIssue(params: IssueCreationParams, failedDiffs: VisualComparisonResult[]): Promise<void> {
    const { projectId, siteId, runId, pageId, url, screenshotUrl } = params;

    const description = failedDiffs
      .map((diff) => `• Visual difference detected: ${diff.differencePercentage.toFixed(2)}% (${diff.pixelDiffCount.toLocaleString()} pixels)\n  Baseline ID: ${diff.baselineId}\n  ${diff.diffImagePath ? `Diff image: ${diff.diffImagePath}` : ''}`)
      .join('\n\n');

    const title = `Visual Regression: ${failedDiffs.length} Baseline(s) Failed on ${this.getPageTitle(url)}`;

    // Critical if >5% difference, Major if >1%, Minor if >0.1%
    const maxDiff = Math.max(...failedDiffs.map(d => d.differencePercentage));
    const severity = maxDiff > 5 ? 'Critical' : maxDiff > 1 ? 'Major' : 'Minor';

    await Issue.create({
      project_id: projectId,
      site_id: siteId,
      run_id: runId,
      page_id: pageId,
      url,
      type: 'Visual',
      title,
      description: description + '\n\nCurrent screenshot differs from established baseline(s). Review the diff images to determine if changes are intentional.',
      screenshot_url: screenshotUrl,
      severity,
      status: 'New'
    });

    logger.info(`Created visual regression issue for ${url}`);
  }
}
