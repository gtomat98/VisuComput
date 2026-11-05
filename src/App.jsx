import React, { useEffect, useMemo, useState } from 'react';
import { Empty } from './components/Panel';
import HistoricoTab from './components/HistoricoTab';
import CalorTab from './components/CalorTab';
import RankingTab from './components/RankingTab';

export default function App() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('historico');

  const [heatGroup, setHeatGroup] = useState('Alunos');
  const [unitType, setUnitType] = useState('Todos');
  const [rankGroup, setRankGroup] = useState('Alunos');
  const [rankRace, setRankRace] = useState('Preta');
  const [selectedUnit, setSelectedUnit] = useState('');
  const [unitSearch, setUnitSearch] = useState('');

  useEffect(() => {
    fetch('/data/usp.json')
      .then(resposta => {
        if (!resposta.ok) throw new Error('Não foi possível carregar os dados.');
        return resposta.json();
      })
      .then(dadosCarregados => setData(dadosCarregados))
      .catch(erro => setError(erro.message));
  }, []);

  const demografia = data?.demografia || [];
  const historico = data?.historico || [];
  const racas = data?.racas || [];

  const unitTypes = useMemo(() => {
    const tipos = new Set(demografia.map(item => item.tipoUnidade));
    return Array.from(tipos).sort((tipoA, tipoB) => tipoA.localeCompare(tipoB, 'pt-BR'));
  }, [demografia]);

  const units = useMemo(() => {
    const unidadesFiltradas = demografia.filter(item => unitType === 'Todos' || item.tipoUnidade === unitType);
    const listaUnica = Array.from(new Set(unidadesFiltradas.map(item => item.unidade)));
    return listaUnica.sort((unidadeA, unidadeB) => unidadeA.localeCompare(unidadeB, 'pt-BR'));
  }, [demografia, unitType]);

  useEffect(() => {
    if (selectedUnit && !units.includes(selectedUnit)) {
      setSelectedUnit('');
    }
  }, [units, selectedUnit]);

  if (error) {
    return <main className="shell"><Empty>{error}</Empty></main>;
  }

  if (!data) {
    return <main className="shell"><div className="loading">Carregando dados da USP…</div></main>;
  }

  const selectedLabel = selectedUnit
    ? `Unidade selecionada: ${selectedUnit}`
    : 'Nenhuma unidade selecionada';

  const tabsDisponiveis = [
    { id: 'historico', rotulo: 'Evolução histórica' },
    { id: 'calor', rotulo: 'Diversidade por unidade' },
    { id: 'ranking', rotulo: 'Participação racial' }
  ];

  return (
    <main className="shell">
      <header className="main-header">
        <div>
          <div className="eyebrow">USP · ANUÁRIO ESTATÍSTICO</div>
          <h1>Uma leitura visual da comunidade universitária da USP</h1>
        </div>
        <div className="selection-status">
          <span>{selectedLabel}</span>
          {selectedUnit && (
            <button className="ghost" onClick={() => setSelectedUnit('')}>
              Limpar seleção
            </button>
          )}
        </div>
      </header>

      <nav className="tabs" aria-label="Visualizações">
        {tabsDisponiveis.map((aba, indice) => (
          <button
            key={aba.id}
            className={activeTab === aba.id ? 'active' : ''}
            onClick={() => setActiveTab(aba.id)}
          >
            <span className="tab-number">0{indice + 1}</span>
            {aba.rotulo}
          </button>
        ))}
      </nav>

      {activeTab === 'historico' && (
        <HistoricoTab hist={historico} />
      )}

      {activeTab === 'calor' && (
        <CalorTab
          dem={demografia}
          races={racas}
          heatGroup={heatGroup}
          setHeatGroup={setHeatGroup}
          unitType={unitType}
          setUnitType={setUnitType}
          unitTypes={unitTypes}
          selectedUnit={selectedUnit}
          setSelectedUnit={setSelectedUnit}
          unitSearch={unitSearch}
          setUnitSearch={setUnitSearch}
          setRankRace={setRankRace}
          setRankGroup={setRankGroup}
        />
      )}

      {activeTab === 'ranking' && (
        <RankingTab
          dem={demografia}
          races={racas}
          rankGroup={rankGroup}
          setRankGroup={setRankGroup}
          rankRace={rankRace}
          setRankRace={setRankRace}
          unitType={unitType}
          setUnitType={setUnitType}
          unitTypes={unitTypes}
          selectedUnit={selectedUnit}
          setSelectedUnit={setSelectedUnit}
          unitSearch={unitSearch}
          setUnitSearch={setUnitSearch}
          setHeatGroup={setHeatGroup}
        />
      )}

      <footer>
        <span>Fontes: Anuário Estatístico da USP · Tabelas 2.03, 2.10, 2.13, 2.19, 2.20 e 2.21.</span>
        <span>Projeto de Visualização Computacional · 2026/2</span>
      </footer>
    </main>
  );
}
