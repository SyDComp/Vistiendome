import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Mail, Phone, MapPin, Building2, User, Package } from 'lucide-react';

const PrintLabel = () => {
    const { id } = useParams();
    const [cotizacion, setCotizacion] = useState(null);
    const [cliente, setCliente] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [cotiRes, cliRes] = await Promise.all([
                    fetch(`/api/v1/crm/`),
                    fetch(`/api/v1/crm/clientes`)
                ]);
                
                if (cotiRes.ok && cliRes.ok) {
                    const cotizacionesData = await cotiRes.json();
                    const clientesData = await cliRes.json();
                    
                    const currentCoti = cotizacionesData.find(c => c.id === id);
                    if (currentCoti) {
                        setCotizacion(currentCoti);
                        const matchingClient = clientesData.find(cli => cli.id === currentCoti.persona_id);
                        if (matchingClient) {
                            setCliente(matchingClient);
                        }
                    }
                }
            } catch (error) {
                console.error("Error cargando etiqueta", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [id]);

    if (loading) return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontFamily: 'system-ui, sans-serif' }}>
            <div style={{ textAlign: 'center' }}>
                <div style={{ border: '4px solid #f3f3f3', borderTop: '4px solid #000', borderRadius: '50%', width: '40px', height: '40px', animation: 'spin 1s linear infinite', margin: '0 auto 20px auto' }}></div>
                <h2 style={{ fontWeight: 600, color: '#333' }}>Generando Etiqueta...</h2>
            </div>
            <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        </div>
    );
    
    if (!cotizacion) return <div style={{ padding: '40px', fontFamily: 'system-ui, sans-serif', textAlign: 'center', color: '#dc2626', fontWeight: '600' }}>Cotización no encontrada. Verifique el ID.</div>;

    const nombreCompleto = cliente ? `${cliente.nombres || ''} ${cliente.apellidos || ''}`.trim() : 'Sin Nombre';
    
    let transporte = cotizacion.transporte || 'NO ESPECIFICADO';
    let region = cotizacion.region || '';
    let comuna = cotizacion.comuna || '';
    let direccion = cotizacion.direccion || 'RETIRO EN SUCURSAL / POR CONFIRMAR';
    let tipoDespacho = cotizacion.tipo_despacho || 'NO ESPECIFICADO';

    return (
        <div className="modern-print-wrapper">
            {/* ETIQUETA REAL */}
            <div className="shipping-label-card">
                
                {/* BRAND HEADER CLEAN */}
                <div className="brand-clean-header">
                    <h1 className="brand-title">VISTIÉNDOME CHILE</h1>
                    <p className="brand-subtitle">TIENDA DE MODA CRISTIANA</p>
                </div>

                <div className="label-body">
                    {/* DESTINATARIO INFO */}
                    <div className="info-block main-recipient-block">
                        <div className="block-title">DESTINATARIO</div>
                        <h2 className="recipient-name">{nombreCompleto.toUpperCase()}</h2>
                        
                        <div className="contact-grid">
                            {cliente?.rut && (
                                <div className="contact-item">
                                    <User size={14} className="icon"/> <strong>RUT:</strong> {cliente.rut}
                                </div>
                            )}
                            {cliente?.telefono && (
                                <div className="contact-item">
                                    <Phone size={14} className="icon"/> <strong>TEL:</strong> {cliente.telefono}
                                </div>
                            )}
                            {cliente?.email_personal && (
                                <div className="contact-item full-width">
                                    <Mail size={14} className="icon"/> {cliente.email_personal}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* METHOD AND ADDRESS INFO */}
                    <div className="info-block address-block">
                        <div className="block-title">INFORMACIÓN DE DESPACHO</div>
                        
                        {/* MÉTODO DE ENVÍO */}
                        <div className="shipping-method-banner">
                            <Package size={20} />
                            <div className="shipping-method-text">
                                <span className="method-label">TRANSPORTE:</span>
                                <strong>{transporte.toUpperCase()}</strong>
                                <span className="method-divider">•</span>
                                <span className="method-label">TIPO:</span>
                                <strong>{tipoDespacho === 'SUCURSAL' ? 'A SUCURSAL' : 'A DOMICILIO'}</strong>
                            </div>
                        </div>

                        {/* DIRECCIÓN */}
                        <div className="address-container">
                            <span className="address-subtitle">DIRECCIÓN:</span>
                            <p className="main-address">{direccion.toUpperCase()}</p>
                            
                            <div className="city-region-box">
                                <div className="box-section">
                                    <span className="small-label">COMUNA</span>
                                    <span className="big-value">{comuna.toUpperCase() || '-------------'}</span>
                                </div>
                                <div className="box-divider"></div>
                                <div className="box-section">
                                    <span className="small-label">REGIÓN</span>
                                    <span className="big-value">{region.toUpperCase() || '-------------'}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>

            <style>{`
                /* IMPORT FONT FOR ELEGANT LOOK */
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

                /* RESET & BASE */
                :root {
                    --print-black: #000000;
                    --print-gray: #4b5563;
                    --print-light: #e5e7eb;
                    --print-white: #ffffff;
                }

                * { box-sizing: border-box; }

                body {
                    background-color: #f1f5f9;
                    margin: 0;
                    padding: 0;
                    font-family: 'Inter', system-ui, -apple-system, sans-serif;
                }

                /* PRINT MEDIA QUERIES */
                @media print {
                    @page { margin: 0; size: auto; }
                    body { background-color: var(--print-white); }
                    .no-print { display: none !important; }
                    
                    .modern-print-wrapper {
                        padding: 0 !important;
                        margin: 0 !important;
                        min-height: auto !important;
                        display: block !important;
                    }
                    
                    .shipping-label-card {
                        box-shadow: none !important;
                        border: none !important;
                        border-radius: 0 !important;
                        width: 100% !important;
                        max-width: 100% !important;
                        margin: 0 !important;
                        padding: 5mm !important;
                        page-break-inside: avoid;
                    }
                }

                /* SCREEN WRAPPER */
                .modern-print-wrapper {
                    min-height: 100vh;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    padding: 40px 20px;
                }

                .print-helper {
                    background: #1e293b;
                    color: white;
                    padding: 20px 30px;
                    border-radius: 12px;
                    margin-bottom: 40px;
                    max-width: 600px;
                    width: 100%;
                    box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1);
                }

                .print-badge {
                    background: #3b82f6;
                    color: white;
                    font-size: 11px;
                    font-weight: 800;
                    padding: 4px 10px;
                    border-radius: 20px;
                    letter-spacing: 1px;
                }

                .print-helper h3 { margin: 15px 0 5px 0; font-size: 20px; }
                .print-helper p { margin: 0; color: #cbd5e1; font-size: 14px; line-height: 1.5; }

                /* THE LABEL ITSELF */
                .shipping-label-card {
                    background: var(--print-white);
                    width: 100%;
                    max-width: 600px;
                    border: 2px solid var(--print-black);
                    border-radius: 8px;
                    overflow: hidden;
                    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
                    color: var(--print-black);
                }

                /* CLEAN BRAND HEADER (NO BLACK BOX) */
                .brand-clean-header {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 30px 20px 20px 20px;
                    text-align: center;
                    border-bottom: 3px solid var(--print-black);
                }

                .brand-title {
                    font-size: 34px;
                    font-weight: 900;
                    letter-spacing: 1.5px;
                    margin: 0 0 6px 0;
                    line-height: 1;
                    color: var(--print-black);
                }

                .brand-subtitle {
                    font-size: 14px;
                    font-weight: 700;
                    letter-spacing: 3px;
                    margin: 0;
                    color: var(--print-gray);
                }

                /* BODY SECTION */
                .label-body {
                    padding: 30px;
                    display: flex;
                    flex-direction: column;
                    gap: 35px;
                }

                .info-block {
                    display: flex;
                    flex-direction: column;
                }

                .block-title {
                    font-size: 13px;
                    font-weight: 800;
                    color: var(--print-gray);
                    letter-spacing: 1px;
                    margin-bottom: 12px;
                    border-bottom: 2px solid var(--print-black);
                    padding-bottom: 6px;
                    text-transform: uppercase;
                }

                /* RECIPIENT */
                .recipient-name {
                    font-size: 28px;
                    font-weight: 800;
                    margin: 0 0 15px 0;
                    line-height: 1.1;
                    letter-spacing: -0.5px;
                }

                .contact-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 12px;
                }

                .contact-item {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-size: 15px;
                    font-weight: 500;
                }

                .contact-item.full-width {
                    grid-column: 1 / -1;
                }

                .contact-item strong {
                    font-weight: 800;
                }

                .contact-item .icon {
                    color: var(--print-black);
                }

                /* ADDRESS & SHIPPING METHOD */
                .shipping-method-banner {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    background: var(--print-light);
                    padding: 12px 16px;
                    border-radius: 6px;
                    margin-bottom: 25px;
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                }

                .shipping-method-text {
                    display: flex;
                    align-items: center;
                    flex-wrap: wrap;
                    gap: 6px;
                    font-size: 15px;
                }

                .method-label {
                    color: var(--print-gray);
                    font-weight: 700;
                    font-size: 12px;
                }

                .shipping-method-text strong {
                    font-weight: 900;
                    letter-spacing: 0.5px;
                }
                
                .method-divider {
                    margin: 0 8px;
                    color: var(--print-gray);
                }

                .address-container {
                    display: flex;
                    flex-direction: column;
                }

                .address-subtitle {
                    font-size: 11px;
                    font-weight: 800;
                    color: var(--print-gray);
                    letter-spacing: 1px;
                    margin-bottom: 6px;
                }

                .main-address {
                    font-size: 22px;
                    font-weight: 700;
                    margin: 0 0 25px 0;
                    line-height: 1.3;
                }

                .city-region-box {
                    display: flex;
                    border: 2px solid var(--print-black);
                    border-radius: 6px;
                    overflow: hidden;
                }

                .box-section {
                    flex: 1;
                    padding: 15px;
                    display: flex;
                    flex-direction: column;
                    background: #f8fafc;
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                }

                .box-divider {
                    width: 2px;
                    background: var(--print-black);
                }

                .small-label {
                    font-size: 11px;
                    font-weight: 800;
                    color: var(--print-gray);
                    letter-spacing: 1px;
                    margin-bottom: 4px;
                }

                .big-value {
                    font-size: 20px;
                    font-weight: 900;
                    letter-spacing: -0.5px;
                }

                * {
                    box-sizing: border-box;
                }

                @media (max-width: 600px) {
                    .modern-print-wrapper {
                        padding: 10px !important;
                    }
                    .shipping-label-card {
                        width: 100% !important;
                        max-width: 100% !important;
                        border-width: 1.5px !important;
                    }
                    .brand-clean-header {
                        padding: 20px 12px 14px 12px !important;
                    }
                    .brand-title {
                        font-size: 24px !important;
                        letter-spacing: 1px !important;
                        word-break: break-word !important;
                    }
                    .brand-subtitle {
                        font-size: 11px !important;
                        letter-spacing: 1.5px !important;
                    }
                    .label-body {
                        padding: 16px !important;
                        gap: 22px !important;
                    }
                    .recipient-name {
                        font-size: 20px !important;
                        word-break: break-word !important;
                    }
                    .contact-grid {
                        grid-template-columns: 1fr !important;
                        gap: 8px !important;
                    }
                    .contact-item {
                        font-size: 13px !important;
                        word-break: break-all !important;
                    }
                    .main-address {
                        font-size: 17px !important;
                        word-break: break-word !important;
                    }
                    .city-region-box {
                        flex-direction: column !important;
                    }
                    .box-divider {
                        width: 100% !important;
                        height: 1.5px !important;
                    }
                    .box-section {
                        padding: 10px !important;
                    }
                    .big-value {
                        font-size: 16px !important;
                    }
                }
            `}</style>
        </div>
    );
};

export default PrintLabel;
