/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["pdfjs-dist", "tesseract.js", "sharp"],
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
