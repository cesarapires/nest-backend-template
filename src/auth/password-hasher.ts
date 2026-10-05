import { Injectable } from '@nestjs/common';
import { hash, verify } from '@node-rs/argon2';

@Injectable()
export class PasswordHasher {

  private static readonly DUMMY_HASH = '$argon2id$v=19$m=19456,t=2,p=1$KNLUbl11qPxqqMXxyxQ9qQ$te+Y9nYTvct2L42DIBPgTSGGQqK6a1YfavI4EOekZ7Y';

  public hash(password: string): Promise<string> {
    return hash(password);
  }

  public async verify(passwordHash: string | null, password: string): Promise<boolean> {
    const matches = await verify(passwordHash ?? PasswordHasher.DUMMY_HASH, password);

    return passwordHash !== null && matches;
  }
}
