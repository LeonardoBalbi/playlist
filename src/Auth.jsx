
import React, { useState } from 'react';
import { supabase } from './supabase';
import { Lock, User, Mail, Send } from 'lucide-react';

export default function Auth({ onAuth }) {
  const [loading, setLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) alert(error.message);
    } else {
      const { error: signUpError, data } = await supabase.auth.signUp({ email, password });
      if (signUpError) {
        alert(signUpError.message);
      } else {
        // Criar perfil do usuário
        if (data.user) {
          const { error: profileError } = await supabase
            .from('profiles')
            .insert([{ id: data.user.id, email: data.user.email }]);
          if (profileError) console.error('Erro ao criar perfil:', profileError);
        }
        alert('Conta criada com sucesso! Verifique seu email para confirmar.');
      }
    }
    setLoading(false);
  }

  async function handleResetPassword() {
    if (!email) return alert('Informe seu email.');
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) alert(error.message);
    else alert('Email de recuperação enviado!');
    setLoading(false);
  }

  return (
    &lt;div className="authPage"&gt;
      &lt;div className="authCard"&gt;
        &lt;div className="authHeader"&gt;
          &lt;h1&gt;&lt;Lock size={28} /&gt; {isLogin ? 'Entrar' : 'Criar Conta'}&lt;/h1&gt;
          &lt;p&gt;Acesse a lista de músicas&lt;/p&gt;
        &lt;/div&gt;
        &lt;form onSubmit={handleSubmit} className="authForm"&gt;
          &lt;label&gt;
            &lt;Mail size={16} /&gt; Email
          &lt;/label&gt;
          &lt;input
            type="email"
            required
            value={email}
            onChange={(e) =&gt; setEmail(e.target.value)}
            placeholder="seu@email.com"
          /&gt;
          &lt;label&gt;
            &lt;User size={16} /&gt; Senha
          &lt;/label&gt;
          &lt;input
            type="password"
            required
            value={password}
            onChange={(e) =&gt; setPassword(e.target.value)}
            placeholder="********"
            minLength={6}
          /&gt;
          &lt;button type="submit" className="btn primary" disabled={loading}&gt;
            {loading ? 'Carregando...' : (isLogin ? 'Entrar' : 'Criar Conta')}
          &lt;/button&gt;
        &lt;/form&gt;
        &lt;div className="authActions"&gt;
          &lt;button onClick={() =&gt; setIsLogin(!isLogin)} className="linkBtn"&gt;
            {isLogin ? 'Não tem conta? Criar' : 'Já tem conta? Entrar'}
          &lt;/button&gt;
          {isLogin &amp;&amp; (
            &lt;button onClick={handleResetPassword} className="linkBtn"&gt;
              Esqueci minha senha
            &lt;/button&gt;
          )}
        &lt;/div&gt;
      &lt;/div&gt;
    &lt;/div&gt;
  );
}

