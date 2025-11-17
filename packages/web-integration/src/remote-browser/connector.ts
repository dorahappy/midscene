/**
 * CDP (Chrome DevTools Protocol) Browser Connector
 * Connects to any CDP-compatible browser via WebSocket URL
 */

import type { Page as PlaywrightPage } from 'playwright';
import type { Page as PuppeteerPage } from 'puppeteer';
import { RemoteBrowserPage } from './page';
import type { BrowserEngine } from './types';

/**
 * Options for connectToCdp
 */
export interface ConnectToCdpOptions<T = any> {
  /**
   * Browser engine to use
   * @default 'puppeteer'
   */
  engine?: BrowserEngine;

  /**
   * Connection timeout in milliseconds
   * @default 30000
   */
  connectionTimeout?: number;

  /**
   * Factory function to create agent from page
   * @param page - Puppeteer or Playwright page instance
   * @returns Agent instance with destroy method (can be async)
   */
  createAgent: (page: PuppeteerPage | PlaywrightPage) => T | Promise<T>;
}

/**
 * Connect to a CDP WebSocket URL and create an Agent
 *
 * @param cdpWsUrl - CDP WebSocket URL (e.g., ws://localhost:9222/devtools/browser/xxx)
 * @param options - Connection options with createAgent factory
 * @returns Agent created by createAgent function
 *
 * @example
 * ```typescript
 * import { PuppeteerAgent } from '@midscene/web/puppeteer';
 * import { connectToCdp } from '@midscene/web/remote-browser';
 *
 * // Connect to remote browser
 * const agent = await connectToCdp('ws://localhost:9222/devtools/browser/xxx', {
 *   engine: 'puppeteer',
 *   createAgent: (page) => new PuppeteerAgent(page)
 * });
 *
 * // Use AI methods
 * await agent.aiAction('Click the button');
 * const result = await agent.aiQuery('Get title: {title: string}');
 *
 * // Cleanup
 * await agent.destroy();
 * ```
 */
export async function connectToCdp<T extends { destroy?: () => Promise<void> }>(
  cdpWsUrl: string,
  options: ConnectToCdpOptions<T>,
): Promise<T> {
  const { engine = 'puppeteer', connectionTimeout, createAgent } = options;

  // 1. Create RemoteBrowserPage and connect
  const remotePage = new RemoteBrowserPage(cdpWsUrl, engine);
  await remotePage.connect({
    connectionTimeout,
  });

  // 2. Get the raw page instance
  const page = remotePage.getPage();

  // 3. Create Agent using user-provided factory (await in case it's async)
  const agent = await createAgent(page);

  return agent;
}
