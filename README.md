# Lista de Músicas

Frontend React + Supabase para criar play lists, aprovar músicas e receber sugestões.

## Instalar
```bash
npm install
npm run dev
```

## Vercel
Cadastre as variáveis:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Use somente a chave pública `anon` ou `publishable` do Supabase. Nunca use `service_role` nem chaves `sb_secret_...` no frontend.

## Banco
Execute o arquivo `supabase.sql` no SQL Editor do Supabase.

Se aparecer `Could not find the table 'public.profiles' in the schema cache`, execute novamente o `supabase.sql` completo no SQL Editor. Se a tabela ja existir, rode ao menos:

```sql
NOTIFY pgrst, 'reload schema';
```

## Usuários
Crie os usuários em **Authentication > Users** no Supabase.

Depois que o usuário administrador fizer login uma vez, promova ele no SQL Editor:

```sql
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  role TEXT NOT NULL DEFAULT 'moderador' CHECK (role IN ('admin', 'moderador')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.profiles (id, email, role)
SELECT id, email, 'admin'
FROM auth.users
WHERE email = 'email-do-admin@exemplo.com'
ON CONFLICT (id) DO UPDATE
SET role = 'admin', email = EXCLUDED.email;
```

Usuários não promovidos entram como `moderador`.

### Email not confirmed
Se o login retornar `Email not confirmed`, o app tenta reenviar o link de confirmacao automaticamente.

Para liberar o acesso imediatamente, confirme o usuario no painel do Supabase em **Authentication > Users** ou desative a confirmacao de e-mail nas configuracoes de Auth do projeto.
