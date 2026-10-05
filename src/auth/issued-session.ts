import type { RefreshToken } from './refresh-token.js';
import type { Session } from './session.entity.js';

export interface IssuedSession {
  session: Session;
  refreshToken: RefreshToken;
}
