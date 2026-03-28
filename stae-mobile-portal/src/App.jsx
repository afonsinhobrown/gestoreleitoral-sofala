import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, MapPin, Send, CheckCircle, UploadCloud, BookOpen, 
  Search, QrCode, Camera, Info, Calendar, User, UserCheck, 
  ChevronRight, Award, GraduationCap, Building2, RefreshCw
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const App = () => {
   const [view, setView] = useState('home');
   const [loading, setLoading] = useState(false);
   const [configs, setConfigs] = useState({ categorias: [], provincias: [], processos: [] });
   const [tokenGerador, setTokenGerador] = useState(null);
   const [resultadoConsulta, setResultadoConsulta] = useState(null);
   const [tokenBusca, setTokenBusca] = useState('');

   const [submeterForm, setSubmeterForm] = useState({
      primeiro_nome: '', apelido: '', nuit: '', bi_numero: '', contacto_principal: '',
      email: '', genero: 'Masculino', categoria_id: '', processo_id: '',
      provincia_actuacao_id: '', distrito_actuacao_id: '', posto_actuacao_id: '',
      localidade_actuacao_id: '', documento_bi: null, documento_certificado: null,
      observacoes: ''
   });

   const [geoData, setGeoData] = useState({ distritos: [], postos: [], localidades: [] });

   useEffect(() => { carregarConfigs(); }, []);

   const carregarConfigs = async () => {
      try {
         const [catRes, provRes, procRes] = await Promise.all([
            fetch(`${API_URL}/api/config/categorias`).then(r => r.json()),
            fetch(`${API_URL}/api/config/provincias`).then(r => r.json()),
            fetch(`${API_URL}/api/config/processos`).then(r => r.json())
         ]);
         setConfigs({
            categorias: catRes.categorias || [],
            provincias: provRes.provincias || [],
            processos: procRes.processos || []
         });
      } catch (error) { console.error('Erro ao carregar configurações:', error); }
   };

   const handleConsultar = async (tokenOverride = null) => {
      const token = (tokenOverride || tokenBusca).trim().toUpperCase();
      if (!token) return;
      setLoading(true);
      try {
         const res = await fetch(`${API_URL}/api/public/consultar/${token}`);
         if (res.ok) {
            const data = await res.json();
            setResultadoConsulta(data.dado);
            setView('dashboard');
         } else {
            alert('Código ou Token não encontrado.');
         }
      } catch (err) { alert('Erro na consulta'); }
      finally { setLoading(false); }
   };

   const handleSubmeterCandidatura = async (e) => {
      e.preventDefault();
      if (!submeterForm.documento_bi || !submeterForm.documento_certificado) {
         alert('Por favor, carregue todos os documentos obrigatórios'); return;
      }
      setLoading(true);
      try {
         const formData = new FormData();
         Object.keys(submeterForm).forEach(key => {
            if (submeterForm[key]) formData.append(key, submeterForm[key]);
         });
         formData.append('nome_completo', `${submeterForm.primeiro_nome} ${submeterForm.apelido}`);

         const response = await fetch(`${API_URL}/api/candidaturas/completa`, { method: 'POST', body: formData });
         if (response.ok) {
            const data = await response.json();
            setTokenGerador(data.candidatura);
            setView('sucesso');
         } else {
            const errorData = await response.json();
            alert(`Erro: ${errorData.error || 'Não foi possível submeter'}`);
         }
      } catch (error) { console.error('Erro ao submeter:', error); }
      finally { setLoading(false); }
   };

   return (
      <div style={styles.app}>
         <AnimatePresence mode="wait">
            {view === 'home' && <HomeView key="home" setView={setView} />}
            {view === 'formulario' && (
               <FormularioView 
                  key="form"
                  setView={setView} 
                  submeterForm={submeterForm} 
                  setSubmeterForm={setSubmeterForm} 
                  handleSubmeterCandidatura={handleSubmeterCandidatura}
                  configs={configs} loading={loading} geoData={geoData} setGeoData={setGeoData} API_URL={API_URL}
               />
            )}
            {view === 'informacoes' && <InformacoesView key="info" setView={setView} />}
            {view === 'consulta' && (
               <ConsultaView 
                  key="consulta"
                  setView={setView} 
                  tokenBusca={tokenBusca} 
                  setTokenBusca={setTokenBusca} 
                  handleConsultar={handleConsultar} 
                  loading={loading}
               />
            )}
            {view === 'dashboard' && <DashboardView key="dash" setView={setView} data={resultadoConsulta} />}
            {view === 'sucesso' && <SucessoView key="sucesso" setView={setView} data={tokenGerador} />}
         </AnimatePresence>
      </div>
   );
};

