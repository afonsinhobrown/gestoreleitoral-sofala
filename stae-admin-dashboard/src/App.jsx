import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  MapPin, 
  CheckCircle, 
  ShieldCheck, 
  FileText,
  Plus,
  Check,
  Search
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'https://staeapi-sofala.onrender.com';

const styles = {
  container: { display: 'flex', background: 'radial-gradient(circle at top left, #001f42, #000)', color: '#fff', minHeight: '100vh', fontFamily: '"Inter", sans-serif' },
  sidebar: { width: '280px', borderRight: '1px solid rgba(255,255,255,0.1)', padding: '40px 24px', display: 'flex', flexDirection: 'column', gap: '40px', background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(20px)' },
  main: { flex: 1, padding: '60px', overflowY: 'auto' },
  card: { background: 'rgba(255,255,255,0.03)', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.08)', padding: '24px', backdropFilter: 'blur(10px)' },
  statCard: { flex: 1, padding: '32px', borderRadius: '24px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', gap: '12px' },
  button: { background: 'linear-gradient(135deg, #d4a30d, #b0870b)', color: '#002D62', border: 'none', padding: '14px 28px', borderRadius: '16px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' },
  table: { width: '100%', textAlign: 'left', borderCollapse: 'collapse', marginTop: '20px' },
  th: { padding: '16px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.4, borderBottom: '1px solid rgba(255,255,255,0.1)' },
  td: { padding: '20px 16px', borderBottom: '1px solid rgba(255,255,255,0.03)', fontSize: '14px' }
};

export default function App() {
  const [candidates, setCandidates] = useState([]);

  useEffect(() => {
    // PAUTA OFICIAL NEUTRA
    setCandidates([
      { id: 1, nome: "AFONSO ALEXANDRE PENE", nuit: "110100557622Q", distrito: "BEIRA", status: "PENDENTE" },
      { id: 2, nome: "CANDIDATO 02 - TESTE NACIONAL", nuit: "123456789", distrito: "DONDO", status: "APROVADO" }
    ]);
  }, []);

  return (
    <div style={styles.container}>
      <aside style={styles.sidebar}>
        <div>
          <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/1/17/Coat_of_arms_of_Mozambique.svg/1200px-Coat_of_arms_of_Mozambique.svg.png" width="60" style={{ marginBottom: 20 }}/>
          <h2 style={{ fontSize: 24, fontWeight: 900, background: 'linear-gradient(to right, #d4a30d, #fff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>STAE SOFALA</h2>
          <p style={{ fontSize: 10, opacity: 0.4, letterSpacing: 2, fontWeight: 700 }}>PAINEL DE GESTÃO PROVINCIAL</p>
        </div>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ ...styles.card, background: 'rgba(212,163,13,0.1)', border: '1px solid #d4a30d', display: 'flex', gap: 16, alignItems: 'center' }}><Users color="#d4a30d" size={20}/> <b>Candidaturas</b></div>
          <div style={{ padding: '16px 24px', opacity: 0.4, display: 'flex', gap: 16, alignItems: 'center' }}><MapPin size={20}/> Unidades de Voto</div>
          <div style={{ padding: '16px 24px', opacity: 0.4, display: 'flex', gap: 16, alignItems: 'center' }}><FileText size={20}/> Mapas Estatísticos</div>
        </nav>
      </aside>

      <main style={styles.main}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 56 }}>
           <div><h1 style={{ fontSize: 32, fontWeight: 900 }}>Gestão Eleitoral 2024</h1><p style={{ opacity: 0.5, marginTop: 8 }}>Moçambique | Secretariado Provincial</p></div>
           <button style={styles.button}><Plus/> REGISTO PRESENCIAL</button>
        </header>

        <div style={{ display: 'flex', gap: 24, marginBottom: 56 }}>
           {[{ label: "REQUISITOS", val: candidates.length, color: "#d4a30d" }, { label: "PENDENTES", val: "1", color: "#f59e0b" }, { label: "VALIDADOS", val: "1", color: "#10b981" }].map((s, i) => (
             <div key={i} style={styles.statCard}><p style={{ fontSize: 10, fontWeight: 900, opacity: 0.4 }}>{s.label}</p><h3 style={{ fontSize: 40, fontWeight: 900, color: s.color }}>{s.val}</h3></div>
           ))}
        </div>

        <div style={styles.card}>
           <h3 style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 18, marginBottom: 32 }}><ShieldCheck color="#10b981"/> Base de Dados MMV - Sofala</h3>
           <table style={styles.table}>
              <thead>
                 <tr><th style={styles.th}>Nome Completo</th><th style={styles.th}>NUIT / BI Oficial</th><th style={styles.th}>Distrito</th><th style={styles.th}>Estado</th><th style={styles.th}>Acção</th></tr>
              </thead>
              <tbody>
                 {candidates.map(c => (
                    <tr key={c.id}>
                       <td style={styles.td}><b>{c.nome}</b></td>
                       <td style={styles.td}><span style={{ opacity: 0.5, fontFamily: 'monospace' }}>{c.nuit}</span></td>
                       <td style={styles.td}><span style={{ background: 'rgba(255,255,255,0.05)', padding: '4px 12px', borderRadius: 20, fontSize: 11 }}>{c.distrito.toUpperCase()}</span></td>
                       <td style={styles.td}><span style={{ color: c.status === 'APROVADO' ? '#10b981' : '#f59e0b', fontSize: 11, fontWeight: 900 }}>{c.status}</span></td>
                       <td style={styles.td}><button style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid #10b981', color: '#10b981', padding: '6px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 11, fontWeight: 700 }}>ANALISAR</button></td>
                    </tr>
                 ))}
              </tbody>
           </table>
        </div>
      </main>
    </div>
  );
}
