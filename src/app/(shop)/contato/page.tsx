import { getCatalog } from "@/server/repository";
import { whatsappUrl } from "@/domain/commerce";
export const metadata = { title: "Atendimento" };
export default async function Page() {
  const { settings: s } = await getCatalog();
  const wa = whatsappUrl(
    s.whatsapp,
    "Olá! Vim pelo site da VN Imports e gostaria de atendimento.",
  );
  return (
    <div className="content-page">
      <p className="eyebrow">CONVERSA DIRETA</p>
      <h1>CHEGA JUNTO.</h1>
      <p className="page-intro">
        Dúvida sobre uma peça, tamanho ou pedido? Fale com a VN pelos canais
        oficiais.
      </p>
      <div className="chips">
        <a
          className="button"
          href={s.instagram}
          target="_blank"
          rel="noopener noreferrer"
        >
          INSTAGRAM @VN.IMP_067
        </a>
        {wa && (
          <a
            className="button button-outline"
            href={wa}
            target="_blank"
            rel="noopener noreferrer"
          >
            CHAMAR NO WHATSAPP
          </a>
        )}
      </div>
      {s.email && (
        <p style={{ marginTop: 25 }}>
          <a href={`mailto:${s.email}`}>{s.email}</a>
        </p>
      )}
      {s.serviceHours && <p style={{ marginTop: 20 }}>{s.serviceHours}</p>}
    </div>
  );
}