// ================== VISTAS ==================

const HomeView = ({ setView }) => (
   <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} style={styles.container}>
      <div style={styles.header}>
         <img src="/logo_stae.svg" alt="STAE Logo" style={styles.logo} />
         <h1 style={styles.title}>STAE SOFALA</h1>
         <p style={styles.subtitle}>Portal do Eleitor - 2026</p>
      </div>

      <div style={styles.cardGrid}>
         <button style={styles.card} onClick={() => setView('formulario')}>
            <div style={styles.cardIcon}><FileText size={24} /></div>
            <div style={{ textAlign: 'left' }}>
               <h3 style={styles.cardTitle}>Submeter Candidatura</h3>
               <p style={styles.cardDescription}>Inscreva-se como MMV ou Brigadista.</p>
            </div>
         </button>

         <button style={styles.card} onClick={() => setView('informacoes')}>
            <div style={{ ...styles.cardIcon, color: '#38bdf8', backgroundColor: '#38bdf820' }}><Info size={24} /></div>
            <div style={{ textAlign: 'left' }}>
               <h3 style={styles.cardTitle}>Informações</h3>
               <p style={styles.cardDescription}>Concursos, Despachos e Planos</p>
            </div>
         </button>

         <button style={styles.card} onClick={() => setView('consulta')}>
            <div style={{ ...styles.cardIcon, color: '#10b981', backgroundColor: '#10b98120' }}><QrCode size={24} /></div>
            <div style={{ textAlign: 'left' }}>
               <h3 style={styles.cardTitle}>Consultar Status</h3>
               <p style={styles.cardDescription}>Busca por QR Code ou Token</p>
            </div>
         </button>
      </div>

      <div style={styles.footer}>
         <p style={styles.footerText}>Secretariado Técnico de Administração Eleitoral</p>
         <p style={styles.footerSubtext}>Moçambique - Província de Sofala</p>
      </div>
   </motion.div>
);

const InformacoesView = ({ setView }) => (
   <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} style={styles.container}>
      <button style={styles.backButton} onClick={() => setView('home')}>← Voltar</button>
      <h2 style={styles.formTitle}>Central de Informações</h2>
      
      <div style={styles.infoList}>
         {[
            { t: 'Concursos Públicos 2026', d: 'Editais abertos para recrutamento de agentes eleitorais.', icon: <Award /> },
            { t: 'Despachos Normativos', d: 'Regulamentos de contratação e formação técnica.', icon: <FileText /> },
            { t: 'Planos de Actividades', d: 'Calendário operacional para o ciclo eleitoral.', icon: <Calendar /> },
            { t: 'Requisitos de Candidatura', d: 'Documentação necessária para cada categoria.', icon: <CheckCircle /> }
         ].map((item, i) => (
            <div key={i} style={styles.infoItem}>
               <div style={styles.infoIcon}>{item.icon}</div>
               <div style={{ flex: 1 }}>
                  <h4 style={{ margin: '0 0 5px 0' }}>{item.t}</h4>
                  <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8' }}>{item.d}</p>
               </div>
               <ChevronRight size={18} color="#475569" />
            </div>
         ))}
      </div>
   </motion.div>
);

const ConsultaView = ({ setView, tokenBusca, setTokenBusca, handleConsultar, loading }) => (
   <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} style={styles.container}>
      <button style={styles.backButton} onClick={() => setView('home')}>← Voltar</button>
      <h2 style={styles.formTitle}>Consultar Status</h2>
      <p style={{ color: '#94a3b8', marginBottom: '25px' }}>Introduza o token de 6 dígitos ou use a camera.</p>

      <div style={styles.formSection}>
         <label style={styles.label}>Token de Acesso</label>
         <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
            <input 
               type="text" 
               placeholder="EX: X2F8K9" 
               style={{ ...styles.input, flex: 1, textAlign: 'center', letterSpacing: '4px', textTransform: 'uppercase' }} 
               value={tokenBusca}
               onChange={(e) => setTokenBusca(e.target.value.toUpperCase())}
               maxLength={10}
            />
            <button style={{ ...styles.primaryButton, width: '60px', marginTop: 0 }} onClick={() => handleConsultar()}>
               {loading ? <RefreshCw className="animate-spin" size={20} /> : <Search size={20} />}
            </button>
         </div>

         <div style={styles.qrPlaceholder} onClick={() => alert('Abrindo camera para scan...')}>
            <Camera size={40} color="#64748b" />
            <p style={{ margin: '10px 0 0 0', fontSize: '14px', color: '#64748b' }}>Digitalizar Código QR</p>
         </div>
      </div>

      <div style={{ marginTop: '20px' }}>
          <label style={styles.label}>Ou carregar imagem do QR</label>
          <input type="file" style={styles.fileInput} accept="image/*" />
      </div>
   </motion.div>
);

