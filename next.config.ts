import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '20mb',
    },
    middlewareClientMaxBodySize: '20mb',
  },
  turbopack: {
    resolveAlias: {
      // pdfjs-dist bundles a NodeCanvasFactory that requires 'canvas' (Node-only).
      // Stub it out so Turbopack can bundle pdfjs for the browser.
      canvas: "./lib/canvas-stub.js",
    },
  },
};

export default nextConfig;
