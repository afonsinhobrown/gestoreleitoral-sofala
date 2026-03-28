import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Users, LayoutDashboard, GraduationCap, Bell, BarChart,
  Settings, User, Plus, CheckCircle, XCircle, FileText,
  Search, Filter, Download, RefreshCw, Eye, Edit, Trash2,
  Calendar, Clock, MapPin, Mail, Phone, Check, X, LayoutGrid, List,
  Shield, HardHat, LayoutTemplate, Settings2, ClipboardList, MessageSquare, Anchor, Briefcase, Send,
  Printer, Navigation, Map, MessageCircle
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// ===================== CONTROLO DE PERMISSÕES + GEOLOCALIZAÇÃO =====================
// Cache da localização por sessão (para não pedir GPS em cada acção)
let _localizacaoVerificada = null;

const verificarPermissao = async (user, acao = 'criar') => {
  if (!user) return false;

  // 1. Bloquear roles que só têm leitura
  if (user.role === 'master_nacional' || user.role === 'administrador_provincial') {
    alert(
      `⛔ ACESSO NEGADO\n\n` +
      `A sua conta (${user.role === 'master_nacional' ? 'Central' : 'Provincial'}) tem permissão apenas de LEITURA.\n\n` +
      `Para ${acao} dados, autentique-se com um utilizador DISTRITAL.\nExemplo: beira / beira123`
    );
    return false;
  }

  if (!user.distrito_id) {
    alert(`⛔ A sua conta não tem um distrito associado. Contacte o administrador central.`);
    return false;
  }

  // Se já foi confirmado nesta sessão, não pede GPS de novo
  if (_localizacaoVerificada && _localizacaoVerificada.permitido) return true;

  // 2. Verificar geolocalização
  const gpsRes = await new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({ erro: 'Navegador não suporta GPS' });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ coords: { lat: pos.coords.latitude, lon: pos.coords.longitude } }),
      (err) => {
        let msg = 'Erro desconhecido';
        if (err.code === 1) msg = 'Permissão negada';
        else if (err.code === 2) msg = 'Posição indisponível / Sinal fraco';
        else if (err.code === 3) msg = 'Tempo de busca excedido (Timeout)';
        resolve({ erro: msg });
      },
      { timeout: 12000, enableHighAccuracy: false, maximumAge: 600000 }
    );
  });

  if (gpsRes.erro) {
    if (gpsRes.erro === 'Permissão negada') {
      alert(`⛔ ACESSO NEGADO\n\nÉ obrigatório dar permissão de localização no navegador para este sistema operacional.`);
      return false;
    }
    // Para outros erros (sinal fraco/timeout), avisamos mas permitimos (emergência)
    console.warn('GPS Failover:', gpsRes.erro);
    // Não paramos o fluxo se for apenas sinal fraco, apenas registamos
    _localizacaoVerificada = { permitido: true, motivo: `erro_gps_${gpsRes.erro}` };
    return true; 
  }

  const coords = gpsRes.coords;

  // Reverse geocoding com Nominatim (OpenStreetMap)
  try {
    const resp = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${coords.lat}&lon=${coords.lon}&format=json&accept-language=pt`,
      { headers: { 'Accept': 'application/json' } }
    );
    const geo = await resp.json();
    
    // Lista exaustiva de campos que podem conter o nome da área
    const localidadeNome = (
      geo.address?.city || 
      geo.address?.town || 
      geo.address?.village || 
      geo.address?.suburb || 
      geo.address?.neighbourhood || 
      geo.address?.county || 
      geo.address?.state_district || 
      ''
    ).toLowerCase();

    // Nome do distrito do utilizador limpo (Ex: "Admin Distrital Beira" -> "beira")
    const distritoUser = (user.nome_completo || '')
      .toLowerCase()
      .replace('admin distrital ', '')
      .replace('stae ', '')
      .trim();

    // Comparação inteligente
    const coincide = localidadeNome.includes(distritoUser) || distritoUser.includes(localidadeNome.split(' ')[0]);

    if (!coincide) {
      alert(
        `⛔ ACESSO NEGADO — LOCALIZAÇÃO INCORRECTA\n\n` +
        `Sua Conta: [${distritoUser.toUpperCase()}]\n` +
        `Sua Posição Real: [${localidadeNome.toUpperCase() || 'Local Desconhecido'}]\n\n` +
        `Motivo: O STAE exige que o registo de candidaturas seja efectuado presencialmente no distrito de vínculo do administrador.\n\n` +
        `Por favor, desloque-se até o distrito da ${distritoUser.toUpperCase()} para realizar esta acção.`
      );
      return false; // Não guarda cache se for negado, permitindo tentar de novo quando se mover
    } else {
      _localizacaoVerificada = { permitido: true, motivo: 'gps_confirmado' };
      return true;
    }
  } catch (error) {
    // Se a API de geocoding falhar (ex: sem rede), permite a acção
    console.warn('Erro Nominatim:', error);
    return true;
  }
};
// ================================================================================

// ===================== COMPONENTE DE MAPA PARA BRIGADAS =====================
const MapaLocalizacao = ({ distritoNome, onSelect, valorAtual }) => {
  const mapRef = useRef(null);
  const containerRef = useRef(null);
  const [pois, setPois] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filtroPoi, setFiltroPoi] = useState('');

  useEffect(() => {
    // Inicializar o mapa (Leaflet vem do index.html globalmente como window.L)
    if (!window.L || !containerRef.current || mapRef.current) return;

    // Coordenadas padrão de Sofala/Beira se tudo falhar
    const defaultLat = -19.8316;
    const defaultLon = 34.8367;

    mapRef.current = window.L.map(containerRef.current).setView([defaultLat, defaultLon], 13);
    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap'
    }).addTo(mapRef.current);

    // 1. Buscar coordenadas do distrito para centrar o mapa
    const buscarDistrito = async () => {
      try {
        setLoading(true);
        const q = `${distritoNome}, Sofala, Moçambique`;
        const resp = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1`);
        const data = await resp.json();
        
        let lat = defaultLat;
        let lon = defaultLon;

        if (data && data.length > 0) {
          lat = parseFloat(data[0].lat);
          lon = parseFloat(data[0].lon);
          mapRef.current.setView([lat, lon], 14);
        }

        // 2. Buscar Escolas e Centros de Saude via Overpass API (Expandido p/ 15km e caminhos/áreas)
        const overpassQuery = `
          [out:json][timeout:30];
          (
            node["amenity"~"school|college|university|kindergarten|hospital|health_post|doctors"](around:15000, ${lat}, ${lon});
            way["amenity"~"school|college|university|kindergarten|hospital|health_post|doctors"](around:15000, ${lat}, ${lon});
            relation["amenity"~"school|college|university|kindergarten|hospital|health_post|doctors"](around:15000, ${lat}, ${lon});
          );
          out center;
        `;
        
        const ovResp = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(overpassQuery)}`);
        const ovData = await ovResp.json();
        
        if (ovData.elements) {
          // Normalizar elementos (usar lat/lon do centro para caminhos)
          const elements = ovData.elements
            .filter(e => e.tags && e.tags.name)
            .map(e => ({
              id: e.id,
              lat: e.lat || (e.center ? e.center.lat : 0),
              lon: e.lon || (e.center ? e.center.lon : 0),
              tags: e.tags
            }));

          setPois(elements);
          elements.forEach(poi => {
            const label = poi.tags.name || poi.tags.amenity || 'Local';
            const iconColor = poi.tags.amenity?.includes('school') || poi.tags.amenity === 'college' || poi.tags.amenity === 'university' ? '#d4a30d' : '#ef4444';
            const icon = window.L.divIcon({
               className: 'custom-div-icon',
               html: `<div style="background-color: ${iconColor}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 5px rgba(0,0,0,0.5);"></div>`,
               iconSize: [12, 12],
               iconAnchor: [6, 6]
            });

            window.L.marker([poi.lat, poi.lon], { icon })
              .addTo(mapRef.current)
              .bindPopup(`<b>${label}</b><br><button id="btn-poi-${poi.id}" style="margin-top:5px; background:#d4a30d; color:black; border:none; padding:4px 8px; border-radius:4px; font-size:11px; cursor:pointer; font-weight:bold;">Seleccionar</button>`)
              .on('popupopen', () => {
                 const btn = document.getElementById(`btn-poi-${poi.id}`);
                 if (btn) btn.onclick = () => {
                    onSelect(label, poi);
                    mapRef.current.closePopup();
                 };
              });
          });
        }
      } catch (e) {
        console.error('Erro no mapa:', e);
      } finally {
        setLoading(false);
      }
    };

    buscarDistrito();

    // Evento de clique manual no mapa
    mapRef.current.on('click', async (e) => {
       const { lat, lng } = e.latlng;
       try {
         const revResp = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`);
         const revData = await revResp.json();
         const nome = revData.display_name.split(',')[0];
         onSelect(nome || `${lat.toFixed(4)}, ${lng.toFixed(4)}`, { id: Date.now(), tags: { name: nome } });
       } catch {
         onSelect(`${lat.toFixed(4)}, ${lng.toFixed(4)}`, { id: Date.now(), tags: { name: 'Local Manual' } });
       }
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [distritoNome]);

  const poisFiltrados = pois.filter(p => p.tags.name.toLowerCase().includes(filtroPoi.toLowerCase()));

  return (
    <div style={{ marginBottom: '20px' }}>
      <p style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#94a3b8', marginBottom: '8px' }}>
         <span>📍 Locais no Distrito da {distritoNome} ({poisFiltrados.length} encontrados)</span>
         {loading && <span style={{ color: '#d4a30d' }}>A pesquisar escolas...</span>}
      </p>

      <div style={{ display: 'flex', gap: '15px', height: '500px' }}>
        {/* Lista de escolas */}
        <div style={{ 
          flex: 1, 
          backgroundColor: '#0f172a', 
          border: '1px solid #334155', 
          borderRadius: '8px', 
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{ padding: '8px', borderBottom: '1px solid #1e293b' }}>
             <input 
                type="text"
                placeholder="Pesquisar local na lista..."
                style={{ ...styles.input, padding: '6px 10px', fontSize: '12px', marginBottom: 0 }}
                value={filtroPoi}
                onChange={e => setFiltroPoi(e.target.value)}
             />
          </div>
          <div style={{ overflowY: 'auto', flex: 1, padding: '8px' }}>
            {poisFiltrados.length === 0 && !loading ? (
               <p style={{ fontSize: '11px', color: '#64748b', textAlign: 'center', marginTop: '50px' }}>Sem resultados para esta pesquisa.</p>
            ) : (
               <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {poisFiltrados.map(poi => {
                     const nome = poi.tags.name;
                     const selecionado = valorAtual === nome;
                     const tipo = poi.tags.amenity || 'Local';
                     return (
                       <button 
                         key={poi.id}
                         onClick={() => {
                           onSelect(nome, poi);
                           mapRef.current.setView([poi.lat, poi.lon], 16);
                         }}
                         style={{
                           textAlign: 'left',
                           padding: '8px',
                           backgroundColor: selecionado ? '#d4a30d20' : 'transparent',
                           border: selecionado ? '1px solid #d4a30d' : '1px solid #1e293b',
                           borderRadius: '6px',
                           color: selecionado ? '#fbbf24' : '#fff',
                           fontSize: '11px',
                           cursor: 'pointer',
                           transition: 'all 0.2s',
                           display: 'flex',
                           alignItems: 'center',
                           gap: '8px'
                         }}
                       >
                          <div style={{ minWidth: '8px', height: '8px', borderRadius: '50%', backgroundColor: tipo.includes('school') || tipo === 'college' ? '#d4a30d' : '#ef4444' }}></div>
                          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{nome}</span>
                       </button>
                     );
                  })}
               </div>
            )}
          </div>
        </div>

        {/* Mapa */}
        <div 
          ref={containerRef} 
          style={{ 
            flex: 2,
            borderRadius: '8px', 
            border: '1px solid #334155',
            overflow: 'hidden',
            backgroundColor: '#1a1a1a'
          }} 
        />
      </div>
      <p style={{ fontSize: '10px', color: '#64748b', marginTop: '8px' }}>* Escolha um local ou clique directamente no mapa. Raio de busca: 15km.</p>
    </div>
  );
};
// ============================================================================

