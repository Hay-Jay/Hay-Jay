"""The three launch emails for Shopify Email's "Code your own" option, in the Monochrome Bureau dossier style.

    python3 make_emails.py        # writes src/01-t-minus-24.html, src/02-declassified.html, src/03-final-transmission.html
    python3 build.py BASE_URL     # src/ -> dist/, with __IMG__ replaced by where the images are hosted

Email-client rules followed here: table layout only, inline styles (the <style> block only holds the phone-width rules), every
image with width, height, alt and display:block, dark cell backgrounds so the emails still read with images off, live text in
web-safe fonts (Impact for headlines, Courier New for the dossier text), bulletproof table buttons. Shopify needs the unsubscribe
link and the open-tracking tag, both below.
"""
import os

HERE = os.path.dirname(os.path.abspath(__file__))
COUNTDOWN = 'https://monochrome.com.ng/pages/vision-issue'
PRODUCT = 'https://monochrome.com.ng/products/monochrome-magazine-the-vision-issue-print'
HOME = 'https://monochrome.com.ng/'
IG = 'https://www.instagram.com/monochrome.ca/'
TT = 'https://www.tiktok.com/@monochrome.ca'
MONO = "'Courier New', Courier, monospace"
HEAD = "Impact, 'Arial Narrow Bold', 'Arial Black', Arial, sans-serif"
AGENT = 'Agent{% if customer.first_name != blank %} {{ customer.first_name }}{% endif %},'

DARK = dict(page='#050505', card='#0c0c0c', line='#2a2a2a', fg='#ececec', body='#cfcfcf', dim='#8a8a8a', btn_bg='#ececec', btn_fg='#0a0a0a',
            mark='wordmark-white.png', tape_bg='#ececec', tape_fg='#0a0a0a')
PAPER = dict(page='#cfcfcc', card='#e4e4e2', line='#b9b9b6', fg='#0a0a0a', body='#262626', dim='#5c5c5c', btn_bg='#0a0a0a', btn_fg='#ececec',
             mark='wordmark-black.png', tape_bg='#0a0a0a', tape_fg='#ececec')


def head(title, preheader, c):
    pad = '&#847;&zwnj;&nbsp;' * 60
    return f'''<!doctype html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light only">
<title>{title}</title>
<style>
  body {{ margin: 0; padding: 0; -webkit-text-size-adjust: 100%; }}
  a {{ text-decoration: none; }}
  @media only screen and (max-width: 620px) {{
    .wrap {{ width: 100% !important; }}
    .px {{ padding-left: 22px !important; padding-right: 22px !important; }}
    .h1 {{ font-size: 44px !important; line-height: 44px !important; }}
    .fluid {{ width: 100% !important; height: auto !important; }}
    .btn a {{ padding: 18px 20px !important; font-size: 19px !important; }}
  }}
</style>
</head>
<body style="margin:0;padding:0;background:{c['page']};">
<div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">{preheader}{pad}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="{c['page']}" style="background:{c['page']};">
<tr><td align="center" style="padding:24px 8px;">
<table role="presentation" class="wrap" width="600" cellpadding="0" cellspacing="0" border="0" bgcolor="{c['card']}" style="width:600px;max-width:600px;background:{c['card']};border:1px solid {c['line']};">
'''


def topbar(left, right, c):
    return f'''<tr><td class="px" style="padding:18px 28px 14px;border-bottom:1px solid {c['line']};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
    <td style="font:bold 12px/16px {MONO};letter-spacing:3px;text-transform:uppercase;color:{c['fg']};"><span style="color:#ff3b30;">&#9679;</span>&nbsp; {left}</td>
    <td align="right" style="font:bold 12px/16px {MONO};letter-spacing:3px;text-transform:uppercase;color:{c['dim']};">{right}</td>
  </tr></table>
</td></tr>
'''


def mark(c, href=HOME):
    return f'''<tr><td align="center" style="padding:30px 28px 26px;">
  <a href="{href}" target="_blank"><img src="__IMG__/{c['mark']}" width="240" height="22" alt="MONOCHROME" style="display:block;width:240px;height:auto;border:0;outline:none;color:{c['fg']};font:bold 22px {HEAD};letter-spacing:4px;"></a>
</td></tr>
'''


def image(file, w, h, alt, c, href=None, pad='0'):
    img = (f'<img class="fluid" src="__IMG__/{file}" width="{w}" height="{h}" alt="{alt}" '
           f'style="display:block;width:{w}px;max-width:100%;height:auto;border:0;outline:none;background:{c["card"]};color:{c["fg"]};font:bold 18px/24px {MONO};">')
    if href:
        img = f'<a href="{href}" target="_blank">{img}</a>'
    return f'<tr><td align="center" style="padding:{pad};">{img}</td></tr>\n'


def text(html, c, pad='26px 40px 6px', size=16, line=26):
    return f'''<tr><td class="px" style="padding:{pad};font:{size}px/{line}px {MONO};color:{c['body']};">{html}</td></tr>\n'''


