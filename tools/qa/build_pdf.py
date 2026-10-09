import html, os, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
S = os.environ.get('QA_WORK', os.path.join(HERE, '.work'))   # scratch folder for screenshots and the html
os.makedirs(S, exist_ok=True)
SHOTS = os.environ.get('SHOTS', f'{S}/pdf-shots')
FONT = os.path.join(HERE, '..', '..', 'app', 'node_modules', '@expo-google-fonts', 'nunito')
OUT_HTML = f'{S}/ui-screens.html'
e = html.escape

# ---------------------------------------------------------------- content
MOBILE = [
    ('Getting started', 'First launch to the home screen. No account is needed to start reading.', [
        ('m01-welcome', "Who's reading?", 'First launch: a name or nickname, a buddy and a reading level: Sunrise, Spark or Seeker.'),
        ('m02-profile-filled', 'Profile ready', 'The chosen level is highlighted and the button enables once name and level are set.'),
        ('m03-home', 'Home', 'Title of the Week hero, Title of the Month and category chips. Covers lead everywhere.'),
        ('m04-home-shelves', 'Shelves', 'Popular right now and New stories. FREE and lock badges sit on the covers.'),
    ]),
    ('Discover and unlock', 'Story pages, locked stories and the parental gate that protects grown-up areas.', [
        ('m06-story-detail', 'Story detail', 'Reading level, pages, reading time, synopsis, a favourite heart and Save for offline. Listen and Watch are reserved for later phases.'),
        ('m14-story-premium-locked', 'Premium story', 'Locked stories point children to a grown-up. There are no prices or purchase buttons in the app.'),
        ('m15-parental-gate', 'Parental gate', 'A number-word challenge pre-readers cannot solve. Guards the Grown-ups area, profile switching and web links.'),
        ('m16-grownups', 'Grown-ups (signed out)', 'Sign in to unlock Premium on this device, manage readers, offline downloads and read the privacy policy.'),
    ]),
    ('The reader', 'One picture per page with the text underneath. Type size follows the reader\'s level and can be changed.', [
        ('m07-reader-day', 'Day theme', 'Picture on top, text below, progress pills, and big next/back buttons.'),
        ('m08-reader-sepia', 'Sepia theme', 'A warmer page for lamp-lit reading. The theme button cycles day, sepia and night.'),
        ('m09-reader-night-large', 'Night, larger text', 'Night theme with the A+ control used once, for bedtime reading.'),
        ('m10-reader-end', 'The End', 'A finish screen: read again, or go back for more stories. Progress is saved as the child reads.'),
    ]),
    ('My books', 'A personal shelf for every reader on the device, with search.', [
        ('m05-mybooks-empty', 'Empty state', 'Friendly empty states explain what will appear here.'),
        ('m11-mybooks-reading', 'Reading', 'Stories in progress, with a progress bar under each cover.'),
        ('m12-mybooks-favourites', 'Favourites', 'Everything the child has hearted.'),
        ('m13-mybooks-finished', 'Finished', 'Stories read to The End.'),
    ]),
    ('Offline reading', 'Save stories to the device and read them with no connection. The catalogue and Premium access are remembered too.', [
        ('m25-story-saved', 'Saved for offline', 'A saved story shows a clear "Saved" state and can be removed at any time.'),
        ('m26-mybooks-saved', 'Saved tab', 'Saved stories come from the device, so this shelf works with no connection at all.'),
    ]),
    ('Sign in and password reset', 'Parents use the same email they register with on the Genova website.', [
        ('m19-sign-in', 'Parent sign-in', '"Use the same email you register with on the Genova website." Create an account opens the website; Forgot password starts a reset.'),
        ('m20-forgot-code', 'Enter the code', 'We email a 6-digit code. Nothing sensitive travels through a link.'),
        ('m21-forgot-new-password', 'New password', 'Choose and repeat a new password.'),
        ('m22-forgot-done', 'All set', 'The parent is signed in with the new password.'),
    ]),
    ('Themes and reader modes', 'Amber buttons for the main actions in every theme. Parents choose Purple or Teal in Grown-ups; each theme has its own Day, Sepia and Night modes in the reader.', [
        ('m32-home-teal', 'Teal theme: Home', 'Teal accents for selection, tabs and cards. "Read now" stays amber.'),
        ('m34-reader-day-teal', 'Teal: Day', 'Bright page. The next-page button is the amber main action.'),
        ('m35-reader-sepia-teal', 'Teal: Sepia', 'A warm page for lamp-lit reading.'),
        ('m33-reader-night-teal', 'Teal: Night', 'Deep teal for bedtime. The reader remembers the last mode.'),
    ]),
    ('Passcode and kiosk mode', 'A parent with an account creates a 4-digit passcode. It replaces the number puzzle and is the only way out of kiosk mode.', [
        ('m27-passcode-create', 'Create a passcode', 'Offered right after sign-in, or any time from Grown-ups.'),
        ('m28-passcode-saved', 'Saved', 'Only a salted hash is stored. We email a note that it changed.'),
        ('m29c-grownups-settings', 'Appearance, passcode, kiosk', 'Theme picker, passcode and the Kiosk mode switch with plain-language notes.'),
        ('m30-gate-passcode', 'Passcode gate', 'Asked every time a child needs a grown-up, and again to leave kiosk mode. Five wrong tries lock it for a minute.'),
    ]),
    ('Readers and the Grown-ups area', 'Several children can share one device. Parents see their plan, readers, downloads and the privacy policy.', [
        ('m23-grownups-premium', 'Premium active', 'Account status, Manage on the web, readers, offline storage and privacy.'),
        ('m24-privacy-policy', 'Privacy policy', 'Opens as a pop-up from the Privacy card. The text is edited by CUSTAR in the admin dashboard and saved on the device for offline reading.'),
        ('m17-edit-reader', 'Edit reader', 'Change name, buddy or reading level.'),
        ('m18-switch-reader', 'Switch reader', 'A bottom sheet from the avatar on Home, behind the parental gate.'),
    ]),
]

