const nextConfig = {
  reactStrictMode: true,
  // Fix for Turbopack error when using webpack config
  turbopack: {},
  experimental: {
    optimizeCss: true,
  },
  webpack: (config: any) => {
    config.externals.push({
      'utf-8-validate': 'commonjs utf-8-validate',
      'bufferutil': 'commonjs bufferutil',
    });
    return config;
  },
} satisfies import('next').NextConfig as any;

export default nextConfig;
