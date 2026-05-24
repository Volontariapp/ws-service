import type { JwtPayload } from '@volontariapp/shared';
import { UserRoles } from '@volontariapp/shared';

export const createJwtPayloadMock = (overrides?: Partial<JwtPayload>): JwtPayload => {
  return {
    id: 'test-user-id',
    role: UserRoles.VOLUNTEER,
    ...overrides,
  };
};
