import sharp from "sharp";
import { CommerceError } from "@/domain/commerce";
export async function processImage(buffer: Buffer) {
  if (buffer.length > 8 * 1024 * 1024)
    throw new CommerceError("A imagem deve ter no máximo 8 MB.");
  let metadata;
  try {
    metadata = await sharp(buffer, { limitInputPixels: 40000000 }).metadata();
  } catch {
    throw new CommerceError("Imagem inválida. Use JPG, PNG, WebP ou AVIF.");
  }
  if (
    !["jpeg", "png", "webp", "avif", "heif"].includes(metadata.format || "") ||
    (metadata.pages || 1) > 1
  )
    throw new CommerceError("Use uma imagem estática JPG, PNG, WebP ou AVIF.");
  if (
    !metadata.width ||
    !metadata.height ||
    metadata.width * metadata.height > 40000000
  )
    throw new CommerceError("Resolução da imagem acima do limite.");
  return sharp(buffer, { limitInputPixels: 40000000 })
    .rotate()
    .resize({
      width: 2000,
      height: 2000,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: 84 })
    .toBuffer();
}
