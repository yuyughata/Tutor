import { h, icon, clear, field, slugify, toast, busy, statusPill, storyState, toLocalInput, fromLocalInput } from '../ui.js';
import { LEVELS, levelName } from '../levels.js';

const key = () => Math.random().toString(36).slice(2);
const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${key()}`);
const words = (t) => (t.trim() ? t.trim().split(/\s+/).length : 0);

export async function render(ctx, { id }) {
  const { api } = ctx;
  const isNew = id === 'new';
  const [cats, authors, existing] = await Promise.all([api.listCategories(), api.listAuthors(), isNew ? null : api.getStory(id)]);
  if (!isNew && !existing) return h('div', { class: 'card empty' }, h('div', { class: 'big' }, '🔎'), h('h2', {}, 'Story not found'), h('a', { class: 'btn', href: '#/stories' }, 'Back to stories'));

  // ---------- state ----------
  let story, categoryIds, pages, visibility, publishAt, slugTouched, minutesTouched, active = 0, dirty = false, savedAt = null;
  const load = (s) => {
    story = s
      ? { id: s.id, slug: s.slug, title: s.title, synopsis: s.synopsis, cover_url: s.cover_url || '', author_id: s.author_id || authors[0]?.id || null, reading_level: s.reading_level, is_free: s.is_free, reading_minutes: s.reading_minutes, status: s.status, published_at: s.published_at }
      : { id: uuid(), slug: '', title: '', synopsis: '', cover_url: '', author_id: authors[0]?.id || null, reading_level: 'spark', is_free: false, reading_minutes: 3, status: 'draft', published_at: null };
    categoryIds = new Set(s ? s.categoryIds : []);
    pages = (s ? s.pages : []).map((p) => ({ key: key(), id: p.id, image_url: p.image_url, text: p.text, preview: null }));
    visibility = s ? storyState(s) : 'draft';
    publishAt = s?.published_at && visibility === 'scheduled' ? s.published_at : null;
    slugTouched = !!s; minutesTouched = !!s; dirty = false; active = Math.min(active, Math.max(0, pages.length - 1));
  };
  load(existing);
  ctx.guard = () => dirty;
  const touch = () => { dirty = true; paintStatus(); paintAside(); };

  // ---------- readiness ----------
  const checks = () => [
    ['Title', story.title.trim().length > 0],
    ['URL name', /^[a-z0-9]+(-[a-z0-9]+)*$/.test(story.slug)],
    ['Synopsis', story.synopsis.trim().length > 0],
    ['Cover image', !!story.cover_url],
    ['At least one page', pages.length > 0],
    ['Every page has an image and text', pages.length > 0 && pages.every((p) => p.image_url && p.text.trim())],
  ];

  // ---------- header / save ----------
  const statusEl = h('span', { class: 'muted small' });
  const paintStatus = () => { statusEl.textContent = dirty ? 'Unsaved changes' : savedAt ? `Saved ${savedAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : ''; statusEl.style.color = dirty ? 'var(--amber-deep)' : ''; };
  const saveBtn = h('button', { class: 'btn' }, icon('check'), 'Save');
  const save = busy(saveBtn, async () => {
    const problems = [];
    if (!story.title.trim()) problems.push('add a title');
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(story.slug)) problems.push('set a URL name (letters, numbers, dashes)');
    if (visibility !== 'draft') {
      for (const [label, ok] of checks()) if (!ok && !['Title', 'URL name'].includes(label)) problems.push(label.toLowerCase());
      if (visibility === 'scheduled' && !publishAt) problems.push('pick a publish date');
    }
    if (problems.length) { toast(`Before saving: ${problems.join(', ')}.`, 'err'); return; }
    const row = { ...story, status: visibility === 'draft' ? 'draft' : visibility === 'live' ? 'published' : 'scheduled',
      published_at: visibility === 'draft' ? null : visibility === 'scheduled' ? publishAt : (existing && storyState(existing) === 'live' ? existing.published_at : null) };
    await api.saveStory(row, [...categoryIds], pages.map((p) => ({ id: p.id, image_url: p.image_url, text: p.text })));
    const wasNew = isNew;
    ctx.guard = null; dirty = false; savedAt = new Date();
    toast(visibility === 'draft' ? 'Draft saved' : visibility === 'live' ? 'Saved and live' : 'Saved and scheduled');
    if (wasNew) { ctx.go(`stories/${story.id}`); return; }
    load(await api.getStory(story.id)); ctx.guard = () => dirty; paintAll();
  });
  saveBtn.onclick = save;
  const keyHandler = (e) => {
    if (!root.isConnected) return window.removeEventListener('keydown', keyHandler);
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') { e.preventDefault(); save(); }
  };
  window.addEventListener('keydown', keyHandler);

  const delBtn = isNew ? null : h('button', { class: 'btn danger sm' }, icon('trash'), 'Delete');
  if (delBtn) delBtn.onclick = busy(delBtn, async () => {
    if (!(await ctx.confirm({ title: `Delete "${story.title}"?`, body: 'This removes the story, its pages and images for good.', confirmLabel: 'Delete story', danger: true }))) return;
    ctx.guard = null; await api.deleteStory(story.id); toast('Story deleted'); ctx.go('stories');
  });

  // ---------- details ----------
  const title = h('input', { type: 'text', maxlength: 80, placeholder: 'e.g. The Curious Little Fox' });
  const slug = h('input', { type: 'text', maxlength: 60, placeholder: 'the-curious-little-fox' });
  const synopsis = h('textarea', { maxlength: 400, rows: 3, placeholder: 'One or two sentences that make a child want to open it.' });
  const synCount = h('div', { class: 'count' });
  const minutes = h('input', { type: 'number', min: 1, max: 60 });
  const bandSeg = h('div', { class: 'seg', role: 'group', 'aria-label': 'Reading level' });
  const chipBox = h('div', { class: 'chips' });
  const authorSel = h('select', {}, authors.map((a) => h('option', { value: a.id }, a.name)));
  const free = h('input', { type: 'checkbox' });

  title.oninput = () => { story.title = title.value; if (!slugTouched) { story.slug = slugify(story.title); slug.value = story.slug; } touch(); };
  slug.oninput = () => { slugTouched = true; story.slug = slug.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'); if (slug.value !== story.slug) slug.value = story.slug; touch(); };
  synopsis.oninput = () => { story.synopsis = synopsis.value; synCount.textContent = `${synopsis.value.length}/400`; touch(); };
  minutes.oninput = () => { minutesTouched = true; story.reading_minutes = Math.max(1, Number(minutes.value) || 1); touch(); };
  authorSel.onchange = () => { story.author_id = authorSel.value; touch(); };
  free.onchange = () => { story.is_free = free.checked; touch(); paintAside(); };
  const paintBand = () => bandSeg.replaceChildren(...LEVELS.map((l) => h('button', { type: 'button', title: l.descriptor, 'aria-pressed': String(story.reading_level === l.id), onclick: () => { story.reading_level = l.id; paintBand(); touch(); } }, `${l.name} · ${l.descriptor}`)));
  const paintChips = () => chipBox.replaceChildren(...cats.map((c) => h('button', { type: 'button', class: 'chip', 'aria-pressed': String(categoryIds.has(c.id)), onclick: () => { categoryIds.has(c.id) ? categoryIds.delete(c.id) : categoryIds.add(c.id); paintChips(); touch(); } }, c.name)));
  const autoMinutes = () => { if (!minutesTouched) { story.reading_minutes = Math.max(1, Math.ceil(pages.reduce((n, p) => n + words(p.text), 0) / 90)); minutes.value = story.reading_minutes; } };

  // ---------- cover ----------
  const coverBox = h('div', { class: 'cover-box', tabindex: 0, role: 'button', 'aria-label': 'Choose cover image' });
  const coverInput = h('input', { type: 'file', accept: 'image/jpeg,image/png,image/webp,image/gif', class: 'sr', tabindex: -1 });
  const paintCover = () => { coverBox.replaceChildren(story.cover_url ? h('img', { src: story.cover_url, alt: 'Cover preview' }) : h('span', {}, 'Add cover')); };
  const setCover = async (file) => {
    if (!file) return;
    coverBox.classList.add('busy');
    try { story.cover_url = await api.uploadCover(story.id, file); paintCover(); touch(); } catch (e) { toast(e.message, 'err'); } finally { coverBox.classList.remove('busy'); }
  };
  coverBox.onclick = () => coverInput.click();
  coverBox.onkeydown = (e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), coverInput.click());
  coverInput.onchange = () => { setCover(coverInput.files[0]); coverInput.value = ''; };
  dropZone(coverBox, (files) => setCover(files[0]));

  // ---------- pages ----------
  const pageList = h('div', {});
  const pageInput = h('input', { type: 'file', accept: 'image/jpeg,image/png,image/webp,image/gif', multiple: true, class: 'sr', tabindex: -1 });
  let pickFor = null;
  let dragFrom = null;

  async function uploadInto(page, file) {
    page.busy = true; paintPages();
    try {
      page.image_url = await api.uploadPageImage(story.id, file);
      page.preview = URL.createObjectURL(file);
      touch(); paintPhone();
    } catch (e) { toast(e.message, 'err'); } finally { page.busy = false; paintPages(); }
  }
  async function addFromFiles(files) {
    const list = [...files].filter((f) => f.type.startsWith('image/'));
    if (!list.length) return toast('Please choose JPG, PNG, WebP or GIF images.', 'err');
    const fresh = list.map(() => ({ key: key(), id: null, image_url: '', text: '', preview: null }));
    pages.push(...fresh); paintPages();
    await Promise.all(fresh.map((p, i) => uploadInto(p, list[i])));
  }
  pageInput.onchange = () => {
    const files = [...pageInput.files]; pageInput.value = '';
    if (pickFor) { const p = pickFor; pickFor = null; if (files[0]) uploadInto(p, files[0]); } else addFromFiles(files);
  };
  const setActive = (i) => {
    if (active === i) return;
    active = i;
    [...pageList.children].forEach((c, k) => c.classList.toggle('active', k === i));
    paintPhone();
  };
  const move = (from, to) => {
    if (to < 0 || to >= pages.length || from === to) return;
    const [p] = pages.splice(from, 1); pages.splice(to, 0, p); active = to; touch(); paintPages(); paintPhone();
  };

  function pageCard(p, i) {
    const imgBox = h('div', { class: 'page-img', tabindex: 0, role: 'button', 'aria-label': `Choose image for page ${i + 1}` });
    const showImg = async () => {
      imgBox.classList.toggle('busy', !!p.busy);
      if (!p.image_url) return imgBox.replaceChildren(h('span', {}, 'Add image'));
      const img = h('img', { alt: `Page ${i + 1}` }); img.src = p.preview || await api.pageImageUrl(p.image_url);
      imgBox.replaceChildren(img);
    };
    showImg();
    imgBox.onclick = () => { pickFor = p; pageInput.multiple = false; pageInput.click(); pageInput.multiple = true; };
    imgBox.onkeydown = (e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), imgBox.click());
    dropZone(imgBox, (files) => files[0] && uploadInto(p, files[0]));

    const text = h('textarea', { rows: 4, maxlength: 600, placeholder: 'Page text', 'aria-label': `Text for page ${i + 1}` });
    text.value = p.text;
    const count = h('div', { class: 'count' }, `${words(p.text)} words`);
    text.oninput = () => { p.text = text.value; count.textContent = `${words(p.text)} words`; autoMinutes(); touch(); paintPhone(); };
    text.onfocus = () => setActive(i);

    const grip = h('div', { class: 'num', title: 'Drag to reorder', draggable: true }, String(i + 1));
    const card = h('div', { class: `page-card ${active === i ? 'active' : ''}`, onclick: () => setActive(i) });
    grip.addEventListener('dragstart', (e) => { dragFrom = i; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(i)); e.dataTransfer.setDragImage(card, 20, 20); });
    card.addEventListener('dragover', (e) => { if (dragFrom !== null) { e.preventDefault(); card.classList.add('over'); } });
    card.addEventListener('dragleave', () => card.classList.remove('over'));
    card.addEventListener('drop', (e) => { if (dragFrom === null) return; e.preventDefault(); card.classList.remove('over'); const from = dragFrom; dragFrom = null; move(from, i); });
    grip.addEventListener('dragend', () => { dragFrom = null; });

    const up = h('button', { class: 'icon-btn', title: 'Move up', 'aria-label': `Move page ${i + 1} up`, disabled: i === 0, onclick: (e) => { e.stopPropagation(); move(i, i - 1); } }, icon('up'));
    const down = h('button', { class: 'icon-btn', title: 'Move down', 'aria-label': `Move page ${i + 1} down`, disabled: i === pages.length - 1, onclick: (e) => { e.stopPropagation(); move(i, i + 1); } }, icon('down'));
    const del = h('button', { class: 'icon-btn', title: 'Delete page', 'aria-label': `Delete page ${i + 1}`, onclick: (e) => { e.stopPropagation(); pages.splice(i, 1); active = Math.min(active, pages.length - 1); autoMinutes(); touch(); paintPages(); paintPhone(); } }, icon('trash'));
    card.append(grip, imgBox, h('div', {}, text, count), h('div', { class: 'page-actions' }, up, down, del));
    return card;
  }
  function paintPages() {
    pageList.replaceChildren(...(pages.length ? pages.map(pageCard) : [h('div', { class: 'empty', style: { padding: '28px 8px' } }, h('div', { class: 'big' }, '🖼️'), h('p', {}, 'No pages yet. Add pages one at a time, or select many images at once and they become pages in order.'))]));
  }
  const addPage = () => { pages.push({ key: key(), id: null, image_url: '', text: '', preview: null }); active = pages.length - 1; touch(); paintPages(); paintPhone(); pageList.lastElementChild?.querySelector('textarea')?.focus(); };

  // ---------- aside: publishing, checklist, previews ----------
  const aside = h('div', { class: 'sticky' });
  const phoneBox = h('div', {});
  const visSeg = h('div', { class: 'seg', role: 'group', 'aria-label': 'Visibility' });
  const when = h('input', { type: 'datetime-local' });
  when.onchange = () => { publishAt = fromLocalInput(when.value); touch(); };

  function paintAside() {
    const cl = checks();
    visSeg.replaceChildren(...[['draft', 'Draft'], ['live', 'Live'], ['scheduled', 'Schedule']].map(([v, l]) =>
      h('button', { type: 'button', 'aria-pressed': String(visibility === v), onclick: () => { visibility = v; if (v === 'scheduled' && !publishAt) { publishAt = new Date(Date.now() + 86_400_000).toISOString(); when.value = toLocalInput(publishAt); } touch(); } }, l)));
    const ready = cl.every(([, ok]) => ok);
    aside.replaceChildren(
      h('div', { class: 'card' }, h('h2', {}, 'Publishing'), visSeg,
        h('div', { class: 'field', hidden: visibility !== 'scheduled', style: { marginTop: '14px' } }, h('label', { class: 'f' }, 'Goes live on'), when),
        h('p', { class: 'small muted', style: { marginBottom: 0 } }, visibility === 'draft' ? 'Only admins can see drafts.' : visibility === 'live' ? 'Visible in the app as soon as you save.' : 'Appears in the app automatically at that time.')),
      h('div', { class: 'card' }, h('h2', {}, 'Checklist'),
        h('ul', { class: 'checklist' }, cl.map(([label, ok]) => h('li', { class: ok ? 'ok' : '' }, h('span', { class: 'dot' }, ok ? '✓' : ''), label))),
        visibility !== 'draft' && !ready ? h('p', { class: 'small', style: { color: 'var(--danger)', marginBottom: 0 } }, 'Finish these before saving as live.') : null),
      h('div', { class: 'card' }, h('h2', {}, 'In the app'), h('div', { class: 'row', style: { alignItems: 'flex-start', flexWrap: 'nowrap' } },
        h('div', { class: 'shelf-card' }, h('div', { class: 'c' }, story.cover_url ? h('img', { src: story.cover_url, alt: '' }) : '📖'), h('b', {}, story.title || 'Untitled'),
          h('span', { class: 'small muted' }, `${levelName(story.reading_level)} · ${story.reading_minutes} min`)),
        h('div', {}, story.is_free ? h('span', { class: 'pill free' }, 'FREE') : h('span', { class: 'pill purple' }, '🔒 Premium')))),
    );
    aside.append(h('div', { class: 'card' }, h('h2', {}, 'Reader preview'), phoneBox));
    paintPhone();
  }
  async function paintPhone() {
    const p = pages[active];
    const art = h('div', { class: 'art' }, '📖');
    if (p?.image_url) { const img = h('img', { alt: '' }); img.src = p.preview || await api.pageImageUrl(p.image_url); art.replaceChildren(img); }
    phoneBox.replaceChildren(
      h('div', { class: 'phone' }, h('div', { class: 'screen' }, art, h('div', { class: 'txt' }, p ? p.text || 'Page text appears here.' : 'Add a page to preview it.'), h('div', { class: 'bar' }, h('i', {}), h('i', { class: 'p' })))),
      pages.length > 1 ? h('div', { class: 'pager' }, pages.map((_, i) => h('button', { 'aria-current': String(i === active), 'aria-label': `Preview page ${i + 1}`, onclick: () => setActive(i) }, String(i + 1)))) : null);
  }

  // ---------- assemble ----------
  const root = h('div', {});
  const headState = h('span', {});
  function paintAll() {
    title.value = story.title; slug.value = story.slug; synopsis.value = story.synopsis; synCount.textContent = `${story.synopsis.length}/400`;
    minutes.value = story.reading_minutes; authorSel.value = story.author_id || ''; free.checked = story.is_free;
    when.value = toLocalInput(publishAt);
    paintBand(); paintChips(); paintCover(); paintPages(); paintStatus(); paintAside();
    headState.replaceChildren(statusPill(visibility));
  }

  root.append(
    h('div', { class: 'savebar' },
      h('a', { class: 'btn ghost sm', href: '#/stories' }, '← Stories'), h('h1', { style: { fontSize: '20px' } }, isNew ? 'New story' : 'Edit story'),
      headState, h('span', { class: 'grow' }), statusEl, delBtn, saveBtn),
    h('div', { class: 'editor' },
      h('div', {},
        h('div', { class: 'card', style: { marginBottom: '16px' } }, h('h2', {}, 'Details'),
          field('Title', title), field('URL name', slug, 'Used in links. Filled in from the title; change it only if you need to.'),
          field('Synopsis', h('div', {}, synopsis, synCount)),
          field('Reading level', bandSeg), field('Categories', chipBox),
          h('div', { class: 'row', style: { alignItems: 'flex-start' } },
            h('div', { class: 'grow', style: { minWidth: '160px' } }, field('Author', authorSel)),
            h('div', { style: { width: '150px' } }, field('Reading time (min)', minutes))),
          h('label', { class: 'switch' }, free, h('span', {}, 'Free to read (otherwise Premium)'))),
        h('div', { class: 'card', style: { marginBottom: '16px' } }, h('h2', {}, 'Cover'),
          h('div', { class: 'cover-drop' }, coverBox, coverInput, h('div', {}, h('p', { style: { marginTop: 0 } }, 'Shown on the home screen and in shelves.'),
            h('p', { class: 'small muted' }, 'Portrait 3:4 works best (e.g. 900 × 1200). JPG, PNG, WebP or GIF, up to 8 MB. Drop a file on the box or click it.')))),
        h('div', { class: 'card' }, h('div', { class: 'row', style: { marginBottom: '14px' } }, h('h2', { class: 'grow' }, 'Pages'),
          h('button', { class: 'btn secondary sm', onclick: () => { pickFor = null; pageInput.click(); } }, icon('image'), 'Add images'),
          h('button', { class: 'btn sm', onclick: addPage }, icon('plus'), 'Add page')),
          pageInput, pageList,
          h('p', { class: 'small muted', style: { marginBottom: 0 } }, 'Each page is one picture with text underneath. Drag the number to reorder. Pick several images at once to create many pages.'))),
      aside));
  paintAll();
  return root;
}

/** Make an element accept dropped files, with a highlight while dragging over it. */
function dropZone(el, onFiles) {
  el.addEventListener('dragover', (e) => { if ([...(e.dataTransfer?.types || [])].includes('Files')) { e.preventDefault(); el.classList.add('dropping'); } });
  el.addEventListener('dragleave', () => el.classList.remove('dropping'));
  el.addEventListener('drop', (e) => { if (!e.dataTransfer?.files?.length) return; e.preventDefault(); e.stopPropagation(); el.classList.remove('dropping'); onFiles([...e.dataTransfer.files]); });
}
