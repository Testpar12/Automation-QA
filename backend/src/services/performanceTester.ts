import { Page } from 'playwright';

export interface PerformanceMetrics {
  pageLoadTime: number;
  domContentLoaded: number;
  timeToInteractive: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  cumulativeLayoutShift: number;
  totalBlockingTime: number;
  resourceCount: number;
  totalResourceSize: number;
  imageCount: number;
  scriptCount: number;
  stylesheetCount: number;
}

export interface PerformanceIssue {
  type: string;
  severity: 'Critical' | 'Major' | 'Minor';
  description: string;
  value: string;
  threshold: string;
  recommendation: string;
}

export class PerformanceTester {
  async measurePerformance(page: Page): Promise<{ metrics: PerformanceMetrics; issues: PerformanceIssue[] }> {
    const issues: PerformanceIssue[] = [];

    try {
      // Get performance metrics
      const performanceMetrics = await page.evaluate(() => {
        const perf = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        const paintMetrics = performance.getEntriesByType('paint');
        
        const fcp = paintMetrics.find(p => p.name === 'first-contentful-paint');
        
        return {
          pageLoadTime: perf.loadEventEnd - perf.fetchStart,
          domContentLoaded: perf.domContentLoadedEventEnd - perf.fetchStart,
          timeToInteractive: perf.domInteractive - perf.fetchStart,
          firstContentfulPaint: fcp ? fcp.startTime : 0,
        };
      });

      // Get LCP using PerformanceObserver
      const lcp = await page.evaluate(() => {
        return new Promise<number>((resolve) => {
          let lcpValue = 0;
          const observer = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const lastEntry = entries[entries.length - 1];
            lcpValue = lastEntry.startTime;
          });
          
          observer.observe({ type: 'largest-contentful-paint', buffered: true });
          
          setTimeout(() => {
            observer.disconnect();
            resolve(lcpValue);
          }, 100);
        });
      });

      // Get CLS
      const cls = await page.evaluate(() => {
        return new Promise<number>((resolve) => {
          let clsValue = 0;
          const observer = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (!(entry as any).hadRecentInput) {
                clsValue += (entry as any).value;
              }
            }
          });
          
          observer.observe({ type: 'layout-shift', buffered: true });
          
          setTimeout(() => {
            observer.disconnect();
            resolve(clsValue);
          }, 100);
        });
      });

      // Get resource stats
      const resourceStats = await page.evaluate(() => {
        const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
        
        let totalSize = 0;
        let imageCount = 0;
        let scriptCount = 0;
        let stylesheetCount = 0;
        
        resources.forEach(resource => {
          totalSize += resource.transferSize || 0;
          
          if (resource.initiatorType === 'img') imageCount++;
          if (resource.initiatorType === 'script') scriptCount++;
          if (resource.initiatorType === 'link') stylesheetCount++;
        });
        
        return {
          resourceCount: resources.length,
          totalResourceSize: totalSize,
          imageCount,
          scriptCount,
          stylesheetCount,
        };
      });

      const metrics: PerformanceMetrics = {
        ...performanceMetrics,
        largestContentfulPaint: lcp,
        cumulativeLayoutShift: cls,
        totalBlockingTime: 0, // Would need more complex measurement
        ...resourceStats,
      };

      // Check against thresholds and create issues
      if (metrics.pageLoadTime > 3000) {
        issues.push({
          type: 'Slow Page Load',
          severity: metrics.pageLoadTime > 5000 ? 'Critical' : 'Major',
          description: 'Page load time exceeds recommended threshold',
          value: `${(metrics.pageLoadTime / 1000).toFixed(2)}s`,
          threshold: '< 3s',
          recommendation: 'Optimize images, minify resources, enable compression, use CDN',
        });
      }

      if (metrics.firstContentfulPaint > 1800) {
        issues.push({
          type: 'Slow First Contentful Paint',
          severity: 'Major',
          description: 'First Contentful Paint is slow',
          value: `${(metrics.firstContentfulPaint / 1000).toFixed(2)}s`,
          threshold: '< 1.8s',
          recommendation: 'Eliminate render-blocking resources, optimize critical rendering path',
        });
      }

      if (metrics.largestContentfulPaint > 2500) {
        issues.push({
          type: 'Slow Largest Contentful Paint',
          severity: metrics.largestContentfulPaint > 4000 ? 'Critical' : 'Major',
          description: 'Largest Contentful Paint exceeds threshold',
          value: `${(metrics.largestContentfulPaint / 1000).toFixed(2)}s`,
          threshold: '< 2.5s',
          recommendation: 'Optimize largest image/element, improve server response time',
        });
      }

      if (metrics.cumulativeLayoutShift > 0.1) {
        issues.push({
          type: 'High Cumulative Layout Shift',
          severity: metrics.cumulativeLayoutShift > 0.25 ? 'Major' : 'Minor',
          description: 'Page has significant layout shifts',
          value: metrics.cumulativeLayoutShift.toFixed(3),
          threshold: '< 0.1',
          recommendation: 'Set explicit dimensions for images and embeds, avoid inserting content above existing content',
        });
      }

      if (metrics.totalResourceSize > 3 * 1024 * 1024) { // 3MB
        issues.push({
          type: 'Large Page Size',
          severity: 'Major',
          description: 'Total page size is too large',
          value: `${(metrics.totalResourceSize / 1024 / 1024).toFixed(2)} MB`,
          threshold: '< 3 MB',
          recommendation: 'Compress images, minify CSS/JS, enable gzip/brotli compression',
        });
      }

      if (metrics.imageCount > 30) {
        issues.push({
          type: 'Too Many Images',
          severity: 'Minor',
          description: 'Page loads many images',
          value: `${metrics.imageCount} images`,
          threshold: '< 30',
          recommendation: 'Implement lazy loading, use image sprites, optimize image formats',
        });
      }

      return { metrics, issues };
    } catch (error) {
      console.error('Error measuring performance:', error);
      return {
        metrics: {
          pageLoadTime: 0,
          domContentLoaded: 0,
          timeToInteractive: 0,
          firstContentfulPaint: 0,
          largestContentfulPaint: 0,
          cumulativeLayoutShift: 0,
          totalBlockingTime: 0,
          resourceCount: 0,
          totalResourceSize: 0,
          imageCount: 0,
          scriptCount: 0,
          stylesheetCount: 0,
        },
        issues,
      };
    }
  }
}
