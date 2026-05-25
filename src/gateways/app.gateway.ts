import { Logger } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { OnApplicationShutdown } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { SocketManagerService } from '../core/services/socket-manager.service.js';
import { JwtService } from '@volontariapp/auth';
import type { JwtPayload } from '@volontariapp/shared';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class AppGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect, OnApplicationShutdown
{
  private readonly logger = new Logger(AppGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly socketManager: SocketManagerService,
    private readonly jwtService: JwtService,
  ) {}

  afterInit() {
    this.logger.log('WebSocket Gateway initialized');
  }

  async handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
    const token =
      (client.handshake.query['internalToken'] as string | undefined) ??
      (client.handshake.headers['x-internal-token'] as string | undefined);

    if (!token) {
      this.logger.warn(`Client ${client.id} disconnected: Missing internal token`);
      client.emit('unauthorized', { message: 'Missing internal token' });
      client.disconnect(true);
      return;
    }

    try {
      const payload = await this.jwtService.verifyInternal<JwtPayload>(token);
      const userId = payload.id;
      const existingSockets = await this.server.in(userId).fetchSockets();
      for (const existing of existingSockets) {
        if (existing.id !== client.id) {
          this.logger.log(
            `Disconnecting stale socket ${existing.id} for user ${userId} (replaced by ${client.id})`,
          );
          existing.disconnect(true);
        }
      }

      await client.join(userId);
      (client.data as { userId?: string }).userId = userId;
      await this.socketManager.trackUser(userId);
      this.logger.log(
        `Client ${client.id} joined room ${userId} and tracked in Redis (Role: ${payload.role})`,
      );
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.logger.error(`Error processing client connection from ${client.id}: ${error.message}`);
      }
      this.logger.warn(`Client ${client.id} disconnected: Invalid internal token`);
      client.emit('unauthorized', { message: 'Invalid or expired internal token' });
      client.disconnect(true);
    }
  }

  async handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    const userId = (client.data as { userId?: string }).userId;

    if (userId) {
      try {
        // Only untrack if this was the last socket for this user
        const remainingSockets = await this.server.in(userId).fetchSockets();
        if (remainingSockets.length === 0) {
          await this.socketManager.untrackUser(userId);
          this.logger.log(`Last socket for user ${userId} disconnected. Untracked from Redis.`);
        }
      } catch (error) {
        this.logger.error(`Error untracking user ${userId} on disconnect`, error);
      }
    }
  }

  async onApplicationShutdown() {
    this.logger.log('WebSocket Gateway shutting down, cleaning up tracked users...');
    const sockets = await this.server.fetchSockets();
    for (const client of sockets) {
      const userId = (client.data as { userId?: string }).userId;
      if (userId) {
        await this.socketManager.untrackUser(userId);
      }
      client.disconnect(true);
    }
    this.logger.log('Cleanup complete');
  }
}