WEB_PAGES = [
    ('Landing', 'Introduces Genova and its three reading levels, with plans and prices up front. No ages anywhere.', 'crop', ['w01-landing']),
    ('Plans', 'Free, Paid ₦5,000 per month and Paid ₦12,000 per quarter. Signed-out visitors go to sign-up first, then straight to checkout for the plan they chose.', 'single', ['w02-plans']),
    ('Create account and checkout', 'Parents register on the website, then pay with Paystack. Checkout shows the plan, price and billing period, and links to the privacy policy.', 'wpair', ['w03-signup', 'w04-checkout']),
    ('Your account', 'The Premium badge shows where the parent pays. Free accounts see Get Premium; the app unlocks with the same email.', 'wpair', ['w05-account-free', 'w06-account-premium']),
    ('Privacy consent at checkout', 'Before paying, the parent ticks a consent box and can read the privacy policy in a pop-up (the same text as the app). The consent and policy version are saved with the account.', 'wpair', ['w11-checkout-consent', 'w12-checkout-policy-popup']),
    ('Contact support', 'Parents message the Genova team from their account. Messages land in the admin Support inbox and past messages are listed here.', 'crop', ['w13-account-support']),
    ('Payment overdue', 'After a missed renewal the badge turns amber with a Renew now button. Five days past the due date the account moves to Free automatically.', 'wpair', ['w07-account-overdue', 'w08-login']),
    ('Password reset and privacy', 'Forgot password uses an emailed code, as in the app. The privacy policy page shows the same text as the app, edited from the admin.', 'wpair', ['w09-forgot', 'w10-privacy']),
]

