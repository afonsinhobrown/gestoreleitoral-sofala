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
  Download
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'https://staeapi-sofala.onrender.com';

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
       <div style={{ padding: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#001f42', borderBottom: '1px solid #d4a30d' }}>
          <button onClick={onCancel} style={{ color: 'white', background: 'none', border: 'none' }}><ArrowLeft/></button>
          <h3 style={{ fontSize: 13, fontWeight: 800 }}>CAPTURA BIOMÉTRICA</h3>
          <div style={{ width: 40 }}/>
       </div>
       <div ref={containerRef} style={{ position: 'relative', flex: 1, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <img ref={imgRef} src={rawImage} style={{ maxWidth: '100%', maxHeight: '100%', pointerEvents: 'none' }} />
          <motion.div drag dragConstraints={imgRef} dragMomentum={false} onDrag={(e, info) => {
               const imgRect = imgRef.current.getBoundingClientRect();
               setCropPos({ x: (info.point.x - imgRect.left - squareSize/2), y: (info.point.y - imgRect.top - squareSize/2) });
            }} initial={{ x: 20, y: 20 }} animate={{ width: squareSize, height: squareSize }}
            style={{ position: 'absolute', border: '3px solid #d4a30d', borderRadius: 12, boxShadow: '0 0 0 5000px rgba(0,0,0,0.8)', zIndex: 100, cursor: 'move', left: 0, top: 0 }}
          />
       </div>
       <div style={{ padding: '24px 32px', background: '#001f42', textAlign: 'center' }}>
          <input type="range" min="60" max="350" value={squareSize} onChange={(e) => setSquareSize(parseInt(e.target.value))} style={{ width: '100%', accentColor: '#d4a30d', marginBottom: 20 }} />
          <button className="stae-button" onClick={generateImg}>CONFIRMAR FOTOGRAFIA</button>
       </div>
    </div>
  );
};

export default function App() {
  const [view, setView] = useState('landing');
  const [loading, setLoading] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [extractedPhoto, setExtractedPhoto] = useState(null);
  const [rawImage, setRawImage] = useState(null);
  const [regForm, setRegForm] = useState({ nome: '', nuit: '', distrito: 'Beira', categoria: 'MMV' });

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLoading(true);
    const reader = new FileReader();
    reader.onload = (re) => {
       setRawImage(re.target.result);
       Tesseract.recognize(file, 'por', { logger: m => { if (m.status === 'recognizing text') setOcrProgress(Math.round(m.progress * 100)); } })
       .then(({ data: { text } }) => {
          setView('crop');
          setLoading(false);
       });
    };
    reader.readAsDataURL(file);
  };

  return (
    <AnimatePresence mode='wait'>
      {view === 'landing' && <div className="premium-container" style={{ justifyContent: 'center' }}>
        <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/1/17/Coat_of_arms_of_Mozambique.svg/1200px-Coat_of_arms_of_Mozambique.svg.png" width="80" style={{ margin: '0 auto 32px', display: 'block' }}/>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <h1 className="gold-gradient-text" style={{ fontSize: 18, fontWeight: 900, lineHeight: 1.4 }}>SECRETARIADO TÉCNICO DE ADMINISTRAÇÃO ELEITORAL</h1>
          <p style={{ opacity: 0.6, fontSize: 11, fontWeight: 700, letterSpacing: 2, marginTop: 10 }}>REPÚBLICA DE MOÇAMBIQUE</p>
        </div>
        <div style={{ display: 'grid', gap: 16 }}>
          <button className="glass-card" style={{ padding: 24, textAlign: 'left', display: 'flex', gap: 20 }} onClick={() => setView('login')}><User color="#d4a30d"/> <div><h3>Acesso ao Portal</h3><p style={{ opacity: 0.4, fontSize: 12 }}>Consultar Candidatura</p></div></button>
          <button className="glass-card" style={{ padding: 24, textAlign: 'left', display: 'flex', gap: 20 }} onClick={() => setView('register')}><ShieldCheck color="#4ade80"/> <div><h3>Nova Inscrição</h3><p style={{ opacity: 0.4, fontSize: 12 }}>Registo Biométrico Oficial</p></div></button>
        </div>
      </div>}
      
      {view === 'register' && <div className="premium-container" style={{ justifyContent: 'center' }}><div className="glass-card" style={{ textAlign: 'center' }}><h2 className="gold-gradient-text" style={{ fontSize: 22, marginBottom: 16 }}>SCANNER DE DOCUMENTOS</h2><p style={{ opacity: 0.6, marginBottom: 40, fontSize: 14 }}>O sistema irá validar a identidade conforme as normas do Secretariado Técnico.</p><label className="stae-button" style={{ display: 'flex', gap: 12, justifyContent: 'center', cursor: 'pointer' }}><Camera /> {loading ? `Validando: ${ocrProgress}%` : 'Abrir Captura'}<input type="file" accept="image/*" onChange={handleFileUpload} style={{ display: 'none' }} disabled={loading} /></label></div></div>}
      {view === 'crop' && <FlexibleCropView rawImage={rawImage} onCancel={() => setView('register')} onFinalize={(photo) => { setExtractedPhoto(photo); setView('confirm'); }} />}
      {/* ... Rest of components ... */}
    </AnimatePresence>
  );
}
