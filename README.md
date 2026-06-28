# Lista de Músicas WhatsApp

App React + Supabase para montar playlists, aprovar músicas, receber sugestões e enviar a lista pelo WhatsApp.

## Melhorias desta versão

- Ordenação das músicas selecionadas arrastando ou pelos botões subir/descer.
- Botão para remover música da lista sem precisar procurar novamente.
- Botão para limpar a lista inteira.
- Categorias rápidas: louvor, adoração, santa ceia, culto jovem, entrada e encerramento.
- Favoritos salvos no aparelho.
- Campos novos no cadastro da música: `tom` e `cifra`.
- Modelo da mensagem do WhatsApp configurável.
- Modal discreto de confirmação antes de abrir o WhatsApp.
- Envio para número configurado ou WhatsApp sem destinatário quando vazio.
- Histórico local das últimas listas enviadas.
- Botão para duplicar uma playlist/sugestão antiga.
- Botão para usar sugestão aprovada como lista oficial.
- Exportação por impressão/salvar como PDF.
- Alerta vermelho para itens pendentes no painel admin.
- PWA/offline melhorado com cache mais seguro e aviso “Sem internet”.

## Rodar localmente

```bash
npm install
npm run dev
```

## Gerar produção

```bash
npm run build
```

Os arquivos prontos ficam na pasta `dist`.

## Configuração do Supabase

Crie um arquivo `.env` baseado no `.env.example`:

```env
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=SUA_CHAVE_ANON_PUBLICA
```

Use somente a chave pública `anon` ou `publishable`. Nunca coloque `service_role` no frontend.

## Banco de dados

Execute o arquivo `supabase.sql` completo no SQL Editor do Supabase.

Esta versão adiciona as colunas `tom` e `cifra` na tabela `musicas`. Se o banco já existir, o próprio SQL usa `ADD COLUMN IF NOT EXISTS`, então pode rodar novamente com segurança.

No final, o SQL já roda:

```sql
NOTIFY pgrst, 'reload schema';
```

## Usuário administrador

Depois que o usuário fizer login uma vez, promova o e-mail dele para admin:

```sql
INSERT INTO public.profiles (id, email, role)
SELECT id, email, 'admin'
FROM auth.users
WHERE email = 'email-do-admin@exemplo.com'
ON CONFLICT (id) DO UPDATE
SET role = 'admin', email = EXCLUDED.email;
```

Usuários não promovidos entram como `moderador`.

## Publicar como site/PWA

Para usar como site, envie o conteúdo da pasta `dist` para sua hospedagem ou publique na Vercel/Netlify. O app já possui `manifest.webmanifest` e `sw.js` para instalação como PWA.

## Recuperação de senha

Esta versão possui recuperação completa de senha:

1. Na tela de login, clique em **Esqueci minha senha**.
2. Informe o e-mail cadastrado.
3. Abra o link recebido por e-mail.
4. O app abrirá a tela **Nova senha**.
5. Digite e confirme a nova senha.

No painel do Supabase, confira estas configurações:

- Authentication → URL Configuration → **Site URL**: coloque o endereço onde o app está publicado.
- Authentication → URL Configuration → **Redirect URLs**: adicione também o endereço do app.

Exemplo:

```txt
https://seudominio.com.br
https://seudominio.com.br/*
```

Se estiver testando localmente, adicione:

```txt
http://localhost:5173
http://localhost:5173/*
```

Por segurança, a senha antiga não pode ser visualizada. O correto é sempre redefinir a senha.
