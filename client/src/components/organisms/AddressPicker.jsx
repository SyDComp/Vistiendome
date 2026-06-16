import React, { useState, useEffect } from 'react';
import { regions } from '../../constants/chileData';

const AddressPicker = ({
    initialAddress = '',
    onAddressSelect,
    readOnly = false,
}) => {
    const [street, setStreet] = useState(() => {
        if (!initialAddress) return '';
        const parts = initialAddress.split(',');
        return parts[0] ? parts[0].trim() : '';
    });
    const [number, setNumber] = useState('');
    const [apartment, setApartment] = useState('');
    const [selectedRegion, setSelectedRegion] = useState('');
    const [selectedCommune, setSelectedCommune] = useState('');

    const handleRegionChange = (e) => {
        setSelectedRegion(e.target.value);
        setSelectedCommune('');
    };

    const handleCommuneChange = (e) => {
        setSelectedCommune(e.target.value);
    };

    // Notify parent on valid data changes
    useEffect(() => {
        if (onAddressSelect) {
            const combinedManual = `${street} ${number}`.trim();
            const deptoStr = apartment ? `, ${apartment}` : '';
            const communeStr = selectedCommune ? `, ${selectedCommune}` : '';
            const regionStr = selectedRegion ? `, ${selectedRegion}` : '';

            const fullAddress = `${combinedManual}${deptoStr}${communeStr}${regionStr}, Chile`;

            if (street && selectedCommune) {
                onAddressSelect({
                    manualAddress: combinedManual,
                    street,
                    houseNumber: number,
                    apartment,
                    region: selectedRegion,
                    commune: selectedCommune,
                    lat: null,
                    lng: null,
                    fullAddress
                });
            }
        }
    }, [street, number, apartment, selectedRegion, selectedCommune, onAddressSelect]);

    const inputStyle = {
        width: '100%',
        padding: '0.7rem',
        border: '1px solid #cbd5e1',
        borderRadius: '6px',
        fontSize: '0.95rem',
        backgroundColor: '#fff',
        transition: 'border-color 0.2s',
        outline: 'none',
    };

    const labelStyle = {
        fontSize: '0.85rem',
        fontWeight: '600',
        color: '#475569',
        marginBottom: '0.25rem',
        display: 'block'
    };

    return (
        <div className="address-picker" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
            {!readOnly && (
                <>
                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                        <div style={{ flex: 1, minWidth: '150px' }}>
                            <label style={labelStyle}>Región *</label>
                            <select
                                value={selectedRegion}
                                onChange={handleRegionChange}
                                style={inputStyle}
                                required
                            >
                                <option value="">Selecciona Región...</option>
                                {regions.map(r => <option key={r.name} value={r.name}>{r.name}</option>)}
                            </select>
                        </div>
                        <div style={{ flex: 1, minWidth: '150px' }}>
                            <label style={labelStyle}>Comuna *</label>
                            <select
                                value={selectedCommune}
                                onChange={handleCommuneChange}
                                disabled={!selectedRegion}
                                style={{
                                    ...inputStyle,
                                    opacity: !selectedRegion ? 0.6 : 1,
                                }}
                                required
                            >
                                <option value="">Selecciona Comuna...</option>
                                {selectedRegion && regions.find(r => r.name === selectedRegion)?.communes.map(c => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                        <div style={{ flex: 2, minWidth: '200px' }}>
                            <label style={labelStyle}>Calle *</label>
                            <input
                                type="text"
                                value={street}
                                onChange={(e) => setStreet(e.target.value)}
                                placeholder="Ej: Av Providencia"
                                style={inputStyle}
                                required
                            />
                        </div>
                        <div style={{ flex: 1, minWidth: '100px' }}>
                            <label style={labelStyle}>Número *</label>
                            <input
                                type="text"
                                value={number}
                                onChange={(e) => setNumber(e.target.value)}
                                placeholder="1234"
                                style={inputStyle}
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label style={labelStyle}>Dpto / Casa / Block (Opcional)</label>
                        <input
                            type="text"
                            value={apartment}
                            onChange={(e) => setApartment(e.target.value)}
                            placeholder="Ej: Depto 502, Torre B"
                            style={inputStyle}
                        />
                    </div>
                </>
            )}
        </div>
    );
};

export default AddressPicker;
