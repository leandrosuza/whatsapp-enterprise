import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: false, // Disable React StrictMode to prevent double mounting in development
  
  // Proxy API requests to backend, excluding NextAuth.js routes
  async rewrites() {
    return [
      // Proxy custom login route to backend
      {
        source: '/api/auth/login',
        destination: 'http://localhost:3001/api/auth/login',
      },
      // Proxy WhatsApp API routes to backend
      {
        source: '/api/whatsapp/:path*',
        destination: 'http://localhost:3001/api/whatsapp/:path*',
      },
      // Proxy DDD API routes to backend
      {
        source: '/api/ddds/:path*',
        destination: 'http://localhost:3001/api/ddds/:path*',
      },
      // Proxy conversations API routes to backend
      {
        source: '/api/conversations/:path*',
        destination: 'http://localhost:3001/api/conversations/:path*',
      },
      // Proxy users API routes to backend
      {
        source: '/api/users/:path*',
        destination: 'http://localhost:3001/api/users/:path*',
      },
      // Proxy campaigns API routes to backend
      {
        source: '/api/campaigns/:path*',
        destination: 'http://localhost:3001/api/campaigns/:path*',
      },
      // Proxy contacts API routes to backend
      {
        source: '/api/contacts/:path*',
        destination: 'http://localhost:3001/api/contacts/:path*',
      },
      // Proxy automations API routes to backend
      {
        source: '/api/automations/:path*',
        destination: 'http://localhost:3001/api/automations/:path*',
      },
      // Proxy analytics API routes to backend
      {
        source: '/api/analytics/:path*',
        destination: 'http://localhost:3001/api/analytics/:path*',
      },
      // Proxy AI API routes to backend
      {
        source: '/api/ai/:path*',
        destination: 'http://localhost:3001/api/ai/:path*',
      },
      // Proxy tags API routes to backend
      {
        source: '/api/tags/:path*',
        destination: 'http://localhost:3001/api/tags/:path*',
      },
    ];
  },
};

export default nextConfig;
