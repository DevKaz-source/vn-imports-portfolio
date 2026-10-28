import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { CommerceError } from "@/domain/commerce";
import { endpoint } from "@/server/http";
import { requireAdmin } from "@/server/auth";
import { assertOrigin, rateLimit } from "@/server/security";
import { isDemo } from "@/server/config";
import { serviceDb } from "@/server/supabase";
import { processImage } from "@/server/upload";
export const POST = endpoint(async (request) => {
  assertOrigin(request);
  await requireAdmin();
  await rateLimit(request, "upload", 30);
  if (Number(request.headers.get("content-length") || 0) > 9 * 1024 * 1024)
    throw new CommerceError("Imagem muito grande.", 413);
  const data = await request.formData();
  const file = data.get("file");
  if (!(file instanceof File) || file.size > 8 * 1024 * 1024)
    throw new CommerceError("Envie uma imagem de até 8 MB.");
  const image = await processImage(Buffer.from(await file.arrayBuffer()));
  const id = randomUUID();
  const name = `${id}.webp`;
  if (isDemo()) {
    const folder = path.resolve(process.env.DEMO_DATA_DIR || ".data", "media");
    await mkdir(folder, { recursive: true });
    await writeFile(path.join(folder, name), image);
    return {
      id,
      url: `/api/media/${name}`,
      alt: file.name.replace(/\.[^.]+$/, ""),
    };
  }
  const db = serviceDb();
  const { error } = await db.storage
    .from("product-images")
    .upload(name, image, {
      contentType: "image/webp",
      cacheControl: "31536000",
      upsert: false,
    });
  if (error) throw new CommerceError("Falha ao salvar a imagem.", 503);
  return {
    id,
    url: db.storage.from("product-images").getPublicUrl(name).data.publicUrl,
    alt: file.name.replace(/\.[^.]+$/, ""),
  };
});