ADMIN_PAIRS = [
    ('Dashboard', 'How Genova is doing today: stories, subscribers, readers, reads over time, top stories, upcoming releases and recent Paystack payments, with warnings that need attention.', 'single', ['a02-dashboard']),
    ('Stories', 'Search and filter the library by status and reading level. Publish or unpublish in one click; open any row to edit.', 'single', ['a03-stories']),
    ('Story editor', 'Edit a live story (left) and build a new one (right): cover and page image upload, drag-to-reorder pages, categories, free or Premium, reading level, draft/live/scheduled publishing, a live reader preview and a readiness checklist.', 'tall', ['a04-story-editor', 'a05-new-story-ready']),
    ('Publish checklist', 'The checklist blocks "Live" until the story has a title, synopsis, cover and at least one complete page. Drafts can always be saved.', 'single', ['a06-publish-checklist']),
    ('Featured', 'Title of the Week and Title of the Month, with what is on now and what is scheduled next.', 'single', ['a07-featured']),
    ('Schedule a featured story', 'Pick a live or scheduled story and a date range. The database rejects overlapping slots of the same kind, so the home screen always has one clear winner.', 'single', ['a08-schedule-featured']),
    ('Categories', 'Rename, reorder, add and delete the category chips shown on the app home screen.', 'single', ['a09-categories']),
    ('Subscribers', 'Search parents and see their plan, access status and access-until date. Paid access ends 5 days after a missed renewal. Each row has Access and Password actions.', 'single', ['a10-subscribers']),
    ('Manage access', 'Grant or adjust access for app-store reviewers, partners and support fixes, with an end date. A later Paystack event overrides it.', 'single', ['a11-manage-access']),
    ('Password help', 'Best option: email the parent a reset code so they choose their own password. If email is not working, set a temporary password. Both actions are logged.', 'single', ['a11b-password-help']),
    ('Email: connection', 'Paste a free Resend API key and press Activate. The key is stored on the server only and never shown again. Step-by-step help sits beside the form.', 'crop', ['a15-email-connection']),
    ('Email: send to parents', 'Write a message, pick the group (Premium, payment overdue, ending soon, Free or everyone), preview it as parents see it, then send.', 'crop', ['a16-email-send']),
    ('Email: scheduled reminders', 'A daily job (09:00 Nigeria time) sends three reminders: renewal coming up, Premium ending after cancelling, and last chance after a missed payment. Turn each on or off and choose how many days before. Each parent gets each reminder once per billing period.', 'crop', ['a19-email-reminders']),
    ('Email: templates', 'Ten editable templates: welcome, receipt, payment due, new title, broadcast, cancellation, passcode/password changed and the three reminders. Receipts, payment-due and cancellation emails go out automatically.', 'crop', ['a17-email-templates']),
    ('Support inbox', 'Messages parents send from their account. Mark resolved, keep private notes, or reply by email.', 'single', ['a18-support']),
    ('Settings', 'Edit the privacy policy with a live preview (version number goes up on publish), manage admins, and review the support log.', 'crop', ['a12-settings']),
    ('Admin sign in', 'Admin-only access, on the website at /admin/. Signed-in accounts that are not admins see a clear "No admin access" message.', 'single', ['a01-login']),
    ('On a phone', 'The dashboard is responsive: the sidebar becomes a compact top bar and tables scroll.', 'phones', ['a13-mobile-dashboard', 'a14-mobile-editor']),
]
ADMIN_CAP = {
    'a02-dashboard': 'Dashboard', 'a03-stories': 'Stories', 'a04-story-editor': 'Editing a live story', 'a05-new-story-ready': 'New story, ready to publish',
    'a06-publish-checklist': 'Checklist blocks an incomplete story', 'a11-manage-access': 'Manage subscriber access', 'a11b-password-help': 'Password help',
    'a07-featured': 'Featured slots', 'a08-schedule-featured': 'Schedule a featured story', 'a09-categories': 'Categories', 'a10-subscribers': 'Subscribers',
    'a01-login': 'Admin sign in', 'a15-email-connection': 'Email: connect Resend', 'a16-email-send': 'Email: write and preview', 'a17-email-templates': 'Email: templates', 'a19-email-reminders': 'Email: scheduled reminders', 'a18-support': 'Support inbox', 'a12-settings': 'Settings: privacy policy, admins, support log', 'a13-mobile-dashboard': 'Dashboard on mobile', 'a14-mobile-editor': 'Editor on mobile',
    'w01-landing': 'Landing page (top of page)', 'w02-plans': 'Plans', 'w03-signup': 'Create account', 'w04-checkout': 'Checkout', 'w05-account-free': 'Account: Free plan',
    'w06-account-premium': 'Account: Premium badge', 'w11-checkout-consent': 'Checkout: consent box', 'w12-checkout-policy-popup': 'Privacy policy pop-up', 'w13-account-support': 'Account: contact support', 'w07-account-overdue': 'Account: payment overdue', 'w08-login': 'Sign in', 'w09-forgot': 'Forgot password: enter code', 'w10-privacy': 'Privacy policy',
}

# ---------------------------------------------------------------- html helpers
try:
    from PIL import Image
    _src = f'{SHOTS}/m29-grownups-settings.png'
    if os.path.exists(_src):
        _im = Image.open(_src); _im.crop((0, 470, _im.size[0], 470 + 1688)).save(f'{SHOTS}/m29c-grownups-settings.png')
except ImportError:
    pass
