import React, { useEffect, useMemo, useState } from 'react';
import Plot from 'react-plotly.js';
import { Panel } from './Panel';
import { Field } from './Field';
import RatioOverlay from './RatioOverlay';
import {
  HIST_GROUPS,
  HIST_COLORS,
  HIST_COLORS_MUTED,
  HISTORIC_MILESTONES,
  PERIOD_SHORTCUTS,
  YEAR_MIN,
  YEAR_MAX
} from '../constants';
import { layoutBase, plotConfig, zoomEventRanges } from '../utils';

export default function HistoricoTab({ hist }) {
  const [historicMode, setHistoricMode] = useState('absoluto');
  const [baseYear, setBaseYear] = useState(YEAR_MIN);
  const [yearStart, setYearStart] = useState(YEAR_MIN);
  const [yearEnd, setYearEnd] = useState(YEAR_MAX);
  const [ratioSelectedLines, setRatioSelectedLines] = useState([]);
  const [ratioHoverYear, setRatioHoverYear] = useState(null);
  const [hoveredLine, setHoveredLine] = useState(null);
  const [historicZoom, setHistoricZoom] = useState({});

  useEffect(() => {
    setHistoricZoom({});
  }, [yearStart, yearEnd, historicMode, baseYear, ratioSelectedLines]);

  const historical = useMemo(() => {
    return HIST_GROUPS.map(grupo => {
      const todosRegistros = hist
        .filter(item => item.grupo === grupo && item.total != null)
        .sort((itemA, itemB) => itemA.ano - itemB.ano);

      const objetoBase = todosRegistros.find(item => item.ano === baseYear)
        || todosRegistros.find(item => item.ano >= yearStart)
        || todosRegistros[0];
      const totalBase = objetoBase?.total;

      const registrosPeriodo = todosRegistros.filter(item => item.ano >= yearStart && item.ano <= yearEnd);

      return {
        name: grupo,
        x: registrosPeriodo.map(item => item.ano),
        y: registrosPeriodo.map(item => (
          historicMode === 'indice' && totalBase ? (item.total / totalBase) * 100 : item.total
        ))
      };
    });
  }, [hist, yearStart, yearEnd, historicMode, baseYear]);

  const historicMaxY = useMemo(() => {
    let valorMaximo = 0;
    for (const serie of historical) {
      for (const valor of serie.y) {
        if (Number.isFinite(valor) && valor > valorMaximo) valorMaximo = valor;
      }
    }
    return valorMaximo > 0 ? valorMaximo * 1.08 : (historicMode === 'indice' ? 120 : 1000);
  }, [historical, historicMode]);

  const historicMaxLimit = useMemo(() => {
    const piso = historicMode === 'indice' ? 500 : 70000;
    return Math.max(historicMaxY * 1.5, piso);
  }, [historicMaxY, historicMode]);

  const handleRatioLineSelect = nomeLinha => {
    if (!nomeLinha || !HIST_GROUPS.includes(nomeLinha)) return;

    setRatioSelectedLines(selecionadas => {
      if (selecionadas.length === 0) return [nomeLinha];
      if (selecionadas.length === 1) {
        return selecionadas[0] === nomeLinha ? [] : [selecionadas[0], nomeLinha];
      }
      return selecionadas.includes(nomeLinha) ? [nomeLinha] : [selecionadas[0], nomeLinha];
    });
  };

  const handleInvertRatio = () => {
    if (ratioSelectedLines.length === 2) {
      setRatioSelectedLines([ratioSelectedLines[1], ratioSelectedLines[0]]);
    }
  };

  const handleClearRatio = () => {
    setRatioSelectedLines([]);
  };

  const anosDisponiveis = Array.from(
    { length: YEAR_MAX - YEAR_MIN + 1 },
    (_, posicao) => YEAR_MIN + posicao
  );

  return (
    <div className="content">
      <div className="section-title">
        <div>
          <h2>Evolução histórica</h2>
          <p>Acompanhe a trajetória da comunidade da USP por contingente absoluto, índice relativo ou ratio dinâmico.</p>
        </div>
        <div className="filters">
          <Field label="Modo de análise">
            <select
              value={historicMode}
              onChange={evento => {
                setHistoricMode(evento.target.value);
                if (evento.target.value !== 'razao') {
                  setRatioSelectedLines([]);
                  setHoveredLine(null);
                }
              }}
            >
              <option value="absoluto">Números absolutos</option>
              <option value="indice">Índice relativo (Ano-base dinâmico)</option>
              <option value="razao">Filtro dinâmico por Ratio (Selecione 2 linhas)</option>
            </select>
          </Field>

          {historicMode === 'indice' && (
            <Field label="Ano-base (100)">
              <select value={baseYear} onChange={evento => setBaseYear(Number(evento.target.value))}>
                {anosDisponiveis.map(ano => (
                  <option key={ano} value={ano}>{ano}</option>
                ))}
              </select>
            </Field>
          )}
        </div>
      </div>

      <Panel
        title="População universitária · 1989–2025"
        sub="Use zoom nos eixos, selecione períodos e clique nas séries para explorar a evolução histórica da USP."
      >
        {historicMode === 'absoluto' && (
          <div className="historic-toolbar-slot" role="toolbar" aria-label="Atalhos rápidos de período">
            <span className="slot-title">Atalhos de período:</span>
            <div className="slot-chips">
              {PERIOD_SHORTCUTS.map(periodo => (
                <button
                  key={periodo.label}
                  type="button"
                  className={`chip-milestone ${yearStart === periodo.start && yearEnd === periodo.end ? 'active' : ''}`}
                  onClick={() => {
                    setYearStart(periodo.start);
                    setYearEnd(periodo.end);
                  }}
                >
                  {periodo.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {historicMode === 'indice' && (
          <div className="historic-toolbar-slot" role="toolbar" aria-label="Marcos históricos de referência">
            <span className="slot-title">Marcos históricos:</span>
            <div className="slot-chips">
              {HISTORIC_MILESTONES.map(marco => (
                <button
                  key={marco.year}
                  type="button"
                  className={`chip-milestone ${baseYear === marco.year ? 'active' : ''}`}
                  onClick={() => {
                    setBaseYear(marco.year);
                    if (marco.year < yearStart) setYearStart(marco.year);
                    if (marco.year > yearEnd) setYearEnd(marco.year);
                  }}
                >
                  {marco.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {historicMode === 'razao' && (
          <div className="historic-toolbar-slot" role="toolbar" aria-label="Linhas disponíveis para relação">
            <span className="slot-title">Linhas do gráfico:</span>
            <div className="slot-chips">
              {HIST_GROUPS.map(grupo => {
                const ehNumerador = ratioSelectedLines[0] === grupo;
                const ehDenominador = ratioSelectedLines[1] === grupo;
                const estaSelecionada = ehNumerador || ehDenominador;
                const estaHover = hoveredLine === grupo;
                const corLinha = HIST_COLORS[grupo] || '#8c9fe8';

                return (
                  <button
                    key={grupo}
                    type="button"
                    className={`chip-ratio-line ${estaSelecionada ? 'active' : ''}`}
                    style={{
                      borderColor: estaSelecionada ? corLinha : (estaHover ? '#527ba0' : '#324a61'),
                      color: estaSelecionada ? '#ffffff' : (estaHover ? '#eef5fa' : '#a9bac6'),
                      backgroundColor: estaSelecionada ? `${corLinha}33` : (estaHover ? 'rgba(255,255,255,0.08)' : 'transparent')
                    }}
                    onClick={() => handleRatioLineSelect(grupo)}
                    onMouseEnter={() => setHoveredLine(grupo)}
                    onMouseLeave={() => setHoveredLine(null)}
                  >
                    <span className="chip-color-dot" style={{ backgroundColor: corLinha }} />
                    {grupo}
                    {ehNumerador && <span className="chip-order-badge" style={{ backgroundColor: corLinha }}>1º (NUM)</span>}
                    {ehDenominador && <span className="chip-order-badge" style={{ backgroundColor: corLinha }}>2º (DEN)</span>}
                  </button>
                );
              })}
              {ratioSelectedLines.length > 0 && (
                <button type="button" className="ghost ratio-clear-action-btn" onClick={handleClearRatio}>
                  Limpar seleção
                </button>
              )}
            </div>
          </div>
        )}

        <div className="range-controls">
          <label>
            Ano inicial{' '}
            <input
              type="range"
              min={YEAR_MIN}
              max={yearEnd}
              value={yearStart}
              onChange={evento => setYearStart(Number(evento.target.value))}
            />
            <b>{yearStart}</b>
          </label>
          <label>
            Ano final{' '}
            <input
              type="range"
              min={yearStart}
              max={YEAR_MAX}
              value={yearEnd}
              onChange={evento => setYearEnd(Number(evento.target.value))}
            />
            <b>{yearEnd}</b>
          </label>
          <button
            className="ghost"
            onClick={() => {
              setYearStart(YEAR_MIN);
              setYearEnd(YEAR_MAX);
              if (historicMode === 'indice') setBaseYear(YEAR_MIN);
            }}
          >
            Restaurar período
          </button>
        </div>

        <div className="historic-plot-wrapper">
          <Plot
            data={historical.map(serie => {
              const modoRatio = historicMode === 'razao';
              const ehNumerador = ratioSelectedLines[0] === serie.name;
              const ehDenominador = ratioSelectedLines[1] === serie.name;
              const estaSelecionada = ehNumerador || ehDenominador;
              const estaHover = modoRatio && hoveredLine === serie.name;

              let corLinha = HIST_COLORS[serie.name] || '#e6b84b';
              let espessuraLinha = 2.5;
              let tamanhoMarcador = 5;
              let opacidade = 1.0;

              if (modoRatio) {
                if (estaSelecionada) {
                  corLinha = HIST_COLORS[serie.name];
                  espessuraLinha = 4.0;
                  tamanhoMarcador = 7.5;
                  opacidade = 1.0;
                } else if (estaHover) {
                  corLinha = HIST_COLORS[serie.name];
                  espessuraLinha = 3.2;
                  tamanhoMarcador = 6;
                  opacidade = 0.72;
                } else if (ratioSelectedLines.length === 0) {
                  corLinha = HIST_COLORS_MUTED[serie.name];
                  espessuraLinha = 2.0;
                  tamanhoMarcador = 4;
                  opacidade = 0.35;
                } else {
                  corLinha = HIST_COLORS_MUTED[serie.name];
                  espessuraLinha = 1.4;
                  tamanhoMarcador = 3;
                  opacidade = 0.16;
                }
              }

              let templateHover = 'Ano %{x}<br>' + serie.name + ': <b>%{y:,.0f}</b> pessoas<extra></extra>';
              if (modoRatio) {
                templateHover = '<b>' + serie.name + '</b><br>Ano %{x}: %{y:,.0f} pessoas<extra></extra>';
              } else if (historicMode === 'indice') {
                templateHover = 'Ano %{x}<br>' + serie.name + ': <b>%{y:.1f}</b> (base ' + baseYear + ' = 100)<extra></extra>';
              }

              return {
                type: 'scatter',
                mode: 'lines+markers',
                name: serie.name,
                x: serie.x,
                y: serie.y,
                opacity: opacidade,
                line: { width: espessuraLinha, color: corLinha },
                marker: { size: tamanhoMarcador, color: corLinha },
                connectgaps: false,
                hovertemplate: templateHover
              };
            })}
            layout={{
              ...layoutBase,
              hovermode: historicMode === 'razao' ? 'closest' : 'x unified',
              hoverdistance: historicMode === 'razao' ? 35 : 20,
              xaxis: {
                ...layoutBase.xaxis,
                title: 'Ano',
                dtick: 2,
                autorange: false,
                range: historicZoom.xaxis || [yearStart, yearEnd],
                minallowed: YEAR_MIN,
                maxallowed: YEAR_MAX
              },
              yaxis: {
                ...layoutBase.yaxis,
                title: historicMode === 'indice'
                  ? `Índice relativo (${baseYear} = 100)`
                  : 'Número de pessoas',
                rangemode: 'tozero',
                range: historicZoom.yaxis || [0, historicMaxY],
                minallowed: 0,
                maxallowed: historicMaxLimit
              },
              shapes: historicMode === 'indice' && baseYear >= yearStart && baseYear <= yearEnd ? [{
                type: 'line',
                x0: baseYear,
                x1: baseYear,
                y0: 0,
                y1: 1,
                yref: 'paper',
                line: { color: '#e6b84b', width: 1.5, dash: 'dash' }
              }] : [],
              annotations: historicMode === 'indice' && baseYear >= yearStart && baseYear <= yearEnd ? [{
                x: baseYear,
                y: 1,
                yref: 'paper',
                text: `Ano-base (${baseYear} = 100)`,
                showarrow: false,
                xanchor: 'center',
                yanchor: 'bottom',
                font: { family: 'DM Mono, monospace', size: 10, color: '#f0d17d' },
                bgcolor: 'rgba(16, 33, 49, 0.85)',
                borderpad: 3
              }] : [],
              legend: { orientation: 'h', y: -0.22 },
              margin: { l: 78, r: 25, t: 25, b: 75 }
            }}
            config={plotConfig}
            style={{ width: '100%', height: 490 }}
            useResizeHandler
            onRelayout={evento => zoomEventRanges(evento, historicZoom, {
              xaxis: { min: yearStart, max: yearEnd, minSpan: 2, maxSpan: Math.max(2, yearEnd - yearStart) },
              yaxis: { min: 0, max: historicMaxLimit, minSpan: historicMode === 'indice' ? 5 : 500, maxSpan: historicMaxLimit }
            }, setHistoricZoom)}
            onClick={evento => {
              const pontoClicado = evento.points?.[0];
              if (!pontoClicado) return;

              if (historicMode === 'razao') {
                const nomeTrace = pontoClicado.data?.name || hoveredLine;
                if (nomeTrace) handleRatioLineSelect(nomeTrace);
                if (pontoClicado.x != null) setRatioHoverYear(Number(pontoClicado.x));
                return;
              }

              if (historicMode === 'indice' && pontoClicado.x != null) {
                setBaseYear(Number(pontoClicado.x));
              }
            }}
            onHover={evento => {
              const pontoSobrevoado = evento.points?.[0];
              if (historicMode === 'razao' && pontoSobrevoado) {
                if (pontoSobrevoado.data?.name) setHoveredLine(pontoSobrevoado.data.name);
                if (pontoSobrevoado.x != null) setRatioHoverYear(Number(pontoSobrevoado.x));
              }
            }}
            onUnhover={() => {
              if (historicMode === 'razao') setHoveredLine(null);
            }}
          />

          {historicMode === 'razao' && (
            <RatioOverlay
              selectedLines={ratioSelectedLines}
              onInvert={handleInvertRatio}
              onClear={handleClearRatio}
              year={ratioHoverYear || yearEnd}
              hist={hist}
              yearStart={yearStart}
              yearEnd={yearEnd}
              colors={HIST_COLORS}
            />
          )}
        </div>

        <div className="note">
          {historicMode === 'razao'
            ? 'Modo Ratio Dinâmico: selecione duas linhas com o mouse para calcular a proporção entre elas. A primeira linha define o numerador e a segunda o denominador; inverta a ordem a qualquer momento.'
            : historicMode === 'indice'
              ? `Modo de Índice Relativo: cada série é fixada em 100 no ano-base ${baseYear}. Valores acima de 100 indicam crescimento acumulado em relação à referência; valores abaixo indicam redução.`
              : 'Série Histórica Oficial: contingente de alunos, docentes e servidores da USP ao longo dos anos. Use a seleção de anos ou os atalhos para focar em períodos específicos.'}
        </div>
      </Panel>
    </div>
  );
}
