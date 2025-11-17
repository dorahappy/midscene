/**
 * CDP Browser Connector
 * Connect to any CDP-compatible browser via WebSocket URL
 */

// Core connector function
export { connectToCdp } from './connector';
export type { ConnectToCdpOptions } from './connector';

// Remote browser page implementation
export { RemoteBrowserPage } from './page';

// Types
export type { BrowserEngine } from './types';
export { CdpConnectionError } from './types';