pages = []  # (title for contents, html)
def foot(n, label):
    return f'<div class="foot"><span>Genova · UI Screens</span><span>{e(label)}</span><span>{n}</span></div>'
def img(name): return f'file://{SHOTS}/{name}.png'

def mobile_page(title, sub, items):
    cols = ''.join(f'<figure><div class="phone"><img src="{img(n)}"></div><figcaption><b>{e(t)}</b><span>{e(d)}</span></figcaption></figure>' for n, t, d in items)
    return f'<div class="head"><div class="kick">MOBILE APP</div><h2>{e(title)}</h2><p>{e(sub)}</p></div><div class="phones n{len(items)}">{cols}</div>'

def admin_page(title, sub, kind, names, kicker='ADMIN DASHBOARD'):
    head = f'<div class="head"><div class="kick">{kicker}</div><h2>{e(title)}</h2><p>{e(sub)}</p></div>'
    fig = lambda n, cls='': f'<figure class="shot {cls}"><img src="{img(n)}"><figcaption>{e(ADMIN_CAP[n])}</figcaption></figure>'
    if kind == 'single': body = f'<div class="adm single">{fig(names[0])}</div>'
    elif kind == 'pair': body = f'<div class="adm pair">{fig(names[0])}{fig(names[1])}</div>'
    elif kind == 'crop': body = f'<div class="adm single crop">{fig(names[0])}</div>'
    elif kind == 'wpair': body = f'<div class="adm wpair">{fig(names[0])}{fig(names[1])}</div>'
    elif kind == 'tall': body = f'<div class="adm tall">{fig(names[0])}{fig(names[1])}</div>'
    else: body = f'<div class="adm phones2">' + ''.join(f'<figure><div class="phone"><img src="{img(n)}"></div><figcaption><b>{e(ADMIN_CAP[n])}</b></figcaption></figure>' for n in names) + '</div>'
    return head + body

# ---------------------------------------------------------------- assemble pages
toc = []
n = 1
cover = f'''<div class="cover">
  <div class="blob b1"></div><div class="blob b2"></div>
  <div class="logo">Gen<i>o</i>va</div>
  <h1>UI Screens</h1>
  <p class="lead">Mobile app for young readers, the Genova website, and the admin dashboard &amp; CMS</p>
  <div class="chips"><span>{sum(len(i) for _, _, i in MOBILE)} app screens</span><span>{sum(len(n) for _, _, _, n in WEB_PAGES)} website screens</span><span>{sum(len(n) for _, _, _, n in ADMIN_PAIRS)} admin screens</span></div>
  <div class="by">A CUSTAR product · October 2026</div>
  <div class="note">Screens show sample stories and sample data. The app is captured from the web build of the same code that ships to iOS and Android; the website and admin are shown with a test backend.</div>
</div>'''
pages.append(('cover', cover)); n += 1

