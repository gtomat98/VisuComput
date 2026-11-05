import React from 'react';
import { fmt } from '../utils';

export default function RatioOverlay({
  selectedLines,
  onInvert,
  onClear,
  year,
  hist,
  yearStart,
  yearEnd,
  colors
}) {
  if (selectedLines.length === 0) {
    return (
      <aside className="ratio-overlay-card ratio-overlay-hint" aria-label="Instruções para cálculo de ratio">
        <div className="ratio-badge-row">
          <span className="ratio-step-badge">Filtro por Ratio · Passo 1 de 2</span>
        </div>
        <div className="ratio-instruction">
          <span className="ratio-pulse-dot" />
          Passe o mouse perto da <b>1ª linha</b> e clique para definir o <b>Numerador</b> da divisão.
        </div>
      </aside>
    );
  }

  if (selectedLines.length === 1) {
    const nomeNumerador = selectedLines[0];
    const corNumerador = colors[nomeNumerador] || '#e6b84b';

    return (
      <aside className="ratio-overlay-card ratio-overlay-step1" aria-label="Selecione o denominador">
        <div className="ratio-badge-row">
          <span className="ratio-step-badge">Filtro por Ratio · Passo 2 de 2</span>
          <button type="button" className="ratio-mini-text-btn" onClick={onClear}>Trocar linha</button>
        </div>
        <div className="ratio-instruction">
          Numerador definido:{' '}
          <span className="ratio-inline-pill" style={{ borderColor: corNumerador, color: corNumerador }}>
            ● {nomeNumerador}
          </span>
          <br />
          Agora passe o mouse e clique na <b>2ª linha</b> para definir o <b>Denominador</b>.
        </div>
      </aside>
    );
  }

  const [nomeNumerador, nomeDenominador] = selectedLines;
  const corNumerador = colors[nomeNumerador] || '#e6b84b';
  const corDenominador = colors[nomeDenominador] || '#53b6a8';

  const anoReferencia = (year >= yearStart && year <= yearEnd) ? year : yearEnd;

  const registroNumerador = hist.find(item => item.grupo === nomeNumerador && item.ano === anoReferencia);
  const registroDenominador = hist.find(item => item.grupo === nomeDenominador && item.ano === anoReferencia);

  const valorNumerador = registroNumerador ? registroNumerador.total : 0;
  const valorDenominador = registroDenominador ? registroDenominador.total : 0;
  const razaoCalculada = valorDenominador > 0 ? (valorNumerador / valorDenominador) : null;

  const obterRotuloCurto = rotulo => {
    if (rotulo.includes('graduação') && !rotulo.includes('pós')) return 'alunos de graduação';
    if (rotulo.includes('pós')) return 'alunos de pós';
    if (rotulo.includes('Docentes')) return 'docentes';
    if (rotulo.includes('Servidores')) return 'servidores';
    return rotulo.toLowerCase();
  };

  const razaoFormatada = razaoCalculada == null
    ? '—'
    : razaoCalculada < 0.1 ? razaoCalculada.toFixed(3) : razaoCalculada.toFixed(2);

  return (
    <aside className="ratio-overlay-card ratio-overlay-active" aria-label="Resultado do ratio dinâmico">
      <div className="ratio-card-top">
        <div className="ratio-tag-wrapper">
          <span className="ratio-pulse-dot active" />
          <span className="ratio-card-tag">Ratio Dinâmico</span>
        </div>
        <div className="ratio-card-actions">
          <button
            type="button"
            className="ratio-swap-btn"
            onClick={onInvert}
            title="Inverter ordem do cálculo (Numerador ⇄ Denominador)"
            aria-label="Inverter ordem do cálculo"
          >
            <span aria-hidden="true">⇄</span> Inverter ordem
          </button>
          <button
            type="button"
            className="ratio-reset-btn"
            onClick={onClear}
            title="Limpar seleção e escolher outras linhas"
            aria-label="Limpar seleção"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="ratio-formula-row">
        <div className="ratio-term" style={{ borderColor: corNumerador }}>
          <span className="ratio-role-label">NUMERADOR (1º)</span>
          <span className="ratio-term-name" style={{ color: corNumerador }}>{nomeNumerador}</span>
        </div>
        <span className="ratio-div-sym" aria-hidden="true">÷</span>
        <div className="ratio-term" style={{ borderColor: corDenominador }}>
          <span className="ratio-role-label">DENOMINADOR (2º)</span>
          <span className="ratio-term-name" style={{ color: corDenominador }}>{nomeDenominador}</span>
        </div>
      </div>

      <div className="ratio-calc-summary">
        <div className="ratio-main-metric">
          <span className="ratio-result-num">{razaoFormatada}</span>
          <span className="ratio-result-text">
            {obterRotuloCurto(nomeNumerador)} por {obterRotuloCurto(nomeDenominador).replace(/s$/, '')}
          </span>
        </div>
        <div className="ratio-meta-info">
          <span className="ratio-year-tag">Ano {anoReferencia}</span>
          <span className="ratio-raw-vals">({fmt(valorNumerador)} ÷ {fmt(valorDenominador)})</span>
        </div>
      </div>
    </aside>
  );
}
