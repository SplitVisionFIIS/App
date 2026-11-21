with open('presentacion.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Let's inspect each slide's content and check line counts
for i in range(13):
    start = html.find(f'id="slide-{i}"')
    end = html.find(f'id="slide-{i+1}"') if i < 12 else html.find('<!-- BARRA')
    slide_html = html[start:end]
    lines = slide_html.count('\n')
    print(f"Slide {i}: {lines} lines, length {len(slide_html)}")