def h1(words, c, pad='30px 40px 4px', size=56):
    return f'''<tr><td class="px h1" style="padding:{pad};font:{size}px/{size}px {HEAD};letter-spacing:1px;text-transform:uppercase;color:{c['fg']};">{words}</td></tr>\n'''


def label(s, c, pad='26px 40px 8px'):
    return f'''<tr><td class="px" style="padding:{pad};font:bold 12px/16px {MONO};letter-spacing:4px;text-transform:uppercase;color:{c['dim']};">{s}</td></tr>\n'''


def rows(pairs, c, pad='0 40px 6px'):
    cells = ''.join(f'''<tr>
      <td style="padding:11px 0;border-bottom:1px dashed {c['line']};font:bold 14px/18px {MONO};letter-spacing:3px;text-transform:uppercase;color:{c['dim']};">{a}</td>
      <td align="right" style="padding:11px 0;border-bottom:1px dashed {c['line']};font:bold 20px/22px {HEAD};letter-spacing:1px;text-transform:uppercase;color:{c['fg']};">{b}</td>
    </tr>''' for a, b in pairs)
    return f'''<tr><td class="px" style="padding:{pad};"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">{cells}</table></td></tr>\n'''


def button(words, href, c, pad='30px 40px 10px'):
    return f'''<tr><td class="px" align="center" style="padding:{pad};">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
    <td class="btn" align="center" bgcolor="{c['btn_bg']}" style="background:{c['btn_bg']};">
      <a href="{href}" target="_blank" style="display:block;padding:20px 24px;font:bold 22px/26px {HEAD};letter-spacing:2px;text-transform:uppercase;color:{c['btn_fg']};text-decoration:none;">{words}&nbsp;&nbsp;&#8599;</a>
    </td></tr></table>
</td></tr>
'''


def link_line(html, c, pad='12px 40px 30px'):
    return f'''<tr><td class="px" align="center" style="padding:{pad};font:bold 13px/20px {MONO};letter-spacing:2px;text-transform:uppercase;color:{c['dim']};">{html}</td></tr>\n'''


def tape(words, c):
    return f'''<tr><td align="center" bgcolor="{c['tape_bg']}" style="background:{c['tape_bg']};padding:12px 10px;font:bold 12px/16px {MONO};letter-spacing:4px;text-transform:uppercase;color:{c['tape_fg']};">{words}</td></tr>\n'''


def foot():
    c = DARK
    return f'''<tr><td class="px" bgcolor="#080808" style="background:#080808;padding:30px 40px 34px;border-top:1px solid {c['line']};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr><td align="center" style="padding:0 0 18px;"><a href="{HOME}" target="_blank"><img src="__IMG__/wordmark-white.png" width="150" height="14" alt="MONOCHROME" style="display:block;width:150px;height:auto;border:0;color:#ececec;font:bold 16px {HEAD};letter-spacing:3px;"></a></td></tr>
    <tr><td align="center" style="padding:0 0 16px;font:bold 12px/20px {MONO};letter-spacing:3px;text-transform:uppercase;">
      <a href="{IG}" target="_blank" style="color:#ececec;text-decoration:none;">Instagram</a>&nbsp;&nbsp;<span style="color:#555555;">//</span>&nbsp;&nbsp;<a href="{TT}" target="_blank" style="color:#ececec;text-decoration:none;">TikTok</a>&nbsp;&nbsp;<span style="color:#555555;">//</span>&nbsp;&nbsp;<a href="{HOME}" target="_blank" style="color:#ececec;text-decoration:none;">monochrome.com.ng</a>
    </td></tr>
    <tr><td align="center" style="font:12px/19px {MONO};color:#8a8a8a;">
      MONOCHROME&reg; &middot; Regina, Canada<br>
      The Monochrome Bureau is a work of fiction. MONOCHROME&reg; is a clothing brand.<br>
      You're getting this because you signed up at monochrome.com.ng.<br>
      <a href="{{{{ unsubscribe_url }}}}" target="_blank" style="color:#cfcfcf;text-decoration:underline;">Unsubscribe</a>
    </td></tr>
  </table>
</td></tr>
'''


def tail():
    return '''</table>
</td></tr>
</table>
{{ open_tracking_block }}
</body>
</html>
'''


CITIES = [('Regina', 'Sun 12:00'), ('Lagos', 'Sun 19:00'), ('Toronto', 'Sun 14:00'), ('London', 'Sun 19:00')]

