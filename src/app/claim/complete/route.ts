import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { completeClaim } from "@/lib/claim/invite";
import { claimCompletePath, parseProfessionIds } from "@/lib/professions";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.redirect(new URL("/join", request.url));
  }
  const professionIds = parseProfessionIds(request.nextUrl.searchParams.get("professions"));
  const next = claimCompletePath(token, professionIds);
  const user = await getSession();
  if (!user) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", next);
    return NextResponse.redirect(login);
  }
  try {
    await completeClaim({ token, profileId: user.id, email: user.email, professionIds });
  } catch {
    return NextResponse.redirect(new URL(`/claim/${token}?error=claim`, request.url));
  }
  return NextResponse.redirect(new URL("/professional?claimed=1", request.url));
}
