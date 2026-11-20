with open('presentacion.html', 'r', encoding='utf-8') as f:
    css_content = f.read()

# Only replace CSS:
old_css = """.slide {
      display: none;
      width: 100%;
      height: 100%;
      padding: 38px 52px;
      flex-direction: column;
      justify-content: space-between;
      animation: slideIn 0.28s cubic-bezier(0.16, 1, 0.3, 1);
    }"""

new_css = """.slide {
      display: none;
      width: 100%;
      height: 100%;
      padding: 30px 48px;
      flex-direction: column;
      justify-content: flex-start;
      gap: 14px;
      animation: slideIn 0.28s cubic-bezier(0.16, 1, 0.3, 1);
    }"""

old_topbar = """.top-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }"""

new_topbar = """.top-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0px;
      padding-bottom: 10px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.07);
    }"""

old_header = """.slide-header {
      margin-bottom: 20px;
    }"""

new_header = """.slide-header {
      margin-bottom: 14px;
    }"""

old_card = """.card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 16px 18px;
      position: relative;
      transition: border-color 0.2s ease, background 0.2s ease;
    }"""

new_card = """.card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 18px 20px;
      position: relative;
      transition: border-color 0.2s ease, background 0.2s ease;
    }"""

css_content = css_content.replace(old_css, new_css)
css_content = css_content.replace(old_topbar, new_topbar)
css_content = css_content.replace(old_header, new_header)
css_content = css_content.replace(old_card, new_card)

with open('presentacion.html', 'w', encoding='utf-8') as f:
    f.write(css_content)

with open('frontend/public/presentacion.html', 'w', encoding='utf-8') as f:
    f.write(css_content)

print("CSS cleanly updated without touching any HTML tags!")
