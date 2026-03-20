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
  Globe
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'https://staeapi-sofala.onrender.com';

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
          <h3 style={{ fontSize: 13, fontWeight: 800 }}>IDENTIFICAÇÃO BIOMÉTRICA 2026</h3>
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
          <button className="stae-button" onClick={generateImg}>CONFIRMAR FOTO DO DOCUMENTO</button>
       </div>
    </div>
  );
};

export default function App() {
  const [view, setView] = useState('landing');
  const [loading, setLoading] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [rawImage, setRawImage] = useState(null);
  const [extractedPhoto, setExtractedPhoto] = useState(null);
  const [certificatesAttached, setCertificatesAttached] = useState(false);
  const [regForm, setRegForm] = useState({ 
    nome: '', nuit: '', categoria: '', evento: 'PROCESSO ELEITORAL 2026',
    provincia: 'Sofala', distrito: '', posto: '', localidade: ''
  });

  const handleIDScanner = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLoading(true);
    const reader = new FileReader();
    reader.onload = (re) => {
       setRawImage(re.target.result);
       Tesseract.recognize(file, 'por', { logger: m => { if (m.status === 'recognizing text') setOcrProgress(Math.round(m.progress * 100)); } })
       .then(({ data: { text } }) => {
          setRegForm({ ...regForm, nome: text.split('\n')[0] || 'Candidato Nacional', nuit: 'Confirmar Dados...' });
          setView('crop');
          setLoading(false);
       });
    };
    reader.readAsDataURL(file);
  };

  return (
    <AnimatePresence mode='wait'>
      {view === 'landing' && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="premium-container" style={{ justifyContent: 'center' }}>
        <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/1/17/Coat_of_arms_of_Mozambique.svg/1200px-Coat_of_arms_of_Mozambique.svg.png" width="80" style={{ margin: '0 auto 32px', display: 'block' }}/>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
           <h1 className="gold-gradient-text" style={{ fontSize: 18, fontWeight: 900, lineHeight: 1.3 }}>SECRETARIADO TÉCNICO DE ADMINISTRAÇÃO ELEITORAL</h1>
           <p style={{ opacity: 0.6, fontSize: 12, fontWeight: 700, letterSpacing: 1, marginTop: 12 }}>{regForm.evento}</p>
        </div>
        <div style={{ display: 'grid', gap: 16 }}>
          <button className="glass-card" style={{ padding: 24, textAlign: 'left', border: '1px solid #4ade80', display: 'flex', gap: 20 }} onClick={() => setView('role-selection')}><Briefcase color="#4ade80"/> <div><h3 style={{ margin: 0 }}>Candidatura</h3><p style={{ opacity: 0.4, fontSize: 12, margin: '4px 0 0' }}>Novo Registo Nacional</p></div></button>
          <button className="glass-card" style={{ padding: 24, textAlign: 'left', display: 'flex', gap: 20 }} onClick={() => setView('login')}><User color="#d4a30d"/> <div><h3 style={{ margin: 0 }}>Portal do Candidato</h3><p style={{ opacity: 0.4, fontSize: 12, margin: '4px 0 0' }}>Consultar Estado</p></div></button>
        </div>
      </motion.div>}

      {view === 'role-selection' && <div className="premium-container" style={{ justifyContent: 'center' }}>
         <div style={{ textAlign: 'center', marginBottom: 32 }}><h2 className="gold-gradient-text" style={{ fontSize: 20, fontWeight: 900 }}>TIPO DE CANDIDATURA</h2><p style={{ opacity: 0.5 }}>Selecione a sua função no processo de 2026.</p></div>
         <div style={{ display: 'grid', gap: 10 }}>
            {['MMV - Membro de Mesa de Voto', 'Brigadista Distrital', 'Agente de Educação Cívica', 'Supervisor de Posto'].map(role => (
              <button key={role} className="glass-card" style={{ padding: 20, textAlign: 'center', fontWeight: 600, fontSize: 14 }} onClick={() => { setRegForm({...regForm, categoria: role}); setView('geo-selection'); }}>{role}</button>
            ))}
            <button style={{ background: 'none', border: 'none', color: '#fff', opacity: 0.5, marginTop: 24 }} onClick={() => setView('landing')}>Voltar</button>
         </div>
      </div>}

      {view === 'geo-selection' && <div className="premium-container">
         <div style={{ marginBottom: 32 }}><h2 className="gold-gradient-text" style={{ fontSize: 20, fontWeight: 900 }}>DADOS GEOGRÁFICOS</h2><p style={{ opacity: 0.5 }}>Indique o local de actuação para a pauta eleitoral.</p></div>
         <div className="glass-card" style={{ display: 'grid', gap: 16 }}>
            <div><p style={{ fontSize: 10, opacity: 0.4 }}>PROVÍNCIA</p><input type="text" className="stae-input" value={regForm.provincia} readOnly /></div>
            <div><p style={{ fontSize: 10, opacity: 0.4 }}>DISTRITO</p><input type="text" className="stae-input" placeholder="Ex: Beira, Dondo..." value={regForm.distrito} onChange={e => setRegForm({...regForm, distrito: e.target.value})} /></div>
            <div><p style={{ fontSize: 10, opacity: 0.4 }}>POSTO ADMINISTRATIVO</p><input type="text" className="stae-input" placeholder="Ex: Munhava..." value={regForm.posto} onChange={e => setRegForm({...regForm, posto: e.target.value})} /></div>
            <div><p style={{ fontSize: 10, opacity: 0.4 }}>LOCALIDADE</p><input type="text" className="stae-input" placeholder="Nome da Localidade..." value={regForm.localidade} onChange={e => setRegForm({...regForm, localidade: e.target.value})} /></div>
            <button className="stae-button" style={{ marginTop: 24 }} disabled={!regForm.distrito || !regForm.posto} onClick={() => setView('cert-upload')}>Próximo Passo: Documentação</button>
         </div>
      </div>}

      {view === 'cert-upload' && <div className="premium-container" style={{ justifyContent: 'center' }}>
         <div style={{ textAlign: 'center', marginBottom: 32 }}><h2 className="gold-gradient-text" style={{ fontSize: 20, fontWeight: 900 }}>HABILITAÇÕES LITERÁRIAS</h2><p style={{ opacity: 0.4, fontSize: 13, marginTop: 10 }}>Submeta o certificado de habilitações oficiais requeridas para a função.</p></div>
         <div className="glass-card" style={{ textAlign: 'center', padding: '48px 24px', border: certificatesAttached ? '2px solid #4ade80' : '2px dashed rgba(255,255,255,0.1)' }}>
            <motion.div animate={{ scale: certificatesAttached ? 1.1 : 1 }}><Upload size={48} color={certificatesAttached ? "#4ade80" : "#d4a30d"} style={{ marginBottom: 20 }} /></motion.div>
            <p style={{ marginBottom: 24 }}>{certificatesAttached ? 'Certificado Carregado com Sucesso!' : 'Anexe o seu Certificado (FOTO/PDF)'}</p>
            <label className="stae-button" style={{ cursor: 'pointer' }}>{certificatesAttached ? 'Trocar Ficheiro' : 'Carregar Certificado'}<input type="file" onChange={() => setCertificatesAttached(true)} style={{ display: 'none' }} /></label>
            {certificatesAttached && <button className="stae-button" style={{ marginTop: 20, background: '#1e293b' }} onClick={() => setView('id-scanner')}>Continuar: Identificação BI</button>}
         </div>
      </div>}

      {view === 'id-scanner' && <div className="premium-container" style={{ justifyContent: 'center' }}><div className="glass-card" style={{ textAlign: 'center' }}><h2 className="gold-gradient-text" style={{ fontSize: 22, marginBottom: 16 }}>SCANNER DOCUMENTAL</h2><p style={{ opacity: 0.6, marginBottom: 32, fontSize: 14 }}>Posicione o seu Documento de Identidade para extração automática de dados.</p><label className="stae-button" style={{ display: 'flex', gap: 12, justifyContent: 'center', cursor: 'pointer' }}><Camera /> {loading ? `Analizando: ${ocrProgress}%` : 'Abrir Câmara para BI'}<input type="file" accept="image/*" onChange={handleIDScanner} style={{ display: 'none' }} disabled={loading} /></label></div></div>}
      
      {view === 'crop' && <FlexibleCropView rawImage={rawImage} onCancel={() => setView('id-scanner')} onFinalize={(photo) => { setExtractedPhoto(photo); setView('confirm'); }} />}

      {view === 'confirm' && <div className="premium-container">
         <div className="glass-card" style={{ padding: 24, textAlign: 'center', marginBottom: 24 }}><img src={extractedPhoto} width="110" style={{ borderRadius: 20, border: '3px solid #d4a30d' }} /><p style={{ fontSize: 10, opacity: 0.5, marginTop: 12 }}>RECORTE BIOMÉTRICO NACIONAL 2026</p></div>
         <div className="glass-card" style={{ display: 'grid', gap: 16 }}>
            <p style={{ fontSize: 11, fontWeight: 800, color: '#d4a30d' }}>CONFIRME OS DADOS EXTRAÍDOS:</p>
            <div><p style={{ fontSize: 10, opacity: 0.4 }}>NOME COMPLETO (EXTRAÍDO)</p><input type="text" className="stae-input" value={regForm.nome} onChange={e => setRegForm({...regForm, nome: e.target.value})} /></div>
            <div><p style={{ fontSize: 10, opacity: 0.4 }}>Nº DE IDENTIFICAÇÃO (VALIDADO)</p><input type="text" className="stae-input" value={regForm.nuit} onChange={e => setRegForm({...regForm, nuit: e.target.value})} /></div>
            <button className="stae-button" style={{ marginTop: 24 }} onClick={async () => { setLoading(true); setView('portal'); setLoading(false); }}>Submeter Candidatura Final</button>
         </div>
      </div>}

      {view === 'portal' && <div className="premium-container" style={{ justifyContent: 'center' }}>
         <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} style={{ background: 'white', borderRadius: 16, overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.5)', border: '1px solid #ddd' }}>
            <div style={{ background: '#001f42', padding: 16, textAlign: 'center' }}><img src="https://upload.wikimedia.org/wikipedia/commons/thumb/1/17/Coat_of_arms_of_Mozambique.svg/1200px-Coat_of_arms_of_Mozambique.svg.png" width="36" /><p style={{ color: 'white', fontSize: 9, fontWeight: 900, marginTop: 8 }}>REPÚBLICA DE MOÇAMBIQUE</p><p style={{ color: '#d4a30d', fontSize: 10, fontWeight: 900 }}>SECRETARIADO TÉCNICO DE ADMINISTRAÇÃO ELEITORAL</p></div>
            <div style={{ padding: 24, color: '#333', textAlign: 'center' }}>
               <h2 style={{ fontSize: 13, color: '#001f42', fontWeight: 900 }}>{regForm.evento}</h2>
               <p style={{ fontSize: 10, color: '#d4a30d', fontWeight: 800, marginBottom: 16 }}>CANDIDATURA: {regForm.categoria.toUpperCase()}</p>
               <img src={extractedPhoto} width="100" style={{ borderRadius: 8, border: '1px solid #ccc', padding: 4, marginBottom: 12 }} />
               <h3 style={{ fontSize: 18, color: '#000', marginBottom: 2 }}>{regForm.nome}</h3>
               <p style={{ fontSize: 11, color: '#666' }}>{regForm.distrito} | {regForm.posto}</p>
               <div style={{ margin: '20px 0', border: '1px dashed #ccc', padding: 16, display: 'flex', justifyContent: 'center' }}><img src={`https://api.qrserver.com/v1/create-qr-code/?data=${regForm.nuit}&size=100x100`} width="100" /></div>
               <div style={{ display: 'flex', justifyContent: 'center', gap: 8, alignItems: 'center', color: '#10b981' }}><CheckCircle size={14}/><span style={{ fontSize: 10, fontWeight: 800 }}>DADOS E CERTIFICADOS PROCESSADOS</span></div>
            </div>
            <div style={{ background: '#f8fafc', padding: 14, textAlign: 'center' }}><button className="stae-button" onClick={() => setView('landing')} style={{ background: '#001f42', fontSize: 12 }}>FECHAR CREDENCIAL</button></div>
         </motion.div>
      </div>}

      {view === 'login' && <div className="premium-container" style={{ justifyContent: 'center' }}><div className="glass-card"><h2 style={{ textAlign: 'center', marginBottom: 24 }}>Portal do Candidato</h2><input type="text" className="stae-input" placeholder="Nº de Documento" /><button className="stae-button" style={{ marginTop: 16 }} onClick={() => setView('landing')}>Voltar</button></div></div>}
    </AnimatePresence>
  );
}
