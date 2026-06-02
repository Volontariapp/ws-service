import { IoAdapter } from '@nestjs/platform-socket.io';
import type { Server, ServerOptions } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import type { RedisConfig } from '@volontariapp/config';

export class RedisIoAdapter extends IoAdapter {
  private adapterConstructor!: ReturnType<typeof createAdapter>;

  async connectToRedis(redisConfig: RedisConfig & { db?: number }): Promise<void> {
    const url = `redis://${redisConfig.password ? `:${redisConfig.password}@` : ''}${redisConfig.host}:${String(redisConfig.port)}/${String(redisConfig.db ?? 0)}`;

    const pubClient = createClient({ url });
    const subClient = pubClient.duplicate();

    await Promise.all([pubClient.connect(), subClient.connect()]);

    this.adapterConstructor = createAdapter(pubClient, subClient);
  }

  createIOServer(port: number, options?: ServerOptions): Server {
    const server = super.createIOServer(port, {
      ...options,
      cors: {
        origin: true,
        methods: ['GET', 'POST'],
        credentials: true,
      },
    }) as Server;
    server.adapter(this.adapterConstructor);
    return server;
  }
}
