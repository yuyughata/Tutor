"""Builds the Genova UI Screens PDF (landscape A4) as HTML; print_pdf.cjs turns it into the PDF.

Layout rules (so every page is neat):
  * App screens: up to 4 phones per page. A group with more is split over several pages (balanced), titled "(1 of 2)".
  * Website and landing page: each screenshot is cut into slices that fit a page; two slices sit side by side.
  * Admin: screenshots are shown wide; tall ones are cut into consecutive full-width slices over several pages.
  * Cuts are made on blank rows where possible, never through the middle of a line of text.
  * check_pdf_layout.cjs verifies nothing overflows a page.
Run:  SHOTS=<folder with the screenshots> python3 build_pdf.py
"""
import html, math, os

HERE = os.path.dirname(os.path.abspath(__file__))
S = os.environ.get('QA_WORK', os.path.join(HERE, '.work'))
os.makedirs(S, exist_ok=True)
SHOTS = os.environ.get('SHOTS', f'{S}/shots')
SLICES = f'{S}/pdf-slices'
os.makedirs(SLICES, exist_ok=True)
FONT = os.path.join(HERE, '..', '..', 'app', 'node_modules', '@expo-google-fonts', 'nunito')
OUT_HTML = f'{S}/ui-screens.html'
e = html.escape
from PIL import Image

