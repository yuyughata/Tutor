/* Genova landing page behaviour: scroll reveal, the full title catalog dialog and the request forms (saved in Supabase).
   Plain JavaScript with no dependencies. The website calls window.genovaLanding.init() whenever the landing page is shown;
   the single-file version of the page calls it once. init() returns a function that undoes everything. */
(function () {
  var G = (window.genovaLanding = window.genovaLanding || {});
  var ORDER = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
  var COLORS = { A: 'var(--purple)', B: 'var(--teal)', C: 'var(--gold-deep)', D: 'var(--purple-deep)', E: 'var(--teal-deep)', F: 'var(--gold)', G: 'var(--purple)' };
  var ICONS = { A: '🌍', B: '💛', C: '🧮', D: '⚙️', E: '🏡', F: '📱', G: '🕊️' };
  var SUCCESS = {
    preorderForm: "Thank you! Your preorder request has been noted. We'll be in touch within 24 hours.",
    grpForm: 'Thank you! We will contact you to confirm your GRP session.'
  };
  var esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); };

  var catalogPromise = null;
  function loadCatalog() {
    if (catalogPromise) return catalogPromise;
    var inline = document.getElementById('catalogData');
    if (inline) { catalogPromise = Promise.resolve(JSON.parse(inline.textContent)); return catalogPromise; }
    catalogPromise = fetch((window.GENOVA_BASE || '') + '/catalog.json').then(function (r) { if (!r.ok) throw new Error('catalog'); return r.json(); });
    catalogPromise.catch(function () { catalogPromise = null; });
    return catalogPromise;
  }

  G.init = function () {
    var undo = [];
    var on = function (el, type, fn, opts) { el.addEventListener(type, fn, opts); undo.push(function () { el.removeEventListener(type, fn, opts); }); };

    /* ----- scroll reveal ----- */
    var items = document.querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window)) {
      items.forEach(function (el) { el.classList.add('in'); });
    } else {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
      }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
      items.forEach(function (el) { io.observe(el); });
      undo.push(function () { io.disconnect(); });
    }
    // anything already near the top should never wait
    setTimeout(function () { items.forEach(function (el) { var r = el.getBoundingClientRect(); if (r.top < window.innerHeight && r.bottom > 0) el.classList.add('in'); }); }, 60);

    /* ----- catalog dialog ----- */
    var modal = document.getElementById('catalogModal');
    if (modal) {
      var body = document.getElementById('catalogBody');
      var panel = modal.querySelector('.modal-panel');
      var level = 'sunrise';
      var opener = null;
      var render = function (data, pillar) {
        var pillars = data[level];
        var html = '';
        ORDER.forEach(function (letter) {
          var p = pillars[letter];
          if (!p) return;
          html += '<div class="modal-pillar" data-pillar="' + letter + '">';
          html += '<div class="modal-pillar-head"><span class="modal-pillar-badge" style="background:' + COLORS[letter] + ';">' + letter + '</span><span aria-hidden="true">' + ICONS[letter] + '</span> ' + esc(p.name) + '</div>';
          if (p.groups) {
            Object.keys(p.groups).forEach(function (sub) {
              html += '<p class="modal-subhead">' + esc(sub) + '</p><ul class="modal-list">';
              p.groups[sub].forEach(function (title) { html += '<li>' + esc(title) + '</li>'; });
              html += '</ul>';
            });
          } else {
            html += '<ul class="modal-list">';
            p.items.forEach(function (title) { html += '<li>' + esc(title) + '</li>'; });
            html += '</ul>';
          }
          html += '</div>';
        });
        body.innerHTML = html;
        var target = pillar && body.querySelector('[data-pillar="' + pillar + '"]');
        body.scrollTop = target ? target.offsetTop - 8 : 0;
      };
      var show = function (pillar) {
        body.innerHTML = '<p class="muted" style="padding:20px 0">Loading the catalog…</p>';
        loadCatalog().then(function (data) { render(data, pillar); }).catch(function () {
          body.innerHTML = '<p style="padding:20px 0">The catalog could not load. Please check your connection and try again.</p>';
        });
      };
      var setTab = function (l) {
        level = l;
        modal.querySelectorAll('.modal-tab').forEach(function (t) { var a = t.getAttribute('data-level') === l; t.classList.toggle('active', a); t.setAttribute('aria-pressed', a ? 'true' : 'false'); });
      };
      var open = function (pillar, from) {
        opener = from || null;
        modal.classList.add('open');
        document.body.style.overflow = 'hidden';
        show(pillar);
        panel.focus();
      };
      var close = function () {
        if (!modal.classList.contains('open')) return;
        modal.classList.remove('open');
        document.body.style.overflow = '';
        if (opener && opener.focus) opener.focus();
      };
      on(document, 'click', function (e) {
        var o = e.target.closest && e.target.closest('[data-catalog-open]');
        if (o) { e.preventDefault(); open(o.getAttribute('data-catalog-open'), o); return; }
        if (e.target.closest && e.target.closest('[data-catalog-close]')) { close(); return; }
        if (e.target === modal) { close(); return; }
        var tab = e.target.closest && e.target.closest('.modal-tab');
        if (tab && modal.contains(tab)) { setTab(tab.getAttribute('data-level')); show(); }
      });
      on(document, 'keydown', function (e) {
        if (e.key === 'Escape') close();
        if (e.key === 'Tab' && modal.classList.contains('open')) { // keep focus inside the dialog
          var f = modal.querySelectorAll('button');
          if (!f.length) return;
          var first = f[0], last = f[f.length - 1];
          if (e.shiftKey && (document.activeElement === first || document.activeElement === panel)) { e.preventDefault(); last.focus(); }
          else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
      });
      undo.push(function () { modal.classList.remove('open'); document.body.style.overflow = ''; });
    }

    /* ----- request forms: saved in the Genova database (Supabase), no page reload -----
       The two forms call the submit_grp_request / submit_title_request functions with the public anon key
       (window.GENOVA_FORMS = { url, key }, set by the website or inlined in the single-file page). */
    var val = function (form, name) { var el = form.elements[name]; return el ? String(el.value || '').trim() : ''; };
    var REQUESTS = {
      grp: function (f) { return { fn: 'submit_grp_request', body: { p_full_name: val(f, 'full_name'), p_phone: val(f, 'phone'), p_email: val(f, 'email'), p_reading_level: val(f, 'reading_level'), p_mode: val(f, 'mode'), p_comments: val(f, 'comments') || null } }; },
      title: function (f) { return { fn: 'submit_title_request', body: { p_full_name: val(f, 'full_name'), p_phone: val(f, 'phone'), p_email: val(f, 'email'), p_reader_level: val(f, 'reader_level'), p_storybook_title: val(f, 'storybook_title') || null, p_comments: val(f, 'comments') || null } }; }
    };
    document.querySelectorAll('.js-request-form').forEach(function (form) {
      on(form, 'submit', function (e) {
        e.preventDefault();
        var statusEl = form.querySelector('.form-status');
        var btn = form.querySelector('button[type="submit"]');
        var label = btn ? btn.textContent : '';
        var say = function (msg, color) { if (statusEl) { statusEl.textContent = msg; statusEl.style.color = color; statusEl.style.display = 'block'; } };
        var cfg = window.GENOVA_FORMS || {};
        var make = REQUESTS[form.getAttribute('data-request')];
        if (!make || !cfg.url || !cfg.key) { say('Sorry, the form is not available right now. Please message us on WhatsApp instead.', '#B3261E'); return; }
        var req = make(form);
        req.body.p_source = (location.hostname || 'page') + location.pathname;
        req.body.p_website = val(form, 'website'); // hidden trap field: stays empty for people
        if (btn) { btn.disabled = true; btn.textContent = 'Sending...'; }
        if (statusEl) statusEl.style.display = 'none';
        fetch(cfg.url.replace(/\/$/, '') + '/rest/v1/rpc/' + req.fn, {
          method: 'POST',
          headers: { apikey: cfg.key, Authorization: 'Bearer ' + cfg.key, 'Content-Type': 'application/json' },
          body: JSON.stringify(req.body)
        })
          .then(function (r) {
            if (r.ok) { say(SUCCESS[form.id] || 'Thank you! Your request has been sent.', 'var(--teal-text)'); form.reset(); return; }
            return r.json().catch(function () { return {}; }).then(function (d) {
              // The database's own messages are written for people ("Please enter a valid phone number."); anything else is generic.
              say(r.status === 400 && d && d.message && /^[A-Z][^{}]{5,160}[.]$/.test(d.message) ? d.message : 'Something went wrong. Please try again, or message us on WhatsApp.', '#B3261E');
            });
          })
          .catch(function () { say('Something went wrong. Please check your connection and try again.', '#B3261E'); })
          .then(function () { if (btn) { btn.disabled = false; btn.textContent = label; } });
      });
    });

    return function () { undo.forEach(function (f) { f(); }); undo = []; };
  };
})();
