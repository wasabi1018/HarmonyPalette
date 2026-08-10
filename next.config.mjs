/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["@napi-rs/canvas", "pdfjs-dist", "tesseract.js", "sharp"],
  outputFileTracingIncludes: {
    "/api/admin/import/official": ["./node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs"],
    "/api/cron/import-schedules": ["./node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs"],
  },
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
