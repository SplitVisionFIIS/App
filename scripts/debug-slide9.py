with open('presentacion.html', 'r', encoding='utf-8') as f:
    text = f.read()

for i in [8, 9]:
    p = text.find(f'id="slide-{i}"')
    p_next = text.find(f'id="slide-{i+1}"')
    print(f"=== SLIDE {i} ===")
    print(text[p:p_next])
