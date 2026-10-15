import { NextRequest, NextResponse } from 'next/server'

const canonicalHost = 'zosavuta.com'
const acceptedHosts = new Set([canonicalHost, `www.${canonicalHost}`])

export function proxy(request: NextRequest) {
  const host = (
    request.headers.get('x-forwarded-host') ??
    request.headers.get('host') ??
    request.nextUrl.hostname
  )
    .split(',')[0]
    .trim()
    .toLowerCase()
  const forwardedProtocol = request.headers
    .get('x-forwarded-proto')
    ?.split(',')[0]
    .trim()
  const protocol = forwardedProtocol ?? request.nextUrl.protocol.slice(0, -1)

  if (
    process.env.NODE_ENV === 'production' &&
    acceptedHosts.has(host) &&
    protocol === 'http'
  ) {
    const destination = new URL(
      request.nextUrl.pathname + request.nextUrl.search,
      `https://${canonicalHost}`,
    )
    return NextResponse.redirect(destination, 308)
  }

  return NextResponse.next()
}

export const config = {
  matcher: '/:path*',
}
