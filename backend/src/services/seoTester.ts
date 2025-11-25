import { Page } from 'playwright';

export interface SEOIssue {
  type: string;
  severity: 'Critical' | 'Major' | 'Minor';
  description: string;
  recommendation: string;
  currentValue?: string;
}

export class SEOTester {
  async testSEO(page: Page): Promise<SEOIssue[]> {
    const issues: SEOIssue[] = [];

    try {
      // Check for title tag
      const title = await page.title();
      if (!title || title.trim().length === 0) {
        issues.push({
          type: 'Missing Title',
          severity: 'Critical',
          description: 'Page does not have a title tag',
          recommendation: 'Add a descriptive title tag (50-60 characters)',
        });
      } else if (title.length < 30) {
        issues.push({
          type: 'Short Title',
          severity: 'Minor',
          description: 'Page title is too short',
          currentValue: title,
          recommendation: 'Use a title of 50-60 characters for better SEO',
        });
      } else if (title.length > 60) {
        issues.push({
          type: 'Long Title',
          severity: 'Minor',
          description: 'Page title is too long',
          currentValue: `${title.substring(0, 60)}...`,
          recommendation: 'Keep title under 60 characters to avoid truncation in search results',
        });
      }

      // Check for meta description
      const metaDescription = await page.$eval('meta[name="description"]', (el) => 
        (el as HTMLMetaElement).content
      ).catch(() => null);

      if (!metaDescription) {
        issues.push({
          type: 'Missing Meta Description',
          severity: 'Critical',
          description: 'Page does not have a meta description',
          recommendation: 'Add a meta description (150-160 characters)',
        });
      } else if (metaDescription.length < 120) {
        issues.push({
          type: 'Short Meta Description',
          severity: 'Minor',
          description: 'Meta description is too short',
          currentValue: metaDescription,
          recommendation: 'Use a description of 150-160 characters',
        });
      } else if (metaDescription.length > 160) {
        issues.push({
          type: 'Long Meta Description',
          severity: 'Minor',
          description: 'Meta description is too long',
          currentValue: `${metaDescription.substring(0, 160)}...`,
          recommendation: 'Keep meta description under 160 characters',
        });
      }

      // Check for canonical URL
      const canonicalUrl = await page.$eval('link[rel="canonical"]', (el) => 
        (el as HTMLLinkElement).href
      ).catch(() => null);

      if (!canonicalUrl) {
        issues.push({
          type: 'Missing Canonical URL',
          severity: 'Major',
          description: 'Page does not have a canonical URL',
          recommendation: 'Add a canonical link tag to prevent duplicate content issues',
        });
      }

      // Check for Open Graph tags
      const ogTitle = await page.$eval('meta[property="og:title"]', (el) => 
        (el as HTMLMetaElement).content
      ).catch(() => null);

      const ogDescription = await page.$eval('meta[property="og:description"]', (el) => 
        (el as HTMLMetaElement).content
      ).catch(() => null);

      const ogImage = await page.$eval('meta[property="og:image"]', (el) => 
        (el as HTMLMetaElement).content
      ).catch(() => null);

      if (!ogTitle || !ogDescription || !ogImage) {
        issues.push({
          type: 'Incomplete Open Graph Tags',
          severity: 'Minor',
          description: 'Missing Open Graph meta tags for social sharing',
          recommendation: 'Add og:title, og:description, and og:image meta tags',
        });
      }

      // Check for H1 tag
      const h1Count = await page.$$eval('h1', (h1s) => h1s.length);
      
      if (h1Count === 0) {
        issues.push({
          type: 'Missing H1',
          severity: 'Critical',
          description: 'Page does not have an H1 heading',
          recommendation: 'Add one H1 heading that describes the main topic of the page',
        });
      } else if (h1Count > 1) {
        issues.push({
          type: 'Multiple H1s',
          severity: 'Major',
          description: `Page has ${h1Count} H1 headings`,
          recommendation: 'Use only one H1 heading per page',
        });
      }

      // Check for viewport meta tag
      const viewport = await page.$eval('meta[name="viewport"]', (el) => 
        (el as HTMLMetaElement).content
      ).catch(() => null);

      if (!viewport) {
        issues.push({
          type: 'Missing Viewport Meta Tag',
          severity: 'Critical',
          description: 'Page does not have a viewport meta tag',
          recommendation: 'Add <meta name="viewport" content="width=device-width, initial-scale=1">',
        });
      }

      // Check for robots meta tag (if blocking search engines)
      const robotsMeta = await page.$eval('meta[name="robots"]', (el) => 
        (el as HTMLMetaElement).content
      ).catch(() => null);

      if (robotsMeta && (robotsMeta.includes('noindex') || robotsMeta.includes('nofollow'))) {
        issues.push({
          type: 'Search Engine Blocking',
          severity: 'Critical',
          description: 'Page is blocking search engine indexing',
          currentValue: robotsMeta,
          recommendation: 'Remove noindex/nofollow if you want the page indexed',
        });
      }

      // Check image alt attributes
      const imagesWithoutAlt = await page.$$eval('img:not([alt])', (imgs) => imgs.length);
      
      if (imagesWithoutAlt > 0) {
        issues.push({
          type: 'Images Without Alt Text',
          severity: 'Major',
          description: `${imagesWithoutAlt} image(s) missing alt attributes`,
          recommendation: 'Add descriptive alt text to all images for better SEO and accessibility',
        });
      }

      // Check for structured data (JSON-LD)
      const hasStructuredData = await page.$('script[type="application/ld+json"]').then(el => !!el);

      if (!hasStructuredData) {
        issues.push({
          type: 'Missing Structured Data',
          severity: 'Minor',
          description: 'Page does not have structured data (Schema.org)',
          recommendation: 'Add JSON-LD structured data for better search engine understanding',
        });
      }

      // Check for HTTPS
      const url = page.url();
      if (!url.startsWith('https://')) {
        issues.push({
          type: 'Not Using HTTPS',
          severity: 'Critical',
          description: 'Page is not served over HTTPS',
          recommendation: 'Use HTTPS for security and SEO benefits',
        });
      }

    } catch (error) {
      console.error('Error testing SEO:', error);
    }

    return issues;
  }
}
