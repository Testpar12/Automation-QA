import { Page } from 'playwright';
import axios from 'axios';

export interface BrokenLink {
  url: string;
  sourceElement: string;
  statusCode: number;
  statusText: string;
}

export class BrokenLinkDetector {
  async detectBrokenLinks(page: Page, pageUrl: string): Promise<BrokenLink[]> {
    const brokenLinks: BrokenLink[] = [];
    
    try {
      // Get all links on the page
      const links = await page.$$eval('a[href]', (anchors) =>
        anchors.map(a => ({
          href: (a as HTMLAnchorElement).href,
          text: a.textContent?.trim() || '',
        }))
      );

      // Get all image sources
      const images = await page.$$eval('img[src]', (imgs) =>
        imgs.map(img => ({
          href: (img as HTMLImageElement).src,
          text: `Image: ${(img as HTMLImageElement).alt || 'no alt text'}`,
        }))
      );

      // Get all script sources
      const scripts = await page.$$eval('script[src]', (scripts) =>
        scripts.map(script => ({
          href: (script as HTMLScriptElement).src,
          text: 'Script',
        }))
      );

      // Get all stylesheet links
      const stylesheets = await page.$$eval('link[rel="stylesheet"][href]', (links) =>
        links.map(link => ({
          href: (link as HTMLLinkElement).href,
          text: 'Stylesheet',
        }))
      );

      const allResources = [...links, ...images, ...scripts, ...stylesheets];
      
      // Check each resource
      const checked = new Set<string>();
      for (const resource of allResources) {
        if (!resource.href || checked.has(resource.href)) continue;
        
        checked.add(resource.href);
        
        try {
          // Skip javascript:, mailto:, tel:, and anchor links
          if (
            resource.href.startsWith('javascript:') ||
            resource.href.startsWith('mailto:') ||
            resource.href.startsWith('tel:') ||
            resource.href.includes('#')
          ) {
            continue;
          }

          const response = await axios.head(resource.href, {
            timeout: 5000,
            validateStatus: () => true, // Don't throw on any status
            maxRedirects: 5,
          });

          // Check for error status codes
          if (response.status >= 400) {
            brokenLinks.push({
              url: resource.href,
              sourceElement: resource.text,
              statusCode: response.status,
              statusText: response.statusText,
            });
          }
        } catch (error: any) {
          // Network errors, timeouts, etc.
          brokenLinks.push({
            url: resource.href,
            sourceElement: resource.text,
            statusCode: 0,
            statusText: error.message || 'Network Error',
          });
        }
      }
    } catch (error) {
      console.error('Error detecting broken links:', error);
    }

    return brokenLinks;
  }
}
