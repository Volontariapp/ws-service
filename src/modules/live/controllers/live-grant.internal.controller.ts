import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  Put,
  Query,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { PutLiveGrantCommandDTO } from '../dto/request/command/put-live-grant.command.dto.js';
import { RevokeLiveGrantCommandDTO } from '../dto/request/command/revoke-live-grant.command.dto.js';
import { InternalUserBindingGuard } from '../guards/internal-user-binding.guard.js';
import { LiveGrantService } from '../services/live-grant.service.js';

const grantBodyPipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: false,
});

/** Endpoints internes appeles par api-gateway. Jamais exposes sous `/socket.io`. */
@Controller('internal/live')
@UseGuards(InternalUserBindingGuard)
export class LiveGrantInternalController {
  constructor(private readonly grantService: LiveGrantService) {}

  @Put('grants')
  @HttpCode(HttpStatus.NO_CONTENT)
  async putGrant(@Body(grantBodyPipe) body: PutLiveGrantCommandDTO): Promise<void> {
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
    await this.grantService.revoke(
      RevokeLiveGrantCommandDTO.fromRequest(eventId, userId, queryReason, body),
    );
  }
}
