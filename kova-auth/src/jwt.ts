import { SignJWT, jwtVerify } from 'jose';

const JWT_SECRET = process.env.JWT_SECRET ?? 'kova-dev-secret-change-in-production';
const JWT_ACCESS_TTL = '15m';

export interface JWTPayload {
  sub: string;
  tenantId: string;
  branchId: string;
  terminalId: string;
  role: string;
  apps?: string[];
}

export async function signAccessJwt(payload: JWTPayload): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt()
    .setExpirationTime(JWT_ACCESS_TTL)
    .sign(new TextEncoder().encode(JWT_SECRET));
}

export async function verifyAccessJwt(token: string): Promise<JWTPayload> {
  const { payload } = await jwtVerify(
    token,
    new TextEncoder().encode(JWT_SECRET)
  );
  return payload as unknown as JWTPayload;
}

export function getJwksJson(): Record<string, unknown> {
  // Simplified JWKS endpoint response for dev.
  // In production, expose the public key of an RS256/EdDSA keypair.
  return { keys: [] };
}
