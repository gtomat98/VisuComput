"""Audita a correspondência entre as planilhas XLSX fornecidas e public/data/usp.json.
Execute na raiz do projeto: python scripts/auditar_dados.py
Requer pandas e openpyxl.
"""
from pathlib import Path
import json
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
DATA = json.loads((ROOT / 'public/data/usp.json').read_text(encoding='utf-8'))
RACE = {'Amar':'Amarela','Bran':'Branca','Indig':'Indígena','Pard':'Parda','Pret':'Preta','N/I':'Não informada'}


def compare_demographic(filename, group, category_col):
    raw = pd.read_excel(ROOT / 'data/originais' / filename, header=6)
    raw = raw.rename(columns={
        'Tipo de Unidade':'tipoUnidade', 'Unidade':'unidade',
        category_col:'categoria', 'racacor':'rawrace', 'Total':'total'
    })
    raw['grupo'] = group
    raw['raca'] = raw['rawrace'].map(RACE)
    if raw['raca'].isna().any():
        raise AssertionError(f'{filename}: códigos raciais sem mapeamento')
    target = pd.DataFrame(DATA['demografia'])
    target = target[target.grupo == group]
    keys = ['tipoUnidade','unidade','grupo','categoria','raca']
    left = raw.groupby(keys, dropna=False).total.sum().sort_index()
    right = target.groupby(keys, dropna=False).total.sum().sort_index()
    pd.testing.assert_series_equal(left, right, check_names=False)
    assert len(raw) == len(target), (filename, len(raw), len(target))
    return len(raw), int(raw.total.sum())


def compare_evolution(filename, group, regime_col=None):
    raw = pd.read_excel(ROOT / 'data/originais' / filename, header=6)
    rename = {'Tipo de Unidade':'tipoUnidade','Unidade':'unidade','Ano':'ano','Total':'total'}
    if regime_col:
        rename[regime_col] = 'regime'
    raw = raw.rename(columns=rename)
    if 'regime' not in raw:
        raw['regime'] = None
    raw['grupo'] = group
    target = pd.DataFrame(DATA['evolucaoUnidade'])
    target = target[target.grupo == group]
    keys = ['tipoUnidade','unidade','ano','grupo','regime','total']
    left = raw[keys].sort_values(keys[:-1]).reset_index(drop=True)
    right = target[keys].sort_values(keys[:-1]).reset_index(drop=True)
    pd.testing.assert_frame_equal(left, right, check_dtype=False)
    return len(raw), int(raw.total.sum())


def main():
    checks = [
        ('T2.19.xlsx','Docentes','Nivel'),
        ('T2.20.xlsx','Servidores','Categoria'),
        ('T2.21.xlsx','Alunos','Categoria'),
    ]
    print('AUDITORIA DEMOGRÁFICA')
    for args in checks:
        n,total = compare_demographic(*args)
        print(f'OK {args[0]}: {n} linhas; soma={total:,}')

    print('\nAUDITORIA DE EVOLUÇÃO')
    for args in [
        ('T2.03.xlsx','Alunos de graduação',None),
        ('T2.10.xlsx','Docentes','Regime de Trabalho'),
        ('T2.13.xlsx','Servidores',None),
    ]:
        n,total = compare_evolution(*args)
        print(f'OK {args[0]}: {n} linhas; soma={total:,}')

    dem = pd.DataFrame(DATA['demografia'])
    print('\nTOTAIS DEMOGRÁFICOS POR POPULAÇÃO')
    for group,total in dem.groupby('grupo').total.sum().items():
        print(f'{group}: {int(total):,}')

    print('\nCONFERÊNCIA DAS PARTICIPAÇÕES RACIAIS')
    for group, part in dem.groupby('grupo'):
        total = part.total.sum()
        share = part.groupby('raca').total.sum().sum() / total * 100 if total else 0
        assert abs(share - 100) < 1e-9, (group, share)
        print(f'OK {group}: soma das categorias = {share:.2f}%')

    evo = pd.DataFrame(DATA['evolucaoUnidade'])
    selected = evo[(evo.tipoUnidade == 'A - Ensino e Pesquisa') & evo.ano.isin([2022,2025])]
    common = []
    for unit, rows in selected.groupby('unidade'):
        by = {}
        for row in rows.itertuples():
            if row.grupo == 'Docentes':
                by.setdefault(row.ano,{})['docentes'] = by.setdefault(row.ano,{}).get('docentes',0) + row.total
            else:
                by.setdefault(row.ano,{})[row.grupo] = row.total
        if all(k in by.get(2022,{}) and k in by.get(2025,{}) for k in ['Alunos de graduação','docentes','Servidores']):
            common.append((unit,by))
    calculable = [u for u,v in common if all(v[2022].get(k,0)>0 for k in ['Alunos de graduação','docentes','Servidores'])]
    zero_base = [u for u,v in common if any(v[2022].get(k,0)==0 for k in ['Alunos de graduação','docentes','Servidores'])]
    print(f'\nUnidades comuns nas três tabelas: {len(common)}')
    print(f'Unidades com variação percentual calculável: {len(calculable)}')
    print(f'Unidades excluídas por base zero em 2022: {", ".join(zero_base) or "nenhuma"}')
    print('\nRESULTADO: todas as comparações entre planilhas e JSON foram aprovadas.')

if __name__ == '__main__':
    main()
