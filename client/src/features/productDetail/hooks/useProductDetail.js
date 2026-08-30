import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { getProductBySlug, getImageUrl, getSrcSet } from '../../../lib/api/endpoints/index.js';
import useMediaQuery from '../../../hooks/useMediaQuery.js';
import useScrollLock from '../../../hooks/useScrollLock.js';

const VALOR_NA = 'No aplica';

const memoryCache = new Map();
const FRESHNESS_TTL = 60 * 1000; // 1 minuto de frescura absoluta (no repite API call)

export const useProductDetail = (initialProduct) => {
    const { slug, sku: variantSkuCode, collectionSlug, imgIndex } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const fromSearch = searchParams.get('from_search');

    const [producto, setProducto] = useState(initialProduct || null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selections, setSelections] = useState({});
    const [showShareToast, setShowShareToast] = useState(false);
    const [showBarcode, setShowBarcode] = useState(false);

    const isMobile = useMediaQuery('(max-width: 1023px)');
    useScrollLock(true);

    const lastUrlSku = useRef(variantSkuCode);

    // Fetching con Stale-While-Revalidate
    useEffect(() => {
        const cargarDetalle = async () => {
            const targetSlug = slug || initialProduct?.slug;
            if (!targetSlug) return;
            
            const cached = memoryCache.get(targetSlug);
            const isFresh = cached && (Date.now() - cached.timestamp < FRESHNESS_TTL);

            // 1. Carga instantánea desde caché si existe
            if (cached) {
                setProducto(cached.data);
                setLoading(false);
                if (isFresh) return; // Si es súper reciente, ni siquiera disparamos el fetch de fondo
            } else {
                setLoading(true);
            }

            // 2. Fetch silencioso en segundo plano para actualizar precios/stock
            try {
                const fullData = await getProductBySlug(targetSlug);
                memoryCache.set(targetSlug, { data: fullData, timestamp: Date.now() });
                setProducto(fullData);
            } catch (err) {
                console.error('Error cargando detalle:', err);
                if (!initialProduct && !cached) setError('No se pudo cargar la información del producto.');
            } finally {
                setLoading(false);
            }
        };
        cargarDetalle();
    }, [initialProduct, slug]);

    // Reset selections cuando cambia el slug
    useEffect(() => {
        setSelections({});
    }, [slug]);

    // Navegación de salida
    const handleClose = useCallback(() => {
        if (location.state?.backgroundLocation) {
            navigate(-1);
            return;
        }
        if (fromSearch) {
            navigate(`/search?q=${encodeURIComponent(fromSearch)}`);
            return;
        }
        if (collectionSlug) {
            navigate(`/coleccion/${collectionSlug}`);
            return;
        }
        navigate('/catalogo');
    }, [location.state, fromSearch, collectionSlug, navigate]);

    // Keys maestras de configuración de SKUs
    const llavesMaestras = useMemo(() => {
        if (!producto?.skus) return [];
        const keys = new Set();
        producto.skus.forEach(s => {
            Object.keys(s.config || {}).forEach(k => keys.add(k));
        });
        const priority = ['talla', 'color'];
        return Array.from(keys).sort((a, b) => {
            const idxA = priority.indexOf(a.toLowerCase());
            const idxB = priority.indexOf(b.toLowerCase());
            if (idxA !== -1 && idxB !== -1) return idxA - idxB;
            if (idxA !== -1) return -1;
            if (idxB !== -1) return 1;
            return a.localeCompare(b);
        });
    }, [producto]);

    // SKUs normalizados con VALOR_NA para atributos faltantes
    const skusNormalizados = useMemo(() => {
        if (!producto?.skus) return [];
        return producto.skus.map(s => {
            const newConfig = { ...s.config };
            llavesMaestras.forEach(k => {
                if (!(k in newConfig)) newConfig[k] = VALOR_NA;
            });
            return { ...s, config: newConfig };
        });
    }, [producto, llavesMaestras]);

    // Configuración de atributos para el selector
    const configAtributos = useMemo(() => {
        const attrs = llavesMaestras.map(key => {
            const isColor = key.toLowerCase() === 'color';
            const opcionesRaw = [...new Set(skusNormalizados.map(s => s.config?.[key]))];
            const opcionesReales = opcionesRaw.filter(o => o !== VALOR_NA);
            const opcionesAProcesar = opcionesReales.length > 0 ? opcionesReales : [VALOR_NA];

            const opcionesConMetadata = opcionesAProcesar.map(opc => {
                let thumb = null;
                let thumbSrcSet = '';
                if (isColor && opc !== VALOR_NA) {
                    const representativeSku = skusNormalizados.find(
                        s => s.config[key] === opc && s.image_urls?.length > 0
                    );
                    if (representativeSku) {
                        thumb = getImageUrl(representativeSku.image_urls[0]);
                        // Una muestra de color mide ~40 px: sin esto bajaba la
                        // foto completa de ~500 KB, 17 veces en la misma ficha.
                        thumbSrcSet = getSrcSet(representativeSku.image_srcsets?.[0] || '');
                    }
                }
                return { valor: opc, thumb, thumbSrcSet };
            }).sort((a, b) => {
                if (a.valor === VALOR_NA) return 1;
                if (b.valor === VALOR_NA) return -1;
                return a.valor.localeCompare(b.valor);
            });

            return {
                id: key,
                etiqueta: key.charAt(0).toUpperCase() + key.slice(1).toLowerCase(),
                opciones: opcionesConMetadata,
                type: isColor ? 'visual' : 'text',
            };
        }).filter(attr => {
            if (attr.opciones.length === 1 && attr.opciones[0].valor === VALOR_NA) return false;
            return true;
        });

        // Ordenar: primero los seleccionables (>1 opción), luego los de solo lectura
        return attrs.sort((a, b) => {
            const aSelectable = a.opciones.length > 1 ? 0 : 1;
            const bSelectable = b.opciones.length > 1 ? 0 : 1;
            return aSelectable - bSelectable;
        });
    }, [llavesMaestras, skusNormalizados]);

    // SKU que corresponde a las selecciones actuales
    const skuActual = useMemo(() => {
        if (!skusNormalizados || Object.keys(selections).length === 0) return null;
        return skusNormalizados.find(s => {
            return Object.entries(selections).every(([key, val]) => s.config?.[key] === val);
        });
    }, [skusNormalizados, selections]);

    const precioFinal = skuActual ? skuActual.price : (producto?.skus?.[0]?.price || 0);

    // Inicialización de selecciones y sync de URL
    useEffect(() => {
        if (!configAtributos.length || !skusNormalizados.length) return;

        if (Object.keys(selections).length === 0) {
            // Preselección que viene del explorador: si la clienta filtró por
            // talla 12, el detalle abre en talla 12 y no en la que le tocó
            // representar al look. Sólo se aplica si existe un SKU con esa
            // combinación, para no dejar la ficha en un estado imposible.
            const pre = location.state?.preseleccion;
            const conPreseleccion = (base) => {
                if (!pre || !Object.keys(pre).length) return base;
                const tentativa = { ...base, ...pre };
                const existe = skusNormalizados.some(s =>
                    Object.entries(tentativa).every(([k, v]) =>
                        String(s.config?.[k] ?? '').toLowerCase().trim() === String(v).toLowerCase().trim()
                    )
                );
                return existe ? tentativa : base;
            };

            // Inicializar desde URL sku
            if (variantSkuCode) {
                lastUrlSku.current = variantSkuCode;
                const urlMatch = skusNormalizados.find(s => s.sku === variantSkuCode);
                if (urlMatch) {
                    setSelections(conPreseleccion({ ...urlMatch.config }));
                    return;
                }
            }
            // Fallback: matching por imagen de portada
            const getFileName = (path) => path?.split(/[?#]/)[0].split(/[\\/]/).pop()?.toLowerCase();
            const coverImage = producto?.image;
            const coverFileName = getFileName(coverImage);
            const matchingSku = coverImage
                ? skusNormalizados.find(s => s.image_urls?.some(url => getFileName(url) === coverFileName))
                : null;
            if (matchingSku) {
                setSelections({ ...matchingSku.config });
            } else {
                const fallback = {};
                configAtributos.forEach(attr => {
                    const bestOption = attr.opciones.find(o => o.valor !== VALOR_NA) || attr.opciones[0];
                    fallback[attr.id] = bestOption.valor;
                });
                setSelections(fallback);
            }
            return;
        }

        // Si cambió el SKU en la URL (navegación externa)
        if (variantSkuCode !== lastUrlSku.current) {
            lastUrlSku.current = variantSkuCode;
            const urlMatch = skusNormalizados.find(s => s.sku === variantSkuCode);
            if (urlMatch) setSelections({ ...urlMatch.config });
            return;
        }

        // Sync URL cuando cambia la selección
        if (skuActual && skuActual.sku !== variantSkuCode) {
            lastUrlSku.current = skuActual.sku;
            const targetUrl = collectionSlug
                ? `/coleccion/${collectionSlug}/producto/${producto?.slug || slug}/${skuActual.sku}`
                : `/catalogo/producto/${producto?.slug || slug}/${skuActual.sku}`;
            navigate(targetUrl, { replace: true, state: location.state });
        }
    }, [configAtributos, skusNormalizados, variantSkuCode, skuActual, slug, navigate, location.state, producto, collectionSlug]);

    const checkOptionReachability = useCallback((attrId, value) => {
        return skusNormalizados.some(s => {
            if (s.config[attrId] !== value) return false;
            return Object.entries(selections).every(([k, v]) => {
                if (k === attrId) return true;
                return s.config[k] === v;
            });
        });
    }, [skusNormalizados, selections]);

    const handleJumpToSKU = useCallback((config) => {
        setSelections(prev => {
            const next = { ...prev };
            Object.entries(config).forEach(([k, v]) => { next[k] = v; });
            return next;
        });
    }, []);

    const handleOptionChange = useCallback((attrId, value) => {
        setSelections(prev => {
            const currentSelections = { ...prev, [attrId]: value };
            const matches = skusNormalizados.filter(s => s.config[attrId] === value);
            if (matches.length > 0) {
                const exactMatch = matches.find(s =>
                    Object.entries(currentSelections).every(([k, v]) => s.config[k] === v)
                );
                if (!exactMatch) {
                    let bestMatch = matches[0];
                    let maxCoincidencias = -1;
                    matches.forEach(s => {
                        let coincidencias = 0;
                        Object.entries(currentSelections).forEach(([k, v]) => {
                            if (s.config[k] === v) coincidencias++;
                        });
                        if (coincidencias > maxCoincidencias) {
                            maxCoincidencias = coincidencias;
                            bestMatch = s;
                        }
                    });
                    const finalSelections = { ...currentSelections };
                    llavesMaestras.forEach(k => { finalSelections[k] = bestMatch.config[k]; });
                    return finalSelections;
                }
            }
            return currentSelections;
        });
    }, [skusNormalizados, llavesMaestras]);

    return {
        producto,
        loading,
        error,
        selections,
        setSelections,
        skuActual,
        configAtributos,
        llavesMaestras,
        skusNormalizados,
        isMobile,
        precioFinal,
        handleOptionChange,
        handleJumpToSKU,
        checkOptionReachability,
        handleClose,
        showShareToast,
        setShowShareToast,
        showBarcode,
        setShowBarcode,
        imgIndex,
        collectionSlug,
        slug,
        VALOR_NA,
    };
};

export default useProductDetail;
