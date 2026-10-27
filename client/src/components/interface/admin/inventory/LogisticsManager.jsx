import React, { useState, useEffect, useCallback, useMemo } from 'react';
import SectionHeader from '../../../ui/admin/SectionHeader';
import DataTable from '../../../ui/admin/DataTable';
import RowActions from '../../../ui/admin/RowActions';
import PanelLateral from '../../../ui/PanelLateral';
import { useNotification } from '../../../../context/NotificationContext';
import { History, ArrowLeftRight } from 'lucide-react';
import FilterBar from '../../../ui/admin/FilterBar';
import { getSaldosKardex, getHistorialKardex } from '../../../../lib/api/endpoints';
import HistorialKardex from './kardex/HistorialKardex';
import { textoDisponible } from './kardex/apartado';
import MovimientoModal from './kardex/MovimientoModal';
import PiezasUnicas from './kardex/PiezasUnicas';
import FiltroExistencias from './kardex/lote/FiltroExistencias';
import BarraSeleccion from './kardex/lote/BarraSeleccion';
import MovimientoEnBloque from './kardex/lote/MovimientoEnBloque';
import useSeleccion from './kardex/lote/useSeleccion';
import { cumpleExistencia, umbralValido, ordenar, siguienteOrden } from './kardex/lote/existencias';

/** Un encabezado que ordena la tabla al tocarlo: ascendente, descendente, sin orden. */
const Ordenable = ({ columna, nombre, orden, onOrden }) => (
    <button type="button" onClick={() => onOrden(siguienteOrden(orden, columna))} className="lote-ordenable"
        aria-label={`Ordenar por ${nombre}`}>
        {nombre}{orden?.columna === columna ? (orden.sentido === 'asc' ? ' ↑' : ' ↓') : ''}
    </button>
);

