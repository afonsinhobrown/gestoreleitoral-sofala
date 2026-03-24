import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText, MapPin, Send, CheckCircle, UploadCloud, BookOpen } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const App = () => {
   const [view, setView] = useState('home');
   const [loading, setLoading] = useState(false);
   const [configs, setConfigs] = useState({ categorias: [], provincias: [], processos: [] });

   const [submeterForm, setSubmeterForm] = useState({
      nome_completo: '',
      nuit: '',
      bi_numero: '',
      contacto_principal: '',
      email: '',
      genero: 'Masculino',
      categoria_id: '',
      processo_id: '',
      provincia_actuacao_id: '',
      documento_bi: null,
      documento_certificado: null,
      observacoes: ''
   });

   useEffect(() => {
      carregarConfigs();
   }, []);

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
      } catch (error) {
         console.error('Erro ao carregar configurações:', error);
      }
   };

   const handleSubmeterCandidatura = async (e) => {
      e.preventDefault();
      
      if (!submeterForm.documento_bi || !submeterForm.documento_certificado) {
         alert('Por favor, carregue todos os documentos obrigatórios');
         return;
      }

      setLoading(true);
      try {
         const formData = new FormData();
         formData.append('nome_completo', submeterForm.nome_completo);
         formData.append('nuit', submeterForm.nuit);
         formData.append('bi_numero', submeterForm.bi_numero);
         formData.append('contacto_principal', submeterForm.contacto_principal);
         formData.append('email', submeterForm.email);
         formData.append('genero', submeterForm.genero);
         
         formData.append('processo_id', submeterForm.processo_id || (configs.processos[0]?.id || ''));
         formData.append('categoria_id', submeterForm.categoria_id);
         formData.append('provincia_actuacao_id', submeterForm.provincia_actuacao_id);
         formData.append('observacoes', submeterForm.observacoes);
         formData.append('documento_bi', submeterForm.documento_bi);
         formData.append('documento_certificado', submeterForm.documento_certificado);

         const response = await fetch(`${API_URL}/api/candidaturas/completa`, {
            method: 'POST',
            body: formData
         });

         if (response.ok) {
            setView('sucesso');
            setSubmeterForm({
               nome_completo: '', nuit: '', bi_numero: '', contacto_principal: '', email: '', genero: 'Masculino',
               categoria_id: '', processo_id: '', provincia_actuacao_id: '',
               documento_bi: null, documento_certificado: null, observacoes: ''
            });
         } else {
            const errorData = await response.json();
            alert(`Erro: ${errorData.error || 'Não foi possível submeter'}`);
         }
      } catch (error) {
         console.error('Erro ao submeter candidatura:', error);
         alert('Erro na comunicação com o servidor');
      } finally {
         setLoading(false);
      }
   };

   // ================== VIEWS ==================
   const HomeView = () => (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={styles.container}>
         <div style={styles.header}>
            <img src="/logo_stae.svg" alt="STAE Logo" style={styles.logo} />
            <h1 style={styles.title}>STAE SOFALA</h1>
            <p style={styles.subtitle}>Portal do Eleitor - Candidaturas 2026</p>
         </div>

         <div style={styles.cardGrid}>
            <button style={styles.card} onClick={() => setView('formulario')}>
               <div style={styles.cardIcon}>
                  <FileText size={24} />
               </div>
               <h3 style={styles.cardTitle}>Submeter Candidatura</h3>
               <p style={styles.cardDescription}>Inscreva-se como MMV, Brigadista, Formador, etc.</p>
            </button>

            <button style={styles.card} onClick={() => alert('Consulte os editais públicos no portal principal.')}>
               <div style={styles.cardIcon}>
                  <BookOpen size={24} />
               </div>
               <h3 style={styles.cardTitle}>Informações</h3>
               <p style={styles.cardDescription}>Consultar requisitos e despachos</p>
            </button>
         </div>

         <div style={styles.footer}>
            <p style={styles.footerText}>Secretariado Técnico de Administração Eleitoral</p>
            <p style={styles.footerSubtext}>Província de Sofala - 2026</p>
         </div>
      </motion.div>
   );

   const FormularioView = () => (
      <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} style={styles.container}>
         <button style={styles.backButton} onClick={() => setView('home')}>
            ← Voltar
         </button>

         <div style={styles.formContainer}>
            <h2 style={styles.formTitle}>Formulário de Candidatura</h2>
            <p style={{ color: '#94a3b8', marginBottom: '20px' }}>Preencha os seus dados. Receberá atualizações via SMS.</p>
            
            <form onSubmit={handleSubmeterCandidatura}>
               <div style={styles.formSection}>
                  <h3 style={styles.sectionHeading}>Dados Pessoais</h3>
                  <div style={styles.formGroup}>
                     <label style={styles.label}>Nome Completo *</label>
                     <input type="text" style={styles.input} value={submeterForm.nome_completo} onChange={(e) => setSubmeterForm({ ...submeterForm, nome_completo: e.target.value })} required />
                  </div>
                  
                  <div style={styles.row}>
                     <div style={styles.formGroup}>
                        <label style={styles.label}>Número de BI *</label>
                        <input type="text" style={styles.input} value={submeterForm.bi_numero} onChange={(e) => setSubmeterForm({ ...submeterForm, bi_numero: e.target.value })} required />
                     </div>
                     <div style={styles.formGroup}>
                        <label style={styles.label}>NUIT</label>
                        <input type="text" style={styles.input} value={submeterForm.nuit} onChange={(e) => setSubmeterForm({ ...submeterForm, nuit: e.target.value })} />
                     </div>
                  </div>

                  <div style={styles.row}>
                     <div style={styles.formGroup}>
                        <label style={styles.label}>Nº de Telefone (SMS) *</label>
                        <input type="tel" style={styles.input} value={submeterForm.contacto_principal} onChange={(e) => setSubmeterForm({ ...submeterForm, contacto_principal: e.target.value })} required />
                     </div>
                     <div style={styles.formGroup}>
                        <label style={styles.label}>Email</label>
                        <input type="email" style={styles.input} value={submeterForm.email} onChange={(e) => setSubmeterForm({ ...submeterForm, email: e.target.value })} />
                     </div>
                  </div>
                  
                  <div style={styles.formGroup}>
                     <label style={styles.label}>Género *</label>
                     <select style={styles.input} value={submeterForm.genero} onChange={(e) => setSubmeterForm({ ...submeterForm, genero: e.target.value })} required>
                        <option value="Masculino">Masculino</option>
                        <option value="Feminino">Feminino</option>
                     </select>
                  </div>
               </div>

               <div style={styles.formSection}>
                  <h3 style={styles.sectionHeading}>Dados da Vaga</h3>
                  <div style={styles.formGroup}>
                     <label style={styles.label}>Processo Eleitoral *</label>
                     <select style={styles.input} value={submeterForm.processo_id} onChange={(e) => setSubmeterForm({ ...submeterForm, processo_id: e.target.value })} required>
                        <option value="">Selecionar processo</option>
                        {configs.processos.map(p => <option key={p.id} value={p.id}>{p.nome} ({p.ano})</option>)}
                     </select>
                  </div>

                  <div style={styles.formGroup}>
                     <label style={styles.label}>Categoria Pretendida *</label>
                     <select style={styles.input} value={submeterForm.categoria_id} onChange={(e) => setSubmeterForm({ ...submeterForm, categoria_id: e.target.value })} required>
                        <option value="">Selecionar categoria</option>
                        {configs.categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                     </select>
                  </div>

                  <div style={styles.formGroup}>
                     <label style={styles.label}>Província de Actuação *</label>
                     <select style={styles.input} value={submeterForm.provincia_actuacao_id} onChange={(e) => setSubmeterForm({ ...submeterForm, provincia_actuacao_id: e.target.value })} required>
                        <option value="">Selecionar província</option>
                        {configs.provincias.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                     </select>
                  </div>
               </div>

               <div style={styles.formSection}>
                  <h3 style={styles.sectionHeading}>Documentação</h3>
                  <div style={styles.formGroup}>
                     <label style={styles.label}>Cópia do BI (PDF, JPG, PNG) *</label>
                     <input type="file" style={styles.fileInput} accept=".jpg,.jpeg,.png,.pdf" onChange={(e) => setSubmeterForm({ ...submeterForm, documento_bi: e.target.files[0] })} required />
                  </div>

                  <div style={styles.formGroup}>
                     <label style={styles.label}>Certificado Literário (PDF, JPG, PNG) *</label>
                     <input type="file" style={styles.fileInput} accept=".jpg,.jpeg,.png,.pdf" onChange={(e) => setSubmeterForm({ ...submeterForm, documento_certificado: e.target.files[0] })} required />
                  </div>
               </div>

               <button type="submit" style={styles.primaryButton} disabled={loading}>
                  {loading ? 'A processar...' : 'Confirmar e Submeter Candidatura'}
               </button>
            </form>
         </div>
      </motion.div>
   );

   const SucessoView = () => (
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} style={styles.container}>
         <div style={{ ...styles.formContainer, textAlign: 'center', padding: '60px 40px' }}>
            <CheckCircle size={80} color="#10b981" style={{ margin: '0 auto 20px auto' }} />
            <h2 style={styles.formTitle}>Candidatura Submetida!</h2>
            <p style={{ color: '#94a3b8', fontSize: '16px', lineHeight: '1.6', marginBottom: '30px' }}>
               A sua candidatura foi dar entrada no STAE com sucesso.<br/>
               Por favor, aguarde pacificamente. Qualquer decisão ser-lhe-á notificada via SMS.
            </p>
            <button style={{ ...styles.primaryButton, width: 'auto', padding: '12px 30px' }} onClick={() => setView('home')}>
               Voltar ao Início
            </button>
         </div>
      </motion.div>
   );

   return (
      <div style={styles.app}>
         {view === 'home' && <HomeView />}
         {view === 'formulario' && <FormularioView />}
         {view === 'sucesso' && <SucessoView />}
      </div>
   );
};

