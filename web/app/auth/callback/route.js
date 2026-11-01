import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const errorMsg = searchParams.get("error_description") || searchParams.get("error");
  const next = searchParams.get("next") ?? "/";

  // Determine external host on Vercel (handles reverse proxy)
  const forwardedHost = request.headers.get("x-forwarded-host");
  const isLocalEnv = process.env.NODE_ENV === "development";
  const redirectOrigin = (!isLocalEnv && forwardedHost) ? `https://${forwardedHost}` : origin;

  if (errorMsg) {
    console.error("OAuth error received from provider:", errorMsg);
    return NextResponse.redirect(`${redirectOrigin}/?error=${encodeURIComponent(errorMsg)}`);
  }

  if (code) {
    // Construct redirect response first so cookies are directly attached to outgoing response headers
    let response = NextResponse.redirect(`${redirectOrigin}${next}`);

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseAnonKey) {
      const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options);
            });
          },
        },
      });

      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        return response;
      }

      console.error("Supabase code exchange error:", error.message);
      return NextResponse.redirect(`${redirectOrigin}/?error=${encodeURIComponent(error.message)}`);
    }
  }

  return NextResponse.redirect(`${redirectOrigin}${next}`);
}
