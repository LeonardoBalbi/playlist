import React, { useEffect, useMemo, useState } from 'react';
import { supabase, supabaseConfigError } from './supabase';
import { Copy, Edit, Music, Plus, Save, Search, Send, Trash2 } from 'lucide-react';

const vazio = { titulo: '', artista: '', categoria: '', link: '', duracao: '' };

function normalizarData(d) {
  if (!d) return '';
  const [ano, mes, dia] = d.split('-');
  return `${dia}/${mes}/${ano}`;
}

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

  if (supabaseConfigError) {
    return (
      <div className="page">
        <section className="card configError">
          <h1>Configuração do Supabase</h1>
          <p>{supabaseConfigError}</p>
          <p>Confira o arquivo <strong>.env</strong> ou as variáveis do deploy e reinicie o servidor.</p>
        </section>
      </div>
    );
  }

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
    carregarMusicas();
  }, []);

  const filtradas = useMemo(() => {
    const q = busca.toLowerCase();
    return musicas.filter((m) =>
      [m.titulo, m.artista, m.categoria].join(' ').toLowerCase().includes(q)
    );
  }, [musicas, busca]);

  function marcarMusica(musica) {
    const existe = selecionadas.find((m) => m.id === musica.id);
    if (existe) setSelecionadas(selecionadas.filter((m) => m.id !== musica.id));
    else setSelecionadas([...selecionadas, musica]);
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
    carregarMusicas();
  }

  function editarMusica(m) {
    setEditando(m.id);
    setForm({
      titulo: m.titulo || '',
      artista: m.artista || '',
      categoria: m.categoria || '',
      link: m.link || '',
      duracao: m.duracao || '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
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

    alert('Lista salva com sucesso.');
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
    const texto = encodeURIComponent(montarTexto());
    window.open(`https://wa.me/?text=${texto}`, '_blank');
  }

  return (
    <div className="page">
      <header className="hero">
        <div>
          <p className="tag">Supabase + Vercel</p>
          <h1><Music size={32}/> Lista de Músicas para WhatsApp</h1>
          <p>Cadastre músicas, monte a lista do culto/reunião e envie para o grupo.</p>
        </div>
      </header>

      <main className="grid">
        <section className="card">
          <h2>{editando ? 'Editar música' : 'Adicionar música'}</h2>
          <form onSubmit={salvarMusica} className="form">
            <input placeholder="Título da música" value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })}/>
            <input placeholder="Artista / ministério" value={form.artista} onChange={(e) => setForm({ ...form, artista: e.target.value })}/>
            <input placeholder="Categoria" value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })}/>
            <input placeholder="Link do YouTube" value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })}/>
            <input placeholder="Duração. Ex: 5:31" value={form.duracao} onChange={(e) => setForm({ ...form, duracao: e.target.value })}/>
            <button className="btn primary" type="submit"><Save size={18}/> Salvar música</button>
            {editando && <button type="button" className="btn" onClick={() => { setEditando(null); setForm(vazio); }}>Cancelar edição</button>}
          </form>
        </section>

        <section className="card">
          <h2>Criar lista para WhatsApp</h2>
          <div className="form">
            <input placeholder="Título da lista" value={tituloLista} onChange={(e) => setTituloLista(e.target.value)}/>
            <input type="date" value={dataLista} onChange={(e) => setDataLista(e.target.value)}/>
            <textarea placeholder="Observação opcional" value={observacao} onChange={(e) => setObservacao(e.target.value)} />
            <div className="actions">
              <button className="btn primary" onClick={salvarLista}><Plus size={18}/> Salvar lista</button>
              <button className="btn" onClick={copiarTexto}><Copy size={18}/> Copiar</button>
              <button className="btn whats" onClick={abrirWhatsApp}><Send size={18}/> WhatsApp</button>
            </div>
          </div>
          <div className="preview">
            <h3>Prévia</h3>
            <pre>{mensagem || montarTexto()}</pre>
          </div>
        </section>
      </main>

      <section className="card full">
        <div className="listHeader">
          <h2>Músicas cadastradas {carregando ? '...' : `(${filtradas.length})`}</h2>
          <label className="search"><Search size={18}/><input placeholder="Buscar música, artista ou categoria" value={busca} onChange={(e) => setBusca(e.target.value)}/></label>
        </div>

        <div className="musicList">
          {filtradas.map((m) => {
            const selected = selecionadas.some((s) => s.id === m.id);
            return (
              <div className={`musicItem ${selected ? 'selected' : ''}`} key={m.id}>
                <button className="check" onClick={() => marcarMusica(m)}>{selected ? '✓' : '+'}</button>
                <div className="musicInfo">
                  <strong>{m.titulo}</strong>
                  <span>{m.artista || 'Sem artista'} {m.categoria ? `• ${m.categoria}` : ''} {m.duracao ? `• ${m.duracao}` : ''}</span>
                  {m.link && <a href={m.link} target="_blank">Abrir link</a>}
                </div>
                <div className="rowActions">
                  <button onClick={() => editarMusica(m)}><Edit size={17}/></button>
                  <button onClick={() => excluirMusica(m.id)}><Trash2 size={17}/></button>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
