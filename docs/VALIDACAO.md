# Validação da edição de portfólio

Verificação local realizada em **28/10/2026**, em Linux, com Node.js 24.22.1, Next.js 16.4.3 e Chromium 153.0.8010.0.

| Verificação                              | Resultado                                                                    |
| ---------------------------------------- | ---------------------------------------------------------------------------- |
| Instalação com `npm ci`                  | Concluída com o lockfile versionado                                          |
| Scanner de publicação                    | Nenhum arquivo privado ou padrão comum de credencial nos arquivos rastreados |
| Credenciais locais geradas               | Nenhuma ocorrência nos arquivos selecionados para publicação                 |
| Auditoria npm, incluindo desenvolvimento | 0 vulnerabilidades informadas                                                |
| ESLint e TypeScript                      | Aprovados                                                                    |
| Vitest                                   | 34 testes aprovados, em 5 arquivos                                           |
| Build de produção                        | Aprovado                                                                     |
| Playwright                               | 5 cenários aprovados                                                         |

Os cenários de navegador cobrem vitrine em desktop e mobile, produto, sacola, checkout demonstrativo, acesso privado ao pedido e administração com upload e estoque. Incluem verificações automatizadas de acessibilidade com axe nas telas exercitadas; isso não substitui uma avaliação manual completa.

Os quatro testes específicos desta edição verificam a recusa do modo comercial, a restrição de hospedagem com arquivos locais, a ausência de consulta externa de CEP e o bloqueio do webhook comercial. As capturas do README mostram apenas o catálogo ilustrativo; a captura desktop usa o enquadramento inicial da página para manter o arquivo leve.

O relatório de dependências está em [audit-portfolio.json](audit-portfolio.json). A auditoria representa o banco de avisos disponível na data da execução, não uma garantia permanente. O aviso de descontinuação do ESLint 9 permanece; a versão é mantida por compatibilidade com os plugins instalados.

Não foram testados pagamentos reais, serviços comerciais externos ou instalação no Windows. O CI configurado em `.github/workflows/quality.yml` executa suas próprias verificações; consulte a aba Actions para o resultado de cada commit.
