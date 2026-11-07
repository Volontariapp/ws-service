import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@volontariapp/auth';
import type { JwtPayload } from '@volontariapp/shared';

interface InternalUserBindingRequest {
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
  params: Record<string, string | undefined>;
}

const INTERNAL_TOKEN_HEADER = 'x-internal-token';

/**
 * Garde de `/internal/live` (D18) : un jeton interne valide ne suffit pas, il doit porter
 * l'identite de l'utilisateur vise (corps du PUT, chemin du DELETE).
 */
@Injectable()
export class InternalUserBindingGuard implements CanActivate {
  private readonly logger = new Logger(InternalUserBindingGuard.name);

  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<InternalUserBindingRequest>();

    const token = request.headers[INTERNAL_TOKEN_HEADER];
    if (typeof token !== 'string' || token === '') {
      throw new UnauthorizedException('Missing internal token');
    }

    const callerId = await this.resolveCallerId(token);

    const targetUserId = this.readTargetUserId(request);
    if (targetUserId !== callerId) {
      this.logger.warn(
        `Rejected /internal/live request: token of user ${callerId} targets another user`,
      );
      throw new ForbiddenException('Internal token does not match the target user');
    }
    return true;
  }

  private async resolveCallerId(token: string): Promise<string> {
    let callerId: string;
    try {
      const payload = await this.jwtService.verifyInternal<JwtPayload>(token);
      callerId = payload.id;
    } catch {
      this.logger.warn('Rejected /internal/live request: invalid internal token');
      throw new UnauthorizedException('Invalid internal token');
    }
    if (typeof callerId !== 'string' || callerId === '') {
      throw new UnauthorizedException('Invalid internal token');
    }
    return callerId;
  }

  private readTargetUserId(request: InternalUserBindingRequest): string | undefined {
    const fromPath = request.params['userId'];
    if (typeof fromPath === 'string') {
      return fromPath;
    }
    const body = request.body;
    if (typeof body === 'object' && body !== null) {
      const fromBody = (body as Record<string, unknown>)['userId'];
      if (typeof fromBody === 'string') {
        return fromBody;
      }
    }
    return undefined;
  }
}
