import React, { useEffect, useMemo, useState } from 'react';
import { supabase, supabaseConfigError } from './supabase';
import {
  Check,
  Copy,
  Edit,
  Inbox,
  ListChecks,
  ListMusic,
  LogOut,
  Music,
  Pause,
  Play,
  PlayCircle,
  Plus,
  Save,
  Search,
  Send,
  Shield,
  Trash2,
  User,
  X,
  BarChart3,
  Calendar,
  Music2,
  MessageSquare,
  CheckCircle2,
  Clock,
  Filter,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const vazio = { titulo: '', artista: '', categoria: '', link: '', duracao: '' };
const appShell = 'mx-auto flex min-h-screen w-full max-w-md flex-col px-4 pb-28 pt-5 sm:max-w-2xl lg:max-w-5xl';
const panel = 'rounded-2xl border border-white/15 bg-white/10 p-4 shadow-2xl shadow-black/30 backdrop-blur-xl';
const input = 'w-full rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-300 focus:border-teal-300 focus:bg-white/15';
const iconButton = 'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-white hover:bg-white/20';

function normalizarTexto(texto) {
  if (!texto) return '';
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function erroEmailNaoConfirmado(error) {
  const texto = `${error?.code || ''} ${error?.message || ''}`.toLowerCase();
  return texto.includes('email not confirmed') || texto.includes('email_not_confirmed');
}

function mensagemLogin(error) {
  const texto = error?.message || 'Nao foi possivel entrar.';
  if (texto.toLowerCase().includes('invalid login credentials')) {
    return 'E-mail ou senha invalidos.';
  }
  return texto;
}

function erroSchemaCache(error, nomeObjeto = '') {
  const texto = `${error?.code || ''} ${error?.message || ''} ${error?.details || ''}`.toLowerCase();
  return texto.includes('schema cache') && (!nomeObjeto || texto.includes(nomeObjeto.toLowerCase()));
}

function mensagemBancoDesatualizado(error) {
  return [
    'O banco do Supabase precisa ser atualizado antes de usar o app.',
    `Erro recebido: ${error.message}`,
    'Execute o arquivo supabase.sql no SQL Editor do Supabase e rode o comando NOTIFY pgrst, \'reload schema\'; no final.',
  ].join(' ');
}

function normalizarData(data) {
  if (!data) return '';
  const [ano, mes, dia] = data.split('-');
  return `${dia}/${mes}/${ano}`;
}

function extrairYouTubeId(url) {
  if (!url) return null;
  const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

function montarTextoLista(lista, musicas) {
  const linhas = [];
  linhas.push(`🎵 *${lista?.titulo || 'Lista de músicas'}*`);
  linhas.push(`📅 Data: ${normalizarData(lista?.data_lista)}`);
  if (lista?.observacao?.trim()) linhas.push(`📝 ${lista.observacao.trim()}`);
  linhas.push('');
  linhas.push('*Músicas:*');
  musicas.forEach((m, i) => {
    linhas.push(`${i + 1}. ${m.titulo}${m.artista ? ` - ${m.artista}` : ''}`);
    if (m.link) linhas.push(`   ${m.link}`);
  });
  return linhas.join('\n');
}

export default function App() {
  const [session, setSession] = useState(null);
  const [perfil, setPerfil] = useState(null);
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [authLoading, setAuthLoading] = useState(true);
  const [loginLoading, setLoginLoading] = useState(false);
  const [authFeedback, setAuthFeedback] = useState({ tipo: '', texto: '' });
  const [emailNaoConfirmado, setEmailNaoConfirmado] = useState(false);
  const [databaseError, setDatabaseError] = useState('');
  const [modoAuth, setModoAuth] = useState('login'); // 'login' ou 'cadastro'

  const [musicas, setMusicas] = useState([]);
  const [pendentes, setPendentes] = useState([]);
  const [sugestoes, setSugestoes] = useState([]);
  const [sugestaoAberta, setSugestaoAberta] = useState(null);
  const [selecionadas, setSelecionadas] = useState([]);
  const [form, setForm] = useState(vazio);
  const [editando, setEditando] = useState(null);
  const [busca, setBusca] = useState('');
  const [previewMusica, setPreviewMusica] = useState(null);
  
  // Estados para métricas
  const [metricas, setMetricas] = useState({
    totalMusicas: 0,
    totalPlaylists: 0,
    totalSugestoes: 0,
    totalAprovadas: 0,
    totalPendentes: 0,
  });
  const [musicasMaisSelecionadas, setMusicasMaisSelecionadas] = useState([]);
  const [playlistsPorMes, setPlaylistsPorMes] = useState([]);
  const [sugestoesPorMes, setSugestoesPorMes] = useState([]);
  const [filtroPeriodo, setFiltroPeriodo] = useState('todos'); // todos, mes, ano, personalizado
  const [mesSelecionado, setMesSelecionado] = useState(new Date().toISOString().slice(0, 7));
  const [anoSelecionado, setAnoSelecionado] = useState(new Date().getFullYear().toString());
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [carregandoMetricas, setCarregandoMetricas] = useState(false);
  const [tituloLista, setTituloLista] = useState('Lista de músicas');
  const [dataLista, setDataLista] = useState(new Date().toISOString().slice(0, 10));
  const [observacao, setObservacao] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [tela, setTela] = useState('playlist');

  // Estados para gerenciamento de usuários
  const [usuarios, setUsuarios] = useState([]);
  const [formUsuario, setFormUsuario] = useState({ email: '', senha: '', role: 'moderador' });
  const [editandoUsuario, setEditandoUsuario] = useState(null);
  const [carregandoUsuarios, setCarregandoUsuarios] = useState(false);

  const isAdmin = perfil?.role === 'admin';

  useEffect(() => {
    if (supabaseConfigError) {
      setAuthLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, novaSession) => {
      setSession(novaSession);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session?.user) {
      setPerfil(null);
      return;
    }

    carregarPerfil();
  }, [session?.user?.id]);

  useEffect(() => {
    if (!perfil) return;
    carregarMusicas();
    carregarSugestoes();
  }, [perfil?.role]);
  
  useEffect(() => {
    if (tela === 'metricas' && isAdmin) {
      carregarMetricas();
    }
  }, [tela, isAdmin, filtroPeriodo, mesSelecionado, anoSelecionado, dataInicio, dataFim]);

  const filtradas = useMemo(() => {
    const q = normalizarTexto(busca);
    return musicas.filter((m) =>
      normalizarTexto([m.titulo, m.artista, m.categoria].join(' ')).includes(q)
    );
  }, [musicas, busca]);

  async function carregarPerfil() {
    const user = session.user;
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (error) {
      if (erroSchemaCache(error, 'profiles')) {
        setDatabaseError(mensagemBancoDesatualizado(error));
        return;
      }

      return alert(error.message);
    }

    if (data) {
      setPerfil(data);
      return;
    }

    const novoPerfil = { id: user.id, email: user.email, role: 'moderador' };
    const { data: criado, error: erroCriar } = await supabase
      .from('profiles')
      .insert(novoPerfil)
      .select()
      .single();

    if (erroCriar) {
      if (erroSchemaCache(erroCriar, 'profiles')) {
        setDatabaseError(mensagemBancoDesatualizado(erroCriar));
        return;
      }

      return alert(erroCriar.message);
    }

    setPerfil(criado);
  }

  async function entrar(e) {
    e.preventDefault();
    const emailLogin = email.trim();

    if (!emailLogin || !senha) {
      setEmailNaoConfirmado(false);
      setAuthFeedback({ tipo: 'erro', texto: 'Informe e-mail e senha para entrar.' });
      return;
    }

    setLoginLoading(true);
    setEmailNaoConfirmado(false);
    setAuthFeedback({ tipo: '', texto: '' });

    const { error } = await supabase.auth.signInWithPassword({ email: emailLogin, password: senha });

    if (error && erroEmailNaoConfirmado(error)) {
      await reenviarConfirmacao(emailLogin);
      return;
    }

    setLoginLoading(false);
    if (error) {
      setAuthFeedback({ tipo: 'erro', texto: mensagemLogin(error) });
    }
  }

  async function cadastrar(e) {
    e.preventDefault();
    const emailCadastro = email.trim();

    if (!emailCadastro || !senha) {
      setAuthFeedback({ tipo: 'erro', texto: 'Informe e-mail e senha para cadastrar.' });
      return;
    }

    if (senha !== confirmarSenha) {
      setAuthFeedback({ tipo: 'erro', texto: 'As senhas não conferem.' });
      return;
    }

    if (senha.length < 6) {
      setAuthFeedback({ tipo: 'erro', texto: 'A senha deve ter pelo menos 6 caracteres.' });
      return;
    }

    setLoginLoading(true);
    setAuthFeedback({ tipo: '', texto: '' });

    const { error } = await supabase.auth.signUp({
      email: emailCadastro,
      password: senha,
    });

    setLoginLoading(false);

    if (error) {
      if (erroEmailNaoConfirmado(error)) {
        setEmailNaoConfirmado(true);
        setAuthFeedback({
          tipo: 'aviso',
          texto: 'Conta criada! Verifique seu e-mail para confirmar e depois entre.',
        });
      } else {
        setAuthFeedback({ tipo: 'erro', texto: mensagemLogin(error) });
      }
    } else {
      setAuthFeedback({
        tipo: 'sucesso',
        texto: 'Conta criada com sucesso! Verifique seu e-mail para confirmar.',
      });
    }
  }

  async function reenviarConfirmacao(emailDestino = email) {
    const emailConfirmacao = emailDestino.trim();
    if (!emailConfirmacao) {
      setAuthFeedback({ tipo: 'erro', texto: 'Informe o e-mail para reenviar a confirmacao.' });
      return;
    }

    setLoginLoading(true);
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: emailConfirmacao,
    });
    setLoginLoading(false);
    setEmailNaoConfirmado(true);

    if (error) {
      setAuthFeedback({
        tipo: 'erro',
        texto: `Este e-mail ainda nao foi confirmado. Nao consegui reenviar automaticamente: ${error.message}. Se precisar liberar agora, confirme o usuario no painel do Supabase.`,
      });
      return;
    }

    setAuthFeedback({
      tipo: 'aviso',
      texto: 'Este e-mail ainda nao foi confirmado. Enviei um novo link de confirmacao; confirme no e-mail e tente entrar novamente. Se o link nao chegar, confirme o usuario no painel do Supabase.',
    });
  }

  async function sair() {
    await supabase.auth.signOut();
    setSession(null);
    setPerfil(null);
    setDatabaseError('');
  }

  async function carregarMusicas() {
    const query = supabase.from('musicas').select('*').order('titulo', { ascending: true });
    const { data, error } = isAdmin
      ? await query
      : await query.eq('status', 'aprovada');

    if (error) {
      if (erroSchemaCache(error)) {
        setDatabaseError(mensagemBancoDesatualizado(error));
        return;
      }

      return alert(error.message);
    }

    setMusicas(data || []);

    if (isAdmin) {
      const { data: aguardando, error: erroPendentes } = await supabase
        .from('musicas')
        .select('*')
        .eq('status', 'pendente')
        .order('created_at', { ascending: false });
      if (erroPendentes) {
        if (erroSchemaCache(erroPendentes)) {
          setDatabaseError(mensagemBancoDesatualizado(erroPendentes));
          return;
        }

        return alert(erroPendentes.message);
      }

      setPendentes(aguardando || []);
    } else {
      setPendentes([]);
    }
  }

  async function carregarSugestoes() {
    const query = supabase
      .from('sugestoes_playlists')
      .select('*')
      .order('created_at', { ascending: false });

    const { data: listas, error } = isAdmin ? await query : await query.eq('created_by', session.user.id);
    if (error) {
      if (erroSchemaCache(error)) {
        setDatabaseError(mensagemBancoDesatualizado(error));
        return;
      }

      return alert(error.message);
    }

    const ids = (listas || []).map((lista) => lista.id);
    if (ids.length === 0) {
      setSugestoes([]);
      setSugestaoAberta(null);
      return;
    }

    const { data: itens, error: erroItens } = await supabase
      .from('sugestao_playlist_musicas')
      .select('sugestao_id, ordem, musicas(id, titulo, artista, categoria, link, duracao)')
      .in('sugestao_id', ids)
      .order('ordem', { ascending: true });

    if (erroItens) {
      if (erroSchemaCache(erroItens)) {
        setDatabaseError(mensagemBancoDesatualizado(erroItens));
        return;
      }

      return alert(erroItens.message);
    }

    const completas = (listas || []).map((lista) => ({
      ...lista,
      musicas: (itens || [])
        .filter((item) => item.sugestao_id === lista.id)
        .sort((a, b) => a.ordem - b.ordem)
        .map((item) => item.musicas)
        .filter(Boolean),
    }));

    setSugestoes(completas);
    setSugestaoAberta((atual) => completas.find((item) => item.id === atual?.id) || null);
  }
  
  async function carregarMetricas() {
    setCarregandoMetricas(true);
    try {
      // Query todas as playlists e itens para métricas
      const [playlistsRes, itensRes, musicasRes, sugestoesRes] = await Promise.all([
        supabase.from('sugestoes_playlists').select('*, sugestao_playlist_musicas(musica_id)'),
        supabase.from('sugestao_playlist_musicas').select('*, sugestoes_playlists(created_at)'),
        supabase.from('musicas').select('id, titulo, artista, status'),
        supabase.from('sugestoes_playlists').select('id, created_at'),
      ]);

      let playlists = playlistsRes.data || [];
      let itens = itensRes.data || [];
      let musicas = musicasRes.data || [];
      let sugestoes = sugestoesRes.data || [];

      // Aplicar filtro de período
      if (filtroPeriodo !== 'todos') {
        let dataInicioFiltro, dataFimFiltro;
        
        if (filtroPeriodo === 'mes') {
          const [ano, mes] = mesSelecionado.split('-');
          dataInicioFiltro = new Date(parseInt(ano), parseInt(mes) - 1, 1);
          dataFimFiltro = new Date(parseInt(ano), parseInt(mes), 0, 23, 59, 59);
        } else if (filtroPeriodo === 'ano') {
          dataInicioFiltro = new Date(parseInt(anoSelecionado), 0, 1);
          dataFimFiltro = new Date(parseInt(anoSelecionado), 11, 31, 23, 59, 59);
        } else if (filtroPeriodo === 'personalizado' && dataInicio && dataFim) {
          dataInicioFiltro = new Date(dataInicio);
          dataFimFiltro = new Date(dataFim + 'T23:59:59');
        }

        if (dataInicioFiltro && dataFimFiltro) {
          playlists = playlists.filter(p => {
            const data = new Date(p.created_at);
            return data >= dataInicioFiltro && data <= dataFimFiltro;
          });
          const playlistIds = new Set(playlists.map(p => p.id));
          itens = itens.filter(i => playlistIds.has(i.sugestao_id));
          sugestoes = sugestoes.filter(s => playlistIds.has(s.id));
        }
      }

      // Calcular métricas gerais
      const totalAprovadas = musicas.filter(m => m.status === 'aprovada').length;
      const totalPendentes = musicas.filter(m => m.status === 'pendente').length;

      setMetricas({
        totalMusicas: musicas.length,
        totalPlaylists: playlists.length,
        totalSugestoes: sugestoes.length,
        totalAprovadas,
        totalPendentes,
      });

      // Calcular músicas mais selecionadas
      const musicaCount = {};
      itens.forEach(item => {
        if (item.musica_id) {
          musicaCount[item.musica_id] = (musicaCount[item.musica_id] || 0) + 1;
        }
      });

      const topMusicas = Object.entries(musicaCount)
        .map(([musicaId, count]) => {
          const musica = musicas.find(m => m.id === musicaId);
          return {
            id: musicaId,
            titulo: musica?.titulo || 'Música desconhecida',
            artista: musica?.artista || 'Artista desconhecido',
            vezes: count,
          };
        })
        .sort((a, b) => b.vezes - a.vezes);

      setMusicasMaisSelecionadas(topMusicas);

      // Calcular playlists por mês
      const playlistsMes = {};
      playlists.forEach(p => {
        const data = new Date(p.created_at);
        const key = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`;
        playlistsMes[key] = (playlistsMes[key] || 0) + 1;
      });

      const playlistsPorMesArr = Object.entries(playlistsMes)
        .map(([mes, count]) => ({ mes, playlists: count }))
        .sort((a, b) => a.mes.localeCompare(b.mes));

      setPlaylistsPorMes(playlistsPorMesArr);

      // Calcular sugestões por mês
      const sugestoesMes = {};
      sugestoes.forEach(s => {
        const data = new Date(s.created_at);
        const key = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`;
        sugestoesMes[key] = (sugestoesMes[key] || 0) + 1;
      });

      const sugestoesPorMesArr = Object.entries(sugestoesMes)
        .map(([mes, count]) => ({ mes, sugestoes: count }))
        .sort((a, b) => a.mes.localeCompare(b.mes));

      setSugestoesPorMes(sugestoesPorMesArr);
    } catch (error) {
      console.error('Erro ao carregar métricas:', error);
    } finally {
      setCarregandoMetricas(false);
    }
  }

  async function carregarUsuarios() {
    setCarregandoUsuarios(true);
    const { data: perfis, error } = await supabase
      .from('profiles')
      .select('*, id')
      .order('created_at', { ascending: false });

    if (error) {
      if (erroSchemaCache(error)) {
        setDatabaseError(mensagemBancoDesatualizado(error));
      } else {
        alert(error.message);
      }
      setCarregandoUsuarios(false);
      return;
    }

    setUsuarios(perfis || []);
    setCarregandoUsuarios(false);
  }

  async function salvarUsuario(e) {
    e.preventDefault();

    if (editandoUsuario) {
      // Atualizar perfil
      const { error: erroPerfil } = await supabase
        .from('profiles')
        .update({ role: formUsuario.role, updated_at: new Date().toISOString() })
        .eq('id', editandoUsuario.id);

      if (erroPerfil) {
        alert(erroPerfil.message);
        return;
      } else {
        alert('Usuário atualizado com sucesso!');
      }
    } else {
      alert('Para criar novos usuários, use o painel do Supabase (Authentication → Users). Depois você pode gerenciar os papéis aqui.');
    }

    setFormUsuario({ email: '', senha: '', role: 'moderador' });
    setEditandoUsuario(null);
    await carregarUsuarios();
  }

  function editarUsuario(usuario) {
    setEditandoUsuario(usuario);
    setFormUsuario({
      email: usuario.email || '',
      senha: '',
      role: usuario.role || 'moderador',
    });
  }

  async function excluirUsuario(usuario) {
    if (!confirm(`Tem certeza que deseja excluir o usuário ${usuario.email}?`)) return;

    try {
      // Excluir usuário via Auth API (precisa de service_role, mas vamos tentar)
      // Observação: No cliente, não podemos excluir usuários diretamente via API Auth admin sem service role.
      // Por enquanto, vamos apenas desativar/remover o perfil.
      const { error } = await supabase.from('profiles').delete().eq('id', usuario.id);

      if (error) throw error;
      alert('Usuário removido com sucesso!');
      await carregarUsuarios();
    } catch (error) {
      alert(`Erro: ${error.message}`);
    }
  }

  function marcarMusica(musica) {
    const existe = selecionadas.find((m) => m.id === musica.id);
    setSelecionadas(existe ? selecionadas.filter((m) => m.id !== musica.id) : [...selecionadas, musica]);
  }

  function abrirFormulario(musica = null) {
    if (musica) {
      setEditando(musica.id);
      setForm({
        titulo: musica.titulo || '',
        artista: musica.artista || '',
        categoria: musica.categoria || '',
        link: musica.link || '',
        duracao: musica.duracao || '',
      });
    } else {
      setEditando(null);
      setForm(vazio);
    }
    setTela('form');
  }

  async function salvarMusica(e) {
    e.preventDefault();
    if (!form.titulo.trim()) return alert('Informe o título da música.');

    const payload = {
      titulo: form.titulo.trim(),
      artista: form.artista?.trim() || null,
      categoria: form.categoria?.trim() || null,
      link: form.link?.trim() || null,
      duracao: form.duracao?.trim() || null,
      status: isAdmin ? 'aprovada' : 'pendente',
      suggested_by: session.user.id,
      updated_at: new Date().toISOString(),
    };

    const req = editando && isAdmin
      ? supabase.from('musicas').update(payload).eq('id', editando)
      : supabase.from('musicas').insert(payload);

    const { error } = await req;
    if (error) return alert(error.message);

    alert(isAdmin ? 'Música salva.' : 'Música enviada para aprovação do administrador.');
    setForm(vazio);
    setEditando(null);
    await carregarMusicas();
    setTela(isAdmin ? 'musicas' : 'playlist');
  }

  async function aprovarMusica(id, aprovado) {
    const payload = aprovado
      ? { status: 'aprovada', approved_by: session.user.id, approved_at: new Date().toISOString() }
      : { status: 'recusada', approved_by: session.user.id, approved_at: new Date().toISOString() };

    const { error } = await supabase.from('musicas').update(payload).eq('id', id);
    if (error) return alert(error.message);
    await carregarMusicas();
  }

  async function excluirMusica(id) {
    if (!isAdmin) return;
    if (!confirm('Deseja excluir esta música?')) return;
    const { error } = await supabase.from('musicas').delete().eq('id', id);
    if (error) return alert(error.message);
    carregarMusicas();
  }

  function montarTexto() {
    return montarTextoLista({ titulo: tituloLista, data_lista: dataLista, observacao }, selecionadas);
  }

  async function enviarSugestao() {
    if (!tituloLista.trim()) return alert('Informe o título da lista.');
    if (selecionadas.length === 0) return alert('Selecione pelo menos uma música.');

    const { data: sugestao, error } = await supabase
      .from('sugestoes_playlists')
      .insert({
        titulo: tituloLista,
        data_lista: dataLista,
        observacao,
        status: isAdmin ? 'aprovada' : 'pendente',
        created_by: session.user.id,
      })
      .select()
      .single();

    if (error) return alert(error.message);

    const itens = selecionadas.map((m, index) => ({
      sugestao_id: sugestao.id,
      musica_id: m.id,
      ordem: index + 1,
    }));

    const { error: erroItens } = await supabase.from('sugestao_playlist_musicas').insert(itens);
    if (erroItens) return alert(erroItens.message);

    alert(isAdmin ? 'Play list salva.' : 'Sugestão enviada ao administrador.');
    setSelecionadas([]);
    await carregarSugestoes();
    setTela('sugestoes');
  }

  async function decidirSugestao(id, status) {
    const { error } = await supabase
      .from('sugestoes_playlists')
      .update({ status, decided_by: session.user.id, decided_at: new Date().toISOString() })
      .eq('id', id);
    if (error) return alert(error.message);
    await carregarSugestoes();
  }

  async function copiarTexto(texto = montarTexto()) {
    setMensagem(texto);
    try {
      await navigator.clipboard.writeText(texto);
      alert('Texto copiado.');
    } catch {
      alert('Não foi possível copiar automaticamente.');
    }
  }

  function abrirWhatsApp(texto = montarTexto()) {
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank');
  }

  async function tentarNovamenteBanco() {
    setDatabaseError('');

    if (session?.user && !perfil) {
      await carregarPerfil();
      return;
    }

    if (perfil) {
      await carregarMusicas();
      await carregarSugestoes();
    }
  }

  if (supabaseConfigError) {
    return (
      <div className={appShell}>
        <section className={`${panel} mt-24`}>
          <h1 className="text-2xl font-black">Configuração do Supabase</h1>
          <p className="mt-3 text-sm text-slate-200">{supabaseConfigError}</p>
        </section>
      </div>
    );
  }

  if (authLoading) {
    return <div className={appShell}><section className={`${panel} mt-24`}>Carregando...</section></div>;
  }

  if (databaseError) {
    return (
      <div className={appShell}>
        <section className={`${panel} mt-20`}>
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-300 text-slate-950">
              <Shield className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black">Atualizar banco</h1>
              <p className="text-sm text-slate-300">O schema do Supabase ainda nao esta pronto.</p>
            </div>
          </div>
          <p className="rounded-xl border border-amber-200/30 bg-amber-300/10 px-4 py-3 text-sm text-amber-50">
            {databaseError}
          </p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <button className="min-h-12 rounded-xl bg-teal-300 font-black text-slate-950" onClick={tentarNovamenteBanco}>
              Tentar novamente
            </button>
            <button className="min-h-12 rounded-xl border border-white/15 bg-white/10 font-bold text-white" onClick={sair}>
              Sair
            </button>
          </div>
        </section>
      </div>
    );
  }

  if (!session || !perfil) {
    return (
      <div className={appShell}>
        <section className={`${panel} mt-20`}>
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-300 text-slate-950">
              <Shield className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black">{modoAuth === 'login' ? 'Login' : 'Cadastre-se'}</h1>
              <p className="text-sm text-slate-300">
                {modoAuth === 'login' ? 'Entre como admin ou moderador.' : 'Crie sua conta para usar o app.'}
              </p>
            </div>
          </div>

          {/* Abas para alternar entre login e cadastro */}
          <div className="mb-4 grid grid-cols-2 gap-2 rounded-xl border border-white/10 bg-white/5 p-1">
            <button
              className={`rounded-lg px-3 py-2 text-sm font-bold ${modoAuth === 'login' ? 'bg-teal-300 text-slate-950' : 'text-white hover:bg-white/10'}`}
              onClick={() => {
                setModoAuth('login');
                setAuthFeedback({ tipo: '', texto: '' });
                setConfirmarSenha('');
              }}
            >
              Login
            </button>
            <button
              className={`rounded-lg px-3 py-2 text-sm font-bold ${modoAuth === 'cadastro' ? 'bg-teal-300 text-slate-950' : 'text-white hover:bg-white/10'}`}
              onClick={() => {
                setModoAuth('cadastro');
                setAuthFeedback({ tipo: '', texto: '' });
              }}
            >
              Cadastre-se
            </button>
          </div>

          <form className="grid gap-3" onSubmit={modoAuth === 'login' ? entrar : cadastrar}>
            <input className={input} type="email" placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} />
            <input className={input} type="password" placeholder="Senha" value={senha} onChange={(e) => setSenha(e.target.value)} />

            {modoAuth === 'cadastro' && (
              <input
                className={input}
                type="password"
                placeholder="Confirmar senha"
                value={confirmarSenha}
                onChange={(e) => setConfirmarSenha(e.target.value)}
              />
            )}

            {authFeedback.texto && (
              <div
                className={`rounded-xl border px-4 py-3 text-sm ${
                  authFeedback.tipo === 'erro'
                    ? 'border-red-300/30 bg-red-400/10 text-red-100'
                    : authFeedback.tipo === 'sucesso'
                    ? 'border-emerald-300/30 bg-emerald-400/10 text-emerald-100'
                    : 'border-teal-200/30 bg-teal-300/10 text-teal-50'
                }`}
                role="status"
              >
                {authFeedback.texto}
              </div>
            )}

            {emailNaoConfirmado && modoAuth === 'login' && (
              <button
                className="min-h-11 rounded-xl border border-white/15 bg-white/10 px-4 text-sm font-bold text-white"
                disabled={loginLoading}
                onClick={() => reenviarConfirmacao()}
                type="button"
              >
                Reenviar confirmação
              </button>
            )}

            <button className="min-h-12 rounded-xl bg-teal-300 font-black text-slate-950" disabled={loginLoading}>
              {loginLoading
                ? modoAuth === 'login'
                  ? 'Entrando...'
                  : 'Cadastrando...'
                : modoAuth === 'login'
                ? 'Entrar'
                : 'Cadastrar'}
            </button>
          </form>
        </section>
      </div>
    );
  }

  const sugestaoTexto = sugestaoAberta ? montarTextoLista(sugestaoAberta, sugestaoAberta.musicas) : '';

  return (
    <div className={appShell}>
      <header className="mb-5 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-200">
            {isAdmin ? 'Administrador' : 'Moderador'}
          </p>
          <h1 className="mt-1 flex items-center gap-2 text-3xl font-black leading-tight text-white sm:text-4xl">
            <Music className="h-8 w-8 shrink-0 text-teal-200" />
            <span>Lista de Músicas</span>
          </h1>
        </div>
        <button className={iconButton} onClick={sair} title="Sair">
          <LogOut className="h-5 w-5" />
        </button>
      </header>

      {tela === 'playlist' && (
        <main className="grid gap-4 lg:grid-cols-2">
          <section className={panel}>
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-xl font-black">{isAdmin ? 'CRIAR PLAY LIST' : 'SUGERIR PLAY LIST'}</h2>
              <span className="rounded-full bg-teal-300/20 px-3 py-1 text-xs font-bold text-teal-100">
                {selecionadas.length} músicas
              </span>
            </div>
            <div className="grid gap-3">
              <input className={input} placeholder="Título da lista" value={tituloLista} onChange={(e) => setTituloLista(e.target.value)} />
              <input className={input} type="date" value={dataLista} onChange={(e) => setDataLista(e.target.value)} />
              <textarea className={`${input} min-h-20 resize-none`} placeholder="Observação opcional" value={observacao} onChange={(e) => setObservacao(e.target.value)} />
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <button className="inline-flex min-h-12 items-center justify-center gap-1 rounded-xl bg-teal-300 px-2 text-sm font-black text-slate-950" onClick={enviarSugestao}>
                <Save className="h-4 w-4" />
                {isAdmin ? 'Salvar' : 'Sugerir'}
              </button>
              <button className="inline-flex min-h-12 items-center justify-center gap-1 rounded-xl border border-white/15 bg-white/10 px-2 text-sm font-bold text-white" onClick={() => copiarTexto()}>
                <Copy className="h-4 w-4" />
                Copiar
              </button>
              {isAdmin && (
                <button className="inline-flex min-h-12 items-center justify-center gap-1 rounded-xl bg-emerald-400 px-2 text-sm font-black text-slate-950" onClick={() => abrirWhatsApp()}>
                  <Send className="h-4 w-4" />
                  Enviar
                </button>
              )}
            </div>
          </section>

          <section className={panel}>
            <h2 className="mb-3 text-lg font-black">Prévia</h2>
            <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-xl border border-white/10 bg-slate-950/35 p-4 text-sm leading-relaxed text-slate-100">
              {mensagem || montarTexto()}
            </pre>
          </section>
        </main>
      )}

      {tela === 'musicas' && (
        <main className={panel}>
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-black">Músicas aprovadas</h2>
              <p className="text-sm text-slate-300">{filtradas.length} encontradas</p>
            </div>
            <button className={iconButton} onClick={() => abrirFormulario()} title="Adicionar música">
              <Plus className="h-5 w-5" />
            </button>
          </div>
          <label className="mb-4 flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3">
            <Search className="h-5 w-5 text-slate-300" />
            <input className="w-full bg-transparent py-3 text-sm text-white outline-none placeholder:text-slate-300" placeholder="Buscar música, artista ou categoria" value={busca} onChange={(e) => setBusca(e.target.value)} />
          </label>
          <div className="grid gap-3">
            {filtradas.map((m) => {
              const selected = selecionadas.some((s) => s.id === m.id);
              return (
                <article className={`rounded-2xl border p-3 ${selected ? 'border-teal-300/70 bg-teal-300/15' : 'border-white/10 bg-white/10'}`} key={m.id}>
                  <div className="flex items-center gap-3">
                    <button className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl font-black ${selected ? 'bg-teal-300 text-slate-950' : 'bg-white/10 text-white'}`} onClick={() => marcarMusica(m)}>
                      {selected ? <Check className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
                    </button>
                    <div className="min-w-0 flex-1">
                      <strong className="block truncate text-base text-white">{m.titulo}</strong>
                      <span className="block truncate text-sm text-slate-300">
                        {m.artista || 'Sem artista'} {m.categoria ? `• ${m.categoria}` : ''} {m.duracao ? `• ${m.duracao}` : ''}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      {m.link && extrairYouTubeId(m.link) && (
                        <button className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-500 text-white hover:bg-red-600" onClick={() => setPreviewMusica(m)} title="Ouvir">
                          <PlayCircle className="h-5 w-5" />
                        </button>
                      )}
                      {isAdmin && (
                        <>
                          <button className={iconButton} onClick={() => abrirFormulario(m)} title="Editar"><Edit className="h-4 w-4" /></button>
                          <button className={iconButton} onClick={() => excluirMusica(m.id)} title="Excluir"><Trash2 className="h-4 w-4" /></button>
                        </>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </main>
      )}

      {tela === 'aprovar' && isAdmin && (
        <main className={panel}>
          <h2 className="mb-4 text-xl font-black">Músicas aguardando aprovação</h2>
          <div className="grid gap-3">
            {pendentes.length === 0 && <p className="rounded-xl bg-white/10 p-4 text-sm text-slate-300">Nenhuma música pendente.</p>}
            {pendentes.map((m) => (
              <article className="rounded-2xl border border-white/10 bg-white/10 p-3" key={m.id}>
                <strong className="block text-white">{m.titulo}</strong>
                <span className="text-sm text-slate-300">{m.artista || 'Sem artista'} {m.categoria ? `• ${m.categoria}` : ''}</span>
                {m.link && <a className="mt-1 block text-sm font-bold text-teal-200" href={m.link} target="_blank">Abrir link</a>}
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button className="rounded-xl bg-teal-300 px-3 py-2 text-sm font-black text-slate-950" onClick={() => aprovarMusica(m.id, true)}>Aprovar</button>
                  <button className="rounded-xl border border-red-300/30 bg-red-400/10 px-3 py-2 text-sm font-bold text-red-100" onClick={() => aprovarMusica(m.id, false)}>Recusar</button>
                </div>
              </article>
            ))}
          </div>
        </main>
      )}

      {tela === 'sugestoes' && (
        <main className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <section className={panel}>
            <h2 className="mb-4 text-xl font-black">{isAdmin ? 'Sugestões recebidas' : 'Minhas sugestões'}</h2>
            <div className="grid gap-3">
              {sugestoes.length === 0 && <p className="rounded-xl bg-white/10 p-4 text-sm text-slate-300">Nenhuma sugestão ainda.</p>}
              {sugestoes.map((sugestao) => (
                <article className={`rounded-2xl border p-3 ${sugestaoAberta?.id === sugestao.id ? 'border-teal-300/70 bg-teal-300/15' : 'border-white/10 bg-white/10'}`} key={sugestao.id}>
                  <button className="block w-full text-left" onClick={() => setSugestaoAberta(sugestao)}>
                    <strong className="block truncate text-base text-white">{sugestao.titulo}</strong>
                    <span className="text-sm text-slate-300">{normalizarData(sugestao.data_lista)} • {sugestao.musicas.length} músicas • {sugestao.status}</span>
                  </button>
                  {isAdmin && sugestao.status === 'pendente' && (
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <button className="rounded-xl bg-teal-300 px-3 py-2 text-xs font-black text-slate-950" onClick={() => decidirSugestao(sugestao.id, 'aprovada')}>Aprovar</button>
                      <button className="rounded-xl border border-red-300/30 bg-red-400/10 px-3 py-2 text-xs font-bold text-red-100" onClick={() => decidirSugestao(sugestao.id, 'recusada')}>Recusar</button>
                    </div>
                  )}
                </article>
              ))}
            </div>
          </section>
          <section className={panel}>
            <h2 className="mb-3 text-lg font-black">{sugestaoAberta ? sugestaoAberta.titulo : 'Sugestão aberta'}</h2>
            {sugestaoAberta ? (
              <>
                <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-xl border border-white/10 bg-slate-950/35 p-4 text-sm leading-relaxed text-slate-100">{sugestaoTexto}</pre>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button className="rounded-xl border border-white/15 bg-white/10 px-3 py-3 text-sm font-bold text-white" onClick={() => copiarTexto(sugestaoTexto)}>Copiar</button>
                  {isAdmin && sugestaoAberta.status === 'aprovada' && (
                    <button className="rounded-xl bg-emerald-400 px-3 py-3 text-sm font-black text-slate-950" onClick={() => abrirWhatsApp(sugestaoTexto)}>WhatsApp</button>
                  )}
                </div>
              </>
            ) : (
              <p className="rounded-xl bg-white/10 p-4 text-sm text-slate-300">Toque em uma sugestão para abrir.</p>
            )}
          </section>
        </main>
      )}

      {tela === 'form' && (
        <main className={panel}>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-200">
                {isAdmin ? 'Cadastro direto' : 'Vai para aprovação'}
              </p>
              <h2 className="text-2xl font-black">{editando ? 'Editar música' : 'Adicionar música'}</h2>
            </div>
            <button className={iconButton} onClick={() => setTela('musicas')} title="Fechar"><X className="h-5 w-5" /></button>
          </div>
          <form onSubmit={salvarMusica} className="grid gap-3">
            <input className={input} placeholder="Título da música" value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} />
            <input className={input} placeholder="Artista / ministério" value={form.artista} onChange={(e) => setForm({ ...form, artista: e.target.value })} />
            <input className={input} placeholder="Categoria" value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} />
            <input className={input} placeholder="Link do YouTube" value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} />
            <input className={input} placeholder="Duração. Ex: 5:31" value={form.duracao} onChange={(e) => setForm({ ...form, duracao: e.target.value })} />
            <button className="mt-2 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-teal-300 px-4 font-black text-slate-950" type="submit">
              <Save className="h-5 w-5" />
              {isAdmin ? 'Salvar música' : 'Enviar para aprovação'}
            </button>
          </form>
        </main>
      )}

      {tela === 'usuarios' && isAdmin && (
        <main className="grid gap-4 lg:grid-cols-2">
          <section className={panel}>
            <h2 className="mb-4 text-xl font-black">Gerenciar Usuários</h2>
            {carregandoUsuarios && <p className="text-sm text-slate-300">Carregando...</p>}
            {!carregandoUsuarios && usuarios.length === 0 && <p className="rounded-xl bg-white/10 p-4 text-sm text-slate-300">Nenhum usuário encontrado.</p>}
            {!carregandoUsuarios && usuarios.length > 0 && (
              <div className="grid gap-3">
                {usuarios.map((usuario) => (
                  <div key={usuario.id} className="rounded-xl border border-white/15 bg-white/10 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <strong className="block truncate text-base text-white">{usuario.email}</strong>
                        <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${usuario.role === 'admin' ? 'bg-amber-300 text-slate-950' : 'bg-teal-300 text-slate-950'}`}>
                          {usuario.role}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button className={iconButton} onClick={() => editarUsuario(usuario)} title="Editar papel">
                          <Edit className="h-4 w-4" />
                        </button>
                        {usuario.id !== session.user.id && (
                          <button className={iconButton} onClick={() => excluirUsuario(usuario)} title="Remover">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className={panel}>
            <h2 className="mb-4 text-xl font-black">{editandoUsuario ? 'Editar Usuário' : 'Dados do Usuário'}</h2>
            <form onSubmit={salvarUsuario} className="grid gap-3">
              <div>
                <label className="mb-1 block text-sm font-bold text-slate-200">E-mail</label>
                <input
                  className={input}
                  type="email"
                  placeholder="email@exemplo.com"
                  value={formUsuario.email}
                  onChange={(e) => setFormUsuario({ ...formUsuario, email: e.target.value })}
                  disabled={!!editandoUsuario}
                />
              </div>
              {!editandoUsuario && (
                <div>
                  <label className="mb-1 block text-sm font-bold text-slate-200">Senha</label>
                  <input
                    className={input}
                    type="password"
                    placeholder="********"
                    value={formUsuario.senha}
                    onChange={(e) => setFormUsuario({ ...formUsuario, senha: e.target.value })}
                  />
                </div>
              )}
              <div>
                <label className="mb-1 block text-sm font-bold text-slate-200">Papel</label>
                <select
                  className={input}
                  value={formUsuario.role}
                  onChange={(e) => setFormUsuario({ ...formUsuario, role: e.target.value })}
                >
                  <option value="moderador">Moderador</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button className="min-h-12 rounded-xl bg-teal-300 font-black text-slate-950" type="submit">
                  {editandoUsuario ? 'Salvar Alterações' : 'Criar Usuário'}
                </button>
                {(editandoUsuario || formUsuario.email || formUsuario.senha) && (
                  <button
                    className="min-h-12 rounded-xl border border-white/15 bg-white/10 font-bold text-white"
                    type="button"
                    onClick={() => {
                      setEditandoUsuario(null);
                      setFormUsuario({ email: '', senha: '', role: 'moderador' });
                    }}
                  >
                    Limpar
                  </button>
                )}
              </div>
            </form>
          </section>
        </main>
      )}

      {tela === 'metricas' && isAdmin && (
        <main className="grid gap-4">
          <section className={panel}>
            <div className="mb-4 flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h2 className="text-xl font-black">Métricas</h2>
                <p className="text-sm text-slate-300">Análise de músicas e playlists</p>
              </div>
            </div>

            {/* Filtro de período */}
            <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 items-end">
              <div>
                <label className="mb-1 block text-sm font-bold text-slate-200 flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  Período
                </label>
                <select
                  className={input}
                  value={filtroPeriodo}
                  onChange={(e) => setFiltroPeriodo(e.target.value)}
                >
                  <option value="todos">Todo o período</option>
                  <option value="mes">Por mês</option>
                  <option value="ano">Por ano</option>
                  <option value="personalizado">Personalizado</option>
                </select>
              </div>

              {filtroPeriodo === 'mes' && (
                <div>
                  <label className="mb-1 block text-sm font-bold text-slate-200">Mês</label>
                  <input
                    className={input}
                    type="month"
                    value={mesSelecionado}
                    onChange={(e) => setMesSelecionado(e.target.value)}
                  />
                </div>
              )}

              {filtroPeriodo === 'ano' && (
                <div>
                  <label className="mb-1 block text-sm font-bold text-slate-200">Ano</label>
                  <input
                    className={input}
                    type="number"
                    value={anoSelecionado}
                    onChange={(e) => setAnoSelecionado(e.target.value)}
                    min="2020"
                    max={new Date().getFullYear()}
                  />
                </div>
              )}

              {filtroPeriodo === 'personalizado' && (
                <>
                  <div>
                    <label className="mb-1 block text-sm font-bold text-slate-200">Data Início</label>
                    <input
                      className={input}
                      type="date"
                      value={dataInicio}
                      onChange={(e) => setDataInicio(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-bold text-slate-200">Data Fim</label>
                    <input
                      className={input}
                      type="date"
                      value={dataFim}
                      onChange={(e) => setDataFim(e.target.value)}
                    />
                  </div>
                </>
              )}
            </div>

            {carregandoMetricas ? (
              <p className="text-sm text-slate-300">Carregando métricas...</p>
            ) : (
              <>
                {/* Cards de métricas gerais */}
                <div className="mb-6 grid grid-cols-2 lg:grid-cols-5 gap-3">
                  <div className="rounded-xl border border-teal-300/20 bg-teal-300/10 p-4">
                    <div className="flex items-center gap-3">
                      <Music2 className="h-8 w-8 text-teal-300" />
                      <div>
                        <p className="text-2xl font-black text-white">{metricas.totalMusicas}</p>
                        <p className="text-xs text-slate-300">Músicas cadastradas</p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-purple-300/20 bg-purple-300/10 p-4">
                    <div className="flex items-center gap-3">
                      <ListMusic className="h-8 w-8 text-purple-300" />
                      <div>
                        <p className="text-2xl font-black text-white">{metricas.totalPlaylists}</p>
                        <p className="text-xs text-slate-300">Playlists criadas</p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-blue-300/20 bg-blue-300/10 p-4">
                    <div className="flex items-center gap-3">
                      <MessageSquare className="h-8 w-8 text-blue-300" />
                      <div>
                        <p className="text-2xl font-black text-white">{metricas.totalSugestoes}</p>
                        <p className="text-xs text-slate-300">Sugestões recebidas</p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-emerald-300/20 bg-emerald-300/10 p-4">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="h-8 w-8 text-emerald-300" />
                      <div>
                        <p className="text-2xl font-black text-white">{metricas.totalAprovadas}</p>
                        <p className="text-xs text-slate-300">Músicas aprovadas</p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-amber-300/20 bg-amber-300/10 p-4">
                    <div className="flex items-center gap-3">
                      <Clock className="h-8 w-8 text-amber-300" />
                      <div>
                        <p className="text-2xl font-black text-white">{metricas.totalPendentes}</p>
                        <p className="text-xs text-slate-300">Músicas pendentes</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Gráficos */}
                <div className="mb-6 grid gap-4 lg:grid-cols-2">
                  {/* Gráfico de músicas mais selecionadas */}
                  <section className={`${panel} lg:col-span-2`}>
                    <h3 className="mb-4 text-lg font-bold text-white">Músicas mais selecionadas</h3>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={musicasMaisSelecionadas.slice(0, 10)}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                          <XAxis dataKey="titulo" tick={{ fill: 'white', fontSize: 12 }} angle={-15} textAnchor="end" height={100} />
                          <YAxis tick={{ fill: 'white' }} />
                          <Tooltip
                            contentStyle={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                            labelStyle={{ color: 'white' }}
                            itemStyle={{ color: '#5eead4' }}
                          />
                          <Bar dataKey="vezes" fill="#5eead4" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </section>

                  {/* Gráfico de playlists por mês */}
                  <section className={panel}>
                    <h3 className="mb-4 text-lg font-bold text-white">Playlists por mês</h3>
                    <div className="h-60">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={playlistsPorMes}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                          <XAxis dataKey="mes" tick={{ fill: 'white', fontSize: 12 }} />
                          <YAxis tick={{ fill: 'white' }} />
                          <Tooltip
                            contentStyle={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                            labelStyle={{ color: 'white' }}
                            itemStyle={{ color: '#a78bfa' }}
                          />
                          <Bar dataKey="playlists" fill="#a78bfa" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </section>

                  {/* Gráfico de sugestões por mês */}
                  <section className={panel}>
                    <h3 className="mb-4 text-lg font-bold text-white">Sugestões por mês</h3>
                    <div className="h-60">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={sugestoesPorMes}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                          <XAxis dataKey="mes" tick={{ fill: 'white', fontSize: 12 }} />
                          <YAxis tick={{ fill: 'white' }} />
                          <Tooltip
                            contentStyle={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                            labelStyle={{ color: 'white' }}
                            itemStyle={{ color: '#60a5fa' }}
                          />
                          <Bar dataKey="sugestoes" fill="#60a5fa" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </section>
                </div>

                {/* Tabela de ranking */}
                <section className={panel}>
                  <h3 className="mb-4 text-lg font-bold text-white">Ranking das músicas mais usadas</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/10">
                          <th className="py-3 px-4 text-left text-slate-300 font-bold">Posição</th>
                          <th className="py-3 px-4 text-left text-slate-300 font-bold">Música</th>
                          <th className="py-3 px-4 text-left text-slate-300 font-bold">Artista</th>
                          <th className="py-3 px-4 text-right text-slate-300 font-bold">Vezes selecionada</th>
                        </tr>
                      </thead>
                      <tbody>
                        {musicasMaisSelecionadas.map((musica, index) => (
                          <tr key={musica.id} className="border-b border-white/5 hover:bg-white/5">
                            <td className="py-3 px-4 text-white">
                              <span className={`inline-flex items-center justify-center h-8 w-8 rounded-full font-bold ${
                                index === 0 ? 'bg-amber-300 text-slate-950' :
                                index === 1 ? 'bg-slate-300 text-slate-950' :
                                index === 2 ? 'bg-amber-600 text-white' :
                                'bg-white/10 text-white'
                              }`}>
                                {index + 1}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-white truncate max-w-xs">{musica.titulo}</td>
                            <td className="py-3 px-4 text-slate-300 truncate max-w-xs">{musica.artista}</td>
                            <td className="py-3 px-4 text-right text-teal-300 font-bold">{musica.vezes}</td>
                          </tr>
                        ))}
                        {musicasMaisSelecionadas.length === 0 && (
                          <tr>
                            <td colSpan="4" className="py-8 text-center text-slate-400">
                              Nenhuma música foi selecionada ainda
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>
              </>
            )}
          </section>
        </main>
      )}

      <nav className="fixed inset-x-0 bottom-0 z-10 mx-auto max-w-md border-t border-white/15 bg-slate-950/80 px-2 py-3 backdrop-blur-xl sm:max-w-2xl lg:max-w-5xl">
        <div className={`grid gap-2 ${isAdmin ? 'grid-cols-7' : 'grid-cols-4'}`}>
          <button className={`rounded-xl px-1 py-2 text-xs font-bold ${tela === 'playlist' ? 'bg-teal-300 text-slate-950' : 'bg-white/10 text-white'}`} onClick={() => setTela('playlist')}><ListMusic className="mx-auto mb-1 h-5 w-5" />Lista</button>
          <button className={`rounded-xl px-1 py-2 text-xs font-bold ${tela === 'sugestoes' ? 'bg-teal-300 text-slate-950' : 'bg-white/10 text-white'}`} onClick={() => { setTela('sugestoes'); carregarSugestoes(); }}><Inbox className="mx-auto mb-1 h-5 w-5" />Sug.</button>
          <button className={`rounded-xl px-1 py-2 text-xs font-bold ${tela === 'musicas' ? 'bg-teal-300 text-slate-950' : 'bg-white/10 text-white'}`} onClick={() => setTela('musicas')}><Music className="mx-auto mb-1 h-5 w-5" />Músicas</button>
          {isAdmin && <button className={`rounded-xl px-1 py-2 text-xs font-bold ${tela === 'aprovar' ? 'bg-teal-300 text-slate-950' : 'bg-white/10 text-white'}`} onClick={() => setTela('aprovar')}><ListChecks className="mx-auto mb-1 h-5 w-5" />Aprovar</button>}
          {isAdmin && <button className={`rounded-xl px-1 py-2 text-xs font-bold ${tela === 'usuarios' ? 'bg-teal-300 text-slate-950' : 'bg-white/10 text-white'}`} onClick={() => { setTela('usuarios'); carregarUsuarios(); }}><User className="mx-auto mb-1 h-5 w-5" />Usuários</button>}
          {isAdmin && <button className={`rounded-xl px-1 py-2 text-xs font-bold ${tela === 'metricas' ? 'bg-teal-300 text-slate-950' : 'bg-white/10 text-white'}`} onClick={() => setTela('metricas')}><BarChart3 className="mx-auto mb-1 h-5 w-5" />Métricas</button>}
          <button className={`rounded-xl px-1 py-2 text-xs font-bold ${tela === 'form' ? 'bg-teal-300 text-slate-950' : 'bg-white/10 text-white'}`} onClick={() => abrirFormulario()}><Plus className="mx-auto mb-1 h-5 w-5" />Add</button>
        </div>
      </nav>

      {/* Modal de Preview da Música */}
      {previewMusica && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setPreviewMusica(null)}>
          <div className={`${panel} w-full max-w-lg`} onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-lg font-black text-white">{previewMusica.titulo}</h3>
                <p className="truncate text-sm text-slate-300">{previewMusica.artista || 'Sem artista'}</p>
              </div>
              <button className={iconButton} onClick={() => setPreviewMusica(null)} title="Fechar">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="aspect-video w-full overflow-hidden rounded-xl bg-black">
              <iframe
                className="h-full w-full"
                src={`https://www.youtube.com/embed/${extrairYouTubeId(previewMusica.link)}?autoplay=1`}
                title={previewMusica.titulo}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
            <div className="mt-4 flex gap-2">
              <a
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-500 px-4 py-3 font-bold text-white hover:bg-red-600"
                href={previewMusica.link}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Play className="h-5 w-5" />
                Abrir no YouTube
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
