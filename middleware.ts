import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  
  const hostname = request.headers.get('x-forwarded-host') || request.headers.get('host');
  const pathname = request.nextUrl.pathname;
  console.log('hostname', hostname);
  console.log('KRAIJAI_HOST', process.env.NEXT_PUBLIC_KRAIJAI_HOST);

  // Handle production environment
  if (hostname === process.env.NEXT_PUBLIC_KRAIJAI_HOST) {
    
    // Don't rewrite if the path already includes /kraijai
    if (pathname.startsWith('/kraijai/')) {
      return NextResponse.next();
    }
    
    // Rewrite all paths to include /kraijai prefix
    return NextResponse.rewrite(new URL('/kraijai' + pathname, request.url));
  }
  
  // Handle local development
  // If accessing /api or /share directly, rewrite to include /kraijai
  if (pathname.startsWith('/api/') || pathname.startsWith('/share/')) {
    return NextResponse.rewrite(new URL('/kraijai' + pathname, request.url));
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};