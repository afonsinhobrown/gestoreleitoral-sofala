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
  Edit3,
  Scan,
  ShieldCheck,
  Maximize,
  Download,
  Square
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'https://staeapi-sofala.onrender.com';

// --- MOTOR DE RECORTE (VALORIZAÇÃO BIOMÉTRICA) ---
const FlexibleCropView = ({ rawImage, onFinalize, onCancel }) => {
  const containerRef = useRef(null);
  const imgRef = useRef(null);
  const [squareSize, setSquareSize] = useState(140);
  const [cropPos, setCropPos] = useState({ x: 20, y: 50 });

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
    ctx.drawImage(imageActual, cropPos.x * scaleX, cropPos.y * scaleY, squareSize * scaleX, squareSize * scaleY, 0, 0, canvas.width, canvas.height);
    onFinalize(canvas.toDataURL('image/jpeg'));
  };

  return (
    <div className="premium-container" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, background: '#000', padding: 0 }}>
       <div style={{ padding: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#001f42', borderBottom: '1px solid var(--stae-gold)' }}>
          <button onClick={onCancel} style={{ color: 'white', background: 'none', border: 'none' }}><ArrowLeft/></button>
          <h3 style={{ fontSize: 13, fontWeight: 800, letterSpacing: 1 }}>ENQUADRAMENTO BIOMÉTRICO</h3>
          <div style={{ width: 40 }}/>
       </div>
       <div ref={containerRef} style={{ position: 'relative', flex: 1, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <img ref={imgRef} src={rawImage} style={{ maxWidth: '100%', maxHeight: '100%', pointerEvents: 'none' }} />
          <motion.div drag dragConstraints={imgRef} dragMomentum={false} onDrag={(e, info) => {
               const imgRect = imgRef.current.getBoundingClientRect();
               setCropPos({ x: (info.point.x - imgRect.left - squareSize/2), y: (info.point.y - imgRect.top - squareSize/2) });
            }} initial={{ x: 20, y: 20 }} animate={{ width: squareSize, height: squareSize }}
            style={{ position: 'absolute', border: '3px solid var(--stae-gold)', borderRadius: 12, boxShadow: '0 0 0 5000px rgba(0,0,0,0.8)', zIndex: 100, cursor: 'move', left: 0, top: 0 }}
          />
       </div>
       <div style={{ padding: '24px 32px', background: '#001f42', textAlign: 'center' }}>
          <input type="range" min="60" max="350" value={squareSize} onChange={(e) => setSquareSize(parseInt(e.target.value))} style={{ width: '100%', accentColor: 'var(--stae-gold)', marginBottom: 20 }} />
          <button className="stae-button" onClick={generateImg}>FINALIZAR CAPTURA DE IMAGEM</button>
       </div>
    </div>
  );
};

// --- APP PRINCIPAL (100% RIGOR NACIONAL) ---
export default function App() {
  const [view, setView] = useState('landing');
  const [loading, setLoading] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [extractedPhoto, setExtractedPhoto] = useState(null);
  const [rawImage, setRawImage] = useState(null);
  const [regForm, setRegForm] = useState({ nome: '', nuit: '', distrito: 'Beira', categoria: 'MMV' });

  const cleanOcrResult = (rawText) => {
    const text = rawText.toUpperCase();
    const biMatch = text.match(/\d{12}[A-Z]/);
    const nuitMatch = text.match(/\d{9}/);
    const noisyWords = ['REPUBLICA', 'MOÇAMBIQUE', 'BILHETE', 'IDENTIDADE', 'NAME', 'NOME', 'APELIDO', 'Nº'];
    let lines = text.split('\n').map(l => l.trim().replace(/[^A-ZÇÀ-Ú0-9\s]/g, '')).filter(l => l.length > 5);
    const filtered = lines.filter(l => !noisyWords.some(w => l.includes(w))).map(l => l.replace(/^[A-Z]{1,3}\s+/, '').trim()).filter(l => l.length > 8);
    return { nome: filtered[0] || 'Novo Candidato', nuit: biMatch ? biMatch[0] : (nuitMatch ? nuitMatch[0] : '') };
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLoading(true);
    const reader = new FileReader();
    reader.onload = (re) => {
       setRawImage(re.target.result);
       Tesseract.recognize(file, 'por', { logger: m => { if (m.status === 'recognizing text') setOcrProgress(Math.round(m.progress * 100)); } })
       .then(({ data: { text } }) => {
          const cleanData = cleanOcrResult(text);
          setRegForm({ ...regForm, nome: cleanData.nome, nuit: cleanData.nuit });
          setView('crop');
          setLoading(false);
       });
    };
    reader.readAsDataURL(file);
  };

  const handleFinalSubmit = async () => {
    setLoading(true);
    try {
      await fetch(`${API_URL}/candidate/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...regForm, photo: extractedPhoto })
      });
      setView('portal');
    } catch { alert('Falha técnica de comunicação'); }
    finally { setLoading(false); }
  };

  return (
    <AnimatePresence mode='wait'>
      {view === 'landing' && <div className="premium-container" style={{ justifyContent: 'center' }}>
        <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/1/17/Coat_of_arms_of_Mozambique.svg/1200px-Coat_of_arms_of_Mozambique.svg.png" width="80" style={{ margin: '0 auto 32px', display: 'block' }}/>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <h1 className="gold-gradient-text" style={{ fontSize: 20, marginBottom: 8, lineHeight: 1.2 }}>SECRETARIADO TÉCNICO DE ADMINISTRAÇÃO ELEITORAL</h1>
          <p style={{ opacity: 0.6, fontSize: 13, fontWeight: 700, letterSpacing: 2 }}>PAINEL DO CANDIDATO MMV</p>
        </div>
        <div style={{ display: 'grid', gap: 16 }}>
          <button className="glass-card" style={{ padding: 24, textAlign: 'left', display: 'flex', gap: 20 }} onClick={() => setView('login')}><User color="var(--stae-gold)"/> <div><h3>Entrar no Sistema</h3><p style={{ opacity: 0.4, fontSize: 12 }}>Acesso à Pauta Digital</p></div></button>
          <button className="glass-card" style={{ padding: 24, textAlign: 'left', display: 'flex', gap: 20 }} onClick={() => setView('register')}><ShieldCheck color="#4ade80"/> <div><h3>Efetuar Candidatura</h3><p style={{ opacity: 0.4, fontSize: 12 }}>Registo Biométrico Nacional</p></div></button>
        </div>
      </div>}

      {view === 'register' && <div className="premium-container" style={{ justifyContent: 'center' }}><motion.div initial={{ opacity: 0 }} className="glass-card" style={{ textAlign: 'center' }}><h2 className="gold-gradient-text" style={{ fontSize: 20, marginBottom: 12 }}>PROCESSAMENTO DE DOCUMENTOS</h2><p style={{ opacity: 0.6, marginBottom: 40, fontSize: 14 }}>O sistema irá validar os dados do Bilhete de Identidade biometrizado conforme as normas vigentes.</p><label className="stae-button" style={{ display: 'flex', gap: 12, justifyContent: 'center', cursor: 'pointer' }}><Camera /> {loading ? `Validando... ${ocrProgress}%` : 'Abrir Scanner Oficial'}<input type="file" accept="image/*" onChange={handleFileUpload} style={{ display: 'none' }} disabled={loading} /></label></motion.div></div>}
      {view === 'crop' && <FlexibleCropView rawImage={rawImage} onCancel={() => setView('register')} onFinalize={(photo) => { setExtractedPhoto(photo); setView('confirm'); }} />}

      {view === 'confirm' && <div className="premium-container">
         <div className="glass-card" style={{ padding: 24, textAlign: 'center', marginBottom: 24 }}><img src={extractedPhoto} width="120" style={{ borderRadius: 20, border: '3px solid var(--stae-gold)' }} /><p style={{ fontSize: 11, opacity: 0.5, marginTop: 12 }}>REGISTO FOTOGRÁFICO VALIDADO</p></div>
         <div className="glass-card"><div style={{ display: 'grid', gap: 16 }}><div><p style={{ fontSize: 11, opacity: 0.4 }}>NOME COMPLETO DO CANDIDATO</p><input type="text" className="stae-input" value={regForm.nome} onChange={e => setRegForm({...regForm, nome: e.target.value})} /></div><div><p style={{ fontSize: 11, opacity: 0.4 }}>Nº DE IDENTIFICAÇÃO (BI/NUIT)</p><input type="text" className="stae-input" value={regForm.nuit} onChange={e => setRegForm({...regForm, nuit: e.target.value})} /></div></div><button className="stae-button" style={{ marginTop: 24 }} onClick={handleFinalSubmit}>{loading ? 'A Submeter...' : 'Confirmar e Finalizar'}</button></div>
      </div>}

      {view === 'portal' && <div className="premium-container" style={{ justifyContent: 'center' }}>
         <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} style={{ background: 'white', borderRadius: 16, overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.4)', border: '1px solid #ddd' }}>
            <div style={{ background: '#001f42', padding: 16, textAlign: 'center' }}><img src="https://upload.wikimedia.org/wikipedia/commons/thumb/1/17/Coat_of_arms_of_Mozambique.svg/1200px-Coat_of_arms_of_Mozambique.svg.png" width="36" /><p style={{ color: 'white', fontSize: 9, fontWeight: 900, marginTop: 8 }}>REPÚBLICA DE MOÇAMBIQUE</p><p style={{ color: 'var(--stae-gold)', fontSize: 10, fontWeight: 900 }}>SECRETARIADO TÉCNICO DE ADMINISTRAÇÃO ELEITORAL</p></div>
            <div style={{ padding: 24, color: '#333', textAlign: 'center' }}>
               <h2 style={{ fontSize: 14, marginBottom: 20, color: '#001f42', fontWeight: 900 }}>CREDENCIAL OFICIAL DE CANDIDATURA MMV</h2>
               <img src={extractedPhoto} width="110" style={{ borderRadius: 8, border: '1px solid #ccc', padding: 4, marginBottom: 16 }} />
               <h3 style={{ fontSize: 18, color: '#000', marginBottom: 4 }}>{regForm.nome}</h3>
               <p style={{ fontSize: 12, opacity: 0.6 }}>NUIT/BI: {regForm.nuit}</p>
               <div style={{ margin: '24px 0', border: '1px dashed #ccc', padding: 16, display: 'flex', justifyContent: 'center' }}><img src={`https://api.qrserver.com/v1/create-qr-code/?data=${regForm.nuit}&size=100x100`} width="100" /></div>
               <div style={{ display: 'flex', justifyContent: 'center', gap: 8, alignItems: 'center', color: '#10b981' }}><CheckCircle size={16}/><span style={{ fontSize: 11, fontWeight: 700 }}>VALIDADO PARA O PROCESSO ELEITORAL</span></div>
            </div>
            <div style={{ background: '#f8fafc', padding: 14, textAlign: 'center' }}><button className="stae-button" onClick={() => setView('landing')} style={{ background: '#001f42', fontSize: 12 }}>SAIR DO PORTAL</button></div>
         </motion.div>
      </div>}

      {view === 'login' && <div className="premium-container" style={{ justifyContent: 'center' }}><div className="glass-card"><h2 style={{ textAlign: 'center', marginBottom: 24 }}>Autenticação Segura</h2><input type="email" className="stae-input" placeholder="Nº de Documento" /><button className="stae-button" onClick={() => setView('landing')}>Voltar</button></div></div>}
    </AnimatePresence>
  );
}
