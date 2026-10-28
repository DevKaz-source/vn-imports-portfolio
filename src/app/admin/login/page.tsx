import { redirect } from "next/navigation";
import { currentAdmin } from "@/server/auth";
import { isDemo } from "@/server/config";
import { AdminLogin } from "@/components/admin/login";
export default async function Page() {
  if (await currentAdmin()) redirect("/admin");
  return <AdminLogin demo={isDemo()} />;
}
