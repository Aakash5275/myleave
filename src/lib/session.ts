import { SignJWT, jwtVerify } from "jose";

export const COOKIE = "myleave_session";

export type SessionRole = "ADMIN" | "MANAGER" | "EMPLOYEE";

export function homeFor(role: SessionRole) {
  if (role === "ADMIN") return "/admin";
  if (role === "MANAGER") return "/manager";
  return "/employee";
}

export type SessionPayload = {
  sub: string;
  role: SessionRole;
  email: string;
};

function secret() {
  const value = process.env.AUTH_SECRET;
  if (!value || value.length < 32) {
    throw new Error("AUTH_SECRET must be set to at least 32 characters.");
  }
  return new TextEncoder().encode(value);
}

export function cookieOptions(maxAge = 60 * 60 * 24 * 7) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}

export async function signSession(input: {
  id: string;
  role: SessionRole;
  email: string;
}) {
  return new SignJWT({ role: input.role, email: input.email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(input.id)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret());
}

export async function readSession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    const role = payload.role;
    const email = payload.email;
    if ((role !== "ADMIN" && role !== "MANAGER" && role !== "EMPLOYEE") || !payload.sub || typeof email !== "string") {
      return null;
    }
    return { sub: payload.sub, role, email };
  } catch {
    return null;
  }
}
