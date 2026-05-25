import { Injectable, Logger, Inject } from '@nestjs/common';
import { NestRedisProvider } from '@volontariapp/bridge-nest';
import type { RedisProvider } from '@volontariapp/bridge';
import type { Redis } from 'ioredis';

@Injectable()
export class SocketManagerService {
  private readonly logger = new Logger(SocketManagerService.name);
  private readonly REDIS_KEY = 'ws_users';

  private get redisClient(): Redis {
    return this.redisProvider.getDriver();
  }

  constructor(@Inject(NestRedisProvider) private readonly redisProvider: RedisProvider) {}

  async trackUser(userId: string): Promise<void> {
    await this.redisClient.sadd(this.REDIS_KEY, userId);
    this.logger.log(`Tracked user ${userId} in Redis`);
  }

  async untrackUser(userId: string): Promise<void> {
    await this.redisClient.srem(this.REDIS_KEY, userId);
    this.logger.log(`Untracked user ${userId} from Redis`);
  }

  async isUserTracked(userId: string): Promise<boolean> {
    const isMember = await this.redisClient.sismember(this.REDIS_KEY, userId);
    return isMember === 1;
  }
}
