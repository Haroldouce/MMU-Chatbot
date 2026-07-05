import { createServerClient } from "@supabase/ssr"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) {
          return req.cookies.get(name)?.value
        },
        set(name, value, options) {
          res.cookies.set({ name, value, ...options })
        },
        remove(name, options) {
          res.cookies.set({ name, value: "", ...options })
        },
      },
    },
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = req.nextUrl.pathname
  const isProtectedChat =
    pathname === "/chat" || pathname.startsWith("/chat/")
  const isAdminRoute =
    pathname.startsWith("/admin") && pathname !== "/admin/login"

  if (!user && isProtectedChat) {
    return NextResponse.redirect(new URL("/login", req.url))
  }

  if (user && pathname.startsWith("/login")) {
    return NextResponse.redirect(new URL("/chat", req.url))
  }

  if (!user && pathname === "/profile") {
    return NextResponse.redirect(new URL("/login", req.url))
  }

  if (isAdminRoute) {
    if (!user) {
      return NextResponse.redirect(new URL("/admin/login", req.url))
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle()

    if (profile?.role !== "admin") {
      return NextResponse.redirect(
        new URL("/admin/login?error=forbidden", req.url),
      )
    }
  }

  if (user && pathname === "/admin/login") {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle()

    if (profile?.role === "admin") {
      return NextResponse.redirect(new URL("/admin/dashboard", req.url))
    }
  }

  return res
}

export const config = {
  matcher: ["/chat/:path*", "/login", "/profile", "/admin/:path*"],
}
