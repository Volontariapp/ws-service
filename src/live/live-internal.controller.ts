import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  Put,
  Query,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { LiveWebsocketMessagingType } from '@volontariapp/messaging';
import { NotificationService } from '../gateways/notification.service.js';
import { PutLiveGrantDto } from './dto/put-live-grant.dto.js';
import { LiveGrantService } from './live-grant.service.js';
import { LiveInternalGuard } from './live-internal.guard.js';
import { LIVE_ID_PATTERN } from './live.constants.js';
import {
  LIVE_DEFAULT_REVOKE_REASON,
  isLiveRevokeReason,
  type LiveRevokeReason,
} from './live.types.js';

const grantBodyPipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: false,
});

/** Endpoints internes appeles par api-gateway. Jamais exposes sous `/socket.io`. */
@Controller('internal/live')
@UseGuards(LiveInternalGuard)
export class LiveInternalController {
  private readonly logger = new Logger(LiveInternalController.name);

  constructor(
    private readonly grantService: LiveGrantService,
    private readonly notificationService: NotificationService,
  ) {}

  @Put('grants')
  @HttpCode(HttpStatus.NO_CONTENT)
  async putGrant(@Body(grantBodyPipe) body: PutLiveGrantDto): Promise<void> {
    await this.grantService.grant(body);
  }

  @Delete('grants/:eventId/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async revokeGrant(
    @Param('eventId') eventId: string,
    @Param('userId') userId: string,
    @Query('reason') queryReason: unknown,
    @Body() body: unknown,
  ): Promise<void> {
    this.assertLiveId('eventId', eventId);
    this.assertLiveId('userId', userId);
    const reason = this.resolveReason(queryReason, body);

    const removed = await this.grantService.revoke(eventId, userId);
    if (!removed) {
      // Sans autorisation, l'organisateur n'est pas connu : rien a notifier.
      this.logger.log(`No live grant to remove for user ${userId} on event ${eventId}`);
      return;
    }
    await this.notificationService.notifyUser(
      removed.organizerId,
      LiveWebsocketMessagingType.LIVE_SHARING_STOPPED,
      { eventId, userId, reason },
    );
    this.logger.log(`Live sharing stopped for user ${userId} on event ${eventId}: ${reason}`);
  }

  private assertLiveId(name: string, value: string): void {
    if (!LIVE_ID_PATTERN.test(value)) {
      throw new BadRequestException(`${name} is not a valid identifier`);
    }
  }

  private resolveReason(queryReason: unknown, body: unknown): LiveRevokeReason {
    const bodyReason =
      typeof body === 'object' && body !== null
        ? (body as Record<string, unknown>)['reason']
        : undefined;
    const candidate = queryReason ?? bodyReason;
    if (candidate === undefined) {
      return LIVE_DEFAULT_REVOKE_REASON;
    }
    if (!isLiveRevokeReason(candidate)) {
      throw new BadRequestException('reason must be one of ARRIVED, STOPPED, LEFT');
    }
    return candidate;
  }
}
