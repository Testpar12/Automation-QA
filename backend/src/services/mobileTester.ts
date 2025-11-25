import { Page, Browser } from 'playwright';

export interface ElementPosition {
  x: number;
  y: number;
  width: number;
  height: number;
  selector?: string;
}

export interface MobileIssue {
  type: string;
  severity: 'Critical' | 'Major' | 'Minor';
  description: string;
  recommendation: string;
  viewport?: string;
  elements?: ElementPosition[];
  screenshotPath?: string; // Path to viewport-specific screenshot
}

export interface MobileTestResult {
  issues: MobileIssue[];
  viewportScreenshots: Map<string, string>; // viewport -> screenshot path
}

export class MobileTester {
  async testMobileResponsiveness(page: Page, browser: Browser, screenshotsDir: string = 'screenshots/mobile'): Promise<MobileTestResult> {
    const issues: MobileIssue[] = [];
    const viewportScreenshots = new Map<string, string>();

    const viewports = [
      { name: 'iPhone SE', width: 375, height: 667 },
      { name: 'iPhone 12 Pro', width: 390, height: 844 },
      { name: 'iPad', width: 768, height: 1024 },
      { name: 'Galaxy S20', width: 360, height: 800 },
    ];

    try {
      const currentUrl = page.url();

      for (const viewport of viewports) {
        // Create new page with viewport
        const mobilePage = await browser.newPage({
          viewport: { width: viewport.width, height: viewport.height },
          userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
        });

        try {
          await mobilePage.goto(currentUrl, { waitUntil: 'networkidle', timeout: 30000 });

          // Capture screenshot for this viewport
          const fs = require('fs');
          const path = require('path');
          const viewportKey = `${viewport.width}x${viewport.height}`;
          const timestamp = Date.now();
          const screenshotFileName = `mobile-${viewportKey}-${timestamp}.png`;
          const screenshotPath = path.join(screenshotsDir, screenshotFileName);
          
          // Ensure directory exists
          if (!fs.existsSync(screenshotsDir)) {
            fs.mkdirSync(screenshotsDir, { recursive: true });
          }
          
          await mobilePage.screenshot({ path: screenshotPath, fullPage: true });
          viewportScreenshots.set(viewportKey, screenshotPath);

          // Check for horizontal scrolling
          const hasHorizontalScroll = await mobilePage.evaluate(() => {
            return document.documentElement.scrollWidth > window.innerWidth;
          });

          if (hasHorizontalScroll) {
            issues.push({
              type: 'Horizontal Scroll on Mobile',
              severity: 'Critical',
              description: `Page has horizontal scrolling on ${viewport.name}`,
              viewport: `${viewport.width}x${viewport.height}`,
              recommendation: 'Ensure all content fits within viewport width, use responsive CSS',
            });
          }

          // Check for viewport meta tag
          const hasViewportMeta = await mobilePage.$eval('meta[name="viewport"]', () => true).catch(() => false);
          
          if (!hasViewportMeta && viewport === viewports[0]) { // Only report once
            issues.push({
              type: 'Missing Viewport Meta Tag',
              severity: 'Critical',
              description: 'Page does not have a viewport meta tag',
              recommendation: 'Add <meta name="viewport" content="width=device-width, initial-scale=1">',
            });
          }

          // Check for too-small touch targets
          const smallTouchTargetsData = await mobilePage.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button, a, input[type="button"], input[type="submit"]'));
            let count = 0;
            const elements: Array<{x: number, y: number, width: number, height: number, selector: string}> = [];
            
            buttons.forEach((btn, index) => {
              const rect = btn.getBoundingClientRect();
              if (rect.width < 44 || rect.height < 44) {
                count++;
                const tagName = btn.tagName.toLowerCase();
                const id = btn.id ? `#${btn.id}` : '';
                const className = btn.className ? `.${btn.className.split(' ')[0]}` : '';
                elements.push({
                  x: rect.left,
                  y: rect.top,
                  width: rect.width,
                  height: rect.height,
                  selector: `${tagName}${id}${className}`
                });
              }
            });
            
            return { count, elements };
          });

          if (smallTouchTargetsData.count > 0 && viewport === viewports[0]) { // Only report once
            issues.push({
              type: 'Small Touch Targets',
              severity: 'Major',
              description: `${smallTouchTargetsData.count} interactive element(s) smaller than recommended touch target size`,
              recommendation: 'Ensure buttons and links are at least 44x44 pixels for easy tapping',
              elements: smallTouchTargetsData.elements
            });
          }

          // Check for text too small to read
          const smallTextElements = await mobilePage.evaluate(() => {
            const elements = Array.from(document.querySelectorAll('p, span, div, a, li'));
            let count = 0;
            
            elements.forEach(el => {
              const style = window.getComputedStyle(el);
              const fontSize = parseFloat(style.fontSize);
              const text = el.textContent?.trim();
              
              if (text && text.length > 0 && fontSize < 12) {
                count++;
              }
            });
            
            return count;
          });

          if (smallTextElements > 0 && viewport === viewports[0]) { // Only report once
            issues.push({
              type: 'Small Text Size',
              severity: 'Major',
              description: `${smallTextElements} element(s) with font size smaller than 12px`,
              recommendation: 'Use minimum font size of 16px for body text on mobile',
            });
          }

          // Check for overlapping elements
          const overlappingData = await mobilePage.evaluate(() => {
            const elements = Array.from(document.querySelectorAll('button, a, input'));
            let count = 0;
            const overlappingPairs: Array<{x: number, y: number, width: number, height: number, selector: string}> = [];
            
            for (let i = 0; i < elements.length; i++) {
              const rect1 = elements[i].getBoundingClientRect();
              
              for (let j = i + 1; j < elements.length; j++) {
                const rect2 = elements[j].getBoundingClientRect();
                
                if (!(rect1.right < rect2.left || 
                      rect1.left > rect2.right || 
                      rect1.bottom < rect2.top || 
                      rect1.top > rect2.bottom)) {
                  const tagName = elements[i].tagName.toLowerCase();
                  const id = elements[i].id ? `#${elements[i].id}` : '';
                  const className = elements[i].className ? `.${elements[i].className.toString().split(' ')[0]}` : '';
                  
                  overlappingPairs.push({
                    x: rect1.left,
                    y: rect1.top,
                    width: rect1.width,
                    height: rect1.height,
                    selector: `${tagName}${id}${className}`
                  });
                  count++;
                  break;
                }
              }
            }
            
            return { count, elements: overlappingPairs };
          });

          if (overlappingData.count > 0) {
            issues.push({
              type: 'Overlapping Interactive Elements',
              severity: 'Major',
              description: `Interactive elements are overlapping on ${viewport.name}`,
              viewport: `${viewport.width}x${viewport.height}`,
              recommendation: 'Ensure interactive elements have proper spacing and do not overlap',
              elements: overlappingData.elements
            });
          }

          // Check for elements extending beyond viewport
          const elementsOffScreen = await mobilePage.evaluate(() => {
            const elements = Array.from(document.querySelectorAll('*'));
            let count = 0;
            
            elements.forEach(el => {
              const rect = el.getBoundingClientRect();
              if (rect.right > window.innerWidth + 10) { // 10px tolerance
                count++;
              }
            });
            
            return count;
          });

          if (elementsOffScreen > 3) { // More than 3 elements
            issues.push({
              type: 'Elements Extending Beyond Viewport',
              severity: 'Major',
              description: `${elementsOffScreen} element(s) extend beyond viewport on ${viewport.name}`,
              viewport: `${viewport.width}x${viewport.height}`,
              recommendation: 'Use max-width: 100% and proper responsive layout',
            });
          }

        } finally {
          await mobilePage.close();
        }
      }
    } catch (error) {
      console.error('Error testing mobile responsiveness:', error);
    }

    return { issues, viewportScreenshots };
  }
}