# ======================================================================= content
PHONES = 'phones'
MOBILE = [
    ('Getting started', 'First launch to the home screen. No account is needed to start reading.', [
        ('m01-welcome', "Who's reading?", 'First launch: a name or nickname, a buddy and a reading level: Sunrise, Spark or Seeker.'),
        ('m02-profile-filled', 'Profile ready', 'The chosen level is highlighted and the button turns on once a name and level are set.'),
        ('m03-home', 'Home', 'Title of the Week hero, Title of the Month and category chips. Covers lead every screen.'),
        ('m04-home-shelves', 'Shelves', 'Popular right now and New stories. FREE and lock badges sit on the covers.'),
    ]),
    ('Discover and unlock', 'Story pages, locked stories and the parental gate that protects grown-up areas.', [
        ('m06-story-detail', 'Story detail', 'Reading level, pages, reading time, synopsis, a favourite heart and Save for offline. Listen and Watch are reserved for later.'),
        ('m14-story-premium-locked', 'Premium story', 'Locked stories point children to a grown-up. There are no prices or purchase buttons in the app.'),
        ('m15-parental-gate', 'Parental gate', 'A number-word puzzle that pre-readers cannot solve. It guards the Grown-ups area, switching readers and web links.'),
        ('m16-grownups', 'Grown-ups (signed out)', 'Sign in to unlock Premium on this device, manage readers and downloads, and read the privacy policy.'),
    ]),
    ('The reader', "One picture per page with the text underneath, justified in a comfortable column. Type size follows the reader's level and can be changed.", [
        ('m07-reader-day', 'Day mode', 'Picture on top, text below, progress pills and big next and back buttons.'),
        ('m08-reader-sepia', 'Sepia mode', 'A warmer page for lamp-lit reading. The mode button cycles Day, Sepia and Night.'),
        ('m09-reader-night-large', 'Night mode, larger text', 'Night mode with the larger-text button used once, for bedtime reading.'),
        ('m10-reader-end', 'The End', 'Read again, or go back for more stories. Progress is saved as the child reads.'),
    ]),
    ('Chapters and long pages', 'A book can have chapters. The story page lists them and the reader can jump between them. Long pages scroll.', [
        ('m36-story-chapters-words', 'Story page', 'The chapter list (tap one to start there) and the new words to explore.'),
        ('m37-reader-chapter-word', 'In the reader', 'The chapter heading sits above the text. The new word glows and can be tapped.'),
        ('m39-chapter-sheet', 'Chapter list', 'Tap the chapter heading to jump to any chapter.'),
        ('m40-long-text-scrolls', 'Long pages scroll', 'A page with a lot of text scrolls under the picture, and the last line stays clear of the buttons.'),
    ]),
    ('Word Explorer, badges and rewards', 'Spark stories have one new word and Seeker stories have three. Badges and the word garden are worked out on the device, with nothing to download.', [
        ('m38-word-sheet', 'Word Explorer', 'The meaning and an example sentence. "I learned it" saves the word.'),
        ('m41-end-words-stats', 'The End', 'A one-time star burst (skipped when the device asks for less motion), a "New badges!" card, the new words and this week\'s count.'),
        ('m43-mybooks-badges', 'Counts, badges and rewards', 'Stories finished this week, this month and all time, nine milestone badges, and rewards given by the Genova team.'),
        ('m42-mybooks-words', 'Word garden', 'The Words shelf grows a plant as words are learned: seed, sprout, leafy plant, flower, sunflower, tree.'),
    ]),
    ('A song after the story', 'A story can have one song. Friendly hints while reading say a song is waiting; it unlocks on The End and plays only when the child taps it. It loads while they read, so there is no wait.', [
        ('m44-story-has-song', 'Story page', 'A "Has a song" fact tells the child there is a reward at the end.'),
        ('m45-reader-song-hint', 'Hint on the first page', 'A small note: a little song is waiting at the end. Hints appear on only a few pages, so they stay a treat.'),
        ('m46-reader-song-last', 'Hint on the last page', 'Turn the page to unlock the song.'),
        ('m47-end-song-ready', 'Song unlocked', 'The End shows the song with a big play button. It never starts by itself.'),
        ('m48-end-song-playing', 'Playing', 'Play and pause, a progress bar and the time. It stops when the child goes back a page or closes the story.'),
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
    ('Themes and reader modes', 'Purple is the default, with purple main buttons. Parents can choose Teal in Grown-ups, which has amber main buttons. Each theme has its own Day, Sepia and Night modes in the reader.', [
        ('m32-home-teal', 'Teal theme: Home', 'Teal accents for selection, tabs and cards, with amber main buttons.'),
        ('m34-reader-day-teal', 'Teal: Day', 'A bright page. The next-page button is the amber main action.'),
        ('m35-reader-sepia-teal', 'Teal: Sepia', 'A warm page for lamp-lit reading.'),
        ('m33-reader-night-teal', 'Teal: Night', 'Deep teal for bedtime. The reader remembers the last mode.'),
    ]),
    ('Passcode and Screen Lock', 'A parent with an account creates a 4-digit passcode. It replaces the number puzzle and is the only way out of Screen Lock.', [
        ('m27-passcode-create', 'Create a passcode', 'Offered right after sign-in, or any time from Grown-ups.'),
        ('m28-passcode-saved', 'Saved', 'Only a salted hash is stored. We email a note that it changed.'),
        ('m29c-grownups-settings', 'Appearance, passcode, Screen Lock', 'The theme picker, the passcode and the Screen Lock switch, with plain-language notes.'),
        ('m30-gate-passcode', 'Passcode gate', 'Asked every time a child needs a grown-up, and again to leave Screen Lock. Five wrong tries lock it for a minute.'),
    ]),
    ('Readers and the Grown-ups area', 'Several children can share one device. Parents see their plan, readers, downloads and the privacy policy.', [
        ('m23-grownups-premium', 'Premium active', 'Account status, Manage on the web, readers, offline storage and privacy.'),
        ('m24-privacy-policy', 'Privacy policy', 'Opens as a pop-up. CUSTAR edits the text in the admin dashboard, and a saved copy is kept for offline reading.'),
        ('m17-edit-reader', 'Edit reader', 'Change name, buddy or reading level.'),
        ('m18-switch-reader', 'Switch reader', 'A bottom sheet from the avatar on Home, behind the parental gate.'),
    ]),
]

# website: (title, sub, [(image, caption)]) -- shown as columns; phone groups use PHONES
WEB = [
    ('Landing: welcome', 'The CUSTAR landing page. It opens with the Genova promise, three programmes and the Genova app, then tells the story behind it.', [
        ('w01a-landing-hero', 'Header, hero and what Genova offers'), ('w01b-landing-about', 'Our story')]),
    ('Landing: pillars and reading levels', 'Seven pillars of whole-child development, and three reading levels: Sunrise, Spark and Seeker. Levels are named, never aged.', [
        ('w01c-landing-pillars', 'The seven pillars'), ('w01d-landing-levels', 'Reading levels')]),
    ('Landing: the Genova app and plans', 'The app block explains what the app offers, then live plans and the answers parents ask most. Payments happen here, never inside the app.', [
        ('w01e-landing-app', 'The Genova app'), ('w01f-landing-plans', 'Plans (live from the database)'), ('w01g-landing-faq', 'Questions parents ask')]),
    ('Landing: soft-copy bundles and title requests', 'One-off soft-copy storybook bundles ordered through Selar, and a form to request a title.', [
        ('w01h-landing-products', 'Storybook bundles'), ('w01i-landing-preorder', 'Request a title')]),
    ('Landing: reading program, library and parents', 'The after-school reading program with its request form, the physical Genova Library, and what parents say.', [
        ('w01j-landing-grp', 'Genova Reading Program'), ('w01k-landing-grp-form', 'Reading program request'), ('w01l-landing-library', 'Genova Library'), ('w01m-landing-testimonials', 'Parents are noticing')]),
    ('Landing: closing call to action and footer', 'A last invitation, then a footer with links to every part of the site, contact details and WhatsApp.', [
        ('w01n-landing-cta-footer', 'Call to action and footer')]),
    ('Landing on a phone', 'The same page on a phone: a compact header with a menu, a sticky shop bar, and every section stacked.', PHONES, [
        ('w01p-landing-phone-top', 'Top of the page', 'Menu button, sign in, and the hero.'),
        ('w01q-landing-phone-menu', 'Menu', 'Every section, plus Sign in and Get started.'),
        ('w01r-landing-phone-app', 'The Genova app', 'Features and how it works.'),
        ('w01s-landing-phone-plans', 'Plans', 'Free, Monthly and Quarterly, one under another.')]),
    ('Plans', 'Free, Paid ₦3,000 per month and Paid ₦7,500 per quarter. Signed-out visitors go to sign-up first, then straight to checkout for the plan they chose.', [
        ('w02-plans', 'Plans')]),
    ('Create account and checkout', 'Parents register on the website, then pay with Paystack. Checkout shows the plan, price and billing period, and links to the privacy policy.', [
        ('w03-signup', 'Create account'), ('w04-checkout', 'Checkout')]),
    ('Privacy consent at checkout', 'Before paying, the parent ticks a consent box and can read the privacy policy in a pop-up (the same text as the app). The consent and policy version are saved with the account.', [
        ('w11-checkout-consent', 'Checkout: consent box'), ('w12-checkout-policy-popup', 'Privacy policy pop-up')]),
    ('Your account', 'The Premium badge shows where the parent pays. Free accounts see Get Premium; the app unlocks with the same email.', [
        ('w05-account-free', 'Account: Free plan'), ('w06-account-premium', 'Account: Premium badge')]),
    ('Contact support', 'Parents message the Genova team from their account. Messages land in the admin Support inbox and past messages are listed here.', [
        ('w13-account-support', 'Account: contact support')]),
    ('Payment overdue', 'After a missed renewal the badge turns amber with a Renew now button. Five days past the due date the account moves to Free automatically.', [
        ('w07-account-overdue', 'Account: payment overdue')]),
    ('Sign in and password reset', 'Forgot password uses an emailed code, as in the app.', [
        ('w08-login', 'Sign in'), ('w09-forgot', 'Forgot password: enter code')]),
    ('Privacy policy', 'The privacy policy page shows the same text as the app, edited from the admin dashboard.', [
        ('w10-privacy', 'Privacy policy')]),
]

# admin: (title, sub, [(image, caption)])  -- shown wide, tall shots continue over pages
ADMIN = [
    ('Admin sign in', 'Admin-only access, on the website at /admin/. Signed-in accounts that are not admins see a clear "No admin access" message.', [('a01-login', 'Admin sign in')]),
    ('Dashboard', 'How Genova is doing today: stories, subscribers, readers, reads over time, top stories, upcoming releases and recent Paystack payments, with warnings that need attention.', [('a02-dashboard', 'Dashboard')]),
    ('Stories', 'Search and filter the library by status and reading level. Publish or unpublish in one click; open any row to edit.', [('a03-stories', 'Stories')]),
    ('Story editor', 'Edit a live story and build a new one: cover and page image upload, drag-to-reorder pages, categories, free or Premium, reading level, draft, live or scheduled publishing, a live reader preview and a readiness checklist.', [
        ('a04-story-editor', 'Editing a live story'), ('a05-new-story-ready', 'A new story, ready to publish')]),
    ('Chapters and Word Explorer', 'Switch on "This book has chapters" and title the first page of each chapter. Spark stories take one Word Explorer word and Seeker stories three, each with a meaning, an example and the page it shows on. The checklist makes sure they are complete.', [
        ('a20-editor-chapters-words', 'Editor: chapters and Word Explorer')]),
    ('Song', 'Each story can have one MP3 song. The file is made light in the browser (mono, 48 kbps, about 1 MB for 3 minutes) before it uploads, so it loads fast on a phone. The card shows the size before and after and a preview player. A song needs a title before the story can go Live.', [
        ('a23-editor-song-empty', 'Song card: no song yet'), ('a24-editor-song-ready', 'Song card: added, with preview')]),
    ('Publish checklist', 'The checklist blocks "Live" until the story has a title, synopsis, cover, complete pages, and (when they apply) chapters, its Word Explorer words and a song title (when a song is added). Drafts can always be saved.', [('a06-publish-checklist', 'Checklist blocks an incomplete story')]),
    ('Featured', 'Title of the Week and Title of the Month, with what is on now and what is scheduled next.', [('a07-featured', 'Featured slots')]),
    ('Schedule a featured story', 'Pick a live or scheduled story and a date range. The database rejects overlapping slots of the same kind, so the home screen always has one clear winner.', [('a08-schedule-featured', 'Schedule a featured story')]),
    ('Categories', 'Rename, reorder, add and delete the category chips shown on the app home screen.', [('a09-categories', 'Categories')]),
    ('Subscribers', 'Search parents and see their plan, access status and access-until date. Paid access ends 5 days after a missed renewal. Each row has Access and Password actions.', [('a10-subscribers', 'Subscribers')]),
    ('Manage access', 'Grant or adjust access for app-store reviewers, partners and support fixes, with an end date. A later Paystack event overrides it.', [('a11-manage-access', 'Manage subscriber access')]),
    ('Password help', 'Best option: email the parent a reset code so they choose their own password. If email is not working, set a temporary password. Both actions are logged.', [('a11b-password-help', 'Password help')]),
    ('Top readers', 'Who finished the most different stories this week, this month and all time (Nigerian time, weeks start on Monday). Only admins see the names.', [('a21-readers', 'Top readers')]),
    ('Give an award', "Reward a reader as time goes on: add a note and optionally email the parent. The award shows up on the reader's My books page.", [('a22-readers-award', 'Give an award')]),
    ('Email: connection', 'Paste a free Resend API key and press Activate. The key is stored on the server only and never shown again. Step-by-step help sits beside the form.', [('a15-email-connection', 'Email: connect Resend')]),
    ('Email: send to parents', 'Write a message, pick the group (Premium, payment overdue, ending soon, Free or everyone), preview it as parents see it, then send.', [('a16-email-send', 'Email: write and preview')]),
    ('Email: scheduled reminders', 'A daily job (09:00 Nigeria time) sends three reminders: renewal coming up, Premium ending after cancelling, and last chance after a missed payment. Each parent gets each reminder once per billing period.', [('a19-email-reminders', 'Email: scheduled reminders')]),
    ('Email: templates', 'Editable templates for the welcome, receipt, payment due, new title, broadcast, cancellation, security change, reminders and reader awards. Receipts, payment-due and cancellation emails go out automatically.', [('a17-email-templates', 'Email: templates')]),
    ('Support inbox', 'Messages parents send from their account. Mark resolved, keep private notes, or reply by email.', [('a18-support', 'Support inbox')]),
    ('Settings', 'Edit the privacy policy with a live preview (the version number goes up on publish), manage admins, and review the support log.', [('a12-settings', 'Settings: privacy policy, admins, support log')]),
    ('The dashboard on a phone', 'The dashboard is responsive: the sidebar becomes a compact top bar and tables scroll.', PHONES, [
        ('a13-mobile-dashboard', 'Dashboard on mobile', 'Counts and charts stack in one column.'),
        ('a14-mobile-editor', 'Editor on mobile', 'The editor works on a phone too.')]),
]

# the Grown-ups settings screenshot is tall: crop the Appearance, Passcode and Readers cards
_src = f'{SHOTS}/m29-grownups-settings.png'
if os.path.exists(_src):
    _im = Image.open(_src); _im.crop((0, 470, _im.size[0], 470 + 1790)).save(f'{SHOTS}/m29c-grownups-settings.png')

# ======================================================================= helpers
COMPRESS = os.environ.get('COMPRESS', '1') != '0'   # JPEG + sensible resolution keeps the PDF small (set COMPRESS=0 for lossless)
JPG = f'{S}/pdf-jpg'
os.makedirs(JPG, exist_ok=True)
def img_url(path, max_w=None):
    if COMPRESS and max_w:
        im = Image.open(path).convert('RGB')
        if im.size[0] > max_w: im = im.resize((max_w, round(im.size[1] * max_w / im.size[0])), Image.LANCZOS)
        out = f'{JPG}/{os.path.splitext(os.path.basename(path))[0]}-{max_w}.jpg'
        im.save(out, 'JPEG', quality=76, optimize=True, progressive=True)
        path = out
    return 'file://' + path

def blank_cut(im, target, window):
    """Row near `target` (within +-window) that looks blank (few distinct colours), so a cut never goes through text."""
    w, h = im.size
    best, best_score = target, 10 ** 9
    for y in range(max(1, target - window), min(h - 1, target + window)):
        row = im.crop((0, y, w, y + 1)).convert('RGB').resize((min(w, 160), 1))
        score = len(set(row.getdata())) * 100 + abs(y - target) // 6
        if score < best_score: best, best_score = y, score
    return best

def trim_footer(name):
    """Website screenshots are full pages ending in the dark footer; drop it (it is shown on the landing page) and return the new path."""
    src = f'{SHOTS}/{name}.png'
    im = Image.open(src).convert('RGB'); w, h = im.size
    y = h
    while y > 200:
        row = im.crop((0, y - 1, w, y)).resize((min(w, 200), 1), Image.NEAREST)
        dark = sum(1 for px in row.getdata() if sum(px) < 300)
        if dark < 0.55 * row.size[0]: break
        y -= 1
    if y >= h - 40: return src                      # no footer in this shot
    out = f'{SLICES}/{name}-nofooter.png'
    im.crop((0, 0, w, y)).save(out)
    return out

def slice_image(name, parts, src=None, crop_left_after_first=0):
    """Cut an image into `parts` consecutive pieces on blank rows; returns [(path, aspect)].
    crop_left_after_first drops the admin sidebar from the 2nd piece on, so continuation pages show more content."""
    src = src or f'{SHOTS}/{name}.png'
    im = Image.open(src)
    w, h = im.size
    if parts <= 1: return [(src, h / w)]
    cuts = [0] + [blank_cut(im, round(h * i / parts), int(h / parts * 0.25)) for i in range(1, parts)] + [h]
    out = []
    for i in range(parts):
        p = f'{SLICES}/{name}-{i + 1}of{parts}.png'
        piece = im.crop((0, cuts[i], w, cuts[i + 1]))
        if i and crop_left_after_first: piece = piece.crop((crop_left_after_first, 0, w, piece.size[1]))
        piece.save(p)
        out.append((p, piece.size[1] / piece.size[0]))
    return out

def phone_chunks(n, per=4):
    k = math.ceil(n / per)
    base, extra = divmod(n, k)
    sizes = [base + (1 if i < extra else 0) for i in range(k)]
    out, i = [], 0
    for s in sizes: out.append((i, i + s)); i += s
    return out

# ======================================================================= pages
pages = []          # dict(section=str|None, html=str)
section_first = {}  # section title -> index in pages
def add(section, body, first=False):
    if first and section: section_first.setdefault(section, len(pages))
    pages.append({'section': section, 'html': body})

def head(kicker, title, sub, part=None):
    t = f'{title} <small>({part[0]} of {part[1]})</small>' if part and part[1] > 1 else title
    return f'<div class="head"><div class="kick">{kicker}</div><h2>{t}</h2><p>{e(sub)}</p></div>'

def phone_pages(kicker, title, sub, items, cap=None):
    chunks = phone_chunks(len(items))
    for ci, (a, b) in enumerate(chunks):
        figs = ''.join(f'<figure><div class="phone"><img src="{img_url(f"{SHOTS}/{n}.png", 520)}"></div><figcaption><b>{e(t)}</b><span>{e(d)}</span></figcaption></figure>' for n, t, d in items[a:b])
        add(f'{kicker}|{title}', head(kicker, title, sub, (ci + 1, len(chunks))) + f'<div class="phones n{b - a}">{figs}</div>', first=ci == 0)

COL_W, COL_H = 130.0, 136.0   # mm, side-by-side columns (website and landing)
WIDE_W, WIDE_H = 262.0, 136.0 # mm, one wide figure (admin)

def desktop_pages(kicker, title, sub, items, mode):
    figs = []  # (path, aspect, caption)
    SIDEBAR = 248  # width of the admin sidebar in the screenshots
    for name, cap in items:
        src = f'{SHOTS}/{name}.png'
        if mode == 'cols' and name.startswith('w') and not name.startswith('w01') and name != 'w12-checkout-policy-popup': src = trim_footer(name)
        im = Image.open(src); a = im.size[1] / im.size[0]
        if mode == 'cols':
            k, crop = (1 if a <= 1.25 else math.ceil(a / 1.0)), 0
        else:
            crop = SIDEBAR
            k = 1 if a <= 0.80 else math.ceil((im.size[1] / (im.size[0] - SIDEBAR)) / 0.78)
        for i, (p, aa) in enumerate(slice_image(name, k, src, crop)):
            figs.append((p, aa, cap if k == 1 else f'{cap} ({i + 1} of {k})'))
    per = 2 if mode == 'cols' else 1
    chunks = [figs[i:i + per] for i in range(0, len(figs), per)]
    for ci, ch in enumerate(chunks):
        cells = ''
        for p, a, cap in ch:
            w = min(COL_W if mode == 'cols' and len(ch) > 1 else WIDE_W, (COL_H if mode == 'cols' else WIDE_H) / a)
            if mode == 'cols' and len(ch) == 1: w = min(WIDE_W, WIDE_H / a, 205.0)
            cells += f'<figure class="df" style="width:{w:.1f}mm"><img src="{img_url(p, 800 if mode == 'cols' else 1150)}"><figcaption>{e(cap)}</figcaption></figure>'
        add(f'{kicker}|{title}', head(kicker, title, sub, (ci + 1, len(chunks))) + f'<div class="dgrid">{cells}</div>', first=ci == 0)

# ---- cover
n_app = sum(len(s[2]) for s in MOBILE)
n_web = sum(len(s[2]) if len(s) == 3 else len(s[3]) for s in WEB)
n_adm = sum(len(s[2]) if len(s) == 3 else len(s[3]) for s in ADMIN)
cover = f'''<div class="cover">
  <div class="blob b1"></div><div class="blob b2"></div>
  <div class="logo">Gen<i>o</i>va</div>
  <h1>UI Screens</h1>
  <p class="lead">The mobile app for young readers, the Genova website, and the admin dashboard &amp; CMS</p>
  <div class="chips"><span>{n_app} app screens</span><span>{n_web} website screens</span><span>{n_adm} admin screens</span></div>
  <div class="by">A CUSTAR product · October 2026</div>
  <div class="note">Screens show sample stories and sample data. The app is captured from the web build of the same code that ships to iOS and Android; the website and admin are shown with a test backend.</div>
</div>'''

found = '''<div class="head"><div class="kick">FOUNDATIONS</div><h2>Brand, type and components</h2><p>The app is built on the CUSTAR brand colours: purple by default, with a teal theme. The website uses the CUSTAR landing page design on every page. Charcoal text is used on teal and amber because white on teal is only 3.2:1.</p></div>
<div class="found">
  <div class="col">
    <h3>Colour (app)</h3>
    <div class="sw">
      <div><i style="background:#ab46d2"></i><b>Purple</b><span>#ab46d2</span><em>Default accent and main buttons. White text 4.6:1</em></div>
      <div><i style="background:#10a19c"></i><b>Teal</b><span>#10a19c</span><em>Second accent; the teal theme's accent. Charcoal text 4.9:1</em></div>
      <div><i style="background:#ffbe00"></i><b>Amber</b><span>#ffbe00</span><em>Teal theme buttons, FREE and Title of the Week. Charcoal text 9.4:1</em></div>
      <div><i style="background:#232323"></i><b>Charcoal</b><span>#232323</span><em>Text and the admin sidebar</em></div>
    </div>
    <div class="sw small">
      <div><i style="background:#7a2e99"></i><span>#7a2e99</span><em>Deep purple</em></div>
      <div><i style="background:#f4e6fa"></i><span>#f4e6fa</span><em>Soft purple</em></div>
      <div><i style="background:#dcf3f2"></i><span>#dcf3f2</span><em>Soft teal</em></div>
      <div><i style="background:#fff2c7"></i><span>#fff2c7</span><em>Soft amber</em></div>
      <div><i style="background:#fbf8fd;border:1px solid #ece3f1"></i><span>#fbf8fd</span><em>Background</em></div>
    </div>
    <h3>Website palette</h3>
    <div class="sw small">
      <div><i style="background:#6C2BD9"></i><span>#6C2BD9</span><em>Purple</em></div>
      <div><i style="background:#F5A623"></i><span>#F5A623</span><em>Gold</em></div>
      <div><i style="background:#0EA894"></i><span>#0EA894</span><em>Teal</em></div>
      <div><i style="background:#FFFDF8;border:1px solid #ece3f1"></i><span>#FFFDF8</span><em>Cream</em></div>
      <div><i style="background:#1C1B1F"></i><span>#1C1B1F</span><em>Ink</em></div>
    </div>
    <h3>Typefaces</h3>
    <div class="type"><span style="font-weight:900;font-size:26px">App: Nunito. Hi, Ada! What shall we read today?</span><span style="font-weight:700;font-size:14px;color:#6b6472">Website: Baloo 2 for headings, Fraunces for display, Inter for text, Caveat for handwritten labels.</span></div>
  </div>
  <div class="col">
    <h3>Components (app)</h3>
    <div class="comp"><span class="btn p">Start reading</span><span class="btn s">Add a reader</span><span class="btn g">Cancel</span><span class="btn d">Delete</span></div>
    <div class="comp"><span class="chip on">All</span><span class="chip">Adventure</span><span class="chip">Family &amp; Friendship</span><span class="chip">Nature</span></div>
    <div class="comp"><span class="pill live">Live</span><span class="pill sched">Scheduled</span><span class="pill draft">Draft</span><span class="pill free">FREE</span><span class="pill prem">Premium</span></div>
    <div class="comp"><span class="seg"><b>Sunrise</b><b class="on">Spark</b><b>Seeker</b></span></div>
    <h3>Design principles</h3>
    <ul>
      <li><b>Thumbnail first.</b> Covers and pictures carry every screen; text supports them.</li>
      <li><b>Safe for children.</b> No ads, no prices, no purchase buttons. Grown-up areas sit behind a parental gate.</li>
      <li><b>Reading levels, never ages.</b> Sunrise, Spark and Seeker are named for how a child reads.</li>
      <li><b>Type grows with the reader.</b> Earlier reading levels get larger text; every child can change it.</li>
      <li><b>Easy to tap.</b> Controls are at least 44 pt; the whole app works one-handed.</li>
      <li><b>Calm rewards.</b> Badges and a word garden celebrate reading, with no timers and no streaks to lose.</li>
    </ul>
  </div>
</div>'''

# ---- content pages (built first so the contents page knows the page numbers)
for title, sub, items in MOBILE: phone_pages('MOBILE APP', title, sub, items)
for s in WEB:
    if len(s) == 4: phone_pages('WEBSITE', s[0], s[1], s[3])
    else: desktop_pages('WEBSITE', s[0], s[1], s[2], 'cols')
for s in ADMIN:
    if len(s) == 4: phone_pages('ADMIN DASHBOARD', s[0], s[1], s[3])
    else: desktop_pages('ADMIN DASHBOARD', s[0], s[1], s[2], 'wide')

# ---- contents pages
toc_entries = []  # (label, key)
for kicker, lst in (('App', MOBILE), ('Website', WEB), ('Admin', ADMIN)):
    for s in lst:
        key = {'App': 'MOBILE APP', 'Website': 'WEBSITE', 'Admin': 'ADMIN DASHBOARD'}[kicker] + '|' + s[0]
        toc_entries.append((f'{kicker}: {s[0]}', key))
PER_TOC = 34
toc_chunks = [toc_entries[i:i + PER_TOC] for i in range(0, len(toc_entries), PER_TOC)]
map_html = '''<div class="map"><b>How the app fits together</b>
<div class="flow"><span>Welcome<br><em>who's reading</em></span><u>›</u><span>Home<br><em>week · month · shelves</em></span><u>›</u><span>Story<br><em>chapters · words</em></span><u>›</u><span>Reader<br><em>pages · The End</em></span></div>
<div class="flow two"><span>My books<br><em>reading · favourites · badges · words</em></span><span>Grown-ups<br><em>gate → account · readers</em></span></div></div>'''
map_inline = len(toc_chunks[-1]) <= 18
n_toc = len(toc_chunks) + (0 if map_inline else 1)
front = 2 + n_toc   # cover, foundations, contents pages
rows = lambda ch: ''.join(f'<li><span>{e(l)}</span><i></i><b>{section_first[k] + front + 1}</b></li>' for l, k in ch)
toc_pages = []
for i, ch in enumerate(toc_chunks):
    last = i == len(toc_chunks) - 1
    toc_pages.append(f'<div class="head"><div class="kick">CONTENTS</div><h2>What is in this document{" (continued)" if i else ""}</h2><p>The mobile app, then the website, then the admin dashboard.</p></div><ol class="toc">{rows(ch)}</ol>' + (map_html if last and map_inline else ''))
if not map_inline:
    toc_pages.append(f'<div class="head"><div class="kick">OVERVIEW</div><h2>How the app fits together</h2><p>The path a child takes through the app, and where grown-ups come in.</p></div>{map_html}')

all_pages = [('cover', cover), ('Foundations', found)] + [('Contents', t) for t in toc_pages] + [(p['section'].split('|')[1], p['html']) for p in pages]
body = ''
for i, (t, h) in enumerate(all_pages):
    if t == 'cover': body += f'<section class="page cover-page">{h}</section>'
    else: body += f'<section class="page">{h}<div class="foot"><span>Genova · UI Screens</span><span>{e(t)}</span><span>{i + 1}</span></div></section>'

# ======================================================================= css
css = f'''
@font-face{{font-family:Nunito;font-weight:600;src:url(file://{FONT}/600SemiBold/Nunito_600SemiBold.ttf)}}
@font-face{{font-family:Nunito;font-weight:700;src:url(file://{FONT}/800ExtraBold/Nunito_800ExtraBold.ttf)}}
@font-face{{font-family:Nunito;font-weight:800;src:url(file://{FONT}/800ExtraBold/Nunito_800ExtraBold.ttf)}}
@font-face{{font-family:Nunito;font-weight:900;src:url(file://{FONT}/900Black/Nunito_900Black.ttf)}}
@page{{size:297mm 210mm;margin:0}}
*{{box-sizing:border-box;margin:0}}
body{{font-family:Nunito,sans-serif;color:#232323;-webkit-print-color-adjust:exact;print-color-adjust:exact}}
.page{{width:297mm;height:210mm;position:relative;overflow:hidden;page-break-after:always;background:#fbf8fd;padding:12mm 14mm 0}}
.page:not(.cover-page)::before{{content:'';position:absolute;left:0;top:0;right:0;height:3mm;background:linear-gradient(90deg,#ab46d2,#10a19c 60%,#ffbe00)}}
.head{{margin-bottom:4mm;height:26mm}}
.kick{{font-size:8.5pt;font-weight:900;letter-spacing:.14em;color:#ab46d2}}
h2{{font-size:23pt;font-weight:900;letter-spacing:-.02em;line-height:1.1;margin-top:1mm}} h2 small{{font-size:11pt;font-weight:800;color:#6b6472;letter-spacing:0}}
h3{{font-size:12pt;font-weight:900;margin:4.5mm 0 2.5mm}}
.head p{{font-size:10pt;color:#6b6472;margin-top:1.5mm;max-width:250mm;font-weight:600;line-height:1.4}}
.foot{{position:absolute;left:14mm;right:14mm;bottom:5mm;height:6mm;display:flex;justify-content:space-between;font-size:7.5pt;color:#6b6472;font-weight:700;border-top:.3mm solid #ece3f1;padding-top:1.6mm}}
.foot span:nth-child(2){{color:#ab46d2}}
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
/* phones: up to four per page */
.phones{{display:flex;gap:9mm;justify-content:center;align-items:flex-start}}
.phones figure{{width:57mm;flex:none}}
figure{{margin:0}}
.phone{{background:#232323;border-radius:6mm;padding:1.1mm;box-shadow:0 2mm 5mm rgba(59,26,74,.25)}}
.phone img{{display:block;width:100%;border-radius:5mm}}
figcaption{{margin-top:2.4mm;font-size:8pt;line-height:1.35;color:#6b6472;font-weight:600}}
figcaption b{{display:block;color:#232323;font-size:10pt;font-weight:900;margin-bottom:.5mm}}
/* website and admin screenshots */
.dgrid{{display:flex;gap:8mm;justify-content:center;align-items:flex-start}}
.df img{{display:block;width:100%;border-radius:2.5mm;box-shadow:0 1.5mm 4mm rgba(59,26,74,.22);border:.25mm solid #ece3f1}}
.df figcaption{{text-align:center;margin-top:2mm;font-weight:700}}
/* foundations */
.found{{display:grid;grid-template-columns:1.1fr 1fr;gap:10mm}} .found h3:first-child{{margin-top:0}}
.sw{{display:grid;grid-template-columns:repeat(4,1fr);gap:3mm}} .sw.small{{grid-template-columns:repeat(5,1fr);margin-top:2mm}}
.sw div{{display:flex;flex-direction:column;gap:.6mm;font-size:7.5pt;color:#6b6472;font-weight:600;line-height:1.3}}
.sw i{{display:block;height:13mm;border-radius:3mm;margin-bottom:1mm}} .sw.small i{{height:7mm}} .sw b{{color:#232323;font-size:10pt;font-weight:900}} .sw span{{font-weight:800;color:#232323}} .sw em{{font-style:normal}}
.type{{display:flex;flex-direction:column;gap:2mm;background:#fff;border:.3mm solid #ece3f1;border-radius:4mm;padding:3.5mm 5mm}}
.comp{{display:flex;gap:2.5mm;align-items:center;flex-wrap:wrap;margin-bottom:3mm}}
.btn{{padding:2.4mm 5mm;border-radius:99mm;font-weight:900;font-size:9.5pt}} .btn.p{{background:#ab46d2;color:#fff}} .btn.s{{background:#dcf3f2;color:#0b6f6b}} .btn.g{{color:#7a2e99}} .btn.d{{background:#fdeceb;color:#c0392b}}
.chip{{padding:1.8mm 4mm;border-radius:99mm;border:.4mm solid #ece3f1;background:#fff;font-weight:800;font-size:9pt}} .chip.on{{background:#ab46d2;color:#fff;border-color:#ab46d2}}
.pill{{padding:.9mm 3mm;border-radius:99mm;font-weight:900;font-size:7.5pt}} .pill.live{{background:#dcf3f2;color:#0b6f6b}} .pill.sched{{background:#fff2c7;color:#7a5a00}} .pill.draft{{background:#ece3f1;color:#6b6472}} .pill.free{{background:#ffbe00}} .pill.prem{{background:#f4e6fa;color:#7a2e99}}
.seg{{display:inline-flex;background:#ece3f1;border-radius:99mm;padding:.8mm}} .seg b{{padding:1.8mm 4mm;border-radius:99mm;font-size:8.5pt;font-weight:800;color:#6b6472}} .seg b.on{{background:#fff;color:#7a2e99}}
.found ul{{padding-left:4.5mm;font-size:9.5pt;line-height:1.4;font-weight:600;color:#232323}} .found li{{margin-bottom:1.8mm}}
/* contents */
.toc{{list-style:none;padding:0;columns:2;column-gap:14mm;font-size:9.5pt;font-weight:700}} .toc li{{display:flex;gap:2mm;align-items:baseline;padding:.9mm 0;break-inside:avoid}} .toc i{{flex:1;border-bottom:.3mm dotted #b9b0c0;transform:translateY(-1mm)}} .toc b{{color:#ab46d2}}
.map{{margin-top:5mm;background:#fff;border:.3mm solid #ece3f1;border-radius:4mm;padding:4mm 8mm}} .map>b{{font-size:12pt;font-weight:900}}
.flow{{display:flex;align-items:center;gap:4mm;margin-top:4mm}} .flow span{{background:#f4e6fa;color:#7a2e99;border-radius:3mm;padding:3mm 6mm;font-weight:900;font-size:11pt;line-height:1.25;text-align:center}} .flow em{{font-style:normal;font-weight:600;font-size:8pt;color:#6b6472}} .flow u{{text-decoration:none;font-size:20pt;color:#ab46d2;font-weight:900}} .flow.two span{{background:#dcf3f2;color:#0b6f6b}}
'''
open(OUT_HTML, 'w').write(f'<!doctype html><html><head><meta charset="utf-8"><title>Genova UI Screens</title><style>{css}</style></head><body>{body}</body></html>')
print('pages:', len(all_pages))
