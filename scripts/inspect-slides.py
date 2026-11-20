import re

with open('presentacion.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Pattern in slide 1 to 11:
# <div class="slide" id="slide-X">
#   <div class="top-bar">...</div>
#   <div>
#     <div class="slide-header">...</div>
#     ...
#   </div>
# </div>

# Replace "</div>\n      <div>\n        <div class="slide-header">" with:
# "</div>\n      <div class="slide-header">"
# And then the matching closing </div> before </div>

# Let's inspect how slides 1 to 12 look:
for i in range(1, 13):
    start_tag = f'<div class="slide" id="slide-{i}">'
    if start_tag not in html:
        # maybe slide-page slide?
        start_tag = f'id="slide-{i}"'
    print(f"Slide {i} found with tag {start_tag}")

print("Scanning done.")
