import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Users, LayoutDashboard, GraduationCap, Bell, BarChart,
    Settings, User, Plus, CheckCircle, XCircle, FileText,
    Search, Filter, Download, RefreshCw, Eye, Edit, Trash2,
    Calendar, Clock, MapPin, Mail, Phone, Check, X
} from 'lucide-react';

// SERVIDOR DE TESTE - PORTA 5001
const API_URL = 'http://localhost:5001';

const AppTest = () => {
    const [view, setView] = useState('dashboard');
    const [candidaturas, setCandidaturas] = useState([]);
    const [turmas, setTurmas] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedCandidatura, setSelectedCandidatura] = useState(null);
    const [filtroEstado, setFiltroEstado] = useState('todos');
    const [showAvaliacaoModal, setShowAvaliacaoModal] = useState(false);
    const [showEntrevistaModal, setShowEntrevistaModal] = useState(false);

    const [avaliacaoForm, setAvaliacaoForm] = useState({
        documento_bi_estado: 'aprovado',
        documento_certificado_estado: 'aprovado',
        criterio_validade_bi: 8,
        criterio_validade_certificado: 7,
        criterio_legibilidade: 9,
        criterio_completude: 8,
        criterio_autenticidade: 7,
        motivo_reprovacao: '',
        observacoes: ''
    });

    const [entrevistaForm, setEntrevistaForm] = useState({
        entrevista_realizada: true,
        data_entrevista: new Date().toISOString().split('T')[0],
        entrevistador_id: 'admin-test',
        pontuacao_entrevista: 0,
        observacoes_entrevista: '',
        criterio_comunicacao: 0,
        criterio_conhecimento: 0,
        criterio_atitude: 0,
        criterio_experiencia: 0,
        criterio_motivacao: 0,
        recomendacoes: ''
    });

    // Carregar dados
    const carregarDados = async () => {
        setLoading(true);
        try {
            const [candidaturasRes, turmasRes] = await Promise.all([
                fetch(`${API_URL}/api/candidaturas`),
                fetch(`${API_URL}/api/turmas`)
            ]);

            if (candidaturasRes.ok) {
                const candidaturasData = await candidaturasRes.json();
                setCandidaturas(candidaturasData);
                console.log('✅ Candidaturas carregadas:', candidaturasData);
            }

            if (turmasRes.ok) {
                const turmasData = await turmasRes.json();
                setTurmas(turmasData);
            }
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        carregarDados();
    }, []);

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
            console.log('📤 Enviando avaliação de entrevista:', entrevistaForm);

            const response = await fetch(`${API_URL}/api/candidaturas/${selectedCandidatura.id}/avaliar-entrevista`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(entrevistaForm)
            });

            if (response.ok) {
                const data = await response.json();
                alert(`✅ ${data.message}\n\nPontuação Final: ${data.dados?.pontuacao_final || 'N/A'}\nResultado: ${data.dados?.resultado_final || 'N/A'}`);
                carregarDados();
                setShowEntrevistaModal(false);
                setSelectedCandidatura(null);
            } else {
                const errorData = await response.json();
                alert(`❌ Erro: ${errorData.error || 'Erro desconhecido'}`);
            }
        } catch (error) {
            console.error('Erro ao avaliar entrevista:', error);
            alert('❌ Erro ao avaliar entrevista');
        }
    };

    // Estilos
    const styles = {
        container: { display: 'flex', minHeight: '100vh', backgroundColor: '#f8fafc' },
        sidebar: { width: '250px', backgroundColor: '#1e293b', color: 'white', padding: '20px' },
        main: { flex: 1, padding: '30px' },
        header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' },
        title: { fontSize: '24px', fontWeight: 'bold', color: '#1e293b' },
        content: { backgroundColor: 'white', borderRadius: '10px', padding: '25px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' },
        table: { width: '100%', borderCollapse: 'collapse' },
        tableRow: { borderBottom: '1px solid #e2e8f0' },
        tablePrimary: { padding: '15px', fontWeight: '600', color: '#1e293b' },
        tableSecondary: { padding: '15px', color: '#64748b' },
        tableActions: { padding: '15px', textAlign: 'right' },
        statusBadge: (status) => ({
            padding: '5px 12px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: '600',
            backgroundColor:
                status === 'aprovado' ? '#10b98120' :
                    status === 'pendente' ? '#f59e0b20' :
                        status === 'reprovado' ? '#ef444420' : '#6b728020',
            color:
                status === 'aprovado' ? '#10b981' :
                    status === 'pendente' ? '#f59e0b' :
                        status === 'reprovado' ? '#ef4444' : '#6b7280'
        }),
        actionButton: {
            padding: '8px 16px',
            borderRadius: '6px',
            border: 'none',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            marginLeft: '8px'
        },
        modalOverlay: {
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
        },
        modal: {
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '30px',
            width: '600px',
            maxWidth: '90%',
            maxHeight: '90vh',
            overflowY: 'auto'
        },
        modalHeader: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px'
        },
        modalTitle: { fontSize: '20px', fontWeight: 'bold', color: '#1e293b' },
        formGroup: { marginBottom: '20px' },
        label: { display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151' },
        input: {
            width: '100%',
            padding: '10px',
            borderRadius: '6px',
            border: '1px solid #d1d5db',
            fontSize: '14px'
        },
        rangeInput: {
            width: '100%',
            height: '8px',
            borderRadius: '4px',
            background: '#e5e7eb',
            outline: 'none',
            marginTop: '5px'
        },
        criteriaGrid: {
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '20px',
            marginBottom: '20px'
        },
        criterion: { marginBottom: '15px' },
        rangeValue: {
            display: 'inline-block',
            marginLeft: '10px',
            fontWeight: 'bold',
            color: '#3b82f6',
            minWidth: '30px'
        },
        textarea: {
            width: '100%',
            padding: '10px',
            borderRadius: '6px',
            border: '1px solid #d1d5db',
            fontSize: '14px',
            minHeight: '80px',
            resize: 'vertical'
        },
        modalActions: {
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '10px',
            marginTop: '30px'
        },
        button: (color) => ({
            padding: '10px 20px',
            borderRadius: '6px',
            border: 'none',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer',
            backgroundColor: color,
            color: 'white'
        })
    };

    return (
        <div style={styles.container}>
            <div style={styles.sidebar}>
                <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '30px' }}>STAE Teste</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <button onClick={() => setView('dashboard')} style={{
                        padding: '12px', borderRadius: '6px', border: 'none',
                        backgroundColor: view === 'dashboard' ? '#3b82f6' : 'transparent',
                        color: view === 'dashboard' ? 'white' : '#cbd5e1',
                        cursor: 'pointer', textAlign: 'left'
                    }}>
                        <LayoutDashboard size={18} style={{ marginRight: '10px', display: 'inline' }} />
                        Dashboard
                    </button>
                </div>
            </div>

            <div style={styles.main}>
                <div style={styles.header}>
                    <h1 style={styles.title}>Painel Administrativo - TESTE IMPLEMENTAÇÃO</h1>
                    <button onClick={carregarDados} style={{
                        padding: '10px 20px', backgroundColor: '#3b82f6', color: 'white',
                        border: 'none', borderRadius: '6px', cursor: 'pointer'
                    }}>
                        <RefreshCw size={16} style={{ marginRight: '8px', display: 'inline' }} />
                        Recarregar
                    </button>
                </div>

                <div style={styles.content}>
                    <h2 style={{ marginBottom: '20px', color: '#1e293b' }}>Candidaturas (Teste Implementação)</h2>

                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '40px' }}>Carregando...</div>
                    ) : (
                        <table style={styles.table}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                                    <th style={{ padding: '15px', textAlign: 'left', color: '#64748b' }}>Candidato</th>
                                    <th style={{ padding: '15px', textAlign: 'left', color: '#64748b' }}>Categoria</th>
                                    <th style={{ padding: '15px', textAlign: 'left', color: '#64748b' }}>Estado</th>
                                    <th style={{ padding: '15px', textAlign: 'left', color: '#64748b' }}>Entrevista</th>
                                    <th style={{ padding: '15px', textAlign: 'left', color: '#64748b' }}>Pontuação Final</th>
                                    <th style={{ padding: '15px', textAlign: 'left', color: '#64748b' }}>Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {candidaturas.map((candidatura) => (
                                    <tr key={candidatura.id} style={styles.tableRow}>
                                        <td style={styles.tablePrimary}>Candidato {candidatura.id.slice(0, 8)}</td>
                                        <td style={styles.tableSecondary}>{candidatura.categoria_id || 'MMV'}</td>
                                        <td style={styles.tableSecondary}>
                                            <span style={styles.statusBadge(candidatura.estado_geral)}>
                                                {candidatura.estado_geral || 'pendente'}
                                            </span>
                                        </td>
                                        <td style={styles.tableSecondary}>
                                            {candidatura.entrevista_realizada ? '✅ Realizada' : '⏳ Pendente'}
                                        </td>
                                        <td style={styles.tableSecondary}>
                                            {candidatura.pontuacao_final || 0} pontos
                                            {candidatura.resultado_final && ` (${candidatura.resultado_final})`}
                                        </td>
                                        <td style={styles.tableActions}>
                                            {/* BOTÃO "AVALIAR ENTREVISTA" - IMPLEMENTAÇÃO NOVA */}
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
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* MODAL DE AVALIAÇÃO DE ENTREVISTA - IMPLEMENTAÇÃO COMPLETA */}
                {showEntrevistaModal && (
                    <div style={styles.modalOverlay}>
                        <div style={styles.modal}>
                            <div style={styles.modalHeader}>
                                <h2 style={styles.modalTitle}>Avaliar Entrevista</h2>
                                <button onClick={() => setShowEntrevistaModal(false)} style={{
                                    background: 'none', border: 'none', fontSize: '20px',
                                    cursor: 'pointer', color: '#64748b'
                                }}>×</button>
                            </div>

                            <div style={styles.formGroup}>
                                <label style={styles.label}>
                                    <input
                                        type="checkbox"
                                        checked={entrevistaForm.entrevista_realizada}
                                        onChange={(e) => setEntrevistaForm({ ...entrevistaForm, entrevista_realizada: e.target.checked })}
                                    />
                                    <span style={{ marginLeft: '8px' }}>Entrevista realizada</span>
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
                                            <label style={styles.label}>Conhecimento (0-10):</label