import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { completeClaim } from "@/lib/claim/invite";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.redirect(new URL("/join", request.url));
  }
  const user = await getSession();
  if (!user) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", `/claim/complete?token=${token}`);
    return NextResponse.redirect(login);
  }
  try {
    await completeClaim({ token, profileId: user.id, email: user.email });
  } catch {
    return NextResponse.redirect(new URL(`/claim/${token}?error=claim`, request.url));
  }
  return NextResponse.redirect(new URL("/professional?claimed=1", request.url));
}
