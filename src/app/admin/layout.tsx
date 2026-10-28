import "./admin.css";
export const metadata = {
  title: "Painel VN Imports",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";
export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