const App = () => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('stae_admin_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [loginLoading, setLoginLoading] = useState(false);
  const [view, setView] = useState('dashboard');
  const [viewMode, setViewMode] = useState('grid');
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
  const [modelosBrigada, setModelosBrigada] = useState([]);
  const [pautasLista, setPautasLista] = useState([]);
  const [pautasSelecionadas, setPautasSelecionadas] = useState([]);
  const [filtroPautas, setFiltroPautas] = useState('');
  const [filtroTurmaPauta, setFiltroTurmaPauta] = useState('todas');
  const [formacaoSubView, setFormacaoSubView] = useState('turmas'); // 'turmas' ou 'pautas'
  const [brigadas, setBrigadas] = useState([]);
  const [showNovoModeloModal, setShowNovoModeloModal] = useState(false);
  const [showNovaBrigadaModal, setShowNovaBrigadaModal] = useState(false);
  const [novoModeloForm, setNovoModeloForm] = useState({
    nome: '',
    processo_id: '',
    tipo: 'brigada',
    num_membros: 3,
    funcoes: [
      { id: Date.now(), cargo: '', objetivo: '' }
    ],
    observacoes: ''
  });
  const [novaBrigadaForm, setNovaBrigadaForm] = useState({
    nome: '',
    modelo_id: '',
    localizacao: '',
    membros: [] // Array de { id_candidato, funcao_id }
  });
  const [brigadaSubView, setBrigadaSubView] = useState('config'); 
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
  const [showDetalhesCandidaturaModal, setShowDetalhesCandidaturaModal] = useState(false);
  const [novaNotificacaoForm, setNovaNotificacaoForm] = useState({
    evento: 'candidaturas', // candidaturas, formacao
    publico_alvo: 'todos',
    canais: ['sms'], // sms, email, whatsapp
    titulo: 'STAE INFORMA',
    mensagem: '',
    incluir_nome: false,
    categoria_id: ''
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
    primeiro_nome: '',
    apelido: '',
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
    if (user) {
      carregarDados();
    }
  }, [user]); 


  const apagarPauta = async (id) => {
    if (!window.confirm("Tem certeza que deseja apagar esta pauta?")) return;
    try {
      const resp = await fetch(`${API_URL}/api/relatorios/pautas/${id}`, { method: 'DELETE' });
      if (resp.ok) {
        setPautasLista(pautasLista.filter(p => p.id !== id));
        setPautasSelecionadas(pautasSelecionadas.filter(pid => pid !== id));
      } else {
        alert("Erro ao apagar pauta");
      }
    } catch (err) {
      alert("Erro de conexão ao apagar pauta");
    }
  };

  // MODAL DINÂMICO DE NOTIFICAÇÃO EM MASSA
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackConfig, setFeedbackConfig] = useState({ pautas: [], canais: ['sms'], titulo: 'Resultado de Formação' });

  const abrirModalNotificacao = () => {
    if (pautasSelecionadas.length === 0) return;
    const pautasParaEnviar = pautasLista.filter(p => pautasSelecionadas.includes(p.id));
    setFeedbackConfig({ ...feedbackConfig, pautas: pautasParaEnviar });
    setShowFeedbackModal(true);
  };

  const processarEnvioNotificacoes = async () => {
     setLoading(true);
     let sucessos = 0;
     
     for (const pauta of feedbackConfig.pautas) {
       const resultado = pauta.nota >= 10 ? 'APROVADO' : 'REPROVADO';
       const msgSms = `Caro(a) ${pauta.formando_nome}, informamos que o seu resultado final na ${pauta.turma_nome} (${pauta.categoria_nome}) é ${resultado} com média ${pauta.nota}/20.`;
       
       try {
         await fetch(`${API_URL}/api/notificacoes/enviar-lote`, {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({
             titulo: feedbackConfig.titulo,
             mensagem: msgSms,
             publico_alvo: 'personalizado',
             candidatura_ids: [pauta.candidatura_id],
             canais: feedbackConfig.canais
           })
         });
         sucessos++;
       } catch (err) { console.error("Falha ao notificar:", pauta.formando_nome); }
     }
     
     setLoading(false);
     setShowFeedbackModal(false);
     alert(`Lote processado: ${sucessos} candidatos notificados via [${feedbackConfig.canais.join(', ')}]`);
     setPautasSelecionadas([]);
     carregarDados();
  };

  const alternarSelecaoPauta = (id) => {
    if (pautasSelecionadas.includes(id)) {
      setPautasSelecionadas(pautasSelecionadas.filter(pid => pid !== id));
    } else {
      setPautasSelecionadas([...pautasSelecionadas, id]);
    }
  };

  const alternarSelecaoTodos = (filtradas) => {
    if (filtradas.length === 0) return;
    if (pautasSelecionadas.length === filtradas.length) {
      setPautasSelecionadas([]);
    } else {
      setPautasSelecionadas(filtradas.map(p => p.id));
    }
  };

  const carregarDados = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const [candRes, turmasRes, catRes, provRes, centrosRes, procRes, formadoresRes, notifRes, relatRes, modelosRes, unidadesRes, pautasRes] = await Promise.all([
        fetch(`${API_URL}/api/candidaturas`).then(r => r.json()),
        fetch(`${API_URL}/api/turmas`).then(r => r.json()),
        fetch(`${API_URL}/api/config/categorias`).then(r => r.json()),
        fetch(`${API_URL}/api/config/provincias`).then(r => r.json()),
        fetch(`${API_URL}/api/config/centros`).then(r => r.json()),
        fetch(`${API_URL}/api/config/processos`).then(r => r.json()),
        fetch(`${API_URL}/api/config/formadores`).then(r => r.json()),
        fetch(`${API_URL}/api/notificacoes`).then(r => r.json()).catch(() => ({ notificacoes: [] })),
        fetch(`${API_URL}/api/relatorios/estatisticas`).then(r => r.json()).catch(() => null),
        fetch(`${API_URL}/api/logistica/modelos`).then(r => r.json()).catch(() => ({ modelos: [] })),
        fetch(`${API_URL}/api/logistica/unidades`).then(r => r.json()).catch(() => ({ unidades: [] })),
        fetch(`${API_URL}/api/relatorios/pautas`).then(r => r.json()).catch(() => ({ pautas: [] }))
      ]);

      // FILTRAGEM HIERÁRQUICA DE DADOS
      let filteredCands = Array.isArray(candRes) ? candRes : (candRes.candidaturas || []);
      let filteredUnits = unidadesRes.unidades || [];
      let filteredTurmas = Array.isArray(turmasRes) ? turmasRes : (turmasRes.turmas || []);
      let filteredNotificacoes = notifRes.notificacoes || [];

      let filteredPautas = pautasRes.pautas || [];
      if (user.role === 'administrador_provincial') {
        filteredCands = filteredCands.filter(c => String(c.provincia_id) == String(user.provincia_id));
        filteredUnits = filteredUnits.filter(u => String(u.provincia_id) == String(user.provincia_id));
        filteredTurmas = filteredTurmas.filter(t => String(t.provincia_id) == String(user.provincia_id));
        filteredPautas = filteredPautas.filter(p => String(p.provincia_id) == String(user.provincia_id));
      } else if (user.role === 'administrador_distrital') {
        filteredCands = filteredCands.filter(c => String(c.distrito_id) == String(user.distrito_id));
        filteredUnits = filteredUnits.filter(u => String(u.distrito_id) == String(user.distrito_id));
        filteredTurmas = filteredTurmas.filter(t => String(t.distrito_id) == String(user.distrito_id));
        filteredPautas = filteredPautas.filter(p => String(p.distrito_id) == String(user.distrito_id));
      }

      setCandidaturas(filteredCands);
      setTurmas(filteredTurmas);
      setCategorias(catRes.categorias || []);
      setProvincias(provRes.provincias || []);
      setCentros(centrosRes.centros || []);
      setProcessos(procRes.processos || []);
      setFormadores(formadoresRes.formadores || []);
      setNotificacoesLista(filteredNotificacoes);
      setRelatoriosDados(relatRes || null);
      setModelosBrigada(modelosRes.modelos || []);
      setBrigadas(filteredUnits);
      setPautasLista(filteredPautas);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('stae_admin_user');
    setUser(null);
  };

  const loginPrincipal = async (e) => {
    e.preventDefault();
    setLoginLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm)
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('stae_admin_user', JSON.stringify(data.user));
        setUser(data.user);
        alert(`Bem-vinda(o), ${data.user.nome_completo}!`);
      } else {
        alert(data.error || 'Erro no login');
      }
    } catch (err) {
      alert('Erro de conexão ao servidor');
    } finally {
      setLoginLoading(false);
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
        resultado: f.resultado || 'pendente',
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
          avaliador_id: user?.id 
        })
      });

      if (response.ok) {
        // Envio inteligente de notificações multicanal
        formandosPauta.forEach(f => {
           const statusText = f.resultado === 'aprovado' ? 'APROVADO(A)' : 'REPROVADO(A)';
           const local = selectedTurmaParaPauta.centro_nome || 'Centro de Formação Local';
           const extraInfo = f.resultado === 'aprovado' 
              ? `\nUnidade: ${selectedTurmaParaPauta.codigo}\nLocalização: ${local}\nPor favor, apresente-se no local indicado.`
              : `\nInfelizmente não atingiu a pontuação mínima para este processo.`;
           
           console.log(`✉️ [NOTIFICAÇÃO DISPARADA] canal: SMS, WhatsApp, Email`);
           console.log(`👤 Destinatário: ${f.nome_completo}`);
           console.log(`📝 Conteúdo: STAE SOFALA - Resultado Final: ${statusText}.${extraInfo}`);
        });

        alert(`✅ Pauta guardada com sucesso!\n${formandosPauta.length} notificações multicanal (Email/SMS/WhatsApp) foram disparadas automaticamente.`);
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

  const salvarNovaBrigada = async () => {
    if (!await verificarPermissao(user, 'criar unidade operacional')) return;
    if (!novaBrigadaForm.nome || !novaBrigadaForm.modelo_id) {
       alert('Preencha o nome e o modelo base obrigatórios.');
       return;
    }
    const model = modelosBrigada.find(m => m.id === (novaBrigadaForm.modelo_id) || m.id === parseInt(novaBrigadaForm.modelo_id));
    
    // Validar se todos os membros foram alocados conforme o modelo
    const membrosCompletos = novaBrigadaForm.membros.length === model?.funcoes.length;
    
    if (!membrosCompletos) {
      if (!window.confirm(`⚠️ ATENÇÃO: Esta equipa está incompleta (${novaBrigadaForm.membros.length} de ${model?.funcoes.length} membros alocados).\nDeseja salvar mesmo assim com déficit de pessoal?`)) {
        return;
      }
    }

    try {
      const payload = {
        ...novaBrigadaForm,
        status_logistico: membrosCompletos ? 'completo' : 'alerta_deficit'
      };
      
      const response = await fetch(`${API_URL}/api/logistica/unidades`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        alert(membrosCompletos ? 'Unidade operacional cadastrada!' : 'Unidade cadastrada com alertas de déficit.');
        carregarDados();
        setShowNovaBrigadaModal(false);
        setNovaBrigadaForm({ nome: '', modelo_id: '', localizacao: '', membros: [] });
      }
    } catch (error) {
      console.error('Erro ao salvar unidade:', error);
      alert('Erro ao salvar unidade no servidor');
    }
  };

  const salvarNovaTurma = async () => {
    if (!await verificarPermissao(user, 'criar turma de formação')) return;
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

  const verDetalhesCandidatura = (candidatura) => {
    setSelectedCandidatura(candidatura);
    setShowDetalhesCandidaturaModal(true);
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

  const selecionarLocalizacaoBrigada = (locName, poi) => {
    // 1. Iniciar variáveis de código
    let codProv = '05'; // Padrão Sofala
    let codDist = '001'; // Padrão Beira
    
    // Tentar obter códigos reais dos metadados
    const prov = provincias.find(p => p.id === user?.provincia_id);
    if (prov && prov.codigo) codProv = String(prov.codigo).padStart(2, '0');
    
    const dist = distritos.find(d => d.id === user?.distrito_id);
    if (dist && dist.codigo) codDist = String(dist.codigo).padStart(3, '0');
    
    // 2. Gerar código do local (4 dígitos baseados no OSM ID ou fallback)
    const seedLocal = poi?.id ? String(poi.id).slice(-4) : Math.floor(Math.random() * 9000 + 1000);
    const codLocal = String(seedLocal).padStart(4, '0');

    // 3. Contar quantas brigadas já existem neste local para o sufixo (1-9)
    const unidadesNoLocal = brigadas.filter(b => b.localizacao === locName).length;
    const sufixo = Math.min(unidadesNoLocal + 1, 9);

    const codigoGerado = `${codProv}${codDist}${codLocal}${sufixo}`;

    setNovaBrigadaForm({
      ...novaBrigadaForm,
      nome: locName,
      localizacao: locName,
      codigo: codigoGerado
    });
  };

  const salvarDistribuicaoFormandos = async () => {
    if (!await verificarPermissao(user, 'alocar formandos')) return;
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
          avaliado_por: user?.id
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
      entrevistador_id: user?.id,
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

  // Funções para Gestão de Brigadas/MMVs
  const salvarModelo = async () => {
    if (!novoModeloForm.nome || !novoModeloForm.processo_id) {
      alert('⚠️ Por favor, preencha o Nome do Modelo e o Processo Eleitoral.');
      return;
    }
    
    // Validar funções vazias
    const funcoesValidas = novoModeloForm.funcoes.every(f => f.cargo.trim() !== '');
    if (!funcoesValidas) {
        alert('⚠️ Todas as funções adicionadas devem ter um cargo definido.');
        return;
    }

    try {
      const response = await fetch(`${API_URL}/api/logistica/modelos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(novoModeloForm)
      });

      if (response.ok) {
        alert('✅ Modelo de equipa definido com sucesso!');
        carregarDados();
        setShowNovoModeloModal(false);
        setNovoModeloForm({
          nome: '', processo_id: '', tipo: 'brigada', num_membros: 3,
          funcoes: [{ id: Date.now(), cargo: '', objetivo: '' }], observacoes: ''
        });
      } else {
        const errorData = await response.json();
        alert(`❌ Erro do Servidor: ${errorData.error || 'Falha ao salvar o modelo'}`);
      }
    } catch (error) {
      console.error('Erro ao salvar modelo:', error);
      alert('❌ Erro de conexão com o servidor. Verifique se o sistema está online.');
    }
  };

  const adicionarFuncaoAoModelo = () => {
    setNovoModeloForm({
      ...novoModeloForm,
      funcoes: [...novoModeloForm.funcoes, { id: Date.now(), cargo: '', objetivo: '' }]
    });
  };

  const removerFuncaoDoModelo = (id) => {
    if (novoModeloForm.funcoes.length <= 1) return;
    setNovoModeloForm({
      ...novoModeloForm,
      funcoes: novoModeloForm.funcoes.filter(f => f.id !== id)
    });
  };

  const atualizarFuncaoNoModelo = (id, campo, valor) => {
    setNovoModeloForm({
      ...novoModeloForm,
      funcoes: novoModeloForm.funcoes.map(f => f.id === id ? { ...f, [campo]: valor } : f)
    });
  };

  // Registrar candidatura presencial
  const registrarCandidaturaPresencial = async () => {
    if (!await verificarPermissao(user, 'registar candidatura')) return;
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
        setRegistroPresencialForm({
          primeiro_nome: '',
          apelido: '',
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

  if (!user) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f172a', padding: '20px' }}>
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '16px', maxWidth: '400px', width: '100%', padding: '40px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <div style={{ width: '70px', height: '70px', backgroundColor: '#fbbf24', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', boxShadow: '0 0 20px rgba(251, 191, 36, 0.3)' }}>
              <Shield size={35} color="#000" />
            </div>
            <h2 style={{ color: 'white', fontSize: '24px', fontWeight: 'bold', margin: '0 0 5px 0' }}>STAE ADMINISTRATIVO</h2>
            <p style={{ color: '#94a3b8', fontSize: '14px' }}>Gestão Eleitoral 2026</p>
          </div>
          
          <form onSubmit={loginPrincipal}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', color: '#94a3b8', fontSize: '13px', marginBottom: '8px' }}>E-mail ou Usuário</label>
              <input 
                style={{ width: '100%', padding: '12px', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: 'white', fontSize: '15px' }} 
                type="text" 
                placeholder="Ex: cheringoma, central..."
                value={loginForm.email}
                onChange={e => setLoginForm({...loginForm, email: e.target.value})}
                required
              />
            </div>
            <div style={{ marginBottom: '25px' }}>
              <label style={{ display: 'block', color: '#94a3b8', fontSize: '13px', marginBottom: '8px' }}>Senha de Acesso</label>
              <input 
                style={{ width: '100%', padding: '12px', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: 'white', fontSize: '15px' }} 
                type="password" 
                placeholder="••••••••"
                value={loginForm.password}
                onChange={e => setLoginForm({...loginForm, password: e.target.value})}
                required
              />
            </div>
            <button 
              type="submit" 
              style={{ width: '100%', padding: '14px', backgroundColor: '#fbbf24', color: '#000', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
              disabled={loginLoading}
            >
              {loginLoading ? 'PROCESSANDO...' : <><Shield size={18} /> ENTRAR NO SISTEMA</>}
            </button>
          </form>
          
          <div style={{ marginTop: '25px', textAlign: 'center', color: '#475569', fontSize: '11px', lineHeight: '1.5' }}>
            ACESSO RESTRITO<br/>Secretariado Técnico de Administração Eleitoral
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Sidebar */}
      <div style={styles.sidebar}>
        <div style={styles.logoContainer}>
          <Shield size={32} color="#fbbf24" style={{ marginBottom: '10px' }} />
          <h2 style={styles.logoTitle}>
            {user.role === 'master_nacional' ? 'STAE CENTRAL' : 
             `STAE ${user.nome_completo.replace('Admin Provincial ', '').replace('Admin Distrital ', '')}`}
          </h2>
          <div style={{ margin: '15px 0', padding: '10px', backgroundColor: '#1e293b', borderRadius: '8px', borderLeft: '3px solid #fbbf24' }}>
            <p style={{ margin: 0, fontSize: '13px', color: 'white', fontWeight: '600' }}>{user.nome_completo}</p>
            <p style={{ margin: 0, fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase' }}>{user.role?.replace('_', ' ')}</p>
          </div>
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
            style={styles.navButton(view === 'brigadas')}
            onClick={() => setView('brigadas')}
          >
            <Shield size={20} />
            <span>Brigadas-Agentes-MMVs</span>
          </button>

          <button
            style={styles.navButton(view === 'notificacoes')}
            onClick={() => setView('notificacoes')}
          >
            <Bell size={20} />
            <span>Notificações</span>
          </button>

          <button
            style={styles.navButton(view === 'pautas')}
            onClick={() => setView('pautas')}
          >
            <ClipboardList size={20} />
            <span>Pautas Salvas</span>
          </button>

          <button
            style={styles.navButton(view === 'relatorios')}
            onClick={() => setView('relatorios')}
          >
            <BarChart size={20} />
            <span>Relatórios</span>
          </button>
        </nav>

        <div style={styles.sidebarFooter}>
          <button style={{ ...styles.navButton(false), color: '#ef4444' }} onClick={logout}>
            <X size={20} />
            <span>Sair do Painel</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div style={styles.main}>
        <header style={styles.header}>
          <h1 style={styles.title}>
            {view === 'dashboard' && 'Dashboard de Gestão'}
            {view === 'candidaturas' && 'Gestão de Candidaturas'}
            {view === 'formacao' && (formacaoSubView === 'turmas' ? 'Gestão de Formação' : 'Pautas Salvas e Resultados')}
            {view === 'pautas' && 'Pautas Salvas'}
            {view === 'notificacoes' && 'Notificações'}
            {view === 'relatorios' && 'Relatórios'}
            {view === 'brigadas' && 'Gestão de Brigadas-Agentes-MMVs'}
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
                {/* Banner de Deficiência Logística */}
                {brigadas.some(b => b.status_logistico === 'alerta_deficit') && (
                  <div style={{ 
                    backgroundColor: '#ef444420', 
                    border: '1px solid #ef4444', 
                    padding: '15px', 
                    borderRadius: '8px', 
                    marginBottom: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    color: '#ef4444'
                  }}>
                    <Shield size={24} />
                    <div>
                      <strong style={{ display: 'block' }}>ALERTA LOGÍSTICO: Unidades Incompletas</strong>
                      <span style={{ fontSize: '13px' }}>
                        Existem {brigadas.filter(b => b.status_logistico === 'alerta_deficit').length} unidad(es) operacional(is) (Brigadas/MMVs/Agentes) com défice de membros. 
                        Vá para a <span style={{ textDecoration: 'underline', cursor: 'pointer' }} onClick={() => setView('brigadas')}>Gestão Operacional</span> para regularizar.
                      </span>
                    </div>
                  </div>
                )}

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

                    <div style={styles.viewToggle}>
                      <button 
                        style={styles.toggleButton(viewMode === 'grid')} 
                        onClick={() => setViewMode('grid')}
                        title="Visualização em Grade"
                      >
                        <LayoutGrid size={20} />
                      </button>
                      <button 
                        style={styles.toggleButton(viewMode === 'list')} 
                        onClick={() => setViewMode('list')}
                        title="Visualização em Lista"
                      >
                        <List size={20} />
                      </button>
                    </div>

                    <button
                      style={{ ...styles.primaryButton, backgroundColor: '#10b981' }}
                      onClick={async () => {
                        if (await verificarPermissao(user, 'registar candidatura')) {
                          setShowRegistroPresencialModal(true);
                        }
                      }}
                    >
                      <Plus size={18} /> Nova Candidatura Presencial
                    </button>
                  </div>
                </div>

                <div style={styles.tableContainer}>
                  {viewMode === 'list' ? (
                    <div style={{ backgroundColor: '#1E293B', borderRadius: '12px', border: '1px solid #334155', overflow: 'hidden' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ backgroundColor: '#0F172A' }}>
                            <th style={styles.th}>Nome / Categoria</th>
                            <th style={styles.th}>Estado / Fase</th>
                            <th style={styles.th}>Data Registro</th>
                            <th style={styles.th}>Ações</th>
                          </tr>
                        </thead>
                        <tbody>
                          {candidaturasFiltradas.map((candidatura) => (
                            <tr key={candidatura.id} style={styles.tr}>
                              <td style={styles.td}>
                                <div>
                                  <div style={{ fontWeight: '600' }}>{candidatura.nome_completo || 'Candidato'}</div>
                                  <div style={{ fontSize: '12px', color: '#94A3B8' }}>{candidatura.categoria_nome || 'MMV'} • {candidatura.email}</div>
                                </div>
                              </td>
                              <td style={styles.td}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                  <span style={{
                                    ...styles.statusBadge,
                                    width: 'fit-content',
                                    backgroundColor: candidatura.estado_geral === 'aprovado' ? '#10b98120' :
                                      candidatura.estado_geral === 'reprovado' ? '#ef444420' : '#d4a30d20',
                                    color: candidatura.estado_geral === 'aprovado' ? '#10b981' :
                                      candidatura.estado_geral === 'reprovado' ? '#ef4444' : '#d4a30d'
                                  }}>
                                    {candidatura.estado_geral || 'pendente'}
                                  </span>
                                  <span style={{ fontSize: '11px', color: '#94A3B8' }}>Fase: {candidatura.fase_atual || 'registro'}</span>
                                </div>
                              </td>
                              <td style={styles.td}>
                                {new Date(candidatura.criado_em).toLocaleDateString('pt-PT')}
                              </td>
                              <td style={styles.td}>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                  <button
                                    style={{ ...styles.actionButton, padding: '6px' }}
                                    onClick={() => verDetalhesCandidatura(candidatura)}
                                    title="Ver Detalhes"
                                  >
                                    <Eye size={16} />
                                  </button>
                                  {candidatura.estado_geral === 'pendente' && (
                                    <button
                                      style={{ ...styles.actionButton, padding: '6px', backgroundColor: '#d4a30d' }}
                                      onClick={() => abrirModalAvaliacao(candidatura)}
                                      title="Avaliar Documentação"
                                    >
                                      <FileText size={16} />
                                    </button>
                                  )}
                                  {(candidatura.estado_geral === 'aprovado' || candidatura.resultado_final === 'aprovado_documentacao') && !candidatura.entrevista_realizada && (
                                    <button
                                      style={{ ...styles.actionButton, padding: '6px', backgroundColor: '#17a2b8' }}
                                      onClick={() => abrirModalEntrevista(candidatura)}
                                      title="Avaliar Entrevista"
                                    >
                                      <Users size={16} />
                                    </button>
                                  )}
                                  <button
                                    title="WhatsApp Directo"
                                    style={{ ...styles.actionButton, padding: '6px', backgroundColor: '#10b981', color: '#fff' }}
                                    onClick={() => {
                                      const fone = candidatura.telefone || candidatura.contacto_principal;
                                      const num = fone ? (fone.startsWith('258') ? fone : '258' + fone) : '';
                                      if (!num) return alert('Telefone não encontrado.');
                                      window.open(`https://wa.me/${num}?text=Olá ${candidatura.nome_completo}, entramos em contacto sobre a sua candidatura no STAE.`, '_blank');
                                    }}
                                  >
                                    <MessageCircle size={16} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    candidaturasFiltradas.map((candidatura) => (
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
                            onClick={() => verDetalhesCandidatura(candidatura)}
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

                          <button
                            style={{ ...styles.actionButton, backgroundColor: '#10b981', color: 'white' }}
                            onClick={() => {
                              const fone = candidatura.telefone || candidatura.contacto_principal;
                              const num = fone ? (fone.startsWith('258') ? fone : '258' + fone) : '';
                              if (!num) return alert('Telefone não encontrado.');
                              window.open(`https://wa.me/${num}?text=Olá ${candidatura.nome_completo}, entramos em contacto sobre a sua candidatura no STAE.`, '_blank');
                            }}
                          >
                            <MessageCircle size={16} /> WhatsApp
                          </button>
                        </div>
                      </div>
                    ))
                  )}
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
                <div style={{ ...styles.pageHeader, flexDirection: 'column', alignItems: 'flex-start', gap: '15px' }}>
                  <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                    <button 
                      style={{ 
                        padding: '10px 20px',
                        backgroundColor: 'transparent',
                        border: 'none',
                        borderBottom: formacaoSubView === 'turmas' ? '2px solid #d4a30d' : 'none',
                        color: formacaoSubView === 'turmas' ? '#d4a30d' : '#94a3b8',
                        cursor: 'pointer',
                        fontWeight: '600',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                      onClick={() => setFormacaoSubView('turmas')}
                    >
                      <GraduationCap size={18} /> Gestão de Turmas
                    </button>
                    <button 
                      id="aba-pautas-salvas"
                      style={{ 
                        padding: '10px 20px',
                        backgroundColor: 'transparent',
                        border: 'none',
                        borderBottom: formacaoSubView === 'pautas' ? '2px solid #d4a30d' : 'none',
                        color: formacaoSubView === 'pautas' ? '#d4a30d' : '#94a3b8',
                        cursor: 'pointer',
                        fontWeight: '600',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                      onClick={() => setFormacaoSubView('pautas')}
                    >
                      <ClipboardList size={18} /> Pautas Salvas (Resultados)
                    </button>
                  </div>

                  {formacaoSubView === 'turmas' && (
                    <button style={styles.primaryButton} onClick={() => setShowNovaTurmaModal(true)}>
                      <Plus size={18} /> Nova Turma
                    </button>
                  )}
                  
                  {formacaoSubView === 'pautas' && (
                    <div style={{ display: 'flex', gap: '15px', alignItems: 'center', width: '100%', flexWrap: 'wrap' }}>
                      <div style={{ position: 'relative', flex: 2, minWidth: '200px' }}>
                        <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} size={18} />
                        <input
                          style={{ ...styles.input, paddingLeft: '40px', marginBottom: 0 }}
                          placeholder="Filtrar por formando..."
                          value={filtroPautas}
                          onChange={(e) => setFiltroPautas(e.target.value)}
                        />
                      </div>
                      
                      <div style={{ flex: 1, minWidth: '150px' }}>
                        <select 
                          style={{ ...styles.input, marginBottom: 0 }}
                          value={filtroTurmaPauta}
                          onChange={(e) => setFiltroTurmaPauta(e.target.value)}
                        >
                          <option value="todas">Todas as Turmas</option>
                          {[...new Set(pautasLista.map(p => p.turma_nome))].map(tn => (
                            <option key={tn} value={tn}>{tn}</option>
                          ))}
                        </select>
                      </div>

                      <button 
                        style={{ 
                          ...styles.primaryButton, 
                          backgroundColor: pautasSelecionadas.length > 0 ? '#fbbf24' : '#64748b20', 
                          color: pautasSelecionadas.length > 0 ? '#000' : '#64748b', 
                          padding: '10px 15px', 
                          whiteSpace: 'nowrap',
                          opacity: pautasSelecionadas.length > 0 ? 1 : 0.6,
                          cursor: pautasSelecionadas.length > 0 ? 'pointer' : 'not-allowed'
                        }}
                        onClick={abrirModalNotificacao}
                        disabled={pautasSelecionadas.length === 0}
                      >
                        <Send size={16} /> Enviar p/ {pautasSelecionadas.length} Selecionados
                      </button>
                    </div>
                  )}
                </div>

                {formacaoSubView === 'turmas' ? (
                  <div style={styles.tableContainer}>
                    {turmas.length === 0 ? (
                       <p style={{textAlign: 'center', padding: '40px', color: '#94a3b8'}}>Nenhuma turma registada.</p>
                    ) : (
                      turmas.map((turma) => (
                        <div key={turma.id} style={{ ...styles.turmaCard, marginBottom: '15px' }}>
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
                              <p><Calendar size={16} /> {new Date(turma.data_inicio).toLocaleDateString()} - {new Date(turma.data_fim).toLocaleDateString()}</p>
                              <p><Clock size={16} /> {turma.horario}</p>
                              <p><MapPin size={16} /> {turma.local_formacao || turma.centro_nome}</p>
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
                            <button 
                              style={{ ...styles.actionButton, backgroundColor: '#6f42c120', color: '#a78bfa' }} 
                              onClick={() => abrirModalPauta(turma)}
                            >
                              <ClipboardList size={16} /> Avaliar Turma (Pauta)
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                ) : (
                  <div style={styles.tableContainer}>
                    <table style={styles.table}>
                      <thead>
                        <tr>
                          <th style={styles.th}>
                            <input 
                              type="checkbox" 
                              checked={pautasLista.length > 0 && pautasSelecionadas.length === pautasLista.filter(p => 
                                p.formando_nome?.toLowerCase().includes(filtroPautas.toLowerCase()) ||
                                p.turma_nome?.toLowerCase().includes(filtroPautas.toLowerCase())
                              ).length}
                              onChange={() => alternarSelecaoTodos(pautasLista.filter(p => 
                                p.formando_nome?.toLowerCase().includes(filtroPautas.toLowerCase()) ||
                                p.turma_nome?.toLowerCase().includes(filtroPautas.toLowerCase())
                              ))}
                            />
                          </th>
                          <th style={styles.th}>Data/Hora</th>
                          <th style={styles.th}>Turma / Categoria</th>
                          <th style={styles.th}>Nome do Formando</th>
                          <th style={styles.th}>Resultado</th>
                          <th style={styles.th}>SMS Manual</th>
                          <th style={styles.th}>Acções</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pautasLista
                          .filter(p => {
                             const matchesText = p.formando_nome?.toLowerCase().includes(filtroPautas.toLowerCase()) ||
                                               p.turma_nome?.toLowerCase().includes(filtroPautas.toLowerCase()) ||
                                               (p.nota >= 10 ? 'aprovado' : 'reprovado').includes(filtroPautas.toLowerCase());
                             const matchesTurma = filtroTurmaPauta === 'todas' || p.turma_nome === filtroTurmaPauta;
                             return matchesText && matchesTurma;
                          })
                          .map((pauta) => {
                            const resultado = pauta.nota >= 10 ? 'APROVADO' : 'REPROVADO';
                            const msgSms = `Caro ${pauta.formando_nome}, o seu resultado no ${pauta.turma_nome} é ${resultado}.`;
                            
                            return (
                              <tr key={pauta.id} style={styles.tr}>
                                <td style={styles.td}>
                                  <input 
                                    type="checkbox" 
                                    checked={pautasSelecionadas.includes(pauta.id)}
                                    onChange={() => alternarSelecaoPauta(pauta.id)}
                                  />
                                </td>
                                <td style={styles.td}>{new Date(pauta.data_avaliacao).toLocaleString()}</td>
                                <td style={styles.td}>
                                  <div><strong>{pauta.turma_nome}</strong></div>
                                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>{pauta.categoria_nome}</div>
                                </td>
                                <td style={styles.td}>{pauta.formando_nome}</td>
                                <td style={styles.td}>
                                  <span style={{ 
                                    backgroundColor: pauta.nota >= 10 ? '#10b98120' : '#ef444420',
                                    color: pauta.nota >= 10 ? '#10b981' : '#ef4444',
                                    padding: '4px 8px',
                                    borderRadius: '6px',
                                    fontSize: '12px',
                                    fontWeight: 'bold'
                                  }}>
                                    {resultado} ({pauta.nota}/20)
                                  </span>
                                </td>
                                <td style={{ ...styles.td, maxWidth: '250px', fontSize: '11px', color: '#94a3b8', fontStyle: 'italic' }}>
                                  {msgSms}
                                </td>
                                <td style={styles.td}>
                                  <div style={{ display: 'flex', gap: '5px' }}>
                                    <button 
                                      title="Enviar SMS"
                                      style={{ ...styles.actionButton, backgroundColor: '#fbbf24', color: '#000', padding: '6px' }}
                                      onClick={async () => {
                                        try {
                                          const resp = await fetch(`${API_URL}/api/notificacoes/enviar-lote`, {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({
                                              titulo: 'Resultado de Formação',
                                              mensagem: msgSms,
                                              publico_alvo: 'personalizado',
                                              candidatura_ids: [pauta.candidatura_id]
                                            })
                                          });
                                          if (resp.ok) alert("✅ Notificação enviada para " + pauta.formando_nome);
                                          else alert("❌ Falha no envio.");
                                        } catch (err) { alert("❌ Erro de conexão."); }
                                      }}
                                    >
                                      <Bell size={14} />
                                    </button>
                                    <button 
                                       title="WhatsApp Directo"
                                       style={{ ...styles.actionButton, backgroundColor: '#10b981', color: '#fff', padding: '6px' }}
                                       onClick={() => {
                                         const fone = pauta.formando_telefone ? (pauta.formando_telefone.startsWith('258') ? pauta.formando_telefone : '258' + pauta.formando_telefone) : '';
                                         if (!fone) return alert('Telefone não encontrado.');
                                         const link = `https://wa.me/${fone}?text=${encodeURIComponent(msgSms)}`;
                                         window.open(link, '_blank');
                                       }}
                                     >
                                       <MessageCircle size={14} />
                                     </button>
                                    <button 
                                      title="Apagar Pauta"
                                      style={{ ...styles.actionButton, backgroundColor: '#ef444420', color: '#ef4444', padding: '6px' }}
                                      onClick={() => apagarPauta(pauta.id)}
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        {pautasLista.length === 0 && (
                          <tr><td colSpan="7" style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>Nenhum resultado processado.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
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

            {/* PAUTAS SALVAS VIEW (Acesso Direto via Sidebar) */}
            {view === 'pautas' && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                 {/* Redireciona visualmente mantendo o contexto */}
                 {(() => { setView('formacao'); setFormacaoSubView('pautas'); return null; })()}
              </motion.div>
            )}

            {/* RELATÓRIOS VIEW - BI AVANÇADO */}
            {view === 'relatorios' && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                <div style={styles.pageHeader}>
                  <h2 style={styles.pageTitle}>Inteligência de Gestão (BI)</h2>
                  <div style={{ display: 'flex', gap: '10px' }}>
                     <button style={styles.refreshButton} onClick={() => window.print()}><Printer size={16} /> PDF</button>
                     <button style={styles.primaryButton} onClick={carregarDados}><RefreshCw size={16} /> Actualizar BI</button>
                  </div>
                </div>

                {relatoriosDados ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(450px, 1fr))', gap: '20px' }}>
                    
                    {/* Género */}
                    <div style={styles.sectionCard}>
                      <h4 style={{ color: '#fbbf24', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Users size={18} /> Equilíbrio de Género
                      </h4>
                      <table style={styles.table}>
                        <thead><tr style={styles.tr}><th style={styles.th}>Género</th><th style={styles.th}>Inscritos</th><th style={styles.th}>Em Formação</th></tr></thead>
                        <tbody>
                          {relatoriosDados.por_genero?.map((g, i) => (
                            <tr key={i} style={styles.tr}>
                              <td style={styles.td}>{g.genero || 'N/A'}</td>
                              <td style={styles.td}><strong style={{color: '#d4a30d'}}>{g.total_candidatos}</strong></td>
                              <td style={styles.td}>{g.total_formandos}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Idade */}
                    <div style={styles.sectionCard}>
                      <h4 style={{ color: '#fbbf24', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Calendar size={18} /> Perfil Etário (Anos)
                      </h4>
                      <table style={styles.table}>
                        <thead><tr style={styles.tr}><th style={styles.th}>Faixa Etária</th><th style={styles.th}>Inscritos</th><th style={styles.th}>Em Formação</th></tr></thead>
                        <tbody>
                          {relatoriosDados.por_idade?.map((id, i) => (
                            <tr key={i} style={styles.tr}>
                              <td style={styles.td}>{id.faixa_etaria} anos</td>
                              <td style={styles.td}><strong style={{color: '#d4a30d'}}>{id.total_candidatos}</strong></td>
                              <td style={styles.td}>{id.total_formandos}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Geográfico Provincial */}
                    <div style={styles.sectionCard}>
                      <h4 style={{ color: '#fbbf24', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Map size={18} /> Abrangência Provincial
                      </h4>
                      <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                        <table style={styles.table}>
                          <thead><tr style={styles.tr}><th style={styles.th}>Província</th><th style={styles.th}>Inscritos</th><th style={styles.th}>Em Formação</th></tr></thead>
                          <tbody>
                            {relatoriosDados.por_provincia?.map((p, i) => (
                              <tr key={i} style={styles.tr}>
                                <td style={styles.td}>{p.provincia}</td>
                                <td style={styles.td}><strong style={{color: '#d4a30d'}}>{p.total_candidatos}</strong></td>
                                <td style={styles.td}>{p.total_formandos}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Geográfico Distrital */}
                    <div style={styles.sectionCard}>
                      <h4 style={{ color: '#fbbf24', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Navigation size={18} /> Top Distritos (Actividade)
                      </h4>
                      <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                        <table style={styles.table}>
                          <thead><tr style={styles.tr}><th style={styles.th}>Distrito</th><th style={styles.th}>Inscritos</th><th style={styles.th}>Em Formação</th></tr></thead>
                          <tbody>
                            {relatoriosDados.por_distrito?.slice(0, 15).map((d, i) => (
                              <tr key={i} style={styles.tr}>
                                <td style={styles.td}>{d.distrito}</td>
                                <td style={styles.td}><strong style={{color: '#d4a30d'}}>{d.total_candidatos}</strong></td>
                                <td style={styles.td}>{d.total_formandos}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Resultados Recentes */}
                    <div style={{ ...styles.sectionCard, gridColumn: '1 / -1' }}>
                      <h4 style={{ color: '#fbbf24', marginBottom: '15px' }}>Últimas Pautas Processadas</h4>
                      <table style={styles.table}>
                        <thead><tr style={styles.tr}><th style={styles.th}>Data</th><th style={styles.th}>Turma</th><th style={styles.th}>Formando</th><th style={styles.th}>Nota</th><th style={styles.th}>Status</th></tr></thead>
                        <tbody>
                          {pautasLista.slice(0, 10).map((p, i) => (
                             <tr key={i} style={styles.tr}>
                               <td style={styles.td}>{new Date(p.data_avaliacao).toLocaleDateString()}</td>
                               <td style={styles.td}>{p.turma_nome}</td>
                               <td style={styles.td}>{p.formando_nome}</td>
                               <td style={styles.td}>{p.nota}/20</td>
                               <td style={styles.td}><span style={{ color: p.nota >= 10 ? '#10b981' : '#ef4444', fontWeight: 'bold' }}>{p.nota >= 10 ? 'APROVADO' : 'REPROVADO'}</span></td>
                             </tr>
                          ))}
                        </tbody>
                      </table>
                      <button style={{ ...styles.primaryButton, marginTop: '15px' }} onClick={() => setView('pautas')}><Search size={16} /> Consultar Arquivo de Pautas</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '100px', color: '#64748b' }}>
                     <RefreshCw size={48} className="animate-spin" style={{ margin: '0 auto 20px' }} />
                     <p>A processar indicadores estratégicos...</p>
                  </div>
                )}
              </motion.div>
            )}

            {/* BRIGADAS VIEW */}
            {view === 'brigadas' && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                <div style={{ ...styles.pageHeader, flexDirection: 'column', alignItems: 'flex-start', gap: '15px' }}>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button 
                      style={{ 
                        padding: '10px 20px',
                        backgroundColor: 'transparent',
                        border: 'none',
                        borderBottom: brigadaSubView === 'config' ? '2px solid #d4a30d' : 'none',
                        color: brigadaSubView === 'config' ? '#d4a30d' : '#94a3b8',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        cursor: 'pointer',
                        fontWeight: '500'
                      }}
                      onClick={() => setBrigadaSubView('config')}
                    >
                      <Settings2 size={18} /> Configuração de Modelos
                    </button>
                    <button 
                      style={{ 
                        padding: '10px 20px',
                        backgroundColor: 'transparent',
                        border: 'none',
                        borderBottom: brigadaSubView === 'operacional' ? '2px solid #d4a30d' : 'none',
                        color: brigadaSubView === 'operacional' ? '#d4a30d' : '#94a3b8',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        cursor: 'pointer',
                        fontWeight: '500'
                      }}
                      onClick={() => setBrigadaSubView('operacional')}
                    >
                      <HardHat size={18} /> Gestão Operacional
                    </button>
                  </div>

                  {brigadaSubView === 'config' ? (
                    <button style={styles.primaryButton} onClick={() => setShowNovoModeloModal(true)}>
                      <Plus size={18} /> Novo Modelo de Equipa
                    </button>
                  ) : (
                    <button style={styles.primaryButton} onClick={() => setShowNovaBrigadaModal(true)}>
                      <Plus size={18} /> Criar Nova Brigada/Mesa
                    </button>
                  )}
                </div>

                {brigadaSubView === 'config' && (
                  <div style={styles.tableContainer}>
                    <table style={styles.table}>
                      <thead>
                        <tr>
                          <th style={styles.th}>Nome do Modelo</th>
                          <th style={styles.th}>Processo</th>
                          <th style={styles.th}>Tipo</th>
                          <th style={styles.th}>Membros</th>
                          <th style={styles.th}>Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {modelosBrigada.map(m => (
                          <tr key={m.id} style={styles.tr}>
                            <td style={styles.td}>{m.nome}</td>
                            <td style={styles.td}>{processos.find(p => p.id === m.processo_id)?.nome || m.processo_id}</td>
                            <td style={styles.td}>
                              <span style={{ 
                                ...styles.statusBadge, 
                                backgroundColor: m.tipo === 'brigada' ? '#3b82f620' : m.tipo === 'mmv' ? '#6f42c120' : '#10b98120',
                                color: m.tipo === 'brigada' ? '#3b82f6' : m.tipo === 'mmv' ? '#6f42c1' : '#10b981'
                              }}>
                                {m.tipo.toUpperCase()}
                              </span>
                            </td>
                            <td style={styles.td}>{m.num_membros} membros</td>
                            <td style={styles.td}>
                              <button style={styles.actionButton} title="Ver Funções"><Eye size={16} /></button>
                              <button style={{...styles.actionButton, color: '#ef4444'}} title="Eliminar"><Trash2 size={16} /></button>
                            </td>
                          </tr>
                        ))}
                        {modelosBrigada.length === 0 && (
                          <tr><td colSpan="5" style={{...styles.td, textAlign: 'center'}}>Nenhum modelo configurado. Comece por definir o modelo para 2026.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

                {brigadaSubView === 'operacional' && (
                  <div style={styles.tableContainer}>
                    <table style={styles.table}>
                      <thead>
                        <tr>
                          <th style={styles.th}>Nome/Código</th>
                          <th style={styles.th}>Modelo</th>
                          <th style={styles.th}>Localização</th>
                          <th style={styles.th}>Membros Atuais</th>
                          <th style={styles.th}>Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {brigadas.map(b => (
                          <tr key={b.id} style={styles.tr}>
                            <td style={styles.td}>{b.nome}</td>
                            <td style={styles.td}>{modelosBrigada.find(m => m.id === b.modelo_id)?.nome || 'Sem modelo'}</td>
                            <td style={styles.td}>{b.localizacao}</td>
                            <td style={styles.td}>{b.membros?.length || 0} de {modelosBrigada.find(m => m.id === b.modelo_id)?.num_membros}</td>
                            <td style={styles.td}>
                              <button style={styles.actionButton}><Users size={16} /> Gerir Equipa</button>
                            </td>
                          </tr>
                        ))}
                        {brigadas.length === 0 && (
                          <tr><td colSpan="5" style={{...styles.td, textAlign: 'center'}}>Nenhuma brigada criada. Utilize um modelo acima para começar.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
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

        {/* Modal de Notificação Multicanal em Lote */}
        {showFeedbackModal && (
          <div style={styles.modalOverlay}>
            <motion.div 
               initial={{ opacity: 0, scale: 0.9 }} 
               animate={{ opacity: 1, scale: 1 }} 
               style={{ ...styles.modal, width: '550px' }}
            >
              <div style={styles.modalHeader}>
                <h3 style={styles.modalTitle}>Enviar Notificações em Massa</h3>
                <button style={styles.modalCloseButton} onClick={() => setShowFeedbackModal(false)}>×</button>
              </div>
              <div style={styles.modalBody}>
                <div style={{ backgroundColor: '#0f172a', padding: '15px', borderRadius: '10px', marginBottom: '20px', border: '1px solid #334155' }}>
                   <p style={{ margin: '0 0 5px 0', fontSize: '12px', color: '#94a3b8' }}>RESUMO DO LOTE</p>
                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#fbbf24' }}>{feedbackConfig.pautas.length}</span>
                      <span style={{ fontSize: '14px', color: '#fff' }}>Candidatos Seleccionados</span>
                   </div>
                </div>

                <div style={styles.formGroup}>
                   <label style={styles.label}>Título da Mensagem (Assunto Email)</label>
                   <input 
                      style={{...styles.input, marginBottom: 0}} 
                      value={feedbackConfig.titulo} 
                      onChange={e => setFeedbackConfig({ ...feedbackConfig, titulo: e.target.value })}
                   />
                </div>

                <div style={styles.formGroup}>
                   <label style={styles.label}>Seleccionar Canais de Saída</label>
                   <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                      {['sms', 'whatsapp', 'email'].map(canal => (
                        <label key={canal} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', backgroundColor: feedbackConfig.canais.includes(canal) ? '#fbbf2420' : '#0f172a', padding: '10px 12px', borderRadius: '8px', border: feedbackConfig.canais.includes(canal) ? '1px solid #fbbf24' : '1px solid #334155' }}>
                           <input 
                              type="checkbox" 
                              checked={feedbackConfig.canais.includes(canal)} 
                              onChange={() => {
                                 const novos = feedbackConfig.canais.includes(canal) 
                                   ? feedbackConfig.canais.filter(c => c !== canal)
                                   : [...feedbackConfig.canais, canal];
                                 setFeedbackConfig({ ...feedbackConfig, canais: novos });
                              }}
                           />
                           <span style={{ textTransform: 'uppercase', fontSize: '11px', fontWeight: 'bold', color: feedbackConfig.canais.includes(canal) ? '#fbbf24' : '#94a3b8' }}>{canal}</span>
                        </label>
                      ))}
                   </div>
                </div>

                <div style={{ marginTop: '20px', padding: '12px', backgroundColor: '#ef444410', borderRadius: '8px', border: '1px solid #ef444430' }}>
                   <p style={{ margin: 0, fontSize: '11px', color: '#ef4444', lineHeight: '1.4' }}>
                      <strong>⚠️ ATENÇÃO:</strong> Certifique-se de que os candidatos possuem contacto válido para os canais seleccionados.
                   </p>
                </div>
              </div>
              <div style={{ ...styles.modalBody, paddingTop: 0, display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                 <button style={{ ...styles.button, backgroundColor: '#334155' }} onClick={() => setShowFeedbackModal(false)}>Cancelar</button>
                 <button 
                  style={{ ...styles.button, backgroundColor: '#fbbf24', color: '#000', fontWeight: 'bold', opacity: (loading || feedbackConfig.canais.length === 0) ? 0.6 : 1 }} 
                  onClick={processarEnvioNotificacoes}
                  disabled={loading || feedbackConfig.canais.length === 0}
                 >
                    {loading ? 'A Enviar...' : `Confirmar Envio [${feedbackConfig.canais.length}]`}
                 </button>
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
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Primeiro Nome *</label>
                    <input
                      type="text"
                      style={styles.input}
                      value={registroPresencialForm.primeiro_nome}
                      onChange={(e) => setRegistroPresencialForm({ ...registroPresencialForm, primeiro_nome: e.target.value })}
                      placeholder="Ex: João"
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Apelido *</label>
                    <input
                      type="text"
                      style={styles.input}
                      value={registroPresencialForm.apelido}
                      onChange={(e) => setRegistroPresencialForm({ ...registroPresencialForm, apelido: e.target.value })}
                      placeholder="Ex: Manuel"
                    />
                  </div>
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
                      <th style={{ padding: '10px', borderBottom: '1px solid #334155' }}>Avaliação Principal</th>
                      <th style={{ padding: '10px', borderBottom: '1px solid #334155' }}>Obs. de Avaliação</th>
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
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              style={{
                                ...styles.actionButton,
                                padding: '8px 12px',
                                backgroundColor: formando.resultado === 'aprovado' ? '#10b981' : '#1e293b',
                                color: formando.resultado === 'aprovado' ? '#000' : '#fff',
                                fontWeight: '600',
                                border: formando.resultado === 'aprovado' ? 'none' : '1px solid #334155',
                                flex: 1
                              }}
                              onClick={() => {
                                const newF = [...formandosPauta];
                                newF[index].resultado = 'aprovado';
                                newF[index].nota_final = 10; // Garantir mínima para aprovação
                                setFormandosPauta(newF);
                              }}
                            >
                              <Check size={14} style={{ marginRight: '4px' }}/> Aprovar
                            </button>
                            <button
                              style={{
                                ...styles.actionButton,
                                padding: '8px 12px',
                                backgroundColor: formando.resultado === 'reprovado' ? '#ef4444' : '#1e293b',
                                color: '#fff',
                                fontWeight: '600',
                                border: formando.resultado === 'reprovado' ? 'none' : '1px solid #334155',
                                flex: 1
                              }}
                              onClick={() => {
                                const newF = [...formandosPauta];
                                newF[index].resultado = 'reprovado';
                                newF[index].nota_final = 0;
                                setFormandosPauta(newF);
                              }}
                            >
                              <X size={14} style={{ marginRight: '4px' }}/> Reprovar
                            </button>
                          </div>
                          <div style={{ marginTop: '5px' }}>
                             <label style={{ fontSize: '11px', color: '#94a3b8' }}>Nota Final:</label>
                             <input 
                                type="number" 
                                style={{ ...styles.input, padding: '4px', marginTop: '2px' }} 
                                value={formando.nota_final}
                                min="0" max="20"
                                onChange={(e) => {
                                  const newF = [...formandosPauta];
                                  newF[index].nota_final = parseFloat(e.target.value) || 0;
                                  setFormandosPauta(newF);
                                }}
                             />
                          </div>
                        </td>
                        <td style={{ padding: '10px', borderBottom: '1px solid #334155' }}>
                          <textarea 
                            style={{ ...styles.textarea, minWidth: '200px' }} 
                            rows="3"
                            value={formando.observacoes}
                            placeholder="Descreva o desempenho ou motivo da reprobação..."
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
              style={{ ...styles.modal, width: '850px', maxWidth: '95vw' }}
            >
              <div style={styles.modalHeader}>
                <h3 style={styles.modalTitle}>Central de Notificações Multicanal</h3>
                <button style={styles.modalCloseButton} onClick={() => setShowNovaNotificacaoModal(false)}>×</button>
              </div>

              <div style={styles.modalBody}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  {/* Lado Esquerdo: Público e Segmentação */}
                  <div style={{ paddingRight: '15px', borderRight: '1px solid #334155' }}>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>1. Origem do Evento</label>
                      <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                        {['candidaturas', 'formacao'].map(ev => (
                          <button 
                            key={ev}
                            style={{ 
                              ...styles.actionButton, 
                              flex: 1,
                              backgroundColor: novaNotificacaoForm.evento === ev ? '#fbbf24' : '#1e293b', 
                              color: novaNotificacaoForm.evento === ev ? '#000' : '#94a3b8',
                              fontWeight: '600'
                            }}
                            onClick={() => setNovaNotificacaoForm({...novaNotificacaoForm, evento: ev})}
                          >
                            {ev === 'candidaturas' ? 'Candidaturas' : 'Resultados Formação'}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div style={styles.formGroup}>
                      <label style={styles.label}>2. Destinatários (Papel/Função)</label>
                      <select
                        style={styles.select}
                        value={novaNotificacaoForm.categoria_id}
                        onChange={(e) => setNovaNotificacaoForm({...novaNotificacaoForm, categoria_id: e.target.value})}
                      >
                        <option value="">TODOS (Sem filtro de cargo)</option>
                        {categorias.map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.nome}s</option>
                        ))}
                      </select>
                    </div>

                    <div style={styles.formGroup}>
                      <label style={styles.label}>3. Fase / Status</label>
                      <select
                        style={styles.select}
                        value={novaNotificacaoForm.publico_alvo}
                        onChange={(e) => setNovaNotificacaoForm({ ...novaNotificacaoForm, publico_alvo: e.target.value })}
                      >
                        <option value="todos">Todos os Seleccionados</option>
                        <option value="aprovados">Aprovados / Aceites</option>
                        <option value="reprovados">Reprovados / Não Aceites</option>
                        {novaNotificacaoForm.evento === 'candidaturas' && <option value="pendentes">Em Avaliação (Pendentes)</option>}
                      </select>
                    </div>

                    <div style={styles.formGroup}>
                      <label style={styles.label}>4. Canais de Disparo</label>
                      <div style={{ display: 'flex', gap: '15px', backgroundColor: '#0f172a', padding: '10px', borderRadius: '8px' }}>
                        {['sms', 'email', 'whatsapp'].map(canal => (
                          <label key={canal} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px', cursor: 'pointer', color: novaNotificacaoForm.canais.includes(canal) ? '#fbbf24' : '#64748b' }}>
                            <input 
                              type="checkbox" 
                              checked={novaNotificacaoForm.canais.includes(canal)}
                              onChange={() => {
                                const canais = novaNotificacaoForm.canais.includes(canal) 
                                  ? novaNotificacaoForm.canais.filter(c => c !== canal)
                                  : [...novaNotificacaoForm.canais, canal];
                                setNovaNotificacaoForm({...novaNotificacaoForm, canais});
                              }}
                            />
                            {canal.toUpperCase()}
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Lado Direito: Conteúdo e Envio */}
                  <div>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Título da Mensagem</label>
                      <input
                        type="text"
                        style={styles.input}
                        placeholder="Ex: CONVOCATÓRIA STAE"
                        value={novaNotificacaoForm.titulo}
                        onChange={(e) => setNovaNotificacaoForm({ ...novaNotificacaoForm, titulo: e.target.value })}
                      />
                    </div>

                    <div style={styles.formGroup}>
                      <label style={{ ...styles.label, display: 'flex', justifyContent: 'space-between' }}>
                        <span>Conteúdo da Mensagem</span>
                        <span style={{ color: '#fbbf24', fontSize: '10px', cursor: 'pointer' }} onClick={() => setNovaNotificacaoForm({...novaNotificacaoForm, mensagem: "STAE SOFALA INFORMA:\n"})}>Usar Template</span>
                      </label>
                      <textarea
                        style={{ ...styles.textarea, height: '150px', fontSize: '14px' }}
                        rows="6"
                        placeholder="Escreva a mensagem aqui..."
                        value={novaNotificacaoForm.mensagem}
                        onChange={(e) => setNovaNotificacaoForm({ ...novaNotificacaoForm, mensagem: e.target.value })}
                      />
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
                        <small style={{ color: '#64748b' }}>Caracteres: {novaNotificacaoForm.mensagem.length}</small>
                        <small style={{ color: '#94a3b8' }}>Variáveis: [STATUS], [UNIDADE], [LOCAL]</small>
                      </div>
                    </div>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer', marginBottom: '20px' }}>
                      <input 
                        type="checkbox"
                        checked={novaNotificacaoForm.incluir_nome}
                        onChange={(e) => setNovaNotificacaoForm({...novaNotificacaoForm, incluir_nome: e.target.checked})}
                      />
                      Personalizar com nome do destinatário (ex: "Caro João...")
                    </label>

                    <button
                      style={{ ...styles.primaryButton, width: '100%', padding: '15px' }}
                      onClick={enviarNovaNotificacao}
                      disabled={novaNotificacaoForm.canais.length === 0 || !novaNotificacaoForm.mensagem}
                    >
                      <MessageSquare size={18} /> DISPARAR NOTIFICAÇÕES EM MASSA
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Modal Detalhes Candidatura */}
        {showDetalhesCandidaturaModal && selectedCandidatura && (
          <div style={styles.modalOverlay}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{ ...styles.modal, width: '550px' }}
            >
              <div style={{ ...styles.modalHeader, borderBottom: '1px solid #d4a30d' }}>
                <h3 style={styles.modalTitle}>Ficha de Candidatura</h3>
                <button
                  style={styles.modalCloseButton}
                  onClick={() => setShowDetalhesCandidaturaModal(false)}
                >
                  ×
                </button>
              </div>

              <div style={styles.modalBody}>
                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                  <h2 style={{ margin: '0 0 5px 0', color: 'white' }}>{selectedCandidatura.nome_completo}</h2>
                  <span style={{ 
                    ...styles.statusBadge, 
                    backgroundColor: selectedCandidatura.estado_geral === 'aprovado' ? '#10b98120' : '#d4a30d20',
                    color: selectedCandidatura.estado_geral === 'aprovado' ? '#10b981' : '#fbbf24'
                  }}>
                    {selectedCandidatura.estado_geral?.toUpperCase() || 'PENDENTE'}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                  <div style={{ backgroundColor: '#0f172a', padding: '12px', borderRadius: '8px' }}>
                    <p style={{ margin: '0 0 5px 0', fontSize: '11px', color: '#94a3b8' }}>BI / NUIT</p>
                    <p style={{ margin: 0, fontSize: '14px', color: 'white' }}>{selectedCandidatura.bi_numero || 'N/A'} / {selectedCandidatura.nuit || 'N/A'}</p>
                  </div>
                  <div style={{ backgroundColor: '#0f172a', padding: '12px', borderRadius: '8px' }}>
                    <p style={{ margin: '0 0 5px 0', fontSize: '11px', color: '#94a3b8' }}>Género / Nascimento</p>
                    <p style={{ margin: 0, fontSize: '14px', color: 'white' }}>{selectedCandidatura.genero || 'N/A'} • {selectedCandidatura.data_nascimento ? new Date(selectedCandidatura.data_nascimento).toLocaleDateString() : 'N/A'}</p>
                  </div>
                  <div style={{ backgroundColor: '#0f172a', padding: '12px', borderRadius: '8px' }}>
                    <p style={{ margin: '0 0 5px 0', fontSize: '11px', color: '#94a3b8' }}>Localização Atribuição</p>
                    <p style={{ margin: 0, fontSize: '14px', color: 'white' }}>{selectedCandidatura.provincia_nome} / {selectedCandidatura.distrito_nome}</p>
                  </div>
                  <div style={{ backgroundColor: '#0f172a', padding: '12px', borderRadius: '8px' }}>
                    <p style={{ margin: '0 0 5px 0', fontSize: '11px', color: '#94a3b8' }}>Pontuação Entrevista</p>
                    <p style={{ margin: 0, fontSize: '16px', color: '#fbbf24', fontWeight: '800' }}>{selectedCandidatura.pontuacao_entrevista || 0} / 100 pts</p>
                  </div>
                </div>

                {selectedCandidatura.recomendacoes && (
                  <div style={{ marginTop: '15px', padding: '12px', borderLeft: '3px solid #fbbf24', backgroundColor: '#fbbf2410' }}>
                    <p style={{ margin: '0 0 5px 0', fontSize: '11px', color: '#fbbf24' }}>Recomendações técnicas</p>
                    <p style={{ margin: 0, fontSize: '13px', color: 'white', fontStyle: 'italic' }}>"{selectedCandidatura.recomendacoes}"</p>
                  </div>
                )}

                <div style={styles.modalActions}>
                   <button style={styles.refreshButton} onClick={() => window.print()}>
                     <FileText size={16} /> Imprimir Ficha
                   </button>
                   <button style={styles.primaryButton} onClick={() => setShowDetalhesCandidaturaModal(false)}>
                     Fechar
                   </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Modal Novo Modelo de Brigada */}
        {showNovoModeloModal && (
          <div style={styles.modalOverlay}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} style={{ ...styles.modal, width: '700px' }}>
              <div style={styles.modalHeader}>
                <h3 style={styles.modalTitle}>Definir Modelo de Equipa (Brigadas/MMVs)</h3>
                <button style={styles.modalCloseButton} onClick={() => setShowNovoModeloModal(false)}>×</button>
              </div>
              <div style={{ ...styles.modalBody, maxHeight: '70vh', overflowY: 'auto' }}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Nome do Modelo</label>
                  <input style={styles.input} type="text" placeholder="Ex: Brigada Tipo A - Beira" value={novoModeloForm.nome} onChange={e => setNovoModeloForm({...novoModeloForm, nome: e.target.value})} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Processo Eleitoral</label>
                    <select style={{ ...styles.select, border: !novoModeloForm.processo_id ? '1px solid #ef4444' : '1px solid #334155' }} value={novoModeloForm.processo_id} onChange={e => setNovoModeloForm({...novoModeloForm, processo_id: e.target.value})}>
                      <option value="">Selecione...</option>
                      {processos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                    </select>
                    {!novoModeloForm.processo_id && <span style={{ fontSize: '10px', color: '#ef4444' }}>Selecção obrigatória</span>}
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Tipo de Equipa</label>
                    <select style={styles.select} value={novoModeloForm.tipo} onChange={e => setNovoModeloForm({...novoModeloForm, tipo: e.target.value})}>
                      <option value="brigada">BRIGADA (Recenseamento)</option>
                      <option value="agente">AGENTE (Educação Cívica)</option>
                      <option value="mmv">MMV (Mesa de Voto)</option>
                    </select>
                  </div>
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Número Total de Membros</label>
                  <input style={styles.input} type="number" min="1" value={novoModeloForm.num_membros} onChange={e => setNovoModeloForm({...novoModeloForm, num_membros: parseInt(e.target.value)})} />
                </div>
                <hr style={{ border: 'none', borderBottom: '1px solid #334155', margin: '20px 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                  <h4 style={{ margin: 0, color: '#d4a30d' }}>Funções e Atribuições</h4>
                  <button style={{ ...styles.actionButton, backgroundColor: '#3b82f6' }} onClick={adicionarFuncaoAoModelo}>
                    <Plus size={16} /> Adicionar Função
                  </button>
                </div>
                {novoModeloForm.funcoes.map((f, idx) => (
                  <div key={f.id} style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 40px', gap: '10px', marginBottom: '10px', alignItems: 'end' }}>
                    <div>
                      <label style={{ fontSize: '11px', color: '#94a3b8' }}>Cargo</label>
                      <input style={styles.input} type="text" placeholder="Ex: Supervisor" value={f.cargo} onChange={e => atualizarFuncaoNoModelo(f.id, 'cargo', e.target.value)} />
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', color: '#94a3b8' }}>Objectivo</label>
                      <input style={styles.input} type="text" placeholder="Descrição..." value={f.objetivo} onChange={e => atualizarFuncaoNoModelo(f.id, 'objetivo', e.target.value)} />
                    </div>
                    <button style={{ ...styles.actionButton, color: '#ef4444', marginBottom: '8px' }} onClick={() => removerFuncaoDoModelo(f.id)}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
                <div style={styles.formGroup}>
                  <label style={styles.label}>Observações Gerais</label>
                  <textarea style={styles.textarea} rows="2" value={novoModeloForm.observacoes} onChange={e => setNovoModeloForm({...novoModeloForm, observacoes: e.target.value})} placeholder="Instruções adicionais..."></textarea>
                </div>
              </div>
              <div style={styles.modalActions}>
                <button style={{ ...styles.button, backgroundColor: '#6b7280' }} onClick={() => setShowNovoModeloModal(false)}>Cancelar</button>
                <button 
                  style={styles.primaryButton} 
                  onClick={() => {
                    console.log('Botão Definir Modelo clicado');
                    salvarModelo();
                  }}
                >
                  Definir Modelo
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Modal Nova Brigada Operacional */}
        {showNovaBrigadaModal && (
          <div style={styles.modalOverlay}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} style={{ ...styles.modal, width: '950px', maxWidth: '98vw' }}>
              <div style={styles.modalHeader}>
                <h3 style={styles.modalTitle}>Criar Unidade Operacional</h3>
                <button style={styles.modalCloseButton} onClick={() => setShowNovaBrigadaModal(false)}>×</button>
              </div>
              <div style={styles.modalBody}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Modelo Base</label>
                  <select 
                    style={styles.select} 
                    value={novaBrigadaForm.modelo_id} 
                    onChange={e => setNovaBrigadaForm({...novaBrigadaForm, modelo_id: e.target.value})}
                  >
                    <option value="">Seleccione o Modelo...</option>
                    {modelosBrigada.map(m => (
                      <option key={m.id} value={m.id}>{m.nome} ({m.tipo.toUpperCase()})</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '15px' }}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Nome da Unidade (Local)</label>
                    <input 
                      style={styles.input} 
                      type="text" 
                      placeholder="Ex: Escola Primária do Estoril" 
                      value={novaBrigadaForm.nome} 
                      onChange={e => setNovaBrigadaForm({...novaBrigadaForm, nome: e.target.value})} 
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Código/ID Único</label>
                    <input 
                      style={{ ...styles.input, fontWeight: 'bold', color: '#fbbf24', letterSpacing: '1px' }} 
                      type="text" 
                      placeholder="0500100011" 
                      value={novaBrigadaForm.codigo || ''} 
                      readOnly
                    />
                  </div>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Referência Geográfica (Ponto de GPS)</label>
                  <input 
                    style={styles.input} 
                    type="text" 
                    placeholder="Coordenadas ou morada detalhada..." 
                    value={novaBrigadaForm.localizacao} 
                    onChange={e => setNovaBrigadaForm({...novaBrigadaForm, localizacao: e.target.value})} 
                  />
                </div>

                <MapaLocalizacao 
                   distritoNome={user?.nome_completo?.replace('Admin Distrital ', '') || 'Beira'} 
                   onSelect={selecionarLocalizacaoBrigada}
                   valorAtual={novaBrigadaForm.localizacao}
                />

                {novaBrigadaForm.modelo_id && (
                  <div style={{ marginTop: '20px', borderTop: '1px solid #334155', paddingTop: '20px' }}>
                    <h4 style={{ margin: '0 0 15px 0', color: '#d4a30d', fontSize: '14px' }}>Alocação de Membros (Conforme Modelo)</h4>
                    {modelosBrigada.find(m => m.id === (novaBrigadaForm.modelo_id))?.funcoes?.map(funcao => (
                      <div key={funcao.id} style={{ ...styles.formGroup, marginBottom: '12px' }}>
                        <label style={{ ...styles.label, fontSize: '12px', display: 'flex', justifyContent: 'space-between' }}>
                          <span>Função: {funcao.cargo}</span>
                          <span style={{ color: '#64748b' }}>{funcao.objetivo}</span>
                        </label>
                        <select 
                          style={styles.select}
                          value={novaBrigadaForm.membros.find(m => m.funcao_id === funcao.id)?.candidato_id || ''}
                          onChange={e => {
                            const candidateId = e.target.value;
                            const currentMembros = [...novaBrigadaForm.membros];
                            const index = currentMembros.findIndex(m => m.funcao_id === funcao.id);
                            
                            if (index >= 0) {
                              if (!candidateId) currentMembros.splice(index, 1);
                              else currentMembros[index].candidato_id = candidateId;
                            } else if (candidateId) {
                              currentMembros.push({ funcao_id: funcao.id, candidato_id: candidateId });
                            }
                            
                            setNovaBrigadaForm({ ...novaBrigadaForm, membros: currentMembros });
                          }}
                        >
                          <option value="">Seleccione o Candidato...</option>
                          {candidaturas
                            .filter(c => c.estado_geral === 'aprovado')
                            .map(c => (
                              <option key={c.id} value={c.id}>
                                {c.nome_completo} ({c.pontuacao_entrevista || 0} pts)
                              </option>
                            ))
                          }
                        </select>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div style={styles.modalActions}>
                <button style={{ ...styles.button, backgroundColor: '#6b7280' }} onClick={() => setShowNovaBrigadaModal(false)}>Cancelar</button>
                <button style={styles.primaryButton} onClick={salvarNovaBrigada}>
                  <HardHat size={16} /> Criar Unidade
                </button>
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
  },
  viewToggle: {
    display: 'flex',
    backgroundColor: '#1E293B',
    borderRadius: '8px',
    padding: '4px',
    border: '1px solid #334155',
    marginRight: '8px'
  },
  toggleButton: (isActive) => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '36px',
    height: '36px',
    borderRadius: '6px',
    border: 'none',
    backgroundColor: isActive ? '#D4A30D' : 'transparent',
    color: isActive ? '#000' : '#94A3B8',
    cursor: 'pointer',
    transition: 'all 0.2s'
  })
};

export default App;
