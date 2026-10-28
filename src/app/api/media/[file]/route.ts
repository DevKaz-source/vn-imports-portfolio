import { readFile } from "node:fs/promises";
import path from "node:path";
import { isDemo } from "@/server/config";
export async function GET(request: Request) {
  const file = new URL(request.url).pathname.split("/").pop()!;
  if (!isDemo() || !/^[-a-f0-9]{36}\.webp$/.test(file))
    return new Response(null, { status: 404 });
  try {
    const data = await readFile(
      path.resolve(process.env.DEMO_DATA_DIR || ".data", "media", file),
    );
    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response(null, { status: 404 });
  }
}