found = f'''<div class="head"><div class="kick">FOUNDATIONS</div><h2>Brand, type and components</h2><p>Built on the four CUSTAR brand colours: amber for main actions, with a purple and a teal theme. Charcoal text is used on teal and amber because white on teal is only 3.2:1.</p></div>
<div class="found">
  <div class="col">
    <h3>Colour</h3>
    <div class="sw">
      <div><i style="background:#ab46d2"></i><b>Purple</b><span>#ab46d2</span><em>Theme accent (purple theme): selection, tabs, cards. White text 4.6:1</em></div>
      <div><i style="background:#10a19c"></i><b>Teal</b><span>#10a19c</span><em>Second accent; the teal theme's main accent. Charcoal text 4.9:1</em></div>
      <div><i style="background:#ffbe00"></i><b>Amber</b><span>#ffbe00</span><em>Main actions in every theme, plus FREE and Title of the Week. Charcoal text 9.4:1</em></div>
      <div><i style="background:#232323"></i><b>Charcoal</b><span>#232323</span><em>Text and the admin sidebar</em></div>
    </div>
    <div class="sw small">
      <div><i style="background:#7a2e99"></i><span>#7a2e99</span><em>Deep purple</em></div>
      <div><i style="background:#f4e6fa"></i><span>#f4e6fa</span><em>Soft purple</em></div>
      <div><i style="background:#dcf3f2"></i><span>#dcf3f2</span><em>Soft teal</em></div>
      <div><i style="background:#fff2c7"></i><span>#fff2c7</span><em>Soft amber</em></div>
      <div><i style="background:#fbf8fd;border:1px solid #ece3f1"></i><span>#fbf8fd</span><em>Background</em></div>
    </div>
    <h3>Typeface: Nunito</h3>
    <div class="type"><span style="font-weight:900;font-size:30px">Hi, Ada! What shall we read today?</span><span style="font-weight:800;font-size:17px">Popular right now · Most read this month</span><span style="font-weight:600;font-size:14px;color:#6b6472">Spark · 4 min. Semi-bold for body, extra-bold for labels, black for titles.</span></div>
  </div>
  <div class="col">
    <h3>Components</h3>
    <div class="comp"><span class="btn p">Start reading</span><span class="btn s">Add a reader</span><span class="btn g">Cancel</span><span class="btn d">Delete</span></div>
    <div class="comp"><span class="chip on">All</span><span class="chip">Adventure</span><span class="chip">Animals</span><span class="chip">Bedtime</span></div>
    <div class="comp"><span class="pill live">Live</span><span class="pill sched">Scheduled</span><span class="pill draft">Draft</span><span class="pill free">FREE</span><span class="pill prem">Premium</span></div>
    <div class="comp"><span class="seg"><b>Sunrise</b><b class="on">Spark</b><b>Seeker</b></span></div>
    <h3>Design principles</h3>
    <ul>
      <li><b>Thumbnail first.</b> Covers and pictures carry every screen; text supports them.</li>
      <li><b>Safe for children.</b> No ads, no prices, no purchase buttons. Grown-up areas sit behind a parental gate.</li>
      <li><b>Type grows with the reader.</b> Earlier reading levels get larger text; every child can change it.</li>
      <li><b>Easy to tap.</b> Controls are at least 44 pt; the whole app works one-handed.</li>
      <li><b>Soft and springy.</b> Rounded shapes, gentle shadows and a light press-in on every tap.</li>
    </ul>
  </div>
</div>'''
pages.append(('Foundations', found)); n += 1

toc_page_index = len(pages)  # insert after foundations
pages.append(('Contents', ''))  # placeholder
n += 1

for title, sub, items in MOBILE:
    pages.append((f'App: {title}', mobile_page(title, sub, items))); n += 1
for title, sub, kind, names in WEB_PAGES:
    pages.append((f'Website: {title}', admin_page(title, sub, kind, names, 'WEBSITE'))); n += 1
for title, sub, kind, names in ADMIN_PAIRS:
    pages.append((f'Admin: {title}', admin_page(title, sub, kind, names))); n += 1

toc_rows = ''.join(f'<li><span>{e(t)}</span><i></i><b>{i + 1}</b></li>' for i, (t, h) in enumerate(pages) if t not in ('cover', 'Contents'))
pages[toc_page_index] = ('Contents', f'''<div class="head"><div class="kick">CONTENTS</div><h2>What is in this document</h2><p>Sections of the mobile app, the website, then the admin dashboard.</p></div>
<ol class="toc">{toc_rows}</ol>
<div class="map"><b>How the app fits together</b>
<div class="flow"><span>Welcome<br><em>who's reading</em></span><u>›</u><span>Home<br><em>week · month · shelves</em></span><u>›</u><span>Story<br><em>detail</em></span><u>›</u><span>Reader<br><em>pages · The End</em></span></div>
<div class="flow two"><span>My books<br><em>reading · favourites · finished</em></span><span>Grown-ups<br><em>gate → account · readers</em></span></div></div>''')

body = ''
for i, (t, h) in enumerate(pages):
    if t == 'cover': body += f'<section class="page cover-page">{h}</section>'
    else: body += f'<section class="page">{h}{foot(i + 1, t)}</section>'

