"""Validate both volume workbooks and generate the data read by the website."""
import json
from collections import defaultdict
from itertools import product

from import_response_metadata import ROOT, read_single_sheet


def read_volumes(source, dimensions):
    _, rows = read_single_sheet(source)
    header = {value.strip(): column for column, value in rows[0][1].items()}
    if set(header) != {*dimensions, 'Volum'}:
        raise ValueError(f'{source.name}: unexpected columns.')

    records = {}
    for row_number, cells in rows[1:]:
        key = tuple(cells.get(header[name], '').strip() for name in dimensions)
        raw = cells.get(header['Volum'], '').strip()
        if not all(key) or not raw.isdecimal() or key in records:
            raise ValueError(f'{source.name}: missing, invalid or duplicate value at row {row_number}.')
        records[key] = int(raw)
    return records


def main():
    metadata = ROOT / 'metadata'
    totals = read_volumes(metadata / 'volum-perfils.xlsx', ('ID2', 'PERFIL_POLITIC'))
    sexes = read_volumes(metadata / 'volum-perfils-amb-sexe.xlsx', ('ID2', 'SEXE', 'PERFIL_POLITIC'))
    profiles = {profile for profile, _ in totals}
    political = {position for _, position in totals}
    if not profiles or not political or set(totals) != set(product(profiles, political)):
        raise ValueError('The workbook without sex must contain every ID2 × PERFIL_POLITIC combination.')
    if set(sexes) != set(product(profiles, ('Dona', 'Home'), political)):
        raise ValueError('The workbook with sex must contain every ID2 × SEXE × PERFIL_POLITIC combination.')

    payload = {
        'withoutSex': [[*key, count] for key, count in sorted(totals.items())],
        'withSex': [[*key, count] for key, count in sorted(sexes.items())],
    }
    # Keep each reference universe intact. The cell values can differ between sources.
    (ROOT / 'data' / 'volum-perfils.json').write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + '\n', encoding='utf-8'
    )

    collapsed = defaultdict(int)
    for (profile, _, position), count in sexes.items():
        collapsed[profile, position] += count
    differences = [abs(count - collapsed[key]) for key, count in totals.items()]
    print(f'Total without sex: {sum(totals.values())}; total with sex: {sum(sexes.values())}.')
    print(f'Cells differing after collapsing sex: {sum(value > 0 for value in differences)} '
          f'of {len(differences)}, max difference: {max(differences)}.')


if __name__ == '__main__':
    main()
