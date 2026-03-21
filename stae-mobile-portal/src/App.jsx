import React, { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Tesseract from 'tesseract.js';
import { 
  User, 
  MapPin, 
  Award, 
  LogOut,
  Camera,
  ArrowLeft,
  CheckCircle,
  ShieldCheck,
  Briefcase,
  FileText,
  Upload,
  Globe,
  ChevronRight,
  UserPlus
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'https://staeapi-sofala.onrender.com';

// CARTOGRAFIA OFICIAL DE SOFALA - RIGOR PROACTIVO
const SOFALA_GEO = {
  provincia: 'Sofala',
  distritos: [
    { name: 'Beira', postos: ['Beira (Cidade)', 'Munhava', 'Manga', 'Ponta-Gêa', 'Chaimite', 'Nhangau'] },
    { name: 'Dondo', postos: ['Dondo (Cidade)', 'Mafambisse'] },
    { name: 'Nhamatanda', postos: ['Nhamatanda (Vila)', 'Tica', 'Metuchira'] },
    { name: 'Búzi', postos: ['Búzi-Sede', 'Estaquinha', 'Nova Sofala'] },
    { name: 'Caia', postos: ['Caia (Vila)', 'Sena', 'Murraça'] },
    { name: 'Gorongosa', postos: ['Gorongosa (Vila)', 'Vunduzi'] },
    { name: 'Marromeu', postos: ['Marromeu (Vila)', 'Chupanga'] },
    { name: 'Chemba', postos: ['Chemba-Sede', 'Chiramba', 'Mulima'] },
    { name: 'Cheringoma', postos: ['Inhaminga', 'Inhamitanga'] },
    { name: 'Chibabava', postos: ['Chibabava-Sede', 'Goonda', 'Muxungue'] },
    { name: 'Machanga', postos: ['Machanga-Sede', 'Divinhe'] },
    { name: 'Maringué', postos: ['Maringué-Sede', 'Canxixe', 'Subui'] },
    { name: 'Muanza', postos: ['Muanza-Sede', 'Galinha'] }
  ]
};

const FlexibleCropView = ({ rawImage, onFinalize, onCancel }) => {
  const containerRef = useRef(null);
  const imgRef = useRef(null);
  const [squareSize, setSquareSize] = useState(140);
  const [cropPos, setCropPos] = useState({ x: 0, y: 0 });

  const generateImg = async () => {
    const img = imgRef.current;
    const imageActual = new Image();
    imageActual.src = rawImage;
    await new Promise(resolve => imageActual.onload = resolve);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const scaleX = imageActual.naturalWidth / img.clientWidth;
    const scaleY = imageActual.naturalHeight / img.clientHeight;
    canvas.width = squareSize * scaleX;
    canvas.height = squareSize * scaleY;
    const rect = img.getBoundingClientRect();
    ctx.drawImage(imageActual, (cropPos.x + rect.width/2 - squareSize/2) * scaleX, (cropPos.y + rect.height/2 - squareSize/2) * scaleY, squareSize * scaleX, squareSize * scaleY, 0, 0, canvas.width, canvas.height);
    onFinalize(canvas.toDataURL('image/jpeg'));
  };

  return (
    <div className="premium-container" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, background: '#000', display: 'flex', flexDirection: 'column' }}>
       <div style={{ padding: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#001f42', borderBottom: '1px solid #d4a30d' }}>
          <button onClick={onCancel} style={{ color: 'white', background: 'none', border: 'none' }}><ArrowLeft/></button>
          <h3 style={{ fontSize: 13, fontWeight: 800 }}>RECORTE BIOMÉTRICO 2026</h3>
          <div style={{ width: 40 }}/>
       </div>
       <div ref={containerRef} style={{ position: 'relative', flex: 1, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <img ref={imgRef} src={rawImage} style={{ maxWidth: '100%', maxHeight: '100%', pointerEvents: 'none' }} />
          <motion.div drag dragConstraints={containerRef} dragMomentum={false} onDrag={(e, info) => setCropPos({ x: info.offset.x, y: info.offset.y })}
            style={{ position: 'absolute', width: squareSize, height: squareSize, border: '3px solid #d4a30d', borderRadius: 12, boxShadow: '0 0 0 5000px rgba(0,0,0,0.8)', zIndex: 100 }}
          />
       </div>
       <div style={{ padding: '24px 32px', background: '#001f42', textAlign: 'center' }}>
          <input type="range" min="60" max="350" value={squareSize} onChange={(e) => setSquareSize(parseInt(e.target.value))} style={{ width: '100%', accentColor: '#d4a30d', marginBottom: 20 }} />
          <button className="stae-button" onClick={generateImg}>CONFIRMAR FOTO OFICIAL</button>
       </div>
    </div>
  );
};

export default function App() {
  const [view, setView] = useState('landing');
  const [loading, setLoading] = useState(false);
  const [rawImage, setRawImage] = useState(null);
  const [extractedPhoto, setExtractedPhoto] = useState(null);
  const [certificatesAttached, setCertificatesAttached] = useState(false);
  const [regForm, setRegForm] = useState({ 
    nome: '', nuit: '', genero: '', categoria: '', evento: 'PROCESSO ELEITORAL 2026',
    provincia: 'Sofala', distrito: '', posto: '', localidade: ''
  });

  const distritosDisponiveis = SOFALA_GEO.distritos;
  const postosDisponiveis = distritosDisponiveis.find(d => d.name === regForm.distrito)?.postos || [];

  return (
    <AnimatePresence mode='wait'>
      {view === 'landing' && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="premium-container" style={{ justifyContent: 'center' }}>
        <img src="/logo_stae.svg" width="80" style={{ margin: '0 auto 32px', display: 'block' }}/>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
           <h1 className="gold-gradient-text" style={{ fontSize: 18, fontWeight: 900, lineHeight: 1.3 }}>SECRETARIADO TÉCNICO DE ADMINISTRAÇÃO ELEITORAL</h1>
           <p style={{ opacity: 0.6, fontSize: 12, fontWeight: 700, letterSpacing: 1, marginTop: 12 }}>DIRECÇÃO PROVINCIAL DE SOFALA | 2026</p>
        </div>
        <div style={{ display: 'grid', gap: 16 }}>
          <button className="glass-card" style={{ padding: 24, textAlign: 'left', border: '2px solid #4ade80', display: 'flex', gap: 20 }} onClick={() => setView('role-selection')}><Briefcase color="#4ade80"/> <div><h3 style={{ margin: 0 }}>Candidatagem Oficial</h3><p style={{ opacity: 0.4, fontSize: 11, margin: '4px 0 0' }}>Novo Ciclo Eleitoral</p></div></button>
          <button className="glass-card" style={{ padding: 24, textAlign: 'left', display: 'flex', gap: 20 }} onClick={() => setView('login')}><User color="#d4a30d"/> <div><h3 style={{ margin: 0 }}>Portal do Candidato</h3><p style={{ opacity: 0.4, fontSize: 11, margin: '4px 0 0' }}>Gestão de Perfil</p></div></button>
        </div>
      </motion.div>}

      {view === 'role-selection' && <div className="premium-container" style={{ justifyContent: 'center' }}>
         <div style={{ textAlign: 'center', marginBottom: 32 }}><h2 className="gold-gradient-text" style={{ fontSize: 22, fontWeight: 900 }}>FUNÇÃO PRETENDIDA</h2><p style={{ opacity: 0.5 }}>Selecione o seu papel no evento de 2026.</p></div>
         <div style={{ display: 'grid', gap: 10 }}>
            {['MMV - Membro de Mesa de Voto', 'Brigadista Provincial', 'Agente de Educação Cívica', 'Supervisor de Campo'].map(role => (
              <button key={role} className="glass-card" style={{ padding: 20, textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} onClick={() => { setRegForm({...regForm, categoria: role}); setView('geo-selection'); }}><span>{role}</span><ChevronRight size={18} color="#d4a30d"/></button>
            ))}
            <button style={{ background: 'none', border: 'none', color: '#fff', opacity: 0.5, marginTop: 24 }} onClick={() => setView('landing')}>Voltar</button>
         </div>
      </div>}

      {view === 'geo-selection' && <div className="premium-container">
         <div style={{ marginBottom: 32 }}><h2 className="gold-gradient-text" style={{ fontSize: 24, fontWeight: 900 }}>CIRCUNSCRIÇÃO ELEITORAL</h2><p style={{ opacity: 0.5 }}>Pauta Administrativa de Sofala.</p></div>
         <div className="glass-card" style={{ display: 'grid', gap: 20 }}>
            <div><p style={{ fontSize: 11, fontWeight: 800, color: '#d4a30d', marginBottom: 8 }}>PROVÍNCIA</p><select className="stae-input" value={regForm.provincia} readOnly disabled><option>Sofala</option></select></div>
            <div><p style={{ fontSize: 11, fontWeight: 800, color: '#d4a30d', marginBottom: 8 }}>DISTRITO</p><select className="stae-input" value={regForm.distrito} onChange={e => setRegForm({...regForm, distrito: e.target.value, posto: ''})}><option value="">Selecione...</option>{distritosDisponiveis.map(d => <option key={d.name} value={d.name}>{d.name}</option>)}</select></div>
            <div><p style={{ fontSize: 11, fontWeight: 800, color: '#d4a30d', marginBottom: 8 }}>POSTO ADMINISTRATIVO</p><select className="stae-input" value={regForm.posto} disabled={!regForm.distrito} onChange={e => setRegForm({...regForm, posto: e.target.value})}><option value="">Selecione o Posto...</option>{postosDisponiveis.map(p => <option key={p} value={p}>{p}</option>)}</select></div>
            <button className="stae-button" style={{ marginTop: 20 }} disabled={!regForm.posto} onClick={() => setView('personal-data')}>Próximo: Dados Pessoais</button>
         </div>
      </div>}

      {view === 'personal-data' && <div className="premium-container">
         <div style={{ marginBottom: 32 }}><h2 className="gold-gradient-text" style={{ fontSize: 24, fontWeight: 900 }}>DADOS DO CANDIDATO</h2><p style={{ opacity: 0.5 }}>Introduza as suas informações oficiais.</p></div>
         <div className="glass-card" style={{ display: 'grid', gap: 20 }}>
            <div><p style={{ fontSize: 11, fontWeight: 800, color: '#d4a30d', marginBottom: 8 }}>NOME COMPLETO</p><input type="text" className="stae-input" placeholder="Conforme o Bilhete de Identidade" value={regForm.nome} onChange={e => setRegForm({...regForm, nome: e.target.value})} /></div>
            <div style={{ display: 'flex', gap: 16 }}>
               <div style={{ flex: 1 }}><p style={{ fontSize: 11, fontWeight: 800, color: '#d4a30d', marginBottom: 8 }}>GÉNERO</p><select className="stae-input" value={regForm.genero} onChange={e => setRegForm({...regForm, genero: e.target.value})}><option value="">-</option><option value="M">Masculino</option><option value="F">Feminino</option></select></div>
               <div style={{ flex: 1 }}><p style={{ fontSize: 11, fontWeight: 800, color: '#d4a30d', marginBottom: 8 }}>NUIT / BI</p><input type="text" className="stae-input" placeholder="Extração Automática" value={regForm.nuit} onChange={e => setRegForm({...regForm, nuit: e.target.value})} /></div>
            </div>
            <button className="stae-button" style={{ marginTop: 20 }} disabled={!regForm.nome || !regForm.genero} onClick={() => setView('cert-upload')}>Próximo: Documentação</button>
         </div>
      </div>}

      {view === 'cert-upload' && <div className="premium-container" style={{ justifyContent: 'center' }}>
         <div style={{ textAlign: 'center', marginBottom: 32 }}><h2 className="gold-gradient-text" style={{ fontSize: 20, fontWeight: 900 }}>PROVA DE HABILITAÇÕES</h2><p style={{ opacity: 0.4 }}>Anexe o Certificado literário oficial.</p></div>
         <div className="glass-card" style={{ textAlign: 'center', padding: '40px 24px', border: certificatesAttached ? '2px solid #4ade80' : '2px dashed #d4a30d' }}>
            <Upload size={48} color={certificatesAttached ? "#4ade80" : "#d4a30d"} style={{ marginBottom: 20 }} />
            <p style={{ marginBottom: 24 }}>{certificatesAttached ? 'Documento Recebido' : 'Clique para carregar Foto do Diploma'}</p>
            <label className="stae-button" style={{ cursor: 'pointer' }}>{certificatesAttached ? 'Trocar' : 'Carregar'}<input type="file" onChange={() => setCertificatesAttached(true)} style={{ display: 'none' }} /></label>
            {certificatesAttached && <button className="stae-button" style={{ marginTop: 20, background: '#1e293b' }} onClick={() => setView('id-scanner')}>Próximo: Validação Biométrica</button>}
         </div>
      </div>}

      {view === 'id-scanner' && <div className="premium-container" style={{ justifyContent: 'center' }}><div className="glass-card" style={{ textAlign: 'center' }}><h2 className="gold-gradient-text" style={{ fontSize: 22, marginBottom: 16 }}>VALIDAÇÃO DOCUMENTAL</h2><p style={{ opacity: 0.6, marginBottom: 32 }}>Capture o seu BI de Moçambique agora.</p><label className="stae-button" style={{ display: 'flex', gap: 12, justifyContent: 'center', cursor: 'pointer' }}><Camera /> Scanner Oficial 2026<input type="file" accept="image/*" onChange={(e) => { 
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = (re) => { setRawImage(re.target.result); setView('crop'); };
        reader.readAsDataURL(file);
      }} style={{ display: 'none' }} /></label></div></div>}
      
      {view === 'crop' && <FlexibleCropView rawImage={rawImage} onCancel={() => setView('id-scanner')} onFinalize={(photo) => { setExtractedPhoto(photo); setView('portal'); }} />}

      {view === 'portal' && <div className="premium-container" style={{ justifyContent: 'center' }}>
         <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} style={{ background: 'white', borderRadius: 16, overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.5)', border: '1px solid #ddd' }}>
            <div style={{ background: '#001f42', padding: 16, textAlign: 'center' }}><img src="/logo_stae.svg" width="36" /><p style={{ color: 'white', fontSize: 9, fontWeight: 900, marginTop: 8 }}>REPÚBLICA DE MOÇAMBIQUE</p><p style={{ color: '#d4a30d', fontSize: 10, fontWeight: 900 }}>SECRETARIADO TÉCNICO DE ADMINISTRAÇÃO ELEITORAL</p></div>
            <div style={{ padding: 24, color: '#333', textAlign: 'center' }}>
               <h2 style={{ fontSize: 12, color: '#001f42', fontWeight: 900 }}>{regForm.evento}</h2>
               <p style={{ fontSize: 10, color: '#d4a30d', fontWeight: 800, marginBottom: 16 }}>{regForm.categoria.toUpperCase()}</p>
               <img src={extractedPhoto} width="100" style={{ borderRadius: 8, border: '1px solid #ccc', padding: 4, marginBottom: 12 }} />
               <h3 style={{ fontSize: 18, color: '#000', marginBottom: 2 }}>{regForm.nome || 'CANDIDATO VALIDADO'}</h3>
               <p style={{ fontSize: 11, color: '#666' }}>{regForm.distrito} | {regForm.posto}</p>
               <div style={{ margin: '16px 0', border: '1px dashed #ccc', padding: 16, display: 'flex', justifyContent: 'center' }}><img src={`https://api.qrserver.com/v1/create-qr-code/?data=${regForm.nuit}&size=100x100`} width="100" /></div>
            </div>
            <div style={{ background: '#f8fafc', padding: 14, textAlign: 'center' }}><button className="stae-button" onClick={() => setView('landing')} style={{ background: '#001f42', fontSize: 12 }}>FECHAR PROCESSO</button></div>
         </motion.div>
      </div>}

      {view === 'login' && <div className="premium-container" style={{ justifyContent: 'center' }}><div className="glass-card"><h2 style={{ textAlign: 'center', marginBottom: 24 }}>Acesso Seguro</h2><input type="text" className="stae-input" placeholder="Nº de Documento" /><button className="stae-button" style={{ marginTop: 16 }} onClick={() => setView('landing')}>Voltar</button></div></div>}
    </AnimatePresence>
  );
}
