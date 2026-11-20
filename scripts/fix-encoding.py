with open('presentacion.html', 'r', encoding='utf-8') as f:
    text = f.read()

replacements = {
    'Ã¡': 'á', 'Ã©': 'é', 'Ã­': 'í', 'Ã³': 'ó', 'Ãº': 'ú',
    'Ã±': 'ñ', 'Ã‘': 'Ñ', 'Ã\x81': 'Á', 'Ã\x89': 'É', 'Ã\x8d': 'Í',
    'Ã\x93': 'Ó', 'Ã\x9a': 'Ú', 'â€”': '—', 'â€“': '–', 'Â·': '·',
    'â†’': '→', 'Â¿': '¿', 'Â¡': '¡'
}

for k, v in replacements.items():
    text = text.replace(k, v)

with open('presentacion.html', 'w', encoding='utf-8') as f:
    f.write(text)

with open('frontend/public/presentacion.html', 'w', encoding='utf-8') as f:
    f.write(text)

print('Successfully cleaned UTF-8 encoding!')
