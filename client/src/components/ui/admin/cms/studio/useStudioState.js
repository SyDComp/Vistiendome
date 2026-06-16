import { useState, useEffect, useRef } from 'react';

/**
 * useStudioState
 * Toda la lógica del Studio vive aquí.
 * Los componentes visuales solo llaman a las acciones que exporta este hook.
 *
 * Estructura de config unificada:
 * {
 *   breakpoint: 1050,
 *   scenes: [
 *     { id, bg_color, desktop_layers: [...], mobile_layers: null | [...] }
 *   ]
 * }
 * mode="single" → 1 escena (Portada, Banner)
 * mode="multi"  → N escenas (Carrusel)
 */
export function useStudioState({ data, mode }) {
    const [scenes,         setScenes]         = useState([]);
    const [breakpoint]             = useState(1050); // Fijo en 1050
    const [activeSceneIdx, setActiveSceneIdx] = useState(0);
    const [activeLayerIdx, setActiveLayerIdx] = useState(null);
    const [viewport,       setViewport]       = useState('desktop'); // 'desktop' | 'mobile'
    const [dragging,       setDragging]       = useState(null);
    const [viewMode,       setViewMode]       = useState('edit');    // 'edit' | 'preview'
    const [carouselInterval, setCarouselInterval] = useState(5);
    const [desktopRatio,   setDesktopRatio]   = useState('21/9');
    const [mobileRatio,    setMobileRatio]    = useState('9/16');
    const canvasRef = useRef(null);

    // ── Inicialización (migra formatos viejos) ──────────────────────────────
    useEffect(() => {
        const cfg = data?.config || {};

        if (cfg.carousel_interval !== undefined) {
            setCarouselInterval(cfg.carousel_interval);
        }
        if (cfg.desktop_ratio) setDesktopRatio(cfg.desktop_ratio);
        if (cfg.mobile_ratio) setMobileRatio(cfg.mobile_ratio);

        // Ya tiene el nuevo formato
        if (cfg.scenes) {
            setScenes(cfg.scenes);
            return;
        }

        // Migrar CompositionEditor (slides[])
        if (cfg.slides) {
            setScenes(cfg.slides.map((s, i) => ({
                id: i + 1,
                bg_color: s.bg_color || '#1e1b4b',
                desktop_layers: s.layers || [],
                mobile_layers: null
            })));
            return;
        }

        // Migrar HeroEditor (layers[])
        if (cfg.layers || cfg.bg_color !== undefined) {
            setScenes([{
                id: 1,
                bg_color: cfg.bg_color || '#1e1b4b',
                desktop_layers: cfg.layers || [],
                mobile_layers: null
            }]);
            return;
        }

        // Bloque nuevo vacío
        setScenes([{ id: Date.now(), bg_color: '#1e1b4b', desktop_layers: [], mobile_layers: null }]);
    }, [data]);

    // ── Datos derivados ─────────────────────────────────────────────────────
    const scene = scenes[activeSceneIdx] || { bg_color: '#1e1b4b', mobile_bg_color: '#1e1b4b', layers: [] };
    const allLayers = scene.layers || [];
    
    // Filtrar por visibilidad según el viewport
    const layers = allLayers.filter(l => {
        if (!l.display || l.display === 'both') return true;
        return l.display === viewport;
    });

    const activeLayer = activeLayerIdx !== null ? layers[activeLayerIdx] : null;

    // ── Mutadores de escena ─────────────────────────────────────────────────
    const updateScene = (patch) => {
        const isMobile = viewport === 'mobile';
        const finalPatch = { ...patch };

        // Redirección automática de propiedades globales si estamos en móvil
        if (isMobile) {
            if (patch.bg_color !== undefined) { finalPatch.mobile_bg_color = patch.bg_color; delete finalPatch.bg_color; }
            if (patch.border_type !== undefined) { finalPatch.mobile_border_type = patch.border_type; delete finalPatch.border_type; }
        }

        setScenes(prev => prev.map((s, i) => i === activeSceneIdx ? { ...s, ...finalPatch } : s));
    };

    const updateLayers = (newLayers) => {
        updateScene({ layers: newLayers });
    };

    // ── Mutadores de capa ───────────────────────────────────────────────────
    const updateLayer = (idx, patch) => {
        const layerToUpdate = layers[idx];
        if (!layerToUpdate) return;

        const isMobile = viewport === 'mobile';
        const finalPatch = { ...patch };

        // Si estamos en móvil, redirigimos x, y, scale, rotation a mx, my, ms, mr
        if (isMobile) {
            if (patch.x !== undefined) { finalPatch.mx = patch.x; delete finalPatch.x; }
            if (patch.y !== undefined) { finalPatch.my = patch.y; delete finalPatch.y; }
            if (patch.scale !== undefined) { finalPatch.ms = patch.scale; delete finalPatch.scale; }
            if (patch.rotation !== undefined) { finalPatch.mr = patch.rotation; delete finalPatch.rotation; }
            if (patch.fontSize !== undefined) { finalPatch.mf = patch.fontSize; delete finalPatch.fontSize; }
        }

        const nextAllLayers = allLayers.map(l => l.id === layerToUpdate.id ? { ...l, ...finalPatch } : l);
        updateScene({ layers: nextAllLayers });
    };

    const addLayer = (type, extra = {}) => {
        const base = { 
            id: Date.now(), 
            type, 
            display: 'both',
            // Desktop
            x: 50, y: 50, scale: 0.5, rotation: 0, fontSize: 48,
            // Mobile (inicialmente igual)
            mx: 50, my: 50, ms: 0.5, mr: 0, mf: 48,
            zIndex: allLayers.length + 1 
        };
        if (type === 'text') Object.assign(base, { content: 'Nuevo texto', color: '#ffffff' });
        const next = [...allLayers, { ...base, ...extra }];
        updateScene({ layers: next });
        
        // El nuevo índice en la lista filtrada
        setTimeout(() => {
            setActiveLayerIdx(layers.length);
        }, 0);
    };

    const removeLayer = (idx) => {
        const layerToRemove = layers[idx];
        if (!layerToRemove) return;
        updateScene({ layers: allLayers.filter(l => l.id !== layerToRemove.id) });
        setActiveLayerIdx(null);
    };

    const moveLayerZ = (idx, dir) => {
        const layer = layers[idx];
        if (!layer) return;
        
        let sorted = [...allLayers].sort((a, b) => a.zIndex - b.zIndex).map(l => ({...l}));
        const currentIndex = sorted.findIndex(l => l.id === layer.id);
        
        if (dir === 'up' && currentIndex < sorted.length - 1) {
            const temp = sorted[currentIndex].zIndex;
            sorted[currentIndex].zIndex = sorted[currentIndex + 1].zIndex;
            sorted[currentIndex + 1].zIndex = temp;
        } else if (dir === 'down' && currentIndex > 0) {
            const temp = sorted[currentIndex].zIndex;
            sorted[currentIndex].zIndex = sorted[currentIndex - 1].zIndex;
            sorted[currentIndex - 1].zIndex = temp;
        } else {
            return; // No se puede mover más
        }
        
        // Re-normalizar z-indices de 1 a N de forma segura
        sorted.sort((a, b) => a.zIndex - b.zIndex).forEach((l, i) => l.zIndex = i + 1);
        
        updateScene({ layers: sorted });
    };

    // ── Viewport móvil ──────────────────────────────────────────────────────
    const switchViewport = (vp) => {
        setViewport(vp);
        setActiveLayerIdx(null);
    };

    const toggleCustomMobile = () => {
        const isEnabling = !scene.custom_mobile;
        const patch = { custom_mobile: isEnabling };
        if (isEnabling && !scene.mobile_layers) {
            patch.mobile_layers = (scene.desktop_layers || []).map(l => ({ ...l }));
        }
        updateScene(patch);
    };

    const resetMobileFromDesktop = () => {
        updateScene({ mobile_layers: (scene.desktop_layers || []).map(l => ({ ...l })) });
    };

    // ── Escenas (modo multi) ────────────────────────────────────────────────
    const addScene = () => {
        const next = [...scenes, { id: Date.now(), bg_color: '#1e1b4b', desktop_layers: [], mobile_layers: null }];
        setScenes(next);
        setActiveSceneIdx(next.length - 1);
        setActiveLayerIdx(null);
    };

    const removeScene = (idx) => {
        if (scenes.length <= 1) return;
        const next = scenes.filter((_, i) => i !== idx);
        setScenes(next);
        setActiveSceneIdx(Math.max(0, idx - 1));
        setActiveLayerIdx(null);
    };

    const applyBgToAllScenes = () => {
        const { bg_color, mobile_bg_color, border_type, mobile_border_type } = scene;
        setScenes(prev => prev.map((s, i) => i === activeSceneIdx ? s : { ...s, bg_color, mobile_bg_color, border_type, mobile_border_type }));
    };

    const duplicateDesignToAllScenes = () => {
        const { bg_color, mobile_bg_color, border_type, mobile_border_type } = scene;
        const baseLayers = scene.layers || [];
        
        setScenes(prev => prev.map((s, i) => {
            if (i === activeSceneIdx) return s;
            const clonedLayers = baseLayers.map((l, j) => ({ ...l, id: Date.now() + Math.random() + j }));
            return { ...s, bg_color, mobile_bg_color, border_type, mobile_border_type, layers: clonedLayers };
        }));
    };

    // ── Drag (se conecta con el canvas vía canvasRef) ──────────────────────
    const startDrag = (e, idx) => {
        if (viewMode === 'preview') return;
        e.stopPropagation();
        setActiveLayerIdx(idx);
        
        const isMobile = viewport === 'mobile';
        const layer = layers[idx];
        const initX = isMobile ? (layer.mx ?? layer.x ?? 50) : (layer.x ?? 50);
        const initY = isMobile ? (layer.my ?? layer.y ?? 50) : (layer.y ?? 50);
        
        setDragging({ idx, startX: e.clientX, startY: e.clientY, initX, initY });
    };

    useEffect(() => {
        const onMove = (e) => {
            if (!dragging || !canvasRef.current) return;
            const rect = canvasRef.current.getBoundingClientRect();
            const dx = ((e.clientX - dragging.startX) / rect.width)  * 100;
            const dy = ((e.clientY - dragging.startY) / rect.height) * 100;
            updateLayer(dragging.idx, {
                x: Math.round(Math.max(0, Math.min(100, dragging.initX + dx))),
                y: Math.round(Math.max(0, Math.min(100, dragging.initY + dy)))
            });
        };
        const onUp = () => setDragging(null);
        if (dragging) { window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp); }
        return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    }, [dragging, layers]);

    // ── Serializar para onSave ──────────────────────────────────────────────
    const buildConfig = () => ({
        breakpoint,
        carousel_interval: carouselInterval,
        desktop_ratio: desktopRatio,
        mobile_ratio: mobileRatio,
        scenes
    });

    return {
        // Estado
        scenes, activeSceneIdx, activeLayerIdx, viewport, dragging, viewMode,
        scene, layers, activeLayer, canvasRef, breakpoint, allLayers,
        // Acciones
        setActiveSceneIdx, setActiveLayerIdx, setViewMode,
        switchViewport,
        updateScene, updateLayer, addLayer, removeLayer, moveLayerZ,
        addScene, removeScene, applyBgToAllScenes, duplicateDesignToAllScenes,
        carouselInterval, setCarouselInterval,
        desktopRatio, setDesktopRatio, mobileRatio, setMobileRatio,
        startDrag,
        buildConfig
    };
}