# ---- E1: Saturday, T-minus 24 hours (dark) ----------------------------------------------------------------------------------------
c = DARK
e1 = (head('T-minus 24 hours — The Vision Issue', 'Sealed until Sunday 18 October, 12:00 Regina. Pre-orders are open.', c)
      + topbar('Priority transmission', 'File MC-016', c)
      + mark(c)
      + image('e1-hero.jpg', 600, 516, 'T-minus 24 hours. The Vision Issue, declassified Sunday 18 October, 12:00 Regina.', c, COUNTDOWN)
      + image('e1-clock.gif', 600, 400, 'Split-flap clock counting down from 24:00:00. Sunday 18 October, 12:00 Regina time.', c, COUNTDOWN, '6px 0 0')
      + text(f'''<p style="margin:0 0 16px;font-weight:bold;color:#ececec;letter-spacing:2px;text-transform:uppercase;">{AGENT}</p>
<p style="margin:0 0 16px;">The Vision Issue, MONOCHROME Magazine Volume 001, is sealed in evidence. In 24 hours the clock hits zero and the file opens.</p>
<p style="margin:0;">Twenty pages. Printed. Shipping to 29 countries. Pre-orders are open now.</p>''', c)
      + label('Declassification, local time', c)
      + rows(CITIES, c)
      + image('e1-evidence.jpg', 600, 669, 'The Vision Issue cover, sealed in an evidence bag with a CLASSIFIED stamp. Pre-orders open, $10 CAD.', c, PRODUCT, '30px 0 0')
      + button('Watch it hit zero', COUNTDOWN, c)
      + link_line(f'<a href="{PRODUCT}" target="_blank" style="color:#ececec;text-decoration:underline;">Pre-order your printed copy &mdash; $10 CAD</a>', c)
      + tape('Sealed until 18.10 &mdash; 12:00 Regina &nbsp;//&nbsp; Do not open', c)
      + foot() + tail())

# ---- E2: Sunday 12:00, declassified (paper) ---------------------------------------------------------------------------------------
c = PAPER
e2 = (head('Declassified — The Vision Issue is out', 'MONOCHROME Magazine, Volume 001. Twenty pages, printed. $10 CAD, ships to 29 countries.', c)
      + topbar('Declassified', '18.10 &middot; 12:00', c)
      + mark(c)
      + image('e2-declassified.gif', 600, 498, 'The Vision Issue file: the CLASSIFIED stamp is struck through and DECLASSIFIED is stamped over the cover.', c, PRODUCT)
      + image('e2-outnow.jpg', 600, 150, 'OUT NOW. The Vision Issue, $10 CAD, 29 countries.', c, PRODUCT)
      + text(f'''<p style="margin:0 0 16px;font-weight:bold;color:#0a0a0a;letter-spacing:2px;text-transform:uppercase;">{AGENT}</p>
<p style="margin:0 0 16px;">The file is open. The Vision Issue, MONOCHROME's first magazine, is out now: twenty pages of style, play and culture, the people and the vision behind the brand. Printed, and ready to ship.</p>''', c)
      + label('Inside the file', c)
      + text('''Meet the dream team<br>The 77 File<br>Play Lab: crossword, maze, quiz<br>Night in Motion: the fashion show<br>The camera roll<br>The Store Edit''', c, '0 40px 6px', 18, 30)
      + label('Specifications', c)
      + rows([('Volume', '001'), ('Pages', '20'), ('Format', 'Printed copy'), ('Price', '$10 CAD'), ('Cleared for', '29 countries')], c)
      + button('Requisition your copy', PRODUCT, c)
      + link_line(f'<a href="{PRODUCT}" target="_blank" style="color:#0a0a0a;text-decoration:underline;">monochrome.com.ng</a>', c)
      + tape('Declassified &nbsp;//&nbsp; Out now &nbsp;//&nbsp; Enter the orbit', c)
      + foot() + tail())

# ---- E3: a few days later, final transmission (dark) ------------------------------------------------------------------------------
c = DARK
e3 = (head('Final transmission — The Vision Issue', 'The Vision Issue is out. Your printed copy is one click away.', c)
      + topbar('Final transmission', 'File MC-016', c)
      + mark(c)
      + image('e3-headline.jpg', 600, 150, 'Your copy is still in evidence.', c, PRODUCT, '0 0 18px')
      + image('e3-file.jpg', 600, 498, 'The Vision Issue file, stamped DECLASSIFIED: 20 pages, printed copy, $10 CAD, cleared for 29 countries.', c, PRODUCT)
      + text(f'''<p style="margin:0 0 16px;font-weight:bold;color:#ececec;letter-spacing:2px;text-transform:uppercase;">{AGENT}</p>
<p style="margin:0 0 16px;">The Vision Issue declassified on Sunday. Twenty pages on the people, the night and the vision behind MONOCHROME, printed and shipped to 29 countries.</p>
<p style="margin:0;">If yours isn't on its way yet, this is the signal.</p>''', c)
      + rows([('Volume', '001'), ('Format', 'Printed copy'), ('Price', '$10 CAD'), ('Ships to', '29 countries')], c, '20px 40px 6px')
      + button('Requisition your copy', PRODUCT, c)
      + link_line(f'<a href="{IG}" target="_blank" style="color:#ececec;text-decoration:underline;">See it on Instagram @monochrome.ca</a>', c)
      + tape('End of transmission &nbsp;//&nbsp; Enter the orbit', c)
      + foot() + tail())

os.makedirs(os.path.join(HERE, 'src'), exist_ok=True)
for name, html in (('01-t-minus-24', e1), ('02-declassified', e2), ('03-final-transmission', e3)):
    p = os.path.join(HERE, 'src', name + '.html')
    open(p, 'w', encoding='utf-8').write(html)
    print(name, len(html.encode()) // 1024, 'KB')
