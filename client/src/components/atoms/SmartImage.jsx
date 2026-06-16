import React from 'react';

/**
 * SmartImage Component
 * Core of the Non-Destructive Editing (NDE) architecture.
 * 
 * @param {string} src - The image source URL.
 * @param {Object} settings - NDE metadata:
 *   {
 *     x: number, // % offset X
 *     y: number, // % offset Y
 *     zoom: number, // scale factor
 *     canvas: {
 *       shape: string, // square, wide, original, circle
 *       radius: string, // none, sm, md, full
 *       aspectRatio: string, // e.g. "1/1", "16/9"
 *       bgColor: string // Hex color for the background
 *     }
 *   }
 * @param {boolean} isDragging - Whether the user is currently panning/zooming.
 */
const SmartImage = ({ src, settings, isDragging = false, className = "", style = {} }) => {
    const defaultSettings = {
        x: 0,
        y: 0,
        zoom: 1,
        canvas: {
            shape: 'original',
            radius: 'none',
            aspectRatio: 'auto',
            bgColor: '#ffffff'
        }
    };

    const s = { 
        x: settings?.x ?? 0, 
        y: settings?.y ?? 0, 
        zoom: settings?.zoom ?? 1,
        canvas: {
            shape: settings?.canvas?.shape || settings?.shape || 'original',
            radius: settings?.canvas?.radius || settings?.radius || 'none',
            aspectRatio: settings?.canvas?.aspectRatio || 'auto',
            bgColor: settings?.canvas?.bgColor || '#ffffff'
        }
    };

    const getResolvedSrc = (url) => {
        if (!url) return '';
        if (url.startsWith('http') || url.startsWith('blob:') || url.startsWith('data:')) return url;
        
        const baseApi = (import.meta.env.VITE_API_URL || '/api/v1').replace('/api/v1', '');
        
        if (url.startsWith('/static/')) return `${baseApi}${url}`;
        if (url.startsWith('static/')) return `${baseApi}/${url}`;
        if (url.startsWith('uploads/')) return `${baseApi}/static/${url}`;
        
        return `${baseApi}/static/${url.startsWith('/') ? url.slice(1) : url}`;
    };

    const resolvedSrc = getResolvedSrc(src);

    const c = s.canvas;

    // GOLDEN RULE: The Canvas (Container) owns the SHAPE and ASPECT RATIO
    const finalAspectRatio = c.aspectRatio && c.aspectRatio !== 'auto' ? c.aspectRatio : (
        c.shape === 'square' ? '1/1' : 
        c.shape === 'wide' ? '16/9' : 
        '1/1' // Safe fallback for Legacy/Original to prevent 0px height until edited
    );

    // Radius mapping
    const radiusMap = {
        'none': '0',
        'sm': '8px',
        'md': '24px',
        'full': '50%'
    };

    const canvasStyles = {
        position: 'relative',
        overflow: 'hidden',
        width: '100%',
        aspectRatio: finalAspectRatio,
        borderRadius: radiusMap[c.radius] || c.radius || '0',
        backgroundColor: c.bgColor || '#ffffff',
        display: 'block',
        ...style
    };

    const imageStyles = {
        position: 'absolute',
        top: '50%',
        left: '50%',
        width: '100%',
        height: '100%',
        objectFit: 'contain', // Standard base for NDE transforms
        // IMAGE RULE: No shapes, no borders, only transforms (Position/Scale)
        borderRadius: '0', 
        transform: `translate3d(-50%, -50%, 0) translate3d(${s.x}%, ${s.y}%, 0) scale(${s.zoom})`,
        transition: isDragging ? 'none' : 'transform 0.4s cubic-bezier(0.165, 0.84, 0.44, 1)',
        display: 'block',
        willChange: 'transform'
    };

    return (
        <div className={`smart-image-canvas ${className}`} style={canvasStyles}>
            {resolvedSrc && (
                <img 
                    src={resolvedSrc} 
                    alt="NDE Layer" 
                    style={imageStyles}
                    draggable="false"
                />
            )}
        </div>
    );
};

export default SmartImage;
