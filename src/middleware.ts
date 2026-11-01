import { unsealData } from "iron-session";
import { NextResponse, type NextRequest } from "next/server";
import { getSessionSecret, SESSION_COOKIE, type SessionData } from "@/lib/session-config";

export async function middleware(req: NextRequest) {
  const sealed = req.cookies.get(SESSION_COOKIE)?.value;
  if (sealed) {
    try {
      const data = await unsealData<SessionData>(sealed, { password: await getSessionSecret() });
      if (data.isAdmin) return NextResponse.next();
    } catch {
      // Fall through to login on a tampered or stale cookie.
    }
  }
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  // Everything except the login page and static assets.
  matcher: ["/((?!login|_next/static|_next/image|favicon.ico|icon.svg).*)"],
};
