import { Logger } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { SocketManagerService } from '../core/services/socket-manager.service.js';
import { JwtService } from '@volontariapp/auth';
import type { JwtPayload } from '@volontariapp/shared';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class AppGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
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
    const token = client.handshake.headers['x-internal-token'] as string | undefined;

    if (!token) {
      this.logger.warn(`Client ${client.id} disconnected: Missing internal token`);
      client.emit('unauthorized', { message: 'Missing internal token' });
      client.disconnect(true);
      return;
    }

    try {
      const payload = await this.jwtService.verifyInternal<JwtPayload>(token);
      const userId = payload.id;

      void client.join(userId);
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

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }
}
