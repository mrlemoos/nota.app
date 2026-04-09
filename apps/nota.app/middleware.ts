import { next } from '@vercel/functions';
import { isSpaShellPathnameAllowed } from './app/lib/spa-pathname-policy.js';

export const config = {
  matcher: '/((?!api/).*)',
};

export default function middleware(request: Request): Response {
  const pathname = new URL(request.url).pathname;
  if (isSpaShellPathnameAllowed(pathname)) {
    return next();
  }
  return new Response('Not Found', {
    status: 404,
    statusText: 'Not Found',
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
