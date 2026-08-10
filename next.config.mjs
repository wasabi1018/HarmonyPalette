/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["@napi-rs/canvas", "pdfjs-dist", "tesseract.js", "sharp"],
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
