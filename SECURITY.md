# Segurança da demonstração

Esta edição serve à avaliação local de um projeto de portfólio. Não é um serviço comercial hospedado nem uma garantia de ausência de vulnerabilidades.

## Proteções adotadas

- Modo de demonstração fixo e recusa explícita da configuração `live`.
- Servidor restrito a `127.0.0.1` por padrão.
- Credenciais administrativas aleatórias por instalação e sessões assinadas.
- Autorização administrativa no servidor, verificação de origem e limitação de requisições.
- Upload com inspeção de conteúdo, limites de tamanho e reencodificação em WebP.
- Pedidos protegidos por token; totais calculados pelo servidor.
- Consulta de CEP sem transmissão a serviços externos.
- Arquivos de ambiente, dados locais, chaves, logs e relatórios de navegador excluídos do Git.
- Credenciais dos testes de navegador geradas a cada execução.
- CI com permissões de leitura, auditoria de dependências e verificação de arquivos.

Use somente informações fictícias. `setup` cria `.env.local` e `.data/acesso-local.txt`; esses arquivos nunca devem ser adicionados ao Git.

## Relatar um problema

Se a opção **Report a vulnerability** estiver habilitada na aba Security do repositório, prefira esse canal privado. Não publique senhas, tokens, dados pessoais ou instruções de exploração em issues públicas. Se não houver canal privado disponível, solicite contato sem detalhes sensíveis.

## Manutenção

Execute `npm run audit:dependencies` e revise os PRs do Dependabot. O scanner detecta padrões comuns e arquivos proibidos; não substitui revisão humana nem auditoria completa. O ESLint 9 permanece por compatibilidade com os plugins usados no projeto.
