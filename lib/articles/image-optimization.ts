import sharp from "sharp";

export const articleImageSourceLimitBytes = 10 * 1024 * 1024;
export const articleImageStoredLimitBytes = 5 * 1024 * 1024;

const originalExtensions: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export type OptimizedArticleImage = {
  buffer: Buffer;
  contentType: string;
  extension: string;
  width: number | null;
  height: number | null;
};

export async function optimizeArticleImage(
  input: Buffer,
  contentType: string,
): Promise<OptimizedArticleImage> {
  const extension = originalExtensions[contentType];
  if (!extension) throw new Error("Unsupported article image type.");
  if (input.byteLength <= 0 || input.byteLength > articleImageSourceLimitBytes) {
    throw new Error("Article images must be between 1 byte and 10 MB.");
  }

  const metadata = await sharp(input, { animated: true }).metadata();
  const animated = Number(metadata.pages || 1) > 1;
  let output = input;
  let outputType = contentType;
  let outputExtension = extension;
  let width = metadata.width || null;
  let height = metadata.pageHeight || metadata.height || null;

  if (!animated && contentType !== "image/gif") {
    const converted = await sharp(input)
      .rotate()
      .resize({ width: 2400, height: 2400, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82, effort: 4, smartSubsample: true })
      .toBuffer({ resolveWithObject: true });
    if (converted.data.byteLength < input.byteLength) {
      output = converted.data;
      outputType = "image/webp";
      outputExtension = "webp";
      width = converted.info.width;
      height = converted.info.height;
    }
  }

  if (output.byteLength > articleImageStoredLimitBytes) {
    throw new Error("Optimized article images must be 5 MB or smaller.");
  }

  return { buffer: output, contentType: outputType, extension: outputExtension, width, height };
}
