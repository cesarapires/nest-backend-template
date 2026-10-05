import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';

export class RefreshToken {

  private static readonly SECRET_BYTES = 32;

  private static readonly SEPARATOR = '.';

  private static readonly FORMAT = /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.([\w-]{43})$/;

  private constructor(
    public readonly sessionPublicId: string,
    private readonly secret: string,
  ) {}

  public static generate(sessionPublicId: string = randomUUID()): RefreshToken {
    return new RefreshToken(sessionPublicId, randomBytes(RefreshToken.SECRET_BYTES).toString('base64url'));
  }

  public static parse(value: string): RefreshToken | null {
    const match = RefreshToken.FORMAT.exec(value);

    return match ? new RefreshToken(match[1], match[2]) : null;
  }

  public hash(): string {
    return createHash('sha256').update(this.secret).digest('hex');
  }

  public matches(hash: string): boolean {
    const expected = Buffer.from(this.hash(), 'hex');
    const actual = Buffer.from(hash, 'hex');

    return expected.length === actual.length && timingSafeEqual(expected, actual);
  }

  public toString(): string {
    return `${this.sessionPublicId}${RefreshToken.SEPARATOR}${this.secret}`;
  }
}
