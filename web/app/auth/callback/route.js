import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    if (supabase) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        console.error("Supabase code exchange error:", error.message);
      }
    }
  }

  // Handle reverse-proxy origin on Vercel production
  const forwardedHost = request.headers.get("x-forwarded-host");
  const isLocalEnv = process.env.NODE_ENV === "development";

  if (isLocalEnv || !forwardedHost) {
    return NextResponse.redirect(`${origin}${next}`);
  }

  // On Vercel, use https with the original forwarded domain
  return NextResponse.redirect(`https://${forwardedHost}${next}`);
}