const LogisticsManager = () => {
    const { toast } = useNotification();
    const [balances, setBalances] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    // Filtros por atributo de variante (Talla, Color, etc.), independientes
    // del buscador de texto. { nombreDelAtributo: valorElegido }
    const [activeFilters, setActiveFilters] = useState({});

    // El historial que se está mirando, y la variante a la que se le registra
    // un movimiento. null = cerrado.
    const [historial, setHistorial] = useState(null);
    const [varianteAMover, setVarianteAMover] = useState(null);

    // Por existencias (mira "disponible"), el orden de la tabla, y las elegidas
    // para un movimiento en bloque (docs/diseno/bodega_en_bloque.md).
    const [filtroExistencia, setFiltroExistencia] = useState('todas');
    const [umbralTexto, setUmbralTexto] = useState('');
    const [orden, setOrden] = useState(null);
    const { elegidas, alternar, alternarTodas, limpiar } = useSeleccion();
    const [moviendoLote, setMoviendoLote] = useState(false);

    const fetchBalances = useCallback(async () => {
        setLoading(true);
        try {
            setBalances(await getSaldosKardex());
        } catch (err) {
            console.error(err);
            toast.error('No se pudo conectar con el servidor de inventario.');
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => { fetchBalances(); }, [fetchBalances]);

    // Se pide cada vez que se abre: así trae los movimientos recién hechos.
    const abrirHistorial = async (skuId) => {
        try {
            setHistorial(await getHistorialKardex(skuId));
        } catch (err) {
            toast.error(err.message || 'No se pudo cargar el historial de la variante.');
        }
    };

    const alRegistrar = () => {
        toast.success('Movimiento registrado');
        setVarianteAMover(null);
        fetchBalances();
    };

    // Los atributos de variante (Talla, Color...) que hay HOY entre los saldos
    // cargados, con sus valores distintos. Se derivan en el cliente porque acá
    // ya se cargó todo de una vez (`GET /kardex` sin paginar): no hace falta
    // pedirle nada nuevo al servidor.
    const filtrosDeAtributos = useMemo(() => {
        const porClave = new Map();
        for (const b of balances) {
            for (const [clave, valor] of Object.entries(b.config || {})) {
                if (valor === null || valor === undefined || valor === '') continue;
                if (!porClave.has(clave)) porClave.set(clave, new Set());
                porClave.get(clave).add(String(valor));
            }
        }
        return Array.from(porClave.entries()).map(([clave, valores]) => ({
            key: clave,
            label: clave,
            options: Array.from(valores).sort().map(v => ({ value: v, label: v })),
        }));
    }, [balances]);

    const handleFilterChange = (updated) => setActiveFilters(updated);

    const alRegistrarLote = (r) => {
        toast.success(`${r.movimientos} movimiento${r.movimientos !== 1 ? 's' : ''} registrado${r.movimientos !== 1 ? 's' : ''}`);
        setMoviendoLote(false);
        limpiar();
        fetchBalances();
    };

    const umbral = umbralValido(umbralTexto);
    const filteredBalances = ordenar(balances.filter(b => cumpleExistencia(b, filtroExistencia, umbral)).filter(b => {
        // El buscador de texto miraba solo el SKU y el nombre del producto.
        // Con 1049 variantes, buscar "coral" o "3xl" -que es lo que se ve en
        // la columna Variante- no encontraba nada: no es que no funcionara,
        // es que no miraba donde el QA esperaba que mirara.
        const termino = searchTerm.toLowerCase();
        const enSkuONombre = b.sku.toLowerCase().includes(termino) ||
            b.product_name.toLowerCase().includes(termino);
        const enVariante = Object.values(b.config || {}).some(v =>
            String(v).toLowerCase().includes(termino)
        );
        if (termino && !enSkuONombre && !enVariante) return false;

        return Object.entries(activeFilters).every(([clave, valor]) => {
            if (!valor) return true;
            return String(b.config?.[clave] ?? '') === valor;
        });
    }), orden);

    const idsVisibles = filteredBalances.map(b => b.sku_id);
    const todasVisiblesElegidas = idsVisibles.length > 0 && idsVisibles.every(id => elegidas.has(id));

    const LOGISTICS_COLUMNS = [
        {
            key: 'sku_id',
            label: (
                <input type="checkbox" className="adm-casilla" checked={todasVisiblesElegidas}
                    onChange={() => alternarTodas(idsVisibles)}
                    aria-label={`Elegir las ${idsVisibles.length} filtradas`} title={`Elegir las ${idsVisibles.length} filtradas`} />
            ),
            width: '44px',
            align: 'center',
            render: (id, row) => (
                <input type="checkbox" className="adm-casilla" checked={elegidas.has(id)}
                    onChange={() => alternar(id)} aria-label={`Elegir ${row.sku}`} />
            ),
        },
        { 
            key: 'product_name', 
            label: 'Producto / SKU', 
            render: (v, row) => (
                <div className="logistics-product-wrapper">
                    <span className="logistics-product-name">{v}</span>
                    <span className="logistics-product-sku">{row.sku}</span>
                </div>
            )
        },
        { 
            key: 'config', 
            label: 'Variante', 
            render: (v) => (
                <div className="logistics-config-wrapper">
                    {Object.entries(v).map(([key, val]) => (
                        <span key={key} className="logistics-config-tag">
                            {val}
                        </span>
                    ))}
                </div>
            ) 
        },
        {
            // Lo que hay físicamente, apartado o no.
            key: 'current_stock',
            label: <Ordenable columna="current_stock" nombre="En bodega" orden={orden} onOrden={setOrden} />,
            width: '110px',
            align: 'center',
            render: (v) => <span className="logistics-stock-cifra">{v}</span>
        },
        {
            // Lo que piden los pedidos confirmados (ver core/pedidos/ciclo/).
            key: 'apartado',
            label: <Ordenable columna="apartado" nombre="Apartado" orden={orden} onOrden={setOrden} />,
            width: '110px',
            align: 'center',
            render: (v) => <span className="logistics-stock-cifra">{v || '—'}</span>
        },
        {
            key: 'disponible',
            label: <Ordenable columna="disponible" nombre="Disponible" orden={orden} onOrden={setOrden} />,
            width: '140px',
            align: 'center',
            render: (v) => {
                const { texto, tono } = textoDisponible(v);
                return <span className={`logistics-stock-badge ${tono}`}>{texto}</span>;
            }
        }
    ];

    return (
        <div className="logistics-manager-layout">
            <SectionHeader 
                title="Gestión de Bodega (Kardex)"
                description="Control de inventario basado en eventos. Todos los movimientos son inmutables y trazables."
            />

            {/* Arriba de la tabla: abajo de mil variantes nadie la encontraría. */}
            <PiezasUnicas />

            <FilterBar
                searchPlaceholder="Buscar por SKU, producto, talla, color..."
                onSearchChange={setSearchTerm}
                filters={filtrosDeAtributos}
                activeFilters={activeFilters}
                onFilterChange={handleFilterChange}
            />

            <FiltroExistencias
                filtro={filtroExistencia}
                onFiltro={setFiltroExistencia}
                umbral={umbralTexto}
                onUmbral={setUmbralTexto}
            />

            <DataTable 
                columns={LOGISTICS_COLUMNS}
                data={filteredBalances}
                isLoading={loading}
                emptyMessage="No hay productos registrados en el inventario."
                rowActions={(row) => (
                    <div className="logistics-actions-row">
                        <button 
                            onClick={() => abrirHistorial(row.sku_id)}
                            title="Ver Historial (Kardex)"
                            className="logistics-action-btn history"
                        >
                            <History size={16} color="#64748b" />
                        </button>
                        <button 
                            onClick={() => setVarianteAMover(row)}
                            title="Registrar Movimiento"
                            className="logistics-action-btn adjust"
                        >
                            <ArrowLeftRight size={16} color="#8f0653" />
                        </button>
                    </div>
                )}
            />

            <BarraSeleccion cuantas={elegidas.size} onMover={() => setMoviendoLote(true)} onQuitar={limpiar} />

            {moviendoLote && (
                <MovimientoEnBloque
                    filas={balances.filter(b => elegidas.has(b.sku_id))}
                    onCerrar={() => setMoviendoLote(false)}
                    onRegistrado={alRegistrarLote}
                    onRecargar={fetchBalances}
                />
            )}

            {varianteAMover && (
                <MovimientoModal
                    variante={varianteAMover}
                    onCerrar={() => setVarianteAMover(null)}
                    onRegistrado={alRegistrar}
                />
            )}

            <PanelLateral
                abierto={Boolean(historial)}
                onCerrar={() => setHistorial(null)}
                titulo={historial ? `Kardex: ${historial.sku}` : ''}
                subtitulo="Movimientos de la variante, del más reciente al más antiguo"
            >
                {historial && <HistorialKardex datos={historial} />}
            </PanelLateral>
        </div>
    );
};

export default LogisticsManager;
