// Acepta watch?v=, youtu.be/, shorts/ y embed/ — cualquier link que Paola
// pegue tal cual desde el navegador o la app de YouTube.
const YOUTUBE_ID_PATTERN = /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;

export const getYoutubeVideoId = (url) => {
    if (!url) return null;
    const match = String(url).match(YOUTUBE_ID_PATTERN);
    return match ? match[1] : null;
};

export const getYoutubeEmbedUrl = (url) => {
    const id = getYoutubeVideoId(url);
    return id ? `https://www.youtube.com/embed/${id}` : null;
};
