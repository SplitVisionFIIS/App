import re

with open('presentacion.html', 'r', encoding='utf-8') as f:
    text = f.read()

# Normalize class on slide-3
text = text.replace('class="slide-page slide" id="slide-3"', 'class="slide" id="slide-3"')

# Remove the intermediate <div> wrapper after <div class="top-bar">...</div>
# In slides 1 through 11, we have:
#       <div class="top-bar">
#         ...
#       </div>
#       <div>
#         <div class="slide-header">
# and at the end of the slide, </div>\n    </div>

# Let's do a clean regex replacement or targeted replacement
pattern = re.compile(r'(<div class="top-bar">[\s\S]*?</div>)\s*<div>\s*(<div class="slide-header">)', re.MULTILINE)
text = pattern.sub(r'\1\n      \2', text)

# Also in slide 12:
# <div class="top-bar">...</div>\n      <div style="max-width: 800px; margin: 0 auto; text-align: center;">
# Slide 12 is centered, but we can make it fill nicely.

# Fix the closing </div> tags where we removed the outer <div>
# Each slide from 1 to 11 had:
#       </div>
#     </div>
# Let's verify by checking how many slides had double closing </div> before next slide
for i in range(1, 12):
    # Find slide boundary
    curr = f'id="slide-{i}"'
    nxt = f'id="slide-{i+1}"'
    start_pos = text.find(curr)
    end_pos = text.find(nxt)
    if start_pos != -1 and end_pos != -1:
        chunk = text[start_pos:end_pos]
        # Count <div> and </div> in chunk
        opens = chunk.count('<div')
        closes = chunk.count('</div')
        print(f"Slide {i}: opens={opens}, closes={closes}")

with open('presentacion.html', 'w', encoding='utf-8') as f:
    f.write(text)

with open('frontend/public/presentacion.html', 'w', encoding='utf-8') as f:
    f.write(text)

print("First pass completed.")
