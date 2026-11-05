import React from 'react';

export default function HeatmapLegend({ max }) {
  const maiorValorSeguro = Math.max(0.01, max || 0);
  const etapas = [1, 0.75, 0.5, 0.25, 0];

  return (
    <aside className="heatmap-legend-card" aria-label="Legenda de participação percentual">
      <div className="heatmap-legend-title">Participação</div>
      <div className="heatmap-legend-body">
        <div className="heatmap-legend-bar" />
        <div className="heatmap-legend-ticks">
          {etapas.map(etapa => {
            const valorDaEtapa = maiorValorSeguro * etapa;
            const valorFormatado = valorDaEtapa >= 10
              ? `${valorDaEtapa.toFixed(1)}%`
              : valorDaEtapa > 0 ? `${valorDaEtapa.toFixed(2)}%` : '0%';

            return (
              <div key={etapa} className="heatmap-legend-tick">
                <span className="tick-mark" />
                <span className="tick-label">{valorFormatado}</span>
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
