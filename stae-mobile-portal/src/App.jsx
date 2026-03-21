import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
   User, FileText, Bell, CheckCircle, XCircle, Calendar,
   MapPin, Phone, Mail, Lock, LogIn, UserPlus, Home,
   ChevronRight, Download, QrCode, Clock, BookOpen, Plus
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const App = () => {
   const [view, setView] = useState('home');
   const [user, setUser] = useState(null);
   const [candidatura, setCandidatura] = useState(null);
   const [notificacoes, setNotificacoes] = useState([]);
   const [loading, setLoading] = useState(false);
   const [loginForm, setLoginForm] = useState({ email: '', password: '' });
   const [registroForm, setRegistroForm] = useState({
      email: '',
      password: '',
      nome_completo: '',
      nuit: '',
      contacto: '',
      genero: 'Masculino'
   });
   const [submeterForm, setSubmeterForm] = useState({
      categoria_id: '',
      provincia_actuacao_id: '',
      distrito_actuacao_id: '',
      posto_actuacao_id: '',
      localidade_actuacao_id: '',
      documento_bi: null,
      documento_certificado: null,
      observacoes: ''
   });

   // Verificar se há utilizador logado
   useEffect(() => {
      const savedUser = localStorage.getItem('stae_user');
      if (savedUser) {
         setUser(JSON.parse(savedUser));
         carregarDadosUtilizador(JSON.parse(savedUser).id);
      }
   }, []);

   const carregarDadosUtilizador = async (userId) => {
      setLoading(true);
      try {
         // Carregar candidatura do utilizador
         const candidaturaRes = await fetch(`${API_URL}/api/candidaturas`);
         if (candidaturaRes.ok) {
            const data = await candidaturaRes.json();
            const userCandidatura = data.candidaturas?.find(c => c.utilizador_id === userId);
            setCandidatura(userCandidatura);
         }

         // Carregar notificações
         const notificacoesRes = await fetch(`${API_URL}/api/notificacoes/${userId}`);
         if (notificacoesRes.ok) {
            const data = await notificacoesRes.json();
            setNotificacoes(data.notificacoes || []);
         }
      } catch (error) {
         console.error('Erro ao carregar dados:', error);
      } finally {
         setLoading(false);
      }
   };

   const handleLogin = async (e) => {
      e.preventDefault();
      setLoading(true);

      try {
         const response = await fetch(`${API_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(loginForm)
         });

         if (response.ok) {
            const data = await response.json();
            setUser(data.user);
            localStorage.setItem('stae_user', JSON.stringify(data.user));
            carregarDadosUtilizador(data.user.id);
            setView('dashboard');
         } else {
            alert('Credenciais inválidas');
         }
      } catch (error) {
         console.error('Erro no login:', error);
         alert('Erro no servidor');
      } finally {
         setLoading(false);
      }
   };

   const handleRegistro = async (e) => {
      e.preventDefault();
      setLoading(true);

      try {
         const response = await fetch(`${API_URL}/api/auth/registro`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(registroForm)
         });

         if (response.ok) {
            const data = await response.json();
            alert('Registro realizado com sucesso! Faça login para continuar.');
            setView('login');
            setRegistroForm({
               email: '',
               password: '',
               nome_completo: '',
               nuit: '',
               contacto: '',
               genero: 'Masculino'
            });
         } else {
            alert('Erro no registro');
         }
      } catch (error) {
         console.error('Erro no registro:', error);
         alert('Erro no servidor');
      } finally {
         setLoading(false);
      }
   };

   const handleLogout = () => {
      setUser(null);
      setCandidatura(null);
      setNotificacoes([]);
      localStorage.removeItem('stae_user');
      setView('home');
   };

   const marcarNotificacaoComoLida = async (id) => {
      try {
         await fetch(`${API_URL}/api/notificacoes/${id}/marcar-lida`, {
            method: 'POST'
         });

         setNotificacoes(notificacoes.map(n =>
            n.id === id ? { ...n, lida: true } : n
         ));
      } catch (error) {
         console.error('Erro ao marcar notificação como lida:', error);
      }
   };

   const handleSubmeterCandidatura = async () => {
      if (!user) {
         alert('Precisa estar autenticado para submeter candidatura');
         return;
      }

      if (!submeterForm.documento_bi || !submeterForm.documento_certificado) {
         alert('Por favor, carregue todos os documentos obrigatórios');
         return;
      }

      setLoading(true);
      try {
         const formData = new FormData();
         formData.append('utilizador_id', user.id);
         formData.append('categoria_id', submeterForm.categoria_id);
         formData.append('provincia_actuacao_id', submeterForm.provincia_actuacao_id);
         formData.append('distrito_actuacao_id', submeterForm.distrito_actuacao_id || '');
         formData.append('posto_actuacao_id', submeterForm.posto_actuacao_id || '');
         formData.append('localidade_actuacao_id', submeterForm.localidade_actuacao_id || '');
         formData.append('observacoes', submeterForm.observacoes);
         formData.append('documento_bi', submeterForm.documento_bi);
         formData.append('documento_certificado', submeterForm.documento_certificado);

         const response = await fetch(`${API_URL}/api/candidaturas/completa`, {
            method: 'POST',
            body: formData
         });

         if (response.ok) {
            const data = await response.json();
            alert('Candidatura submetida com sucesso!');
            setCandidatura(data.candidatura);
            setView('dashboard');
            setSubmeterForm({
               categoria_id: '',
               provincia_actuacao_id: '',
               distrito_actuacao_id: '',
               posto_actuacao_id: '',
               localidade_actuacao_id: '',
               documento_bi: null,
               documento_certificado: null,
               observacoes: ''
            });
         } else {
            const errorData = await response.json();
            alert(`Erro: ${errorData.error || 'Erro ao submeter candidatura'}`);
         }
      } catch (error) {
         console.error('Erro ao submeter candidatura:', error);
         alert('Erro ao submeter candidatura');
      } finally {
         setLoading(false);
      }
   };

   // Componentes de visualização
   const HomeView = () => (
      <motion.div
         initial={{ opacity: 0, y: 20 }}
         animate={{ opacity: 1, y: 0 }}
         style={styles.container}
      >
         <div style={styles.header}>
            <img src="/logo_stae.svg" alt="STAE Logo" style={styles.logo} />
            <h1 style={styles.title}>STAE SOFALA</h1>
            <p style={styles.subtitle}>Sistema de Gestão Eleitoral 2026</p>
         </div>

         <div style={styles.cardGrid}>
            <button style={styles.card} onClick={() => setView('login')}>
               <div style={styles.cardIcon}>
                  <LogIn size={24} />
               </div>
               <h3 style={styles.cardTitle}>Entrar</h3>
               <p style={styles.cardDescription}>Aceder à minha conta</p>
            </button>

            <button style={styles.card} onClick={() => setView('registro')}>
               <div style={styles.cardIcon}>
                  <UserPlus size={24} />
               </div>
               <h3 style={styles.cardTitle}>Registar</h3>
               <p style={styles.cardDescription}>Criar nova conta</p>
            </button>

            <button style={styles.card} onClick={() => setView('info')}>
               <div style={styles.cardIcon}>
                  <BookOpen size={24} />
               </div>
               <h3 style={styles.cardTitle}>Informações</h3>
               <p style={styles.cardDescription}>Sobre o processo</p>
            </button>
         </div>

         <div style={styles.footer}>
            <p style={styles.footerText}>Secretariado Técnico de Administração Eleitoral</p>
            <p style={styles.footerSubtext}>Província de Sofala - 2026</p>
         </div>
      </motion.div>
   );

   const LoginView = () => (
      <motion.div
         initial={{ opacity: 0, x: 20 }}
         animate={{ opacity: 1, x: 0 }}
         style={styles.container}
      >
         <button style={styles.backButton} onClick={() => setView('home')}>
            ← Voltar
         </button>

         <div style={styles.formContainer}>
            <h2 style={styles.formTitle}>Entrar na Conta</h2>

            <form onSubmit={handleLogin}>
               <div style={styles.formGroup}>
                  <label style={styles.label}>Email</label>
                  <input
                     type="email"
                     style={styles.input}
                     value={loginForm.email}
                     onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                     required
                  />
               </div>

               <div style={styles.formGroup}>
                  <label style={styles.label}>Password</label>
                  <input
                     type="password"
                     style={styles.input}
                     value={loginForm.password}
                     onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                     required
                  />
               </div>

               <button
                  type="submit"
                  style={styles.primaryButton}
                  disabled={loading}
               >
                  {loading ? 'A processar...' : 'Entrar'}
               </button>
            </form>

            <p style={styles.switchText}>
               Não tem conta?{' '}
               <button
                  style={styles.linkButton}
                  onClick={() => setView('registro')}
               >
                  Registar-se
               </button>
            </p>
         </div>
      </motion.div>
   );

   const RegistroView = () => (
      <motion.div
         initial={{ opacity: 0, x: 20 }}
         animate={{ opacity: 1, x: 0 }}
         style={styles.container}
      >
         <button style={styles.backButton} onClick={() => setView('home')}>
            ← Voltar
         </button>

         <div style={styles.formContainer}>
            <h2 style={styles.formTitle}>Criar Nova Conta</h2>

            <form onSubmit={handleRegistro}>
               <div style={styles.formGroup}>
                  <label style={styles.label}>Nome Completo</label>
                  <input
                     type="text"
                     style={styles.input}
                     value={registroForm.nome_completo}
                     onChange={(e) => setRegistroForm({ ...registroForm, nome_completo: e.target.value })}
                     required
                  />
               </div>

               <div style={styles.formGroup}>
                  <label style={styles.label}>NUIT</label>
                  <input
                     type="text"
                     style={styles.input}
                     value={registroForm.nuit}
                     onChange={(e) => setRegistroForm({ ...registroForm, nuit: e.target.value })}
                     required
                  />
               </div>

               <div style={styles.formGroup}>
                  <label style={styles.label}>Email</label>
                  <input
                     type="email"
                     style={styles.input}
                     value={registroForm.email}
                     onChange={(e) => setRegistroForm({ ...registroForm, email: e.target.value })}
                     required
                  />
               </div>

               <div style={styles.formGroup}>
                  <label style={styles.label}>Contacto</label>
                  <input
                     type="tel"
                     style={styles.input}
                     value={registroForm.contacto}
                     onChange={(e) => setRegistroForm({ ...registroForm, contacto: e.target.value })}
                     required
                  />
               </div>

               <div style={styles.formGroup}>
                  <label style={styles.label}>Género</label>
                  <select
                     style={styles.input}
                     value={registroForm.genero}
                     onChange={(e) => setRegistroForm({ ...registroForm, genero: e.target.value })}
                  >
                     <option value="Masculino">Masculino</option>
                     <option value="Feminino">Feminino</option>
                  </select>
               </div>

               <div style={styles.formGroup}>
                  <label style={styles.label}>Password</label>
                  <input
                     type="password"
                     style={styles.input}
                     value={registroForm.password}
                     onChange={(e) => setRegistroForm({ ...registroForm, password: e.target.value })}
                     required
                  />
               </div>

               <button
                  type="submit"
                  style={styles.primaryButton}
                  disabled={loading}
               >
                  {loading ? 'A processar...' : 'Registar'}
               </button>
            </form>

            <p style={styles.switchText}>
               Já tem conta?{' '}
               <button
                  style={styles.linkButton}
                  onClick={() => setView('login')}
               >
                  Entrar
               </button>
            </p>
         </div>
      </motion.div>
   );

   const DashboardView = () => (
      <motion.div
         initial={{ opacity: 0, y: 20 }}
         animate={{ opacity: 1, y: 0 }}
         style={styles.container}
      >
         {/* Header */}
         <div style={styles.dashboardHeader}>
            <div>
               <h2 style={styles.dashboardTitle}>Minha Conta</h2>
               <p style={styles.dashboardSubtitle}>Bem-vindo, {user?.nome_completo || user?.email}</p>
            </div>
            <button style={styles.logoutButton} onClick={handleLogout}>
               Sair
            </button>
         </div>

         {/* Menu */}
         <div style={styles.menu}>
            <button
               style={styles.menuButton}
               onClick={() => setView('perfil')}
            >
               <User size={20} />
               <span>Meu Perfil</span>
               <ChevronRight size={16} />
            </button>

            <button
               style={styles.menuButton}
               onClick={() => setView('candidatura')}
            >
               <FileText size={20} />
               <span>Minha Candidatura</span>
               <ChevronRight size={16} />
            </button>

            {!candidatura && (
               <button
                  style={styles.menuButton}
                  onClick={() => setView('submeter-candidatura')}
               >
                  <Plus size={20} />
                  <span>Submeter Candidatura</span>
                  <ChevronRight size={16} />
               </button>
            )}

            <button
               style={styles.menuButton}
               onClick={() => setView('notificacoes')}
            >
               <Bell size={20} />
               <span>Notificações</span>
               {notificacoes.filter(n => !n.lida).length > 0 && (
                  <span style={styles.badge}>
                     {notificacoes.filter(n => !n.lida).length}
                  </span>
               )}
               <ChevronRight size={16} />
            </button>
         </div>

         {/* Status da Candidatura */}
         {candidatura && (
            <div style={styles.statusCard}>
               <h3 style={styles.statusTitle}>Status da Candidatura</h3>
               <div style={styles.statusInfo}>
                  <div>
                     <p style={styles.statusLabel}>Estado</p>
                     <p style={{
                        ...styles.statusValue,
                        color: candidatura.estado_geral === 'aprovado' ? '#10b981' :
                           candidatura.estado_geral === 'reprovado' ? '#ef4444' : '#d4a30d'
                     }}>
                        {candidatura.estado_geral || 'Pendente'}
                     </p>
                  </div>
                  <div>
                     <p style={styles.statusLabel}>Fase</p>
                     <p style={styles.statusValue}>{candidatura.fase_atual || 'Registro'}</p>
                  </div>
               </div>
            </div>
         )}

         {/* Últimas Notificações */}
         <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Últimas Notificações</h3>
            {notificacoes.slice(0, 3).map((notificacao) => (
               <div
                  key={notificacao.id}
                  style={{
                     ...styles.notificationCard,
                     backgroundColor: notificacao.lida ? '#1e293b' : '#0f172a'
                  }}
                  onClick={() => marcarNotificacaoComoLida(notificacao.id)}
               >
                  <div style={styles.notificationHeader}>
                     <h4 style={styles.notificationTitle}>{notificacao.titulo}</h4>
                     {!notificacao.lida && <div style={styles.unreadDot} />}
                  </div>
                  <p style={styles.notificationMessage}>{notificacao.mensagem}</p>
                  <p style={styles.notificationTime}>
                     {new Date(notificacao.data_envio).toLocaleDateString('pt-PT')}
                  </p>
               </div>
            ))}
         </div>
      </motion.div>
   );

   const CandidaturaView = () => (
      <motion.div
         initial={{ opacity: 0, x: 20 }}
         animate={{ opacity: 1, x: 0 }}
         style={styles.container}
      >
         <button style={styles.backButton} onClick={() => setView('dashboard')}>
            ← Voltar
         </button>

         <div style={styles.section}>
            <h2 style={styles.sectionTitle}>Minha Candidatura</h2>

            {candidatura ? (
               <div style={styles.detailCard}>
                  <div style={styles.detailRow}>
                     <span style={styles.detailLabel}>Estado:</span>
                     <span style={{
                        ...styles.detailValue,
                        color: candidatura.estado_geral === 'aprovado' ? '#10b981' :
                           candidatura.estado_geral === 'reprovado' ? '#ef4444' : '#d4a30d'
                     }}>
                        {candidatura.estado_geral || 'Pendente'}
                     </span>
                  </div>

                  <div style={styles.detailRow}>
                     <span style={styles.detailLabel}>Fase Actual:</span>
                     <span style={styles.detailValue}>{candidatura.fase_atual || 'Registro'}</span>
                  </div>

                  <div style={styles.detailRow}>
                     <span style={styles.detailLabel}>Categoria:</span>
                     <span style={styles.detailValue}>{candidatura.categoria_nome || 'MMV'}</span>
                  </div>

                  <div style={styles.detailRow}>
                     <span style={styles.detailLabel}>Documentação BI:</span>
                     <span style={{
                        ...styles.detailValue,
                        color: candidatura.documento_bi_estado === 'aprovado' ? '#10b981' :
                           candidatura.documento_bi_estado === 'reprovado' ? '#ef4444' : '#d4a30d'
                     }}>
                        {candidatura.documento_bi_estado || 'Pendente'}
                     </span>
                  </div>

                  <div style={styles.detailRow}>
                     <span style={styles.detailLabel}>Certificado:</span>
                     <span style={{
                        ...styles.detailValue,
                        color: candidatura.documento_certificado_estado === 'aprovado' ? '#10b981' :
                           candidatura.documento_certificado_estado === 'reprovado' ? '#ef4444' : '#d4a30d'
                     }}>
                        {candidatura.documento_certificado_estado || 'Pendente'}
                     </span>
                  </div>

                  <div style={styles.detailRow}>
                     <span style={styles.detailLabel}>Pontuação:</span>
                     <span style={styles.detailValue}>{candidatura.pontuacao_documentacao || 0} pontos</span>
                  </div>

                  <div style={styles.detailRow}>
                     <span style={styles.detailLabel}>Data de Registo:</span>
                     <span style={styles.detailValue}>
                        {new Date(candidatura.criado_em).toLocaleDateString('pt-PT')}
                     </span>
                  </div>
               </div>
            ) : (
               <div style={styles.emptyState}>
                  <FileText size={48} color="#94a3b8" />
                  <p style={styles.emptyStateText}>Nenhuma candidatura encontrada</p>
                  <p style={styles.emptyStateSubtext}>Complete o seu perfil para se candidatar</p>
               </div>
            )}
         </div>
      </motion.div>
   );

   const SubmeterCandidaturaView = () => (
      <motion.div
         initial={{ opacity: 0, x: 20 }}
         animate={{ opacity: 1, x: 0 }}
         style={styles.container}
      >
         <button style={styles.backButton} onClick={() => setView('dashboard')}>
            ← Voltar
         </button>

         <div style={styles.section}>
            <h2 style={styles.sectionTitle}>Submeter Candidatura</h2>

            <div style={styles.formContainer}>
               <div style={styles.formGroup}>
                  <label style={styles.label}>Categoria *</label>
                  <select
                     style={styles.input}
                     value={submeterForm.categoria_id}
                     onChange={(e) => setSubmeterForm({ ...submeterForm, categoria_id: e.target.value })}
                     required
                  >
                     <option value="">Selecionar categoria</option>
                     <option value="mmv">MMV (Membro de Mesa de Voto)</option>
                     <option value="brigadista">Brigadista</option>
                     <option value="formador">Formador</option>
                     <option value="supervisor">Supervisor</option>
                  </select>
               </div>

               <div style={styles.formGroup}>
                  <label style={styles.label}>Província de Actuação *</label>
                  <select
                     style={styles.input}
                     value={submeterForm.provincia_actuacao_id}
                     onChange={(e) => setSubmeterForm({ ...submeterForm, provincia_actuacao_id: e.target.value })}
                     required
                  >
                     <option value="">Selecionar província</option>
                     <option value="sofala">Sofala</option>
                  </select>
               </div>

               <div style={styles.formGroup}>
                  <label style={styles.label}>Documento de Identificação (BI) *</label>
                  <input
                     type="file"
                     style={styles.fileInput}
                     accept=".jpg,.jpeg,.png,.pdf"
                     onChange={(e) => setSubmeterForm({ ...submeterForm, documento_bi: e.target.files[0] })}
                     required
                  />
                  <p style={styles.fileHelp}>Formatos aceites: JPG, PNG, PDF (máx. 10MB)</p>
               </div>

               <div style={styles.formGroup}>
                  <label style={styles.label}>Certificado ou Documento de Qualificação *</label>
                  <input
                     type="file"
                     style={styles.fileInput}
                     accept=".jpg,.jpeg,.png,.pdf"
                     onChange={(e) => setSubmeterForm({ ...submeterForm, documento_certificado: e.target.files[0] })}
                     required
                  />
                  <p style={styles.fileHelp}>Formatos aceites: JPG, PNG, PDF (máx. 10MB)</p>
               </div>

               <div style={styles.formGroup}>
                  <label style={styles.label}>Observações</label>
                  <textarea
                     style={styles.textarea}
                     value={submeterForm.observacoes}
                     onChange={(e) => setSubmeterForm({ ...submeterForm, observacoes: e.target.value })}
                     placeholder="Informações adicionais sobre a sua candidatura"
                     rows="4"
                  />
               </div>

               <button
                  style={styles.primaryButton}
                  onClick={handleSubmeterCandidatura}
                  disabled={loading}
               >
                  {loading ? 'A processar...' : 'Submeter Candidatura'}
               </button>
            </div>
         </div>
      </motion.div>
   );

   // Renderização principal
   return (
      <div style={styles.app}>
         {view === 'home' && <HomeView />}
         {view === 'login' && <LoginView />}
         {view === 'registro' && <RegistroView />}
         {view === 'submeter-candidatura' && <SubmeterCandidaturaView />}
         {view === 'dashboard' && <DashboardView />}
         {view === 'candidatura' && <CandidaturaView />}
         {view === 'notificacoes' && (
            <motion.div
               initial={{ opacity: 0, x: 20 }}
               animate={{ opacity: 1, x: 0 }}
               style={styles.container}
            >
               <button style={styles.backButton} onClick={() => setView('dashboard')}>
                  ← Voltar
               </button>

               <div style={styles.section}>
                  <h2 style={styles.sectionTitle}>Todas as Notificações</h2>

                  {notificacoes.length > 0 ? (
                     notificacoes.map((notificacao) => (
                        <div
                           key={notificacao.id}
                           style={{
                              ...styles.notificationCard,
                              backgroundColor: notificacao.lida ? '#1e293b' : '#0f172a'
                           }}
                           onClick={() => marcarNotificacaoComoLida(notificacao.id)}
                        >
                           <div style={styles.notificationHeader}>
                              <h4 style={styles.notificationTitle}>{notificacao.titulo}</h4>
                              {!notificacao.lida && <div style={styles.unreadDot} />}
                           </div>
                           <p style={styles.notificationMessage}>{notificacao.mensagem}</p>
                           <p style={styles.notificationTime}>
                              {new Date(notificacao.data_envio).toLocaleDateString('pt-PT')}
                           </p>
                        </div>
                     ))
                  ) : (
                     <div style={styles.emptyState}>
                        <Bell size={48} color="#94a3b8" />
                        <p style={styles.emptyStateText}>Nenhuma notificação</p>
                     </div>
                  )}
               </div>
            </motion.div>
         )}
      </div>
   );
};

// Estilos
const styles = {
   app: {
      minHeight: '100vh',
      backgroundColor: '#0f172a',
      color: 'white',
      fontFamily: '"Inter", sans-serif'
   },
   container: {
      padding: '20px',
      maxWidth: '500px',
      margin: '0 auto'
   },
   header: {
      textAlign: 'center',
      marginBottom: '40px'
   },
   logo: {
      width: '80px',
      marginBottom: '16px'
   },
   title: {
      fontSize: '24px',
      fontWeight: 'bold',
      color: '#d4a30d',
      margin: '0 0 8px 0'
   },
   subtitle: {
      fontSize: '14px',
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
      padding: '20px',
      textAlign: 'center',
      cursor: 'pointer',
      border: 'none',
      color: 'white'
   },
   cardIcon: {
      width: '48px',
      height: '48px',
      backgroundColor: '#d4a30d20',
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      margin: '0 auto 16px'
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
      textAlign: 'center',
      paddingTop: '20px',
      borderTop: '1px solid #334155'
   },
   footerText: {
      fontSize: '12px',
      color: '#94a3b8',
      margin: '0 0 4px 0'
   },
   footerSubtext: {
      fontSize: '11px',
      color: '#64748b',
      margin: 0
   },
   backButton: {
      backgroundColor: 'transparent',
      border: 'none',
      color: '#d4a30d',
      fontSize: '14px',
      cursor: 'pointer',
      marginBottom: '20px',
      display: 'flex',
      alignItems: 'center',
      gap: '4px'
   },
   formContainer: {
      backgroundColor: '#1e293b',
      padding: '24px',
      borderRadius: '12px',
      border: '1px solid #334155'
   },
   formTitle: {
      fontSize: '20px',
      fontWeight: '600',
      margin: '0 0 24px 0',
      textAlign: 'center'
   },
   formGroup: {
      marginBottom: '16px'
   },
   label: {
      display: 'block',
      fontSize: '14px',
      marginBottom: '8px',
      color: '#94a3b8'
   },
   input: {
      width: '100%',
      padding: '12px',
      backgroundColor: '#0f172a',
      border: '1px solid #334155',
      borderRadius: '8px',
      color: 'white',
      fontSize: '14px',
      boxSizing: 'border-box'
   },
   primaryButton: {
      width: '100%',
      padding: '14px',
      backgroundColor: '#d4a30d',
      color: '#000',
      border: 'none',
      borderRadius: '8px',
      fontSize: '16px',
      fontWeight: '600',
      cursor: 'pointer',
      marginTop: '8px'
   },
   switchText: {
      textAlign: 'center',
      marginTop: '20px',
      fontSize: '14px',
      color: '#94a3b8'
   },
   linkButton: {
      backgroundColor: 'transparent',
      border: 'none',
      color: '#d4a30d',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: '500'
   },
   dashboardHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '24px'
   },
   dashboardTitle: {
      fontSize: '20px',
      fontWeight: '600',
      margin: '0 0 4px 0'
   },
   dashboardSubtitle: {
      fontSize: '14px',
      color: '#94a3b8',
      margin: 0
   },
   logoutButton: {
      padding: '8px 16px',
      backgroundColor: '#ef444420',
      color: '#ef4444',
      border: '1px solid #ef4444',
      borderRadius: '8px',
      fontSize: '14px',
      cursor: 'pointer'
   },
   menu: {
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      marginBottom: '24px'
   },
   menuButton: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '16px',
      backgroundColor: '#1e293b',
      border: '1px solid #334155',
      borderRadius: '8px',
      color: 'white',
      fontSize: '16px',
      cursor: 'pointer',
      border: 'none'
   },
   badge: {
      backgroundColor: '#ef4444',
      color: 'white',
      fontSize: '12px',
      padding: '2px 8px',
      borderRadius: '12px'
   },
   statusCard: {
      backgroundColor: '#1e293b',
      padding: '20px',
      borderRadius: '12px',
      border: '1px solid #334155',
      marginBottom: '24px'
   },
   statusTitle: {
      fontSize: '16px',
      fontWeight: '600',
      margin: '0 0 16px 0'
   },
   statusInfo: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '16px'
   },
   statusLabel: {
      fontSize: '12px',
      color: '#94a3b8',
      margin: '0 0 4px 0'
   },
   statusValue: {
      fontSize: '16px',
      fontWeight: '600',
      margin: 0
   },
   section: {
      marginBottom: '24px'
   },
   sectionTitle: {
      fontSize: '18px',
      fontWeight: '600',
      margin: '0 0 16px 0'
   },
   notificationCard: {
      backgroundColor: '#1e293b',
      padding: '16px',
      borderRadius: '8px',
      marginBottom: '12px',
      cursor: 'pointer'
   },
   notificationHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '8px'
   },
   notificationTitle: {
      fontSize: '14px',
      fontWeight: '600',
      margin: 0
   },
   unreadDot: {
      width: '8px',
      height: '8px',
      backgroundColor: '#d4a30d',
      borderRadius: '50%'
   },
   notificationMessage: {
      fontSize: '13px',
      color: '#94a3b8',
      margin: '0 0 8px 0'
   },
   notificationTime: {
      fontSize: '11px',
      color: '#64748b',
      margin: 0
   },
   detailCard: {
      backgroundColor: '#1e293b',
      padding: '20px',
      borderRadius: '12px',
      border: '1px solid #334155'
   },
   detailRow: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '12px 0',
      borderBottom: '1px solid #334155'
   },
   detailLabel: {
      fontSize: '14px',
      color: '#94a3b8'
   },
   detailValue: {
      fontSize: '14px',
      fontWeight: '500'
   },
   emptyState: {
      textAlign: 'center',
      padding: '40px 20px'
   },
   emptyStateText: {
      fontSize: '16px',
      color: '#94a3b8',
      margin: '16px 0 8px 0'
   },
   emptyStateSubtext: {
      fontSize: '14px',
      color: '#64748b',
      margin: 0
   },
   // New styles for candidatura submission
   fileInput: {
      width: '100%',
      padding: '12px',
      backgroundColor: '#0f172a',
      border: '1px solid #334155',
      borderRadius: '8px',
      color: 'white',
      fontSize: '14px',
      boxSizing: 'border-box'
   },
   fileHelp: {
      fontSize: '12px',
      color: '#64748b',
      margin: '4px 0 0 0'
   },
   textarea: {
      width: '100%',
      padding: '12px',
      backgroundColor: '#0f172a',
      border: '1px solid #334155',
      borderRadius: '8px',
      color: 'white',
      fontSize: '14px',
      fontFamily: 'inherit',
      resize: 'vertical',
      minHeight: '100px',
      boxSizing: 'border-box'
   }
};

export default App;
