import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /** Transpile internal monorepo packages */
  transpilePackages: [
    '@vambiant/api',
    '@vambiant/auth',
    '@vambiant/db',
    '@vambiant/domain',
    '@vambiant/ui',
    '@vambiant/validators',
  ],

  /** Enable React strict mode for development */
  reactStrictMode: true,

  /** Opt into the App Router */
  experimental: {},
};

export default nextConfig;
