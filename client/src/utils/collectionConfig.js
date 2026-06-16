export const COLLECTION_IMAGES = {
    'mobiliario': {
        image: 'https://images.unsplash.com/photo-1592078615290-033ee584e267?q=80&w=2564&auto=format&fit=crop',
        title: 'Mobiliario'
    },
    'decoracion': {
        image: 'https://images.unsplash.com/photo-1578500494198-246f612d3b3d?q=80&w=2670&auto=format&fit=crop',
        title: 'Decoración'
    },
    'textil': {
        image: 'https://images.unsplash.com/photo-1505691938895-1758d7feb511?q=80&w=2564&auto=format&fit=crop',
        title: 'Textil' // Mapping "Accesorios" or similar to Textil if needed, or update API based on slug
    },
    'ceramica': {
        image: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4f9d?q=80&w=2670&auto=format&fit=crop', // Example ceramic image
        title: 'Cerámica'
    },
    'pintura': {
        image: 'https://images.unsplash.com/photo-1579783902614-a3fb39279c0f?q=80&w=2680&auto=format&fit=crop', // Example painting image
        title: 'Pintura'
    },
    'madera': {
        image: 'https://images.unsplash.com/photo-1611486212557-88be5ff6f941?q=80&w=2601&auto=format&fit=crop',
        title: 'Madera'
    }
};

export const getCollectionImage = (slug) => {
    return COLLECTION_IMAGES[slug.toLowerCase()]?.image || 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?q=80&w=2670&auto=format&fit=crop'; // Default fallback
};
