import React, { useEffect, useMemo, useState } from 'react';
import Plot from 'react-plotly.js';
import { Panel, Empty } from './Panel';
import { Field, SearchField } from './Field';
import { GROUPS } from '../constants';
import { layoutBase, plotConfig, zoomEventRanges, pctOf, normalizeSearch } from '../utils';

export default function RankingTab({
  dem,
  races,
  rankGroup,
  setRankGroup,
  rankRace,
  setRankRace,
  unitType,
  setUnitType,
  unitTypes,
  selectedUnit,
  setSelectedUnit,
  unitSearch,
  setUnitSearch,
  setHeatGroup
}) {
  const [rankZoom, setRankZoom] = useState({});

  useEffect(() => {
    setRankZoom({});
  }, [rankGroup, rankRace, unitType, selectedUnit]);

  const ranking = useMemo(() => {
    const termoBusca = normalizeSearch(unitSearch);

    const filtrados = dem.filter(registro => {
      if (registro.grupo !== rankGroup) return false;
      if (unitType !== 'Todos' && registro.tipoUnidade !== unitType) return false;
      if (termoBusca && !registro.unidade.toLocaleLowerCase('pt-BR').includes(termoBusca)) return false;
      return true;
    });

    const mapaTotais = new Map();
    for (const linha of filtrados) {
      if (!mapaTotais.has(linha.unidade)) {
        mapaTotais.set(linha.unidade, { total: 0, raca: 0 });
      }
      const acumulador = mapaTotais.get(linha.unidade);
      const quantidade = Number(linha.total) || 0;
      acumulador.total += quantidade;
      if (linha.raca === rankRace) {
        acumulador.raca += quantidade;
      }
    }

    const resultado = [];
    for (const [unidade, contagem] of mapaTotais.entries()) {
      const percentual = pctOf(contagem.raca, contagem.total);
      if (percentual != null) {
        resultado.push({
          unidade,
          total: contagem.total,
          quantidade: contagem.raca,
          percentual
        });
      }
    }

    return resultado.sort((itemA, itemB) => (
      itemB.percentual - itemA.percentual || itemA.unidade.localeCompare(itemB.unidade, 'pt-BR')
    ));
  }, [dem, rankGroup, rankRace, unitType, unitSearch]);

  const rankTop = ranking;
  const rankScaleMax = Math.max(0.01, ...rankTop.map(item => item.percentual)) * 1.14;
  const rankPlotHeight = Math.max(540, rankTop.length * 28 + 90);

  return (
    <div className="content">
      <div className="section-title">
        <div>
          <h2>Participação racial por unidade</h2>
          <p>Compare a participação percentual de uma categoria racial entre as unidades. 'Todos' reúne todas as categorias de unidade.</p>
        </div>
        <div className="filters filters-ranking">
          <Field label="População">
            <select value={rankGroup} onChange={evento => setRankGroup(evento.target.value)}>
              {GROUPS.map(grupo => <option key={grupo}>{grupo}</option>)}
            </select>
          </Field>
          <Field label="Raça/cor">
            <select value={rankRace} onChange={evento => setRankRace(evento.target.value)}>
              {races.map(raca => <option key={raca}>{raca}</option>)}
            </select>
          </Field>
          <Field label="Categoria de unidade">
            <select value={unitType} onChange={evento => setUnitType(evento.target.value)}>
              <option value="Todos">Todos</option>
              {unitTypes.map(tipo => <option key={tipo}>{tipo}</option>)}
            </select>
          </Field>
          <SearchField value={unitSearch} onChange={setUnitSearch} />
        </div>
      </div>

      <Panel
        title={`${rankRace} · ${rankGroup}`}
        sub="Ordenado da maior para a menor participação. Clique em uma barra para selecionar a unidade e localizá-la no mapa de calor."
      >
        {rankTop.length ? (
          <div className="ranking-wrapper">
            <div className="ranking-scroll" role="region" aria-label="Ranking de participação racial; use a rolagem vertical para ver todas as unidades">
              <Plot
                data={[{
                  type: 'bar',
                  orientation: 'h',
                  x: rankTop.map(item => item.percentual),
                  y: rankTop.map(item => item.unidade),
                  text: rankTop.map(item => `${item.percentual.toFixed(1)}%`),
                  textposition: 'outside',
                  textfont: { family: 'DM Mono, monospace', size: 10, color: '#c2ced7' },
                  cliponaxis: false,
                  customdata: rankTop.map(item => [item.quantidade, item.total]),
                  marker: {
                    color: rankTop.map(item => item.unidade === selectedUnit ? '#e6b84b' : '#4c9bc8'),
                    line: { color: '#dce8ef', width: rankTop.map(item => item.unidade === selectedUnit ? 1.5 : 0) }
                  },
                  hovertemplate: '%{y}<br>Participação: %{x:.2f}%<br>Quantidade: %{customdata[0]:,.0f}<br>Total da população: %{customdata[1]:,.0f}<extra></extra>'
                }]}
                layout={{
                  ...layoutBase,
                  showlegend: false,
                  xaxis: {
                    ...layoutBase.xaxis,
                    title: 'Participação na população da unidade (%)',
                    rangemode: 'tozero',
                    range: rankZoom.xaxis || [0, rankScaleMax],
                    minallowed: 0,
                    maxallowed: rankScaleMax,
                    tickfont: { size: 10.5 }
                  },
                  yaxis: {
                    ...layoutBase.yaxis,
                    title: 'Unidade',
                    automargin: true,
                    autorange: 'reversed',
                    range: rankZoom.yaxis || [rankTop.length - 0.5, -0.5],
                    minallowed: -0.5,
                    maxallowed: rankTop.length - 0.5,
                    tickfont: { size: 10.5 }
                  },
                  margin: { l: 155, r: 45, t: 20, b: 65 },
                  height: rankPlotHeight
                }}
                config={plotConfig}
                style={{ width: '100%', height: rankPlotHeight }}
                useResizeHandler
                onRelayout={evento => zoomEventRanges(evento, rankZoom, {
                  xaxis: { min: 0, max: rankScaleMax, minSpan: Math.max(0.001, rankScaleMax / 100), maxSpan: rankScaleMax },
                  yaxis: { min: -0.5, max: rankTop.length - 0.5, minSpan: 1, maxSpan: rankTop.length, reverse: true }
                }, setRankZoom)}
                onClick={evento => {
                  const unidadeClicada = evento.points?.[0]?.y;
                  if (unidadeClicada) {
                    setSelectedUnit(unidadeClicada);
                    setHeatGroup(rankGroup);
                  }
                }}
              />
            </div>
          </div>
        ) : <Empty>Não há registros para os filtros selecionados.</Empty>}

        <div className="note">
          O percentual de cada barra usa como denominador o total da população selecionada naquela unidade, somando todas
          as categorias raciais e mantendo "Não informada". O eixo se ajusta ao maior valor observado para facilitar a
          comparação de categorias raras; os percentuais não são reescalonados.
        </div>
      </Panel>
    </div>
  );
}
