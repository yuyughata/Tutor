import { h, icon, field, toast, busy, slugify } from '../ui.js';

export async function render(ctx) {
  const { api } = ctx;
  const root = h('div', {});
  let cats = [];

  async function reload() { cats = await api.listCategories(); draw(); }

  function rowFor(c) {
    const name = h('input', { type: 'text', value: c.name, maxlength: 30, 'aria-label': `Name of ${c.name}` });
    const order = h('input', { type: 'number', value: c.sort_order, style: { width: '80px' }, 'aria-label': `Order of ${c.name}` });
    const save = h('button', { class: 'btn sm secondary' }, 'Save');
    save.onclick = busy(save, async () => {
      if (!name.value.trim()) throw new Error('Give the category a name.');
      await api.saveCategory({ ...c, name: name.value.trim(), sort_order: Number(order.value) || 0 });
      toast('Saved'); await reload();
    });
    const del = h('button', { class: 'icon-btn', title: 'Delete', 'aria-label': `Delete ${c.name}` }, icon('trash'));
    del.onclick = busy(del, async () => {
      if (!(await ctx.confirm({ title: `Delete "${c.name}"?`, body: 'Stories keep existing but lose this category.', confirmLabel: 'Delete', danger: true }))) return;
      await api.deleteCategory(c.id); toast('Deleted'); await reload();
    });
    return h('tr', {}, h('td', {}, name), h('td', { class: 'muted small' }, c.slug), h('td', {}, order), h('td', {}, h('div', { class: 'row', style: { flexWrap: 'nowrap' } }, save, del)));
  }

  function draw() {
    const name = h('input', { type: 'text', placeholder: 'e.g. Friendship', maxlength: 30 });
    const add = h('button', { class: 'btn' }, icon('plus'), 'Add');
    add.onclick = busy(add, async () => {
      const n = name.value.trim(); if (!n) throw new Error('Type a category name first.');
      await api.saveCategory({ name: n, slug: slugify(n), sort_order: cats.length + 1 });
      name.value = ''; toast('Category added'); await reload();
    });
    name.onkeydown = (e) => e.key === 'Enter' && add.click();
    root.replaceChildren(
      h('div', { class: 'page-head' }, h('div', {}, h('h1', {}, 'Categories'), h('p', {}, 'Shown as filter chips on the home screen, in this order.'))),
      h('div', { class: 'card' }, h('div', { class: 'row', style: { marginBottom: '16px', alignItems: 'flex-end' } }, h('div', { class: 'grow' }, field('New category', name)), h('div', { style: { marginBottom: '16px' } }, add)),
        cats.length ? h('div', { class: 'table-wrap' }, h('table', {}, h('thead', {}, h('tr', {}, ['Name', 'URL name', 'Order', ''].map((t) => h('th', {}, t)))), h('tbody', {}, cats.map(rowFor))))
          : h('p', { class: 'muted' }, 'No categories yet.')));
  }

  await reload();
  return root;
}
