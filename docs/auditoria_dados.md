# Resultado da auditoria dos dados

**Escopo:** comparação das seis planilhas convertidas para XLSX com os registros do arquivo `public/data/usp.json`.

## Resultado

| Origem | Linhas na planilha | Linhas correspondentes no JSON | Soma de Total | Resultado |
|---|---:|---:|---:|---|
| T2.19 — Docentes | 1.530 | 1.530 | 5.482 | Correspondência exata |
| T2.20 — Servidores | 1.728 | 1.728 | 12.727 | Correspondência exata |
| T2.21 — Alunos | 1.350 | 1.350 | 102.054 | Correspondência exata |
| T2.03 — Graduação por ano/unidade | 282 | 282 | 357.132 | Correspondência exata |
| T2.10 — Docentes por regime/ano/unidade | 612 | 612 | 21.121 | Correspondência exata |
| T2.13 — Servidores por ano/unidade | 450 | 450 | 77.094 | Correspondência exata |

A comparação foi feita usando as dimensões da própria tabela (tipo de unidade, unidade, categoria, raça/cor, ano e regime, conforme aplicável) e os valores da coluna `Total`. Não foram encontradas divergências entre as linhas de origem e as linhas correspondentes no JSON.

## Verificações adicionais

- Os seis códigos raciais presentes nas tabelas demográficas foram mapeados; não houve código sem correspondência.
- A soma das seis categorias raciais corresponde ao total de cada população: alunos 102.054, docentes 5.482 e servidores 12.727.
- Em cada combinação de população e unidade, a soma por raça/cor coincide com o total da população daquela unidade.

## Limitações que permanecem

1. A auditoria valida a correspondência entre as planilhas fornecidas e o JSON; ela não confirma que o Anuário publicado não tenha sido atualizado ou corrigido posteriormente.
2. A série histórica 1989–2025 foi transcrita visualmente de imagens, e não extraída das planilhas. Os valores precisam de conferência independente com a fonte oficial. Os valores de servidores de 1989 (17.735), 1990 (17.788) e 1991 (16.628) foram atualizados conforme informação fornecida pelo usuário; ainda requerem conferência com a fonte oficial.

## Como reproduzir

Na raiz do projeto, execute `python scripts/auditar_dados.py` (requer `pandas` e `openpyxl`).
