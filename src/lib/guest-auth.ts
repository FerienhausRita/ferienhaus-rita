import { createHmac } from "crypto";

// ---------------------------------------------------------------------------
// Secret
// ---------------------------------------------------------------------------

function getSecret(): string {
  const secret = process.env.GUEST_AUTH_SECRET || process.env.CRON_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("GUEST_AUTH_SECRET or CRON_SECRET must be set in production");
    }
    return "dev-guest-auth-secret-change-me";
  }
  return secret;
}

// ---------------------------------------------------------------------------
// Token helpers
// ---------------------------------------------------------------------------

interface TokenPayload {
  bookingId: string;
  lastName: string;
  exp: number;
}

function sign(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("base64url");
}

/**
 * Create a signed guest token.
 * Format: base64url(JSON payload) + "." + HMAC signature
 */
export function createGuestToken(bookingId: string, lastName: string): string {
  const payload: TokenPayload = {
    bookingId,
    lastName,
    exp: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
  };

  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = sign(encoded);
  return `${encoded}.${signature}`;
}

/**
 * Verify a guest token. Returns the payload if valid, null otherwise.
 */
export function verifyGuestToken(
  cookieValue: string
): { bookingId: string; lastName: string } | null {
  if (!cookieValue) return null;

  const dotIndex = cookieValue.lastIndexOf(".");
  if (dotIndex === -1) return null;

  const encoded = cookieValue.slice(0, dotIndex);
  const providedSig = cookieValue.slice(dotIndex + 1);

  // Verify signature
  const expectedSig = sign(encoded);
  if (providedSig !== expectedSig) return null;

  // Decode payload
  try {
    const json = Buffer.from(encoded, "base64url").toString("utf-8");
    const payload: TokenPayload = JSON.parse(json);

    // Check expiration
    if (payload.exp < Date.now()) return null;

    return { bookingId: payload.bookingId, lastName: payload.lastName };
  } catch {
    return null;
  }
}

/**
 * Read and verify the guest token from a Request object or from next/headers.
 * Works in both Route Handlers (with Request) and Server Components (via next/headers).
 */
export async function getGuestBookingFromRequest(
  request?: Request
): Promise<{ bookingId: string } | null> {
  let cookieValue: string | undefined;

  if (request) {
    // Route Handler path: read from Request
    const cookieHeader = request.headers.get("cookie") || "";
    const match = cookieHeader.match(/guest_token=([^;]+)/);
    cookieValue = match?.[1];
  } else {
    // Server Component path: use next/headers
    const { cookies } = await import("next/headers");
    const cookieStore = cookies();
    cookieValue = cookieStore.get("guest_token")?.value;
  }

  if (!cookieValue) return null;

  const result = verifyGuestToken(cookieValue);
  if (!result) return null;

  return { bookingId: result.bookingId };
}
