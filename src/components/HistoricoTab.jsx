import React, { useEffect, useMemo, useState } from 'react';
import Plot from 'react-plotly.js';
import { Panel } from './Panel';
import { Field } from './Field';
import RatioOverlay from './RatioOverlay';
import {
  GRUPOS_HISTORICOS,
  CORES_HISTORICO,
  CORES_HISTORICO_SUAVES,
  MARCOS_HISTORICOS,
  ATALHOS_PERIODO,
  ANO_MINIMO,
  ANO_MAXIMO
} from '../constants';
import { layoutBase, plotConfig, atualizarIntervalosZoom } from '../utils';

export default function HistoricoTab({ historico }) {
  const [modoHistorico, setModoHistorico] = useState('absoluto');
  const [anoBase, setAnoBase] = useState(ANO_MINIMO);
  const [anoInicial, setAnoInicial] = useState(ANO_MINIMO);
  const [anoFinal, setAnoFinal] = useState(ANO_MAXIMO);
  const [linhasRatioSelecionadas, setLinhasRatioSelecionadas] = useState([]);
  const [anoHoverRatio, setAnoHoverRatio] = useState(null);
  const [linhaEmFoco, setLinhaEmFoco] = useState(null);
  const [zoomHistorico, setZoomHistorico] = useState({});

  useEffect(() => {
    setZoomHistorico({});
  }, [anoInicial, anoFinal, modoHistorico, anoBase, linhasRatioSelecionadas]);

  const seriesHistoricas = useMemo(() => {
    return GRUPOS_HISTORICOS.map(grupo => {
      const registrosGrupo = historico
        .filter(item => item.grupo === grupo && item.total != null)
        .sort((itemA, itemB) => itemA.ano - itemB.ano);

      const registroBase = registrosGrupo.find(item => item.ano === anoBase)
        || registrosGrupo.find(item => item.ano >= anoInicial)
        || registrosGrupo[0];
      const totalAnoBase = registroBase?.total;

      const registrosNoPeriodo = registrosGrupo.filter(item => item.ano >= anoInicial && item.ano <= anoFinal);

      return {
        name: grupo,
        x: registrosNoPeriodo.map(item => item.ano),
        y: registrosNoPeriodo.map(item => (
          modoHistorico === 'indice' && totalAnoBase ? (item.total / totalAnoBase) * 100 : item.total
        ))
      };
    });
  }, [historico, anoInicial, anoFinal, modoHistorico, anoBase]);

  const maiorValorHistorico = useMemo(() => {
    let valorMaximo = 0;
    for (const serie of seriesHistoricas) {
      for (const valor of serie.y) {
        if (Number.isFinite(valor) && valor > valorMaximo) valorMaximo = valor;
      }
    }
    return valorMaximo > 0 ? valorMaximo * 1.08 : (modoHistorico === 'indice' ? 120 : 1000);
  }, [seriesHistoricas, modoHistorico]);

  const limiteMaximoHistorico = useMemo(() => {
    const piso = modoHistorico === 'indice' ? 500 : 70000;
    return Math.max(maiorValorHistorico * 1.5, piso);
  }, [maiorValorHistorico, modoHistorico]);

  const selecionarLinhaRatio = nomeLinha => {
    if (!nomeLinha || !GRUPOS_HISTORICOS.includes(nomeLinha)) return;

    setLinhasRatioSelecionadas(selecionadas => {
      if (selecionadas.length === 0) return [nomeLinha];
      if (selecionadas.length === 1) {
        return selecionadas[0] === nomeLinha ? [] : [selecionadas[0], nomeLinha];
      }
      return selecionadas.includes(nomeLinha) ? [nomeLinha] : [selecionadas[0], nomeLinha];
    });
  };

  const inverterRatio = () => {
    if (linhasRatioSelecionadas.length === 2) {
      setLinhasRatioSelecionadas([linhasRatioSelecionadas[1], linhasRatioSelecionadas[0]]);
    }
  };

  const limparRatio = () => {
    setLinhasRatioSelecionadas([]);
  };

  const anosDisponiveis = Array.from(
    { length: ANO_MAXIMO - ANO_MINIMO + 1 },
    (_, posicao) => ANO_MINIMO + posicao
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
              value={modoHistorico}
              onChange={evento => {
                setModoHistorico(evento.target.value);
                if (evento.target.value !== 'razao') {
                  setLinhasRatioSelecionadas([]);
                  setLinhaEmFoco(null);
                }
              }}
            >
              <option value="absoluto">Números absolutos</option>
              <option value="indice">Índice relativo (Ano-base dinâmico)</option>
              <option value="razao">Filtro dinâmico por Ratio (Selecione 2 linhas)</option>
            </select>
          </Field>

          {modoHistorico === 'indice' && (
            <Field label="Ano-base (100)">
              <select value={anoBase} onChange={evento => setAnoBase(Number(evento.target.value))}>
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
        {modoHistorico === 'absoluto' && (
          <div className="historic-toolbar-slot" role="toolbar" aria-label="Atalhos rápidos de período">
            <span className="slot-title">Atalhos de período:</span>
            <div className="slot-chips">
              {ATALHOS_PERIODO.map(periodo => (
                <button
                  key={periodo.label}
                  type="button"
                  className={`chip-milestone ${anoInicial === periodo.start && anoFinal === periodo.end ? 'active' : ''}`}
                  onClick={() => {
                    setAnoInicial(periodo.start);
                    setAnoFinal(periodo.end);
                  }}
                >
                  {periodo.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {modoHistorico === 'indice' && (
          <div className="historic-toolbar-slot" role="toolbar" aria-label="Marcos historicoóricos de referência">
            <span className="slot-title">Marcos historicoóricos:</span>
            <div className="slot-chips">
              {MARCOS_HISTORICOS.map(marco => (
                <button
                  key={marco.year}
                  type="button"
                  className={`chip-milestone ${anoBase === marco.year ? 'active' : ''}`}
                  onClick={() => {
                    setAnoBase(marco.year);
                    if (marco.year < anoInicial) setAnoInicial(marco.year);
                    if (marco.year > anoFinal) setAnoFinal(marco.year);
                  }}
                >
                  {marco.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {modoHistorico === 'razao' && (
          <div className="historic-toolbar-slot" role="toolbar" aria-label="Linhas disponíveis para relação">
            <span className="slot-title">Linhas do gráfico:</span>
            <div className="slot-chips">
              {GRUPOS_HISTORICOS.map(grupo => {
                const ehNumerador = linhasRatioSelecionadas[0] === grupo;
                const ehDenominador = linhasRatioSelecionadas[1] === grupo;
                const estaSelecionada = ehNumerador || ehDenominador;
                const estaHover = linhaEmFoco === grupo;
                const corLinha = CORES_HISTORICO[grupo] || '#8c9fe8';

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
                    onClick={() => selecionarLinhaRatio(grupo)}
                    onMouseEnter={() => setLinhaEmFoco(grupo)}
                    onMouseLeave={() => setLinhaEmFoco(null)}
                  >
                    <span className="chip-color-dot" style={{ backgroundColor: corLinha }} />
                    {grupo}
                    {ehNumerador && <span className="chip-order-badge" style={{ backgroundColor: corLinha }}>1º (NUM)</span>}
                    {ehDenominador && <span className="chip-order-badge" style={{ backgroundColor: corLinha }}>2º (DEN)</span>}
                  </button>
                );
              })}
              {linhasRatioSelecionadas.length > 0 && (
                <button type="button" className="ghost ratio-clear-action-btn" onClick={limparRatio}>
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
              min={ANO_MINIMO}
              max={anoFinal}
              value={anoInicial}
              onChange={evento => setAnoInicial(Number(evento.target.value))}
            />
            <b>{anoInicial}</b>
          </label>
          <label>
            Ano final{' '}
            <input
              type="range"
              min={anoInicial}
              max={ANO_MAXIMO}
              value={anoFinal}
              onChange={evento => setAnoFinal(Number(evento.target.value))}
            />
            <b>{anoFinal}</b>
          </label>
          <button
            className="ghost"
            onClick={() => {
              setAnoInicial(ANO_MINIMO);
              setAnoFinal(ANO_MAXIMO);
              if (modoHistorico === 'indice') setAnoBase(ANO_MINIMO);
            }}
          >
            Restaurar período
          </button>
        </div>

        <div className="historic-plot-wrapper">
          <Plot
            data={seriesHistoricas.map(serie => {
              const modoRatio = modoHistorico === 'razao';
              const ehNumerador = linhasRatioSelecionadas[0] === serie.name;
              const ehDenominador = linhasRatioSelecionadas[1] === serie.name;
              const estaSelecionada = ehNumerador || ehDenominador;
              const estaHover = modoRatio && linhaEmFoco === serie.name;

              let corLinha = CORES_HISTORICO[serie.name] || '#e6b84b';
              let espessuraLinha = 2.5;
              let tamanhoMarcador = 5;
              let opacidade = 1.0;

              if (modoRatio) {
                if (estaSelecionada) {
                  corLinha = CORES_HISTORICO[serie.name];
                  espessuraLinha = 4.0;
                  tamanhoMarcador = 7.5;
                  opacidade = 1.0;
                } else if (estaHover) {
                  corLinha = CORES_HISTORICO[serie.name];
                  espessuraLinha = 3.2;
                  tamanhoMarcador = 6;
                  opacidade = 0.72;
                } else if (linhasRatioSelecionadas.length === 0) {
                  corLinha = CORES_HISTORICO_SUAVES[serie.name];
                  espessuraLinha = 2.0;
                  tamanhoMarcador = 4;
                  opacidade = 0.35;
                } else {
                  corLinha = CORES_HISTORICO_SUAVES[serie.name];
                  espessuraLinha = 1.4;
                  tamanhoMarcador = 3;
                  opacidade = 0.16;
                }
              }

              let templateHover = 'Ano %{x}<br>' + serie.name + ': <b>%{y:,.0f}</b> pessoas<extra></extra>';
              if (modoRatio) {
                templateHover = '<b>' + serie.name + '</b><br>Ano %{x}: %{y:,.0f} pessoas<extra></extra>';
              } else if (modoHistorico === 'indice') {
                templateHover = 'Ano %{x}<br>' + serie.name + ': <b>%{y:.1f}</b> (base ' + anoBase + ' = 100)<extra></extra>';
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
              hovermode: modoHistorico === 'razao' ? 'closest' : 'x unified',
              hoverdistance: modoHistorico === 'razao' ? 35 : 20,
              xaxis: {
                ...layoutBase.xaxis,
                title: 'Ano',
                dtick: 2,
                autorange: false,
                range: zoomHistorico.xaxis || [anoInicial, anoFinal],
                minallowed: ANO_MINIMO,
                maxallowed: ANO_MAXIMO
              },
              yaxis: {
                ...layoutBase.yaxis,
                title: modoHistorico === 'indice'
                  ? `Índice relativo (${anoBase} = 100)`
                  : 'Número de pessoas',
                rangemode: 'tozero',
                range: zoomHistorico.yaxis || [0, maiorValorHistorico],
                minallowed: 0,
                maxallowed: limiteMaximoHistorico
              },
              shapes: modoHistorico === 'indice' && anoBase >= anoInicial && anoBase <= anoFinal ? [{
                type: 'line',
                x0: anoBase,
                x1: anoBase,
                y0: 0,
                y1: 1,
                yref: 'paper',
                line: { color: '#e6b84b', width: 1.5, dash: 'dash' }
              }] : [],
              annotations: modoHistorico === 'indice' && anoBase >= anoInicial && anoBase <= anoFinal ? [{
                x: anoBase,
                y: 1,
                yref: 'paper',
                text: `Ano-base (${anoBase} = 100)`,
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
            onRelayout={evento => atualizarIntervalosZoom(evento, zoomHistorico, {
              xaxis: { min: anoInicial, max: anoFinal, minSpan: 2, maxSpan: Math.max(2, anoFinal - anoInicial) },
              yaxis: { min: 0, max: limiteMaximoHistorico, minSpan: modoHistorico === 'indice' ? 5 : 500, maxSpan: limiteMaximoHistorico }
            }, setZoomHistorico)}
            onClick={evento => {
              const pontoClicado = evento.points?.[0];
              if (!pontoClicado) return;

              if (modoHistorico === 'razao') {
                const nomeTrace = pontoClicado.data?.name || linhaEmFoco;
                if (nomeTrace) selecionarLinhaRatio(nomeTrace);
                if (pontoClicado.x != null) setAnoHoverRatio(Number(pontoClicado.x));
                return;
              }

              if (modoHistorico === 'indice' && pontoClicado.x != null) {
                setAnoBase(Number(pontoClicado.x));
              }
            }}
            onHover={evento => {
              const pontoSobrevoado = evento.points?.[0];
              if (modoHistorico === 'razao' && pontoSobrevoado) {
                if (pontoSobrevoado.data?.name) setLinhaEmFoco(pontoSobrevoado.data.name);
                if (pontoSobrevoado.x != null) setAnoHoverRatio(Number(pontoSobrevoado.x));
              }
            }}
            onUnhover={() => {
              if (modoHistorico === 'razao') setLinhaEmFoco(null);
            }}
          />

          {modoHistorico === 'razao' && (
            <RatioOverlay
              linhasSelecionadas={linhasRatioSelecionadas}
              aoInverter={inverterRatio}
              aoLimpar={limparRatio}
              ano={anoHoverRatio || anoFinal}
              historico={historico}
              anoInicial={anoInicial}
              anoFinal={anoFinal}
              cores={CORES_HISTORICO}
            />
          )}
        </div>

        <div className="note">
          {modoHistorico === 'razao'
            ? 'Modo Ratio Dinâmico: selecione duas linhas com o mouse para calcular a proporção entre elas. A primeira linha define o numerador e a segunda o denominador; inverta a ordem a qualquer momento.'
            : modoHistorico === 'indice'
              ? `Modo de Índice Relativo: cada série é fixada em 100 no ano-base ${anoBase}. Valores acima de 100 indicam crescimento acumulado em relação à referência; valores abaixo indicam redução.`
              : 'Série Histórica Oficial: contingente de alunos, docentes e servidores da USP ao longo dos anos. Use a seleção de anos ou os atalhos para focar em períodos específicos.'}
        </div>
      </Panel>
    </div>
  );
}
