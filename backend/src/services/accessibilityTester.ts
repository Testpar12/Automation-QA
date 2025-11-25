import { Page } from 'playwright';

export interface AccessibilityIssue {
  type: string;
  severity: 'Critical' | 'Major' | 'Minor';
  description: string;
  element?: string;
  recommendation: string;
}

export class AccessibilityTester {
  async testAccessibility(page: Page): Promise<AccessibilityIssue[]> {
    const issues: AccessibilityIssue[] = [];

    try {
      // Check for missing alt text on images
      const imagesWithoutAlt = await page.$$eval('img:not([alt])', (imgs) =>
        imgs.map(img => (img as HTMLImageElement).src)
      );
      
      if (imagesWithoutAlt.length > 0) {
        issues.push({
          type: 'Missing Alt Text',
          severity: 'Major',
          description: `${imagesWithoutAlt.length} image(s) missing alt text`,
          element: imagesWithoutAlt.slice(0, 3).join(', '),
          recommendation: 'Add descriptive alt text to all images for screen reader users',
        });
      }

      // Check for proper heading hierarchy
      const headings = await page.$$eval('h1, h2, h3, h4, h5, h6', (elements) =>
        elements.map(el => parseInt(el.tagName[1]))
      );

      if (headings.length > 0) {
        const h1Count = headings.filter(h => h === 1).length;
        if (h1Count === 0) {
          issues.push({
            type: 'Missing H1',
            severity: 'Major',
            description: 'Page does not have an H1 heading',
            recommendation: 'Add a main H1 heading to the page for proper document structure',
          });
        } else if (h1Count > 1) {
          issues.push({
            type: 'Multiple H1s',
            severity: 'Minor',
            description: `Page has ${h1Count} H1 headings`,
            recommendation: 'Use only one H1 heading per page',
          });
        }

        // Check for skipped heading levels
        for (let i = 1; i < headings.length; i++) {
          if (headings[i] - headings[i - 1] > 1) {
            issues.push({
              type: 'Skipped Heading Level',
              severity: 'Minor',
              description: `Heading hierarchy jumps from H${headings[i - 1]} to H${headings[i]}`,
              recommendation: 'Maintain proper heading hierarchy without skipping levels',
            });
            break;
          }
        }
      }

      // Check for form inputs without labels
      const inputsWithoutLabels = await page.$$eval('input:not([type="hidden"]):not([type="submit"]):not([type="button"])', (inputs) => {
        return inputs.filter(input => {
          const id = (input as HTMLInputElement).id;
          const ariaLabel = (input as HTMLInputElement).getAttribute('aria-label');
          const ariaLabelledBy = (input as HTMLInputElement).getAttribute('aria-labelledby');
          const hasLabel = id && document.querySelector(`label[for="${id}"]`);
          return !hasLabel && !ariaLabel && !ariaLabelledBy;
        }).length;
      });

      if (inputsWithoutLabels > 0) {
        issues.push({
          type: 'Form Inputs Without Labels',
          severity: 'Critical',
          description: `${inputsWithoutLabels} form input(s) without associated labels`,
          recommendation: 'Add labels to all form inputs using <label> tags or aria-label attributes',
        });
      }

      // Check for links without text
      const emptyLinks = await page.$$eval('a', (links) => {
        return links.filter(link => {
          const text = link.textContent?.trim();
          const ariaLabel = (link as HTMLAnchorElement).getAttribute('aria-label');
          const title = (link as HTMLAnchorElement).title;
          return !text && !ariaLabel && !title;
        }).length;
      });

      if (emptyLinks > 0) {
        issues.push({
          type: 'Empty Links',
          severity: 'Major',
          description: `${emptyLinks} link(s) without text content`,
          recommendation: 'Ensure all links have descriptive text or aria-label',
        });
      }

      // Check for sufficient color contrast (basic check)
      const lowContrastElements = await page.evaluate(() => {
        const elements = document.querySelectorAll('*');
        let count = 0;
        
        elements.forEach(el => {
          const style = window.getComputedStyle(el);
          const text = el.textContent?.trim();
          
          if (text && text.length > 0) {
            const color = style.color;
            const bgColor = style.backgroundColor;
            
            // Simple check: if both are very similar (basic heuristic)
            if (color && bgColor && color === bgColor) {
              count++;
            }
          }
        });
        
        return count;
      });

      if (lowContrastElements > 0) {
        issues.push({
          type: 'Low Color Contrast',
          severity: 'Major',
          description: `Potential color contrast issues detected on ${lowContrastElements} element(s)`,
          recommendation: 'Ensure text has sufficient contrast ratio (4.5:1 for normal text, 3:1 for large text)',
        });
      }

      // Check for missing page language
      const hasLang = await page.$eval('html', (html) => 
        (html as HTMLHtmlElement).hasAttribute('lang')
      );

      if (!hasLang) {
        issues.push({
          type: 'Missing Language Attribute',
          severity: 'Major',
          description: 'HTML element missing lang attribute',
          recommendation: 'Add lang attribute to <html> tag (e.g., <html lang="en">)',
        });
      }

      // Check for buttons with no text
      const emptyButtons = await page.$$eval('button', (buttons) => {
        return buttons.filter(btn => {
          const text = btn.textContent?.trim();
          const ariaLabel = btn.getAttribute('aria-label');
          const title = btn.title;
          return !text && !ariaLabel && !title;
        }).length;
      });

      if (emptyButtons > 0) {
        issues.push({
          type: 'Empty Buttons',
          severity: 'Critical',
          description: `${emptyButtons} button(s) without text or label`,
          recommendation: 'Add descriptive text or aria-label to all buttons',
        });
      }

    } catch (error) {
      console.error('Error testing accessibility:', error);
    }

    return issues;
  }
}
