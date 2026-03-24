import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Users, LayoutDashboard, GraduationCap, Bell, BarChart,
  Settings, User, Plus, CheckCircle, XCircle, FileText,
  Search, Filter, Download, RefreshCw, Eye, Edit, Trash2,
  Calendar, Clock, MapPin, Mail, Phone, Check, X
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const App = () => {
  const [view, setView] = useState('dashboard');
  const [candidaturas, setCandidaturas] = useState([]);
  const [turmas, setTurmas] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [provincias, setProvincias] = useState([]);
  const [distritos, setDistritos] = useState([]);
  const [centros, setCentros] = useState([]);
  const [processos, setProcessos] = useState([]);
  const [formadores, setFormadores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCandidatura, setSelectedCandidatura] = useState(null);
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [notificacoesLista, setNotificacoesLista] = useState([]);
  const [relatoriosDados, setRelatoriosDados] = useState(null);
  const [showAvaliacaoModal, setShowAvaliacaoModal] = useState(false);
  const [showEntrevistaModal, setShowEntrevistaModal] = useState(false);
  const [showRegistroPresencialModal, setShowRegistroPresencialModal] = useState(false);
  const [showPautaModal, setShowPautaModal] = useState(false);
  const [selectedTurmaParaPauta, setSelectedTurmaParaPauta] = useState(null);
  const [formandosPauta, setFormandosPauta] = useState([]);
  const [showNovaTurmaModal, setShowNovaTurmaModal] = useState(false);
  const [showDetalhesTurmaModal, setShowDetalhesTurmaModal] = useState(false);
  const [turmaDetalhesSelecionada, setTurmaDetalhesSelecionada] = useState(null);
  const [showDistribuirModal, setShowDistribuirModal] = useState(false);
  const [turmaDistribuicaoSelecionada, setTurmaDistribuicaoSelecionada] = useState(null);
  const [candidatosDisponiveis, setCandidatosDisponiveis] = useState([]);
  const [candidatosSelecionados, setCandidatosSelecionados] = useState([]);
  const [novaTurmaForm, setNovaTurmaForm] = useState({
    nome: '', codigo: '', processo_id: '', centro_id: '', categoria_id: '',
    data_inicio: '', data_fim: '', horario: '', capacidade_maxima: 30,
    formador_principal_id: '', formador_auxiliar_id: ''
  });
  const [showNovaNotificacaoModal, setShowNovaNotificacaoModal] = useState(false);
  const [novaNotificacaoForm, setNovaNotificacaoForm] = useState({
    publico_alvo: 'pendentes',
    titulo: 'STAE INFORMA',
    mensagem: ''
  });
  const [avaliacaoForm, setAvaliacaoForm] = useState({
    documento_bi_estado: 'aprovado',
    documento_certificado_estado: 'aprovado',
    criterio_validade_bi: 10,
    criterio_validade_certificado: 10,
    criterio_legibilidade: 10,
    criterio_completude: 10,
    criterio_autenticidade: 10,
    motivo_reprovacao: '',
    observacoes: ''
  });
  const [entrevistaForm, setEntrevistaForm] = useState({
    entrevista_realizada: true,
    data_entrevista: new Date().toISOString().split('T')[0],
    entrevistador_id: 'admin', // Em produção, usar ID do utilizador logado
    pontuacao_entrevista: 0,
    observacoes_entrevista: '',
    criterio_comunicacao: 0,
    criterio_conhecimento: 0,
    criterio_atitude: 0,
    criterio_experiencia: 0,
    criterio_motivacao: 0,
    recomendacoes: ''
  });
  const [registroPresencialForm, setRegistroPresencialForm] = useState({
    nome_completo: '',
    nuit: '',
    bi_numero: '',
    genero: 'Masculino',
    data_nascimento: '',
    contacto_principal: '',
    email: '',
    provincia_id: '',
    distrito_id: '',
    posto_id: '',
    localidade_id: '',
    categoria_id: '',
    processo_id: '',
    documento_bi: null,
    documento_certificado: null
  });

  useEffect(() => {
    carregarDados();
  }, []);  const carregarDados = async () => {
    try {
      setLoading(true);
      const [candRes, turmasRes, catRes, provRes, centrosRes, procRes, formadoresRes, notifRes, relatRes] = await Promise.all([
        fetch(`${API_URL}/api/candidaturas`).then(r => r.json()),
        fetch(`${API_URL}/api/turmas`).then(r => r.json()),
        fetch(`${API_URL}/api/config/categorias`).then(r => r.json()),
        fetch(`${API_URL}/api/config/provincias`).then(r => r.json()),
        fetch(`${API_URL}/api/config/centros`).then(r => r.json()),
        fetch(`${API_URL}/api/config/processos`).then(r => r.json()),
        fetch(`${API_URL}/api/config/formadores`).then(r => r.json()),
        fetch(`${API_URL}/api/notificacoes`).then(r => r.json()).catch(() => ({ notificacoes: [] })),
        fetch(`${API_URL}/api/relatorios/estatisticas`).then(r => r.json()).catch(() => null)
      ]);

      setCandidaturas(Array.isArray(candRes) ? candRes : (candRes.candidaturas || []));
      setTurmas(Array.isArray(turmasRes) ? turmasRes : (turmasRes.turmas || []));
      setCategorias(catRes.categorias || []);
      setProvincias(provRes.provincias || []);
      setCentros(centrosRes.centros || []);
      setProcessos(procRes.processos || []);
      setFormadores(formadoresRes.formadores || []);
      setNotificacoesLista(notifRes.notificacoes || []);
      setRelatoriosDados(relatRes || null);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const carregarDistritos = async (provinciaId) => {
    if (!provinciaId) return;
    try {
      const res = await fetch(`${API_URL}/api/config/distritos/${provinciaId}`);
      const data = await res.json();
      setDistritos(data.distritos || []);
    } catch (error) {
      console.error('Erro ao carregar distritos:', error);
    }
  };

  const abrirModalPauta = async (turma) => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/turmas/${turma.id}`);
      const data = await res.json();
      
      setSelectedTurmaParaPauta(turma);
      setFormandosPauta(data.formandos.map(f => ({
        formando_id: f.id,
        nome_completo: f.nome_completo,
        presencas: f.presencas || 0,
        faltas: f.faltas || 0,
        nota_final: f.nota_final || 0,
        observacoes: f.observacoes || ''
      })));
      setShowPautaModal(true);
    } catch (error) {
      console.error('Erro ao carregar turma:', error);
      alert('Erro ao carregar turma para pauta');
    } finally {
      setLoading(false);
    }
  };

  const salvarPauta = async () => {
    try {
      const response = await fetch(`${API_URL}/api/turmas/${selectedTurmaParaPauta.id}/pauta`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          avaliacoes: formandosPauta, 
          avaliador_id: 'admin' 
        })
      });

      if (response.ok) {
        alert('✅ Pauta salva com sucesso!\\n[SMS Simulado: Resultados enviados aos formandos]');
        setShowPautaModal(false);
        carregarDados();
      } else {
        const err = await response.json();
        alert('Erro: ' + (err.error || 'Erro desconhecido ao salvar pauta'));
      }
    } catch (error) {
      console.error('Erro:', error);
      alert('Erro ao salvar pauta');
    }
  };

  const salvarNovaTurma = async () => {
    try {
      const res = await fetch(`${API_URL}/api/turmas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(novaTurmaForm)
      });
      if (res.ok) {
        alert("Turma criada com sucesso!");
        setShowNovaTurmaModal(false);
        carregarDados();
      } else {
        const error = await res.json();
        alert(error.error || "Erro ao criar turma.");
      }
    } catch(e) {
      console.error(e);
      alert("Erro ao conectar ao servidor.");
    }
  };

  const verDetalhesTurma = (turma) => {
    setTurmaDetalhesSelecionada(turma);
    setShowDetalhesTurmaModal(true);
  };

  const abrirModalDistribuir = (turma) => {
    setTurmaDistribuicaoSelecionada(turma);
    // Filtrar candidatos disponíveis
    const disponiveis = candidaturas.filter(c => 
      c.categoria_id === turma.categoria_id && 
      c.estado_geral === 'aprovado' && 
      c.fase_atual !== 'afectacao' && 
      c.fase_atual !== 'formacao'
    );
    setCandidatosDisponiveis(disponiveis);
    setCandidatosSelecionados([]);
    setShowDistribuirModal(true);
  };

  const alternarSelecaoCandidato = (id) => {
    setCandidatosSelecionados(prev => 
      prev.includes(id) ? prev.filter(cId => cId !== id) : [...prev, id]
    );
  };

  const salvarDistribuicaoFormandos = async () => {
    if (candidatosSelecionados.length === 0) return alert("Selecione pelo menos um candidato.");
    const vagasDisponiveis = turmaDistribuicaoSelecionada.capacidade_maxima - (turmaDistribuicaoSelecionada.vagas_preenchidas || 0);
    if (candidatosSelecionados.length > vagasDisponiveis) {
      return alert(`Limite excedido. A turma só tem ${vagasDisponiveis} vagas disponíveis.`);
    }

    try {
      const res = await fetch(`${API_URL}/api/turmas/${turmaDistribuicaoSelecionada.id}/distribuir-formandos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidatura_ids: candidatosSelecionados })
      });
      if (res.ok) {
        alert("Formandos alocados com sucesso à turma!");
        setShowDistribuirModal(false);
        carregarDados();
      } else {
        const error = await res.json();
        alert(error.error || "Erro ao alocar formandos.");
      }
    } catch(e) {
      console.error(e);
      alert("Erro de servidor.");
    }
  };

  const enviarNovaNotificacao = async () => {
    if (!novaNotificacaoForm.mensagem) return alert("A mensagem não pode estar vazia.");
    try {
      const res = await fetch(`${API_URL}/api/notificacoes/enviar-lote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(novaNotificacaoForm)
      });
      if (res.ok) {
        const data = await res.json();
        alert(`Sucesso! ${data.count} notificações SMS enviadas.`);
        setShowNovaNotificacaoModal(false);
        setNovaNotificacaoForm({ ...novaNotificacaoForm, mensagem: '' });
        carregarDados();
      } else {
        const err = await res.json();
        alert(err.error || "Erro ao enviar notificações");
      }
    } catch(e) {
      console.error(e);
      alert("Erro ao conectar ao servidor.");
    }
  };

  const abrirModalAvaliacao = (candidatura) => {
    setSelectedCandidatura(candidatura);
    setAvaliacaoForm({
      documento_bi_estado: candidatura.documento_bi_estado === 'reprovado' ? 'reprovado' : 'aprovado',
      documento_certificado_estado: candidatura.documento_certificado_estado === 'reprovado' ? 'reprovado' : 'aprovado',
      criterio_validade_bi: candidatura.criterio_validade_bi || 10,
      criterio_validade_certificado: candidatura.criterio_validade_certificado || 10,
      criterio_legibilidade: candidatura.criterio_legibilidade || 10,
      criterio_completude: candidatura.criterio_completude || 10,
      criterio_autenticidade: candidatura.criterio_autenticidade || 10,
      motivo_reprovacao: candidatura.motivo_reprovacao || '',
      observacoes: candidatura.observacoes || ''
    });
    setShowAvaliacaoModal(true);
  };

  const avaliarCandidaturaDetalhada = async () => {
    if (!selectedCandidatura) return;

    // Validação de Observação Obrigatória para Reprovações
    const temReprovacao = 
      avaliacaoForm.documento_bi_estado === 'reprovado' || 
      avaliacaoForm.documento_certificado_estado === 'reprovado';
    
    if (temReprovacao && !avaliacaoForm.motivo_reprovacao?.trim()) {
      alert("⚠️ ERRO: Em caso de reprovação de documentos, o campo 'Motivo de Reprovação' é obrigatório.");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/candidaturas/${selectedCandidatura.id}/avaliar-detalhada`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...avaliacaoForm,
          avaliado_por: 'admin'
        })
      });

      if (response.ok) {
        // Simulação de Envio de SMS (Notificação)
        const statusFinal = (avaliacaoForm.documento_bi_estado === 'aprovado' && 
                             avaliacaoForm.documento_certificado_estado === 'aprovado') ? 'APROVADA' : 'REPROVADA';
        
        console.log(`📡 [SMS SIMULADO] Enviando para: ${selectedCandidatura.nome_completo || 'Candidato'}`);
        console.log(`📱 MENSAGEM: STAE Informa: A sua candidatura foi ${statusFinal}. ${statusFinal === 'REPROVADA' ? 'Motivo: ' + avaliacaoForm.motivo_reprovacao : 'Aguarde próximas instruções.'}`);

        alert(`✅ Avaliação concluída!\n[SMS Simulado: Candidatura ${statusFinal}]`);
        carregarDados();
        setShowAvaliacaoModal(false);
        setSelectedCandidatura(null);
      } else {
        const errorData = await response.json();
        alert(`Erro: ${errorData.error || 'Erro desconhecido'}`);
      }
    } catch (error) {
      console.error('Erro ao avaliar candidatura:', error);
      alert('Erro ao avaliar candidatura');
    }
  };

  // Função de compatibilidade (mantida para referência)
  const avaliarCandidatura = async (id, aprovado) => {
    try {
      const response = await fetch(`${API_URL}/api/candidaturas/${id}/avaliar-documentacao`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documento_bi_estado: aprovado ? 'aprovado' : 'reprovado',
          documento_certificado_estado: aprovado ? 'aprovado' : 'reprovado',
          pontuacao_documentacao: aprovado ? 100 : 0,
          observacoes: aprovado ? 'Documentação completa e válida' : 'Documentação incompleta ou inválida'
        })
      });

      if (response.ok) {
        alert(`Candidatura ${aprovado ? 'aprovada' : 'reprovada'} com sucesso!`);
        carregarDados();
        setSelectedCandidatura(null);
      }
    } catch (error) {
      console.error('Erro ao avaliar candidatura:', error);
      alert('Erro ao avaliar candidatura');
    }
  };

  // Abrir modal de avaliação de entrevista
  const abrirModalEntrevista = (candidatura) => {
    setSelectedCandidatura(candidatura);
    setEntrevistaForm({
      entrevista_realizada: true,
      data_entrevista: new Date().toISOString().split('T')[0],
      entrevistador_id: 'admin',
      pontuacao_entrevista: candidatura.pontuacao_entrevista || 0,
      observacoes_entrevista: candidatura.observacoes_entrevista || '',
      criterio_comunicacao: candidatura.criterio_comunicacao || 0,
      criterio_conhecimento: candidatura.criterio_conhecimento || 0,
      criterio_atitude: candidatura.criterio_atitude || 0,
      criterio_experiencia: candidatura.criterio_experiencia || 0,
      criterio_motivacao: candidatura.criterio_motivacao || 0,
      recomendacoes: candidatura.recomendacoes || ''
    });
    setShowEntrevistaModal(true);
  };

  // Avaliar entrevista do candidato
  const avaliarEntrevista = async () => {
    if (!selectedCandidatura) return;

    try {
      const response = await fetch(`${API_URL}/api/candidaturas/${selectedCandidatura.id}/avaliar-entrevista`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entrevistaForm)
      });

      if (response.ok) {
        const data = await response.json();
        alert(`Entrevista ${entrevistaForm.entrevista_realizada ? 'avaliada' : 'marcada como não realizada'} com sucesso!`);
        carregarDados();
        setShowEntrevistaModal(false);
        setSelectedCandidatura(null);
      } else {
        const errorData = await response.json();
        alert(`Erro: ${errorData.error || 'Erro desconhecido'}`);
      }
    } catch (error) {
      console.error('Erro ao avaliar entrevista:', error);
      alert('Erro ao avaliar entrevista');
    }
  };

  // Registrar candidatura presencial
  const registrarCandidaturaPresencial = async () => {
    try {
      const formData = new FormData();

      // Adicionar campos do formulário
      Object.keys(registroPresencialForm).forEach(key => {
        if (key !== 'documento_bi' && key !== 'documento_certificado') {
          formData.append(key, registroPresencialForm[key]);
        }
      });

      // Adicionar arquivos
      if (registroPresencialForm.documento_bi) {
        formData.append('documento_bi', registroPresencialForm.documento_bi);
      }
      if (registroPresencialForm.documento_certificado) {
        formData.append('documento_certificado', registroPresencialForm.documento_certificado);
      }

      // O backend agora cuidará de criar o utilizador/perfis e associar ao processo atual se estes vierem vazios

      const response = await fetch(`${API_URL}/api/candidaturas/completa`, {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        alert('Candidatura registrada com sucesso!');
        setShowRegistroPresencialModal(false);
        setRegistroPresencialForm({
          nome_completo: '',
          nuit: '',
          bi_numero: '',
          genero: 'Masculino',
          data_nascimento: '',
          contacto_principal: '',
          email: '',
          provincia_id: '',
          distrito_id: '',
          posto_id: '',
          localidade_id: '',
          categoria_id: '',
          processo_id: '',
          documento_bi: null,
          documento_certificado: null
        });
        carregarDados();
      } else {
        const errorData = await response.json();
        alert(`Erro: ${errorData.error || 'Erro desconhecido'}`);
      }
    } catch (error) {
      console.error('Erro ao registrar candidatura:', error);
      alert('Erro ao registrar candidatura');
    }
  };

  const candidaturasFiltradas = candidaturas.filter(c => {
    if (filtroEstado === 'todos') return true;
    if (filtroEstado === 'aprovado') return c.estado_geral === 'aprovado';
    if (filtroEstado === 'pendente') return c.estado_geral === 'pendente';
    if (filtroEstado === 'reprovado') return c.estado_geral === 'reprovado';
    return true;
  });

  const estatisticas = {
    total: candidaturas.length,
    aprovadas: candidaturas.filter(c => c.estado_geral === 'aprovado').length,
    pendentes: candidaturas.filter(c => c.estado_geral === 'pendente').length,
    reprovadas: candidaturas.filter(c => c.estado_geral === 'reprovado').length,
    turmasAtivas: turmas.filter(t => t.estado === 'em_andamento').length,
    totalTurmas: turmas.length
  };

  return (
    <div style={styles.container}>
      {/* Sidebar */}
      <div style={styles.sidebar}>
        <div style={styles.logoContainer}>
          <img src="/logo_stae.svg" alt="STAE Logo" style={styles.logo} />
          <h2 style={styles.logoTitle}>STAE SOFALA</h2>
          <p style={styles.logoSubtitle}>Sistema de Gestão Eleitoral</p>
        </div>

        <nav style={styles.nav}>
          <button
            style={styles.navButton(view === 'dashboard')}
            onClick={() => setView('dashboard')}
          >
            <LayoutDashboard size={20} />
            <span>Dashboard</span>
          </button>

          <button
            style={styles.navButton(view === 'candidaturas')}
            onClick={() => setView('candidaturas')}
          >
            <Users size={20} />
            <span>Candidaturas</span>
          </button>

          <button
            style={styles.navButton(view === 'formacao')}
            onClick={() => setView('formacao')}
          >
            <GraduationCap size={20} />
            <span>Formação</span>
          </button>

          <button
            style={styles.navButton(view === 'notificacoes')}
            onClick={() => setView('notificacoes')}
          >
            <Bell size={20} />
            <span>Notificações</span>
          </button>

          <button
            style={styles.navButton(view === 'relatorios')}
            onClick={() => setView('relatorios')}
          >
            <BarChart size={20} />
            <span>Relatórios</span>
          </button>
        </nav>

        <div style={styles.userInfo}>
          <div style={styles.userAvatar}>
            <User size={24} />
          </div>
          <div>
            <p style={styles.userName}>Administrador</p>
            <p style={styles.userRole}>STAE Sofala</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={styles.main}>
        <header style={styles.header}>
          <h1 style={styles.title}>
            {view === 'dashboard' && 'Dashboard de Gestão'}
            {view === 'candidaturas' && 'Gestão de Candidaturas'}
            {view === 'formacao' && 'Gestão de Formação'}
            {view === 'notificacoes' && 'Notificações'}
            {view === 'relatorios' && 'Relatórios'}
          </h1>

          <div style={styles.headerActions}>
            <button style={styles.refreshButton} onClick={carregarDados}>
              <RefreshCw size={18} />
              Actualizar
            </button>
          </div>
        </header>

        {loading ? (
          <div style={styles.loading}>
            <p>A carregar dados...</p>
          </div>
        ) : (
          <div style={styles.content}>
            {/* DASHBOARD VIEW */}
            {view === 'dashboard' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div style={styles.statsGrid}>
                  <div style={styles.statCard}>
                    <h3 style={styles.statNumber}>{estatisticas.total}</h3>
                    <p style={styles.statLabel}>Total Candidaturas</p>
                  </div>

                  <div style={{ ...styles.statCard, borderColor: '#10b981' }}>
                    <h3 style={{ ...styles.statNumber, color: '#10b981' }}>{estatisticas.aprovadas}</h3>
                    <p style={styles.statLabel}>Aprovadas</p>
                  </div>

                  <div style={{ ...styles.statCard, borderColor: '#d4a30d' }}>
                    <h3 style={{ ...styles.statNumber, color: '#d4a30d' }}>{estatisticas.pendentes}</h3>
                    <p style={styles.statLabel}>Pendentes</p>
                  </div>

                  <div style={{ ...styles.statCard, borderColor: '#ef4444' }}>
                    <h3 style={{ ...styles.statNumber, color: '#ef4444' }}>{estatisticas.reprovadas}</h3>
                    <p style={styles.statLabel}>Reprovadas</p>
                  </div>
                </div>

                <div style={styles.dashboardSections}>
                  {/* Últimas Candidaturas */}
                  <div style={styles.sectionCard}>
                    <div style={styles.sectionHeader}>
                      <h3>Últimas Candidaturas</h3>
                      <button
                        style={styles.viewAllButton}
                        onClick={() => setView('candidaturas')}
                      >
                        Ver Todas
                      </button>
                    </div>

                    <div style={styles.table}>
                      {candidaturas.slice(0, 5).map((candidatura) => (
                        <div key={candidatura.id} style={styles.tableRow}>
                          <div>
                            <p style={styles.tablePrimary}>{candidatura.nome_completo || 'Candidato'}</p>
                            <p style={styles.tableSecondary}>{candidatura.categoria_nome || 'MMV'}</p>
                          </div>
                          <div style={styles.tableActions}>
                            <span style={{
                              ...styles.statusBadge,
                              backgroundColor: candidatura.estado_geral === 'aprovado' ? '#10b98120' :
                                candidatura.estado_geral === 'reprovado' ? '#ef444420' : '#d4a30d20',
                              color: candidatura.estado_geral === 'aprovado' ? '#10b981' :
                                candidatura.estado_geral === 'reprovado' ? '#ef4444' : '#d4a30d'
                            }}>
                              {candidatura.estado_geral || 'pendente'}
                            </span>
                            <button
                              style={styles.actionButton}
                              onClick={() => setSelectedCandidatura(candidatura)}
                            >
                              <Eye size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Turmas Activas */}
                  <div style={styles.sectionCard}>
                    <div style={styles.sectionHeader}>
                      <h3>Turmas Activas</h3>
                      <button
                        style={styles.viewAllButton}
                        onClick={() => setView('formacao')}
                      >
                        Ver Todas
                      </button>
                    </div>

                    <div style={styles.table}>
                      {turmas.filter(t => t.estado === 'em_andamento').slice(0, 3).map((turma) => (
                        <div key={turma.id} style={styles.tableRow}>
                          <div>
                            <p style={styles.tablePrimary}>{turma.nome}</p>
                            <p style={styles.tableSecondary}>
                              {turma.centro_nome} • {turma.vagas_preenchidas || 0}/{turma.capacidade_maxima || 0} vagas
                            </p>
                          </div>
                          <div style={styles.tableActions}>
                            <span style={styles.statusBadge}>
                              {turma.estado}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* CANDIDATURAS VIEW */}
            {view === 'candidaturas' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div style={styles.pageHeader}>
                  <div style={styles.filters}>
                    <button
                      style={filtroEstado === 'todos' ? styles.filterActive : styles.filter}
                      onClick={() => setFiltroEstado('todos')}
                    >
                      Todos ({estatisticas.total})
                    </button>
                    <button
                      style={filtroEstado === 'pendente' ? styles.filterActive : styles.filter}
                      onClick={() => setFiltroEstado('pendente')}
                    >
                      Pendentes ({estatisticas.pendentes})
                    </button>
                    <button
                      style={filtroEstado === 'aprovado' ? styles.filterActive : styles.filter}
                      onClick={() => setFiltroEstado('aprovado')}
                    >
                      Aprovados ({estatisticas.aprovadas})
                    </button>
                    <button
                      style={filtroEstado === 'reprovado' ? styles.filterActive : styles.filter}
                      onClick={() => setFiltroEstado('reprovado')}
                    >
                      Reprovados ({estatisticas.reprovadas})
                    </button>
                  </div>

                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div style={styles.searchBox}>
                      <Search size={18} />
                      <input
                        type="text"
                        placeholder="Pesquisar candidaturas..."
                        style={styles.searchInput}
                      />
                    </div>

                    <button
                      style={{ ...styles.primaryButton, backgroundColor: '#10b981' }}
                      onClick={() => setShowRegistroPresencialModal(true)}
                    >
                      <Plus size={18} /> Nova Candidatura Presencial
                    </button>
                  </div>
                </div>

                <div style={styles.tableContainer}>
                  {candidaturasFiltradas.map((candidatura) => (
                    <div key={candidatura.id} style={styles.candidaturaCard}>
                      <div style={styles.candidaturaInfo}>
                        <div>
                          <h4 style={styles.candidaturaName}>{candidatura.nome_completo || 'Candidato'}</h4>
                          <p style={styles.candidaturaDetails}>
                            {candidatura.categoria_nome || 'MMV'} • {candidatura.email}
                          </p>
                          <p style={styles.candidaturaDetails}>
                            Fase: {candidatura.fase_atual || 'registro'} •
                            Criado em: {new Date(candidatura.criado_em).toLocaleDateString('pt-PT')}
                          </p>
                        </div>

                        <div style={styles.candidaturaStatus}>
                          <span style={{
                            ...styles.statusBadge,
                            backgroundColor: candidatura.estado_geral === 'aprovado' ? '#10b98120' :
                              candidatura.estado_geral === 'reprovado' ? '#ef444420' : '#d4a30d20',
                            color: candidatura.estado_geral === 'aprovado' ? '#10b981' :
                              candidatura.estado_geral === 'reprovado' ? '#ef4444' : '#d4a30d'
                          }}>
                            {candidatura.estado_geral || 'pendente'}
                          </span>
                        </div>
                      </div>

                      <div style={styles.candidaturaActions}>
                        <button
                          style={styles.actionButton}
                          onClick={() => setSelectedCandidatura(candidatura)}
                        >
                          <Eye size={16} /> Ver Detalhes
                        </button>

                        {candidatura.estado_geral === 'pendente' && (
                          <button
                            style={{ ...styles.actionButton, backgroundColor: '#d4a30d', color: 'white' }}
                            onClick={() => abrirModalAvaliacao(candidatura)}
                          >
                            <FileText size={16} /> Avaliar Documentação
                          </button>
                        )}

                        {(candidatura.estado_geral === 'aprovado' || candidatura.resultado_final === 'aprovado_documentacao') && !candidatura.entrevista_realizada && (
                          <button
                            style={{ ...styles.actionButton, backgroundColor: '#17a2b8', color: 'white' }}
                            onClick={() => abrirModalEntrevista(candidatura)}
                          >
                            <Users size={16} /> Avaliar Entrevista
                          </button>
                        )}

                        {candidatura.entrevista_realizada && (
                          <button
                            style={{ ...styles.actionButton, backgroundColor: '#6f42c1', color: 'white' }}
                            onClick={() => abrirModalEntrevista(candidatura)}
                          >
                            <Users size={16} /> Ver Entrevista
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* FORMAÇÃO VIEW */}
            {view === 'formacao' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div style={styles.pageHeader}>
                  <button style={styles.primaryButton} onClick={() => setShowNovaTurmaModal(true)}>
                    <Plus size={18} /> Nova Turma
                  </button>
                </div>

                <div style={styles.tableContainer}>
                  {turmas.map((turma) => (
                    <div key={turma.id} style={styles.turmaCard}>
                      <div style={styles.turmaHeader}>
                        <div>
                          <h4 style={styles.turmaName}>{turma.nome}</h4>
                          <p style={styles.turmaCode}>{turma.codigo}</p>
                        </div>
                        <span style={styles.statusBadge}>
                          {turma.estado}
                        </span>
                      </div>

                      <div style={styles.turmaDetails}>
                        <div style={styles.turmaInfo}>
                          <p><Calendar size={16} /> {turma.data_inicio} - {turma.data_fim}</p>
                          <p><Clock size={16} /> {turma.horario}</p>
                          <p><MapPin size={16} /> {turma.centro_nome}</p>
                        </div>

                        <div style={styles.turmaStats}>
                          <div style={styles.stat}>
                            <span style={styles.statNumber}>{turma.vagas_preenchidas || 0}</span>
                            <span style={styles.statLabel}>de {turma.capacidade_maxima || 0}</span>
                          </div>
                          <p style={styles.statDescription}>Vagas ocupadas</p>
                        </div>
                      </div>

                      <div style={styles.turmaActions}>
                        <button style={styles.actionButton} onClick={() => verDetalhesTurma(turma)}>
                          <Eye size={16} /> Ver Detalhes
                        </button>
                        <button style={styles.actionButton} onClick={() => abrirModalDistribuir(turma)}>
                          <Users size={16} /> Adicionar Formandos
                        </button>
                        {turma.estado === 'em_andamento' && (
                          <button 
                            style={{ ...styles.actionButton, backgroundColor: '#6f42c1', color: 'white' }}
                            onClick={() => abrirModalPauta(turma)}
                          >
                            <FileText size={16} /> Avaliar Turma (Pauta)
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* NOTIFICAÇÕES VIEW */}
            {view === 'notificacoes' && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                <div style={styles.pageHeader}>
                  <h2 style={styles.pageTitle}>Log de SMS e Notificações</h2>
                  <button style={styles.primaryButton} onClick={() => setShowNovaNotificacaoModal(true)}>
                    <Mail size={16} /> Nova Notificação
                  </button>
                </div>
                <div style={styles.tableContainer}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>Data de Envio</th>
                        <th style={styles.th}>Destinatário</th>
                        <th style={styles.th}>Contacto</th>
                        <th style={styles.th}>Mensagem</th>
                        <th style={styles.th}>Lido</th>
                      </tr>
                    </thead>
                    <tbody>
                      {notificacoesLista.map(n => (
                        <tr key={n.id} style={styles.tr}>
                          <td style={styles.td}>{new Date(n.data_envio).toLocaleString()}</td>
                          <td style={styles.td}>{n.destinatario_nome || n.destinatario_id}</td>
                          <td style={styles.td}>{n.contacto || 'N/A'}</td>
                          <td style={styles.td}>{n.mensagem}</td>
                          <td style={styles.td}>{n.lida ? <CheckCircle size={16} color="#10b981"/> : <XCircle size={16} color="#64748b"/>}</td>
                        </tr>
                      ))}
                      {notificacoesLista.length === 0 && (
                        <tr><td colSpan="5" style={{...styles.td, textAlign: 'center'}}>Nenhuma notificação enviada ainda.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {/* RELATÓRIOS VIEW */}
            {view === 'relatorios' && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                <div style={styles.pageHeader}>
                  <h2 style={styles.pageTitle}>Relatórios Consolidados</h2>
                </div>
                {relatoriosDados ? (
                  <>
                    <div style={styles.statsGrid}>
                      <div style={{...styles.statCard}}>
                        <h4 style={styles.statTitle}>Total Inscritos</h4>
                        <div style={styles.statValue}>{relatoriosDados.kpis.total_inscritos}</div>
                      </div>
                      <div style={{...styles.statCard}}>
                        <h4 style={styles.statTitle}>Aprovados</h4>
                        <div style={styles.statValue}>{relatoriosDados.kpis.aprovados_final}</div>
                      </div>
                      <div style={{...styles.statCard}}>
                        <h4 style={styles.statTitle}>Formandos Locados</h4>
                        <div style={styles.statValue}>{relatoriosDados.kpis.formandos_alocados}</div>
                      </div>
                      <div style={{...styles.statCard}}>
                        <h4 style={styles.statTitle}>Em Turmas</h4>
                        <div style={styles.statValue}>{relatoriosDados.kpis.total_turmas}</div>
                      </div>
                    </div>
                    
                    <div style={{ ...styles.formContainer, marginTop: '20px' }}>
                      <h3 style={{ color: 'white', marginBottom: '15px' }}>Inscritos por Categoria</h3>
                      <table style={styles.table}>
                        <thead>
                          <tr>
                            <th style={styles.th}>Categoria</th>
                            <th style={styles.th}>Total Base de Dados</th>
                          </tr>
                        </thead>
                        <tbody>
                          {relatoriosDados.por_categoria.map((c, i) => (
                            <tr key={i} style={styles.tr}>
                              <td style={styles.td}>{c.nome || 'Sem categoria'}</td>
                              <td style={styles.td}><strong style={{color: '#d4a30d'}}>{c.total}</strong></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                ) : (
                  <p style={{ color: '#94a3b8' }}>A carregar dados dos relatórios...</p>
                )}
              </motion.div>
            )}
          </div>
        )}

        {/* Modal de Avaliação Detalhada */}
        {showAvaliacaoModal && selectedCandidatura && (
          <div style={styles.modalOverlay}>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              style={styles.modal}
            >
              <div style={styles.modalHeader}>
                <h3 style={styles.modalTitle}>Avaliação de Documentação</h3>
                <button
                  style={styles.modalCloseButton}
                  onClick={() => setShowAvaliacaoModal(false)}
                >
                  ×
                </button>
              </div>

              <div style={styles.modalBody}>
                <div style={styles.candidaturaInfoModal}>
                  <h4>{selectedCandidatura.nome_completo || 'Candidato'}</h4>
                  <p>{selectedCandidatura.categoria_nome || 'MMV'} • {selectedCandidatura.email}</p>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Estado do BI:</label>
                  <select
                    style={styles.select}
                    value={avaliacaoForm.documento_bi_estado}
                    onChange={(e) => setAvaliacaoForm({ ...avaliacaoForm, documento_bi_estado: e.target.value })}
                  >
                    <option value="aprovado">Aprovado</option>
                    <option value="reprovado">Reprovado</option>
                  </select>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Estado do Certificado:</label>
                  <select
                    style={styles.select}
                    value={avaliacaoForm.documento_certificado_estado}
                    onChange={(e) => setAvaliacaoForm({ ...avaliacaoForm, documento_certificado_estado: e.target.value })}
                  >
                    <option value="aprovado">Aprovado</option>
                    <option value="reprovado">Reprovado</option>
                  </select>
                </div>

                <div style={styles.criteriaGrid}>
                  <div style={styles.criterion}>
                    <label style={styles.label}>Validade do BI (0-10):</label>
                    <input
                      type="range"
                      min="0"
                      max="10"
                      value={avaliacaoForm.criterio_validade_bi}
                      onChange={(e) => setAvaliacaoForm({ ...avaliacaoForm, criterio_validade_bi: parseInt(e.target.value) })}
                      style={styles.rangeInput}
                    />
                    <span style={styles.rangeValue}>{avaliacaoForm.criterio_validade_bi}</span>
                  </div>

                  <div style={styles.criterion}>
                    <label style={styles.label}>Validade do Certificado (0-10):</label>
                    <input
                      type="range"
                      min="0"
                      max="10"
                      value={avaliacaoForm.criterio_validade_certificado}
                      onChange={(e) => setAvaliacaoForm({ ...avaliacaoForm, criterio_validade_certificado: parseInt(e.target.value) })}
                      style={styles.rangeInput}
                    />
                    <span style={styles.rangeValue}>{avaliacaoForm.criterio_validade_certificado}</span>
                  </div>

                  <div style={styles.criterion}>
                    <label style={styles.label}>Legibilidade (0-10):</label>
                    <input
                      type="range"
                      min="0"
                      max="10"
                      value={avaliacaoForm.criterio_legibilidade}
                      onChange={(e) => setAvaliacaoForm({ ...avaliacaoForm, criterio_legibilidade: parseInt(e.target.value) })}
                      style={styles.rangeInput}
                    />
                    <span style={styles.rangeValue}>{avaliacaoForm.criterio_legibilidade}</span>
                  </div>

                  <div style={styles.criterion}>
                    <label style={styles.label}>Completude (0-10):</label>
                    <input
                      type="range"
                      min="0"
                      max="10"
                      value={avaliacaoForm.criterio_completude}
                      onChange={(e) => setAvaliacaoForm({ ...avaliacaoForm, criterio_completude: parseInt(e.target.value) })}
                      style={styles.rangeInput}
                    />
                    <span style={styles.rangeValue}>{avaliacaoForm.criterio_completude}</span>
                  </div>

                  <div style={styles.criterion}>
                    <label style={styles.label}>Autenticidade (0-10):</label>
                    <input
                      type="range"
                      min="0"
                      max="10"
                      value={avaliacaoForm.criterio_autenticidade}
                      onChange={(e) => setAvaliacaoForm({ ...avaliacaoForm, criterio_autenticidade: parseInt(e.target.value) })}
                      style={styles.rangeInput}
                    />
                    <span style={styles.rangeValue}>{avaliacaoForm.criterio_autenticidade}</span>
                  </div>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Motivo de Reprovação (se aplicável):</label>
                  <textarea
                    style={styles.textarea}
                    value={avaliacaoForm.motivo_reprovacao}
                    onChange={(e) => setAvaliacaoForm({ ...avaliacaoForm, motivo_reprovacao: e.target.value })}
                    placeholder="Descreva o motivo da reprovação, se necessário"
                    rows="3"
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Observações:</label>
                  <textarea
                    style={styles.textarea}
                    value={avaliacaoForm.observacoes}
                    onChange={(e) => setAvaliacaoForm({ ...avaliacaoForm, observacoes: e.target.value })}
                    placeholder="Observações adicionais sobre a avaliação"
                    rows="3"
                  />
                </div>

                <div style={styles.modalActions}>
                  <button
                    style={{ ...styles.button, backgroundColor: '#6b7280' }}
                    onClick={() => setShowAvaliacaoModal(false)}
                  >
                    Cancelar
                  </button>
                  <button
                    style={{ ...styles.button, backgroundColor: '#d4a30d' }}
                    onClick={avaliarCandidaturaDetalhada}
                  >
                    Submeter Avaliação
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Modal de Avaliação de Entrevista */}
        {showEntrevistaModal && selectedCandidatura && (
          <div style={styles.modalOverlay}>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              style={styles.modal}
            >
              <div style={styles.modalHeader}>
                <h3 style={styles.modalTitle}>Avaliação de Entrevista</h3>
                <button
                  style={styles.modalCloseButton}
                  onClick={() => setShowEntrevistaModal(false)}
                >
                  ×
                </button>
              </div>

              <div style={styles.modalBody}>
                <div style={styles.candidaturaInfoModal}>
                  <h4>{selectedCandidatura.nome_completo || 'Candidato'}</h4>
                  <p>{selectedCandidatura.categoria_nome || 'MMV'} • {selectedCandidatura.email}</p>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    <input
                      type="checkbox"
                      checked={entrevistaForm.entrevista_realizada}
                      onChange={(e) => setEntrevistaForm({ ...entrevistaForm, entrevista_realizada: e.target.checked })}
                    />
                    Entrevista Realizada
                  </label>
                </div>

                {entrevistaForm.entrevista_realizada && (
                  <>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Data da Entrevista:</label>
                      <input
                        type="date"
                        style={styles.input}
                        value={entrevistaForm.data_entrevista}
                        onChange={(e) => setEntrevistaForm({ ...entrevistaForm, data_entrevista: e.target.value })}
                      />
                    </div>

                    <div style={styles.criteriaGrid}>
                      <div style={styles.criterion}>
                        <label style={styles.label}>Comunicação (0-10):</label>
                        <input
                          type="range"
                          min="0"
                          max="10"
                          value={entrevistaForm.criterio_comunicacao}
                          onChange={(e) => setEntrevistaForm({ ...entrevistaForm, criterio_comunicacao: parseInt(e.target.value) })}
                          style={styles.rangeInput}
                        />
                        <span style={styles.rangeValue}>{entrevistaForm.criterio_comunicacao}</span>
                      </div>

                      <div style={styles.criterion}>
                        <label style={styles.label}>Conhecimento (0-10):</label>
                        <input
                          type="range"
                          min="0"
                          max="10"
                          value={entrevistaForm.criterio_conhecimento}
                          onChange={(e) => setEntrevistaForm({ ...entrevistaForm, criterio_conhecimento: parseInt(e.target.value) })}
                          style={styles.rangeInput}
                        />
                        <span style={styles.rangeValue}>{entrevistaForm.criterio_conhecimento}</span>
                      </div>

                      <div style={styles.criterion}>
                        <label style={styles.label}>Atitude (0-10):</label>
                        <input
                          type="range"
                          min="0"
                          max="10"
                          value={entrevistaForm.criterio_atitude}
                          onChange={(e) => setEntrevistaForm({ ...entrevistaForm, criterio_atitude: parseInt(e.target.value) })}
                          style={styles.rangeInput}
                        />
                        <span style={styles.rangeValue}>{entrevistaForm.criterio_atitude}</span>
                      </div>

                      <div style={styles.criterion}>
                        <label style={styles.label}>Experiência (0-10):</label>
                        <input
                          type="range"
                          min="0"
                          max="10"
                          value={entrevistaForm.criterio_experiencia}
                          onChange={(e) => setEntrevistaForm({ ...entrevistaForm, criterio_experiencia: parseInt(e.target.value) })}
                          style={styles.rangeInput}
                        />
                        <span style={styles.rangeValue}>{entrevistaForm.criterio_experiencia}</span>
                      </div>

                      <div style={styles.criterion}>
                        <label style={styles.label}>Motivação (0-10):</label>
                        <input
                          type="range"
                          min="0"
                          max="10"
                          value={entrevistaForm.criterio_motivacao}
                          onChange={(e) => setEntrevistaForm({ ...entrevistaForm, criterio_motivacao: parseInt(e.target.value) })}
                          style={styles.rangeInput}
                        />
                        <span style={styles.rangeValue}>{entrevistaForm.criterio_motivacao}</span>
                      </div>
                    </div>

                    <div style={styles.formGroup}>
                      <label style={styles.label}>Pontuação da Entrevista (0-100):</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        style={styles.input}
                        value={entrevistaForm.pontuacao_entrevista}
                        onChange={(e) => setEntrevistaForm({ ...entrevistaForm, pontuacao_entrevista: parseInt(e.target.value) || 0 })}
                      />
                    </div>

                    <div style={styles.formGroup}>
                      <label style={styles.label}>Observações da Entrevista:</label>
                      <textarea
                        style={styles.textarea}
                        value={entrevistaForm.observacoes_entrevista}
                        onChange={(e) => setEntrevistaForm({ ...entrevistaForm, observacoes_entrevista: e.target.value })}
                        placeholder="Observações sobre a entrevista..."
                        rows="3"
                      />
                    </div>

                    <div style={styles.formGroup}>
                      <label style={styles.label}>Recomendações:</label>
                      <textarea
                        style={styles.textarea}
                        value={entrevistaForm.recomendacoes}
                        onChange={(e) => setEntrevistaForm({ ...entrevistaForm, recomendacoes: e.target.value })}
                        placeholder="Recomendações para o candidato..."
                        rows="2"
                      />
                    </div>
                  </>
                )}

                <div style={styles.modalFooter}>
                  <button
                    style={{ ...styles.button, backgroundColor: '#d4a30d' }}
                    onClick={avaliarEntrevista}
                  >
                    {entrevistaForm.entrevista_realizada ? 'Avaliar Entrevista' : 'Marcar como Não Realizada'}
                  </button>
                  <button
                    style={{ ...styles.button, backgroundColor: '#6c757d' }}
                    onClick={() => setShowEntrevistaModal(false)}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Modal de Registro Presencial */}
        {showRegistroPresencialModal && (
          <div style={styles.modalOverlay}>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              style={styles.modal}
            >
              <div style={styles.modalHeader}>
                <h3 style={styles.modalTitle}>Registro de Candidatura Presencial</h3>
                <button
                  style={styles.modalCloseButton}
                  onClick={() => setShowRegistroPresencialModal(false)}
                >
                  ×
                </button>
              </div>

              <div style={styles.modalBody}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Nome Completo:</label>
                  <input
                    type="text"
                    style={styles.input}
                    value={registroPresencialForm.nome_completo}
                    onChange={(e) => setRegistroPresencialForm({ ...registroPresencialForm, nome_completo: e.target.value })}
                    placeholder="Nome completo do candidato"
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>NUIT:</label>
                  <input
                    type="text"
                    style={styles.input}
                    value={registroPresencialForm.nuit}
                    onChange={(e) => setRegistroPresencialForm({ ...registroPresencialForm, nuit: e.target.value })}
                    placeholder="Número de Identificação Tributária"
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Número do BI:</label>
                  <input
                    type="text"
                    style={styles.input}
                    value={registroPresencialForm.bi_numero}
                    onChange={(e) => setRegistroPresencialForm({ ...registroPresencialForm, bi_numero: e.target.value })}
                    placeholder="Número do Bilhete de Identidade"
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Gênero:</label>
                  <select
                    style={styles.select}
                    value={registroPresencialForm.genero}
                    onChange={(e) => setRegistroPresencialForm({ ...registroPresencialForm, genero: e.target.value })}
                  >
                    <option value="Masculino">Masculino</option>
                    <option value="Feminino">Feminino</option>
                  </select>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Data de Nascimento:</label>
                  <input
                    type="date"
                    style={styles.input}
                    value={registroPresencialForm.data_nascimento}
                    onChange={(e) => setRegistroPresencialForm({ ...registroPresencialForm, data_nascimento: e.target.value })}
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Contacto Principal:</label>
                  <input
                    type="tel"
                    style={styles.input}
                    value={registroPresencialForm.contacto_principal}
                    onChange={(e) => setRegistroPresencialForm({ ...registroPresencialForm, contacto_principal: e.target.value })}
                    placeholder="+258 8X XXX XXXX"
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Email:</label>
                  <input
                    type="email"
                    style={styles.input}
                    value={registroPresencialForm.email}
                    onChange={(e) => setRegistroPresencialForm({ ...registroPresencialForm, email: e.target.value })}
                    placeholder="email@exemplo.com"
                  />
                </div>

                {/* Novos campos para o Schema v8 */}
                <div style={styles.formGroup}>
                  <label style={styles.label}>Categoria de Cargo:</label>
                  <select
                    style={styles.select}
                    value={registroPresencialForm.categoria_id}
                    onChange={(e) => setRegistroPresencialForm({ ...registroPresencialForm, categoria_id: e.target.value })}
                  >
                    <option value="">Seleccione a Categoria</option>
                    {categorias.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.nome}</option>
                    ))}
                  </select>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Província:</label>
                  <select
                    style={styles.select}
                    value={registroPresencialForm.provincia_id}
                    onChange={(e) => {
                      const id = e.target.value;
                      setRegistroPresencialForm({ ...registroPresencialForm, provincia_id: id, distrito_id: '' });
                      carregarDistritos(id);
                    }}
                  >
                    <option value="">Seleccione a Província</option>
                    {provincias.map(p => (
                      <option key={p.id} value={p.id}>{p.nome}</option>
                    ))}
                  </select>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Distrito:</label>
                  <select
                    style={styles.select}
                    value={registroPresencialForm.distrito_id}
                    onChange={(e) => setRegistroPresencialForm({ ...registroPresencialForm, distrito_id: e.target.value })}
                    disabled={!registroPresencialForm.provincia_id}
                  >
                    <option value="">Seleccione o Distrito</option>
                    {distritos.map(d => (
                      <option key={d.id} value={d.id}>{d.nome}</option>
                    ))}
                  </select>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Documento do BI:</label>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => setRegistroPresencialForm({ ...registroPresencialForm, documento_bi: e.target.files[0] })}
                    style={styles.input}
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Certificado:</label>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => setRegistroPresencialForm({ ...registroPresencialForm, documento_certificado: e.target.files[0] })}
                    style={styles.input}
                  />
                </div>

                <div style={styles.modalActions}>
                  <button
                    style={{ ...styles.button, backgroundColor: '#6b7280' }}
                    onClick={() => setShowRegistroPresencialModal(false)}
                  >
                    Cancelar
                  </button>
                  <button
                    style={{ ...styles.button, backgroundColor: '#10b981' }}
                    onClick={registrarCandidaturaPresencial}
                  >
                    Registrar Candidatura
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
        {/* Modal Pauta Formulário */}
        {showPautaModal && selectedTurmaParaPauta && (
          <div style={styles.modalOverlay}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              style={{ ...styles.modal, width: '900px', maxWidth: '95vw' }}
            >
              <div style={styles.modalHeader}>
                <h3 style={styles.modalTitle}>Avaliação de Turma: {selectedTurmaParaPauta.nome}</h3>
                <button style={styles.modalCloseButton} onClick={() => setShowPautaModal(false)}>×</button>
              </div>
              <div style={{ ...styles.modalBody, maxHeight: '60vh', overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#1e293b', textAlign: 'left', color: '#94a3b8' }}>
                      <th style={{ padding: '10px', borderBottom: '1px solid #334155' }}>Candidato</th>
                      <th style={{ padding: '10px', borderBottom: '1px solid #334155' }}>Presenças</th>
                      <th style={{ padding: '10px', borderBottom: '1px solid #334155' }}>Faltas</th>
                      <th style={{ padding: '10px', borderBottom: '1px solid #334155' }}>Nota (0-20)</th>
                      <th style={{ padding: '10px', borderBottom: '1px solid #334155' }}>Obs.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formandosPauta.map((formando, index) => (
                      <tr key={formando.formando_id}>
                        <td style={{ padding: '10px', borderBottom: '1px solid #334155', color: '#fff' }}>
                          {formando.nome_completo}
                        </td>
                        <td style={{ padding: '10px', borderBottom: '1px solid #334155' }}>
                          <input 
                            type="number" 
                            style={styles.input} 
                            value={formando.presencas}
                            onChange={(e) => {
                              const newF = [...formandosPauta];
                              newF[index].presencas = parseInt(e.target.value) || 0;
                              setFormandosPauta(newF);
                            }}
                          />
                        </td>
                        <td style={{ padding: '10px', borderBottom: '1px solid #334155' }}>
                          <input 
                            type="number" 
                            style={styles.input} 
                            value={formando.faltas}
                            onChange={(e) => {
                              const newF = [...formandosPauta];
                              newF[index].faltas = parseInt(e.target.value) || 0;
                              setFormandosPauta(newF);
                            }}
                          />
                        </td>
                        <td style={{ padding: '10px', borderBottom: '1px solid #334155' }}>
                          <input 
                            type="number" 
                            style={styles.input} 
                            value={formando.nota_final}
                            min="0" max="20" step="0.5"
                            onChange={(e) => {
                              const newF = [...formandosPauta];
                              newF[index].nota_final = parseFloat(e.target.value) || 0;
                              setFormandosPauta(newF);
                            }}
                          />
                        </td>
                        <td style={{ padding: '10px', borderBottom: '1px solid #334155' }}>
                          <input 
                            type="text" 
                            style={styles.input} 
                            value={formando.observacoes}
                            onChange={(e) => {
                              const newF = [...formandosPauta];
                              newF[index].observacoes = e.target.value;
                              setFormandosPauta(newF);
                            }}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {formandosPauta.length === 0 && (
                  <p style={{ textAlign: 'center', color: '#94a3b8', marginTop: '20px' }}>Nenhum formando adicionado a esta turma.</p>
                )}
              </div>
              <div style={styles.modalActions}>
                <button style={{ ...styles.button, backgroundColor: '#6b7280' }} onClick={() => setShowPautaModal(false)}>Cancelar</button>
                <button style={{ ...styles.button, backgroundColor: '#10b981' }} onClick={salvarPauta}>Salvar Pauta e Enviar SMS</button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Modal Detalhes Turma */}
        {showDetalhesTurmaModal && turmaDetalhesSelecionada && (
          <div style={styles.modalOverlay}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{ ...styles.modal, width: '500px' }}
            >
              <div style={styles.modalHeader}>
                <h3 style={styles.modalTitle}>Detalhes da Turma</h3>
                <button
                  style={styles.modalCloseButton}
                  onClick={() => setShowDetalhesTurmaModal(false)}
                >
                  ×
                </button>
              </div>

              <div style={styles.modalBody}>
                <div style={styles.candidaturaInfoModal}>
                  <h4 style={{ color: '#d4a30d', fontSize: '20px', marginBottom: '8px' }}>
                    {turmaDetalhesSelecionada.nome}
                  </h4>
                  <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '20px' }}>
                    Código: <strong>{turmaDetalhesSelecionada.codigo}</strong>
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <div style={{ backgroundColor: '#0f172a', padding: '15px', borderRadius: '8px', border: '1px solid #334155' }}>
                     <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#94a3b8' }}><MapPin size={14} style={{ marginRight: '6px' }}/> Localização</p>
                     <p style={{ margin: 0, color: 'white', fontWeight: '500' }}>{turmaDetalhesSelecionada.centro_nome || 'Não definido'}</p>
                  </div>
                  
                  <div style={{ backgroundColor: '#0f172a', padding: '15px', borderRadius: '8px', border: '1px solid #334155' }}>
                     <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#94a3b8' }}><Users size={14} style={{ marginRight: '6px' }}/> Vagas Ocupadas</p>
                     <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#d4a30d' }}>{turmaDetalhesSelecionada.vagas_preenchidas || 0}</span>
                        <span style={{ color: '#64748b' }}>/ {turmaDetalhesSelecionada.capacidade_maxima}</span>
                     </div>
                  </div>

                  <div style={{ backgroundColor: '#0f172a', padding: '15px', borderRadius: '8px', border: '1px solid #334155' }}>
                     <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#94a3b8' }}><User size={14} style={{ marginRight: '6px' }}/> Formador Principal</p>
                     <p style={{ margin: 0, color: 'white', fontWeight: '500' }}>{turmaDetalhesSelecionada.formador_principal_nome || 'Por indicar'}</p>
                  </div>
                </div>

                <div style={styles.modalActions}>
                  <button
                    style={styles.primaryButton}
                    onClick={() => setShowDetalhesTurmaModal(false)}
                  >
                    Fechar Detalhes
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Modal Nova Turma */}
        {showNovaTurmaModal && (
          <div style={styles.modalOverlay}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              style={{ ...styles.modal, width: '600px', maxWidth: '95vw' }}
            >
              <div style={styles.modalHeader}>
                <h3 style={styles.modalTitle}>Criar Nova Turma</h3>
                <button style={styles.modalCloseButton} onClick={() => setShowNovaTurmaModal(false)}>×</button>
              </div>
              <div style={{ ...styles.modalBody, maxHeight: '60vh', overflowY: 'auto' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Nome da Turma</label>
                    <input style={styles.input} type="text" value={novaTurmaForm.nome} onChange={e => setNovaTurmaForm({...novaTurmaForm, nome: e.target.value})} placeholder="Ex: MMV-01 Beira" />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Código</label>
                    <input style={styles.input} type="text" value={novaTurmaForm.codigo} onChange={e => setNovaTurmaForm({...novaTurmaForm, codigo: e.target.value})} placeholder="BEI-MMV-A1" />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Processo Eleitoral</label>
                    <select style={styles.select} value={novaTurmaForm.processo_id} onChange={e => setNovaTurmaForm({...novaTurmaForm, processo_id: e.target.value})}>
                      <option value="">Selecione...</option>
                      {processos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                    </select>
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Categoria</label>
                    <select style={styles.select} value={novaTurmaForm.categoria_id} onChange={e => setNovaTurmaForm({...novaTurmaForm, categoria_id: e.target.value})}>
                      <option value="">Selecione...</option>
                      {categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                    </select>
                  </div>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Centro de Formação</label>
                  <select style={styles.select} value={novaTurmaForm.centro_id} onChange={e => setNovaTurmaForm({...novaTurmaForm, centro_id: e.target.value})}>
                    <option value="">Selecione...</option>
                    {centros.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' }}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Data Início</label>
                    <input style={styles.input} type="date" value={novaTurmaForm.data_inicio} onChange={e => setNovaTurmaForm({...novaTurmaForm, data_inicio: e.target.value})} />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Data Fim</label>
                    <input style={styles.input} type="date" value={novaTurmaForm.data_fim} onChange={e => setNovaTurmaForm({...novaTurmaForm, data_fim: e.target.value})} />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Vagas</label>
                    <input style={styles.input} type="number" min="1" value={novaTurmaForm.capacidade_maxima} onChange={e => setNovaTurmaForm({...novaTurmaForm, capacidade_maxima: parseInt(e.target.value)})} />
                  </div>
                </div>
                
                <div style={styles.formGroup}>
                  <label style={styles.label}>Horário (ex: 08:00 - 12:00)</label>
                  <input style={styles.input} type="text" value={novaTurmaForm.horario} onChange={e => setNovaTurmaForm({...novaTurmaForm, horario: e.target.value})} />
                </div>
              </div>
              <div style={styles.modalActions}>
                <button style={{ ...styles.button, backgroundColor: '#6b7280' }} onClick={() => setShowNovaTurmaModal(false)}>Cancelar</button>
                <button style={{ ...styles.button, backgroundColor: '#10b981' }} onClick={salvarNovaTurma}>Guardar Turma</button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Modal Distribuir Formandos */}
        {showDistribuirModal && turmaDistribuicaoSelecionada && (
          <div style={styles.modalOverlay}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              style={{ ...styles.modal, width: '800px', maxWidth: '95vw' }}
            >
              <div style={styles.modalHeader}>
                <h3 style={styles.modalTitle}>Afectar Formandos: {turmaDistribuicaoSelecionada.nome}</h3>
                <button style={styles.modalCloseButton} onClick={() => setShowDistribuirModal(false)}>×</button>
              </div>
              <div style={{ ...styles.modalBody, maxHeight: '60vh', overflowY: 'auto' }}>
                <div style={{ marginBottom: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <p style={{ margin: 0, color: '#94a3b8' }}>Selecione os candidatos que farão parte desta turma. Vagas disponíveis: <strong style={{ color: '#d4a30d'}}>{turmaDistribuicaoSelecionada.capacidade_maxima - (turmaDistribuicaoSelecionada.vagas_preenchidas || 0)}</strong></p>
                  <p style={{ margin: 0, color: '#fff' }}>Selecionados: <strong>{candidatosSelecionados.length}</strong></p>
                </div>
                
                <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#1e293b', textAlign: 'left', color: '#94a3b8' }}>
                      <th style={{ padding: '10px', borderBottom: '1px solid #334155', width: '40px' }}>
                        <input 
                          type="checkbox" 
                          checked={candidatosSelecionados.length === candidatosDisponiveis.length && candidatosDisponiveis.length > 0}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setCandidatosSelecionados(candidatosDisponiveis.map(c => c.id));
                            } else {
                              setCandidatosSelecionados([]);
                            }
                          }}
                        />
                      </th>
                      <th style={{ padding: '10px', borderBottom: '1px solid #334155' }}>Nome</th>
                      <th style={{ padding: '10px', borderBottom: '1px solid #334155' }}>Contacto</th>
                      <th style={{ padding: '10px', borderBottom: '1px solid #334155' }}>Entrevista</th>
                    </tr>
                  </thead>
                  <tbody>
                    {candidatosDisponiveis.length > 0 ? candidatosDisponiveis.map((cand) => (
                      <tr key={cand.id} style={{ backgroundColor: candidatosSelecionados.includes(cand.id) ? '#334155' : 'transparent', transition: 'background-color 0.2s', cursor: 'pointer' }} onClick={() => alternarSelecaoCandidato(cand.id)}>
                        <td style={{ padding: '10px', borderBottom: '1px solid #334155' }}>
                          <input 
                            type="checkbox" 
                            checked={candidatosSelecionados.includes(cand.id)}
                            onChange={() => {}} // Handler no tr
                          />
                        </td>
                        <td style={{ padding: '10px', borderBottom: '1px solid #334155', color: '#fff' }}>{cand.nome_completo}</td>
                        <td style={{ padding: '10px', borderBottom: '1px solid #334155', color: '#94a3b8' }}>{cand.contacto_principal || cand.telefone || 'N/A'}</td>
                        <td style={{ padding: '10px', borderBottom: '1px solid #334155', color: '#10b981', fontWeight: 'bold' }}>{cand.pontuacao_entrevista || 'N/A'}/100</td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan="4" style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>Nenhum candidato aprovado e disponível nesta categoria.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div style={styles.modalActions}>
                <button style={{ ...styles.button, backgroundColor: '#6b7280' }} onClick={() => setShowDistribuirModal(false)}>Cancelar</button>
                <button style={{ ...styles.button, backgroundColor: '#10b981' }} onClick={salvarDistribuicaoFormandos} disabled={candidatosSelecionados.length === 0}>Alocar {candidatosSelecionados.length} Formandos</button>
              </div>
            </motion.div>
          </div>
        )}
        {/* Modal Nova Notificacao */}
        {showNovaNotificacaoModal && (
          <div style={styles.modalOverlay}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{ ...styles.modal, width: '500px' }}
            >
              <div style={styles.modalHeader}>
                <h3 style={styles.modalTitle}>Redigir Notificação (SMS)</h3>
                <button
                  style={styles.modalCloseButton}
                  onClick={() => setShowNovaNotificacaoModal(false)}
                >
                  ×
                </button>
              </div>

              <div style={styles.modalBody}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Público Alvo</label>
                  <select
                    style={styles.select}
                    value={novaNotificacaoForm.publico_alvo}
                    onChange={(e) => setNovaNotificacaoForm({ ...novaNotificacaoForm, publico_alvo: e.target.value })}
                  >
                    <option value="todos">Todos os Candidatos Recenseados</option>
                    <option value="pendentes">Apenas Candidatos Pendentes</option>
                    <option value="aprovados">Candidatos Aprovados</option>
                    <option value="reprovados">Candidatos Reprovados</option>
                    <option value="alocados_formacao">Formandos (Apenas Afectos a Turmas)</option>
                  </select>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Título (Referência Interna)</label>
                  <input
                    type="text"
                    style={styles.input}
                    value={novaNotificacaoForm.titulo}
                    onChange={(e) => setNovaNotificacaoForm({ ...novaNotificacaoForm, titulo: e.target.value })}
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Mensagem SMS</label>
                  <textarea
                    style={styles.textarea}
                    rows="4"
                    placeholder="Escreva a mensagem que os candidatos vão receber instantaneamente no telemóvel..."
                    value={novaNotificacaoForm.mensagem}
                    onChange={(e) => setNovaNotificacaoForm({ ...novaNotificacaoForm, mensagem: e.target.value })}
                  />
                  <small style={{ color: '#64748b', marginTop: '4px', display: 'block' }}>
                    Caracteres: {novaNotificacaoForm.mensagem.length} (Max 160 recomendado)
                  </small>
                </div>

                <div style={styles.modalActions}>
                  <button
                    style={{ ...styles.button, backgroundColor: '#6c757d' }}
                    onClick={() => setShowNovaNotificacaoModal(false)}
                  >
                    Cancelar
                  </button>
                  <button
                    style={styles.primaryButton}
                    onClick={enviarNovaNotificacao}
                  >
                    <Mail size={16} /> Disparar Lote SMS
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
};

// Estilos
const styles = {
  container: {
    display: 'flex',
    minHeight: '100vh',
    backgroundColor: '#0f172a',
    color: 'white',
    fontFamily: '"Inter", sans-serif'
  },
  sidebar: {
    width: '280px',
    backgroundColor: '#1e293b',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column'
  },
  logoContainer: {
    marginBottom: '40px'
  },
  logo: {
    width: '50px',
    marginBottom: '12px'
  },
  logoTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#d4a30d',
    margin: 0
  },
  logoSubtitle: {
    fontSize: '12px',
    color: '#94a3b8',
    margin: 0
  },
  nav: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    flex: 1
  },
  navButton: (active) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    backgroundColor: active ? '#d4a30d' : 'transparent',
    color: active ? '#000' : '#94a3b8',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: active ? '600' : '400',
    fontSize: '14px',
    transition: 'all 0.2s',
    '&:hover': {
      backgroundColor: active ? '#d4a30d' : '#334155'
    }
  }),
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    paddingTop: '20px',
    borderTop: '1px solid #334155'
  },
  userAvatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: '#d4a30d',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  userName: {
    fontSize: '14px',
    fontWeight: '600',
    margin: 0
  },
  userRole: {
    fontSize: '12px',
    color: '#94a3b8',
    margin: 0
  },
  main: {
    flex: 1,
    padding: '32px',
    overflowY: 'auto'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '32px'
  },
  title: {
    fontSize: '24px',
    fontWeight: 'bold',
    margin: 0
  },
  headerActions: {
    display: 'flex',
    gap: '12px'
  },
  refreshButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 16px',
    backgroundColor: '#334155',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500'
  },
  loading: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '200px'
  },
  content: {
    maxWidth: '1200px',
    margin: '0 auto'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '20px',
    marginBottom: '32px'
  },
  statCard: {
    backgroundColor: '#1e293b',
    padding: '24px',
    borderRadius: '12px',
    border: '1px solid #334155',
    textAlign: 'center'
  },
  statNumber: {
    fontSize: '32px',
    fontWeight: 'bold',
    margin: '0 0 8px 0'
  },
  statLabel: {
    fontSize: '14px',
    color: '#94a3b8',
    margin: 0
  },
  dashboardSections: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '24px'
  },
  sectionCard: {
    backgroundColor: '#1e293b',
    padding: '24px',
    borderRadius: '12px',
    border: '1px solid #334155'
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px'
  },
  viewAllButton: {
    padding: '6px 12px',
    backgroundColor: 'transparent',
    color: '#d4a30d',
    border: '1px solid #d4a30d',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '500'
  },
  table: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  tableRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px',
    backgroundColor: '#0f172a',
    borderRadius: '8px'
  },
  tablePrimary: {
    fontSize: '14px',
    fontWeight: '600',
    margin: '0 0 4px 0'
  },
  tableSecondary: {
    fontSize: '12px',
    color: '#94a3b8',
    margin: 0
  },
  tableActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  statusBadge: {
    padding: '4px 8px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '500'
  },
  actionButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    backgroundColor: '#334155',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '500'
  },
  pageHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px'
  },
  filters: {
    display: 'flex',
    gap: '8px'
  },
  filter: {
    padding: '8px 16px',
    backgroundColor: '#1e293b',
    color: '#94a3b8',
    border: '1px solid #334155',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px'
  },
  filterActive: {
    padding: '8px 16px',
    backgroundColor: '#d4a30d',
    color: '#000',
    border: '1px solid #d4a30d',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600'
  },
  searchBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 16px',
    backgroundColor: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '8px',
    width: '300px'
  },
  searchInput: {
    backgroundColor: 'transparent',
    border: 'none',
    color: 'white',
    fontSize: '14px',
    width: '100%',
    outline: 'none'
  },
  tableContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  candidaturaCard: {
    backgroundColor: '#1e293b',
    padding: '20px',
    borderRadius: '12px',
    border: '1px solid #334155'
  },
  candidaturaInfo: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '16px'
  },
  candidaturaName: {
    fontSize: '16px',
    fontWeight: '600',
    margin: '0 0 8px 0'
  },
  candidaturaDetails: {
    fontSize: '13px',
    color: '#94a3b8',
    margin: '0 0 4px 0'
  },
  candidaturaStatus: {
    display: 'flex',
    alignItems: 'center'
  },
  candidaturaActions: {
    display: 'flex',
    gap: '8px'
  },
  turmaCard: {
    backgroundColor: '#1e293b',
    padding: '20px',
    borderRadius: '12px',
    border: '1px solid #334155',
    marginBottom: '16px'
  },
  turmaHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px'
  },
  turmaName: {
    fontSize: '18px',
    fontWeight: '600',
    margin: '0 0 4px 0'
  },
  turmaCode: {
    fontSize: '14px',
    color: '#94a3b8',
    margin: 0
  },
  turmaDetails: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px'
  },
  turmaInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  turmaStats: {
    textAlign: 'center'
  },
  stat: {
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: '4px',
    marginBottom: '4px'
  },
  statDescription: {
    fontSize: '12px',
    color: '#94a3b8',
    margin: 0
  },
  turmaActions: {
    display: 'flex',
    gap: '8px'
  },
  primaryButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 20px',
    backgroundColor: '#d4a30d',
    color: '#000',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600'
  },
  // Modal styles
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000
  },
  modal: {
    backgroundColor: '#1e293b',
    borderRadius: '12px',
    border: '1px solid #334155',
    width: '90%',
    maxWidth: '600px',
    maxHeight: '90vh',
    overflowY: 'auto'
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px',
    borderBottom: '1px solid #334155'
  },
  modalTitle: {
    fontSize: '18px',
    fontWeight: '600',
    margin: 0
  },
  modalCloseButton: {
    backgroundColor: 'transparent',
    border: 'none',
    color: '#94a3b8',
    fontSize: '24px',
    cursor: 'pointer',
    padding: '0',
    width: '30px',
    height: '30px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  modalBody: {
    padding: '20px'
  },
  candidaturaInfoModal: {
    marginBottom: '20px',
    paddingBottom: '15px',
    borderBottom: '1px solid #334155'
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
  select: {
    width: '100%',
    padding: '10px',
    backgroundColor: '#0f172a',
    border: '1px solid #334155',
    borderRadius: '8px',
    color: 'white',
    fontSize: '14px'
  },
  criteriaGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '20px',
    marginBottom: '20px'
  },
  criterion: {
    backgroundColor: '#0f172a',
    padding: '15px',
    borderRadius: '8px',
    border: '1px solid #334155'
  },
  rangeInput: {
    width: '100%',
    margin: '10px 0'
  },
  rangeValue: {
    display: 'inline-block',
    width: '30px',
    textAlign: 'center',
    fontWeight: 'bold',
    color: '#d4a30d'
  },
  textarea: {
    width: '100%',
    padding: '10px',
    backgroundColor: '#0f172a',
    border: '1px solid #334155',
    borderRadius: '8px',
    color: 'white',
    fontSize: '14px',
    fontFamily: 'inherit',
    resize: 'vertical'
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    marginTop: '20px'
  },
  button: {
    padding: '10px 20px',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    color: 'white'
  },
  statsGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px'
  },
  statCard: {
    backgroundColor: '#1E293B', padding: '20px', borderRadius: '12px', border: '1px solid #334155'
  },
  statTitle: {
    color: '#94A3B8', fontSize: '14px', margin: '0 0 8px 0', fontWeight: '500'
  },
  statValue: {
    color: '#D4A30D', fontSize: '32px', fontWeight: 'bold'
  },
  th: {
    padding: '12px 16px', textAlign: 'left', borderBottom: '1px solid #334155', color: '#94A3B8', fontSize: '14px', fontWeight: '600'
  },
  td: {
    padding: '12px 16px', borderBottom: '1px solid #334155', color: 'white', fontSize: '14px'
  },
  tr: {
    transition: 'background-color 0.2s', '&:hover': { backgroundColor: '#334155' }
  }
};

export default App;
