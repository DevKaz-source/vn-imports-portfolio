# Dependências — atualização 1.0.1

Revisão em 27/10/2026. A instalação relatada pelo usuário havia terminado, mas continha avisos de segurança, de suporte do ESLint e de scripts de instalação bloqueados.

## Alterações

- Next.js e `eslint-config-next`: de 16.4.0 para 16.4.3, mantendo as versões alinhadas.
- Sharp: de 0.34.5 para 0.35.5. A dependência usada pela aplicação e pelo Next.js passa a usar a versão corrigida.
- Zod: versão mínima 4.6.6; Vitest: versão mínima 4.1.12.
- Dependências transitivas vulneráveis atualizadas dentro das faixas compatíveis. O lockfile registra as versões exatas.
- `allowScripts` autoriza exclusivamente `esbuild@0.28.2` e `unrs-resolver@1.12.2`. Sharp 0.35.5 não possui o antigo script de instalação bloqueado.
- O CI agora executa `npm run audit:dependencies`, que falha se a auditoria encontrar vulnerabilidades altas ou críticas. `npm run audit:production` consulta apenas dependências de produção.

Não foram usados `--force`, `--legacy-peer-deps`, autorização global de scripts nem supressão de auditoria. Ao mudar a versão de uma dependência com script nativo, revise sua entrada em `allowScripts`.

## O aviso do ESLint

O ESLint 9.39.5 está fora de suporte. Foi mantido porque `eslint-plugin-react@7.37.5`, usado pela configuração Next.js, declara compatibilidade até ESLint 9 e não com ESLint 10. A migração do conjunto de lint permanece pendente; o aviso não é um erro de execução da loja. Não force a atualização isolada do ESLint ignorando os requisitos dos plugins.

## Mudança no alerta de braces

O aviso GHSA-vfj7-8cjw-p6xm, responsável por cinco alertas no diagnóstico anterior, foi retirado da base oficial em 23/10/2026 por não ser considerado explorável na prática. Isso não foi uma correção feita no projeto. A auditoria foi consultada novamente, e as outras vulnerabilidades presentes na consulta atual foram corrigidas com atualizações de dependências.

## Fontes

- [Next.js: correção de execução remota na otimização de imagens](https://github.com/advisories/GHSA-2464-fhr4-w9xw)
- [Next.js: correção em funções use cache](https://github.com/advisories/GHSA-673q-mjm6-r5xr)
- [Sharp: correção na dependência librsvg](https://github.com/advisories/GHSA-wq5f-xc86-pv6w)
- [Retirada do aviso de braces](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm)
- [Suporte de versões ESLint](https://eslint.org/version-support/)
- [Política de scripts do npm](https://docs.npmjs.com/cli/v11/commands/npm-install-scripts/)

Os resultados da instalação e dos testes desta versão estão em `VALIDACAO.md`. Auditorias consultam uma base que muda ao longo do tempo; um resultado sem alertas não garante ausência de falhas.
