import { OrderPage } from "@/components/order-page";
export const metadata = { title: "Seu pedido", robots: { index: false } };
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <OrderPage id={(await params).id} />;
}