const DashboardView = ({ setView, data }) => (
   <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} style={styles.container}>
      <button style={styles.backButton} onClick={() => setView('home')}>← Sair</button>
      
      <div style={styles.dashHeader}>
         <div style={styles.userCircle}><User size={30} color="#d4a30d" /></div>
         <div>
            <h2 style={{ margin: 0, fontSize: '20px' }}>{data.nome_completo}</h2>
            <p style={{ margin: 0, color: '#94a3b8', fontSize: '14px' }}>Token: {data.token_acesso}</p>
         </div>
      </div>

      <div style={styles.grid2}>
         <div style={styles.statCard}>
            <UserCheck size={20} color="#d4a30d" />
            <span style={styles.statLabel}>Status Candidatura</span>
            <div style={{ 
               ...styles.badge, 
               backgroundColor: data.estado_geral === 'aprovado' ? '#10b98120' : '#f59e0b20', 
               color: data.estado_geral === 'aprovado' ? '#10b981' : '#f59e0b' 
            }}>
               {(data.estado_geral || 'pendente').toUpperCase()}
            </div>
         </div>
         <div style={styles.statCard}>
            <GraduationCap size={20} color="#d4a30d" />
            <span style={styles.statLabel}>Categoria</span>
            <span style={styles.statVal}>{data.categoria_nome}</span>
         </div>
      </div>

      {data.turma_nome && (
         <div style={styles.formSection}>
            <h3 style={styles.sectionHeading}><GraduationCap size={16} /> Formação Técnica</h3>
            <div style={styles.infoRow}><span>Turma:</span> <strong>{data.turma_nome}</strong></div>
            <div style={styles.infoRow}><span>Horário:</span> <strong>{data.turma_horario}</strong></div>
            <div style={styles.infoRow}><span>Local:</span> <strong>{data.centro_formacao}</strong></div>
         </div>
      )}

      {data.brigada_nome && (
         <div style={{ ...styles.formSection, borderColor: '#10b981' }}>
            <h3 style={{ ...styles.sectionHeading, color: '#10b981' }}><Building2 size={16} /> Alocação Operacional</h3>
            <div style={styles.infoRow}><span>Brigada:</span> <strong>{data.brigada_nome}</strong></div>
            <div style={styles.infoRow}><span>Local de Trabalho:</span> <strong>{data.brigada_local}</strong></div>
         </div>
      )}

      <div style={{ ...styles.formSection, marginTop: '20px', backgroundColor: '#1e293b20' }}>
         <h3 style={styles.sectionHeading}><Info size={16} /> Resumo Institucional</h3>
         <p style={{ fontSize: '14px', color: '#94a3b8', lineHeight: '1.5' }}>
            O STAE Sofala garante a transparência do processo eleitoral 2026. 
            Mantenha este token seguro para futuras consultas.
         </p>
      </div>

      <button style={{ ...styles.primaryButton, backgroundColor: '#334155', color: 'white' }} onClick={() => setView('home')}>
         Concluir Consulta
      </button>
   </motion.div>
);

