import React, { useEffect, useMemo, useState } from 'react';
import { supabase, supabaseConfigError } from './supabase';
import {
  Check,
  Copy,
  Download,
  Edit,
  ListMusic,
  MessageCircle,
  Music,
  Plus,
  Save,
  Search,
  Send,
  Trash2,
  X,
} from 'lucide-react';

const vazio = { titulo: '', artista: '', categoria: '', link: '', duracao: '' };

function normalizarData(data) {
  if (!data) return '';
  const [ano, mes, dia] = data.split('-');
  return `${dia}/${mes}/${ano}`;
}

const appShell = 'mx-auto flex min-h-screen w-full max-w-md flex-col px-4 pb-28 pt-5 sm:max-w-2xl lg:max-w-5xl';
const panel = 'rounded-2xl border border-white/15 bg-white/10 p-4 shadow-2xl shadow-black/30 backdrop-blur-xl';
const input = 'w-full rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-300 focus:border-teal-300 focus:bg-white/15';
const iconButton = 'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-white hover:bg-white/20';

export default function App() {
  const [musicas, setMusicas] = useState([]);
  const [selecionadas, setSelecionadas] = useState([]);
  const [form, setForm] = useState(vazio);
  const [editando, setEditando] = useState(null);
  const [busca, setBusca] = useState('');
  const [tituloLista, setTituloLista] = useState('Lista de músicas');
  const [dataLista, setDataLista] = useState(new Date().toISOString().slice(0, 10));
  const [observacao, setObservacao] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [tela, setTela] = useState('playlist');
  const [installPrompt, setInstallPrompt] = useState(null);
  const [instalado, setInstalado] = useState(false);

  async function carregarMusicas() {
    setCarregando(true);
    const { data, error } = await supabase
      .from('musicas')
      .select('*')
      .order('titulo', { ascending: true });

    if (error) alert(error.message);
    setMusicas(data || []);
    setCarregando(false);
  }

  useEffect(() => {
    if (!supabaseConfigError) carregarMusicas();
  }, []);

  useEffect(() => {
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    setInstalado(standalone);

    function capturarPrompt(event) {
      event.preventDefault();
      setInstallPrompt(event);
    }

    function marcarInstalado() {
      setInstalado(true);
      setInstallPrompt(null);
    }

    window.addEventListener('beforeinstallprompt', capturarPrompt);
    window.addEventListener('appinstalled', marcarInstalado);

    return () => {
      window.removeEventListener('beforeinstallprompt', capturarPrompt);
      window.removeEventListener('appinstalled', marcarInstalado);
    };
  }, []);

  const filtradas = useMemo(() => {
    const q = busca.toLowerCase();
    return musicas.filter((m) =>
      [m.titulo, m.artista, m.categoria].join(' ').toLowerCase().includes(q)
    );
  }, [musicas, busca]);

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
      updated_at: new Date().toISOString(),
    };

    const req = editando
      ? supabase.from('musicas').update(payload).eq('id', editando)
      : supabase.from('musicas').insert(payload);

    const { error } = await req;
    if (error) return alert(error.message);

    setForm(vazio);
    setEditando(null);
    await carregarMusicas();
    setTela('musicas');
  }

  async function excluirMusica(id) {
    if (!confirm('Deseja excluir esta música?')) return;
    const { error } = await supabase.from('musicas').delete().eq('id', id);
    if (error) return alert(error.message);
    setSelecionadas(selecionadas.filter((m) => m.id !== id));
    carregarMusicas();
  }

  function montarTexto() {
    const linhas = [];
    linhas.push(`🎵 *${tituloLista || 'Lista de músicas'}*`);
    linhas.push(`📅 Data: ${normalizarData(dataLista)}`);
    if (observacao.trim()) linhas.push(`📝 ${observacao.trim()}`);
    linhas.push('');
    linhas.push('*Músicas:*');
    selecionadas.forEach((m, i) => {
      linhas.push(`${i + 1}. ${m.titulo}${m.artista ? ` - ${m.artista}` : ''}`);
      if (m.link) linhas.push(`   ${m.link}`);
    });
    return linhas.join('\n');
  }

  async function salvarLista() {
    if (!tituloLista.trim()) return alert('Informe o título da lista.');
    if (selecionadas.length === 0) return alert('Selecione pelo menos uma música.');

    const { data: lista, error } = await supabase
      .from('listas_whatsapp')
      .insert({ titulo: tituloLista, data_lista: dataLista, observacao })
      .select()
      .single();

    if (error) return alert(error.message);

    const itens = selecionadas.map((m, index) => ({
      lista_id: lista.id,
      musica_id: m.id,
      ordem: index + 1,
    }));

    const { error: erroItens } = await supabase.from('lista_whatsapp_musicas').insert(itens);
    if (erroItens) return alert(erroItens.message);

    alert('Play list salva com sucesso.');
  }

  async function copiarTexto() {
    const texto = montarTexto();
    setMensagem(texto);
    try {
      await navigator.clipboard.writeText(texto);
      alert('Texto copiado.');
    } catch {
      alert('Não foi possível copiar automaticamente. O texto ficou disponível na prévia.');
    }
  }

  function abrirWhatsApp() {
    window.open(`https://wa.me/?text=${encodeURIComponent(montarTexto())}`, '_blank');
  }

  async function instalarApp() {
    if (!installPrompt) return;
    installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  }

  if (supabaseConfigError) {
    return (
      <div className={appShell}>
        <section className={`${panel} mt-24`}>
          <h1 className="text-2xl font-black">Configuração do Supabase</h1>
          <p className="mt-3 text-sm text-slate-200">{supabaseConfigError}</p>
          <p className="mt-2 text-sm text-slate-300">
            Confira o arquivo <strong>.env</strong> ou as variáveis do deploy e reinicie o servidor.
          </p>
        </section>
      </div>
    );
  }

  return (
    <div className={appShell}>
      <header className="mb-5 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-200">Play list</p>
          <h1 className="mt-1 flex items-center gap-2 text-3xl font-black leading-tight text-white sm:text-4xl">
            <Music className="h-8 w-8 shrink-0 text-teal-200" />
            <span>Lista de Músicas</span>
          </h1>
        </div>
        <div className="flex shrink-0 gap-2">
          {installPrompt && !instalado && (
            <button className={iconButton} onClick={instalarApp} title="Instalar aplicativo">
              <Download className="h-5 w-5" />
            </button>
          )}
          <button className={iconButton} onClick={() => abrirFormulario()} title="Adicionar música">
            <Plus className="h-5 w-5" />
          </button>
        </div>
      </header>

      {tela === 'playlist' && (
        <main className="grid gap-4 lg:grid-cols-2">
          <section className={panel}>
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-xl font-black">CRIA PLAY LIST</h2>
              <span className="rounded-full bg-teal-300/20 px-3 py-1 text-xs font-bold text-teal-100">
                {selecionadas.length} músicas
              </span>
            </div>

            <div className="grid gap-3">
              <input className={input} placeholder="Título da lista" value={tituloLista} onChange={(e) => setTituloLista(e.target.value)} />
              <input className={input} type="date" value={dataLista} onChange={(e) => setDataLista(e.target.value)} />
              <textarea className={`${input} min-h-24 resize-none`} placeholder="Observação opcional" value={observacao} onChange={(e) => setObservacao(e.target.value)} />
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <button className="inline-flex min-h-12 items-center justify-center gap-1 rounded-xl bg-teal-300 px-2 text-sm font-black text-slate-950" onClick={salvarLista}>
                <Save className="h-4 w-4" />
                Salvar
              </button>
              <button className="inline-flex min-h-12 items-center justify-center gap-1 rounded-xl border border-white/15 bg-white/10 px-2 text-sm font-bold text-white" onClick={copiarTexto}>
                <Copy className="h-4 w-4" />
                Copiar
              </button>
              <button className="inline-flex min-h-12 items-center justify-center gap-1 rounded-xl bg-emerald-400 px-2 text-sm font-black text-slate-950" onClick={abrirWhatsApp}>
                <Send className="h-4 w-4" />
                Enviar
              </button>
            </div>
          </section>

          <section className={panel}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-black">Prévia</h2>
              <MessageCircle className="h-5 w-5 text-emerald-200" />
            </div>
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
              <h2 className="text-xl font-black">Músicas cadastradas</h2>
              <p className="text-sm text-slate-300">{carregando ? 'Carregando...' : `${filtradas.length} encontradas`}</p>
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
                <article className={`rounded-2xl border p-3 transition ${selected ? 'border-teal-300/70 bg-teal-300/15' : 'border-white/10 bg-white/10'}`} key={m.id}>
                  <div className="flex items-center gap-3">
                    <button className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl font-black ${selected ? 'bg-teal-300 text-slate-950' : 'bg-white/10 text-white'}`} onClick={() => marcarMusica(m)}>
                      {selected ? <Check className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
                    </button>
                    <div className="min-w-0 flex-1">
                      <strong className="block truncate text-base text-white">{m.titulo}</strong>
                      <span className="block truncate text-sm text-slate-300">
                        {m.artista || 'Sem artista'} {m.categoria ? `• ${m.categoria}` : ''} {m.duracao ? `• ${m.duracao}` : ''}
                      </span>
                      {m.link && <a className="text-sm font-bold text-teal-200" href={m.link} target="_blank">Abrir link</a>}
                    </div>
                    <div className="flex gap-2">
                      <button className={iconButton} onClick={() => abrirFormulario(m)} title="Editar">
                        <Edit className="h-4 w-4" />
                      </button>
                      <button className={iconButton} onClick={() => excluirMusica(m.id)} title="Excluir">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </main>
      )}

      {tela === 'form' && (
        <main className={panel}>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-200">Segunda tela</p>
              <h2 className="text-2xl font-black">{editando ? 'Editar música' : 'Adicionar música'}</h2>
            </div>
            <button className={iconButton} onClick={() => setTela('musicas')} title="Fechar">
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={salvarMusica} className="grid gap-3">
            <input className={input} placeholder="Título da música" value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} />
            <input className={input} placeholder="Artista / ministério" value={form.artista} onChange={(e) => setForm({ ...form, artista: e.target.value })} />
            <input className={input} placeholder="Categoria" value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} />
            <input className={input} placeholder="Link do YouTube" value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} />
            <input className={input} placeholder="Duração. Ex: 5:31" value={form.duracao} onChange={(e) => setForm({ ...form, duracao: e.target.value })} />
            <button className="mt-2 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-teal-300 px-4 font-black text-slate-950" type="submit">
              <Save className="h-5 w-5" />
              Salvar música
            </button>
          </form>
        </main>
      )}

      <nav className="fixed inset-x-0 bottom-0 z-10 mx-auto max-w-md border-t border-white/15 bg-slate-950/80 px-4 py-3 backdrop-blur-xl sm:max-w-2xl lg:max-w-5xl">
        <div className="grid grid-cols-3 gap-2">
          <button className={`rounded-xl px-2 py-2 text-xs font-black ${tela === 'playlist' ? 'bg-teal-300 text-slate-950' : 'bg-white/10 text-white'}`} onClick={() => setTela('playlist')}>
            <ListMusic className="mx-auto mb-1 h-5 w-5" />
            Play list
          </button>
          <button className={`rounded-xl px-2 py-2 text-xs font-black ${tela === 'musicas' ? 'bg-teal-300 text-slate-950' : 'bg-white/10 text-white'}`} onClick={() => setTela('musicas')}>
            <Music className="mx-auto mb-1 h-5 w-5" />
            Músicas
          </button>
          <button className={`rounded-xl px-2 py-2 text-xs font-black ${tela === 'form' ? 'bg-teal-300 text-slate-950' : 'bg-white/10 text-white'}`} onClick={() => abrirFormulario()}>
            <Plus className="mx-auto mb-1 h-5 w-5" />
            Adicionar
          </button>
        </div>
      </nav>
    </div>
  );
}
