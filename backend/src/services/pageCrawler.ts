import { Browser } from 'playwright';
import axios from 'axios';
import { parseStringPromise } from 'xml2js';
import * as cheerio from 'cheerio';
import { CRAWL_CONFIG, EXCLUDED_PATTERNS } from '../config/constants';
import logger from '../utils/logger';

export class PageCrawler {
  private browser: Browser;
  private discoveredUrls: Set<string> = new Set();
  private baseUrl: string = '';
  private baseDomain: string = '';

  constructor(browser: Browser) {
    this.browser = browser;
  }

  async discoverPages(baseUrl: string): Promise<string[]> {
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.baseDomain = new URL(baseUrl).hostname;
    
    // Always add the base URL
    this.discoveredUrls.add(this.baseUrl);

    // 1. Try to fetch sitemap.xml
    await this.fetchSitemap();

    // 2. Crawl from base URL
    await this.crawlFromUrl(this.baseUrl, 0);

    // Limit to max pages
    const urls = Array.from(this.discoveredUrls).slice(0, CRAWL_CONFIG.MAX_PAGES);
    
    logger.info(`Discovered ${urls.length} pages (max: ${CRAWL_CONFIG.MAX_PAGES})`);
    
    return urls;
  }

  private async fetchSitemap(): Promise<void> {
    try {
      const sitemapUrl = `${this.baseUrl}/sitemap.xml`;
      logger.info(`Fetching sitemap: ${sitemapUrl}`);

      const response = await axios.get(sitemapUrl, {
        timeout: 10000,
        validateStatus: (status) => status === 200,
      });

      const result = await parseStringPromise(response.data);

      // Parse sitemap URLs
      if (result.urlset && result.urlset.url) {
        for (const urlEntry of result.urlset.url) {
          if (urlEntry.loc && urlEntry.loc[0]) {
            const url = urlEntry.loc[0];
            if (this.isValidUrl(url)) {
              this.discoveredUrls.add(url);
            }
          }
        }
      }

      logger.info(`Added ${this.discoveredUrls.size} URLs from sitemap`);
    } catch (error) {
      logger.warn('Failed to fetch sitemap:', error);
    }
  }

  private async crawlFromUrl(url: string, depth: number): Promise<void> {
    if (depth >= CRAWL_CONFIG.MAX_DEPTH) {
      return;
    }

    if (this.discoveredUrls.size >= CRAWL_CONFIG.MAX_PAGES) {
      return;
    }

    try {
      const page = await this.browser.newPage();

      try {
        await page.goto(url, {
          waitUntil: 'networkidle',
          timeout: 15000,
        });

        // Extract all links
        const links = await page.$$eval('a[href]', (anchors) =>
          anchors.map((a: any) => a.href)
        );

        await page.close();

        // Process links
        for (const link of links) {
          if (this.discoveredUrls.size >= CRAWL_CONFIG.MAX_PAGES) {
            break;
          }

          if (this.isValidUrl(link) && !this.discoveredUrls.has(link)) {
            this.discoveredUrls.add(link);

            // Recursively crawl (but limit depth)
            if (depth < CRAWL_CONFIG.MAX_DEPTH - 1) {
              await this.crawlFromUrl(link, depth + 1);
            }
          }
        }
      } catch (error) {
        logger.warn(`Failed to crawl ${url}:`, error);
      } finally {
        if (!page.isClosed()) {
          await page.close();
        }
      }
    } catch (error) {
      logger.error(`Error crawling ${url}:`, error);
    }
  }

  private isValidUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);

      // Must be same domain
      if (urlObj.hostname !== this.baseDomain) {
        return false;
      }

      // Must be http or https
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        return false;
      }

      // Check excluded patterns
      const pathname = urlObj.pathname.toLowerCase();
      for (const pattern of EXCLUDED_PATTERNS) {
        if (pathname.includes(pattern.toLowerCase())) {
          return false;
        }
      }

      // Exclude common file extensions
      if (/\.(pdf|zip|jpg|jpeg|png|gif|css|js|xml|json)$/i.test(pathname)) {
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }
}
