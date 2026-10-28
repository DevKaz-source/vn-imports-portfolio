[English](README.md) · **Português (Brasil)**

# VN Imports — portfólio

E-commerce de streetwear com direção visual em preto e branco, catálogo responsivo e painel administrativo. Esta edição é **exclusivamente demonstrativa**, feita para explorar a experiência e avaliar o código localmente.

**Next.js 16 · React 19 · TypeScript · Tailwind CSS · Vitest · Playwright**

![Vitrine VN Imports em desktop](docs/home-desktop.jpg)

## O projeto

Uma vitrine editorial com fluxo completo de compra simulada: descoberta de peças, escolha de variação, sacola persistente, cupom, frete demonstrativo e acompanhamento do pedido. O painel permite administrar o catálogo e acompanhar as mudanças no estoque.

| Experiência         | Implementação                                                         |
| ------------------- | --------------------------------------------------------------------- |
| Vitrine             | Layout responsivo, drops, categorias, lookbook, busca e filtros       |
| Produto             | Variações, disponibilidade por tamanho, guia de medidas e zoom        |
| Compra simulada     | Sacola, favoritos, cupom, frete e pedido visitante com acesso privado |
| Administração local | Login, produtos, fotos, estoque, pedidos e configurações              |
| Regras comerciais   | Valores em centavos, reserva de estoque, idempotência e histórico     |
| Qualidade           | Validação com Zod, testes de domínio, banco, segurança e navegador    |

<details>
<summary>Veja a versão mobile</summary>

![Vitrine em um celular](docs/home-mobile.png)

</details>

<details>
<summary>Veja a página de produto</summary>

![Produto e variações](docs/produto.png)

</details>

As capturas mostram a edição demonstrativa com o catálogo ilustrativo. Fotografias de moda foram geradas para demonstração; preços e estoque são fictícios. O logo da VN faz parte da identidade fornecida para o projeto.

## Executar localmente

Requisito: **Node.js 24 LTS** e npm.

```bash
git clone https://github.com/DevKaz-source/vn-imports-portfolio.git
cd vn-imports-portfolio
npm ci
npm run setup
npm run dev
```

No Windows PowerShell, use `npm.cmd` no lugar de `npm` se houver bloqueio da política de scripts. Não é preciso desativar essa proteção.

Abra [localhost:3000](http://localhost:3000). O painel fica em [localhost:3000/admin](http://localhost:3000/admin). `setup` gera um acesso exclusivo para a sua instalação e salva as credenciais em `.data/acesso-local.txt`. Não existe uma senha administrativa universal.

O servidor padrão escuta apenas em `127.0.0.1`. Os dados de teste ficam na pasta `.data` da sua máquina; nenhum banco externo é necessário. Para reiniciar o catálogo, pare o servidor e remova somente `.data/store.json`. Mantenha `.env.local` e `.data/acesso-local.txt` para preservar seu acesso.

## Roteiro de demonstração

1. Abra **Camiseta Heavyweight**, escolha o tamanho P e adicione à sacola. O tamanho M começa indisponível.
2. Vá ao checkout e use somente dados fictícios. O endereço é preenchido manualmente; não há consulta externa de CEP nesta edição.
3. Calcule o frete demonstrativo e teste o cupom `VNDEMO10`, limitado a um uso por e-mail.
4. Crie o pedido e use **Simular pagamento aprovado**. Nenhuma cobrança ocorre.
5. No painel, confira o pedido, envie uma imagem de teste e faça um ajuste de estoque com motivo.

## Limites desta edição

- O código mantém o modo demo mesmo que alguém defina `STORE_MODE=live`; a configuração incompatível é recusada.
- Adaptadores e esquema SQL permanecem como referência de arquitetura. Esta edição não habilita pagamentos, frete comercial, Supabase hospedado ou webhooks comerciais.
- Não publique este servidor de demonstração com dados pessoais ou como loja real. A persistência usa arquivos locais, adequada à avaliação em um único processo.
- GitHub hospeda o código e esta apresentação. A aplicação precisa de Node.js e não é uma exportação estática para GitHub Pages.
- Não há credenciais, pedidos reais, arquivos de ambiente privados ou uploads de clientes neste repositório.

## Verificação

```bash
npm run check:public
npm run audit:dependencies
npm run check
npx playwright install chromium
npm run test:e2e
```

`check:public` inspeciona os arquivos rastreados pelo Git e procura arquivos privados e padrões comuns de credenciais. O workflow de CI está configurado para executar essa verificação, a auditoria, lint, tipos, testes, build e fluxos de navegador. Dependabot acompanha dependências npm e ações do GitHub.

O aviso de descontinuação do ESLint 9 pode aparecer: ele permanece por compatibilidade com os plugins atuais. Não use `npm audit fix --force`. Os resultados estão em [VALIDACAO.md](docs/VALIDACAO.md).

## Organização

| Diretório          | Responsabilidade                         |
| ------------------ | ---------------------------------------- |
| `src/app`          | Páginas e endpoints                      |
| `src/components`   | Vitrine, checkout e administração        |
| `src/domain`       | Tipos, validações e regras comerciais    |
| `src/server`       | Sessões, estoque, persistência e upload  |
| `src/integrations` | Adaptadores de referência e simulação    |
| `supabase`         | Esquema SQL de referência                |
| `tests`            | Testes unitários, integração e navegador |

Leia [SECURITY.md](SECURITY.md) para as proteções e os limites da demonstração. A marca, o logo e os materiais visuais são apresentados como parte deste projeto; a publicação não transfere os direitos sobre a identidade da VN Imports.
