import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Users, LayoutDashboard, GraduationCap, Bell, BarChart,
  Settings, User, Plus, CheckCircle, XCircle, FileText,
  Search, Filter, Download, RefreshCw, Eye, Edit, Trash2,
  Calendar, Clock, MapPin, Mail, Phone, Check, X
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const App = () => {
  const [view, setView] = useState('dashboard');
  const [candidaturas, setCandidaturas] = useState([]);
  const [turmas, setTurmas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedCandidatura, setSelectedCandidatura] = useState(null);
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [showAvaliacaoModal, setShowAvaliacaoModal] = useState(false);
  const [showRegistroPresencialModal, setShowRegistroPresencialModal] = useState(false);
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
  }, []);

  const carregarDados = async () => {
    setLoading(true);
    try {
      const [candidaturasRes, turmasRes] = await Promise.all([
        fetch(`${API_URL}/api/candidaturas`),
        fetch(`${API_URL}/api/turmas`)
      ]);

      if (candidaturasRes.ok) {
        const data = await candidaturasRes.json();
        setCandidaturas(data.candidaturas || []);
      }

      if (turmasRes.ok) {
        const data = await turmasRes.json();
        setTurmas(data.turmas || []);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
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

    try {
      const response = await fetch(`${API_URL}/api/candidaturas/${selectedCandidatura.id}/avaliar-detalhada`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...avaliacaoForm,
          avaliado_por: 'admin' // Em produção, usar ID do utilizador logado
        })
      });

      if (response.ok) {
        alert('Avaliação realizada com sucesso!');
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

      // Adicionar utilizador_id fictício (em produção, seria criado um utilizador)
      formData.append('utilizador_id', 'presencial-' + Date.now());
      formData.append('processo_id', 'default-process-id'); // ID do processo eleitoral atual

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
                  <h2>Gestão de Formação</h2>
                  <button style={styles.primaryButton}>
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
                        <button style={styles.actionButton}>
                          <Eye size={16} /> Ver Detalhes
                        </button>
                        <button style={styles.actionButton}>
                          <Users size={16} /> Adicionar Formandos
                        </button>
                        <button style={styles.actionButton}>
                          <Calendar size={16} /> Presenças
                        </button>
                        <button style={styles.actionButton}>
                          <Edit size={16} /> Editar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
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
  }
};

export default App;
