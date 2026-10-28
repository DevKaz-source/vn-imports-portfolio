import { redirect } from "next/navigation";
import { currentAdmin } from "@/server/auth";
import { getState } from "@/server/repository";
import { isDemo } from "@/server/config";
import { AdminApp } from "@/components/admin/admin-app";
export default async function Page() {
  const admin = await currentAdmin();
  if (!admin) redirect("/admin/login");
  return (
    <AdminApp
      initial={{ ...(await getState()), demo: isDemo() }}
      admin={admin}
    />
  );
}
