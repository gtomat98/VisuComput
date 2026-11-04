import React, {useEffect, useMemo, useState} from 'react';
import Plot from 'react-plotly.js';

const GROUPS = ['Alunos','Docentes','Servidores'];
const RACE_COLORS = {
  'Amarela':'#e6b84b','Branca':'#d8e2eb','Indígena':'#8b6db0',
  'Parda':'#d28a55','Preta':'#b84c58','Não informada':'#71869a'
};
const HIST_GROUPS = ['Alunos de graduação','Alunos de pós-graduação','Docentes','Servidores técnicos-administrativos'];
const HIST_COLORS = {
  'Alunos de graduação': '#e6b84b',
  'Alunos de pós-graduação': '#53b6a8',
  'Docentes': '#8c9fe8',
  'Servidores técnicos-administrativos': '#d77d78'
};
const HIST_COLORS_MUTED = {
  'Alunos de graduação': '#8e8467',
  'Alunos de pós-graduação': '#4a6d67',
  'Docentes': '#586282',
  'Servidores técnicos-administrativos': '#7e5a58'
};

const HISTORIC_MILESTONES = [
  { year: 1989, label: '1989 · Início da série' },
  { year: 2012, label: '2012 · Lei Federal de Cotas' },
  { year: 2017, label: '2017 · Adoção de Cotas USP' },
  { year: 2020, label: '2020 · Pandemia COVID-19' }
];

const fmt = n => n == null ? '—' : new Intl.NumberFormat('pt-BR').format(n);
const sum = arr => arr.reduce((a,b)=>a+(Number(b)||0),0);
const pctOf = (n,d) => d ? n/d*100 : null;
const layoutBase = {
  autosize:true, paper_bgcolor:'rgba(0,0,0,0)', plot_bgcolor:'rgba(0,0,0,0)',
  font:{family:'Inter, Arial, sans-serif',color:'#d7e1ea',size:12},
  margin:{l:65,r:28,t:24,b:62}, hoverlabel:{bgcolor:'#142638',font:{color:'#fff'}},
  xaxis:{gridcolor:'#26394b',zerolinecolor:'#60758a'},
  yaxis:{gridcolor:'#26394b',zerolinecolor:'#60758a'}
};
const cfg = {responsive:true,displaylogo:false,scrollZoom:true,modeBarButtonsToAdd:['select2d','lasso2d']};
function clampZoomRange(range, min, max, minSpan, maxSpan, reverse=false) {
  if (!Array.isArray(range) || range.length !== 2) return null;
  let a = Number(range[0]), b = Number(range[1]);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  if (a > b) [a,b] = [b,a];
  const center = (a+b)/2;
  let span = b-a;
  span = Math.max(minSpan, Math.min(maxSpan, span));
  a = center-span/2;
  b = center+span/2;
  if (a < min) { b += min-a; a = min; }
  if (b > max) { a -= b-max; b = max; }
  a = Math.max(min,a); b = Math.min(max,b);
  return reverse ? [b,a] : [a,b];
}
function zoomEventRanges(event, current, specs, setter) {
  const next = {...current};
  let changed = false;
  for (const axis of ['xaxis','yaxis']) {
    if (event[`${axis}.autorange`] === true) {
      if (next[axis]) { delete next[axis]; changed = true; }
      continue;
    }
    const pair = event[`${axis}.range`];
    const a = event[`${axis}.range[0]`] ?? (Array.isArray(pair) ? pair[0] : undefined);
    const b = event[`${axis}.range[1]`] ?? (Array.isArray(pair) ? pair[1] : undefined);
    if (a !== undefined && b !== undefined) {
      const spec = specs[axis];
      const clamped = clampZoomRange([a,b],spec.min,spec.max,spec.minSpan,spec.maxSpan,!!spec.reverse);
      if (clamped) { next[axis] = clamped; changed = true; }
    }
  }
  if (changed) setter(next);
}

function Panel({title,sub,children}) {return <section className="panel"><div className="panel-head"><div><h2>{title}</h2><p>{sub}</p></div></div>{children}</section>}
function Empty({children}) {return <div className="empty">{children}</div>}
function Field({label,children}) {return <label className="field"><span>{label}</span>{children}</label>}

