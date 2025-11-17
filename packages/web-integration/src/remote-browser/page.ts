/**
 * Remote Browser Page
 * Wraps a Puppeteer or Playwright Page connected via CDP (Chrome DevTools Protocol)
 */

import type {
  Browser as PlaywrightBrowser,
  Page as PlaywrightPage,
} from 'playwright';
import type {
  Browser as PuppeteerBrowser,
  Page as PuppeteerPage,
} from 'puppeteer';
import type { BrowserEngine } from './types';
import { CdpConnectionError } from './types';

const DEFAULT_TIMEOUT = 30000;

/**
 * Remote Browser Page implementation
 * Connects to any CDP-compatible browser via WebSocket URL
 */
export class RemoteBrowserPage {
  private cdpWsUrl: string;
  private engine: BrowserEngine;
  private browser: PuppeteerBrowser | PlaywrightBrowser | null = null;
  private page: PuppeteerPage | PlaywrightPage | null = null;
  private isConnected_ = false;

  constructor(cdpWsUrl: string, engine: BrowserEngine) {
    this.cdpWsUrl = cdpWsUrl;
    this.engine = engine;
  }

  /**
   * Connect to the remote browser via CDP
   */
  async connect(options: {
    connectionTimeout?: number;
  } = {}): Promise<void> {
    const { connectionTimeout = DEFAULT_TIMEOUT } = options;

    if (this.isConnected_) {
      return;
    }

    try {
      if (this.engine === 'puppeteer') {
        await this.connectPuppeteer(connectionTimeout);
      } else {
        await this.connectPlaywright(connectionTimeout);
      }

      this.isConnected_ = true;
    } catch (error: any) {
      throw new CdpConnectionError(
        `Failed to connect to remote browser: ${error.message}`,
        'CDP_CONNECTION_FAILED',
        error,
      );
    }
  }

  /**
   * Connect using Puppeteer
   */
  private async connectPuppeteer(connectionTimeout: number): Promise<void> {
    // Dynamic import to avoid requiring puppeteer if not used
    const puppeteer = await import('puppeteer');

    // Connect to CDP endpoint with timeout
    const connectPromise = puppeteer.connect({
      browserWSEndpoint: this.cdpWsUrl,
    });

    // Implement timeout manually
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Connection timeout')), connectionTimeout);
    });

    this.browser = (await Promise.race([
      connectPromise,
      timeoutPromise,
    ])) as PuppeteerBrowser;

    // Get the default context and first page
    const pages = await this.browser.pages();
    if (pages.length === 0) {
      // Create a new page if none exists
      this.page = (await this.browser.newPage()) as PuppeteerPage;
    } else {
      // Use the first existing page
      this.page = pages[0] as PuppeteerPage;
    }
  }

  /**
   * Connect using Playwright
   */
  private async connectPlaywright(connectionTimeout: number): Promise<void> {
    // Dynamic import to avoid requiring playwright if not used
    const { chromium } = await import('playwright');

    // Connect to CDP endpoint
    this.browser = (await chromium.connectOverCDP(this.cdpWsUrl, {
      timeout: connectionTimeout,
    })) as PlaywrightBrowser;

    // Get the default context
    const contexts = this.browser.contexts();
    if (contexts.length === 0) {
      throw new CdpConnectionError(
        'No browser context found after connecting',
        'NO_CONTEXT',
      );
    }

    const context = contexts[0];
    const pages = context.pages();

    if (pages.length === 0) {
      // Create a new page if none exists
      this.page = (await context.newPage()) as PlaywrightPage;
    } else {
      // Use the first existing page
      this.page = pages[0] as PlaywrightPage;
    }
  }

  /**
   * Get the underlying browser instance
   */
  getBrowser(): PuppeteerBrowser | PlaywrightBrowser {
    if (!this.browser) {
      throw new CdpConnectionError('Not connected. Call connect() first.');
    }
    return this.browser;
  }

  /**
   * Get the underlying page instance
   */
  getPage(): PuppeteerPage | PlaywrightPage {
    if (!this.page) {
      throw new CdpConnectionError('Not connected. Call connect() first.');
    }
    return this.page;
  }

  /**
   * Get the CDP WebSocket URL
   */
  getCdpWsUrl(): string {
    return this.cdpWsUrl;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.isConnected_;
  }

  /**
   * Destroy and close connections
   * Called by Agent.destroy() through WebPage.destroy()
   */
  async destroy(): Promise<void> {
    if (this.browser) {
      try {
        if (this.engine === 'puppeteer') {
          await (this.browser as PuppeteerBrowser).disconnect();
        } else {
          await (this.browser as PlaywrightBrowser).close();
        }
      } catch (error) {
        console.warn('Error closing browser connection:', error);
      }
      this.browser = null;
    }

    this.page = null;
    this.isConnected_ = false;
  }
}
