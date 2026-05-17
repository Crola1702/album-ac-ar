#!/usr/bin/env python3
"""Genera data.js desde los CSV. Ejecutar antes de probar localmente."""
import csv, json, sys

paises = []
with open('paises.csv', newline='', encoding='utf-8') as f:
    for row in csv.DictReader(f):
        paises.append({
            'codigo': row['CODIGO'].strip(),
            'nombre': row['NOMBRE'].strip()
        })

stickers = []
with open('monitas.csv', newline='', encoding='utf-8') as f:
    for row in csv.DictReader(f):
        row_id = row['ID'].strip()
        if not row_id:
            continue
        stickers.append({
            'id': row_id,
            'pais': row_id[:3],
            'completado': row['COMPLETADO'].strip().upper() == 'SI',
            'extra': int(row.get('EXTRA', '0').strip() or '0')
        })

with open('data.js', 'w', encoding='utf-8') as f:
    f.write('const PAISES = ' + json.dumps(paises, ensure_ascii=False) + ';\n')
    f.write('const STICKERS = ' + json.dumps(stickers, ensure_ascii=False) + ';\n')

print(f'OK: {len(paises)} paises, {len(stickers)} figuritas → data.js', file=sys.stderr)
