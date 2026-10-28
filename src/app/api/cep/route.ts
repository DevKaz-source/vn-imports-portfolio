import { CommerceError } from "@/domain/commerce";
import { endpoint } from "@/server/http";
import { rateLimit } from "@/server/security";
export const GET = endpoint(async (request) => {
  await rateLimit(request, "cep", 30);
  const cep = new URL(request.url).searchParams.get("cep") || "";
  if (!/^\d{8}$/.test(cep)) throw new CommerceError("CEP inválido.");
  return { street: "", district: "", city: "", state: "" };
});
