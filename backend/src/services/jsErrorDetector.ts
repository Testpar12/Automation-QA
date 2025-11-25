import { Page } from 'playwright';

export interface JSError {
  message: string;
  source?: string;
  lineno?: number;
  colno?: number;
  stack?: string;
  timestamp: Date;
}

export class JSErrorDetector {
  private errors: JSError[] = [];

  async detectJSErrors(page: Page): Promise<JSError[]> {
    this.errors = [];

    try {
      // Listen for console errors
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          this.errors.push({
            message: msg.text(),
            timestamp: new Date(),
          });
        }
      });

      // Listen for page errors
      page.on('pageerror', (error) => {
        this.errors.push({
          message: error.message,
          stack: error.stack,
          timestamp: new Date(),
        });
      });

      // Inject error listener into page
      await page.addInitScript(() => {
        window.addEventListener('error', (event) => {
          (window as any).__jsErrors = (window as any).__jsErrors || [];
          (window as any).__jsErrors.push({
            message: event.message,
            source: event.filename,
            lineno: event.lineno,
            colno: event.colno,
            stack: event.error?.stack,
            timestamp: new Date().toISOString(),
          });
        });

        window.addEventListener('unhandledrejection', (event) => {
          (window as any).__jsErrors = (window as any).__jsErrors || [];
          (window as any).__jsErrors.push({
            message: `Unhandled Promise Rejection: ${event.reason}`,
            stack: event.reason?.stack,
            timestamp: new Date().toISOString(),
          });
        });
      });

      // Wait a bit for any errors to occur
      await page.waitForTimeout(2000);

      // Get errors from page context
      const pageErrors = await page.evaluate(() => {
        return (window as any).__jsErrors || [];
      });

      // Merge errors
      pageErrors.forEach((error: any) => {
        this.errors.push({
          message: error.message,
          source: error.source,
          lineno: error.lineno,
          colno: error.colno,
          stack: error.stack,
          timestamp: new Date(error.timestamp),
        });
      });

    } catch (error) {
      console.error('Error detecting JavaScript errors:', error);
    }

    return this.errors;
  }

  clearErrors() {
    this.errors = [];
  }
}
