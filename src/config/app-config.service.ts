import type { CustomConfig } from './custom-config.js';

export class AppConfigService {
  constructor(public readonly config: CustomConfig) {}

  get port() {
    return this.config.port;
  }

  get redis() {
    return this.config.redis;
  }

  get globalRedis() {
    return this.config.globalRedis;
  }

  get db() {
    return this.config.db;
  }

  get scatterGather() {
    return this.config.scatterGather;
  }
}
