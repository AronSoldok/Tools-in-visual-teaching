import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  outputFileTracingRoot: process.cwd(),
  images: {
    unoptimized: true,
  },
  transpilePackages: ["pixi.js", "@pixi/react"],
};

export default nextConfig;
