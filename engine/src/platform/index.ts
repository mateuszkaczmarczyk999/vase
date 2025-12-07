export * from './types';
export { WebPlatform } from './web/WebPlatform';

import { Platform, PlatformConfig } from './types';
import { WebPlatform } from './web/WebPlatform';

export function createWebPlatform(config: PlatformConfig): Platform {
  return new WebPlatform(config);
}

