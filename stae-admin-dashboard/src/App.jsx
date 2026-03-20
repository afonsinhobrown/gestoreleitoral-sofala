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
  ClipboardCheck,
  Globe,
  LogOut
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'https://staeapi-sofala.onrender.com';

const styles = {
  container: { display: 'flex', background: 'radial-gradient(circle at top left, #001f42, #000)', color: '#fff', minHeight: '100vh', fontFamily: '"Inter", sans-serif' },
  sidebar: { width: '300px', borderRight: '1px solid rgba(255,255,255,0.1)', padding: '40px 24px', display: 'flex', flexDirection: 'column', gap: '30px', background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(20px)' },
  main: { flex: 1, padding: '40px 60px', overflowY: 'auto' },
  card: { background: 'rgba(255,255,255,0.03)', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.08)', padding: '24px', backdropFilter: 'blur(10px)' },
  statCard: { flex: 1, padding: '24px', borderRadius: '16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', gap: '8px' },
  button: { background: 'linear-gradient(135deg, #d4a30d, #b0870b)', color: '#002D62', border: 'none', padding: '12px 24px', borderRadius: '12px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' },
  table: { width: '100%', textAlign: 'left', borderCollapse: 'collapse', marginTop: '20px' },
  th: { padding: '16px', fontSize: '10px', textTransform: 'uppercase', opacity: 0.4, borderBottom: '1px solid rgba(255,255,255,0.1)' },
  td: { padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.03)', fontSize: '13px' }
};

export default function App() {
  const [candidates, setCandidates] = useState([]);

  useEffect(() => {
    // PAUTA OFICIAL NACIONAL 2026
    setCandidates([
      { id: 1, nome: "AFONSO ALEXANDRE PENE", nuit: "110100557622Q", distrito: "BEIRA", posto: "Munhava", localidade: "Ponta-Gêa", role: "MMV", docs: "OK", status: "VALIDADO" },
      { id: 2, nome: "CANDIDATO TESTE NACIONAL", nuit: "123456789", distrito: "DONDO", posto: "Chapa", localidade: "Dondo-Sede", role: "BRIGADISTA", docs: "PENDENTE", status: "PENDENTE" }
    ]);
  }, []);

  return (
    <div style={styles.container}>
      <aside style={styles.sidebar}>
        <div>
          <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/1/17/Coat_of_arms_of_Mozambique.svg/1200px-Coat_of_arms_of_Mozambique.svg.png" width="50" style={{ marginBottom: 20 }}/>
          <h2 style={{ fontSize: 15, fontWeight: 900, background: 'linear-gradient(to right, #d4a30d, #fff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', lineHeight: 1.3 }}>SECRETARIADO TÉCNICO DE ADMINISTRAÇÃO ELEITORAL</h2>
          <p style={{ fontSize: 10, opacity: 0.4, letterSpacing: 1, fontWeight: 700, marginTop: 10 }}>GESTÃO PROVINCIAL DE SOFALA</p>
        </div>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ ...styles.card, background: 'rgba(212,163,13,0.1)', border: '1px solid #d4a30d', display: 'flex', gap: 16, alignItems: 'center' }}><Users color="#d4a30d" size={18}/> <b>Candidaturas Online</b></div>
          <div style={{ padding: '12px 20px', opacity: 0.4, display: 'flex', gap: 16, alignItems: 'center' }}><Globe size={18}/> Divisão Geográfica</div>
          <div style={{ padding: '12px 20px', opacity: 0.4, display: 'flex', gap: 16, alignItems: 'center' }}><FileText size={18}/> Relatórios 2026</div>
        </nav>
        <button style={{ marginTop: 'auto', background: 'none', border: 'none', color: '#fff', opacity: 0.5, display: 'flex', gap: 12, alignItems: 'center' }}><LogOut size={16}/> Sair do Sistema</button>
      </aside>

      <main style={styles.main}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40 }}>
           <div><h1 style={{ fontSize: 26, fontWeight: 900 }}>Processo Eleitoral 2026</h1><p style={{ opacity: 0.5, marginTop: 4 }}>Monitoria de Candidaturas, Habilitações e Perfis Oficiais</p></div>
           <button style={styles.button}><Plus/> REGISTO PRESENCIAL</button>
        </header>

        <div style={{ display: 'flex', gap: 20, marginBottom: 40 }}>
           {[{ l: "MMV REGISTADOS", v: "1" }, { l: "BRIGADISTAS", v: "1" }, { l: "CERTIFICADOS OK", v: "1" }, { l: "VALIDADOS", v: "1" }].map((s, i) => (
             <div key={i} style={styles.statCard}><p style={{ fontSize: 10, fontWeight: 900, opacity: 0.4 }}>{s.l}</p><h3 style={{ fontSize: 28, fontWeight: 900, color: '#d4a30d' }}>{s.v}</h3></div>
           ))}
        </div>

        <div style={styles.card}>
           <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 16 }}><ClipboardCheck color="#10b981"/> Lista de Candidaturas Registadas</h3>
              <div style={{ padding: '8px 16px', borderRadius: 8, background: 'rgba(255,255,255,0.05)', fontSize: 12 }}>PROCESSO EM TEMPO REAL</div>
           </div>
           
           <table style={styles.table}>
              <thead>
                 <tr><th style={styles.th}>Nome Titular</th><th style={styles.th}>Tipo Candidatura</th><th style={styles.th}>Distrito/Posto</th><th style={styles.th}>Certificado</th><th style={styles.th}>Estado</th><th style={styles.th}>Inspecção</th></tr>
              </thead>
              <tbody>
                 {candidates.map(c => (
                    <tr key={c.id}>
                       <td style={styles.td}><b>{c.nome}</b><p style={{ fontSize: 10, opacity: 0.4 }}>Identificação: {c.nuit}</p></td>
                       <td style={styles.td}><span style={{ color: '#d4a30d', fontWeight: 800, fontSize: 11 }}>{c.role}</span></td>
                       <td style={styles.td}>{c.distrito}<p style={{ fontSize: 10, opacity: 0.4 }}>P.A: {c.posto}</p></td>
                       <td style={styles.td}><span style={{ color: c.docs === 'OK' ? '#10b981' : '#f59e0b', fontSize: 11, fontWeight: 700 }}>{c.docs}</span></td>
                       <td style={styles.td}><span style={{ color: c.status === 'VALIDADO' ? '#10b981' : '#f59e0b', fontSize: 10, fontWeight: 900 }}>{c.status}</span></td>
                       <td style={styles.td}><button style={{ background: 'rgba(212,163,13,0.1)', border: '1px solid #d4a30d', color: '#d4a30d', padding: '6px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 10, fontWeight: 700 }}>AUDITAR</button></td>
                    </tr>
                 ))}
              </tbody>
           </table>
        </div>
      </main>
    </div>
  );
}
