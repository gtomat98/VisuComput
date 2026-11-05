import React, { useEffect, useMemo, useState } from 'react';
import { Empty } from './components/Panel';
import HistoricoTab from './components/HistoricoTab';
import CalorTab from './components/CalorTab';
import RankingTab from './components/RankingTab';

export default function App() {
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState('');
  const [abaAtiva, setAbaAtiva] = useState('historico');

  const [grupoCalor, setGrupoCalor] = useState('Alunos');
  const [tipoUnidade, setTipoUnidade] = useState('Todos');
  const [grupoRanking, setGrupoRanking] = useState('Alunos');
  const [racaRanking, setRacaRanking] = useState('Preta');
  const [unidadeSelecionada, setUnidadeSelecionada] = useState('');
  const [buscaUnidade, setBuscaUnidade] = useState('');

  useEffect(() => {
    fetch('/data/usp.json')
      .then(resposta => {
        if (!resposta.ok) throw new Error('Não foi possível carregar os dados.');
        return resposta.json();
      })
      .then(dadosCarregados => setDados(dadosCarregados))
      .catch(erro => setErro(erro.message));
  }, []);

  const demografia = dados?.demografia || [];
  const historico = dados?.historico || [];
  const racas = dados?.racas || [];

  const tiposUnidade = useMemo(() => {
    const tipos = new Set(demografia.map(item => item.tipoUnidade));
    return Array.from(tipos).sort((tipoA, tipoB) => tipoA.localeCompare(tipoB, 'pt-BR'));
  }, [demografia]);

  const unidades = useMemo(() => {
    const unidadesFiltradas = demografia.filter(item => tipoUnidade === 'Todos' || item.tipoUnidade === tipoUnidade);
    const listaUnica = Array.from(new Set(unidadesFiltradas.map(item => item.unidade)));
    return listaUnica.sort((unidadeA, unidadeB) => unidadeA.localeCompare(unidadeB, 'pt-BR'));
  }, [demografia, tipoUnidade]);

  useEffect(() => {
    if (unidadeSelecionada && !unidades.includes(unidadeSelecionada)) {
      setUnidadeSelecionada('');
    }
  }, [unidades, unidadeSelecionada]);

  if (erro) {
    return <main className="shell"><Empty>{erro}</Empty></main>;
  }

  if (!dados) {
    return <main className="shell"><div className="loading">Carregando dados da USP…</div></main>;
  }

  const rotuloSelecao = unidadeSelecionada
    ? `Unidade selecionada: ${unidadeSelecionada}`
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
          <span>{rotuloSelecao}</span>
          {unidadeSelecionada && (
            <button className="ghost" onClick={() => setUnidadeSelecionada('')}>
              Limpar seleção
            </button>
          )}
        </div>
      </header>

      <nav className="tabs" aria-label="Visualizações">
        {tabsDisponiveis.map((aba, indice) => (
          <button
            key={aba.id}
            className={abaAtiva === aba.id ? 'active' : ''}
            onClick={() => setAbaAtiva(aba.id)}
          >
            <span className="tab-number">0{indice + 1}</span>
            {aba.rotulo}
          </button>
        ))}
      </nav>

      {abaAtiva === 'historico' && (
        <HistoricoTab historico={historico} />
      )}

      {abaAtiva === 'calor' && (
        <CalorTab
          demografia={demografia}
          racas={racas}
          grupoCalor={grupoCalor}
          setGrupoCalor={setGrupoCalor}
          tipoUnidade={tipoUnidade}
          setTipoUnidade={setTipoUnidade}
          tiposUnidade={tiposUnidade}
          unidadeSelecionada={unidadeSelecionada}
          setUnidadeSelecionada={setUnidadeSelecionada}
          buscaUnidade={buscaUnidade}
          setBuscaUnidade={setBuscaUnidade}
          setRacaRanking={setRacaRanking}
          setGrupoRanking={setGrupoRanking}
        />
      )}

      {abaAtiva === 'ranking' && (
        <RankingTab
          demografia={demografia}
          racas={racas}
          grupoRanking={grupoRanking}
          setGrupoRanking={setGrupoRanking}
          racaRanking={racaRanking}
          setRacaRanking={setRacaRanking}
          tipoUnidade={tipoUnidade}
          setTipoUnidade={setTipoUnidade}
          tiposUnidade={tiposUnidade}
          unidadeSelecionada={unidadeSelecionada}
          setUnidadeSelecionada={setUnidadeSelecionada}
          buscaUnidade={buscaUnidade}
          setBuscaUnidade={setBuscaUnidade}
          setGrupoCalor={setGrupoCalor}
        />
      )}

      <footer>
        <span>Fontes: Anuário Estatístico da USP · Tabelas 2.03, 2.10, 2.13, 2.19, 2.20 e 2.21.</span>
        <span>Projeto de Visualização Computacional · 2026/2</span>
      </footer>
    </main>
  );
}
