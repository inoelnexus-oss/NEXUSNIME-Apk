import React, { useState, useEffect, useRef, useCallback, Component } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Terminal, Shield, Cpu, Activity, LogOut, ChevronLeft, Search, Filter, X, Zap, Globe, AlertTriangle, Youtube, Instagram, Facebook, Music, Video, Compass, Send, Trash2, Play, FileAudio, FileVideo, Plus, Heart, Bell, BellOff, AlertCircle, MessageCircle, Languages, Download } from 'lucide-react';
import { auth, db, signInWithGoogle, loginAnonymously, logout, saveUserProfile, logHistory, handleFirestoreError, OperationType, onAuthStateChanged, doc, setDoc, getDoc, collection, addDoc, query, where, onSnapshot, serverTimestamp, Timestamp, updateDoc, deleteDoc, writeBatch, getDocs, orderBy, limit } from './firebase';
import type { User } from './firebase';
import { GoogleGenAI } from "@google/genai";
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Servidores de Anime y Películas/Series
const SERVERS = [
  // Animes
  { id: 'ANIME_01', name: 'TioAnime', url: 'https://tioanime.com/', category: 'Anime', searchUrl: (q: string) => `https://tioanime.com/directorio?q=${encodeURIComponent(q)}` },
  { id: 'ANIME_02', name: 'JKAnime', url: 'https://jkanime.net/', category: 'Anime', searchUrl: (q: string) => `https://jkanime.net/buscar/${encodeURIComponent(q)}/1/` },
  { id: 'ANIME_03', name: 'MonosChinos', url: 'https://www.monoschinos2.net/', category: 'Anime', searchUrl: (q: string) => `https://www.monoschinos2.net/buscar?q=${encodeURIComponent(q)}` },
  { id: 'ANIME_04', name: 'TioHentai (18+)', url: 'https://tiohentai.com/', category: 'Anime', searchUrl: (q: string) => `https://tiohentai.com/buscar?q=${encodeURIComponent(q)}`, isAdult: true },
  
  // Películas y Series
  { id: 'FILM_01', name: 'Cuevana 3', url: 'https://cue.cuevana3.nu/', category: 'Peliculas' },
  { id: 'FILM_02', name: 'CineCalidad', url: 'https://www.cinecalidad.am/', category: 'Peliculas' },
  { id: 'FILM_03', name: 'LookMovie', url: 'https://www.lookmovie2.to/movies/page/717', category: 'Peliculas' },
  { id: 'FILM_04', name: 'Stremio Web', url: 'https://web.stremio.com/', category: 'Peliculas' },
  { id: 'FILM_05', name: 'FlixBaba', url: 'https://flixbaba.mov/', category: 'Peliculas' },
];

// URL de la imagen del personaje (del usuario)
const LOADING_ICON_URL = "https://cdn-icons-png.flaticon.com/512/3665/3665939.png";

