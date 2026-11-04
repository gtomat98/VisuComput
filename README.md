# USP em Dados — Projeto de Visualização Computacional

Aplicação web em React + Vite + Plotly.js para explorar dados do Anuário Estatístico da USP.

## Executar

Requisitos: Node.js 20+ e npm.

```bash
npm install
npm run dev
```

Abra o endereço local informado pelo Vite (normalmente `http://localhost:5173`). Para gerar a versão de produção: `npm run build`.

## Três visualizações

1. **Evolução histórica:** séries de graduação, pós-graduação, docentes e servidores; permite alternar entre valores absolutos e índice, ajustar o intervalo de anos e explorar a legenda. Zoom pelo scroll e pelos controles do gráfico está habilitado, com limites para evitar ampliações excessivas.
2. **Diversidade por unidade:** mapa de calor com filtros de população e categoria de unidade. A opção **Todos** consolida as unidades de todas as categorias. A pesquisa localiza unidades pelo nome. O mapa tem altura fixa, largura proporcional à quantidade de unidades e rolagem horizontal; a escala de cores se ajusta ao maior percentual observado. Clicar em uma célula seleciona a unidade e a categoria racial.
3. **Participação racial por unidade:** compara as unidades pela participação percentual da raça/cor escolhida na população selecionada. A opção **Todos** reúne todas as categorias de unidade. A pesquisa localiza unidades pelo nome. A escala percentual se ajusta ao maior valor observado, sem alterar os percentuais reais. Clicar em uma barra seleciona a unidade.
A seleção de unidade é compartilhada entre o mapa de calor e a participação racial por unidade.

## Auditoria e rastreabilidade

Os dados processados estão em `public/data/usp.json`. As seis planilhas convertidas para XLSX estão preservadas em `data/originais/`.

Para repetir a conferência entre as planilhas e o JSON:

```bash
pip install pandas openpyxl
python scripts/auditar_dados.py
```

A auditoria compara as linhas agregadas e os valores de cada tabela com o JSON. Resultado da conferência executada nesta versão:

| Arquivo | Linhas | Soma da coluna Total |
|---|---:|---:|
| T2.19 — Docentes por unidade, categoria e raça/cor | 1.530 | 5.482 |
| T2.20 — Servidores por unidade, categoria e raça/cor | 1.728 | 12.727 |
| T2.21 — Alunos por unidade, categoria e raça/cor | 1.350 | 102.054 |
| T2.03 — Evolução de alunos de graduação | 282 | 357.132 |
| T2.10 — Evolução de docentes por regime | 612 | 21.121 |
| T2.13 — Evolução de servidores | 450 | 77.094 |

Todas as linhas dessas seis tabelas foram comparadas com os registros correspondentes no JSON e coincidiram. Os códigos raciais `Amar`, `Bran`, `Indig`, `Pard`, `Pret` e `N/I` foram mapeados, respectivamente, para Amarela, Branca, Indígena, Parda, Preta e Não informada. As seis categorias são mantidas nos denominadores dos percentuais.

## Decisões e limitações metodológicas

- Os percentuais de diversidade são calculados por unidade e população: quantidade da raça/cor selecionada dividida pelo total de registros daquela população na unidade. A categoria “Não informada” permanece no denominador.
- A tabela 2.10 apresenta docentes por regime. Para a comparação de pessoal, os regimes são somados por unidade e ano.
- As tabelas 2.03, 2.10 e 2.13 têm 43 unidades de Ensino e Pesquisa em comum no recorte 2022–2025. Uma unidade (FMBRU) tem base zero em 2022; como a variação percentual não é definida nesse caso, o gráfico apresenta 42 pontos.
- Correlação de Pearson descreve associação linear e não implica causalidade.
- A série histórica de 1989–2025 foi transcrita visualmente das imagens fornecidas. Ela não faz parte da comparação automatizada com as seis planilhas e precisa ser conferida com a fonte oficial antes da entrega. Os valores de servidores para 1989, 1990 e 1991 foram atualizados para 17.735, 17.788 e 16.628, respectivamente, conforme informação fornecida pelo usuário; ainda devem ser conferidos com a fonte oficial.
- Os dados demográficos são referentes a 2025. Os dados históricos transcritos têm limitações próprias e estão identificados na interface.

## Fontes

- Anuário Estatístico da USP: tabelas 2.03, 2.10, 2.13, 2.19, 2.20 e 2.21 (referência 2025, processado em 2026).
- Gráficos históricos enviados pelo grupo.
- Diretrizes do Projeto de Exploração e Análise Visual de Dados — SCC0252/SCC5836, 2026/2.
- `recommended_libraries_Visualization.pdf`: Plotly.js consta entre as bibliotecas recomendadas.
