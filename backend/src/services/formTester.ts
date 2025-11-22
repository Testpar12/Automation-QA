import { Page } from 'playwright';
import { FORM_CONFIG } from '../config/constants';
import logger from '../utils/logger';

export interface FormField {
  name: string;
  type: string;
  required: boolean;
  label?: string;
}

export interface FormTestResult {
  selector: string;
  fields: FormField[];
  result: 'Passed' | 'Failed';
  submitStatus?: number;
  successIndicators?: string[];
  errorIndicators?: string[];
  errorMessage?: string;
}

export class FormTester {
  async testForms(page: Page, url: string): Promise<FormTestResult[]> {
    const results: FormTestResult[] = [];

    try {
      // Find all forms on the page
      const forms = await page.$$('form');

      logger.info(`Found ${forms.length} form(s) on ${url}`);

      for (let i = 0; i < forms.length; i++) {
        const form = forms[i];

        try {
          // Get form info
          const formInfo = await this.getFormInfo(page, i);

          // Skip login forms
          if (this.isLoginForm(formInfo.fields)) {
            logger.info(`Skipping login form #${i}`);
            continue;
          }

          // Test the form
          const testResult = await this.testSingleForm(page, i, formInfo.fields, url);
          results.push(testResult);

        } catch (error: any) {
          logger.error(`Error testing form #${i}:`, error);
          
          results.push({
            selector: `form:nth-of-type(${i + 1})`,
            fields: [],
            result: 'Failed',
            errorMessage: error.message,
          });
        }
      }
    } catch (error) {
      logger.error('Error in form testing:', error);
    }

    return results;
  }

  private async getFormInfo(page: Page, formIndex: number): Promise<{ fields: FormField[] }> {
    const fields = await page.evaluate((idx) => {
      const form = document.querySelectorAll('form')[idx];
      if (!form) return [];

      const formFields: FormField[] = [];

      // Get all input, select, textarea
      const inputs = form.querySelectorAll('input, select, textarea');

      inputs.forEach((input) => {
        const el = input as any;
        
        // Skip hidden, submit, button
        if (
          el.type === 'hidden' ||
          el.type === 'submit' ||
          el.type === 'button'
        ) {
          return;
        }

        formFields.push({
          name: el.name || el.id || '',
          type: el.type || 'text',
          required: el.required || false,
          label: el.getAttribute('placeholder') || el.getAttribute('aria-label') || undefined,
        });
      });

      return formFields;
    }, formIndex);

    return { fields };
  }

  private isLoginForm(fields: FormField[]): boolean {
    // Check if form has password field and email field (typical login)
    const hasPassword = fields.some((f) => f.type === 'password');
    const hasEmail = fields.some((f) => f.type === 'email' || f.name.toLowerCase().includes('email'));

    if (hasPassword && hasEmail && fields.length <= 3) {
      return true;
    }

    return false;
  }

  private async testSingleForm(
    page: Page,
    formIndex: number,
    fields: FormField[],
    url: string
  ): Promise<FormTestResult> {
    const selector = `form:nth-of-type(${formIndex + 1})`;

    try {
      // Reload page to get fresh form
      await page.goto(url, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1000);

      // Fill form fields
      for (const field of fields) {
        await this.fillField(page, field, formIndex);
      }

      // Submit form and monitor network
      const [response] = await Promise.all([
        page.waitForResponse(
          (res) => res.request().method() === 'POST' || res.request().method() === 'PUT',
          { timeout: 10000 }
        ).catch(() => null),
        page.evaluate((idx) => {
          const form = document.querySelectorAll('form')[idx];
          const submitBtn = form?.querySelector('button[type="submit"], input[type="submit"]') as any;
          if (submitBtn) {
            submitBtn.click();
          } else {
            // Try to submit programmatically
            (form as any)?.submit();
          }
        }, formIndex),
      ]);

      // Wait for response/redirect
      await page.waitForTimeout(2000);

      // Check for success/error indicators
      const pageText = await page.textContent('body');
      const successIndicators = this.findSuccessIndicators(pageText || '');
      const errorIndicators = this.findErrorIndicators(pageText || '');

      const submitStatus = response?.status();

      // Determine result
      let result: 'Passed' | 'Failed' = 'Passed';
      let errorMessage: string | undefined;

      if (errorIndicators.length > 0) {
        result = 'Failed';
        errorMessage = `Form submission showed errors: ${errorIndicators.join(', ')}`;
      } else if (submitStatus && submitStatus >= 400) {
        result = 'Failed';
        errorMessage = `Form submission returned HTTP ${submitStatus}`;
      } else if (successIndicators.length === 0 && (!submitStatus || submitStatus >= 300)) {
        result = 'Failed';
        errorMessage = 'No success indicators found after form submission';
      }

      return {
        selector,
        fields,
        result,
        submitStatus,
        successIndicators,
        errorIndicators,
        errorMessage,
      };

    } catch (error: any) {
      return {
        selector,
        fields,
        result: 'Failed',
        errorMessage: error.message,
      };
    }
  }

  private async fillField(page: Page, field: FormField, formIndex: number): Promise<void> {
    const selector = `form:nth-of-type(${formIndex + 1}) [name="${field.name}"]`;

    try {
      const element = await page.$(selector);
      if (!element) return;

      // Determine what value to use
      let value = '';

      if (field.type === 'email') {
        value = FORM_CONFIG.TEST_DATA.email;
      } else if (field.name.toLowerCase().includes('name')) {
        if (field.name.toLowerCase().includes('first')) {
          value = FORM_CONFIG.TEST_DATA.firstName;
        } else if (field.name.toLowerCase().includes('last')) {
          value = FORM_CONFIG.TEST_DATA.lastName;
        } else {
          value = FORM_CONFIG.TEST_DATA.name;
        }
      } else if (field.name.toLowerCase().includes('phone')) {
        value = FORM_CONFIG.TEST_DATA.phone;
      } else if (field.name.toLowerCase().includes('company')) {
        value = FORM_CONFIG.TEST_DATA.company;
      } else if (field.name.toLowerCase().includes('message') || field.type === 'textarea') {
        value = FORM_CONFIG.TEST_DATA.message;
      } else if (field.type === 'checkbox') {
        await element.check();
        return;
      } else if (field.type === 'select' || field.type === 'select-one') {
        // Select first non-empty option
        await page.selectOption(selector, { index: 1 });
        return;
      } else {
        value = FORM_CONFIG.TEST_DATA.text;
      }

      await element.fill(value);

    } catch (error) {
      logger.warn(`Failed to fill field ${field.name}:`, error);
    }
  }

  private findSuccessIndicators(text: string): string[] {
    const found: string[] = [];
    const lowerText = text.toLowerCase();

    for (const keyword of FORM_CONFIG.SUCCESS_KEYWORDS) {
      if (lowerText.includes(keyword.toLowerCase())) {
        found.push(keyword);
      }
    }

    return found;
  }

  private findErrorIndicators(text: string): string[] {
    const found: string[] = [];
    const lowerText = text.toLowerCase();

    for (const keyword of FORM_CONFIG.ERROR_KEYWORDS) {
      if (lowerText.includes(keyword.toLowerCase())) {
        found.push(keyword);
      }
    }

    return found;
  }
}
