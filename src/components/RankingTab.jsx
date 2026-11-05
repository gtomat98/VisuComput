import React, { useEffect, useMemo, useState } from 'react';
import Plot from 'react-plotly.js';
import { Panel, Empty } from './Panel';
import { Field, SearchField } from './Field';
import { GROUPS } from '../constants';
import { layoutBase, plotConfig, atualizarIntervalosZoom, calcularPercentual, normalizarBusca } from '../utils';

export default function RankingTab({
  demografia,
  racas,
  grupoRanking,
  setGrupoRanking,
  racaRanking,
  setRacaRanking,
  tipoUnidade,
  setTipoUnidade,
  tiposUnidade,
  unidadeSelecionada,
  setUnidadeSelecionada,
  buscaUnidade,
  setBuscaUnidade,
  setGrupoCalor
}) {
  const [zoomRanking, setRankZoom] = useState({});

  useEffect(() => {
    setRankZoom({});
  }, [grupoRanking, racaRanking, tipoUnidade, unidadeSelecionada]);

  const ranking = useMemo(() => {
    const termoBusca = normalizarBusca(buscaUnidade);

    const filtrados = demografia.filter(registro => {
      if (registro.grupo !== grupoRanking) return false;
      if (tipoUnidade !== 'Todos' && registro.tipoUnidade !== tipoUnidade) return false;
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
      if (linha.raca === racaRanking) {
        acumulador.raca += quantidade;
      }
    }

    const resultado = [];
    for (const [unidade, contagem] of mapaTotais.entries()) {
      const percentual = calcularPercentual(contagem.raca, contagem.total);
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
  }, [demografia, grupoRanking, racaRanking, tipoUnidade, buscaUnidade]);

  const maiorPercentual = Math.max(0.01, ...ranking.map(item => item.percentual)) * 1.14;
  const alturaGrafico = Math.max(540, ranking.length * 28 + 90);

  return (
    <div className="content">
      <div className="section-title">
        <div>
          <h2>Participação racial por unidade</h2>
          <p>Compare a participação percentual de uma categoria racial entre as unidades. 'Todos' reúne todas as categorias de unidade.</p>
        </div>
        <div className="filters filters-ranking">
          <Field label="População">
            <select value={grupoRanking} onChange={evento => setGrupoRanking(evento.target.value)}>
              {GROUPS.map(grupo => <option key={grupo}>{grupo}</option>)}
            </select>
          </Field>
          <Field label="Raça/cor">
            <select value={racaRanking} onChange={evento => setRacaRanking(evento.target.value)}>
              {racas.map(raca => <option key={raca}>{raca}</option>)}
            </select>
          </Field>
          <Field label="Categoria de unidade">
            <select value={tipoUnidade} onChange={evento => setTipoUnidade(evento.target.value)}>
              <option value="Todos">Todos</option>
              {tiposUnidade.map(tipo => <option key={tipo}>{tipo}</option>)}
            </select>
          </Field>
          <SearchField value={buscaUnidade} onChange={setBuscaUnidade} />
        </div>
      </div>

      <Panel
        title={`${racaRanking} · ${grupoRanking}`}
        sub="Ordenado da maior para a menor participação. Clique em uma barra para selecionar a unidade e localizá-la no mapa de calor."
      >
        {ranking.length ? (
          <div className="ranking-wrapper">
            <div className="ranking-scroll" role="region" aria-label="Ranking de participação racial; use a rolagem vertical para ver todas as unidades">
              <Plot
                data={[{
                  type: 'bar',
                  orientation: 'h',
                  x: ranking.map(item => item.percentual),
                  y: ranking.map(item => item.unidade),
                  text: ranking.map(item => `${item.percentual.toFixed(1)}%`),
                  textposition: 'outside',
                  textfont: { family: 'DM Mono, monospace', size: 10, color: '#c2ced7' },
                  cliponaxis: false,
                  customdata: ranking.map(item => [item.quantidade, item.total]),
                  marker: {
                    color: ranking.map(item => item.unidade === unidadeSelecionada ? '#e6b84b' : '#4c9bc8'),
                    line: { color: '#dce8ef', width: ranking.map(item => item.unidade === unidadeSelecionada ? 1.5 : 0) }
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
                    range: zoomRanking.xaxis || [0, maiorPercentual],
                    minallowed: 0,
                    maxallowed: maiorPercentual,
                    tickfont: { size: 10.5 }
                  },
                  yaxis: {
                    ...layoutBase.yaxis,
                    title: 'Unidade',
                    automargin: true,
                    autorange: 'reversed',
                    range: zoomRanking.yaxis || [ranking.length - 0.5, -0.5],
                    minallowed: -0.5,
                    maxallowed: ranking.length - 0.5,
                    tickfont: { size: 10.5 }
                  },
                  margin: { l: 155, r: 45, t: 20, b: 65 },
                  height: alturaGrafico
                }}
                config={plotConfig}
                style={{ width: '100%', height: alturaGrafico }}
                useResizeHandler
                onRelayout={evento => atualizarIntervalosZoom(evento, zoomRanking, {
                  xaxis: { min: 0, max: maiorPercentual, minSpan: Math.max(0.001, maiorPercentual / 100), maxSpan: maiorPercentual },
                  yaxis: { min: -0.5, max: ranking.length - 0.5, minSpan: 1, maxSpan: ranking.length, reverse: true }
                }, setRankZoom)}
                onClick={evento => {
                  const unidadeClicada = evento.points?.[0]?.y;
                  if (unidadeClicada) {
                    setUnidadeSelecionada(unidadeClicada);
                    setGrupoCalor(grupoRanking);
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