const FormularioView = ({ setView, submeterForm, setSubmeterForm, handleSubmeterCandidatura, configs, loading, geoData, setGeoData, API_URL }) => {
   const [scanning, setScanning] = React.useState(false);
   const [scanResult, setScanResult] = React.useState(null);

   const handleFileScan = async (file, campo) => {
      const nomeCompleto = `${submeterForm.primeiro_nome} ${submeterForm.apelido}`;
      if (!submeterForm.primeiro_nome || !submeterForm.apelido) {
         alert('⚠️ Por favor, preencha o seu NOME e APELIDO primeiro para validação do documento.');
         return;
      }
      setScanning(true);
      const fd = new FormData();
      fd.append('documento', file);
      fd.append('nome_esperado', nomeCompleto);

      try {
         const res = await fetch(`${API_URL}/api/scan-document`, { method: 'POST', body: fd });
         const data = await res.json();
         if (!res.ok) {
            alert(data.error);
            const input = document.getElementById(campo + '_input');
            if (input) input.value = '';
            setSubmeterForm(prev => ({ ...prev, [campo]: null }));
         } else {
            setScanResult({ ...data.extraidos, tipo: campo });
            setSubmeterForm(prev => ({ ...prev, [campo]: file }));
         }
      } catch (e) { alert('Erro na conexão com o Scanner IA.'); }
      finally { setScanning(false); }
   };

   const assumirDadosIA = () => {
      if (!scanResult) return;
      setSubmeterForm(prev => ({
         ...prev,
         bi_numero: scanResult.bi_numero || prev.bi_numero,
         nuit: scanResult.nuit || prev.nuit
      }));
      setScanResult(null);
      alert('✅ Dados da IA assumidos no formulário!');
   };

   const handleProvinciaChange = async (provId) => {
      setSubmeterForm(prev => ({ ...prev, provincia_actuacao_id: provId, distrito_actuacao_id: '', posto_actuacao_id: '', localidade_actuacao_id: '' }));
      if (!provId) {
         setGeoData(prev => ({ ...prev, distritos: [], postos: [], localidades: [] }));
         return;
      }
      try {
         console.log(`📡 Carregando distritos para província: ${provId}`);
         const res = await fetch(`${API_URL}/api/config/distritos/${provId}`);
         const data = await res.json();
         setGeoData(prev => ({ ...prev, distritos: data.distritos || [], postos: [], localidades: [] }));
      } catch (err) { console.error('Erro ao carregar distritos:', err); }
   };

   const handleDistritoChange = async (distId) => {
      setSubmeterForm(prev => ({ ...prev, distrito_actuacao_id: distId, posto_actuacao_id: '', localidade_actuacao_id: '' }));
      if (!distId) {
         setGeoData(prev => ({ ...prev, postos: [], localidades: [] }));
         return;
      }
      try {
         console.log(`📡 Carregando postos para distrito: ${distId}`);
         const res = await fetch(`${API_URL}/api/config/postos/${distId}`);
         const data = await res.json();
         setGeoData(prev => ({ ...prev, postos: data.postos || [], localidades: [] }));
      } catch (err) { console.error('Erro ao carregar postos:', err); }
   };

   const handlePostoChange = async (postoId) => {
      setSubmeterForm(prev => ({ ...prev, posto_actuacao_id: postoId, localidade_actuacao_id: '' }));
      if (!postoId) return;
      try {
         const res = await fetch(`${API_URL}/api/config/localidades/${postoId}`);
         const data = await res.json();
         setGeoData(prev => ({ ...prev, localidades: data.localidades || [] }));
      } catch (err) { console.error('Erro:', err); }
   };

   return (
      <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} style={styles.container}>
         <button style={styles.backButton} onClick={() => setView('home')}>← Voltar</button>
         <div style={styles.formContainer}>
            <h2 style={styles.formTitle}>Submeter Candidatura</h2>
            <form onSubmit={handleSubmeterCandidatura}>
               <div style={styles.formSection}>
                  <h3 style={styles.sectionHeading}>Identificação</h3>
                  <div style={styles.row}>
                     <input type="text" placeholder="Nome" style={styles.input} value={submeterForm.primeiro_nome} onChange={(e) => setSubmeterForm({ ...submeterForm, primeiro_nome: e.target.value })} required />
                     <input type="text" placeholder="Apelido" style={styles.input} value={submeterForm.apelido} onChange={(e) => setSubmeterForm({ ...submeterForm, apelido: e.target.value })} required />
                  </div>
                  <input type="text" placeholder="Nº de BI" style={{ ...styles.input, marginTop: '12px' }} value={submeterForm.bi_numero} onChange={(e) => setSubmeterForm({ ...submeterForm, bi_numero: e.target.value })} required />
                  <input type="tel" placeholder="Contacto Principal" style={{ ...styles.input, marginTop: '12px' }} value={submeterForm.contacto_principal} onChange={(e) => setSubmeterForm({ ...submeterForm, contacto_principal: e.target.value })} required />
               </div>

               <div style={styles.formSection}>
                  <h3 style={styles.sectionHeading}>Vaga e Local</h3>
                  <select style={styles.input} value={submeterForm.categoria_id} onChange={(e) => setSubmeterForm({ ...submeterForm, categoria_id: e.target.value })} required>
                     <option value="">Categoria Pretendida</option>
                     {configs.categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                  <select style={{ ...styles.input, marginTop: '12px' }} value={submeterForm.provincia_actuacao_id} onChange={(e) => handleProvinciaChange(e.target.value)} required>
                     <option value="">Província</option>
                     {configs.provincias.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                  </select>
                  <select style={{ ...styles.input, marginTop: '12px' }} value={submeterForm.distrito_actuacao_id} onChange={(e) => handleDistritoChange(e.target.value)} required disabled={!submeterForm.provincia_actuacao_id}>
                     <option value="">Distrito</option>
                     {geoData.distritos.map(d => <option key={d.id} value={d.id}>{d.nome}</option>)}
                  </select>
               </div>

               <div style={styles.formSection}>
                  <h3 style={styles.sectionHeading}>Documentação</h3>
                  <label style={styles.label}>Cópia Transparente de BI (Scanner IA Activo)</label>
                  <input 
                    id="documento_bi_input"
                    type="file" 
                    style={styles.fileInput} 
                    accept="image/*,.pdf" 
                    onChange={(e) => handleFileScan(e.target.files[0], 'documento_bi')} 
                    required 
                  />

                  {scanning && (
                    <div style={{ padding: '10px', backgroundColor: '#d4a30d20', borderRadius: '8px', marginTop: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                       <RefreshCw size={16} className="animate-spin" color="#d4a30d" />
                       <span style={{ fontSize: '13px', color: '#d4a30d' }}>IA está a validar o seu documento...</span>
                    </div>
                  )}

                  {scanResult && (
                    <div style={{ marginTop: '15px', padding: '15px', backgroundColor: '#10b98115', border: '1px solid #10b981', borderRadius: '10px' }}>
                       <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#10b981' }}>📊 Dados Detectados pela IA</h4>
                       <table style={{ width: '100%', fontSize: '12px', color: '#94a3b8' }}>
                          <tbody>
                             {scanResult.bi_numero && <tr><td>BI:</td><td><strong>{scanResult.bi_numero}</strong></td></tr>}
                             {scanResult.nuit && <tr><td>NUIT:</td><td><strong>{scanResult.nuit}</strong></td></tr>}
                          </tbody>
                       </table>
                       <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                          <button type="button" onClick={assumirDadosIA} style={{ ...styles.primaryButton, padding: '5px 10px', fontSize: '12px', flex: 1, backgroundColor: '#10b981' }}>Assumir Dados</button>
                          <button type="button" onClick={() => setScanResult(null)} style={{ ...styles.primaryButton, backgroundColor: '#334155', padding: '5px 10px', fontSize: '12px', flex: 1 }}>Manter os meus</button>
                       </div>
                    </div>
                  )}

                  <label style={{ ...styles.label, marginTop: '15px' }}>Certificado de Habilitações</label>
                  <input type="file" style={styles.fileInput} accept="image/*,.pdf" onChange={(e) => setSubmeterForm({ ...submeterForm, documento_certificado: e.target.files[0] })} required />
               </div>

               <button type="submit" style={styles.primaryButton} disabled={loading}>{loading ? <RefreshCw className="animate-spin" /> : 'Submeter Candidatura'}</button>
            </form>
         </div>
      </motion.div>
   );
};

const SucessoView = ({ setView, data }) => (
   <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} style={styles.container}>
      <div style={{ ...styles.formContainer, textAlign: 'center', padding: '10px 30px' }}>
         <CheckCircle size={60} color="#10b981" style={{ margin: '0 auto 15px auto' }} />
         <h2 style={{ ...styles.formTitle, marginBottom: '10px' }}>Submetido com Sucesso!</h2>
         <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '20px' }}>Guarde o seu token de consulta para ver os resultados.</p>
         
         <div style={styles.tokenBox}>
            <span style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '5px' }}>SEU TOKEN EXCLUSIVO</span>
            <span style={{ fontSize: '32px', fontWeight: 'bold', color: '#d4a30d', letterSpacing: '8px' }}>{data?.token_acesso || 'XXXXXX'}</span>
         </div>

         <div style={styles.qrSuccessBox}>
            <QrCode size={120} color="#0f172a" />
            <p style={{ fontSize: '12px', marginTop: '10px', color: '#64748b' }}>STAE-QR-{data?.token_acesso}</p>
         </div>

         <p style={{ fontSize: '14px', color: '#475569', marginBottom: '20px' }}>
            Poderá usar este código na opção "Consultar Status" do portal.
         </p>

         <button style={{ ...styles.primaryButton, width: 'auto', padding: '12px 30px' }} onClick={() => setView('home')}>
            Regressar ao Início
         </button>
      </div>
   </motion.div>
);

