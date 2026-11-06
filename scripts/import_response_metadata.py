"""Read the response dictionary without changing the workbook or survey data."""
import argparse
import json
import math
import posixpath
import re
from pathlib import Path
from zipfile import ZipFile
from xml.etree import ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
NS = {'m': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
REL_NS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'


def read_dictionary(source):
    with ZipFile(source) as z:
        strings = []
        if 'xl/sharedStrings.xml' in z.namelist():
            strings = [''.join(t.text or '' for t in si.findall('.//m:t', NS))
                       for si in ET.fromstring(z.read('xl/sharedStrings.xml')).findall('m:si', NS)]
        sheets = ET.fromstring(z.read('xl/workbook.xml')).findall('m:sheets/m:sheet', NS)
        if len(sheets) != 1:
            raise ValueError('Expected one dictionary sheet; select the intended sheet before importing.')
        sheet = sheets[0]
        relationships = {r.attrib['Id']: r.attrib['Target'] for r in ET.fromstring(z.read('xl/_rels/workbook.xml.rels'))}
        target = relationships[sheet.attrib['{' + REL_NS + '}id']]
        sheet_path = target.lstrip('/') if target.startswith('/') else posixpath.normpath(posixpath.join('xl', target))
        rows = []
        for row in ET.fromstring(z.read(sheet_path)).findall('m:sheetData/m:row', NS):
            cells = {}
            for cell in row:
                if cell.find('m:f', NS) is not None:
                    raise ValueError(f'Formula found at {cell.attrib["r"]}; use explicit dictionary values.')
                value = cell.find('m:v', NS)
                if cell.get('t') == 's':
                    text = strings[int(value.text)]
                elif cell.get('t') == 'inlineStr':
                    text = ''.join(t.text or '' for t in cell.findall('.//m:t', NS))
                else:
                    text = value.text if value is not None else ''
                cells[re.sub(r'\d+', '', cell.attrib['r'])] = text
            if any(cells.values()):
                rows.append((int(row.attrib['r']), cells))
    if not rows:
        raise ValueError('Empty dictionary.')
    header = {value.strip(): column for column, value in rows[0][1].items()}
    required = ['VARIABLE', 'DESCRIPCIÓ', 'RESPOSTA', 'ORDRE']
    if any(name not in header for name in required):
        raise ValueError('Expected columns: ' + ', '.join(required))
    variables = {}
    for row_number, cells in rows[1:]:
        variable, description, response, order_text = [cells.get(header[name], '') for name in required]
        variable = variable.strip()
        if not variable or not description.strip() or response == '':
            raise ValueError(f'Incomplete variable, description or response at row {row_number}.')
        try:
            order = float(order_text)
        except ValueError:
            raise ValueError(f'Invalid ORDRE at row {row_number}: {order_text!r}') from None
        if not math.isfinite(order):
            raise ValueError(f'Non-finite ORDRE at row {row_number}.')
        if order.is_integer():
            order = int(order)
        entry = variables.setdefault(variable, {'description': description.strip(), 'responses': []})
        if entry['description'] != description.strip():
            raise ValueError(f'Conflicting descriptions for {variable} at row {row_number}.')
        if any(r['value'] == response or r['order'] == order for r in entry['responses']):
            raise ValueError(f'Duplicate response or ORDRE for {variable} at row {row_number}.')
        entry['responses'].append({'value': response, 'order': order})
    for entry in variables.values():
        entry['responses'].sort(key=lambda r: r['order'])
    return {'source': source.name, 'sheet': sheet.attrib['name'], 'variables': variables}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, default=ROOT/'metadata'/'respostes_variables_ordre.xlsx')
    parser.add_argument('--output', type=Path, default=ROOT/'response-metadata.js')
    args = parser.parse_args()
    metadata = read_dictionary(args.source)
    content = '// Generated from metadata/respostes_variables_ordre.xlsx. Do not edit by hand.\n'
    content += '(function(root){\n  const metadata = ' + json.dumps(metadata, ensure_ascii=False, indent=2) + ';\n'
    content += "  if(typeof module!=='undefined')module.exports=metadata;else root.RESPONSE_METADATA=metadata;\n})(typeof window!=='undefined'?window:globalThis);\n"
    args.output.write_text(content, encoding='utf-8')
    print(f'Imported {len(metadata["variables"])} variables and {sum(len(v["responses"]) for v in metadata["variables"].values())} responses from {metadata["source"]}.')


if __name__ == '__main__':
    main()