css = f'''
@font-face{{font-family:Nunito;font-weight:600;src:url(file://{FONT}/600SemiBold/Nunito_600SemiBold.ttf)}}
@font-face{{font-family:Nunito;font-weight:700;src:url(file://{FONT}/800ExtraBold/Nunito_800ExtraBold.ttf)}}
@font-face{{font-family:Nunito;font-weight:800;src:url(file://{FONT}/800ExtraBold/Nunito_800ExtraBold.ttf)}}
@font-face{{font-family:Nunito;font-weight:900;src:url(file://{FONT}/900Black/Nunito_900Black.ttf)}}
@page{{size:297mm 210mm;margin:0}}
*{{box-sizing:border-box;margin:0}}
body{{font-family:Nunito,sans-serif;color:#232323;-webkit-print-color-adjust:exact;print-color-adjust:exact}}
.page{{width:297mm;height:210mm;position:relative;overflow:hidden;page-break-after:always;background:#fbf8fd;padding:13mm 14mm 0}}
.page:not(.cover-page)::before{{content:'';position:absolute;left:0;top:0;right:0;height:3mm;background:linear-gradient(90deg,#ab46d2,#10a19c 60%,#ffbe00)}}
.head{{margin-bottom:5mm}}
.kick{{font-size:8.5pt;font-weight:900;letter-spacing:.14em;color:#ab46d2}}
h2{{font-size:24pt;font-weight:900;letter-spacing:-.02em;line-height:1.1;margin-top:1mm}}
h3{{font-size:12pt;font-weight:900;margin:5mm 0 2.5mm}}
.head p{{font-size:10.5pt;color:#6b6472;margin-top:1.5mm;max-width:215mm;font-weight:600;line-height:1.4}}
.foot{{position:absolute;left:14mm;right:14mm;bottom:6mm;display:flex;justify-content:space-between;font-size:7.5pt;color:#6b6472;font-weight:700;border-top:.3mm solid #ece3f1;padding-top:2mm}}
.foot span:nth-child(2){{color:#ab46d2}}
/* cover */
.cover-page{{padding:0;background:linear-gradient(135deg,#ab46d2 0%,#7a2e99 52%,#10a19c 100%);color:#fff}}
.cover{{position:absolute;inset:0;padding:30mm 24mm}}
.blob{{position:absolute;border-radius:50%;opacity:.9}}
.b1{{width:120mm;height:120mm;right:-25mm;top:-35mm;background:#ffbe00;opacity:.95}}
.b2{{width:90mm;height:90mm;right:30mm;bottom:-40mm;background:#10a19c;opacity:.7}}
.logo{{font-size:30pt;font-weight:900;letter-spacing:-.02em;position:relative}} .logo i{{font-style:normal;color:#ffbe00}}
.cover h1{{font-size:62pt;font-weight:900;letter-spacing:-.03em;line-height:1;margin-top:34mm;position:relative}}
.lead{{font-size:15pt;font-weight:700;margin-top:6mm;max-width:150mm;opacity:.95;position:relative;line-height:1.35}}
.chips{{display:flex;gap:3mm;margin-top:9mm;position:relative}} .chips span{{background:rgba(255,255,255,.18);border:.3mm solid rgba(255,255,255,.45);padding:2mm 5mm;border-radius:99mm;font-weight:800;font-size:10pt}}
.by{{position:absolute;left:24mm;bottom:20mm;font-weight:800;font-size:11pt}}
.note{{position:absolute;left:24mm;bottom:12mm;font-size:8pt;opacity:.85;max-width:170mm;font-weight:600}}
/* phones */
.phones{{display:grid;gap:5mm;justify-content:center;margin-top:1mm}}
.phones.n2{{grid-template-columns:repeat(2,60mm);gap:14mm}} .phones.n4{{grid-template-columns:repeat(4,60mm)}} .phones.n3{{grid-template-columns:repeat(3,60mm);gap:14mm}}
figure{{margin:0}}
.phone{{background:#232323;border-radius:6mm;padding:1.1mm;box-shadow:0 2mm 5mm rgba(59,26,74,.25)}}
.phone img{{display:block;width:100%;border-radius:5mm}}
figcaption{{margin-top:2.5mm;font-size:8pt;line-height:1.35;color:#6b6472;font-weight:600}}
figcaption b{{display:block;color:#232323;font-size:10pt;font-weight:900;margin-bottom:.5mm}}
/* admin */
.adm figure{{margin:0}} .shot img{{display:block;width:100%;border-radius:2.5mm;box-shadow:0 1.5mm 4mm rgba(59,26,74,.22);border:.25mm solid #ece3f1}}
.shot figcaption{{text-align:center;margin-top:2mm}}
.adm.single{{display:flex;justify-content:center}} .adm.single .shot{{width:205mm}}
.adm.crop .shot img{{max-height:138mm;object-fit:cover;object-position:top}} .adm.wpair{{display:grid;grid-template-columns:1fr 1fr;gap:6mm}} .adm.wpair .shot img{{max-height:128mm;object-fit:cover;object-position:top}}
.adm.pair{{display:grid;grid-template-columns:1fr 1fr;gap:6mm}}
.adm.tall{{display:grid;grid-template-columns:112mm 100mm;gap:8mm;justify-content:center}}
.adm.tall .shot img{{max-height:141mm;object-fit:cover;object-position:top}}
.adm.phones2{{display:grid;grid-template-columns:repeat(2,64mm);gap:12mm;justify-content:center}}
/* foundations */
.found{{display:grid;grid-template-columns:1.1fr 1fr;gap:10mm}} .found h3:first-child{{margin-top:0}}
.sw{{display:grid;grid-template-columns:repeat(4,1fr);gap:3mm}} .sw.small{{grid-template-columns:repeat(5,1fr);margin-top:3mm}}
.sw div{{display:flex;flex-direction:column;gap:.6mm;font-size:7.5pt;color:#6b6472;font-weight:600;line-height:1.3}}
.sw i{{display:block;height:15mm;border-radius:3mm;margin-bottom:1mm}} .sw.small i{{height:8mm}} .sw b{{color:#232323;font-size:10pt;font-weight:900}} .sw span{{font-weight:800;color:#232323}} .sw em{{font-style:normal}}
.type{{display:flex;flex-direction:column;gap:2mm;background:#fff;border:.3mm solid #ece3f1;border-radius:4mm;padding:4mm 5mm}}
.comp{{display:flex;gap:2.5mm;align-items:center;flex-wrap:wrap;margin-bottom:3.5mm}}
.btn{{padding:2.4mm 5mm;border-radius:99mm;font-weight:900;font-size:9.5pt}} .btn.p{{background:#ffbe00;color:#232323}} .btn.s{{background:#dcf3f2;color:#0b6f6b}} .btn.g{{color:#7a2e99}} .btn.d{{background:#fdeceb;color:#c0392b}}
.chip{{padding:1.8mm 4mm;border-radius:99mm;border:.4mm solid #ece3f1;background:#fff;font-weight:800;font-size:9pt}} .chip.on{{background:#ab46d2;color:#fff;border-color:#ab46d2}}
.pill{{padding:.9mm 3mm;border-radius:99mm;font-weight:900;font-size:7.5pt}} .pill.live{{background:#dcf3f2;color:#0b6f6b}} .pill.sched{{background:#fff2c7;color:#7a5a00}} .pill.draft{{background:#ece3f1;color:#6b6472}} .pill.free{{background:#ffbe00}} .pill.prem{{background:#f4e6fa;color:#7a2e99}}
.seg{{display:inline-flex;background:#ece3f1;border-radius:99mm;padding:.8mm}} .seg b{{padding:1.8mm 4mm;border-radius:99mm;font-size:8.5pt;font-weight:800;color:#6b6472}} .seg b.on{{background:#fff;color:#7a2e99}}
.found ul{{padding-left:4.5mm;font-size:9.5pt;line-height:1.4;font-weight:600;color:#232323}} .found li{{margin-bottom:2mm}}
/* contents */
.toc{{list-style:none;padding:0;columns:2;column-gap:14mm;font-size:10pt;font-weight:700}} .toc li{{display:flex;gap:2mm;align-items:baseline;padding:1mm 0;break-inside:avoid}} .toc i{{flex:1;border-bottom:.3mm dotted #b9b0c0;transform:translateY(-1mm)}} .toc b{{color:#ab46d2}}
.map{{margin-top:5mm;background:#fff;border:.3mm solid #ece3f1;border-radius:4mm;padding:4mm 8mm}} .map>b{{font-size:12pt;font-weight:900}}
.flow{{display:flex;align-items:center;gap:4mm;margin-top:5mm}} .flow span{{background:#f4e6fa;color:#7a2e99;border-radius:3mm;padding:3mm 6mm;font-weight:900;font-size:11pt;line-height:1.25;text-align:center}} .flow em{{font-style:normal;font-weight:600;font-size:8pt;color:#6b6472}} .flow u{{text-decoration:none;font-size:20pt;color:#ab46d2;font-weight:900}} .flow.two span{{background:#dcf3f2;color:#0b6f6b}}
'''
open(OUT_HTML, 'w').write(f'<!doctype html><html><head><meta charset="utf-8"><title>Genova UI Screens</title><style>{css}</style></head><body>{body}</body></html>')
print('pages:', len(pages))
