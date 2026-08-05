import React from 'react';

// Gráfico de barras por día (SVG, sin dependencias). Clic en una barra => onSelectDay(día).
const TimeSeriesChart = ({ series = [], metric = 'views', color = '#8f0653', onSelectDay, selectedDate }) => {
    const W = 720, H = 220;
    const padL = 40, padR = 12, padT = 14, padB = 28;
    const plotW = W - padL - padR;
    const plotH = H - padT - padB;

    const values = series.map(d => d[metric] || 0);
    const maxV = Math.max(1, ...values);
    const n = series.length || 1;
    const slot = plotW / n;
    const barW = Math.max(2, Math.min(28, slot * 0.7));

    // Ticks del eje Y (0, mitad, máx)
    const yTicks = [0, Math.round(maxV / 2), maxV];

    // Etiquetas X: ~7 fechas equiespaciadas
    const labelStep = Math.max(1, Math.ceil(n / 7));
    const fmtDay = (iso) => {
        const [, m, d] = iso.split('-');
        return `${d}/${m}`;
    };

    return (
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" style={{ display: 'block' }}>
            {/* Grid + eje Y */}
            {yTicks.map((tv, i) => {
                const y = padT + plotH - (tv / maxV) * plotH;
                return (
                    <g key={i}>
                        <line x1={padL} y1={y} x2={W - padR} y2={y} stroke="#eef2f7" strokeWidth="1" />
                        <text x={padL - 6} y={y + 3} textAnchor="end" fontSize="10" fill="#94a3b8">{tv}</text>
                    </g>
                );
            })}

            {/* Barras */}
            {series.map((d, i) => {
                const v = d[metric] || 0;
                const h = (v / maxV) * plotH;
                const x = padL + i * slot + (slot - barW) / 2;
                const y = padT + plotH - h;
                const isSel = selectedDate === d.date;
                return (
                    <g key={d.date} style={{ cursor: 'pointer' }} onClick={() => onSelectDay && onSelectDay(d)}>
                        {/* área clickeable invisible (toda la columna) */}
                        <rect x={padL + i * slot} y={padT} width={slot} height={plotH} fill="transparent" />
                        <rect
                            x={x} y={y} width={barW} height={Math.max(0, h)}
                            rx="2"
                            fill={isSel ? '#1e1b4b' : color}
                            opacity={isSel || selectedDate === undefined || selectedDate === null ? 1 : 0.55}
                        >
                            <title>{`${fmtDay(d.date)}: ${v}`}</title>
                        </rect>
                    </g>
                );
            })}

            {/* Etiquetas X */}
            {series.map((d, i) => {
                if (i % labelStep !== 0 && i !== n - 1) return null;
                const x = padL + i * slot + slot / 2;
                return (
                    <text key={d.date} x={x} y={H - 8} textAnchor="middle" fontSize="10" fill="#94a3b8">
                        {fmtDay(d.date)}
                    </text>
                );
            })}
        </svg>
    );
};

export default TimeSeriesChart;