// Lógica Anti-Crash (Simulada para Web)
const getCount = (): number => {
  return SERVERS.length;
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentServer, setCurrentServer] = useState<number | null>(null);
  const [view, setView] = useState<'home' | 'search' | 'viewer' | 'browser' | 'player' | 'favorites'>('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [browserUrl, setBrowserUrl] = useState('https://duckduckgo.com');
  const [searchActive, setSearchActive] = useState(false);
  const [characterExpression, setCharacterExpression] = useState<'idle' | 'thinking' | 'success' | 'alert'>('idle');
  const [lastError, setLastError] = useState<string | null>(null);
  const [mediaLibrary, setMediaLibrary] = useState<any[]>([]);
  const [playerUrl, setPlayerUrl] = useState<string | null>(null);
  const [playerType, setPlayerType] = useState<'video' | 'audio'>('video');
  const [playerName, setPlayerName] = useState('');
  const [favorites, setFavorites] = useState<any[]>([]);
  const [aiMonitoringActive, setAiMonitoringActive] = useState(false);
  const [lastAiScan, setLastAiScan] = useState<Date | null>(null);
  const [lastBackClick, setLastBackClick] = useState<number>(0);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [isScanningFavorites, setIsScanningFavorites] = useState(false);
  const [showAgeWarning, setShowAgeWarning] = useState<number | null>(null);
  const [showCommunityModal, setShowCommunityModal] = useState(false);
  const [hasShownCommunityModal, setHasShownCommunityModal] = useState(false);
  const [isNexusSearching, setIsNexusSearching] = useState(false);
  const [isDeepWebMode, setIsDeepWebMode] = useState(false);
  const [nexusSearchResults, setNexusSearchResults] = useState<any[]>([]);
  const [sessionStartTime] = useState(Date.now());
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [aiChatHistory, setAiChatHistory] = useState<any[]>([]);
  const [serverSearchQuery, setServerSearchQuery] = useState('');
  const [showFilmServers, setShowFilmServers] = useState(false);
  const [showTranslator, setShowTranslator] = useState(false);
  const [translationText, setTranslationText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const Bot = ({ className, size }: { className?: string, size?: number }) => <div className={className} style={{ width: size, height: size }} />; // Placeholder for Bot icon

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

  // Manejador de Protocolos Externos
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest('a');
      if (anchor && anchor.href) {
        if (handleExternalProtocol(anchor.href)) {
          e.preventDefault();
        }
      }
    };

    document.addEventListener('click', handleGlobalClick);
    return () => document.removeEventListener('click', handleGlobalClick);
  }, [handleExternalProtocol]);

  useEffect(() => {
    let isSigningIn = false;
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        if (!currentUser.isAnonymous) {
          await saveUserProfile(currentUser);
        }

        // Cargar perfil de usuario (incluyendo lastServer)
        const userRef = doc(db, 'users', currentUser.uid);
        onSnapshot(userRef, (docSnap) => {
          if (docSnap.exists()) {
            setUserProfile(docSnap.data());
          }
        }, (error) => {
          handleFirestoreError(error, OperationType.GET, `users/${currentUser.uid}`);
        });

        // Cargar biblioteca multimedia
        const qMedia = query(
          collection(db, 'media_library'),
          where('userId', '==', currentUser.uid),
          orderBy('timestamp', 'desc')
        );
        onSnapshot(qMedia, (snapshot) => {
          setMediaLibrary(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }, (error) => {
          handleFirestoreError(error, OperationType.GET, 'media_library');
        });

        // Cargar favoritos
        const qFavs = query(
          collection(db, 'favorites'),
          where('userId', '==', currentUser.uid)
        );
        onSnapshot(qFavs, (snapshot) => {
          setFavorites(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }, (error) => {
          handleFirestoreError(error, OperationType.GET, 'favorites');
        });
      } else if (!isSigningIn) {
        setUser(null);
        // Intentar loguear anónimamente para permitir persistencia básica
        isSigningIn = true;
        // Pequeño retraso para asegurar inicialización estable
        setTimeout(() => {
          loginAnonymously().catch(err => {
            isSigningIn = false;
            if (err.code === 'auth/admin-restricted-operation') {
              console.warn("Anonymous authentication is disabled in Firebase Console.");
            } else if (err.code === 'auth/network-request-failed') {
              console.warn("Fallo de red en login anónimo. El sistema operará en modo local.");
            } else {
              console.error("Error en login anónimo:", err);
            }
          });
        }, 1000);
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleAiChat = async () => {
    if (!aiPrompt.trim() || isAiThinking) return;
    
    const prompt = aiPrompt;
    setAiPrompt('');
    setIsAiThinking(true);
    setCharacterExpression('thinking');

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          systemInstruction: "Eres NEXUS_AI, un asistente de inteligencia artificial integrado en NEXUSNIME_OS. Tu tono es técnico, servicial y con un toque de estética hacker. Ayudas a los usuarios a resolver problemas y responder preguntas de manera poderosa y eficiente."
        }
      });

      const aiResponse = response.text || "ERROR_DE_RESPUESTA: No se pudo generar una salida válida.";
      
      if (user) {
        await addDoc(collection(db, 'ai_chats'), {
          userId: user.uid,
          prompt: prompt,
          response: aiResponse,
          timestamp: serverTimestamp()
        });
      }
      
      setCharacterExpression('success');
    } catch (error) {
      console.error("Error en chat IA:", error);
      setCharacterExpression('alert');
      setLastError("ERROR_DE_IA: No se pudo conectar con el núcleo neuronal.");
    } finally {
      setIsAiThinking(false);
    }
  };

  const handleTranslate = async () => {
    if (!translationText.trim() || isTranslating) return;
    setIsTranslating(true);
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Traduce el siguiente texto al español si está en otro idioma, o al inglés si está en español. Solo devuelve la traducción: "${translationText}"`,
      });
      setTranslatedText(response.text || "ERROR_DE_TRADUCCIÓN");
    } catch (error) {
      console.error("Error traduciendo:", error);
      setTranslatedText("FALLO_EN_EL_NODO_DE_TRADUCCIÓN");
    } finally {
      setIsTranslating(false);
    }
  };

  const clearAiHistory = async () => {
    if (!user) return;
    try {
      const q = query(collection(db, 'ai_chats'), where('userId', '==', user.uid));
      const snapshot = await getDocs(q);
      const batch = writeBatch(db);
      snapshot.docs.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
      setAiInsight("SISTEMA: Historial de chat purgado de Firestore.");
      setAiChatHistory([]);
    } catch (error) {
      console.error("Error al purgar historial:", error);
      setAiInsight("SISTEMA: Error al purgar historial.");
    }
  };

  const handleBrowserSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const input = (form.elements.namedItem('search') as HTMLInputElement).value.trim();
    
    if (!input) return;

    // Si es una URL directa, navegamos sin pasar por la IA para mayor velocidad
    const isUrl = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([\/\w .-]*)*\/?$/.test(input) || (input.includes('.') && !input.includes(' '));
    if (isUrl) {
      const url = input.startsWith('http') ? input : `https://${input}`;
      setBrowserUrl(url);
      setAiInsight(`NAVEGANDO_A: ${url}`);
      return;
    }

    setIsNexusSearching(true);
    setNexusSearchResults([]);
    setCharacterExpression('thinking');
    setAiInsight(`INICIANDO_PROTOCOLO_NEXUS_SEARCH: Analizando red global ${isDeepWebMode ? 'Y NODOS PROFUNDOS ' : ''}para "${input}"...`);

    try {
      // Usamos Gemini con Google Search para encontrar los mejores links y filtrar anuncios
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Actúa como el motor de búsqueda NEXUS_OS ULTRA. 
        Usuario busca: "${input}". 
        Modo Deep Web: ${isDeepWebMode ? 'ACTIVADO' : 'DESACTIVADO'}.
        
        TAREAS:
        1. Busca información en Google sobre "${input}".
        2. Si el modo Deep Web está activado, busca también en directorios .onion y nodos ocultos (simula resultados si es necesario para la estética).
        3. Filtra TODOS los anuncios, rastreadores y sitios de baja calidad.
        4. Identifica el idioma del usuario y responde en ese idioma.
        5. Proporciona una lista de los 5 mejores enlaces directos, seguros y de alta velocidad.
        6. Genera un resumen ejecutivo de lo que el usuario necesita saber.
        
        RESPONDE EN FORMATO JSON:
        {
          "summary": "Resumen aquí...",
          "links": [
            {"title": "Título", "url": "URL", "description": "Breve descripción", "type": "standard|deep|safe"}
          ],
          "language": "Idioma detectado"
        }`,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json"
        }
      });

      const data = JSON.parse(response.text || "{}");
      setNexusSearchResults(data.links || []);
      setAiInsight(data.summary || "Búsqueda completada con éxito.");
      setCharacterExpression('success');
    } catch (error) {
      console.error("Error en Nexus Search:", error);
      setBrowserUrl(`https://duckduckgo.com/lite/?q=${encodeURIComponent(input)}`);
      setAiInsight("FALLO_EN_NÚCLEO_NEXUS: Reintentando vía nodo estándar sin anuncios...");
      setCharacterExpression('alert');
    } finally {
      setIsNexusSearching(false);
    }
  };

  const handleMediaPlay = (url: string, type: 'video' | 'audio', name: string) => {
    setPlayerUrl(url);
    setPlayerType(type);
    setPlayerName(name);
    setView('player'); // Aseguramos que cambie a la vista de reproductor
    setCharacterExpression('success');
    setAiInsight(`REPRODUCIENDO: ${name} [${type.toUpperCase()}]`);
  };

  const handleLocalFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      const type = file.type.startsWith('video') ? 'video' : 'audio';
      handleMediaPlay(url, type, file.name);
    }
  };

  const handleSaveMedia = async (url: string, name: string, type: 'video' | 'audio') => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'media_library'), {
        userId: user.uid,
        url,
        name,
        type,
        timestamp: serverTimestamp()
      });
      setAiInsight(`SISTEMA: ${name} guardado en la biblioteca.`);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'media_library');
    }
  };

  const handleDownload = async (url: string, name: string) => {
    if (!url) return;
    
    try {
      setAiInsight("SISTEMA: Iniciando protocolo de descarga...");
      setCharacterExpression('thinking');
      
      // Intentar descarga vía fetch para mejor control de nombre de archivo
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = name || 'nexus_media';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
      
      setAiInsight(`SISTEMA: Descarga de ${name} finalizada con éxito.`);
      setCharacterExpression('success');
    } catch (error) {
      console.warn("Descarga por fetch fallida (posible CORS), intentando método directo:", error);
      
      // Método alternativo directo
      const link = document.createElement('a');
      link.href = url;
      link.download = name || 'nexus_media';
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setAiInsight("SISTEMA: Descarga directa solicitada al navegador.");
      setCharacterExpression('idle');
    }
  };

  const deleteMedia = async (id: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'media_library', id));
      setAiInsight("SISTEMA: Recurso eliminado de la biblioteca.");
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `media_library/${id}`);
    }
  };

  const toggleFavorite = async (animeName: string, serverId: string) => {
    if (!user) return;
    const existing = favorites.find(f => f.animeName === animeName && f.serverId === serverId);
    
    if (existing) {
      try {
        await deleteDoc(doc(db, 'favorites', existing.id));
        setAiInsight(`SISTEMA: ${animeName} eliminado de favoritos.`);
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `favorites/${existing.id}`);
      }
    } else {
      try {
        await addDoc(collection(db, 'favorites'), {
          userId: user.uid,
          animeName,
          serverId,
          timestamp: serverTimestamp(),
          lastEpisode: 'Desconocido'
        });
        setAiInsight(`SISTEMA: ${animeName} añadido a favoritos.`);
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, 'favorites');
      }
    }
  };

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      setNotificationsEnabled(permission === 'granted');
      if (permission === 'granted') {
        setAiInsight("SISTEMA: Notificaciones activadas.");
      }
    } else {
      setLastError("ERROR_SISTEMA: Notificaciones no soportadas en este navegador.");
    }
  };

  const checkNewEpisodes = useCallback(async () => {
    if (favorites.length === 0 || isScanningFavorites) return;
    
    setIsScanningFavorites(true);
    setAiInsight("SISTEMA: Iniciando escaneo profundo de servidores para favoritos...");
    setCharacterExpression('thinking');
    
    let foundNew = false;
    let updatesSummary = "";
    
    for (const fav of favorites) {
      try {
        const response = await fetch('/api/check-episodes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ animeName: fav.animeName, serverId: fav.serverId })
        });
        
        if (response.ok) {
          const { latestEpisode } = await response.json();
          
          // Lógica de IA para comparar datos si hay ambigüedad o para validar el cambio
          if (fav.lastEpisode !== latestEpisode && fav.lastEpisode !== 'Desconocido') {
            
            // Llamada a Gemini para validar si es un cambio real o ruido de scraping
            const aiResponse = await ai.models.generateContent({
              model: "gemini-3-flash-preview",
              contents: `Analiza este cambio de episodio para el anime "${fav.animeName}". 
              Dato anterior: "${fav.lastEpisode}". 
              Dato nuevo: "${latestEpisode}". 
              ¿Es este un episodio nuevo o una actualización real? Responde solo "SI" o "NO".`
            });

            const isRealUpdate = aiResponse.text?.trim().toUpperCase().includes('SI');

            if (isRealUpdate) {
              foundNew = true;
              updatesSummary += `- ${fav.animeName}: ${latestEpisode}\n`;
              
              if (notificationsEnabled) {
                new Notification(`¡NEXUS_ALERTA: ${fav.animeName}!`, {
                  body: `IA confirma nuevo episodio: ${latestEpisode} en ${SERVERS.find(s => s.id === fav.serverId)?.name}`,
                  icon: LOADING_ICON_URL,
                  badge: LOADING_ICON_URL
                });
              }
            }
          }
          
          if (fav.lastEpisode !== latestEpisode) {
            await updateDoc(doc(db, 'favorites', fav.id), { 
              lastEpisode: latestEpisode,
              lastChecked: serverTimestamp()
            });
          } else {
            await updateDoc(doc(db, 'favorites', fav.id), { 
              lastChecked: serverTimestamp()
            });
          }
        }
      } catch (error) {
        console.error(`Error al revisar ${fav.animeName}:`, error);
      }
    }
    
    setIsScanningFavorites(false);
    setLastAiScan(new Date());

    if (foundNew) {
      setCharacterExpression('success');
      setAiInsight(`¡ALERTA_NEXUS!: La IA ha detectado y validado nuevas actualizaciones:\n${updatesSummary}`);
    } else {
      setCharacterExpression('idle');
      setAiInsight("SISTEMA: Escaneo de IA completado. No se detectaron cambios significativos.");
    }
  }, [favorites, notificationsEnabled, isScanningFavorites]);

  // Tarea periódica de escaneo
  useEffect(() => {
    if (user && favorites.length > 0) {
      const interval = setInterval(checkNewEpisodes, 300000); // Cada 5 minutos
      return () => clearInterval(interval);
    }
  }, [user, favorites.length, checkNewEpisodes]);

  const handleServerSelect = async (index: number, customUrl?: string) => {
    // Anti-Arithmetic: Asegurar que pos es un número antes de indexar
    const pos = Number(index);
    if (isNaN(pos) || pos < 0 || pos >= SERVERS.length) return;

    // Verificación de edad para TioHentai
    if ((SERVERS[pos] as any).isAdult && showAgeWarning === null) {
      setShowAgeWarning(pos);
      return;
    }

    setShowAgeWarning(null);
    setCurrentServer(pos);
    setView('viewer');
    
    // Mostrar modal de comunidad si no es servidor adulto Y ha pasado tiempo (ej: 3 min)
    const usageTime = Date.now() - sessionStartTime;
    const isLongTime = usageTime > 180000; // 3 minutos
    
    if (!(SERVERS[pos] as any).isAdult && isLongTime && !hasShownCommunityModal) {
      setShowCommunityModal(true);
      setHasShownCommunityModal(true);
    }
    
    if (user) {
      try {
        await setDoc(doc(db, 'users', user.uid), { lastServer: String(pos) }, { merge: true });
        await logHistory(user.uid, SERVERS[pos].id, customUrl || SERVERS[pos].url);
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
      }
    }
  };

  const performSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearchActive(true);
    setCharacterExpression('thinking');

    try {
      // Simulación de escaneo de servidores
      setTimeout(() => {
        setCharacterExpression('success');
      }, 1500);
    } catch (error) {
      console.error("Fallo en la búsqueda:", error);
      setCharacterExpression('alert');
    } finally {
      setSearchActive(false);
    }
  };

  const handleBack = () => {
    const now = Date.now();
    if (now - lastBackClick < 2000) {
      setView('home');
      setCurrentServer(null);
      setCharacterExpression('idle');
      setLastBackClick(0);
    } else {
      setLastBackClick(now);
      setAiInsight("SISTEMA: Toca de nuevo el botón de retroceso para confirmar la salida.");
      setCharacterExpression('thinking');
      
      // Limpiar el aviso después de 2 segundos
      setTimeout(() => {
        setLastBackClick(prev => {
          if (Date.now() - prev >= 2000) {
            return 0;
          }
          return prev;
        });
      }, 2000);
    }
  };

  return (
    <div className="h-screen w-screen bg-black text-terminal-green font-mono overflow-hidden flex flex-col relative">
      {/* Efecto de Scanline - Oculto en el reproductor para máxima nitidez */}
      <div className={`absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%] z-[100] transition-opacity duration-500 ${view === 'player' ? 'opacity-0' : 'opacity-100'}`} />

      {/* Cabecera */}
      <header className="p-4 border-b border-blood-red bg-black/80 backdrop-blur-md flex justify-between items-center z-50">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 border border-blood-red flex items-center justify-center bg-blood-red/10 animate-pulse">
            <Cpu className="text-blood-red" size={24} />
          </div>
          <div>
            <h1 className="text-xl tracking-[0.5em] font-bold text-white glitch-text">NEXUSNIME_OS</h1>
            <div className="text-[8px] text-terminal-green tracking-widest opacity-70">SISTEMA_OPERATIVO_ANIME_V2.0.4</div>
          </div>
        </div>

        {user ? (
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <div className="text-[10px] text-terminal-green uppercase tracking-tighter">USUARIO_AUTORIZADO</div>
              <div className="text-xs font-bold text-white truncate max-w-[150px]">{user.isAnonymous ? 'MODO_INVITADO' : user.displayName}</div>
              {userProfile?.lastServer && (
                <button 
                  onClick={() => handleServerSelect(Number(userProfile.lastServer))}
                  className="text-[8px] text-terminal-green/50 hover:text-terminal-green uppercase tracking-widest mt-1 block w-full text-right transition-colors"
                  title="Acceso rápido al último servidor"
                >
                  ÚLTIMO_NODO: {SERVERS[Number(userProfile.lastServer)]?.name || 'DESCONOCIDO'}
                </button>
              )}
            </div>
            {user.isAnonymous ? (
              <button 
                onClick={signInWithGoogle}
                className="px-4 py-2 border border-terminal-green text-terminal-green text-[10px] hover:bg-terminal-green hover:text-black transition-all"
              >
                SINCRONIZAR_GOOGLE
              </button>
            ) : (
              <button 
                onClick={logout}
                className="p-2 border border-blood-red text-blood-red hover:bg-blood-red hover:text-white transition-all"
                title="Cerrar Sesión"
              >
                <LogOut size={18} />
              </button>
            )}
          </div>
        ) : (
          <div className="text-[10px] text-blood-red animate-pulse">INICIALIZANDO_SISTEMA...</div>
        )}
      </header>

      {/* Age Warning Modal */}
      {showAgeWarning !== null && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="max-w-md w-full border border-red-500/50 bg-zinc-900 p-8 text-center space-y-6 shadow-[0_0_50px_rgba(239,68,68,0.2)]"
          >
            <div className="flex justify-center">
              <div className="p-4 rounded-full bg-red-500/10 border border-red-500/30">
                <AlertCircle size={48} className="text-red-500" />
              </div>
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold tracking-tighter text-red-500 uppercase">ADVERTENCIA DE CONTENIDO</h2>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Este servidor es para <span className="text-white font-bold">MAYORES DE 18 AÑOS</span>. 
                ¿Seguro que quieres entrar?
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-4">
              <button
                onClick={() => {
                  const pos = showAgeWarning;
                  setShowAgeWarning(null);
                  handleServerSelect(pos);
                  if (user) {
                    logHistory(user.uid, SERVERS[pos].id, SERVERS[pos].url);
                  }
                }}
                className="p-4 bg-red-600 hover:bg-red-500 text-white font-bold tracking-widest text-xs transition-colors"
              >
                SI
              </button>
              <button
                onClick={() => setShowAgeWarning(null)}
                className="p-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold tracking-widest text-xs transition-colors"
              >
                NO
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Modal de Comunidad (YouTube/WhatsApp) */}
      <AnimatePresence>
        {showCommunityModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.8, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-zinc-900 border-2 border-blood-red p-8 rounded-2xl shadow-[0_0_50px_rgba(255,0,0,0.2)] overflow-hidden"
            >
              {/* Fondo decorativo */}
              <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 bg-blood-red/10 rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-48 h-48 bg-terminal-green/5 rounded-full blur-3xl" />

              <button 
                onClick={() => setShowCommunityModal(false)}
                className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>

              <div className="relative z-10 text-center">
                <div className="mb-6 inline-flex p-4 bg-blood-red/20 rounded-full text-blood-red animate-bounce">
                  <Zap size={32} />
                </div>

                <h2 className="text-2xl font-bold text-white mb-2 tracking-tighter">¡GRACIAS POR ELEGIRNOS!</h2>
                <p className="text-terminal-green text-xs tracking-widest mb-6 opacity-80">TU APOYO NOS HACE MÁS FUERTES</p>

                <div className="space-y-4 mb-8">
                  <p className="text-zinc-300 text-sm leading-relaxed">
                    Si aún no eres parte de la élite, <span className="text-blood-red font-bold">¡YA ES LA HORA!</span>
                  </p>
                  <p className="text-zinc-400 text-xs italic">
                    Únete a nuestra comunidad y no te pierdas nada del multiverso anime.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <a 
                    href="https://youtube.com/@inoelnexus?si=yszzeWr5fvP5e6Xt?sub_confimation=1" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-3 p-4 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold transition-all transform hover:scale-105 active:scale-95 shadow-lg"
                  >
                    <Youtube size={20} />
                    SUSCRIBIRSE EN YOUTUBE
                  </a>
                  <a 
                    href="https://whatsapp.com/channel/0029VbBy2md9mrGmUu2TiW3l" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-3 p-4 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold transition-all transform hover:scale-105 active:scale-95 shadow-lg"
                  >
                    <MessageCircle size={20} />
                    COMUNIDAD WHATSAPP
                  </a>
                </div>

                <button 
                  onClick={() => setShowCommunityModal(false)}
                  className="mt-8 text-[10px] text-zinc-500 hover:text-zinc-300 tracking-[0.3em] uppercase transition-colors"
                >
                  Continuar al Servidor
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal de Traductor Instantáneo */}
      <AnimatePresence>
        {showTranslator && (
          <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-lg bg-zinc-950 border border-blue-500/50 p-6 rounded-lg shadow-[0_0_40px_rgba(59,130,246,0.2)]"
            >
              <div className="flex items-center justify-between mb-6 border-b border-blue-500/30 pb-4">
                <div className="flex items-center gap-3 text-blue-400">
                  <Languages size={24} />
                  <h2 className="text-lg font-bold tracking-[0.2em] uppercase">NEXUS_TRANSLATOR_V1</h2>
                </div>
                <button 
                  onClick={() => setShowTranslator(false)}
                  className="text-zinc-500 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="text-[10px] text-blue-400/50 block mb-2 tracking-widest uppercase">TEXTO_ORIGINAL</label>
                  <textarea 
                    value={translationText}
                    onChange={(e) => setTranslationText(e.target.value)}
                    placeholder="INTRODUCE_TEXTO_PARA_TRADUCIR..."
                    className="w-full bg-black border border-blue-500/30 p-4 text-sm text-blue-100 focus:outline-none focus:border-blue-500 min-h-[100px] rounded-sm"
                  />
                </div>

                <div className="flex justify-center">
                  <button 
                    onClick={handleTranslate}
                    disabled={isTranslating || !translationText.trim()}
                    className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold tracking-[0.2em] rounded-sm disabled:opacity-50 transition-all flex items-center gap-3"
                  >
                    {isTranslating ? (
                      <>
                        <Activity className="animate-spin" size={18} />
                        PROCESANDO...
                      </>
                    ) : (
                      <>
                        <Zap size={18} />
                        TRADUCIR_AHORA
                      </>
                    )}
                  </button>
                </div>

                {translatedText && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-sm"
                  >
                    <label className="text-[10px] text-blue-400/50 block mb-2 tracking-widest uppercase">RESULTADO_NEXUS</label>
                    <p className="text-sm text-blue-200 leading-relaxed">{translatedText}</p>
                  </motion.div>
                )}
              </div>

              <div className="mt-8 pt-4 border-t border-blue-500/20 text-[8px] text-blue-400/30 text-center tracking-widest uppercase">
                SISTEMA_DE_TRADUCCIÓN_IMPULSADO_POR_NEXUS_AI_CORE
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <main className="flex-1 relative">
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div 
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full flex flex-col items-center justify-center p-8 bg-black"
            >
              <div className="relative w-48 h-48 mb-8">
                <img 
                  src={LOADING_ICON_URL} 
                  alt="Loading..." 
                  className="w-full h-full object-contain animate-spin-slow glitch-loading"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="text-terminal-green animate-pulse tracking-[0.5em] text-xs font-bold uppercase">
                INICIALIZANDO_NEXUSNIME_OS...
              </div>
            </motion.div>
          ) : view === 'home' ? (
            <motion.div 
              key="home"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 w-full overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-blood-red scrollbar-track-black/10"
            >
              <div className="flex flex-col items-center w-full max-w-lg mx-auto py-8 pb-32">
                <div className="text-center mb-8">
                  <div className="text-xs opacity-50 mb-2">ESTADO DEL SISTEMA: EN LÍNEA</div>
                  <div className="text-xs opacity-50">SERVIDORES DETECTADOS: {SERVERS.length}</div>
                </div>

                {/* Buscador de Servidores */}
                <div className="relative mb-6 w-full">
                  <input 
                    type="text"
                    value={serverSearchQuery}
                    onChange={(e) => setServerSearchQuery(e.target.value)}
                    placeholder="BUSCAR_SERVIDOR_NEXUS..."
                    className="w-full bg-black/50 border border-blood-red/30 p-4 pl-12 text-xs text-blood-red focus:outline-none focus:border-blood-red transition-all rounded-sm placeholder:text-blood-red/20"
                  />
                  <Search className="absolute left-4 top-4 text-blood-red/50" size={18} />
                </div>

                {/* Continuar Viendo (Último Servidor) */}
                {userProfile?.lastServer && (
                  <div className="mb-8 w-full">
                    <h3 className="text-xs text-terminal-green font-bold tracking-[0.3em] mb-4 border-b border-terminal-green/30 pb-2 uppercase">CONTINUAR_VIENDO</h3>
                    <button
                      onClick={() => handleServerSelect(Number(userProfile.lastServer))}
                      className="w-full group relative p-4 border border-terminal-green/50 bg-terminal-green/5 hover:bg-terminal-green/10 transition-all duration-300 overflow-hidden text-left"
                    >
                      <div className="flex justify-between items-center relative z-10">
                        <div className="flex items-center gap-3">
                          <Play size={16} className="text-terminal-green" />
                          <span className="text-sm text-terminal-green font-bold">{SERVERS[Number(userProfile.lastServer)]?.name || 'SERVIDOR_ANTERIOR'}</span>
                        </div>
                        <span className="text-[10px] text-terminal-green/50 uppercase tracking-widest">REANUDAR_CONEXIÓN</span>
                      </div>
                      <div className="absolute inset-0 bg-terminal-green/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  </div>
                )}

                {/* Botón de Intercambio de Núcleos */}
                <div className="mb-8 w-full">
                  <button
                    onClick={() => setShowFilmServers(!showFilmServers)}
                    className={`w-full p-4 border transition-all duration-500 flex items-center justify-center gap-4 group relative overflow-hidden ${showFilmServers ? 'border-blood-red bg-blood-red/5' : 'border-blue-500 bg-blue-500/5'}`}
                  >
                    <div className={`absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity ${showFilmServers ? 'bg-blood-red' : 'bg-blue-500'}`} />
                    {showFilmServers ? (
                      <>
                        <Zap size={20} className="text-blood-red group-hover:scale-110 transition-transform" />
                        <span className="text-xs font-bold tracking-[0.3em] text-blood-red uppercase">CAMBIAR_A_NÚCLEOS_ANIME</span>
                      </>
                    ) : (
                      <>
                        <Video size={20} className="text-blue-500 group-hover:scale-110 transition-transform" />
                        <span className="text-xs font-bold tracking-[0.3em] text-blue-400 uppercase">CAMBIAR_A_SERIES_Y_PELÍCULAS</span>
                      </>
                    )}
                  </button>
                </div>
                
                {/* Lista de Servidores (Intercambiable) */}
                <div className="mb-8 w-full">
                  <h3 className={`text-xs font-bold tracking-[0.3em] mb-4 border-b pb-2 transition-colors duration-500 ${showFilmServers ? 'text-blue-500 border-blue-500/30' : 'text-blood-red border-blood-red/30'}`}>
                    {showFilmServers ? 'NÚCLEOS_FILMS_SERIES_DETECTADOS' : 'NÚCLEOS_ANIME_DETECTADOS'}
                  </h3>
                  <div className="grid grid-cols-1 gap-3">
                    {SERVERS.filter(s => 
                      (showFilmServers ? s.category === 'Peliculas' : s.category === 'Anime') && 
                      s.name.toLowerCase().includes(serverSearchQuery.toLowerCase())
                    ).map((server) => (
                      <button
                        key={server.id}
                        onClick={() => handleServerSelect(SERVERS.indexOf(server))}
                        className={`group relative p-4 border transition-all duration-300 overflow-hidden text-left ${showFilmServers ? 'border-blue-500/50 hover:bg-blue-500/10' : 'border-blood-red/50 hover:bg-blood-red/10'}`}
                      >
                        <div className="flex justify-between items-center relative z-10">
                          <span className={`text-sm tracking-widest ${showFilmServers ? 'text-blue-400' : 'text-terminal-green'}`}>[ {server.id} ]</span>
                          <span className={`text-sm transition-colors ${showFilmServers ? 'text-blue-400/70 group-hover:text-blue-400' : 'text-terminal-green/70 group-hover:text-terminal-green'}`}>{server.name}</span>
                        </div>
                        <div className={`absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity ${showFilmServers ? 'bg-blue-500' : 'bg-blood-red'}`} />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setView('search')}
                    className="p-4 border border-terminal-green/30 hover:border-terminal-green text-[10px] tracking-[0.2em] flex items-center justify-center gap-2 transition-all"
                  >
                    <Search size={14} />
                    ESCANEO_ANIME
                  </button>
                  <button
                    onClick={() => setView('browser')}
                    className="p-4 border border-blue-500/30 hover:border-blue-500 text-[10px] tracking-[0.2em] flex items-center justify-center gap-2 transition-all"
                  >
                    <Compass size={14} />
                    NAVEGADOR_GAMER
                  </button>
                  <button
                    onClick={() => setView('player')}
                    className="p-4 border border-emerald-500/30 hover:border-emerald-500 text-[10px] tracking-[0.2em] flex items-center justify-center gap-2 transition-all"
                  >
                    <Play size={14} />
                    NEXUS_PLAYER
                  </button>
                  <button
                    onClick={() => setView('favorites')}
                    className={`p-4 border ${favorites.length > 0 ? 'border-pink-500/50 hover:border-pink-500' : 'border-terminal-green/30 hover:border-terminal-green'} text-[10px] tracking-[0.2em] flex items-center justify-center gap-2 transition-all`}
                  >
                    <Heart size={14} className={favorites.length > 0 ? 'text-pink-500' : ''} />
                    FAVORITOS_NEXUS
                  </button>
                </div>

                {/* AI Monitoring Dashboard */}
                <div className="mt-4 p-4 border border-terminal-green/20 bg-terminal-green/5 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 text-terminal-green">
                      <Shield size={16} className={isScanningFavorites ? 'animate-spin' : ''} />
                      <span className="text-[10px] font-bold tracking-widest uppercase">MONITOREO_IA_NEXUS</span>
                    </div>
                    <div className={`text-[8px] px-2 py-0.5 rounded ${isScanningFavorites ? 'bg-terminal-green text-black' : 'bg-terminal-green/20 text-terminal-green'}`}>
                      {isScanningFavorites ? 'ESCANEANDO...' : 'ACTIVO'}
                    </div>
                  </div>
                  
                  <div className="text-[9px] opacity-60 mb-4 space-y-1">
                    <div>ÚLTIMO_ESCANEO: {lastAiScan ? lastAiScan.toLocaleTimeString() : 'NUNCA'}</div>
                    <div>FAVORITOS_MONITOREADOS: {favorites.length}</div>
                    <div className="text-terminal-green/40 italic">"Gemini está analizando los nodos en busca de actualizaciones..."</div>
                  </div>

                  <button 
                    onClick={() => checkNewEpisodes()}
                    disabled={isScanningFavorites || favorites.length === 0}
                    className="w-full py-2 border border-terminal-green/40 hover:bg-terminal-green hover:text-black text-[9px] font-bold tracking-[0.2em] transition-all disabled:opacity-30"
                  >
                    FORZAR_ESCANEO_DE_IA_AHORA
                  </button>
                </div>

                {/* PWA / APK Info */}
                <div className="mt-2 text-center">
                  <button 
                    onClick={() => {
                      setAiInsight("MODO_DESPLIEGUE: Este proyecto está listo para GitHub y Netlify. Para APK, usa PWA2APK con la URL de Netlify.");
                      setCharacterExpression('success');
                    }}
                    className="text-[8px] text-terminal-green/30 hover:text-terminal-green transition-colors uppercase tracking-widest"
                  >
                    VER_INFO_DE_DESPLIEGUE_Y_APK
                  </button>
                </div>
              </div>
            </motion.div>
          ) : view === 'browser' ? (
            <motion.div 
              key="browser"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full flex flex-col"
            >
              <div className="p-2 border-b border-blue-500 bg-black flex items-center gap-2 sm:gap-4">
                <button 
                  onClick={handleBack} 
                  className={`p-2 transition-all ${lastBackClick > 0 ? 'text-blood-red animate-pulse' : 'hover:text-blue-500'}`} 
                  title={lastBackClick > 0 ? "Toca de nuevo para volver" : "Volver al Menú"}
                >
                  <ChevronLeft size={20} />
                </button>
                <button onClick={() => setBrowserUrl('https://duckduckgo.com/lite/')} className="p-2 hover:text-blue-500 transition-colors" title="Página de Inicio">
                  <Globe size={18} />
                </button>
                <button 
                  onClick={() => {
                    const current = browserUrl;
                    setBrowserUrl('about:blank');
                    setTimeout(() => setBrowserUrl(current), 50);
                  }} 
                  className="p-2 hover:text-blue-500 transition-colors" 
                  title="Recargar Página"
                >
                  <Zap size={18} />
                </button>
                <form onSubmit={handleBrowserSearch} className="flex-1 flex gap-2">
                  <div className="flex-1 relative">
                    <input 
                      name="search"
                      type="text"
                      placeholder="BUSCAR_EN_RED_O_INTRODUCIR_URL..."
                      className="w-full bg-black border border-blue-500/50 p-2 pl-8 text-xs text-blue-400 focus:outline-none focus:border-blue-500 rounded-sm"
                    />
                    <Search className="absolute left-2 top-2 opacity-30 text-blue-400" size={14} />
                  </div>
                  <button type="submit" className="px-4 py-2 bg-blue-600 text-white text-[10px] font-bold tracking-widest hover:bg-blue-700 transition-colors whitespace-nowrap">
                    BUSCAR
                  </button>
                </form>
                <div className="hidden md:flex gap-2 px-4 border-l border-blue-500/30">
                  <button
                    onClick={() => setIsDeepWebMode(!isDeepWebMode)}
                    className={`p-2 transition-colors flex items-center gap-2 ${isDeepWebMode ? 'text-blood-red' : 'text-blue-400'}`}
                    title="Modo Deep Web (Nodos Ocultos)"
                  >
                    <Shield size={16} className={isDeepWebMode ? 'animate-pulse' : ''} />
                    <span className="text-[10px] hidden sm:inline">{isDeepWebMode ? 'DEEP_WEB: ON' : 'DEEP_WEB: OFF'}</span>
                  </button>
                </div>
                <div className="hidden md:flex gap-2 px-4 border-l border-blue-500/30">
                  <button
                    onClick={() => setShowTranslator(true)}
                    className="p-2 text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-2"
                    title="Traductor Instantáneo"
                  >
                    <Languages size={16} />
                    <span className="text-[10px] hidden sm:inline">TRADUCIR</span>
                  </button>
                </div>
                <div className="hidden md:flex gap-2 px-4 border-l border-blue-500/30">
                  <div className="flex flex-col items-end">
                    <div className="flex items-center gap-1">
                      <Shield size={8} className="text-terminal-green" />
                      <span className="text-[6px] text-terminal-green">AD_BLOCK_ACTIVE</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Zap size={8} className="text-yellow-500" />
                      <span className="text-[6px] text-yellow-500">NEXUS_ACCELERATION_ON</span>
                    </div>
                  </div>
                </div>
                <div className="hidden md:flex gap-2 px-4 border-l border-blue-500/30">
                  <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                  <span className="text-[8px] text-blue-400">MODO_NAVEGACIÓN_ULTRA_SEGURO</span>
                </div>
              </div>
              <div className="flex-1 relative bg-white overflow-hidden flex flex-col">
                {isNexusSearching && (
                  <div className="absolute inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-8 text-center">
                    <div className="w-24 h-24 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-6" />
                    <h3 className="text-xl font-bold text-blue-500 tracking-[0.3em] mb-2">ESCANEANDO_RED_GLOBAL</h3>
                    <p className="text-xs text-blue-400/60 animate-pulse">ELIMINANDO ANUNCIOS | FILTRANDO RASTREADORES | BUSCANDO NODOS SEGUROS</p>
                  </div>
                )}

                {nexusSearchResults.length > 0 && !isNexusSearching && (
                  <div className="absolute inset-0 z-40 bg-black/95 overflow-y-auto p-6 custom-scrollbar">
                    <div className="max-w-4xl mx-auto space-y-8">
                      <div className="flex items-center justify-between border-b border-blue-500/30 pb-4">
                        <h2 className="text-2xl font-bold text-blue-500 tracking-widest flex items-center gap-3">
                          <Zap className="text-yellow-400" />
                          RESULTADOS_NEXUS_ULTRA
                        </h2>
                        <button 
                          onClick={() => setNexusSearchResults([])}
                          className="text-[10px] text-blue-400/50 hover:text-blue-400 transition-colors"
                        >
                          CERRAR_RESULTADOS
                        </button>
                      </div>

                      <div className="grid gap-4">
                        {nexusSearchResults.map((link, idx) => (
                          <motion.div 
                            key={idx}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            className="p-4 border border-blue-500/20 bg-blue-500/5 hover:bg-blue-500/10 transition-all group cursor-pointer"
                            onClick={() => {
                              setBrowserUrl(link.url);
                              setNexusSearchResults([]);
                            }}
                          >
                            <div className="flex justify-between items-start mb-2">
                              <h3 className="text-lg font-bold text-blue-400 group-hover:text-blue-300 transition-colors">{link.title}</h3>
                              <span className={`text-[8px] px-2 py-0.5 rounded border ${link.type === 'deep' ? 'border-blood-red text-blood-red' : 'border-blue-500 text-blue-500'}`}>
                                {link.type.toUpperCase()}
                              </span>
                            </div>
                            <p className="text-xs text-gray-400 mb-2">{link.description}</p>
                            <div className="text-[10px] text-blue-500/50 truncate italic">{link.url}</div>
                          </motion.div>
                        ))}
                      </div>

                      <div className="p-6 border border-terminal-green/20 bg-terminal-green/5 rounded-lg">
                        <div className="flex items-center gap-2 text-terminal-green mb-3">
                          <Bot size={16} />
                          <span className="text-[10px] font-bold tracking-widest uppercase">SÍNTESIS_IA_NEXUS</span>
                        </div>
                        <p className="text-sm text-terminal-green/80 leading-relaxed italic">
                          "{aiInsight}"
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <iframe 
                  src={browserUrl}
                  className="w-full h-full border-none"
                  title="Nexus Browser"
                  sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
                />
              </div>
            </motion.div>
          ) : view === 'ai' ? (
            <motion.div 
              key="ai"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
              className="h-full flex flex-col p-6 max-w-5xl mx-auto w-full"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3 text-purple-500">
                  <button 
                    onClick={handleBack} 
                    className={`p-2 mr-2 transition-all ${lastBackClick > 0 ? 'text-blood-red animate-pulse' : 'hover:text-purple-400'}`}
                    title={lastBackClick > 0 ? "Toca de nuevo para volver" : "Volver al Menú"}
                  >
                    <ChevronLeft size={24} />
                  </button>
                  <Bot size={28} />
                  <h2 className="text-xl tracking-[0.4em] font-bold uppercase">NEXUS_AI_CORE</h2>
                </div>
                <button 
                  onClick={clearAiHistory}
                  className="p-2 text-purple-500/50 hover:text-purple-500 transition-colors"
                  title="Limpiar Historial"
                >
                  <Trash2 size={18} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto mb-6 space-y-6 pr-4 custom-scrollbar">
                {aiChatHistory.map((chat) => (
                  <div key={chat.id} className="space-y-4">
                    <div className="flex justify-end">
                      <div className="max-w-[80%] bg-purple-950/20 border border-purple-500/30 p-4 rounded-tl-2xl rounded-tr-2xl rounded-bl-2xl">
                        <div className="text-[8px] text-purple-400 mb-1 uppercase tracking-widest">USUARIO</div>
                        <div className="text-sm text-purple-100">{chat.prompt}</div>
                      </div>
                    </div>
                    <div className="flex justify-start">
                      <div className="max-w-[85%] bg-black border border-purple-500 p-4 rounded-tr-2xl rounded-br-2xl rounded-bl-2xl relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-purple-500" />
                        <div className="text-[8px] text-purple-500 mb-1 uppercase tracking-widest">NEXUS_AI</div>
                        <div className="text-sm text-terminal-green leading-relaxed whitespace-pre-wrap">
                          {chat.response}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {aiChatHistory.length === 0 && !isAiThinking && (
                  <div className="h-full flex flex-col items-center justify-center opacity-30 text-center">
                    <Bot size={64} className="mb-4" />
                    <p className="text-xs tracking-widest">NÚCLEO_IA_EN_ESPERA... HAZ_UNA_PREGUNTA_PARA_ACTIVAR</p>
                  </div>
                )}
                {isAiThinking && (
                  <div className="flex justify-start animate-pulse">
                    <div className="bg-black border border-purple-500/50 p-4 rounded-tr-xl rounded-br-xl rounded-bl-xl">
                      <div className="flex items-center gap-2">
                        <Activity className="animate-spin text-purple-500" size={14} />
                        <span className="text-[10px] text-purple-400 tracking-widest">PROCESANDO_DATOS...</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="relative">
                <textarea 
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleAiChat();
                    }
                  }}
                  placeholder="ESCRIBE_TU_PREGUNTA_O_PROBLEMA_AQUÍ..."
                  className="w-full bg-black border border-purple-500 p-4 pr-16 text-terminal-green focus:outline-none focus:border-purple-400 min-h-[100px] resize-none placeholder:text-purple-500/20 text-sm"
                />
                <button 
                  onClick={handleAiChat}
                  disabled={isAiThinking || !aiPrompt.trim()}
                  className="absolute bottom-4 right-4 p-3 bg-purple-600 text-white rounded-full hover:bg-purple-700 disabled:opacity-30 transition-all"
                >
                  <Send size={20} />
                </button>
              </div>
            </motion.div>
          ) : view === 'player' ? (
            <motion.div 
              key="player"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="h-full flex flex-col p-6 max-w-6xl mx-auto w-full"
            >
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3 text-emerald-500">
                  <Play size={28} />
                  <h2 className="text-xl tracking-[0.4em] font-bold uppercase text-white" style={{ textShadow: '0 0 10px rgba(16,185,129,0.5)' }}>NEXUS_ULTRA_HD_PLAYER</h2>
                </div>
                <div className="flex gap-4">
                  <label className="cursor-pointer px-4 py-2 border border-emerald-500 text-emerald-500 text-[10px] hover:bg-emerald-500 hover:text-black transition-all flex items-center gap-2">
                    <Plus size={14} />
                    CARGAR_LOCAL
                    <input type="file" className="hidden" accept="video/*,audio/*" onChange={handleLocalFileSelect} />
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1 min-h-0">
                {/* Reproductor Principal */}
                <div className="lg:col-span-2 flex flex-col gap-4">
                  <div className="aspect-video bg-black border border-emerald-500/30 relative overflow-hidden flex items-center justify-center group rounded-lg shadow-2xl">
                    {playerUrl ? (
                      playerType === 'video' ? (
                        <video 
                          src={playerUrl} 
                          controls 
                          autoPlay 
                          className="w-full h-full object-contain shadow-[0_0_30px_rgba(0,255,0,0.1)]"
                          style={{ 
                            filter: 'contrast(1.05) brightness(1.02) saturate(1.05)',
                            imageRendering: 'auto'
                          }}
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-6">
                          <div className="w-32 h-32 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin flex items-center justify-center">
                            <Music size={48} className="text-emerald-500" />
                          </div>
                          <audio src={playerUrl} controls autoPlay className="w-full max-w-md" />
                        </div>
                      )
                    ) : (
                      <div className="text-center opacity-30">
                        <Video size={64} className="mx-auto mb-4" />
                        <p className="text-xs tracking-widest">SISTEMA_EN_ESPERA... SELECCIONA_UN_ARCHIVO</p>
                      </div>
                    )}
                    <div className="absolute top-4 left-4 flex gap-2">
                      <div className="px-2 py-1 bg-black/80 border border-emerald-500 text-[8px] text-emerald-500 uppercase tracking-widest">
                        {playerType}
                      </div>
                      {playerType === 'video' && (
                        <div className="px-2 py-1 bg-emerald-500 text-black text-[8px] font-bold uppercase tracking-widest animate-pulse">
                          4K ULTRA HD
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {playerUrl && (
                    <div className="p-4 border border-emerald-500/20 bg-emerald-950/5 flex justify-between items-center">
                      <div>
                        <div className="text-[10px] text-emerald-500 mb-1 uppercase tracking-widest">REPRODUCIENDO_AHORA</div>
                        <h3 className="text-sm font-bold text-white truncate max-w-md">{playerName}</h3>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleDownload(playerUrl, playerName)}
                          className="p-2 border border-emerald-500/50 hover:border-emerald-500 text-emerald-500 transition-all"
                          title="Descargar Archivo"
                        >
                          <Download size={18} />
                        </button>
                        <button 
                          onClick={() => handleSaveMedia(playerUrl, playerName, playerType)}
                          className="p-2 border border-emerald-500/50 hover:border-emerald-500 text-emerald-500 transition-all"
                          title="Guardar en Biblioteca"
                        >
                          <Plus size={18} />
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col gap-4">
                    <input 
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      accept="video/*,audio/*"
                      onChange={handleLocalFileSelect}
                    />
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full bg-black border border-emerald-500/50 p-4 text-xs text-emerald-500 font-bold tracking-[0.2em] hover:bg-emerald-500/10 hover:border-emerald-500 transition-all flex items-center justify-center gap-3 group"
                    >
                      <Zap size={16} className="group-hover:animate-pulse" />
                      SELECCIONAR_VIDEO_O_AUDIO_DEL_ALMACENAMIENTO
                    </button>
                    
                    <div className="flex items-center gap-4">
                      <div className="h-[1px] flex-1 bg-emerald-500/20"></div>
                      <span className="text-[8px] text-emerald-500/40 uppercase tracking-widest">O_PEGAR_URL_DIRECTA</span>
                      <div className="h-[1px] flex-1 bg-emerald-500/20"></div>
                    </div>

                    <input 
                      type="text"
                      placeholder="URL_EXTERNA_STREAMING..."
                      className="flex-1 bg-black border border-emerald-500/30 p-3 text-xs text-emerald-400 focus:outline-none focus:border-emerald-500"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const url = (e.target as HTMLInputElement).value;
                          const type = url.includes('.mp3') || url.includes('.wav') ? 'audio' : 'video';
                          handleMediaPlay(url, type, 'Stream Externo');
                          (e.target as HTMLInputElement).value = '';
                        }
                      }}
                    />
                  </div>
                </div>

                {/* Biblioteca / Historial */}
                <div className="flex flex-col gap-4 min-h-0">
                  <div className="flex items-center gap-2 text-emerald-500/50 mb-2">
                    <Activity size={16} />
                    <h3 className="text-xs tracking-[0.2em] font-bold uppercase">BIBLIOTECA_MULTIMEDIA</h3>
                  </div>
                  <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                    {mediaLibrary.map((item) => (
                      <div 
                        key={item.id}
                        className="p-3 border border-emerald-500/10 bg-black hover:bg-emerald-500/5 transition-all group flex items-center justify-between"
                      >
                        <button 
                          onClick={() => handleMediaPlay(item.url, item.type, item.name)}
                          className="flex-1 flex items-center gap-3 text-left"
                        >
                          {item.type === 'video' ? <FileVideo size={16} className="text-emerald-500" /> : <FileAudio size={16} className="text-emerald-500" />}
                          <div className="min-w-0">
                            <div className="text-xs truncate text-emerald-100 group-hover:text-emerald-400 transition-colors">{item.name}</div>
                            <div className="text-[8px] opacity-30 uppercase">{item.type} • {item.timestamp?.toDate ? item.timestamp.toDate().toLocaleDateString() : '...'}</div>
                          </div>
                        </button>
                        <button 
                          onClick={() => deleteMedia(item.id)}
                          className="p-2 opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-400 transition-all"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                    {mediaLibrary.length === 0 && (
                      <div className="text-center py-12 opacity-20 italic text-[10px]">
                        BIBLIOTECA_VACÍA... CARGA_ARCHIVOS_PARA_EMPEZAR
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ) : view === 'favorites' ? (
            <motion.div 
              key="favorites"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="h-full flex flex-col p-6 max-w-4xl mx-auto w-full"
            >
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3 text-pink-500">
                  <button 
                    onClick={handleBack} 
                    className={`p-2 mr-2 transition-all ${lastBackClick > 0 ? 'text-blood-red animate-pulse' : 'hover:text-pink-400'}`}
                    title={lastBackClick > 0 ? "Toca de nuevo para volver" : "Volver al Menú"}
                  >
                    <ChevronLeft size={24} />
                  </button>
                  <Heart size={28} />
                  <h2 className="text-xl tracking-[0.4em] font-bold uppercase">FAVORITOS_NEXUS</h2>
                </div>
                <div className="flex gap-4">
                  <button 
                    onClick={() => checkNewEpisodes()}
                    disabled={isScanningFavorites || favorites.length === 0}
                    className="flex items-center gap-2 px-4 py-2 border border-emerald-500 text-emerald-500 text-[10px] hover:bg-emerald-500 hover:text-black disabled:opacity-30 transition-all"
                  >
                    <Zap size={14} className={isScanningFavorites ? 'animate-pulse' : ''} />
                    {isScanningFavorites ? 'ESCANEANDO...' : 'ESCANEO_FORZADO'}
                  </button>
                  <button 
                    onClick={requestNotificationPermission}
                    className={`flex items-center gap-2 px-4 py-2 border ${notificationsEnabled ? 'border-terminal-green text-terminal-green' : 'border-blood-red text-blood-red'} text-[10px] hover:opacity-80 transition-all`}
                  >
                    {notificationsEnabled ? <Bell size={14} /> : <BellOff size={14} />}
                    {notificationsEnabled ? 'NOTIFICACIONES_ACTIVAS' : 'ACTIVAR_NOTIFICACIONES'}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 overflow-y-auto pr-2 custom-scrollbar">
                {favorites.map((fav) => (
                  <div key={fav.id} className="p-4 border border-pink-500/20 bg-pink-950/5 flex justify-between items-center group hover:border-pink-500/50 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded border border-pink-500/30 flex items-center justify-center bg-black">
                        <Video size={20} className="text-pink-500 opacity-50" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider">{fav.animeName}</h3>
                        <div className="text-[10px] opacity-50 flex flex-col gap-1">
                          <div className="flex gap-3">
                            <span>SERVIDOR: {SERVERS.find(s => s.id === fav.serverId)?.name}</span>
                            <span className="text-pink-400">ÚLTIMO: {fav.lastEpisode}</span>
                          </div>
                          {fav.lastChecked && (
                            <span className="text-[8px] text-gray-600 uppercase">
                              CHECK: {fav.lastChecked?.toDate?.() ? fav.lastChecked.toDate().toLocaleTimeString() : 'RECIENTE'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleServerSelect(SERVERS.findIndex(s => s.id === fav.serverId), SERVERS.find(s => s.id === fav.serverId)?.searchUrl(fav.animeName))}
                        className="p-2 border border-terminal-green/30 hover:border-terminal-green text-terminal-green transition-all"
                        title="Ver en Servidor"
                      >
                        <Play size={16} />
                      </button>
                      <button 
                        onClick={() => toggleFavorite(fav.animeName, fav.serverId)}
                        className="p-2 border border-pink-500/30 hover:border-pink-500 text-pink-500 transition-all"
                        title="Eliminar de Favoritos"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
                {favorites.length === 0 && (
                  <div className="text-center py-20 opacity-20 italic text-sm">
                    SIN FAVORITOS REGISTRADOS... ESCANEA ANIMES Y AÑÁDELOS CON EL ICONO DE CORAZÓN.
                  </div>
                )}
              </div>
              
              <div className="mt-8 p-4 border border-terminal-green/10 bg-terminal-green/5">
                <div className="text-[10px] flex items-center gap-2 opacity-50 mb-2">
                  <Activity size={12} />
                  LOG_DE_SISTEMA_NOTIFICACIONES
                </div>
                <div className="text-[8px] font-mono opacity-30">
                  [OK] ESCANEO_PERIODICO_ACTIVO (5m)<br/>
                  [OK] SERVIDOR_TIOANIME_ONLINE<br/>
                  [OK] SERVIDOR_JKANIME_ONLINE<br/>
                  [OK] SERVIDOR_MONOSCHINOS_ONLINE
                </div>
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
                <button 
                  onClick={handleBack} 
                  className={`p-2 transition-all ${lastBackClick > 0 ? 'text-blood-red animate-pulse' : 'hover:text-terminal-green'}`}
                  title={lastBackClick > 0 ? "Toca de nuevo para volver" : "Volver al Menú"}
                >
                  <ChevronLeft size={24} />
                </button>
                <div className="flex-1 relative">
                  <input 
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && performSearch()}
                    placeholder="INTRODUCE_CONSULTA_PARA_ESCANEO_ENTRE_SERVIDORES..."
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

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {SERVERS.map((server, i) => (
                  <div
                    key={server.id}
                    onClick={() => handleServerSelect(i, server.searchUrl(searchQuery))}
                    className="p-4 border border-blood-red/40 hover:border-blood-red hover:bg-blood-red/5 transition-all flex flex-col gap-2 text-left cursor-pointer"
                  >
                    <div className="text-[10px] opacity-50">SERVER_{i+1}</div>
                    <div className="text-sm font-bold">{server.name}</div>
                    <div className="text-[10px] text-terminal-green truncate">{server.searchUrl(searchQuery)}</div>
                    <div className="mt-2 flex justify-between items-center">
                      <div className="text-[10px] flex items-center gap-1 text-blood-red">
                        <Activity size={10} />
                        LISTO_PARA_ESCANEAR
                      </div>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(searchQuery, server.id);
                        }}
                        className={`p-1 transition-all ${favorites.find(f => f.animeName === searchQuery && f.serverId === server.id) ? 'text-pink-500' : 'text-white/30 hover:text-pink-500'}`}
                      >
                        <Heart size={14} fill={favorites.find(f => f.animeName === searchQuery && f.serverId === server.id) ? 'currentColor' : 'none'} />
                      </button>
                    </div>
                  </div>
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
                <button 
                  onClick={handleBack} 
                  className={`p-4 border-r border-blood-red transition-all ${lastBackClick > 0 ? 'bg-blood-red/40 text-white animate-pulse' : 'hover:bg-blood-red/20'}`}
                  title={lastBackClick > 0 ? "Toca de nuevo para volver" : "Volver al Menú"}
                >
                  <ChevronLeft size={20} />
                </button>
                <div className="flex-1 flex overflow-x-auto">
                  {SERVERS.map((server, i) => (
                    <button
                      key={server.id}
                      onClick={() => handleServerSelect(i)}
                      className={`px-6 py-4 text-xs tracking-widest border-r border-blood-red transition-all ${
                        currentServer === i ? 'bg-blood-red text-white' : 'hover:bg-blood-red/10'
                      }`}
                    >
                      {server.id}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1 relative">
                <iframe
                  src={SERVERS[currentServer!].url}
                  className="w-full h-full border-none bg-white"
                  title={SERVERS[currentServer!].name}
                  sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

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
