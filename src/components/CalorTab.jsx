import React, { useEffect, useMemo, useState } from 'react';
import Plot from 'react-plotly.js';
import { Panel, Empty } from './Panel';
import { Field, SearchField } from './Field';
import HeatmapLegend from './HeatmapLegend';
import { GRUPOS } from '../constants';
import { layoutBase, plotConfig, atualizarIntervalosZoom, somar, calcularPercentual, normalizarBusca } from '../utils';

export default function CalorTab({
  demografia,
  racas,
  grupoCalor,
  setGrupoCalor,
  tipoUnidade,
  setTipoUnidade,
  tiposUnidade,
  unidadeSelecionada,
  setUnidadeSelecionada,
  buscaUnidade,
  setBuscaUnidade,
  setRacaRanking,
  setGrupoRanking
}) {
  const [zoomMapa, setZoomMapa] = useState({});

  useEffect(() => {
    setZoomMapa({});
  }, [grupoCalor, tipoUnidade, unidadeSelecionada]);

  const dadosMapa = useMemo(() => {
    const termoBusca = normalizarBusca(buscaUnidade);

    const filtrados = demografia.filter(registro => {
      if (registro.grupo !== grupoCalor) return false;
      if (tipoUnidade !== 'Todos' && registro.tipoUnidade !== tipoUnidade) return false;
      if (termoBusca && !registro.unidade.toLocaleLowerCase('pt-BR').includes(termoBusca)) return false;
      return true;
    });

    let listaUnidades = Array.from(new Set(filtrados.map(registro => registro.unidade))).sort(
      (unidadeA, unidadeB) => unidadeA.localeCompare(unidadeB, 'pt-BR')
    );

    if (unidadeSelecionada && listaUnidades.includes(unidadeSelecionada)) {
      listaUnidades = [unidadeSelecionada, ...listaUnidades.filter(unidade => unidade !== unidadeSelecionada)];
    }

    const mapaPorUnidade = new Map();
    for (const linha of filtrados) {
      if (!mapaPorUnidade.has(linha.unidade)) {
        mapaPorUnidade.set(linha.unidade, []);
      }
      mapaPorUnidade.get(linha.unidade).push(linha);
    }

    const matrizZ = racas.map(racaAtual => {
      return listaUnidades.map(unidadeAtual => {
        const registros = mapaPorUnidade.get(unidadeAtual) || [];
        const totalUnidade = somar(registros.map(item => item.total));
        const totalRaca = somar(registros.filter(item => item.raca === racaAtual).map(item => item.total));
        return calcularPercentual(totalRaca, totalUnidade);
      });
    });

    return { unidades: listaUnidades, valores: matrizZ, registrosPorUnidade: mapaPorUnidade };
  }, [demografia, grupoCalor, tipoUnidade, unidadeSelecionada, racas, buscaUnidade]);

  const maiorPercentual = Math.max(0.01, ...dadosMapa.valores.flat().filter(valor => Number.isFinite(valor)));

  return (
    <div className="content">
      <div className="section-title">
        <div>
          <h2>Diversidade racial por unidade</h2>
          <p>Explore a participação de cada categoria racial por população e unidade. 'Todos' reúne todas as categorias de unidade.</p>
        </div>
        <div className="filters">
          <Field label="População">

            <select value={grupoCalor} onChange={evento => setGrupoCalor(evento.target.value)}>
              {GROUPS.map(grupo => <option key={grupo}>{grupo}</option>)}
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
        title="Mapa de calor · participação percentual"
        sub="Clique em uma célula para selecionar a unidade e a categoria racial. A unidade selecionada também será destacada no ranking."
      >
        {dadosMapa.unidades.length ? (
          <div className="heatmap-wrapper">
            <div className="heatmap-scroll" role="region" aria-label="Mapa de calor; use a rolagem horizontal para ver todas as unidades">
              <Plot
                data={[{
                  type: 'heatmap',
                  x: dadosMapa.unidades,
                  y: racas,
                  z: dadosMapa.valores,
                  colorscale: [[0, '#14283a'], [0.35, '#285b78'], [0.7, '#4d91a8'], [1, '#e6b84b']],
                  zmin: 0,
                  zmax: maiorPercentual,
                  showscale: false,
                  customdata: racas.map(raca => dadosMapa.unidades.map(unidade => {
                    const registros = dadosMapa.registrosPorUnidade.get(unidade) || [];
                    const totalGeral = somar(registros.map(item => item.total));
                    const totalRaca = somar(registros.filter(item => item.raca === raca).map(item => item.total));
                    return [totalRaca, totalGeral];
                  })),
                  hovertemplate: 'Unidade: %{x}<br>Raça/cor: %{y}<br>Participação: %{z:.2f}%<br>Quantidade: %{customdata[0]:,.0f}<br>Total da população: %{customdata[1]:,.0f}<extra></extra>'
                }]}
                layout={{
                  ...layoutBase,
                  autosize: false,
                  width: Math.max(900, dadosMapa.unidades.length * 48 + 140),
                  height: 570,
                  xaxis: {
                    ...layoutBase.xaxis,
                    title: 'Unidade',
                    tickangle: -45,
                    automargin: false,
                    tickvals: dadosMapa.unidades,
                    ticktext: dadosMapa.unidades.map(nome => nome.length > 36 ? nome.slice(0, 34) + '…' : nome),
                    tickfont: { size: 10.5 },
                    range: zoomMapa.xaxis || [-0.5, dadosMapa.unidades.length - 0.5],
                    minallowed: -0.5,
                    maxallowed: dadosMapa.unidades.length - 0.5
                  },
                  yaxis: {
                    ...layoutBase.yaxis,
                    title: 'Raça/cor',
                    automargin: false,
                    tickfont: { size: 11 },
                    range: zoomMapa.yaxis || [-0.5, racas.length - 0.5],
                    minallowed: -0.5,
                    maxallowed: racas.length - 0.5
                  },
                  margin: { l: 115, r: 35, t: 25, b: 200 }
                }}
                config={plotConfig}
                style={{ width: Math.max(900, dadosMapa.unidades.length * 48 + 140), height: 570 }}
                useResizeHandler
                onRelayout={evento => atualizarIntervalosZoom(evento, zoomMapa, {
                  xaxis: { min: -0.5, max: dadosMapa.unidades.length - 0.5, minSpan: 1, maxSpan: dadosMapa.unidades.length },
                  yaxis: { min: -0.5, max: racas.length - 0.5, minSpan: 1, maxSpan: racas.length }
                }, setZoomMapa)}
                onClick={evento => {
                  const pontoClicado = evento.points?.[0];
                  if (pontoClicado) {
                    setUnidadeSelecionada(pontoClicado.x);
                    setRacaRanking(pontoClicado.y);
                    setGrupoRanking(grupoCalor);
                  }
                }}
              />
            </div>
            <HeatmapLegend max={maiorPercentual} />
          </div>
        ) : <Empty>Não há dados para os filtros selecionados.</Empty>}

        <div className="note">
          Percentual calculado como quantidade da categoria racial ÷ total de registros da mesma população e unidade.
          "Não informada" é mantida no denominador. A escala de cores se ajusta ao maior percentual observado no filtro
          atual para evidenciar diferenças entre categorias pouco frequentes.
        </div>
      </Panel>
    </div>
  );
}
