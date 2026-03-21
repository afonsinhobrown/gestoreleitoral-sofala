import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  BookOpen, 
  Bell, 
  Plus,
  Check,
  X,
  Search,
  Filter,
  ClipboardCheck,
  LogOut,
  MapPin,
  Save,
  Trash2,
  FileText
} from 'lucide-react';

const styles = {
  container: { display: 'flex', background: '#020617', color: '#fff', minHeight: '100vh', fontFamily: '"Inter", sans-serif' },
  sidebar: { width: '280px', borderRight: '1px solid rgba(255,255,255,0.1)', padding: '32px 20px', display: 'flex', flexDirection: 'column', gap: '32px', background: '#0f172a' },
  main: { flex: 1, padding: '40px', overflowY: 'auto' },
  card: { background: 'rgba(255,255,255,0.03)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.08)', padding: '24px' },
  sidebarItem: (active) => ({ 
    padding: '14px 20px', 
    borderRadius: '12px', 
    display: 'flex', 
    alignItems: 'center', 
    gap: '16px', 
    cursor: 'pointer',
    background: active ? '#d4a30d' : 'transparent',
    color: active ? '#000' : '#94a3b8',
    fontWeight: active ? '800' : '500',
    transition: 'all 0.2s'
  }),
  button: { background: 'linear-gradient(135deg, #d4a30d, #b0870b)', color: '#002D62', border: 'none', padding: '12px 20px', borderRadius: '10px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' },
  table: { width: '100%', borderCollapse: 'collapse', marginTop: '20px' },
  th: { padding: '16px', fontSize: '11px', textTransform: 'uppercase', opacity: 0.5, borderBottom: '1px solid rgba(255,255,255,0.1)', textAlign: 'left' },
  td: { padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.03)', fontSize: '13px' }
};

