import type { CustomConfig } from './custom-config.js';

export class AppConfigService {
  constructor(public readonly config: CustomConfig) {}

  get port() {
    return this.config.port;
  }
}
