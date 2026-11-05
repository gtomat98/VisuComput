import React, { useEffect, useMemo, useState } from 'react';
import Plot from 'react-plotly.js';
import { Panel, Empty } from './Panel';
import { Field, SearchField } from './Field';
import HeatmapLegend from './HeatmapLegend';
import { GROUPS } from '../constants';
import { layoutBase, plotConfig, zoomEventRanges, sum, pctOf, normalizeSearch } from '../utils';

export default function CalorTab({
  dem,
  races,
  heatGroup,
  setHeatGroup,
  unitType,
  setUnitType,
  unitTypes,
  selectedUnit,
  setSelectedUnit,
  unitSearch,
  setUnitSearch,
  setRankRace,
  setRankGroup
}) {
  const [heatZoom, setHeatZoom] = useState({});

  useEffect(() => {
    setHeatZoom({});
  }, [heatGroup, unitType, selectedUnit]);

  const heat = useMemo(() => {
    const termoBusca = normalizeSearch(unitSearch);

    const filtrados = dem.filter(registro => {
      if (registro.grupo !== heatGroup) return false;
      if (unitType !== 'Todos' && registro.tipoUnidade !== unitType) return false;
      if (termoBusca && !registro.unidade.toLocaleLowerCase('pt-BR').includes(termoBusca)) return false;
      return true;
    });

    let listaUnidades = Array.from(new Set(filtrados.map(registro => registro.unidade))).sort(
      (unidadeA, unidadeB) => unidadeA.localeCompare(unidadeB, 'pt-BR')
    );

    if (selectedUnit && listaUnidades.includes(selectedUnit)) {
      listaUnidades = [selectedUnit, ...listaUnidades.filter(unidade => unidade !== selectedUnit)];
    }

    const mapaPorUnidade = new Map();
    for (const linha of filtrados) {
      if (!mapaPorUnidade.has(linha.unidade)) {
        mapaPorUnidade.set(linha.unidade, []);
      }
      mapaPorUnidade.get(linha.unidade).push(linha);
    }

    const matrizZ = races.map(racaAtual => {
      return listaUnidades.map(unidadeAtual => {
        const registros = mapaPorUnidade.get(unidadeAtual) || [];
        const totalUnidade = sum(registros.map(item => item.total));
        const totalRaca = sum(registros.filter(item => item.raca === racaAtual).map(item => item.total));
        return pctOf(totalRaca, totalUnidade);
      });
    });

    return { us: listaUnidades, z: matrizZ, dadosUnidade: mapaPorUnidade };
  }, [dem, heatGroup, unitType, selectedUnit, races, unitSearch]);

  const heatScaleMax = Math.max(0.01, ...heat.z.flat().filter(valor => Number.isFinite(valor)));

  return (
    <div className="content">
      <div className="section-title">
        <div>
          <h2>Diversidade racial por unidade</h2>
          <p>Explore a participação de cada categoria racial por população e unidade. 'Todos' reúne todas as categorias de unidade.</p>
        </div>
        <div className="filters">
          <Field label="População">

            <select value={heatGroup} onChange={evento => setHeatGroup(evento.target.value)}>
              {GROUPS.map(grupo => <option key={grupo}>{grupo}</option>)}
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
        title="Mapa de calor · participação percentual"
        sub="Clique em uma célula para selecionar a unidade e a categoria racial. A unidade selecionada também será destacada no ranking."
      >
        {heat.us.length ? (
          <div className="heatmap-wrapper">
            <div className="heatmap-scroll" role="region" aria-label="Mapa de calor; use a rolagem horizontal para ver todas as unidades">
              <Plot
                data={[{
                  type: 'heatmap',
                  x: heat.us,
                  y: races,
                  z: heat.z,
                  colorscale: [[0, '#14283a'], [0.35, '#285b78'], [0.7, '#4d91a8'], [1, '#e6b84b']],
                  zmin: 0,
                  zmax: heatScaleMax,
                  showscale: false,
                  customdata: races.map(raca => heat.us.map(unidade => {
                    const registros = heat.dadosUnidade.get(unidade) || [];
                    const totalGeral = sum(registros.map(item => item.total));
                    const totalRaca = sum(registros.filter(item => item.raca === raca).map(item => item.total));
                    return [totalRaca, totalGeral];
                  })),
                  hovertemplate: 'Unidade: %{x}<br>Raça/cor: %{y}<br>Participação: %{z:.2f}%<br>Quantidade: %{customdata[0]:,.0f}<br>Total da população: %{customdata[1]:,.0f}<extra></extra>'
                }]}
                layout={{
                  ...layoutBase,
                  autosize: false,
                  width: Math.max(900, heat.us.length * 48 + 140),
                  height: 570,
                  xaxis: {
                    ...layoutBase.xaxis,
                    title: 'Unidade',
                    tickangle: -45,
                    automargin: false,
                    tickvals: heat.us,
                    ticktext: heat.us.map(nome => nome.length > 36 ? nome.slice(0, 34) + '…' : nome),
                    tickfont: { size: 10.5 },
                    range: heatZoom.xaxis || [-0.5, heat.us.length - 0.5],
                    minallowed: -0.5,
                    maxallowed: heat.us.length - 0.5
                  },
                  yaxis: {
                    ...layoutBase.yaxis,
                    title: 'Raça/cor',
                    automargin: false,
                    tickfont: { size: 11 },
                    range: heatZoom.yaxis || [-0.5, races.length - 0.5],
                    minallowed: -0.5,
                    maxallowed: races.length - 0.5
                  },
                  margin: { l: 115, r: 35, t: 25, b: 200 }
                }}
                config={plotConfig}
                style={{ width: Math.max(900, heat.us.length * 48 + 140), height: 570 }}
                useResizeHandler
                onRelayout={evento => zoomEventRanges(evento, heatZoom, {
                  xaxis: { min: -0.5, max: heat.us.length - 0.5, minSpan: 1, maxSpan: heat.us.length },
                  yaxis: { min: -0.5, max: races.length - 0.5, minSpan: 1, maxSpan: races.length }
                }, setHeatZoom)}
                onClick={evento => {
                  const pontoClicado = evento.points?.[0];
                  if (pontoClicado) {
                    setSelectedUnit(pontoClicado.x);
                    setRankRace(pontoClicado.y);
                    setRankGroup(heatGroup);
                  }
                }}
              />
            </div>
            <HeatmapLegend max={heatScaleMax} />
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