// ================== ESTILOS ==================
const styles = {
   app: {
      minHeight: '100vh',
      backgroundColor: '#0f172a',
      color: 'white',
      fontFamily: '"Inter", sans-serif'
   },
   container: {
      maxWidth: '600px',
      margin: '0 auto',
      padding: '40px 20px',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column'
   },
   header: {
      textAlign: 'center',
      marginBottom: '40px'
   },
   logo: {
      width: '80px',
      marginBottom: '20px'
   },
   title: {
      fontSize: '28px',
      fontWeight: 'bold',
      color: '#d4a30d',
      margin: '0 0 8px 0'
   },
   subtitle: {
      fontSize: '16px',
      color: '#94a3b8',
      margin: 0
   },
   cardGrid: {
      display: 'grid',
      gridTemplateColumns: '1fr',
      gap: '16px',
      marginBottom: '40px'
   },
   card: {
      backgroundColor: '#1e293b',
      border: '1px solid #334155',
      borderRadius: '12px',
      padding: '24px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      textAlign: 'center',
      cursor: 'pointer',
      transition: 'all 0.2s',
      color: 'white',
      textDecoration: 'none'
   },
   cardIcon: {
      width: '48px',
      height: '48px',
      backgroundColor: '#d4a30d20',
      color: '#d4a30d',
      borderRadius: '12px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: '16px'
   },
   cardTitle: {
      fontSize: '18px',
      fontWeight: '600',
      margin: '0 0 8px 0'
   },
   cardDescription: {
      fontSize: '14px',
      color: '#94a3b8',
      margin: 0
   },
   footer: {
      marginTop: 'auto',
      textAlign: 'center',
      paddingTop: '20px',
      borderTop: '1px solid #1e293b'
   },
   footerText: {
      fontSize: '14px',
      color: '#64748b',
      margin: '0 0 4px 0'
   },
   footerSubtext: {
      fontSize: '12px',
      color: '#475569',
      margin: 0
   },
   backButton: {
      display: 'inline-block',
      background: 'none',
      border: 'none',
      color: '#d4a30d',
      fontSize: '16px',
      cursor: 'pointer',
      padding: '0 0 20px 0',
      textAlign: 'left'
   },
   formContainer: {
      backgroundColor: '#1e293b',
      padding: '32px',
      borderRadius: '16px',
      border: '1px solid #334155'
   },
   formTitle: {
      fontSize: '24px',
      fontWeight: 'bold',
      color: 'white',
      margin: '0 0 24px 0'
   },
   formSection: {
      marginBottom: '24px',
      padding: '16px',
      backgroundColor: '#0f172a',
      borderRadius: '8px',
      border: '1px solid #334155'
   },
   sectionHeading: {
      fontSize: '16px',
      color: '#d4a30d',
      marginBottom: '16px',
      marginTop: 0,
   },
   formGroup: {
      marginBottom: '16px'
   },
   row: {
      display: 'grid',
      gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
      gap: '12px'
   },
   label: {
      display: 'block',
      fontSize: '14px',
      color: '#94a3b8',
      marginBottom: '8px'
   },
   input: {
      width: '100%',
      padding: '12px 16px',
      backgroundColor: '#1e293b',
      border: '1px solid #334155',
      borderRadius: '8px',
      color: 'white',
      fontSize: '16px',
      outline: 'none',
      transition: 'border-color 0.2s',
      boxSizing: 'border-box'
   },
   fileInput: {
      width: '100%',
      padding: '12px',
      backgroundColor: '#1e293b',
      border: '1px dashed #475569',
      borderRadius: '8px',
      color: '#94a3b8',
      cursor: 'pointer',
      boxSizing: 'border-box'
   },
   primaryButton: {
      width: '100%',
      padding: '16px',
      backgroundColor: '#d4a30d',
      color: '#000',
      border: 'none',
      borderRadius: '8px',
      fontSize: '16px',
      fontWeight: 'bold',
      cursor: 'pointer',
      transition: 'background-color 0.2s',
      marginTop: '16px'
   }
};

export default App;
