import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Enables `next build` to produce a minimal self-contained server
  // (used by the Dockerfile for production deployments)
  output: 'standalone',

  // Allow the dev server to proxy images from external sources if needed
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' }, // Google profile pictures
    ],
  },

  // Proxy API calls under the web origin so cookies are first-party.
  // In production on Render/Vercel this will make requests to /v1/* go to your API
  // (set NEXT_PUBLIC_API_URL to your Render API e.g. https://calendar-api.onrender.com).
  async rewrites() {
    let rawApiUrl =
      process.env.INTERNAL_API_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      'http://localhost:3005';

    if (!rawApiUrl.startsWith('http://') && !rawApiUrl.startsWith('https://')) {
      rawApiUrl = `http://${rawApiUrl}`;
    }

    try {
      const parsed = new URL(rawApiUrl);
      if (!parsed.port && parsed.hostname === 'calendar-api') {
        parsed.port = '3001';
        rawApiUrl = parsed.toString();
      }
    } catch {
      // ignore parse error
    }

    const apiUrl = rawApiUrl.replace(/\/$/, '');

    return [
      {
        source: '/v1/:path*',
        destination: `${apiUrl}/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
