/**
 * Maneja el compartir un producto.
 * Intenta Web Share API nativa, fallback a clipboard.
 */
export const handleShare = async (productName) => {
    const shareUrl = window.location.href;
    const shareTitle = productName ? `${productName} — Vistiendomé` : 'Vistiendomé';
    const shareText = productName ? `Mira esta pieza: ${productName}` : 'Mira esta pieza de Vistiendomé';

    // Web Share API nativa (móviles)
    if (navigator.share) {
        try {
            await navigator.share({ title: shareTitle, text: shareText, url: shareUrl });
            return { shared: true, copied: false };
        } catch (err) {
            if (err.name === 'AbortError') return { shared: false, copied: false };
            // Fallthrough al fallback
        }
    }

    // Fallback: clipboard
    try {
        await navigator.clipboard.writeText(shareUrl);
        return { shared: false, copied: true };
    } catch {
        // Último recurso: textarea hack
        const textArea = document.createElement('textarea');
        textArea.value = shareUrl;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        return { shared: false, copied: true };
    }
};
