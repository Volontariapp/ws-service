import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import { LiveClientMessageType } from '@volontariapp/messaging';
import type { Socket } from 'socket.io';
import { parseLivePositionCommand } from '../dto/request/command/live-position.command.dto.js';
import { LivePositionService, type LivePositionResult } from '../services/live-position.service.js';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class LivePositionGateway {
  private readonly logger = new Logger(LivePositionGateway.name);

  constructor(private readonly positionService: LivePositionService) {}

  /**
   * Journaux : identifiants et raisons seulement. Jamais une latitude ou une longitude, ni brute,
   * ni arrondie, ni dans un objet, ni dans une chaine (le masquage ne couvre que les cles).
   */
  @SubscribeMessage(LiveClientMessageType.LIVE_POSITION)
  async handlePosition(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: unknown,
  ): Promise<void> {
    // identite posee par AppGateway.handleConnection
    const userId = (client.data as { userId?: string }).userId;
    if (!userId) {
      this.logger.debug(`Ignored live.position from socket ${client.id}: not authenticated yet`);
      return;
    }
    const command = await parseLivePositionCommand(body);
    if (!command) {
      this.logger.warn(`Ignored live.position from user ${userId}: invalid payload`);
      return;
    }

    try {
      const result = await this.positionService.report(userId, command);
      this.logResult(result, userId, command.eventId);
    } catch (error: unknown) {
      const reason = error instanceof Error ? error.name : 'unknown error';
      this.logger.error(
        `live.position failed for user ${userId} on event ${command.eventId}: ${reason}`,
      );
    }
  }

  private logResult(result: LivePositionResult, userId: string, eventId: string): void {
    switch (result.kind) {
      case 'REVOKED':
        this.logger.log(`Live position refused for user ${userId} on event ${eventId}: no grant`);
        return;
      case 'THROTTLED':
        this.logger.debug(
          `Ignored live.position from user ${userId} on event ${eventId}: too soon`,
        );
        return;
      case 'ARRIVED':
        this.logger.log(`Live sharing stopped for user ${userId} on event ${eventId}: ARRIVED`);
        return;
      case 'ALREADY_STOPPED':
      case 'FORWARDED':
        return;
    }
  }
}
