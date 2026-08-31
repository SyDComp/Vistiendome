import React, { useState } from 'react';
import { getYoutubeVideoId } from '../../utils/youtube';

/**
 * Un video de YouTube que NO carga YouTube hasta que alguien lo quiere ver.
 *
 * Por qué: un `<iframe>` de YouTube descarga entre 600 KB y 1,5 MB de scripts
 * apenas se pinta la página, incluso si nadie aprieta play. La tienda entera
 * pesa 0,7 MB después de todo el trabajo de imágenes; un video la duplicaría o
 * peor, para algo que la mayoría no va a mirar.
 *
 * Lo que se muestra hasta el clic es la miniatura que sirve el propio YouTube
 * (unos 15-60 KB) con un botón de play. Al hacer clic recién aparece el iframe,
 * ya reproduciendo. Para quien mira, es lo mismo.
 *
 * Se usa `youtube-nocookie.com`: no deja cookies hasta que el video se abre.
 */

// maxres es 1280x720 pero NO existe para todos los videos: cuando falta,
// YouTube devuelve una imagen gris de 120x90 en vez de un 404. Por eso se
// comprueba el ancho al cargar y se cae a hqdefault, que siempre está.
const ANCHO_DE_MINIATURA_FALSA = 121;

const VideoYoutube = ({ url, titulo = 'Video', className = '' }) => {
    const id = getYoutubeVideoId(url);
    const [reproduciendo, setReproduciendo] = useState(false);
    const [miniatura, setMiniatura] = useState(id ? `https://i.ytimg.com/vi/${id}/maxresdefault.jpg` : null);

    if (!id) return null;

    if (reproduciendo) {
        return (
            <div className={`yt-marco ${className}`}>
                <iframe
                    src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`}
                    title={titulo}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                />
                <style>{ESTILOS}</style>
            </div>
        );
    }

    return (
        <div className={`yt-marco ${className}`}>
            <button type="button" className="yt-fachada" onClick={() => setReproduciendo(true)} aria-label={`Reproducir ${titulo}`}>
                <img
                    src={miniatura}
                    alt=""
                    loading="lazy"
                    onLoad={(e) => {
                        if (e.target.naturalWidth < ANCHO_DE_MINIATURA_FALSA) {
                            setMiniatura(`https://i.ytimg.com/vi/${id}/hqdefault.jpg`);
                        }
                    }}
                    onError={() => setMiniatura(`https://i.ytimg.com/vi/${id}/hqdefault.jpg`)}
                />
                <span className="yt-play" aria-hidden="true">
                    <svg viewBox="0 0 68 48" width="68" height="48">
                        <path d="M66.5 7.7a8 8 0 0 0-5.6-5.7C56 .7 34 .7 34 .7s-22 0-26.9 1.3a8 8 0 0 0-5.6 5.7A83 83 0 0 0 .5 24a83 83 0 0 0 1 16.3 8 8 0 0 0 5.6 5.7C12 47.3 34 47.3 34 47.3s22 0 26.9-1.3a8 8 0 0 0 5.6-5.7A83 83 0 0 0 67.5 24a83 83 0 0 0-1-16.3z" fill="#f00" />
                        <path d="M27 34V14l18 10z" fill="#fff" />
                    </svg>
                </span>
            </button>
            <style>{ESTILOS}</style>
        </div>
    );
};

const ESTILOS = `
    .yt-marco { position: relative; width: 100%; aspect-ratio: 16/9; border-radius: 14px; overflow: hidden; background: #000; }
    .yt-marco iframe { width: 100%; height: 100%; border: 0; display: block; }
    .yt-fachada { all: unset; display: block; width: 100%; height: 100%; cursor: pointer; position: relative; }
    .yt-fachada img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .yt-play {
        position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
        transition: opacity .2s;
    }
    .yt-play svg { filter: drop-shadow(0 2px 8px rgba(0,0,0,.4)); opacity: .92; }
    .yt-fachada:hover .yt-play svg, .yt-fachada:focus-visible .yt-play svg { opacity: 1; transform: scale(1.06); transition: transform .15s; }
    .yt-fachada:focus-visible { outline: 3px solid #8f0653; outline-offset: 2px; }
`;

export default VideoYoutube;
