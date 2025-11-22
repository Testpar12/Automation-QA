import { Page } from 'playwright';
import { ANOMALY_TYPES } from '../config/constants';

export interface VisualAnomaly {
  type: string;
  category: string;
  message: string;
  severity: string;
}

export class VisualAnalyzer {
  async analyze(page: Page, domSnapshot: string): Promise<VisualAnomaly[]> {
    const anomalies: VisualAnomaly[] = [];

    // 1. Check for horizontal scroll
    const hasHorizontalScroll = await this.checkHorizontalScroll(page);
    if (hasHorizontalScroll) {
      anomalies.push({
        type: ANOMALY_TYPES.HORIZONTAL_SCROLL,
        category: 'layout',
        message: 'Detected horizontal scroll on desktop viewport (1440×900)',
        severity: 'Major',
      });
    }

    // 2. Check for overlapping elements
    const overlappingElements = await this.checkOverlappingElements(page);
    if (overlappingElements.length > 0) {
      anomalies.push({
        type: ANOMALY_TYPES.OVERLAPPING_ELEMENTS,
        category: 'layout',
        message: `Detected ${overlappingElements.length} overlapping element(s)`,
        severity: 'Major',
      });
    }

    // 3. Check for viewport overflow
    const hasViewportOverflow = await this.checkViewportOverflow(page);
    if (hasViewportOverflow) {
      anomalies.push({
        type: ANOMALY_TYPES.VIEWPORT_OVERFLOW,
        category: 'layout',
        message: 'Elements partially outside viewport (cropped at top/bottom)',
        severity: 'Minor',
      });
    }

    return anomalies;
  }

  async checkHorizontalScroll(page: Page): Promise<boolean> {
    return await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
  }

  private async checkOverlappingElements(page: Page): Promise<any[]> {
    return await page.evaluate(() => {
      const elements = Array.from(
        document.querySelectorAll('div, section, article, header, footer, nav, main')
      );

      const overlapping: any[] = [];

      for (let i = 0; i < elements.length; i++) {
        for (let j = i + 1; j < elements.length; j++) {
          const rect1 = elements[i].getBoundingClientRect();
          const rect2 = elements[j].getBoundingClientRect();

          // Skip if either element is not visible
          if (rect1.width === 0 || rect1.height === 0 || rect2.width === 0 || rect2.height === 0) {
            continue;
          }

          // Check if rectangles overlap
          const overlap = !(
            rect1.right < rect2.left ||
            rect1.left > rect2.right ||
            rect1.bottom < rect2.top ||
            rect1.top > rect2.bottom
          );

          if (overlap) {
            // Check if one contains the other (parent-child, which is OK)
            const contains1 = elements[i].contains(elements[j]);
            const contains2 = elements[j].contains(elements[i]);

            if (!contains1 && !contains2) {
              overlapping.push({
                element1: elements[i].tagName,
                element2: elements[j].tagName,
              });

              // Limit the number of overlapping pairs we report
              if (overlapping.length >= 5) {
                return overlapping;
              }
            }
          }
        }
      }

      return overlapping;
    });
  }

  private async checkViewportOverflow(page: Page): Promise<boolean> {
    return await page.evaluate(() => {
      const elements = Array.from(
        document.querySelectorAll('div, section, article, header, footer, nav, main, aside')
      );

      for (const el of elements) {
        const rect = el.getBoundingClientRect();

        // Check if element is partially outside viewport (top or bottom)
        if (rect.height > 0 && (rect.top < -100 || rect.bottom > window.innerHeight + 100)) {
          const computedStyle = window.getComputedStyle(el);
          
          // Only flag if it's not intentionally scrollable
          if (computedStyle.overflow !== 'auto' && computedStyle.overflow !== 'scroll') {
            return true;
          }
        }
      }

      return false;
    });
  }
}
