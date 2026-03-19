import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Terminal, Shield, Cpu, Activity, LogOut, ChevronLeft, ExternalLink, Search, Filter, X, Zap, MessageSquare, Globe, Download, AlertTriangle } from 'lucide-react';
import { auth, db, signInWithGoogle, logout, saveUserProfile, logHistory, handleFirestoreError, OperationType } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { GoogleGenAI } from "@google/genai";

// Nodos de Anime
const NODES = [
  { id: 'NODE_01', name: 'TioAnime', url: 'https://tioanime.com/', searchUrl: (q: string) => `https://tioanime.com/directorio?q=${encodeURIComponent(q)}` },
  { id: 'NODE_02', name: 'JKAnime', url: 'https://jkanime.net/', searchUrl: (q: string) => `https://jkanime.net/buscar/${encodeURIComponent(q)}/1/` },
  { id: 'NODE_03', name: 'MonosChinos', url: 'https://www.monoschinos2.net/', searchUrl: (q: string) => `https://www.monoschinos2.net/buscar?q=${encodeURIComponent(q)}` }
];

// URL de la imagen del personaje (del usuario)
const CHARACTER_URL = "https://storage.googleapis.com/mcp-prod-models-image-uploads/199412462158/2026-03-19/iNoelNexus.png";

