with open('presentacion.html', 'r', encoding='utf-8') as f:
    text = f.read()

# In slides 1 through 11, replace the ending "      </div>\n    </div>\n\n    <!-- DIAPOSITIVA"
# with "    </div>\n\n    <!-- DIAPOSITIVA"
text = text.replace('      </div>\n    </div>\n\n    <!-- DIAPOSITIVA', '    </div>\n\n    <!-- DIAPOSITIVA')

# Check slide 11 before slide 12
text = text.replace('      </div>\n    </div>\n\n    <!-- DIAPOSITIVA 13', '    </div>\n\n    <!-- DIAPOSITIVA 13')

with open('presentacion.html', 'w', encoding='utf-8') as f:
    f.write(text)

with open('frontend/public/presentacion.html', 'w', encoding='utf-8') as f:
    f.write(text)

print("Closing tags cleaned!")
