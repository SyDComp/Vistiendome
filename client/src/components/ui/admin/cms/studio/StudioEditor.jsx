import React, { useState, useEffect } from 'react';
import { Layers, Monitor, Settings } from 'lucide-react';
import { useStudioState } from './useStudioState';
import StudioHeader from './StudioHeader';
import StudioLayerPanel from './StudioLayerPanel';
import StudioCanvas from './StudioCanvas';
import StudioProperties from './StudioProperties';
import { useHasta } from '../../../../../hooks/useCorte';
import MediaGallery from "../../../../interface/admin/media/MediaGallery";
import LibraryPicker from "../../../../interface/admin/inventory/LibraryPicker";
import './StudioEditor.css';
import './estudio.css';

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
    const isDeviceMobile = useHasta('xl');
    const [activeMobileTab, setActiveMobileTab] = useState('canvas'); // 'layers' | 'canvas' | 'props'


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
                    const res = await fetch(`/api/v1/admin/catalog/skus?page_size=1000`);
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
        <div className="est est-pantalla">

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

            <div className="est-medio">

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
                <div className="est-barra-pie">
                    {[
                        { id: 'layers', icon: <Layers size={20} />, label: 'Capas' },
                        { id: 'canvas', icon: <Monitor size={20} />, label: 'Lienzo' },
                        { id: 'props', icon: <Settings size={20} />, label: 'Ajustes' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveMobileTab(tab.id)}
                            className={`est-pestana-movil${activeMobileTab === tab.id ? ' est-pestana-movil--activa' : ''}`}
                        >
                            {tab.icon}
                            {tab.label}
                        </button>
                    ))}
                </div>
            )}

            {/* Galería */}
            {showGallery && (
                <div className="est-visor">
                    <div className="est-visor-caja">
                        <MediaGallery 
                            isOpen 
                            onClose={() => setShowGallery(false)} 
                            selectionMode={true}
                            allowMultiple={false}
                            confirmButtonText="Seleccionar Imagen para Banner"
                            contextInfo="Seleccionando Imagen de Portada"
                            onSelect={assets => {
                                const a = Array.isArray(assets) ? assets[0] : assets;
                                // Guardamos asset_id (referencia robusta) + url (preview); el backend resuelve la url vigente al leer
                                addLayer('image', { url: a.url, asset_id: a.id ?? null });
                                setShowGallery(false);
                            }} 
                        />
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
                <div className="est-aviso-guardado">
                    {toastMsg}
                </div>
            )}

        </div>
    );
};

export default StudioEditor;
