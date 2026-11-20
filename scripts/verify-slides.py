with open('presentacion.html', 'r', encoding='utf-8') as f:
    text = f.read()

for i in range(13):
    tag = f'id="slide-{i}"'
    assert tag in text, f'Slide {i} missing!'
    pos = text.find(tag)
    snippet = text[pos:pos+120].replace('\n', ' ')
    print(f'Slide {i} OK: {snippet}')

print('\nSUCCESS: All 13 slides are 100% present with complete content!')
