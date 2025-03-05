import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  productionBrowserSourceMaps: true,
  experimental: {
    serverSourceMaps: true,
  },
  webpack: (config, { dev }) => {
    // 개발 모드에서 소스맵 활성화
    if (dev) {
      config.devtool = 'source-map';
    }
    return config;
  },
};

export default nextConfig;
