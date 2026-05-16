'use strict';

const STORAGE_KEY = 'album-state';
const COLLAPSED_KEY = 'album-collapsed';

let state = {};
let collapsedGroups = new Set();
let searchDebounceTimer = null;

// ---- State management ----

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) state = JSON.parse(saved);
  } catch (_) { state = {}; }

  try {
    const savedCollapsed = localStorage.getItem(COLLAPSED_KEY);
    if (savedCollapsed) collapsedGroups = new Set(JSON.parse(savedCollapsed));
  } catch (_) { collapsedGroups = new Set(); }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function getStickerState(base) {
  const override = state[base.id];
  if (!override) return { ...base };
  return {
    ...base,
    completado: override.completado !== undefined ? override.completado : base.completado,
    extra: override.extra !== undefined ? override.extra : base.extra,
  };
}

function setCompletado(id, value) {
  if (!state[id]) state[id] = {};
  state[id].completado = value;
  saveState();
}

function setExtra(id, value) {
  if (!state[id]) state[id] = {};
  state[id].extra = Math.max(0, value);
  saveState();
}

// ---- Filters ----

function getFilters() {
  return {
    search: document.getElementById('search').value.trim().toLowerCase(),
    status: document.getElementById('filter-status').value,
    pais: document.getElementById('filter-pais').value,
  };
}

function matchesFilters(s, filters) {
  const { search, status, pais } = filters;
  if (pais !== 'all' && s.pais !== pais) return false;
  if (status === 'tengo' && !s.completado) return false;
  if (status === 'falta' && s.completado) return false;
  if (search) {
    const inId = s.id.toLowerCase().includes(search);
    const inName = s.nombre && s.nombre.toLowerCase().includes(search);
    if (!inId && !inName) return false;
  }
  return true;
}

// ---- Rendering ----

