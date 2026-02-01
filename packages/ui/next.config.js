/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@operator/core"],
  webpack: (config) => {
    // Resolve .js imports to .ts files for workspace packages
    config.resolve.extensionAlias = {
      ".js": [".ts", ".tsx", ".js", ".jsx"],
      ".mjs": [".mts", ".mjs"],
    };
    return config;
  },
};

export default nextConfig;