function SearchField({value, onChange, placeholder = "Digite o nome da unidade..."}) {
  return (
    <div className="field unit-search">
      <span>Pesquisar unidade</span>
      <div className="search-input">
        <svg className="search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
        />
        {value && (
          <button
            type="button"
            className="search-clear-btn"
            onClick={() => onChange('')}
            title="Limpar pesquisa"
            aria-label="Limpar pesquisa"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}

function HeatmapLegend({ max }) {
  const safeMax = Math.max(0.01, max || 0);
  const steps = [1, 0.75, 0.5, 0.25, 0];

  return (
    <aside className="heatmap-legend-card" aria-label="Legenda de participação percentual">
      <div className="heatmap-legend-title">Participação</div>
      <div className="heatmap-legend-body">
        <div className="heatmap-legend-bar" />
        <div className="heatmap-legend-ticks">
          {steps.map(step => {
            const val = safeMax * step;
            const formatted = val >= 10 ? `${val.toFixed(1)}%` : val > 0 ? `${val.toFixed(2)}%` : '0%';
            return (
              <div key={step} className="heatmap-legend-tick">
                <span className="tick-mark" />
                <span className="tick-label">{formatted}</span>
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
}

function RatioOverlay({
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
    const numName = selectedLines[0];
    const numColor = colors[numName] || '#e6b84b';
    return (
      <aside className="ratio-overlay-card ratio-overlay-step1" aria-label="Selecione o denominador">
        <div className="ratio-badge-row">
          <span className="ratio-step-badge">Filtro por Ratio · Passo 2 de 2</span>
          <button type="button" className="ratio-mini-text-btn" onClick={onClear}>Trocar linha</button>
        </div>
        <div className="ratio-instruction">
          Numerador definido:{' '}
          <span className="ratio-inline-pill" style={{ borderColor: numColor, color: numColor }}>
            ● {numName}
          </span>
          <br />
          Agora passe o mouse e clique na <b>2ª linha</b> para definir o <b>Denominador</b>.
        </div>
      </aside>
    );
  }

  const [numName, denName] = selectedLines;
  const numColor = colors[numName] || '#e6b84b';
  const denColor = colors[denName] || '#53b6a8';

  const refYear = year >= yearStart && year <= yearEnd ? year : yearEnd;
  const numVal = hist.find(d => d.grupo === numName && d.ano === refYear)?.total || 0;
  const denVal = hist.find(d => d.grupo === denName && d.ano === refYear)?.total || 0;
  const ratio = denVal > 0 ? (numVal / denVal) : null;

  const shortLabel = name => {
    if (name.includes('graduação') && !name.includes('pós')) return 'alunos de graduação';
    if (name.includes('pós')) return 'alunos de pós';
    if (name.includes('Docentes')) return 'docentes';
    if (name.includes('Servidores')) return 'servidores';
    return name.toLowerCase();
  };

  const formattedRatio = ratio != null
    ? (ratio < 0.1 ? ratio.toFixed(3) : ratio.toFixed(2))
    : '—';

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
        <div className="ratio-term" style={{ borderColor: numColor }}>
          <span className="ratio-role-label">NUMERADOR (1º)</span>
          <span className="ratio-term-name" style={{ color: numColor }}>{numName}</span>
        </div>
        <span className="ratio-div-sym" aria-hidden="true">÷</span>
        <div className="ratio-term" style={{ borderColor: denColor }}>
          <span className="ratio-role-label">DENOMINADOR (2º)</span>
          <span className="ratio-term-name" style={{ color: denColor }}>{denName}</span>
        </div>
      </div>

      <div className="ratio-calc-summary">
        <div className="ratio-main-metric">
          <span className="ratio-result-num">{formattedRatio}</span>
          <span className="ratio-result-text">
            {shortLabel(numName)} por {shortLabel(denName).replace(/s$/, '')}
          </span>
        </div>
        <div className="ratio-meta-info">
          <span className="ratio-year-tag">Ano {refYear}</span>
          <span className="ratio-raw-vals">
            ({fmt(numVal)} ÷ {fmt(denVal)})
          </span>
        </div>
      </div>
    </aside>
  );
}

export default function App(){
 const [data,setData]=useState(null);
 const [error,setError]=useState('');
 const [tab,setTab]=useState('historico');
 const [historicMode,setHistoricMode]=useState('absoluto');
 const [baseYear,setBaseYear]=useState(1989);
 const [ratioSelectedLines,setRatioSelectedLines]=useState([]);
 const [ratioHoverYear,setRatioHoverYear]=useState(null);
 const [hoveredLine,setHoveredLine]=useState(null);
 const [yearStart,setYearStart]=useState(1989);
 const [yearEnd,setYearEnd]=useState(2025);
 const [heatGroup,setHeatGroup]=useState('Alunos');
 const [unitType,setUnitType]=useState('Todos');
 const [rankGroup,setRankGroup]=useState('Alunos');
 const [rankRace,setRankRace]=useState('Preta');
 const [selectedUnit,setSelectedUnit]=useState('');
 const [unitSearch,setUnitSearch]=useState('');
 const [historicZoom,setHistoricZoom]=useState({});
 const [heatZoom,setHeatZoom]=useState({});
 const [rankZoom,setRankZoom]=useState({});

 useEffect(()=>{
   fetch('/data/usp.json').then(r=>{if(!r.ok)throw new Error('Não foi possível carregar os dados.');return r.json()}).then(setData).catch(e=>setError(e.message));
 },[]);

 const dem=data?.demografia||[];
 const hist=data?.historico||[];
 const evo=data?.evolucaoUnidade||[];
 const races=data?.racas||[];
 const unitTypes=useMemo(()=>[...new Set(dem.map(d=>d.tipoUnidade))].sort((a,b)=>a.localeCompare(b,'pt-BR')),[dem]);
 const units=useMemo(()=>[...new Set(dem.filter(d=>unitType==='Todos'||d.tipoUnidade===unitType).map(d=>d.unidade))].sort((a,b)=>a.localeCompare(b,'pt-BR')),[dem,unitType]);
 const searchedUnits=useMemo(()=>units.filter(u=>u.toLocaleLowerCase('pt-BR').includes(unitSearch.trim().toLocaleLowerCase('pt-BR'))),[units,unitSearch]);
 useEffect(()=>{if(selectedUnit && !units.includes(selectedUnit))setSelectedUnit('')},[units,selectedUnit]);
 useEffect(()=>setHistoricZoom({}),[yearStart,yearEnd,historicMode,baseYear,ratioSelectedLines]);
 useEffect(()=>setHeatZoom({}),[heatGroup,unitType,selectedUnit]);
 useEffect(()=>setRankZoom({}),[rankGroup,rankRace,unitType,selectedUnit]);

 // Série histórica: dados populacionais de cada grupo
 const historical=useMemo(()=>HIST_GROUPS.map(g=>{
   const all=hist.filter(d=>d.grupo===g&&d.total!=null).sort((a,b)=>a.ano-b.ano);
   const baseObj=all.find(d=>d.ano===baseYear)||all.find(d=>d.ano>=yearStart)||all[0];
   const base=baseObj?.total;
   const rows=all.filter(d=>d.ano>=yearStart&&d.ano<=yearEnd);
   return {
     name:g,
     x:rows.map(d=>d.ano),
     y:rows.map(d=>historicMode==='indice'&&base?(d.total/base)*100:d.total)
   };
 }),[hist,yearStart,yearEnd,historicMode,baseYear]);

 // Limite dinâmico superior do eixo Y para a série ativa no período visível
 const historicMaxY=useMemo(()=>{
   let max=0;
   historical.forEach(s=>{
     s.y.forEach(val=>{
       if(Number.isFinite(val)&&val>max)max=val;
     });
   });
   return max>0?max*1.08:(historicMode==='indice'?120:1000);
 },[historical,historicMode]);

 // Teto máximo permitido para zoom out sem bloqueio indevido
 const historicMaxLimit=useMemo(()=>{
   return Math.max(historicMaxY*1.5,(historicMode==='indice'?500:70000));
 },[historicMaxY,historicMode]);

 // Manipulador de seleção de linhas para o Ratio Dinâmico
 const handleRatioLineSelect=(lineName)=>{
   if(!lineName||!HIST_GROUPS.includes(lineName))return;
   setRatioSelectedLines(prev=>{
     if(prev.length===0){
       return [lineName];
     }
     if(prev.length===1){
       if(prev[0]===lineName) return [];
       return [prev[0],lineName];
     }
     if(prev.includes(lineName)){
       return [lineName];
     }
     return [prev[0],lineName];
   });
 };

 const handleInvertRatio=()=>{
   if(ratioSelectedLines.length===2){
     setRatioSelectedLines([ratioSelectedLines[1],ratioSelectedLines[0]]);
   }
 };

 const handleClearRatio=()=>{
   setRatioSelectedLines([]);
 };

 // Heatmap: percentual da raça dentro do total da população de cada unidade.
 const heat=useMemo(()=>{
   const rows=dem.filter(d=>d.grupo===heatGroup&&(unitType==='Todos'||d.tipoUnidade===unitType)&&(!unitSearch.trim()||d.unidade.toLocaleLowerCase('pt-BR').includes(unitSearch.trim().toLocaleLowerCase('pt-BR'))));
   let us=[...new Set(rows.map(d=>d.unidade))].sort((a,b)=>a.localeCompare(b,'pt-BR'));
   if(selectedUnit && us.includes(selectedUnit)) us=[selectedUnit,...us.filter(u=>u!==selectedUnit)];
   const z=races.map(r=>us.map(u=>{
     const ur=rows.filter(d=>d.unidade===u);
     const denominator=sum(ur.map(d=>d.total));
     const numerator=sum(ur.filter(d=>d.raca===r).map(d=>d.total));
     return pctOf(numerator,denominator);
   }));
   return {us,z};
 },[dem,heatGroup,unitType,selectedUnit,races,unitSearch]);

 // Ranking: a participação é calculada dentro de cada unidade e população selecionada.
 const heatScaleMax=Math.max(0.01,...heat.z.flat().filter(v=>Number.isFinite(v)));

 const ranking=useMemo(()=>{
   const rows=dem.filter(d=>d.grupo===rankGroup&&(unitType==='Todos'||d.tipoUnidade===unitType)&&(!unitSearch.trim()||d.unidade.toLocaleLowerCase('pt-BR').includes(unitSearch.trim().toLocaleLowerCase('pt-BR'))));
   const byUnit=new Map();
   rows.forEach(d=>{
     if(!byUnit.has(d.unidade))byUnit.set(d.unidade,{total:0,race:0});
     const item=byUnit.get(d.unidade);
     item.total+=Number(d.total)||0;
     if(d.raca===rankRace)item.race+=Number(d.total)||0;
   });
   return [...byUnit.entries()].map(([unidade,v])=>({
     unidade, total:v.total, quantidade:v.race, percentual:pctOf(v.race,v.total)
   })).filter(d=>d.percentual!=null).sort((a,b)=>b.percentual-a.percentual||a.unidade.localeCompare(b.unidade,'pt-BR'));
 },[dem,rankGroup,rankRace,unitType,unitSearch]);


 if(error)return <main className="shell"><Empty>{error}</Empty></main>;
 if(!data)return <main className="shell"><div className="loading">Carregando dados da USP…</div></main>;
 const selectUnit=u=>setSelectedUnit(u);
 const selectedLabel=selectedUnit?`Unidade selecionada: ${selectedUnit}`:'Nenhuma unidade selecionada';
 const rankTop=ranking.slice(0,ranking.length);
 const rankScaleMax=Math.max(0.01,...rankTop.map(d=>d.percentual))*1.14;
 const rankPlotHeight=Math.max(540, rankTop.length * 28 + 90);

 return <main className="shell">
   <header className="main-header">
     <div><div className="eyebrow">USP · ANUÁRIO ESTATÍSTICO</div><h1>Uma leitura visual da comunidade universitária da USP</h1></div>
     <div className="selection-status"><span>{selectedLabel}</span>{selectedUnit&&<button className="ghost" onClick={()=>setSelectedUnit('')}>Limpar seleção</button>}</div>
   </header>
   <nav className="tabs" aria-label="Visualizações">
     {[
       ['historico','Evolução histórica'],['calor','Diversidade por unidade'],
       ['ranking','Participação racial']
     ].map(([id,label],i)=><button key={id} className={tab===id?'active':''} onClick={()=>setTab(id)}><span className="tab-number">0{i+1}</span>{label}</button>)}
   </nav>

   {tab==='historico'&&<div className="content">
     <div className="section-title">
       <div>
         <h2>Evolução histórica</h2>
         <p>Acompanhe a trajetória da comunidade da USP por contingente absoluto, índice relativo ou ratio dinâmico.</p>
       </div>
       <div className="filters">
         <Field label="Modo de análise">
           <select value={historicMode} onChange={e=>{setHistoricMode(e.target.value);if(e.target.value!=='razao'){setRatioSelectedLines([]);setHoveredLine(null);}}}>
             <option value="absoluto">Números absolutos</option>
             <option value="indice">Índice relativo (Ano-base dinâmico)</option>
             <option value="razao">Filtro dinâmico por Ratio (Selecione 2 linhas)</option>
           </select>
         </Field>
         {historicMode==='indice'&&(
           <Field label="Ano-base (100)">
             <select value={baseYear} onChange={e=>setBaseYear(+e.target.value)}>
               {Array.from({length:2025-1989+1},(_,i)=>1989+i).map(y=>(
                 <option key={y} value={y}>{y}</option>
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
       {historicMode==='absoluto'&&(
         <div className="historic-toolbar-slot" role="toolbar" aria-label="Atalhos rápidos de período">
           <span className="slot-title">Atalhos de período:</span>
           <div className="slot-chips">
             {[
               { start: 1989, end: 2000, label: '1989–2000 · Anos 90' },
               { start: 2000, end: 2010, label: '2000–2010 · Expansão' },
               { start: 2010, end: 2020, label: '2010–2020 · Consolidação' },
               { start: 1989, end: 2025, label: '1989–2025 · Série completa' }
             ].map(p=>(
               <button
                 key={p.label}
                 type="button"
                 className={`chip-milestone ${yearStart===p.start&&yearEnd===p.end?'active':''}`}
                 onClick={()=>{ setYearStart(p.start); setYearEnd(p.end); }}
               >
                 {p.label}
               </button>
             ))}
           </div>
         </div>
       )}

       {historicMode==='indice'&&(
         <div className="historic-toolbar-slot" role="toolbar" aria-label="Marcos históricos de referência">
           <span className="slot-title">Marcos históricos:</span>
           <div className="slot-chips">
             {HISTORIC_MILESTONES.map(m=>(
               <button
                 key={m.year}
                 type="button"
                 className={`chip-milestone ${baseYear===m.year?'active':''}`}
                 onClick={()=>{
                   setBaseYear(m.year);
                   if(m.year<yearStart) setYearStart(m.year);
                   if(m.year>yearEnd) setYearEnd(m.year);
                 }}
               >
                 {m.label}
               </button>
             ))}
           </div>
         </div>
       )}

       {historicMode==='razao'&&(
         <div className="historic-toolbar-slot" role="toolbar" aria-label="Linhas disponíveis para relação">
           <span className="slot-title">Linhas do gráfico:</span>
           <div className="slot-chips">
             {HIST_GROUPS.map(g=>{
               const isNum = ratioSelectedLines[0]===g;
               const isDen = ratioSelectedLines[1]===g;
               const isSelected = isNum || isDen;
               const isHovered = hoveredLine===g;
               const color = HIST_COLORS[g]||'#8c9fe8';
               return (
                 <button
                   key={g}
                   type="button"
                   className={`chip-ratio-line ${isSelected?'active':''}`}
                   style={{
                     borderColor: isSelected?color:(isHovered?'#527ba0':'#324a61'),
                     color: isSelected?'#ffffff':(isHovered?'#eef5fa':'#a9bac6'),
                     backgroundColor: isSelected?`${color}33`:(isHovered?'rgba(255,255,255,0.08)':'transparent')
                   }}
                   onClick={()=>handleRatioLineSelect(g)}
                   onMouseEnter={()=>setHoveredLine(g)}
                   onMouseLeave={()=>setHoveredLine(null)}
                 >
                   <span className="chip-color-dot" style={{backgroundColor:color}} />
                   {g}
                   {isNum&&<span className="chip-order-badge" style={{backgroundColor:color}}>1º (NUM)</span>}
                   {isDen&&<span className="chip-order-badge" style={{backgroundColor:color}}>2º (DEN)</span>}
                 </button>
               );
             })}
             {ratioSelectedLines.length>0&&(
               <button type="button" className="ghost ratio-clear-action-btn" onClick={handleClearRatio}>
                 Limpar seleção
               </button>
             )}
           </div>
         </div>
       )}

       <div className="range-controls">
         <label>Ano inicial <input type="range" min="1989" max={yearEnd} value={yearStart} onChange={e=>setYearStart(+e.target.value)}/><b>{yearStart}</b></label>
         <label>Ano final <input type="range" min={yearStart} max="2025" value={yearEnd} onChange={e=>setYearEnd(+e.target.value)}/><b>{yearEnd}</b></label>
         <button className="ghost" onClick={()=>{setYearStart(1989);setYearEnd(2025);if(historicMode==='indice')setBaseYear(1989);}}>Restaurar período</button>
       </div>

       <div className="historic-plot-wrapper">
         <Plot
           data={historical.map(s=>{
             const isRatioMode = historicMode==='razao';
             const isNum = ratioSelectedLines[0]===s.name;
             const isDen = ratioSelectedLines[1]===s.name;
             const isSelected = isNum || isDen;
             const isHovered = isRatioMode && hoveredLine===s.name;

             let lineColor = HIST_COLORS[s.name]||'#e6b84b';
             let lineWidth = 2.5;
             let markerSize = 5;
             let lineOpacity = 1.0;

             if(isRatioMode){
               if(isSelected){
                 lineColor = HIST_COLORS[s.name];
                 lineWidth = 4.0;
                 markerSize = 7.5;
                 lineOpacity = 1.0;
               } else if(isHovered){
                 lineColor = HIST_COLORS[s.name];
                 lineWidth = 3.2;
                 markerSize = 6;
                 lineOpacity = 0.72;
               } else if(ratioSelectedLines.length===0){
                 lineColor = HIST_COLORS_MUTED[s.name];
                 lineWidth = 2.0;
                 markerSize = 4;
                 lineOpacity = 0.35;
               } else {
                 lineColor = HIST_COLORS_MUTED[s.name];
                 lineWidth = 1.4;
                 markerSize = 3;
                 lineOpacity = 0.16;
               }
             }

             return {
               type:'scatter',
               mode:'lines+markers',
               name:s.name,
               x:s.x,
               y:s.y,
               opacity:lineOpacity,
               line:{width:lineWidth,color:lineColor},
               marker:{size:markerSize,color:lineColor},
               connectgaps:false,
               hovertemplate:
                 isRatioMode
                   ?'<b>'+s.name+'</b><br>Ano %{x}: %{y:,.0f} pessoas<extra></extra>'
                   :historicMode==='indice'
                   ?'Ano %{x}<br>'+s.name+': <b>%{y:.1f}</b> (base '+baseYear+' = 100)<extra></extra>'
                   :'Ano %{x}<br>'+s.name+': <b>%{y:,.0f}</b> pessoas<extra></extra>'
             };
           })}
           layout={{
             ...layoutBase,
             hovermode: historicMode==='razao' ? 'closest' : 'x unified',
             hoverdistance: historicMode==='razao' ? 35 : 20,
             xaxis:{
               ...layoutBase.xaxis,
               title:'Ano',
               dtick:2,
               autorange:false,
               range:historicZoom.xaxis||[yearStart,yearEnd],
               minallowed:1989,
               maxallowed:2025
             },
             yaxis:{
               ...layoutBase.yaxis,
               title:
                 historicMode==='indice'
                   ?`Índice relativo (${baseYear} = 100)`
                   :'Número de pessoas',
               rangemode:'tozero',
               range:historicZoom.yaxis||[0,historicMaxY],
               minallowed:0,
               maxallowed:historicMaxLimit
             },
             shapes:historicMode==='indice'&&baseYear>=yearStart&&baseYear<=yearEnd?[{
               type:'line',
               x0:baseYear,
               x1:baseYear,
               y0:0,
               y1:1,
               yref:'paper',
               line:{color:'#e6b84b',width:1.5,dash:'dash'}
             }]:[],
             annotations:historicMode==='indice'&&baseYear>=yearStart&&baseYear<=yearEnd?[{
               x:baseYear,
               y:1,
               yref:'paper',
               text:`Ano-base (${baseYear} = 100)`,
               showarrow:false,
               xanchor:'center',
               yanchor:'bottom',
               font:{family:'DM Mono, monospace',size:10,color:'#f0d17d'},
               bgcolor:'rgba(16, 33, 49, 0.85)',
               borderpad:3
             }]:[],
             legend:{orientation:'h',y:-0.22},
             margin:{l:78,r:25,t:25,b:75}
           }}
           config={cfg}
           style={{width:'100%',height:490}}
           useResizeHandler
           onRelayout={ev=>zoomEventRanges(ev,historicZoom,{
             xaxis:{min:yearStart,max:yearEnd,minSpan:2,maxSpan:Math.max(2,yearEnd-yearStart)},
             yaxis:{min:0,max:historicMaxLimit,minSpan:historicMode==='indice'?5:500,maxSpan:historicMaxLimit}
           },setHistoricZoom)}
           onClick={ev=>{
             const p=ev.points?.[0];
             if(!p) return;
             if(historicMode==='razao'){
               const lineName = p.data?.name || hoveredLine;
               if(lineName) handleRatioLineSelect(lineName);
               if(p.x!=null) setRatioHoverYear(Number(p.x));
               return;
             }
             if(historicMode==='indice'&&p.x!=null){
               setBaseYear(Number(p.x));
             }
           }}
           onHover={ev=>{
             const p=ev.points?.[0];
             if(historicMode==='razao'&&p){
               if(p.data?.name) setHoveredLine(p.data.name);
               if(p.x!=null) setRatioHoverYear(Number(p.x));
             }
           }}
           onUnhover={()=>{
             if(historicMode==='razao'){
               setHoveredLine(null);
             }
           }}
         />

         {historicMode==='razao'&&(
           <RatioOverlay
             selectedLines={ratioSelectedLines}
             onInvert={handleInvertRatio}
             onClear={handleClearRatio}
             year={ratioHoverYear||yearEnd}
             hist={hist}
             yearStart={yearStart}
             yearEnd={yearEnd}
             colors={HIST_COLORS}
           />
         )}
       </div>

       <div className="note">
         {historicMode==='razao'
           ?'Modo Ratio Dinâmico: selecione duas linhas com o mouse para calcular a proporção entre elas. A primeira linha define o numerador e a segunda o denominador; inverta a ordem a qualquer momento.'
           :historicMode==='indice'
           ?`Modo de Índice Relativo: cada série é fixada em 100 no ano-base ${baseYear}. Valores acima de 100 indicam crescimento acumulado em relação à referência; valores abaixo indicam redução.`
           :'Série Histórica Oficial: contingente de alunos, docentes e servidores da USP ao longo dos anos. Use a seleção de anos ou os atalhos para focar em períodos específicos.'}
       </div>
     </Panel>
   </div>}

   {tab==='calor'&&<div className="content">
     <div className="section-title"><div><h2>Diversidade racial por unidade</h2><p>Explore a participação de cada categoria racial por população e unidade. 'Todos' reúne todas as categorias de unidade.</p></div>
       <div className="filters">
         <Field label="População"><select value={heatGroup} onChange={e=>setHeatGroup(e.target.value)}>{GROUPS.map(g=><option key={g}>{g}</option>)}</select></Field>
         <Field label="Categoria de unidade"><select value={unitType} onChange={e=>setUnitType(e.target.value)}><option value="Todos">Todos</option>{unitTypes.map(t=><option key={t}>{t}</option>)}</select></Field>
         <SearchField value={unitSearch} onChange={setUnitSearch} />
       </div>
     </div>
     <Panel title="Mapa de calor · participação percentual" sub="Clique em uma célula para selecionar a unidade e a categoria racial. A unidade selecionada também será destacada no ranking.">
       {heat.us.length ? (
         <div className="heatmap-wrapper">
           <div className="heatmap-scroll" role="region" aria-label="Mapa de calor; use a rolagem horizontal para ver todas as unidades">
             <Plot
               data={[{
                 type: 'heatmap',
                 x: heat.us,
                 y: races,
                 z: heat.z,
                 colorscale: [[0, '#14283a'], [.35, '#285b78'], [.7, '#4d91a8'], [1, '#e6b84b']],
                 zmin: 0,
                 zmax: heatScaleMax,
                 showscale: false,
                 customdata: races.map((r, ri) => heat.us.map(u => {
                   const row = dem.filter(d => d.grupo === heatGroup && (unitType === 'Todos' || d.tipoUnidade === unitType) && (!unitSearch.trim() || d.unidade.toLocaleLowerCase('pt-BR').includes(unitSearch.trim().toLocaleLowerCase('pt-BR'))) && d.unidade === u);
                   const total = sum(row.map(d => d.total));
                   const qtd = sum(row.filter(d => d.raca === r).map(d => d.total));
                   return [qtd, total];
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
                   ticktext: heat.us.map(u => u.length > 36 ? u.slice(0, 34) + '…' : u),
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
               config={cfg}
               style={{ width: Math.max(900, heat.us.length * 48 + 140), height: 570 }}
               useResizeHandler
               onRelayout={ev => zoomEventRanges(ev, heatZoom, {
                 xaxis: { min: -0.5, max: heat.us.length - 0.5, minSpan: 1, maxSpan: heat.us.length },
                 yaxis: { min: -0.5, max: races.length - 0.5, minSpan: 1, maxSpan: races.length }
               }, setHeatZoom)}
               onClick={ev => {
                 const p = ev.points?.[0];
                 if (p) { selectUnit(p.x); setRankRace(p.y); setRankGroup(heatGroup); }
               }}
             />
           </div>
           <HeatmapLegend max={heatScaleMax} />
         </div>
       ) : <Empty>Não há dados para os filtros selecionados.</Empty>}
       <div className="note">Percentual calculado como quantidade da categoria racial ÷ total de registros da mesma população e unidade. “Não informada” é mantida no denominador. A escala de cores se ajusta ao maior percentual observado no filtro atual para evidenciar diferenças entre categorias pouco frequentes.</div>
     </Panel>
   </div>}

   {tab==='ranking'&&<div className="content">
     <div className="section-title"><div><h2>Participação racial por unidade</h2><p>Compare a participação percentual de uma categoria racial entre as unidades. 'Todos' reúne todas as categorias de unidade.</p></div>
       <div className="filters filters-ranking">
         <Field label="População"><select value={rankGroup} onChange={e=>setRankGroup(e.target.value)}>{GROUPS.map(g=><option key={g}>{g}</option>)}</select></Field>
         <Field label="Raça/cor"><select value={rankRace} onChange={e=>setRankRace(e.target.value)}>{races.map(r=><option key={r}>{r}</option>)}</select></Field>
         <Field label="Categoria de unidade"><select value={unitType} onChange={e=>setUnitType(e.target.value)}><option value="Todos">Todos</option>{unitTypes.map(t=><option key={t}>{t}</option>)}</select></Field>
         <SearchField value={unitSearch} onChange={setUnitSearch} />
       </div>
     </div>
     <Panel title={`${rankRace} · ${rankGroup}`} sub="Ordenado da maior para a menor participação. Clique em uma barra para selecionar a unidade e localizá-la no mapa de calor.">
       {rankTop.length ? (
         <div className="ranking-wrapper">
           <div className="ranking-scroll" role="region" aria-label="Ranking de participação racial; use a rolagem vertical para ver todas as unidades">
             <Plot
               data={[{
                 type: 'bar',
                 orientation: 'h',
                 x: rankTop.map(d => d.percentual),
                 y: rankTop.map(d => d.unidade),
                 text: rankTop.map(d => `${d.percentual.toFixed(1)}%`),
                 textposition: 'outside',
                 textfont: { family: 'DM Mono, monospace', size: 10, color: '#c2ced7' },
                 cliponaxis: false,
                 customdata: rankTop.map(d => [d.quantidade, d.total]),
                 marker: {
                   color: rankTop.map(d => d.unidade === selectedUnit ? '#e6b84b' : '#4c9bc8'),
                   line: { color: '#dce8ef', width: rankTop.map(d => d.unidade === selectedUnit ? 1.5 : 0) }
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
               config={cfg}
               style={{ width: '100%', height: rankPlotHeight }}
               useResizeHandler
               onRelayout={ev => zoomEventRanges(ev, rankZoom, {
                 xaxis: { min: 0, max: rankScaleMax, minSpan: Math.max(0.001, rankScaleMax / 100), maxSpan: rankScaleMax },
                 yaxis: { min: -0.5, max: rankTop.length - 0.5, minSpan: 1, maxSpan: rankTop.length, reverse: true }
               }, setRankZoom)}
               onClick={ev => {
                 const u = ev.points?.[0]?.y;
                 if (u) { selectUnit(u); setHeatGroup(rankGroup); }
               }}
             />
           </div>
         </div>
       ) : <Empty>Não há registros para os filtros selecionados.</Empty>}
       <div className="note">O percentual de cada barra usa como denominador o total da população selecionada naquela unidade, somando todas as categorias raciais e mantendo “Não informada”. O eixo se ajusta ao maior valor observado para facilitar a comparação de categorias raras; os percentuais não são reescalonados.</div>
     </Panel>
   </div>}

   <footer><span>Fontes: Anuário Estatístico da USP · Tabelas 2.03, 2.10, 2.13, 2.19, 2.20 e 2.21.</span><span>Projeto de Visualização Computacional · 2026/2</span></footer>
 </main>;
}
