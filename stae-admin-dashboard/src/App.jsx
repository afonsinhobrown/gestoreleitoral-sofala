import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  MapPin, 
  CheckCircle, 
  ShieldCheck, 
  Plus,
  Check,
  Search,
  FileText,
  Filter,
  BarChart,
  LogOut
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'https://staeapi-sofala.onrender.com';

const styles = {
  container: { display: 'flex', background: 'radial-gradient(circle at top left, #001f42, #000)', color: '#fff', minHeight: '100vh', fontFamily: '"Inter", sans-serif' },
  sidebar: { width: '300px', borderRight: '1px solid rgba(255,255,255,0.1)', padding: '40px 24px', display: 'flex', flexDirection: 'column', gap: '30px', background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(20px)' },
  main: { flex: 1, padding: '60px', overflowY: 'auto' },
  card: { background: 'rgba(255,255,255,0.03)', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.08)', padding: '24px', backdropFilter: 'blur(10px)' },
  statCard: { flex: 1, padding: '32px', borderRadius: '24px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', gap: '12px' },
  button: { background: 'linear-gradient(135deg, #d4a30d, #b0870b)', color: '#002D62', border: 'none', padding: '12px 24px', borderRadius: '12px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' },
  table: { width: '100%', textAlign: 'left', borderCollapse: 'collapse', marginTop: '20px' },
  th: { padding: '16px', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.4, borderBottom: '1px solid rgba(255,255,255,0.1)' },
  td: { padding: '20px 16px', borderBottom: '1px solid rgba(255,255,255,0.03)', fontSize: '14px' }
};

export default function App() {
  const [candidates, setCandidates] = useState([]);
  const [selectedRole, setSelectedRole] = useState('Todos');

  useEffect(() => {
    // PAUTA OFICIAL 2026
    setCandidates([
      { id: 1, nome: "AFONSO ALEXANDRE PENE", nuit: "110100557622Q", distrito: "BEIRA", role: "MMV", status: "VALIDADO" },
      { id: 2, nome: "CANDIDATO EM ANÁLISE 01", nuit: "11019922Q", distrito: "DONDO", role: "BRIGADISTA", status: "PENDENTE" }
    ]);
  }, []);

  return (
    <div style={styles.container}>
      <aside style={styles.sidebar}>
        <div>
          <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/1/17/Coat_of_arms_of_Mozambique.svg/1200px-Coat_of_arms_of_Mozambique.svg.png" width="60" style={{ marginBottom: 24 }}/>
          <h2 style={{ fontSize: 16, fontWeight: 900, background: 'linear-gradient(to right, #d4a30d, #fff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', lineHeight: 1.3 }}>SECRETARIADO TÉCNICO DE ADMINISTRAÇÃO ELEITORAL</h2>
          <p style={{ fontSize: 10, opacity: 0.4, letterSpacing: 2, fontWeight: 700, marginTop: 10 }}>PROVÍNCIA DE SOFALA - 2026</p>
        </div>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ ...styles.card, background: 'rgba(212,163,13,0.1)', border: '1px solid #d4a30d', display: 'flex', gap: 16, alignItems: 'center' }}><Users color="#d4a30d" size={20}/> <b>Candidaturas</b></div>
          <div style={{ padding: '12px 20px', opacity: 0.4, display: 'flex', gap: 16, alignItems: 'center' }}><MapPin size={20}/> Postos Online</div>
          <div style={{ padding: '12px 20px', opacity: 0.4, display: 'flex', gap: 16, alignItems: 'center' }}><FileText size={20}/> Relatórios Oficiais</div>
          <div style={{ padding: '12px 20px', opacity: 0.4, display: 'flex', gap: 16, alignItems: 'center' }}><BarChart size={20}/> Estatísticas Nacional</div>
        </nav>
        <button style={{ marginTop: 'auto', background: 'none', border: 'none', color: '#fff', opacity: 0.5, display: 'flex', gap: 12, alignItems: 'center' }}><LogOut size={16}/> Sair do Sistema</button>
      </aside>

      <main style={styles.main}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 48 }}>
           <div><h1 style={{ fontSize: 28, fontWeight: 900 }}>Gestão Eleitoral 2026</h1><p style={{ opacity: 0.5, marginTop: 8 }}>Pauta Digital de Monitorização e Validação de Sofala</p></div>
           <button style={styles.button}><Plus/> NOVO REGISTO PRESENCIAL</button>
        </header>

        <div style={{ display: 'flex', gap: 24, marginBottom: 48 }}>
           {[{ l: "MMV", v: "1", c: "#d4a30d" }, { l: "BRIGADISTAS", v: "1", c: "#22d3ee" }, { l: "SUPERVISORES", v: "0", c: "#10b981" }, { l: "RESTANTES", v: "0", c: "#6366f1" }].map((s, i) => (
             <div key={i} style={styles.statCard}><p style={{ fontSize: 10, fontWeight: 900, opacity: 0.4 }}>{s.l}</p><h3 style={{ fontSize: 32, fontWeight: 900, color: s.c }}>{s.v}</h3></div>
           ))}
        </div>

        <div style={styles.card}>
           <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 32 }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 18 }}><ShieldCheck color="#10b981"/> Candidatos Monitorizados</h3>
              <div style={{ display: 'flex', gap: 12, background: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 8 }}><Filter size={16} /><select style={{ background: 'none', border: 'none', color: '#fff' }} onChange={(e) => setSelectedRole(e.target.value)}><option>Todos</option><option>MMV</option><option>Brigadista</option></select></div>
           </div>
           
           <table style={styles.table}>
              <thead>
                 <tr><th style={styles.th}>Nome Titular</th><th style={styles.th}>Identificação</th><th style={styles.th}>Função</th><th style={styles.th}>Distrito</th><th style={styles.th}>Estado</th><th style={styles.th}>Controlo</th></tr>
              </thead>
              <tbody>
                 {candidates.filter(c => selectedRole === 'Todos' || c.role === selectedRole.toUpperCase()).map(c => (
                    <tr key={c.id}>
                       <td style={styles.td}><b>{c.nome}</b></td>
                       <td style={styles.td}><span style={{ opacity: 0.5 }}>{c.nuit}</span></td>
                       <td style={styles.td}><span style={{ color: '#d4a30d', fontWeight: 800 }}>{c.role}</span></td>
                       <td style={styles.td}>{c.distrito}</td>
                       <td style={styles.td}><span style={{ color: c.status === 'VALIDADO' ? '#10b981' : '#f59e0b', fontSize: 11, fontWeight: 900 }}>{c.status}</span></td>
                       <td style={styles.td}><button style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid #10b981', color: '#10b981', padding: '6px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 10, fontWeight: 700 }}>VERIFICAR</button></td>
                    </tr>
                 ))}
              </tbody>
           </table>
        </div>
      </main>
    </div>
  );
}
