import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { CommerceError } from "@/domain/commerce";
export function endpoint(handler: (request: Request) => Promise<unknown>) {
  return async (request: Request) => {
    try {
      const data = await handler(request);
      return NextResponse.json(data ?? { ok: true }, {
        headers: { "Cache-Control": "no-store" },
      });
    } catch (e) {
      if (e instanceof ZodError)
        return NextResponse.json(
          { error: e.issues[0]?.message || "Confira os campos informados." },
          { status: 400 },
        );
      if (e instanceof CommerceError)
        return NextResponse.json({ error: e.message }, { status: e.status });
      console.error(
        "VN request failed",
        e instanceof Error ? e.name : "UnknownError",
      );
      return NextResponse.json(
        {
          error:
            "Não foi possível concluir agora. Tente novamente em instantes.",
        },
        { status: 500 },
      );
    }
  };
}
export async function readJson(request: Request) {
  if (Number(request.headers.get("content-length") || 0) > 250000)
    throw new CommerceError("Requisição muito grande.", 413);
  const body = await request.text();
  if (body.length > 250000)
    throw new CommerceError("Requisição muito grande.", 413);
  try {
    return JSON.parse(body);
  } catch {
    throw new CommerceError("Requisição inválida.");
  }
}
