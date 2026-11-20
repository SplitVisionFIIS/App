with open('presentacion.html', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace('      </div>\n\n    <!-- DIAPOSITIVA 13: CHECKLIST Y CONCLUSIONES PC3 -->', '      </div>\n    </div>\n\n    <!-- DIAPOSITIVA 13: CHECKLIST Y CONCLUSIONES PC3 -->')

with open('presentacion.html', 'w', encoding='utf-8') as f:
    f.write(text)

with open('frontend/public/presentacion.html', 'w', encoding='utf-8') as f:
    f.write(text)

print("Slide 11 closing div fixed!")