function renderStats() {
  let tengo = 0, extras = 0;
  const total = STICKERS.length;
  STICKERS.forEach(base => {
    const s = getStickerState(base);
    if (s.completado) tengo++;
    extras += s.extra;
  });
  document.getElementById('count-tengo').textContent = tengo;
  document.getElementById('count-falta').textContent = total - tengo;
  document.getElementById('count-total').textContent = total;
  document.getElementById('count-extras').textContent = extras;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderStickers() {
  const filters = getFilters();
  const list = document.getElementById('sticker-list');

  // Build per-country stats and filtered lists in one pass
  const groupMap = new Map();
  PAISES.forEach(p => {
    groupMap.set(p.codigo, { pais: p, total: 0, tengo: 0, matching: [] });
  });

  STICKERS.forEach(base => {
    const s = getStickerState(base);
    const g = groupMap.get(s.pais);
    if (!g) return;
    g.total++;
    if (s.completado) g.tengo++;
    if (matchesFilters(s, filters)) g.matching.push(s);
  });

  let html = '';
  let anyVisible = false;

  PAISES.forEach(p => {
    const g = groupMap.get(p.codigo);
    if (!g || g.matching.length === 0) return;
    anyVisible = true;

    const collapsed = collapsedGroups.has(p.codigo) ? ' collapsed' : '';
    const pct = g.total > 0 ? Math.round((g.tengo / g.total) * 100) : 0;

    html += `<div class="country-group${collapsed}" data-pais="${escapeHtml(p.codigo)}">`;
    html += `<div class="country-header" onclick="toggleGroup('${escapeHtml(p.codigo)}')">`;
    html += `<span class="country-code">${escapeHtml(p.codigo)}</span>`;
    html += `<span class="country-name">${escapeHtml(p.nombre)}</span>`;
    html += `<span class="country-progress">${g.tengo}/${g.total}</span>`;
    html += `<div class="country-progress-bar"><div class="country-progress-fill" style="width:${pct}%"></div></div>`;
    html += `<span class="country-chevron">▼</span>`;
    html += `</div>`;
    html += `<div class="sticker-list">`;

    g.matching.forEach(s => {
      const badgeClass = s.completado ? 'badge-tengo' : 'badge-falta';
      const badgeText = s.completado ? 'TENGO' : 'FALTA';
      const extraBadge = s.extra > 0
        ? `<span class="badge badge-extra">+${s.extra}</span>`
        : '';
      const nameContent = s.nombre
        ? escapeHtml(s.nombre)
        : '<span class="empty">—</span>';

      html += `<div class="sticker-row">`;
      html += `<span class="sticker-id">${escapeHtml(s.id)}</span>`;
      html += `<span class="sticker-name">${nameContent}</span>`;
      html += `<div class="badges">`;
      html += `<button class="badge ${badgeClass}" onclick="handleToggle(event,'${escapeHtml(s.id)}')">${badgeText}</button>`;
      html += extraBadge;
      html += `<div class="extra-controls">`;
      html += `<button class="btn-extra" onclick="handleExtra(event,'${escapeHtml(s.id)}',-1)" title="Quitar extra">−</button>`;
      html += `<button class="btn-extra" onclick="handleExtra(event,'${escapeHtml(s.id)}',1)" title="Añadir extra">+</button>`;
      html += `</div>`;
      html += `</div>`;
      html += `</div>`;
    });

    html += `</div></div>`;
  });

  if (!anyVisible) {
    html = '<div class="empty">No se encontraron figuritas</div>';
  }

  list.innerHTML = html;
}

function renderAll() {
  renderStats();
  renderStickers();
}

// ---- Event handlers ----

function handleToggle(event, id) {
  event.stopPropagation();
  const base = STICKERS.find(s => s.id === id);
  if (!base) return;
  const current = getStickerState(base);
  setCompletado(id, !current.completado);
  renderAll();
}

function handleExtra(event, id, delta) {
  event.stopPropagation();
  const base = STICKERS.find(s => s.id === id);
  if (!base) return;
  const current = getStickerState(base);
  setExtra(id, current.extra + delta);
  renderAll();
}

function toggleGroup(codigo) {
  if (collapsedGroups.has(codigo)) {
    collapsedGroups.delete(codigo);
  } else {
    collapsedGroups.add(codigo);
  }
  localStorage.setItem(COLLAPSED_KEY, JSON.stringify([...collapsedGroups]));
  renderStickers();
}

// ---- Export / Reset ----

function exportCSV() {
  const rows = ['ID,NOMBRE,COMPLETADO,EXTRA'];
  STICKERS.forEach(base => {
    const s = getStickerState(base);
    const nombre = (s.nombre || '').replace(/,/g, ';').replace(/\n/g, ' ');
    rows.push(`${s.id},${nombre},${s.completado ? 'SI' : 'NO'},${s.extra}`);
  });
  const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'monitas.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function resetFromCSV() {
  if (!confirm('¿Descartar los cambios hechos en el navegador y volver al estado del último CSV desplegado?')) return;
  localStorage.removeItem(STORAGE_KEY);
  state = {};
  renderAll();
}

// ---- Setup ----

function buildPaisFilter() {
  const select = document.getElementById('filter-pais');
  PAISES.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.codigo;
    opt.textContent = `${p.codigo} — ${p.nombre}`;
    select.appendChild(opt);
  });
}

function setupControls() {
  document.getElementById('search').addEventListener('input', () => {
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(renderAll, 180);
  });
  document.getElementById('filter-status').addEventListener('change', renderAll);
  document.getElementById('filter-pais').addEventListener('change', renderAll);
  document.getElementById('btn-export').addEventListener('click', exportCSV);
  document.getElementById('btn-reset').addEventListener('click', resetFromCSV);
}

document.addEventListener('DOMContentLoaded', () => {
  if (typeof STICKERS === 'undefined' || typeof PAISES === 'undefined') {
    document.getElementById('sticker-list').innerHTML =
      '<div class="error"><strong>Error:</strong> El archivo <code>data.js</code> no está disponible. ' +
      'Se genera automáticamente al desplegar en GitHub Pages. ' +
      'Para probar localmente, ejecuta <code>python3 build.py</code> en la raíz del proyecto.</div>';
    return;
  }
  loadState();
  buildPaisFilter();
  setupControls();
  renderAll();
});
