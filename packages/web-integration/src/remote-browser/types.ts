/**
 * Type definitions for CDP Browser Connector
 */

/**
 * Browser engine type
 */
export type BrowserEngine = 'puppeteer' | 'playwright';

/**
 * CDP connection error
 */
export class CdpConnectionError extends Error {
  constructor(
    message: string,
    public code?: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'CdpConnectionError';
  }
}
