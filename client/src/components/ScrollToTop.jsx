import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export default function ScrollToTop() {
    const { pathname } = useLocation();

    useEffect(() => {
        // Use a tiny delay to ensure page has rendered and other effects closed
        const timeout = setTimeout(() => {
            window.scrollTo({
                top: 0,
                left: 0,
                behavior: 'instant' // Ensure it's not smooth but immediate
            });
        }, 10);

        return () => clearTimeout(timeout);
    }, [pathname]);

    return null;
}
