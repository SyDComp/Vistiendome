import React, { useState } from 'react';
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
        updateScene, updateLayer, addLayer, removeLayer,
        addScene, removeScene,
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
        <div style={{ position: 'fixed', inset: 0, zIndex: 5000, background: 'rgba(10,8,28,0.98)', backdropFilter: 'blur(15px)', display: 'flex', flexDirection: 'column', color: '#fff', fontFamily: 'Inter, sans-serif', animation: 'studioFadeIn 0.25s ease' }}>

            <StudioHeader
                blockTitle={blockTitles[data?.type] || data?.title}
                viewport={viewport}
                viewMode={viewMode}
                onViewportChange={switchViewport}
                onTogglePreview={() => setViewMode(v => v === 'edit' ? 'preview' : 'edit')}
                onSave={handleSave}
                onClose={onClose}
            />

            <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

                <StudioLayerPanel
                    layers={layers}
                    activeLayerIdx={activeLayerIdx}
                    bgColor={scene.bg_color || '#1e1b4b'}
                    viewport={viewport}
                    onSelectLayer={setActiveLayerIdx}
                    onRemoveLayer={removeLayer}
                    onBgColorChange={v => updateScene({ bg_color: v })}
                    onAddText={() => addLayer('text')}
                    onAddFromGallery={() => setShowGallery(true)}
                    onAddFromCatalog={() => setShowLibrary(true)}
                />

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
                    onSelectLayer={setActiveLayerIdx}
                    onDeselectLayer={() => setActiveLayerIdx(null)}
                    onStartDrag={startDrag}
                    onSelectScene={(i) => { setActiveSceneIdx(i); setActiveLayerIdx(null); }}
                    onAddScene={addScene}
                />

                <StudioProperties
                    scene={scene}
                    activeLayer={activeLayer}
                    activeLayerIdx={activeLayerIdx}
                    bgColor={scene.bg_color || '#1e1b4b'}
                    breakpoint={breakpoint}
                    viewport={viewport}
                    onUpdateLayer={(patch) => updateLayer(activeLayerIdx, patch)}
                    onUpdateScene={updateScene}
                    onUpdateBreakpoint={setBreakpoint}
                    onToggleCustomMobile={toggleCustomMobile}
                    onResetMobile={resetMobileFromDesktop}
                    onRemoveLayer={() => removeLayer(activeLayerIdx)}
                />
            </div>

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

            <style>{`
                @keyframes studioFadeIn { from { opacity:0; } to { opacity:1; } }
                input[type=range] { -webkit-appearance:none; background:rgba(255,255,255,0.1); height:3px; border-radius:2px; width:100%; cursor:pointer; }
                input[type=range]::-webkit-slider-thumb { -webkit-appearance:none; height:14px; width:14px; border-radius:50%; background:#8f0653; cursor:pointer; box-shadow:0 0 8px rgba(143,6,83,0.5); }
            `}</style>
        </div>
    );
};

export default StudioEditor;