export default function App() {
  const [view, setView] = useState('candidaturas');
  const [showRegistoModal, setShowRegistoModal] = useState(false);
  const [candidates, setCandidates] = useState([
    { id: 1, nome: "AFONSO ALEXANDRE PENE", nuit: "110100557622Q", distrito: "BEIRA", role: "MMV", status: "PENDENTE", docs: "OK" },
    { id: 2, nome: "GILBERTO MACHAVA", nuit: "123456789", distrito: "DONDO", role: "BRIGADISTA", status: "APROVADO", docs: "OK" }
  ]);
  const [turmas, setTurmas] = useState([
    { id: 1, nome: "TURMA A - BEIRA", local: "Escola Secundária Samora Machel", formandos: [] }
  ]);

  const handleStatusChange = (id, newStatus) => {
    setCandidates(candidates.map(c => c.id === id ? { ...c, status: newStatus } : c));
  };

  return (
    <div style={styles.container}>
      {/* SIDEBAR OFICIAL - SOFALA */}
      <aside style={styles.sidebar}>
        <div>
          <img src="/logo_stae.svg" width="45" style={{ marginBottom: 16 }}/>
          <h2 style={{ fontSize: 13, fontWeight: 900, color: '#d4a30d', lineHeight: 1.4 }}>SECRETARIADO TÉCNICO DE ADMINISTRAÇÃO ELEITORAL</h2>
          <p style={{ fontSize: 9, opacity: 0.5, marginTop: 8 }}>DIREÇÃO PROVINCIAL DE SOFALA</p>
        </div>
        
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={styles.sidebarItem(view === 'candidaturas')} onClick={() => setView('candidaturas')}><Users size={20}/> Candidaturas</div>
          <div style={styles.sidebarItem(view === 'formacao')} onClick={() => setView('formacao')}><BookOpen size={20}/> Gestão de Formação</div>
          <div style={styles.sidebarItem(view === 'notificacoes')} onClick={() => setView('notificacoes')}><Bell size={20}/> Serviço de Notificações</div>
        </nav>
      </aside>

      <main style={styles.main}>
        {/* VISTA: CANDIDATURAS */}
        {view === 'candidaturas' && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
            <div><h1 style={{ fontSize: 24, fontWeight: 900 }}>Gestão de Candidaturas 2026</h1><p style={{ opacity: 0.5, fontSize: 14 }}>Validação de documentos e aprovação nacional.</p></div>
            <button style={styles.button} onClick={() => setShowRegistoModal(true)}><Plus/> REGISTO PRESENCIAL</button>
          </header>

          <div style={styles.card}>
            <h3 style={{ fontSize: 16, marginBottom: 20 }}>Pauta de Candidatos Submetidos</h3>
            <table style={styles.table}>
              <thead>
                <tr><th style={styles.th}>Nome Titular</th><th style={styles.th}>Função</th><th style={styles.th}>Geografia</th><th style={styles.th}>Docs</th><th style={styles.th}>Estado</th><th style={styles.th}>Acções</th></tr>
              </thead>
              <tbody>
                {candidates.map(c => (
                  <tr key={c.id}>
                    <td style={styles.td}><b>{c.nome}</b><p style={{ fontSize: 10, opacity: 0.4 }}>{c.nuit}</p></td>
                    <td style={styles.td}>{c.role}</td>
                    <td style={styles.td}>{c.distrito}</td>
                    <td style={styles.td}><span style={{ color: '#4ade80', fontSize: 10 }}>{c.docs}</span></td>
                    <td style={styles.td}>
                      <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: 10, fontWeight: 900, background: c.status === 'APROVADO' ? '#14532d' : c.status === 'REPROVADO' ? '#7f1d1d' : '#1e293b' }}>
                        {c.status}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => handleStatusChange(c.id, 'APROVADO')} style={{ background: '#10b981', border: 'none', padding: 6, borderRadius: 6, cursor: 'pointer' }}><Check size={14} color="#000"/></button>
                        <button onClick={() => handleStatusChange(c.id, 'REPROVADO')} style={{ background: '#ef4444', border: 'none', padding: 6, borderRadius: 6, cursor: 'pointer' }}><X size={14}/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>}

        {/* VISTA: FORMAÇÃO */}
        {view === 'formacao' && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <header style={{ marginBottom: 32 }}>
            <h1 style={{ fontSize: 24, fontWeight: 900 }}>Gestão de Formação Provincial</h1>
            <p style={{ opacity: 0.5 }}>Distribuição de aprovados em turmas e avaliação final.</p>
          </header>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
             {turmas.map(t => (
               <div key={t.id} style={styles.card}>
                 <h3 style={{ color: '#d4a30d', fontWeight: 900 }}>{t.nome}</h3>
                 <p style={{ fontSize: 12, opacity: 0.4, margin: '8px 0 20px' }}><MapPin size={12}/> {t.local}</p>
                 <div style={{ background: 'rgba(0,0,0,0.2)', padding: 16, borderRadius: 12 }}>
                   <p style={{ fontSize: 11, marginBottom: 12 }}>FORMANDOS INSCRITOS: <b>{candidates.filter(c => c.status === 'APROVADO').length}</b></p>
                   <button style={{ ...styles.button, width: '100%', justifyContent: 'center', fontSize: 12 }}>AVALIAR TURMA</button>
                 </div>
               </div>
             ))}
             <button style={{ border: '2px dashed rgba(255,255,255,0.1)', background: 'transparent', color: '#fff', borderRadius: 20, padding: 32, cursor: 'pointer' }}>+ CRIAR NOVA TURMA</button>
          </div>
        </motion.div>}

        {/* VISTA: NOTIFICAÇÕES */}
        {view === 'notificacoes' && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <h1>Serviço de Notificações Eleitorais</h1>
          <div style={styles.card}>
            <p style={{ marginBottom: 20 }}>Enviar aviso em massa para candidatos e formandos.</p>
            <div style={{ display: 'grid', gap: 16 }}>
               <select className="stae-input" style={{ background: '#1e293b', color: '#fff' }}>
                 <option>Aos Candidatos (Fase Concurso)</option>
                 <option>Aos Formandos (Fase Formação)</option>
               </select>
               <textarea placeholder="Escreva a mensagem oficial aqui..." style={{ background: '#1e293b', color: '#fff', padding: 16, borderRadius: 10, border: 'none', height: 150 }}/>
               <button style={styles.button}><Bell/> DISPARAR NOTIFICAÇÃO NACIONAL</button>
            </div>
          </div>
        </motion.div>}

        {/* MODAL: REGISTO PRESENCIAL */}
        <AnimatePresence>
          {showRegistoModal && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
              <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} style={{ background: '#0f172a', width: '500px', padding: 32, borderRadius: 24, border: '1px solid #d4a30d' }}>
                <h2 style={{ marginBottom: 24 }}>Registo Presencial no Balcão</h2>
                <div style={{ display: 'grid', gap: 16 }}>
                  <input type="text" placeholder="Nome Completo" style={{ background: '#1e293b', border: 'none', padding: 12, borderRadius: 8, color: '#fff' }} id="regNome"/>
                  <input type="text" placeholder="NUIT / BI" style={{ background: '#1e293b', border: 'none', padding: 12, borderRadius: 8, color: '#fff' }} id="regNuit"/>
                  <button style={styles.button} onClick={() => {
                    const nome = document.getElementById('regNome').value;
                    const nuit = document.getElementById('regNuit').value;
                    setCandidates([...candidates, { id: Date.now(), nome, nuit, distrito: 'BEIRA', role: 'MMV', status: 'PENDENTE', docs: 'OK' }]);
                    setShowRegistoModal(false);
                  }}>GUARDAR REGISTO NACIONAL</button>
                  <button onClick={() => setShowRegistoModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8' }}>Cancelar</button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