// Lógica Anti-Crash (Simulada para Web)
const getCount = (): number => {
  // Anti-Casting: Retorna un entero explícito
  return Math.floor(3);
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentNode, setCurrentNode] = useState<number | null>(null);
  const [view, setView] = useState<'home' | 'search' | 'viewer'>('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchActive, setSearchActive] = useState(false);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [characterExpression, setCharacterExpression] = useState<'idle' | 'thinking' | 'success' | 'alert'>('idle');
  const [lastError, setLastError] = useState<string | null>(null);

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

  // Manejador de Protocolos Externos (Simulación de pcall)
  const handleExternalProtocol = useCallback((url: string) => {
    try {
      // Intentamos abrir el protocolo. Si falla (p. ej. intent:// no soportado), capturamos el error.
      if (url.startsWith('intent://') || url.startsWith('magnet:')) {
        window.open(url, '_blank');
      } else {
        return false; // No es un protocolo especial
      }
      return true;
    } catch (e) {
      console.error("Error de protocolo externo:", e);
      setLastError("PROTOCOLO_NO_SOPORTADO: " + url);
      setCharacterExpression('alert');
      return true;
    }
  }, []);

  // Simulación de DownloadListener
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest('a');
      if (anchor && anchor.href) {
        const isDownload = anchor.hasAttribute('download') || 
                           anchor.href.includes('/download/') || 
                           anchor.href.endsWith('.mp4') || 
                           anchor.href.endsWith('.mkv');
        
        if (isDownload) {
          console.log("INTERCEPTANDO_DESCARGA:", anchor.href);
          // Aquí podríamos redirigir o mostrar un aviso
          setCharacterExpression('success');
        }

        if (handleExternalProtocol(anchor.href)) {
          e.preventDefault();
        }
      }
    };

    document.addEventListener('click', handleGlobalClick);
    return () => document.removeEventListener('click', handleGlobalClick);
  }, [handleExternalProtocol]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        await saveUserProfile(currentUser);
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleNodeSelect = async (index: number, customUrl?: string) => {
    // Anti-Arithmetic: Asegurar que pos es un número antes de indexar
    const pos = Number(index);
    if (isNaN(pos) || pos < 0 || pos >= NODES.length) return;

    setCurrentNode(pos);
    setView('viewer');
    
    if (user) {
      try {
        await setDoc(doc(db, 'users', user.uid), { lastNode: String(pos) }, { merge: true });
        await logHistory(user.uid, NODES[pos].id, customUrl || NODES[pos].url);
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
      }
    }
  };

  const performSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearchActive(true);
    setCharacterExpression('thinking');
    setAiInsight(null);

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Analiza la consulta de búsqueda de anime: "${searchQuery}". Proporciona una visión del sistema estilo "Hacker" muy breve (máximo 20 palabras) sobre lo que el usuario podría estar buscando o recomendaciones relacionadas. Usa jerga técnica como "Escaneo de nodos", "Coincidencia de metadatos", etc. Responde en ESPAÑOL.`,
      });
      setAiInsight(response.text || "ESCANEO COMPLETO. METADATOS COINCIDENTES.");
      setCharacterExpression('success');
    } catch (error) {
      console.error("Fallo en la visión de la IA:", error);
      setCharacterExpression('alert');
    } finally {
      setSearchActive(false);
    }
  };

  const handleBack = () => {
    setView('home');
    setCurrentNode(null);
    setCharacterExpression('idle');
  };

  if (loading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-black text-terminal-green font-mono">
        <Activity className="animate-spin mb-4" size={48} />
        <div className="animate-pulse">INICIALIZANDO NEXUSNIME_OS...</div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-black text-terminal-green font-mono overflow-hidden flex flex-col relative">
      {/* Efecto de Scanline */}
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%] z-[100]" />

      {/* Cabecera */}
      <header className="p-4 border-b border-blood-red flex justify-between items-center bg-black z-50">
        <div className="flex items-center gap-2">
          <Cpu className="text-blood-red" />
          <h1 className="text-xl font-bold tracking-widest terminal-text">NEXUSNIME_OS</h1>
        </div>
        {user && (
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setView(view === 'search' ? 'home' : 'search')}
              className={`p-2 transition-all ${view === 'search' ? 'text-blood-red' : 'hover:text-blood-red'}`}
            >
              <Search size={20} />
            </button>
            <button 
              onClick={logout}
              className="p-1 hover:text-blood-red transition-colors"
            >
              <LogOut size={20} />
            </button>
          </div>
        )}
      </header>

      <main className="flex-1 relative">
        <AnimatePresence mode="wait">
          {!user ? (
            <motion.div 
              key="login"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              className="h-full flex flex-col items-center justify-center p-8"
            >
              <div className="max-w-md w-full border border-blood-red p-8 bg-black/50 backdrop-blur-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-blood-red animate-pulse" />
                <Shield className="mx-auto mb-6 text-blood-red" size={64} />
                <h2 className="text-2xl text-center mb-8 terminal-text">ACCESO RESTRINGIDO</h2>
                <button 
                  onClick={signInWithGoogle}
                  className="w-full py-4 border border-terminal-green hover:bg-terminal-green hover:text-black transition-all duration-300 flex items-center justify-center gap-3 glitch-hover"
                >
                  <Globe size={20} />
                  INICIALIZAR GOOGLE_AUTH
                </button>
              </div>
            </motion.div>
          ) : view === 'home' ? (
            <motion.div 
              key="home"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full flex flex-col items-center justify-center p-4"
            >
              <div className="grid grid-cols-1 gap-6 w-full max-w-lg">
                <div className="text-center mb-8">
                  <div className="text-xs opacity-50 mb-2">ESTADO DEL SISTEMA: EN LÍNEA</div>
                  <div className="text-xs opacity-50">NODOS DETECTADOS: {getCount()}</div>
                </div>
                
                {NODES.map((node, i) => (
                  <button
                    key={node.id}
                    onClick={() => handleNodeSelect(i)}
                    className="group relative p-6 border border-blood-red hover:bg-blood-red/10 transition-all duration-300 overflow-hidden"
                  >
                    <div className="absolute top-0 left-0 w-1 h-full bg-blood-red group-hover:w-full transition-all duration-500 opacity-20" />
                    <div className="flex justify-between items-center relative z-10">
                      <span className="text-xl tracking-widest">[ {node.id} ]</span>
                      <span className="opacity-50 group-hover:opacity-100 transition-opacity">{node.name}</span>
                    </div>
                  </button>
                ))}

                <button
                  onClick={() => setView('search')}
                  className="mt-4 p-4 border border-terminal-green/30 hover:border-terminal-green text-xs tracking-[0.3em] flex items-center justify-center gap-2 transition-all"
                >
                  <Search size={14} />
                  BÚSQUEDA_ESCANEO_PROFUNDO
                </button>
              </div>
            </motion.div>
          ) : view === 'search' ? (
            <motion.div 
              key="search"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="h-full flex flex-col p-6 max-w-4xl mx-auto w-full"
            >
              <div className="flex items-center gap-4 mb-8">
                <div className="flex-1 relative">
                  <input 
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && performSearch()}
                    placeholder="INTRODUCE_CONSULTA_PARA_ESCANEO_ENTRE_NODOS..."
                    className="w-full bg-black border-b border-terminal-green p-4 text-terminal-green focus:outline-none placeholder:text-terminal-green/30"
                  />
                  <Search className="absolute right-4 top-4 opacity-50" size={20} />
                </div>
                <button 
                  onClick={performSearch}
                  disabled={searchActive}
                  className="px-8 py-4 border border-blood-red hover:bg-blood-red text-white disabled:opacity-50 transition-all"
                >
                  {searchActive ? 'ESCANEANDO...' : 'ESCANEAR'}
                </button>
              </div>

              {aiInsight && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mb-8 p-4 border border-terminal-green/20 bg-terminal-green/5 flex gap-3 items-start"
                >
                  <Zap className="text-terminal-green shrink-0" size={18} />
                  <div className="text-xs leading-relaxed">
                    <span className="text-terminal-green font-bold mr-2">IA_INSIGHT:</span>
                    {aiInsight}
                  </div>
                </motion.div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {NODES.map((node, i) => (
                  <button
                    key={node.id}
                    onClick={() => handleNodeSelect(i, node.searchUrl(searchQuery))}
                    className="p-4 border border-blood-red/40 hover:border-blood-red hover:bg-blood-red/5 transition-all flex flex-col gap-2 text-left"
                  >
                    <div className="text-[10px] opacity-50">NODO_{i+1}</div>
                    <div className="text-sm font-bold">{node.name}</div>
                    <div className="text-[10px] text-terminal-green truncate">{node.searchUrl(searchQuery)}</div>
                    <div className="mt-2 text-[10px] flex items-center gap-1 text-blood-red">
                      <Activity size={10} />
                      LISTO_PARA_ESCANEAR
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="viewer"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              className="absolute inset-0 bg-black flex flex-col"
            >
              <div className="flex border-b border-blood-red bg-black/90">
                <button onClick={handleBack} className="p-4 border-r border-blood-red hover:bg-blood-red/20">
                  <ChevronLeft size={20} />
                </button>
                <div className="flex-1 flex overflow-x-auto">
                  {NODES.map((node, i) => (
                    <button
                      key={node.id}
                      onClick={() => handleNodeSelect(i)}
                      className={`px-6 py-4 text-xs tracking-widest border-r border-blood-red transition-all ${
                        currentNode === i ? 'bg-blood-red text-white' : 'hover:bg-blood-red/10'
                      }`}
                    >
                      {node.id}
                    </button>
                  ))}
                </div>
                <button 
                  onClick={() => window.open(NODES[currentNode!].url, '_blank')}
                  className="p-4 hover:text-blood-red"
                >
                  <ExternalLink size={18} />
                </button>
              </div>

              <div className="flex-1 relative">
                <iframe
                  src={NODES[currentNode!].url}
                  className="w-full h-full border-none bg-white"
                  title={NODES[currentNode!].name}
                  sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Asistente de Personaje Vtuber */}
      <div className="fixed bottom-12 right-4 z-[60] pointer-events-none">
        <motion.div
          animate={{ 
            y: [0, -10, 0],
            filter: characterExpression === 'thinking' ? 'hue-rotate(90deg)' : 
                    characterExpression === 'alert' ? 'hue-rotate(180deg)' : 'none'
          }}
          transition={{ repeat: Infinity, duration: 4 }}
          className="relative"
        >
          <img 
            src={CHARACTER_URL} 
            alt="iNoelNexus"
            className="w-48 h-auto drop-shadow-[0_0_15px_rgba(0,255,0,0.3)]"
            referrerPolicy="no-referrer"
          />
          
          {/* Burbuja de Diálogo */}
          <AnimatePresence>
            {(aiInsight || lastError) && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8, x: 20 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.8, x: 20 }}
                className="absolute -top-12 -left-32 bg-black border border-terminal-green p-2 text-[10px] max-w-[150px] terminal-text"
              >
                {lastError ? lastError : 'ESCANEO COMPLETADO. ACCESO AL NODO CONCEDIDO.'}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Pie de página */}
      <footer className="p-2 border-t border-blood-red bg-black text-[10px] flex justify-between items-center z-50">
        <div className="flex gap-4">
          <span className="text-blood-red">OS_VER: 2.0.4</span>
          <span className="hidden sm:inline">KERNEL: 5.15.0-GENERIC</span>
        </div>
        <div className="flex gap-4 items-center">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-terminal-green animate-ping" />
            <span>ENCRIPTADO</span>
          </div>
          <span className="hidden sm:inline">LATENCY: 24ms</span>
        </div>
      </footer>
    </div>
  );
}
