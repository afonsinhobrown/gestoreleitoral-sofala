import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  MapPin, 
  CheckCircle, 
  Search, 
  Filter,
  Check,
  XCircle,
  Award,
  Bell,
  Plus,
  ArrowRight,
  ShieldCheck,
  FileText
} from 'lucide-react';

// API DINÂMICA (STAE ADMIN PRODUÇÃO)
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function App() {
  const [view, setView] = useState('dashboard');
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterDistrito, setFilterDistrito] = useState('Todos');

  useEffect(() => {
    fetchCandidates();
  }, []);

  const fetchCandidates = async () => {
    try {
      // No mundo real, aqui buscaríamos os dados da API
      const res = await fetch(`${API_URL}/admin/candidates`);
      const data = await res.json();
      setCandidates(data.length > 0 ? data : [
        { id: 1, nome: "Afonso Alexandre Pene", nuit: "110100557622Q", distrito: "Beira", status: "Pendente", data: "2024-03-20" },
        { id: 2, nome: "Gilberto Machava", nuit: "123456789", distrito: "Dondo", status: "Aprovado", data: "2024-03-19" }
      ]);
    } catch {
       // Fallback para demonstração se a API ainda não estiver live
       setCandidates([
        { id: 1, nome: "Afonso Alexandre Pene", nuit: "110100557622Q", distrito: "Beira", status: "Pendente", data: "2024-03-20" },
        { id: 2, nome: "Gilberto Machava", nuit: "123456789", distrito: "Dondo", status: "Aprovado", data: "2024-03-19" }
       ]);
    } finally { setLoading(false); }
  };

  return (
    <div className="flex bg-slate-950 text-white min-h-screen font-sans">
      {/* SIDEBAR STAE */}
      <aside className="w-64 border-r border-slate-800 p-6 flex flex-col gap-8 bg-slate-900/40">
        <div>
          <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/1/17/Coat_of_arms_of_Mozambique.svg/1200px-Coat_of_arms_of_Mozambique.svg.png" width="50" className="mb-4" />
          <h2 className="text-xl font-bold gold-gradient-text">STAE NACIONAL</h2>
          <p className="text-xs opacity-40 uppercase tracking-widest">Painel Administrativo</p>
        </div>

        <nav className="flex flex-col gap-2">
          <button className="flex items-center gap-3 p-3 bg-slate-900 rounded-xl text-amber-500 font-bold border border-amber-900/30">
            <Users size={20}/> Candidaturas
          </button>
          <button className="flex items-center gap-3 p-3 hover:bg-slate-900 opacity-60 rounded-xl transition-all">
             <MapPin size={20}/> Postos de Recenseamento
          </button>
          <button className="flex items-center gap-3 p-3 hover:bg-slate-900 opacity-60 rounded-xl transition-all">
             <FileText size={20}/> Mapas e Relatórios
          </button>
        </nav>
      </aside>

      {/* PAINEL CENTRAL */}
      <main className="flex-1 p-10 overflow-y-auto">
        <header className="flex justify-between items-center mb-12">
           <div>
              <h1 className="text-3xl font-bold">Direcção Provincial de Sofala</h1>
              <p className="opacity-40">Gestão de MMVs e Brigadistas - Eleições 2024</p>
           </div>
           <button 
             onClick={() => alert('Abrindo Scanner no Balcão Administrativo...')}
             className="bg-emerald-600 hover:bg-emerald-500 px-6 py-3 rounded-xl flex items-center gap-3 shadow-lg shadow-emerald-900/20 transition-all font-bold"
           >
              <Plus size={20}/> Registo no Balcão
           </button>
        </header>

        {/* ESTATÍSTICAS */}
        <div className="grid grid-cols-4 gap-6 mb-12">
           {[ 
             { label: "Total Recenseados", val: candidates.length, icon: Users, color: "text-blue-400" },
             { label: "Aguardando Visto", val: "2", icon: Bell, color: "text-amber-400" },
             { label: "Aprovados", val: "1", icon: CheckCircle, color: "text-emerald-400" },
             { label: "Cidades Ativas", val: "4", icon: MapPin, color: "text-indigo-400" }
           ].map((s, i) => (
             <div key={i} className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl hover:border-slate-700 transition-all">
                <div className="flex justify-between items-center mb-4">
                   <p className="text-xs opacity-40 uppercase tracking-wider">{s.label}</p>
                   <s.icon size={16} className={s.color}/>
                </div>
                <h3 className="text-3xl font-bold">{s.val}</h3>
             </div>
           ))}
        </div>

        {/* LISTA GERAL NACIONAL */}
        <section className="bg-slate-900/30 border border-slate-800 rounded-3xl overflow-hidden backdrop-blur-sm">
           <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
              <h3 className="text-lg font-bold flex items-center gap-3">
                 <ShieldCheck className="text-emerald-500" size={24}/> Candidaturas Recentes (Sofala)
              </h3>
              <select className="bg-slate-950 border border-slate-800 px-4 py-2 rounded-lg text-sm outline-none text-var(--stae-gold)">
                 <option>Todos os Distritos</option>
                 <option>Beira</option>
                 <option>Dondo</option>
                 <option>Nhamatanda</option>
              </select>
           </div>

           <table className="w-full text-left">
              <thead>
                 <tr className="text-xs uppercase opacity-40 border-b border-slate-800 bg-slate-900/10">
                    <th className="p-6">Titular</th>
                    <th className="p-6">NUIT Oficial</th>
                    <th className="p-6">Distrito / Local</th>
                    <th className="p-6">Estado</th>
                    <th className="p-6">Ação</th>
                 </tr>
              </thead>
              <tbody>
                 {candidates.map(c => (
                    <tr key={c.id} className="border-b border-slate-800/50 hover:bg-white/5 transition-all">
                       <td className="p-6 font-medium text-slate-200">{c.nome}</td>
                       <td className="p-6 text-sm font-mono opacity-50 tracking-tighter">{c.nuit}</td>
                       <td className="p-6"><span className="bg-slate-800 px-3 py-1 rounded-full text-[10px] uppercase font-bold tracking-wider">{c.distrito}</span></td>
                       <td className="p-6">
                          <span className={`text-[10px] uppercase font-black px-3 py-1 rounded-full ${c.status === 'Aprovado' ? 'bg-emerald-900/30 text-emerald-400' : 'bg-amber-900/30 text-amber-400'}`}>
                             {c.status}
                          </span>
                       </td>
                       <td className="p-6">
                          <div className="flex gap-2">
                             <button className="p-2 bg-emerald-600/20 text-emerald-500 hover:bg-emerald-600 hover:text-white rounded-lg transition-all">
                                <Check size={18}/>
                             </button>
                             <button className="p-2 bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-all">
                                <FileText size={18}/>
                             </button>
                          </div>
                       </td>
                    </tr>
                 ))}
              </tbody>
           </table>
        </section>
      </main>
    </div>
  );
}