// ================== ESTILOS ==================
const styles = {
   app: { minHeight: '100vh', backgroundColor: '#0f172a', color: 'white', fontFamily: '"Inter", sans-serif' },
   container: { maxWidth: '500px', margin: '0 auto', padding: '30px 20px' },
   header: { textAlign: 'center', marginBottom: '35px' },
   logo: { width: '70px', marginBottom: '15px' },
   title: { fontSize: '26px', fontWeight: 'bold', color: '#d4a30d', margin: '0 0 5px 0' },
   subtitle: { fontSize: '15px', color: '#94a3b8', margin: 0 },
   cardGrid: { display: 'grid', gridTemplateColumns: '1fr', gap: '12px' },
   card: { backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '20px', display: 'flex', alignItems: 'center', gap: '15px', cursor: 'pointer', textAlign: 'left', color: 'white' },
   cardIcon: { width: '45px', height: '45px', backgroundColor: '#d4a30d20', color: '#d4a30d', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
   cardTitle: { fontSize: '17px', fontWeight: '600', margin: '0 0 3px 0' },
   cardDescription: { fontSize: '13px', color: '#94a3b8', margin: 0 },
   footer: { marginTop: '40px', textAlign: 'center', borderTop: '1px solid #1e293b', paddingTop: '15px' },
   footerText: { fontSize: '13px', color: '#64748b', margin: '0 0 3px 0' },
   footerSubtext: { fontSize: '11px', color: '#475569', margin: 0 },
   backButton: { background: 'none', border: 'none', color: '#d4a30d', fontSize: '15px', cursor: 'pointer', marginBottom: '15px' },
   formContainer: { backgroundColor: '#1e293b', padding: '25px', borderRadius: '14px', border: '1px solid #334155' },
   formTitle: { fontSize: '22px', fontWeight: 'bold', margin: '0 0 20px 0' },
   formSection: { marginBottom: '15px', padding: '15px', backgroundColor: '#0f172a', borderRadius: '10px', border: '1px solid #334155' },
   sectionHeading: { fontSize: '14px', color: '#d4a30d', marginBottom: '12px', marginTop: 0, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '8px' },
   formGroup: { marginBottom: '12px' },
   row: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' },
   label: { display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '6px' },
   input: { width: '100%', padding: '12px', backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: 'white', fontSize: '15px', boxSizing: 'border-box' },
   primaryButton: { width: '100%', padding: '14px', backgroundColor: '#d4a30d', color: '#000', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px' },
   fileInput: { width: '100%', padding: '10px', backgroundColor: '#1e293b', border: '1px dashed #475569', borderRadius: '8px', color: '#94a3b8', fontSize: '13px' },
   infoList: { display: 'flex', flexDirection: 'column', gap: '10px' },
   infoItem: { display: 'flex', alignItems: 'center', gap: '12px', padding: '15px', backgroundColor: '#1e293b', borderRadius: '10px', border: '1px solid #334155' },
   infoIcon: { width: '35px', height: '35px', color: '#d4a30d', display: 'flex', alignItems: 'center' },
   qrPlaceholder: { border: '2px dashed #334155', borderRadius: '12px', padding: '30px', textAlign: 'center', cursor: 'pointer', margin: '15px 0' },
   dashHeader: { display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px', padding: '15px', backgroundColor: '#d4a30d10', borderRadius: '12px', border: '1px solid #d4a30d20' },
   userCircle: { width: '50px', height: '50px', backgroundColor: '#d4a30d20', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' },
   grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '15px' },
   statCard: { backgroundColor: '#1e293b', padding: '15px', borderRadius: '12px', border: '1px solid #334155', display: 'flex', flexDirection: 'column', gap: '5px' },
   statLabel: { fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase' },
   statVal: { fontSize: '14px', fontWeight: 'bold' },
   badge: { display: 'inline-block', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', alignSelf: 'flex-start' },
   infoRow: { display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #1e293b20', fontSize: '14px' },
   tokenBox: { backgroundColor: '#0f172a', padding: '15px', borderRadius: '10px', border: '1px solid #334155', marginBottom: '20px' },
   qrSuccessBox: { padding: '20px', backgroundColor: 'white', borderRadius: '12px', display: 'inline-block', marginBottom: '20px' }
};

export default App;
