import React, { useState, useEffect } from 'react';
import { Layers, Monitor, Settings } from 'lucide-react';
import { useStudioState } from './useStudioState';
import StudioHeader from './StudioHeader';
import StudioLayerPanel from './StudioLayerPanel';
import StudioCanvas from './StudioCanvas';
import StudioProperties from './StudioProperties';
import MediaGallery from "../../../../interface/admin/media/MediaGallery";
import LibraryPicker from "../../../../interface/admin/inventory/LibraryPicker";

/**
 * StudioEditor — Orquestador
 *
 * Props:
 *   isOpen    {boolean}
 *   onClose   {fn}
 *   data      {object}  la sección CMS completa
 *   onSave    {fn(data)}
 *   mode      {'single'|'multi'}  single=banner, multi=carrusel
 */
const StudioEditor = ({ isOpen, onClose, data, onSave, mode = 'single' }) => {
    const [showGallery, setShowGallery] = useState(false);
    const [showLibrary, setShowLibrary] = useState(false);
    const [allVariants, setAllVariants] = useState([]);
    const [loadingLibrary, setLoadingLibrary] = useState(false);
    const [toastMsg, setToastMsg] = useState('');
    const [isDeviceMobile, setIsDeviceMobile] = useState(window.innerWidth < 950);
    const [activeMobileTab, setActiveMobileTab] = useState('canvas'); // 'layers' | 'canvas' | 'props'

    useEffect(() => {
        const handleResize = () => setIsDeviceMobile(window.innerWidth < 950);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const showToast = (msg) => {
        setToastMsg(msg);
        setTimeout(() => setToastMsg(''), 2500);
    };

    const state = useStudioState({ data, mode });

    // Cargar catálogo de productos
    React.useEffect(() => {
        if (showLibrary && allVariants.length === 0) {
            const fetchVariants = async () => {
                setLoadingLibrary(true);
                try {
                    const res = await fetch(`${(window.location.origin.includes('localhost') ? 'http://localhost:8000' : '')}/api/v1/admin/catalog/skus?page_size=1000`);
                    const data = await res.json();
                    setAllVariants(data.items || []);
                } catch (err) {
                    console.error("Error al cargar catálogo:", err);
                } finally {
                    setLoadingLibrary(false);
                }
            };
            fetchVariants();
        }
    }, [showLibrary, allVariants.length]);
    const {
        scenes, activeSceneIdx, activeLayerIdx, viewport, dragging, viewMode,
        scene, layers, activeLayer, canvasRef, breakpoint,
        setActiveSceneIdx, setActiveLayerIdx, setViewMode, setBreakpoint,
        switchViewport, toggleCustomMobile, resetMobileFromDesktop,
        updateScene, updateLayer, addLayer, removeLayer, moveLayerZ,
        addScene, removeScene, applyBgToAllScenes, duplicateDesignToAllScenes,
        carouselInterval, setCarouselInterval,
        desktopRatio, setDesktopRatio, mobileRatio, setMobileRatio,
        startDrag, buildConfig
    } = state;

    if (!isOpen) return null;

    const handleSave = () => {
        onSave({ ...data, config: buildConfig() });
        onClose();
    };

    const blockTitles = {
        hero: 'Portada Principal',
        composition_carousel: 'Carrusel de Escenas',
        banner: 'Banner de Imagen',
    };

    return (
        <div style={{ position: 'fixed', inset: 0, height: '100dvh', width: '100dvw', zIndex: 5000, background: 'rgba(10,8,28,0.98)', backdropFilter: 'blur(15px)', display: 'flex', flexDirection: 'column', color: '#fff', fontFamily: 'Inter, sans-serif', animation: 'studioFadeIn 0.25s ease' }}>

            <StudioHeader
                blockTitle={blockTitles[data?.type] || data?.title}
                viewport={viewport}
                viewMode={viewMode}
                onViewportChange={switchViewport}
                onTogglePreview={() => setViewMode(v => v === 'edit' ? 'preview' : 'edit')}
                onSave={handleSave}
                onClose={onClose}
                isDeviceMobile={isDeviceMobile}
            />

            <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

                {(!isDeviceMobile || activeMobileTab === 'layers') && (
                    <StudioLayerPanel
                        layers={layers}
                        activeLayerIdx={activeLayerIdx}
                        bgColor={scene.bg_color || '#1e1b4b'}
                        viewport={viewport}
                        isDeviceMobile={isDeviceMobile}
                        onSelectLayer={(idx) => { 
                            setActiveLayerIdx(idx); 
                            if(isDeviceMobile) setActiveMobileTab('props'); 
                        }}
                        onRemoveLayer={(orig) => { removeLayer(orig); showToast('Capa eliminada'); }}
                        onBgColorChange={v => updateScene({ bg_color: v })}
                        onAddText={() => { addLayer('text'); if(isDeviceMobile) setActiveMobileTab('props'); }}
                        onAddFromGallery={() => setShowGallery(true)}
                        onAddFromCatalog={() => setShowLibrary(true)}
                    />
                )}

                {(!isDeviceMobile || activeMobileTab === 'canvas') && (
                    <StudioCanvas
                        canvasRef={canvasRef}
                        scene={scene}
                        layers={layers}
                        activeLayerIdx={activeLayerIdx}
                        dragging={dragging}
                        viewMode={viewMode}
                        viewport={viewport}
                        mode={mode}
                        scenes={scenes}
                        activeSceneIdx={activeSceneIdx}
                        onSelectLayer={(idx) => { 
                            setActiveLayerIdx(idx); 
                            if(isDeviceMobile) setActiveMobileTab('props'); 
                        }}
                        onDeselectLayer={() => setActiveLayerIdx(null)}
                        onStartDrag={startDrag}
                        onSelectScene={(i) => { setActiveSceneIdx(i); setActiveLayerIdx(null); }}
                        onAddScene={() => { addScene(); showToast('Nueva escena añadida'); }}
                        onRemoveScene={(i) => { removeScene(i); showToast('Escena eliminada'); }}
                        desktopRatio={desktopRatio}
                        mobileRatio={mobileRatio}
                    />
                )}

                {(!isDeviceMobile || activeMobileTab === 'props') && (
                    <StudioProperties
                        scene={scene}
                        activeLayer={activeLayer}
                        activeLayerIdx={activeLayerIdx}
                        bgColor={scene.bg_color || '#1e1b4b'}
                        breakpoint={breakpoint}
                        viewport={viewport}
                        mode={mode}
                        isDeviceMobile={isDeviceMobile}
                        carouselInterval={carouselInterval}
                        onUpdateCarouselInterval={setCarouselInterval}
                        desktopRatio={desktopRatio}
                        setDesktopRatio={setDesktopRatio}
                        mobileRatio={mobileRatio}
                        setMobileRatio={setMobileRatio}
                        onApplyBgToAllScenes={() => { applyBgToAllScenes(); showToast('Fondo aplicado a todo el carrusel'); }}
                        onDuplicateDesignToAllScenes={() => { duplicateDesignToAllScenes(); showToast('Diseño duplicado a todo el carrusel'); }}
                        onMoveLayerZ={moveLayerZ}
                        onUpdateLayer={(patch) => updateLayer(activeLayerIdx, patch)}
                        onUpdateScene={updateScene}
                        onUpdateBreakpoint={setBreakpoint}
                        onToggleCustomMobile={toggleCustomMobile}
                        onResetMobile={() => { resetMobileFromDesktop(); showToast('Capas de móvil restauradas'); }}
                        onRemoveLayer={() => { removeLayer(activeLayerIdx); showToast('Capa eliminada'); setActiveMobileTab('layers'); }}
                    />
                )}
            </div>

            {/* Barra de Navegación Inferior Móvil */}
            {isDeviceMobile && (
                <div style={{ display: 'flex', background: '#0a081c', borderTop: '1px solid rgba(255,255,255,0.05)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
                    {[
                        { id: 'layers', icon: <Layers size={20} />, label: 'Capas' },
                        { id: 'canvas', icon: <Monitor size={20} />, label: 'Lienzo' },
                        { id: 'props', icon: <Settings size={20} />, label: 'Ajustes' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveMobileTab(tab.id)}
                            style={{
                                flex: 1, padding: '16px 0', background: 'none', border: 'none',
                                color: activeMobileTab === tab.id ? '#8f0653' : 'rgba(255,255,255,0.4)',
                                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                                fontSize: '10px', fontWeight: '800', textTransform: 'uppercase',
                                cursor: 'pointer', transition: 'all 0.2s'
                            }}
                        >
                            {tab.icon}
                            {tab.label}
                        </button>
                    ))}
                </div>
            )}

            {/* Galería */}
            {showGallery && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 6000, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: '90%', height: '90%', background: '#fff', borderRadius: '28px', overflow: 'hidden' }}>
                        <MediaGallery isOpen onClose={() => setShowGallery(false)} onSelect={assets => {
                            const a = Array.isArray(assets) ? assets[0] : assets;
                            addLayer('image', { url: a.url });
                            setShowGallery(false);
                        }} />
                    </div>
                </div>
            )}

            {/* Catálogo */}
            {showLibrary && (
                <LibraryPicker 
                    isOpen 
                    onClose={() => setShowLibrary(false)} 
                    type="variants" 
                    title="Seleccionar Producto"
                    items={allVariants}
                    emptyMessage={loadingLibrary ? "Cargando catálogo..." : "No se encontraron elementos."}
                    onItemClick={v => {
                        addLayer('image', { url: v.image || v.image_url, link: `/catalogo/producto/${v.product_id}/${v.sku}` });
                        setShowLibrary(false);
                    }} 
                />
            )}

            {/* Toast de feedback */}
            {toastMsg && (
                <div style={{ position: 'fixed', bottom: '32px', left: '50%', transform: 'translateX(-50%)', zIndex: 9999, background: '#1cce8e', color: '#052b1d', padding: '12px 24px', borderRadius: '100px', fontSize: '11px', fontWeight: '900', boxShadow: '0 8px 30px rgba(28,206,142,0.3)', animation: 'studioSlideUp 0.3s ease', pointerEvents: 'none' }}>
                    {toastMsg}
                </div>
            )}

            <style>{`
                @keyframes studioFadeIn { from { opacity:0; } to { opacity:1; } }
                @keyframes studioSlideUp { from { opacity:0; transform:translate(-50%, 20px); } to { opacity:1; transform:translate(-50%, 0); } }
                input[type=range] { -webkit-appearance:none; background:rgba(255,255,255,0.1); height:3px; border-radius:2px; width:100%; cursor:pointer; }
                input[type=range]::-webkit-slider-thumb { -webkit-appearance:none; height:14px; width:14px; border-radius:50%; background:#8f0653; cursor:pointer; box-shadow:0 0 8px rgba(143,6,83,0.5); }
            `}</style>
        </div>
    );
};

export default StudioEditor;
