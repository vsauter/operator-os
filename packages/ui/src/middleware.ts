import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Optional API Key Authentication Middleware
 *
 * By default, no authentication is required (safe for localhost development).
 * To enable API key authentication, set the OPERATOR_API_KEY environment variable.
 *
 * When enabled, all /api/* requests must include the header:
 *   Authorization: Bearer <your-api-key>
 *
 * This is useful if you need to expose the server on a private network.
 */
export function middleware(request: NextRequest) {
  const apiKey = process.env.OPERATOR_API_KEY;

  // If no API key is configured, allow all requests (localhost mode)
  if (!apiKey) {
    return NextResponse.next();
  }

  // Only protect API routes
  if (!request.nextUrl.pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  // Check for Authorization header
  const authHeader = request.headers.get("Authorization");

  if (!authHeader) {
    return NextResponse.json(
      { error: "Authorization header required. Use: Authorization: Bearer <api-key>" },
      { status: 401 }
    );
  }

  // Validate Bearer token format
  const [scheme, token] = authHeader.split(" ");

  if (scheme !== "Bearer" || !token) {
    return NextResponse.json(
      { error: "Invalid authorization format. Use: Authorization: Bearer <api-key>" },
      { status: 401 }
    );
  }

  // Validate API key (constant-time comparison to prevent timing attacks)
  if (!constantTimeEqual(token, apiKey)) {
    return NextResponse.json({ error: "Invalid API key" }, { status: 403 });
  }

  return NextResponse.next();
}

/**
 * Constant-time string comparison to prevent timing attacks
 */
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

// Only run middleware on API routes
export const config = {
  matcher: "/api/:path*",
};
