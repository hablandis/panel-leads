import { initializeApp }                                      from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getAuth, signInWithEmailAndPassword,
         signOut, onAuthStateChanged }                        from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { getDatabase, ref, get, update, push, set }          from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js';
import { firebaseConfig }                                     from './firebase-config.js';

// ── PWA ───────────────────────────────────────────────────────────────────────
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(console.warn);
}

const ALLOWED_DOMAIN = 'hablandis.com';

// Proxy de la Fase 2.5 (lee la nota con la IA y devuelve el JSON de señales).
// URL configurable: si algún día cambia el endpoint, se toca solo aquí.
const PROXY_ANALIZAR_URL = 'https://www.hablandis.com/api/analizar.php';

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getDatabase(app);

// ── DOM refs — vistas ─────────────────────────────────────────────────────────
const loginView   = document.getElementById('login-view');
const appView     = document.getElementById('app-view');
const loginForm   = document.getElementById('login-form');
const inputEmail  = document.getElementById('login-email');
const inputPass   = document.getElementById('login-password');
const btnSignout  = document.getElementById('btn-signout');
const loginError  = document.getElementById('login-error');
const userEmailEl = document.getElementById('user-email');

// ── DOM refs — header controles ───────────────────────────────────────────────
const syncIndicator = document.getElementById('sync-indicator');
const btnEventos    = document.getElementById('btn-eventos');
const btnModo       = document.getElementById('btn-modo');
const btnCola       = document.getElementById('btn-cola');

// ── DOM refs — tabla ──────────────────────────────────────────────────────────
const leadsStatus  = document.getElementById('leads-status');
const leadsTable   = document.getElementById('leads-table');
const leadsTbody   = document.getElementById('leads-tbody');
const leadsCount   = document.getElementById('leads-count');
const tableWrapper = document.querySelector('.table-wrapper');

// ── DOM refs — cola de contacto (Capa A) ──────────────────────────────────────
const colaView = document.getElementById('cola-view');

// ── DOM refs — vía de entrada (ficha) ─────────────────────────────────────────
const panelViasEl = document.getElementById('panel-vias');
const viaStatusEl = document.getElementById('via-status');

// ── DOM refs — comportamiento (Capa A) ────────────────────────────────────────
const compRangoEl  = document.getElementById('comp-rango');
const compGruposEl = document.getElementById('comp-grupos');
const compSelloEl  = document.getElementById('comp-sello');
const compStatusEl = document.getElementById('comp-status');

// ── DOM refs — Fase 2.5 (señales / sugerencia de la IA) ───────────────────────
const btnAnalizar     = document.getElementById('btn-analizar');
const analizarStatus  = document.getElementById('analizar-status');
const sugSectionEl    = document.getElementById('panel-sugerencia-section');
const sugCardEl       = document.getElementById('sug-card');

// ── DOM refs — barra de modo evento ──────────────────────────────────────────
const eventoBar      = document.getElementById('evento-bar');
const eventoSelect   = document.getElementById('evento-select');
const btnNuevoLead   = document.getElementById('btn-nuevo-lead');

// ── DOM refs — panel de detalle completo ──────────────────────────────────────
const panelOverlay     = document.getElementById('panel-overlay');
const leadPanel        = document.getElementById('lead-panel');
const panelClose       = document.getElementById('panel-close');
const panelTitle       = document.getElementById('panel-title');
const panelSupertitle  = document.getElementById('panel-supertitle');
const panelReadonly    = document.getElementById('panel-readonly');
const panelCooling     = document.getElementById('panel-cooling');
const btnEnfriar       = document.getElementById('btn-enfriar');
const panelForm        = document.getElementById('panel-form');
const panelHistSection = document.getElementById('panel-historial-section');
const panelHistorial   = document.getElementById('panel-historial');
const panelSave        = document.getElementById('panel-save');
const panelCancel      = document.getElementById('panel-cancel');
const panelStatusEl    = document.getElementById('panel-status');

// ── DOM refs — quick panel ────────────────────────────────────────────────────
const quickPanel    = document.getElementById('quick-panel');
const qpClose       = document.getElementById('qp-close');
const qpSupertitle  = document.getElementById('qp-supertitle');
const qpTitle       = document.getElementById('qp-title');
const qpEmail       = document.getElementById('qp-email');
const qpQualButtons = document.getElementById('qp-qual-buttons');
const qpNota        = document.getElementById('qp-nota');
const qpSave        = document.getElementById('qp-save');
const qpCancel      = document.getElementById('qp-cancel');
const qpStatusEl    = document.getElementById('qp-status');

// ── DOM refs — modales ────────────────────────────────────────────────────────
const modalOverlay  = document.getElementById('modal-overlay');
const eventManager  = document.getElementById('event-manager');
const emClose       = document.getElementById('em-close');
const emList        = document.getElementById('em-list');
const emForm        = document.getElementById('em-form');
const emStatus      = document.getElementById('em-status');
const emFormTitle   = document.getElementById('em-form-title');
const emSubmitBtn   = document.getElementById('em-submit-btn');
const emCancelEdit  = document.getElementById('em-cancel-edit');
const newLeadModal  = document.getElementById('new-lead-modal');
const nlClose       = document.getElementById('nl-close');
const nlEventoLabel = document.getElementById('nl-evento-label');
const nlForm        = document.getElementById('nl-form');
const nlError       = document.getElementById('nl-error');
const nlStatus      = document.getElementById('nl-status');

// ── DOM refs — stats y filtros ────────────────────────────────────────────────
const statsBar        = document.getElementById('stats-bar');
const filtersBar      = document.getElementById('filters-bar');
const statNumTotal    = document.getElementById('stat-num-total');
const statNumCal      = document.getElementById('stat-num-calientes');
const statNumSinProp  = document.getElementById('stat-num-sin-prop');
const statNumHoy      = document.getElementById('stat-num-hoy');
const statTotal       = document.getElementById('stat-total');
const statCalientes   = document.getElementById('stat-calientes');
const statSinProp     = document.getElementById('stat-sin-prop');
const statHoy         = document.getElementById('stat-hoy');
const filterCualEl    = document.getElementById('filter-cual');
const filterPropEl    = document.getElementById('filter-prop');
const btnClearFilters = document.getElementById('btn-clear-filters');
const btnExport       = document.getElementById('btn-export');

// ── Estado ────────────────────────────────────────────────────────────────────
let allRows        = [];
let personasCache  = [];          // listado por persona (dedup por email), cacheado
let contactosCache = {};
let eventosCache   = {};
let currentLead    = null;
let lastFocusedEl  = null;
let appMode        = 'repaso';   // 'repaso' | 'evento'
let activeEventKey = null;
let currentQuickLead = null;
let quickQualValue   = '';
let pendingQueue   = [];
let filterCual     = '';
let filterProp     = '';
let filterHoy      = false;
let editingEventKey = null;

// ── Capa A · comportamiento (8 toggles, agrupados por nivel, de más cerca a
//    más lejos de la decisión). El rango de urgencia = nivel MÁS ALTO con algún
//    toggle activo (máximo, NO suma; nunca resta). ──────────────────────────────
const NIVELES_COMPORTAMIENTO = [
  { nivel: 4, titulo: 'Nivel 4 · Camino a la decisión', toggles: [
    { key: 'llevadoAOrganoDecision', label: 'Lo ha llevado a dirección o al claustro' },
    { key: 'usaMaterialHaciaArriba', label: 'Usa el material para convencer a dirección o familias' },
    { key: 'pidioPresupuesto',       label: 'Ha pedido o recibido un presupuesto' },
    { key: 'reunionAgendada',        label: 'Tiene una reunión o llamada agendada' },
  ] },
  { nivel: 3, titulo: 'Nivel 3 · Relación activa', toggles: [
    { key: 'hiloVivoWhatsApp',  label: 'Conversación viva por WhatsApp' },
    { key: 'segundoToque',      label: 'Ha vuelto una segunda vez' },
    { key: 'respondioPersonal', label: 'Respondió a un mensaje personal' },
  ] },
  { nivel: 2, titulo: 'Nivel 2 · Conoció la propuesta', toggles: [
    { key: 'asistioTaller', label: 'Asistió a un taller' },
  ] },
  { nivel: 1, titulo: 'Nivel 1 · Primer roce', toggles: [
    { key: 'dejoDatosEnMesa', label: 'Dejó sus datos en la mesa (a cambio de material o merch)' },
  ] },
];

// Peso de cualificación para ordenar la cola (caliente antes que templado;
// sin definir al final). El frío nunca entra en la cola.
const PESO_CUALIFICACION = { caliente: 0, templado: 1, '': 2 };

// ── Vía: cómo entró el contacto (lista CERRADA, no texto libre). Eje aparte del
//    evento (dónde/cuándo). 'taller' se DERIVA del tallerId de cada captura y NO
//    se guarda; mesa/web/referido/sorteo entran a mano como overlay aditivo bajo
//    contactos/<emailKey>/vias/{via}:true. (Hoy solo se deriva 'taller'. 'mesa' y
//    'sorteo' son manuales de momento: sus QR están pendientes. Cuando exista el
//    QR de 'sorteo' (ruta DEDICADA /leads/sorteo/, sin escritor manual), se podrá
//    deducir solo de la ruta sin ambigüedad — a diferencia de 'mesa', cuya ruta
//    /leads/mesa/ comparte con el alta manual.) ──────────────────────────────────
const VIAS = [
  { key: 'taller',   label: 'Taller' },
  { key: 'mesa',     label: 'Mesa' },
  { key: 'sorteo',   label: 'Sorteo' },
  { key: 'web',      label: 'Web' },
  { key: 'referido', label: 'Referido' },
];
const VIAS_KEYS = new Set(VIAS.map(v => v.key));
const VIA_LABEL = Object.fromEntries(VIAS.map(v => [v.key, v.label]));

// Vía intrínseca de una captura, derivada de su tallerId (= primer tramo bajo
// /leads/). Cada vía con QR tiene su ruta DEDICADA: /leads/taller-*/, /leads/mesa/,
// /leads/sorteo/. El alta manual del panel escribe en /leads/manual/ (ruta neutra,
// sin vía derivada: la vía la pone Román a mano en la ficha).
function viaDerivada(tallerId) {
  const t = String(tallerId || '').toLowerCase();
  if (/^taller/.test(t)) return 'taller';
  if (t === 'mesa')      return 'mesa';
  if (t === 'sorteo')    return 'sorteo';
  return null;
}

// Vías derivadas (de capturas) de la persona con este email. Se usa en la ficha
// para marcar las vías "automáticas" que no se pueden quitar a mano.
function viasDerivadasDeEmail(email) {
  const set = new Set();
  const lc  = String(email || '').toLowerCase();
  for (const r of allRows) {
    if (r.email.toLowerCase() !== lc) continue;
    const d = viaDerivada(r.tallerId);
    if (d) set.add(d);
  }
  return set;
}

// Conjunto final de vías de una persona = derivadas ∪ manuales (contacto.vias),
// devuelto como array ordenado según VIAS. Nunca resta: la derivada siempre sale.
function viasDePersona(derivadas, contacto) {
  const set    = new Set(derivadas);
  const manual = (contacto && contacto.vias) || {};
  for (const k of Object.keys(manual)) {
    if (manual[k] === true && VIAS_KEYS.has(k)) set.add(k);
  }
  return VIAS.filter(v => set.has(v.key)).map(v => v.key);
}

// ── Auth ──────────────────────────────────────────────────────────────────────
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginError.hidden = true;
  const email    = inputEmail.value.trim();
  const password = inputPass.value;
  try {
    const { user } = await signInWithEmailAndPassword(auth, email, password);
    if (!user.email.endsWith(`@${ALLOWED_DOMAIN}`)) {
      await signOut(auth);
      showLoginError('Acceso solo para el equipo de Hablandis.');
    }
  } catch (err) {
    showLoginError(loginErrorMsg(err.code));
  }
});

btnSignout.addEventListener('click', () => signOut(auth));

onAuthStateChanged(auth, (user) => {
  if (user && user.email.endsWith(`@${ALLOWED_DOMAIN}`)) {
    showApp(user);
  } else if (user) {
    signOut(auth);
    showLoginError('Acceso solo para el equipo de Hablandis.');
  } else {
    showLogin();
  }
});

function loginErrorMsg(code) {
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found': return 'Email o contraseña incorrectos.';
    case 'auth/too-many-requests': return 'Demasiados intentos. Espera unos minutos.';
    case 'auth/user-disabled': return 'Cuenta desactivada. Contacta con el administrador.';
    default: return 'Error al iniciar sesión. Inténtalo de nuevo.';
  }
}

function showLogin() {
  closePanel();
  closeQuickPanel();
  closeEventManager();
  closeNewLead();
  loginView.hidden = false;
  appView.hidden   = true;
}

function showLoginError(msg) {
  loginError.textContent = msg;
  loginError.hidden      = false;
}

function showApp(user) {
  loginView.hidden        = true;
  appView.hidden          = false;
  userEmailEl.textContent = user.email;
  loadPendingFromStorage();
  updateSyncIndicator();
  syncPending();
  loadAll();
}

// ── Carga de datos ────────────────────────────────────────────────────────────
async function loadAll() {
  leadsStatus.textContent = 'Cargando…';
  leadsStatus.hidden      = false;
  leadsTable.hidden       = true;
  leadsTbody.innerHTML    = '';
  allRows                 = [];

  try {
    const [leadsSnap, contactosSnap, eventosSnap] = await Promise.all([
      get(ref(db, 'leads')),
      get(ref(db, 'contactos')),
      get(ref(db, 'eventos')),
    ]);

    contactosCache = contactosSnap.val() ?? {};
    eventosCache   = eventosSnap.val()   ?? {};
    populateEventoSelect();

    if (leadsSnap.exists()) {
      leadsSnap.forEach((tallerSnap) => {
        const tallerId = tallerSnap.key;
        tallerSnap.forEach((leadSnap) => {
          const d = leadSnap.val();
          // Evento: el taller escribe el slug en `eventoSlug`. Se resuelve a la
          // etiqueta del evento (nombre · ciudad). Fallback a `evento_origen`
          // (texto legado) si no hay slug o no casa con ningún evento.
          const eventoSlugRaw = d.eventoSlug   ?? '';
          const eventoRaw     = d.evento_origen ?? '';
          const evMatch       = eventoPorSlug(eventoSlugRaw);
          allRows.push({
            tallerId,
            pushKey:       leadSnap.key,
            nombre:        d.nombre        ?? '—',
            apellidos:     d.apellidos     ?? '—',
            email:         d.email         ?? '',
            evento:        evMatch ? etiquetaEvento(evMatch) : (eventoRaw || '—'),
            eventoSlug:    eventoSlugRaw,
            eventoRaw:     eventoRaw,
            fecha:         d.fecha_envio   ?? '',
            notaDelEvento: d.gestion?.notaDelEvento ?? '',
            mensajeLead:   d.contexto ?? d.mensaje ?? '',   // texto libre que dejó el lead al capturarse (solo lectura)
          });
        });
      });
      allRows.sort((a, b) => b.fecha.localeCompare(a.fecha));
    }

    await rebuildPersonas();

    if (allRows.length === 0) {
      leadsStatus.textContent = 'No hay leads todavía.';
      leadsStatus.hidden      = false;
      updateStats();
    } else {
      leadsStatus.hidden = true;
      leadsTable.hidden  = false;
      renderTable();
      updateStats();
    }

  } catch (err) {
    leadsStatus.textContent = 'Error al cargar. Recarga la página.';
    leadsStatus.hidden      = false;
    console.error(err);
  }
}

// ── Tabla (una fila por PERSONA, dedup por email; las capturas siguen en /leads/
//    como historial, solo cambia la vista) ──────────────────────────────────────
function viasBadges(vias) {
  if (!vias || vias.length === 0) return '<span class="via-none">—</span>';
  return vias.map(k => {
    const auto = k === 'taller';   // hoy solo 'taller' es derivada/automática
    return `<span class="badge-via${auto ? ' auto' : ''}">${esc(VIA_LABEL[k] || k)}</span>`;
  }).join(' ');
}

function renderTable() {
  leadsTbody.innerHTML = '';

  const personas  = getFilteredPersonas();
  const total     = personasCache.length;
  const hasFilter = filterCual || filterProp || filterHoy || (appMode === 'evento' && activeEventKey);
  leadsCount.textContent = hasFilter
    ? `${personas.length} de ${total} persona${total !== 1 ? 's' : ''}`
    : `${total} persona${total !== 1 ? 's' : ''}`;

  if (personas.length === 0) {
    const msg = (appMode === 'evento' && activeEventKey)
      ? 'Sin contactos para este evento. Usa <strong>+ Nuevo lead</strong> para añadir el primero.'
      : 'Ningún contacto coincide con los filtros activos.';
    leadsTbody.innerHTML = `<tr><td colspan="8" class="table-empty">${msg}</td></tr>`;
    return;
  }

  personas.forEach((p) => {
    const cooling = isCooling(p.ultimoLead, p.contacto);

    const tr = document.createElement('tr');
    tr.dataset.taller = p.ultimoLead.tallerId;   // captura más reciente → abre su ficha
    tr.dataset.key    = p.ultimoLead.pushKey;
    tr.title          = 'Abrir ficha';
    tr.innerHTML = `
      <td>${viasBadges(p.vias)}</td>
      <td>${esc(p.nombre)}</td>
      <td>${esc(p.apellidos)}</td>
      <td><a href="mailto:${esc(p.email)}">${esc(p.email)}</a></td>
      <td>${esc(p.eventos.join(' · ') || '—')}</td>
      <td>${formatFecha(p.ultimoLead.fecha)}</td>
      <td>${cualificacionBadge(p.cualificacion, cooling)}</td>
      <td>${esc(p.propietario || '—')}</td>
    `;
    tr.addEventListener('click', (e) => {
      if (e.target.closest('a')) return;
      if (appMode === 'evento') {
        openQuickPanel(p.ultimoLead);
      } else {
        openPanel(p.ultimoLead);
      }
    });
    leadsTbody.appendChild(tr);
  });
}

// Tras una edición que toca el contacto (cualificación, propietario, vías,
// comportamiento…): reconstruye las personas y repinta la vista activa.
async function refreshAfterEdit() {
  await rebuildPersonas();
  if (appMode !== 'cola') renderTable();   // en modo cola no pisar su contador
  updateStats();
  maybeRefreshCola();
}

// ── Modo evento ───────────────────────────────────────────────────────────────
function setMode(mode) {
  appMode = mode;
  const inEvento = mode === 'evento';
  const inCola   = mode === 'cola';

  // Modo evento
  eventoBar.hidden = !inEvento;
  btnModo.classList.toggle('active', inEvento);
  btnModo.textContent = inEvento ? '← Modo repaso' : 'Modo evento';
  if (!inEvento) {
    activeEventKey     = null;
    eventoSelect.value = '';
  }

  // Cola de contacto
  btnCola.classList.toggle('active', inCola);
  colaView.hidden    = !inCola;
  tableWrapper.hidden = inCola;

  // Stats y filtros no aplican a la cola
  const hideBars = inCola || allRows.length === 0;
  statsBar.hidden   = hideBars;
  filtersBar.hidden = hideBars;
  if (inCola) leadsStatus.hidden = true;

  if (inCola) {
    renderCola();
  } else {
    renderTable();
    updateStats();
  }
}

function populateEventoSelect() {
  const current = eventoSelect.value;
  while (eventoSelect.options.length > 1) eventoSelect.remove(1);

  Object.entries(eventosCache)
    .sort((a, b) => (b[1].fecha ?? '').localeCompare(a[1].fecha ?? ''))
    .forEach(([key, ev]) => {
      const opt = document.createElement('option');
      opt.value = key;
      opt.textContent = ev.nombre + (ev.ciudad ? ` · ${ev.ciudad}` : '');
      eventoSelect.appendChild(opt);
    });

  if (current && eventosCache[current]) eventoSelect.value = current;
}

btnModo.addEventListener('click', () => setMode(appMode === 'evento' ? 'repaso' : 'evento'));
btnCola.addEventListener('click', () => setMode(appMode === 'cola'   ? 'repaso' : 'cola'));
btnEventos.addEventListener('click', () => {
  closePanel();
  closeQuickPanel();
  openEventManager();
});

eventoSelect.addEventListener('change', () => {
  activeEventKey = eventoSelect.value || null;
  renderTable();
});

btnNuevoLead.addEventListener('click', openNewLead);

// ── Gestor de eventos ─────────────────────────────────────────────────────────
function openEventManager() {
  renderEventoList();
  emForm.reset();
  emStatus.textContent = '';
  modalOverlay.hidden  = false;
  eventManager.removeAttribute('inert');
  eventManager.classList.add('is-open');
  document.body.style.overflow = 'hidden';
  emClose.focus();
}

function closeEventManager() {
  if (!eventManager.classList.contains('is-open')) return;
  eventManager.classList.remove('is-open');
  eventManager.setAttribute('inert', '');
  modalOverlay.hidden = true;
  document.body.style.overflow = '';
}

// ── Slug de evento — identificador ÚNICO para el QR (evento-ciudad-AAAAMMDD) ───
// Lo genera el panel a partir de código corto (o nombre) + ciudad + fecha de
// inicio; el QR lleva ?evento=<slug> y el taller lo escribe en el lead. Convención:
// minúsculas, sin acentos, guiones, fecha ISO compacta. La UNICIDAD la garantiza
// el panel (si colisiona, añade -2/-3), no el convenio escrito a mano.
function slugify(s) {
  return String(s || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')   // quita acentos
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function computeSlugBase(ev) {
  const base  = slugify(ev.codigoCorto || ev.nombre || '');
  const city  = slugify(ev.ciudad || '');
  const fecha = (ev.fechaInicio || ev.fecha || '').replace(/-/g, '');   // YYYY-MM-DD → AAAAMMDD
  return [base, city, fecha].filter(Boolean).join('-');
}

// Slug efectivo: el guardado, o el calculado si el evento aún no lo persistió.
function eventoSlug(ev) {
  return (ev && ev.slug) || computeSlugBase(ev || {});
}

// Resuelve un slug (el que escribe el taller en el lead) al evento del panel, o
// null si no lo encuentra. Sirve para mostrar la etiqueta y agrupar por evento.
function eventoPorSlug(slug) {
  if (!slug) return null;
  for (const ev of Object.values(eventosCache)) {
    if (eventoSlug(ev) === slug) return ev;
  }
  return null;
}

// Etiqueta legible de un evento (lo que se muestra en el listado/ficha/cola).
function etiquetaEvento(ev) {
  return ev.nombre + (ev.ciudad ? ` · ${ev.ciudad}` : '');
}

// Garantiza unicidad frente al resto de eventos (salvo el que se está editando).
function slugUnico(base, exceptKey) {
  if (!base) return '';
  const taken = new Set(
    Object.entries(eventosCache)
      .filter(([k]) => k !== exceptKey)
      .map(([, e]) => eventoSlug(e))
  );
  let s = base, n = 2;
  while (taken.has(s)) s = `${base}-${n++}`;
  return s;
}

function renderEventoList() {
  const entries = Object.entries(eventosCache);
  if (entries.length === 0) {
    emList.innerHTML = '<li class="em-empty">No hay eventos todavía. Añade el primero abajo.</li>';
    return;
  }
  entries.sort((a, b) => (b[1].fechaInicio ?? b[1].fecha ?? '').localeCompare(a[1].fechaInicio ?? a[1].fecha ?? ''));
  emList.innerHTML = entries.map(([key, ev]) => {
    const fechaStr = ev.fechaInicio && ev.fechaFin && ev.fechaInicio !== ev.fechaFin
      ? `${formatFechaCorta(ev.fechaInicio)} - ${formatFechaCorta(ev.fechaFin)}`
      : ev.fechaInicio ? formatFechaCorta(ev.fechaInicio) : ev.fecha ? formatFechaCorta(ev.fecha) : '';
    const slug = eventoSlug(ev);
    return `
      <li data-key="${key}">
        <div class="em-evento-content">
          <div>
            <span class="em-evento-nombre">${esc(ev.nombre)}</span>
            <span class="em-evento-meta">${ev.ciudad ? esc(ev.ciudad) + ' · ' : ''}${fechaStr}</span>
          </div>
          <div class="em-evento-actions">
            <button type="button" class="em-btn em-edit-btn" aria-label="Editar" data-key="${key}">✏️</button>
            <button type="button" class="em-btn em-delete-btn" aria-label="Eliminar" data-key="${key}">🗑️</button>
          </div>
        </div>
        <div class="em-evento-slug">
          <span class="em-slug-label">slug QR:</span>
          <code>${esc(slug || '—')}</code>
          ${slug ? `<button type="button" class="em-copy-btn" data-slug="${esc(slug)}">copiar</button>` : ''}
          <button type="button" class="em-copy-btn em-regen-btn" data-key="${key}">regenerar</button>
        </div>
      </li>
    `;
  }).join('');

  emList.querySelectorAll('.em-copy-btn:not(.em-regen-btn)').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      try {
        await navigator.clipboard.writeText(btn.dataset.slug);
        const prev = btn.textContent;
        btn.textContent = 'copiado ✓';
        setTimeout(() => { btn.textContent = prev; }, 1500);
      } catch { /* sin portapapeles: el slug está a la vista para copiarlo a mano */ }
    });
  });

  emList.querySelectorAll('.em-regen-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      regenerarSlug(btn.dataset.key);
    });
  });

  emList.querySelectorAll('.em-edit-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const key = btn.dataset.key;
      editEvent(key);
    });
  });
  emList.querySelectorAll('.em-delete-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const key = btn.dataset.key;
      if (confirm(`¿Eliminar evento "${eventosCache[key].nombre}"?`)) {
        deleteEvent(key);
      }
    });
  });
}

function editEvent(key) {
  editingEventKey = key;
  const ev = eventosCache[key];

  emForm['nombre'].value = ev.nombre || '';
  emForm['codigoCorto'].value = ev.codigoCorto || '';
  emForm['fechaInicio'].value = ev.fechaInicio || ev.fecha || '';
  emForm['fechaFin'].value = ev.fechaFin || '';
  emForm['ciudad'].value = ev.ciudad || '';

  emFormTitle.textContent = 'Editar evento';
  emSubmitBtn.textContent = 'Guardar cambios';
  emCancelEdit.hidden = false;
  emStatus.textContent = '';

  emForm['nombre'].focus();
}

function cancelEditEvent() {
  editingEventKey = null;
  emForm.reset();
  emFormTitle.textContent = 'Nuevo evento';
  emSubmitBtn.textContent = 'Añadir evento';
  emCancelEdit.hidden = true;
  emStatus.textContent = '';
}

// Recalcula el slug de un evento a propósito (cambio intencionado ANTES de hacer
// el QR). Avisa porque cambiarlo tras generar el QR desemparejaría sus leads.
async function regenerarSlug(key) {
  const ev = eventosCache[key];
  if (!ev) return;
  if (!confirm(
    '¿Regenerar el identificador (slug) de este evento?\n\n' +
    'Hazlo SOLO si aún no has creado el QR con el slug actual. Si el QR ya está ' +
    'hecho, cambiar el slug haría que sus leads dejaran de agruparse en este evento.'
  )) return;

  const nuevo = slugUnico(computeSlugBase(ev), key);
  ev.slug = nuevo;
  const result = await resilientSave('update', `eventos/${key}`, { slug: nuevo });

  renderEventoList();
  emStatus.textContent = result.queued ? 'Slug regenerado (local) ↑' : 'Slug regenerado ✓';
  emStatus.className   = result.queued ? 'panel-status' : 'panel-status ok';
}

async function deleteEvent(key) {
  emStatus.textContent = 'Eliminando…';
  const result = await resilientSave('set', `eventos/${key}`, null);

  delete eventosCache[key];
  if (activeEventKey === key) {
    activeEventKey = null;
    eventoSelect.value = '';
  }
  populateEventoSelect();
  renderEventoList();
  renderTable();

  emStatus.textContent = result.queued ? 'Eliminado localmente ↑' : 'Eliminado ✓';
  emStatus.className = result.queued ? 'panel-status' : 'panel-status ok';
}

emForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const nombre = emForm['nombre'].value.trim();
  if (!nombre) return;

  const wasEditing = editingEventKey !== null;
  const eventoData = {
    nombre,
    codigoCorto:  emForm['codigoCorto'].value.trim(),
    fechaInicio:  emForm['fechaInicio'].value,
    fechaFin:     emForm['fechaFin'].value,
    ciudad:       emForm['ciudad'].value.trim(),
    creadoPor:    auth.currentUser.email,
  };

  emStatus.textContent = 'Guardando…';
  emStatus.className   = 'panel-status';

  let key = editingEventKey;
  if (!key) {
    key = push(ref(db, 'eventos')).key;
  }

  // El slug es un IDENTIFICADOR ESTABLE del evento (va en el QR). Se calcula al
  // CREAR y NO se recalcula al editar: cambiarlo rompería un QR ya generado. Para
  // cambiarlo a propósito (antes de hacer el QR) está el botón "regenerar".
  const slugPrevio = editingEventKey ? eventosCache[editingEventKey]?.slug : null;
  eventoData.slug = slugPrevio || slugUnico(computeSlugBase(eventoData), key);

  const result = await resilientSave('set', `eventos/${key}`, eventoData);

  eventosCache[key] = eventoData;
  populateEventoSelect();
  renderEventoList();
  renderTable();

  cancelEditEvent();
  emStatus.textContent = result.queued ? 'Guardado localmente ↑' : (wasEditing ? 'Actualizado ✓' : 'Añadido ✓');
  emStatus.className   = result.queued ? 'panel-status' : 'panel-status ok';
});

emCancelEdit.addEventListener('click', cancelEditEvent);

emClose.addEventListener('click', closeEventManager);

// ── Nuevo lead ────────────────────────────────────────────────────────────────
function openNewLead() {
  const ev = activeEventKey ? eventosCache[activeEventKey] : null;
  nlEventoLabel.textContent = ev
    ? `Evento: ${ev.nombre}${ev.ciudad ? ' · ' + ev.ciudad : ''}`
    : 'Sin evento activo seleccionado';
  nlForm.reset();
  nlError.hidden       = true;
  nlStatus.textContent = '';

  modalOverlay.hidden = false;
  newLeadModal.removeAttribute('inert');
  newLeadModal.classList.add('is-open');
  document.body.style.overflow = 'hidden';
  document.getElementById('nl-nombre').focus();
}

function closeNewLead() {
  if (!newLeadModal.classList.contains('is-open')) return;
  newLeadModal.classList.remove('is-open');
  newLeadModal.setAttribute('inert', '');
  modalOverlay.hidden = true;
  document.body.style.overflow = '';
}

nlClose.addEventListener('click', closeNewLead);

nlForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const nombre = nlForm['nombre'].value.trim();
  const email  = nlForm['email'].value.trim();

  if (!nombre || !email) {
    nlError.textContent = 'Nombre y email son obligatorios.';
    nlError.hidden = false;
    return;
  }
  nlError.hidden = true;

  const ev    = activeEventKey ? eventosCache[activeEventKey] : null;
  // Alta manual → ruta NEUTRA /leads/manual/ (sin vía derivada). La vía la pone
  // Román a mano en la ficha. /leads/mesa/ queda reservada a la página de mesa (QR).
  const newKey = push(ref(db, 'leads/manual')).key;
  const leadData = {
    nombre,
    apellidos:      nlForm['apellidos'].value.trim(),
    email,
    evento_origen:  ev?.nombre ?? '',
    eventoSlug:     ev ? eventoSlug(ev) : '',   // mismo slug del evento activo → agrupa como los del QR
    fecha_envio:    new Date().toISOString(),
    consentimiento: true,
    canal:          'manual',
    origen:         'panel',
  };
  const notaInicial = nlForm['nota'].value.trim();

  nlStatus.textContent = 'Guardando…';
  const ops = [resilientSave('set', `leads/manual/${newKey}`, leadData)];
  if (notaInicial) {
    ops.push(resilientSave('update', `leads/manual/${newKey}/gestion`, { notaDelEvento: notaInicial }));
  }
  await Promise.all(ops);

  const newRow = {
    tallerId:      'manual',
    pushKey:       newKey,
    nombre:        leadData.nombre    || '—',
    apellidos:     leadData.apellidos || '—',
    email:         leadData.email     || '',
    evento:        ev ? etiquetaEvento(ev) : (leadData.evento_origen || '—'),
    eventoSlug:    leadData.eventoSlug,
    eventoRaw:     leadData.evento_origen,
    fecha:         leadData.fecha_envio,
    notaDelEvento: notaInicial,
    mensajeLead:   '',
  };
  allRows.unshift(newRow);
  await rebuildPersonas();

  if (leadsTable.hidden) {
    leadsStatus.hidden = true;
    leadsTable.hidden  = false;
  }
  renderTable();
  updateStats();
  closeNewLead();

  if (appMode === 'evento') openQuickPanel(newRow);
});

// ── Panel de detalle completo ─────────────────────────────────────────────────
function openPanel(lead) {
  lastFocusedEl = document.activeElement;
  currentLead   = lead;

  const emailKey = emailToKey(lead.email);
  const contacto = contactosCache[emailKey] ?? {};
  const cooling  = isCooling(lead, contacto);

  panelSupertitle.textContent = `${lead.tallerId} · ${lead.evento}`;
  const nombre = [lead.nombre, lead.apellidos].filter(x => x !== '—').join(' ');
  panelTitle.textContent = nombre || lead.email;

  panelReadonly.innerHTML = `
    <dt>Email</dt>   <dd><a href="mailto:${esc(lead.email)}">${esc(lead.email)}</a></dd>
    <dt>Taller</dt>  <dd>${esc(lead.tallerId)}</dd>
    <dt>Evento</dt>  <dd>${esc(lead.evento)}</dd>
    <dt>Enviado</dt> <dd>${formatFecha(lead.fecha)}</dd>
    ${lead.mensajeLead ? `<dt>Mensaje del lead</dt> <dd class="dd-mensaje">${esc(lead.mensajeLead)}</dd>` : ''}
  `;

  panelCooling.hidden = !cooling;

  panelForm['cualificacion'].value    = contacto.cualificacion    ?? '';
  panelForm['propietario'].value      = contacto.propietario      ?? '';
  panelForm['pais'].value             = contacto.pais             ?? '';
  panelForm['institucion'].value      = contacto.institucion      ?? '';
  panelForm['nivelEnsenanza'].value   = contacto.nivelEnsenanza   ?? '';
  panelForm['proximoPaso'].value      = contacto.proximoPaso      ?? '';
  panelForm['fechaProximoPaso'].value = contacto.fechaProximoPaso ?? '';
  panelForm['notas'].value            = contacto.notas            ?? '';
  panelForm['notaDelEvento'].value    = lead.notaDelEvento;

  setViaStatus('');
  renderVias(contacto);

  setCompStatus('');
  renderComportamiento(contacto);

  setAnalizarStatus('');
  renderSugerencia(contacto);   // pinta la tarjeta de la IA si hay señales guardadas

  const otras = allRows.filter(r =>
    r.email.toLowerCase() === lead.email.toLowerCase() && r.pushKey !== lead.pushKey
  );
  if (otras.length > 0) {
    panelHistorial.innerHTML = otras.map(r => `
      <li>
        <span class="historial-badge">${esc(r.tallerId)}</span>
        <span>${esc(r.evento)}</span>
        <span class="historial-date">${formatFechaCorta(r.fecha)}</span>
      </li>
    `).join('');
    panelHistSection.hidden = false;
  } else {
    panelHistSection.hidden = true;
  }

  setPanelStatus('');
  panelOverlay.hidden = false;
  leadPanel.removeAttribute('inert');
  leadPanel.classList.add('is-open');
  document.body.style.overflow = 'hidden';
  panelClose.focus();
}

function closePanel() {
  if (!leadPanel.classList.contains('is-open')) return;
  leadPanel.classList.remove('is-open');
  leadPanel.setAttribute('inert', '');
  panelOverlay.hidden          = true;
  document.body.style.overflow = '';
  currentLead = null;
  lastFocusedEl?.focus();
  lastFocusedEl = null;
  maybeRefreshCola();
}

function setPanelStatus(msg, type = '') {
  panelStatusEl.textContent = msg;
  panelStatusEl.className   = 'panel-status' + (type ? ` ${type}` : '');
}

async function savePanel() {
  if (!currentLead) return;

  const emailKey = emailToKey(currentLead.email);
  const cual     = panelForm['cualificacion'].value;

  const contactoData = {
    cualificacion:       cual,
    cualificacionManual: cual !== '',
    propietario:         panelForm['propietario'].value,
    pais:                panelForm['pais'].value.trim(),
    institucion:         panelForm['institucion'].value.trim(),
    nivelEnsenanza:      panelForm['nivelEnsenanza'].value,
    proximoPaso:         panelForm['proximoPaso'].value.trim(),
    fechaProximoPaso:    panelForm['fechaProximoPaso'].value,
    notas:               panelForm['notas'].value.trim(),
    actualizadoPor:      auth.currentUser.email,
    fechaActualizacion:  new Date().toISOString(),
  };

  const notaDelEvento = panelForm['notaDelEvento'].value.trim();

  setPanelStatus('Guardando…');
  panelSave.disabled = true;

  const ops = [resilientSave('update', `contactos/${emailKey}`, contactoData)];
  if (notaDelEvento !== currentLead.notaDelEvento) {
    ops.push(resilientSave(
      'update',
      `leads/${currentLead.tallerId}/${currentLead.pushKey}/gestion`,
      { notaDelEvento }
    ));
    currentLead.notaDelEvento = notaDelEvento;
  }

  const results = await Promise.all(ops);
  const queued  = results.some(r => r.queued);

  contactosCache[emailKey] = { ...(contactosCache[emailKey] ?? {}), ...contactoData };
  await refreshAfterEdit();

  setPanelStatus(queued ? 'Guardado localmente ↑' : 'Guardado ✓', queued ? '' : 'ok');
  panelSave.disabled = false;
}

panelClose.addEventListener('click', closePanel);
panelCancel.addEventListener('click', closePanel);
panelOverlay.addEventListener('click', () => {
  closePanel();
  closeQuickPanel();
});
panelSave.addEventListener('click', savePanel);
btnAnalizar.addEventListener('click', analizarNota);

btnEnfriar.addEventListener('click', () => {
  panelForm['cualificacion'].value = 'frio';
  panelCooling.hidden = true;
});

// ── Quick panel ───────────────────────────────────────────────────────────────
function openQuickPanel(lead) {
  lastFocusedEl    = document.activeElement;
  currentQuickLead = lead;
  quickQualValue   = contactosCache[emailToKey(lead.email)]?.cualificacion ?? '';

  qpSupertitle.textContent = `${lead.tallerId} · ${lead.evento}`;
  const nombre = [lead.nombre, lead.apellidos].filter(x => x !== '—').join(' ');
  qpTitle.textContent = nombre || lead.email;
  qpEmail.innerHTML   = `<a href="mailto:${esc(lead.email)}">${esc(lead.email)}</a>`;
  qpNota.value        = lead.notaDelEvento;

  setQualSelected(quickQualValue);
  setQpStatus('');

  panelOverlay.hidden = false;
  quickPanel.removeAttribute('inert');
  quickPanel.classList.add('is-open');
  document.body.style.overflow = 'hidden';
  qpNota.focus();
}

function closeQuickPanel() {
  if (!quickPanel.classList.contains('is-open')) return;
  quickPanel.classList.remove('is-open');
  quickPanel.setAttribute('inert', '');
  panelOverlay.hidden          = true;
  document.body.style.overflow = '';
  currentQuickLead = null;
  quickQualValue   = '';
  lastFocusedEl?.focus();
  lastFocusedEl = null;
}

function setQualSelected(val) {
  quickQualValue = val;
  qpQualButtons.querySelectorAll('.qual-btn').forEach(btn => {
    btn.classList.toggle('selected', btn.dataset.val === val);
  });
}

function setQpStatus(msg, type = '') {
  qpStatusEl.textContent = msg;
  qpStatusEl.className   = 'panel-status' + (type ? ` ${type}` : '');
}

async function saveQuickPanel() {
  if (!currentQuickLead) return;

  const emailKey    = emailToKey(currentQuickLead.email);
  const nota        = qpNota.value.trim();
  const cual        = quickQualValue;
  const contactoData = {
    cualificacion:       cual,
    cualificacionManual: cual !== '',
    actualizadoPor:      auth.currentUser.email,
    fechaActualizacion:  new Date().toISOString(),
  };

  setQpStatus('Guardando…');
  qpSave.disabled = true;

  const ops = [resilientSave('update', `contactos/${emailKey}`, contactoData)];
  if (nota !== currentQuickLead.notaDelEvento) {
    ops.push(resilientSave(
      'update',
      `leads/${currentQuickLead.tallerId}/${currentQuickLead.pushKey}/gestion`,
      { notaDelEvento: nota }
    ));
    currentQuickLead.notaDelEvento = nota;
  }

  const results = await Promise.all(ops);
  const queued  = results.some(r => r.queued);

  contactosCache[emailKey] = { ...(contactosCache[emailKey] ?? {}), ...contactoData };
  await refreshAfterEdit();

  setQpStatus(queued ? 'Guardado localmente ↑' : 'Guardado ✓', queued ? '' : 'ok');
  qpSave.disabled = false;
}

qpClose.addEventListener('click', closeQuickPanel);
qpCancel.addEventListener('click', closeQuickPanel);
qpSave.addEventListener('click', saveQuickPanel);

qpQualButtons.addEventListener('click', (e) => {
  const btn = e.target.closest('.qual-btn');
  if (!btn) return;
  setQualSelected(btn.dataset.val === quickQualValue ? '' : btn.dataset.val);
});

// ── Overlay de modales ────────────────────────────────────────────────────────
modalOverlay.addEventListener('click', () => {
  closeEventManager();
  closeNewLead();
});

// ── Teclado global ────────────────────────────────────────────────────────────
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (newLeadModal.classList.contains('is-open'))  { closeNewLead();       return; }
  if (eventManager.classList.contains('is-open'))  { closeEventManager();  return; }
  if (quickPanel.classList.contains('is-open'))    { closeQuickPanel();    return; }
  if (leadPanel.classList.contains('is-open'))     { closePanel();         return; }
});

// ── Guardado resiliente ───────────────────────────────────────────────────────
function loadPendingFromStorage() {
  try {
    pendingQueue = JSON.parse(localStorage.getItem('hablandis_pending') ?? '[]');
  } catch { pendingQueue = []; }
}

function savePendingToStorage() {
  try {
    localStorage.setItem('hablandis_pending', JSON.stringify(pendingQueue));
  } catch { /* cuota llena: no crítico */ }
}

function updateSyncIndicator() {
  const n = pendingQueue.length;
  syncIndicator.hidden      = n === 0;
  syncIndicator.textContent = `↑ ${n} sin sincronizar`;
}

async function resilientSave(op, path, data) {
  const item = {
    id:   `${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
    op,
    path,
    data,
    ts:   new Date().toISOString(),
  };
  pendingQueue.push(item);
  savePendingToStorage();
  updateSyncIndicator();

  try {
    if (op === 'set') {
      await set(ref(db, path), data);
    } else {
      await update(ref(db, path), data);
    }
    pendingQueue = pendingQueue.filter(i => i.id !== item.id);
    savePendingToStorage();
    updateSyncIndicator();
    return { ok: true, queued: false };
  } catch {
    return { ok: false, queued: true };
  }
}

async function syncPending() {
  if (pendingQueue.length === 0) return;
  const snapshot = [...pendingQueue];
  for (const item of snapshot) {
    try {
      if (item.op === 'set') {
        await set(ref(db, item.path), item.data);
      } else {
        await update(ref(db, item.path), item.data);
      }
      pendingQueue = pendingQueue.filter(i => i.id !== item.id);
    } catch {
      break;
    }
  }
  savePendingToStorage();
  updateSyncIndicator();
}

window.addEventListener('online', syncPending);

// ── Fase 4: stats, filtros, export ───────────────────────────────────────────
// Filtra el listado POR PERSONA (sobre personasCache), con los mismos predicados
// que antes razonaban por captura. Un email = una entrada.
function getFilteredPersonas() {
  let personas = personasCache;
  if (appMode === 'evento' && activeEventKey) {
    const ev     = eventosCache[activeEventKey] ?? {};
    const slug   = eventoSlug(ev);
    const nombre = (ev.nombre ?? '').toLowerCase().trim();
    personas = personas.filter(p =>
      (slug && p.eventoSlugs.has(slug)) ||                               // casa por slug (nuevo)
      [...p.eventosRaw].some(e => e.toLowerCase().trim() === nombre));   // o por nombre (legado)
  }
  if (filterCual) {
    if (filterCual === 'sin-definir') {
      personas = personas.filter(p => !p.cualificacion);
    } else if (filterCual === 'enfriandose') {
      personas = personas.filter(p => isCooling(p.ultimoLead, p.contacto));
    } else {
      personas = personas.filter(p => p.cualificacion === filterCual);
    }
  }
  if (filterProp) {
    if (filterProp === 'sin-asignar') {
      personas = personas.filter(p => !p.propietario);
    } else {
      personas = personas.filter(p => p.propietario === filterProp);
    }
  }
  if (filterHoy) {
    const today = new Date().toLocaleDateString('en-CA');
    personas = personas.filter(p => p.fechaProximoPaso === today);
  }
  return personas;
}

function updateStats() {
  if (allRows.length === 0) {
    statsBar.hidden   = true;
    filtersBar.hidden = true;
    return;
  }
  statsBar.hidden   = false;
  filtersBar.hidden = false;

  // Stats POR PERSONA, coherente con el listado. El contador de "calientes" sigue
  // contando solo contactos/cualificacion (ahora deduplicado por persona).
  const today = new Date().toLocaleDateString('en-CA');
  let calientes = 0, sinProp = 0, hoy = 0;
  for (const p of personasCache) {
    if (p.cualificacion === 'caliente') calientes++;
    if (!p.propietario) sinProp++;
    if (p.fechaProximoPaso === today) hoy++;
  }
  statNumTotal.textContent   = personasCache.length;
  statNumCal.textContent     = calientes;
  statNumSinProp.textContent = sinProp;
  statNumHoy.textContent     = hoy;

  const noFilter = !filterCual && !filterProp && !filterHoy;
  statTotal.classList.toggle('active',    noFilter);
  statCalientes.classList.toggle('active', filterCual === 'caliente');
  statSinProp.classList.toggle('active',   filterProp === 'sin-asignar');
  statHoy.classList.toggle('active',       filterHoy);
}

function syncFilterControls() {
  filterCualEl.value = filterCual;
  filterPropEl.value = filterProp;
  filterCualEl.classList.toggle('active', filterCual !== '');
  filterPropEl.classList.toggle('active', filterProp !== '');
  btnClearFilters.hidden = !filterCual && !filterProp && !filterHoy;
}

function applyFilters() {
  syncFilterControls();
  renderTable();
  updateStats();
}

statTotal.addEventListener('click', () => {
  filterCual = ''; filterProp = ''; filterHoy = false;
  applyFilters();
});
statCalientes.addEventListener('click', () => {
  filterCual = filterCual === 'caliente' ? '' : 'caliente';
  applyFilters();
});
statSinProp.addEventListener('click', () => {
  filterProp = filterProp === 'sin-asignar' ? '' : 'sin-asignar';
  applyFilters();
});
statHoy.addEventListener('click', () => {
  filterHoy = !filterHoy;
  applyFilters();
});

filterCualEl.addEventListener('change', () => {
  filterCual = filterCualEl.value;
  applyFilters();
});
filterPropEl.addEventListener('change', () => {
  filterProp = filterPropEl.value;
  applyFilters();
});
btnClearFilters.addEventListener('click', () => {
  filterCual = ''; filterProp = ''; filterHoy = false;
  applyFilters();
});

btnExport.addEventListener('click', () => {
  const sep     = ',';
  const headers = ['Vía','Nombre','Apellidos','Email','Evento','Fecha envío',
                   'Cualificación','Propietario','País','Institución','Nivel',
                   'Próximo paso','Fecha próximo paso','Notas'];
  const todayStr = new Date().toLocaleDateString('en-CA');
  const personas = getFilteredPersonas();   // una fila por persona, vías agrupadas

  const lines = [headers.join(sep)];
  for (const p of personas) {
    const c = p.contacto ?? {};
    const cells = [
      p.vias.map(k => VIA_LABEL[k] || k).join(' · '),
      p.nombre, p.apellidos, p.email,
      p.eventos.join(' · '),
      p.ultimoLead.fecha ? new Date(p.ultimoLead.fecha).toLocaleString('es-ES') : '',
      c.cualificacion    ?? '',
      c.propietario      ?? '',
      c.pais             ?? '',
      c.institucion      ?? '',
      c.nivelEnsenanza   ?? '',
      c.proximoPaso      ?? '',
      c.fechaProximoPaso ?? '',
      c.notas            ?? '',
    ].map(v => `"${String(v).replace(/"/g, '""')}"`);
    lines.push(cells.join(sep));
  }

  const bom  = '﻿';
  const blob = new Blob([bom + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `leads-hablandis-${todayStr}.csv`;
  a.click();
  URL.revokeObjectURL(url);
});

// ── Capa A · comportamiento + cola de contacto ────────────────────────────────
// Rango de urgencia = nivel MÁS ALTO con algún toggle activo (máximo, no suma;
// nunca resta). Alimenta la urgencia, NUNCA la cualificación.
function rangoUrgencia(comp) {
  comp = comp || {};
  for (const grupo of NIVELES_COMPORTAMIENTO) {   // ya ordenados de 3 a 1
    if (grupo.toggles.some(t => comp[t.key] === true)) return grupo.nivel;
  }
  return 0;
}

function rangoBadge(rango) {
  return rango
    ? `<span class="badge-rango n${rango}">Nivel ${rango}</span>`
    : '<span class="badge-rango n0">—</span>';
}

function sealNombre(email) {
  return String(email || '').split('@')[0] || '—';
}

function setCompStatus(msg, type = '') {
  compStatusEl.textContent = msg;
  compStatusEl.className    = 'panel-status comp-status' + (type ? ` ${type}` : '');
}

function renderComportamiento(contacto) {
  const comp  = (contacto && contacto.comportamiento) || {};
  const rango = rangoUrgencia(comp);
  compRangoEl.className   = `badge-rango n${rango}`;
  compRangoEl.textContent = rango ? `Nivel ${rango}` : '—';

  compGruposEl.innerHTML = NIVELES_COMPORTAMIENTO.map(grupo => `
    <div class="comp-grupo">
      <p class="comp-grupo-title">${esc(grupo.titulo)}</p>
      <div class="comp-grupo-toggles">
        ${grupo.toggles.map(t => {
          const on = comp[t.key] === true;
          return `
            <button type="button" class="comp-toggle${on ? ' active' : ''}"
                    data-key="${esc(t.key)}" aria-pressed="${on}">
              <span class="comp-toggle-check" aria-hidden="true">${on ? '✓' : ''}</span>
              <span class="comp-toggle-label">${esc(t.label)}</span>
            </button>`;
        }).join('')}
      </div>
    </div>
  `).join('');

  // Sello a nivel de gestión (quién + cuándo del último toque), como el resto de
  // la edición del panel. Sirve también de recencia para la cola.
  const por = contacto?.actualizadoPor;
  const fch = contacto?.fechaActualizacion;
  compSelloEl.textContent = (por || fch)
    ? `Último toque: ${por ? sealNombre(por) : '—'}${fch ? ' · ' + formatFechaCorta(fch) : ''}`
    : '';

  compGruposEl.querySelectorAll('.comp-toggle').forEach(btn => {
    btn.addEventListener('click', () => toggleComportamiento(btn.dataset.key));
  });
}

// Los toggles son booleanos bajo contactos/<emailKey>/comportamiento/ (aditivo).
// Al marcar/desmarcar se actualiza actualizadoPor + fechaActualizacion, como el
// resto de la edición (sirve de recencia y resetea el aviso de enfriándose).
// NUNCA toca la cualificación.
async function toggleComportamiento(key) {
  if (!currentLead) return;
  const emailKey = emailToKey(currentLead.email);
  const contacto = contactosCache[emailKey] ?? (contactosCache[emailKey] = {});
  const comp     = contacto.comportamiento ?? (contacto.comportamiento = {});
  const turnOn   = comp[key] !== true;
  const por      = auth.currentUser.email;
  const now      = new Date().toISOString();

  if (turnOn) comp[key] = true; else delete comp[key];
  contacto.actualizadoPor     = por;
  contacto.fechaActualizacion = now;

  setCompStatus('Guardando…');
  const result = await resilientSave('update', `contactos/${emailKey}`, {
    [`comportamiento/${key}`]: turnOn ? true : null,
    actualizadoPor:     por,
    fechaActualizacion: now,
  });

  renderComportamiento(contacto);
  await refreshAfterEdit();   // la recencia/enfriándose/urgencia puede haber cambiado
  setCompStatus(result.queued ? 'Guardado localmente ↑' : 'Guardado ✓', result.queued ? '' : 'ok');
}

// ── Vía de entrada (lista cerrada) en la ficha ────────────────────────────────
function setViaStatus(msg, type = '') {
  viaStatusEl.textContent = msg;
  viaStatusEl.className    = 'panel-status' + (type ? ` ${type}` : '');
}

// Pinta los chips de vía de la persona abierta. Las DERIVADAS de sus capturas
// (hoy 'taller') salen marcadas y bloqueadas ("automática", no se quitan a mano);
// el resto son toggles manuales leídos de contacto.vias.
function renderVias(contacto) {
  const derivadas = currentLead ? viasDerivadasDeEmail(currentLead.email) : new Set();
  const manual    = (contacto && contacto.vias) || {};

  panelViasEl.innerHTML = VIAS.map(v => {
    const auto = derivadas.has(v.key);
    const on   = auto || manual[v.key] === true;
    const lock = auto ? ' is-auto' : '';
    return `
      <button type="button" class="via-toggle${on ? ' active' : ''}${lock}"
              data-key="${esc(v.key)}" aria-pressed="${on}"
              ${auto ? 'disabled title="Automática (viene de una captura)"' : ''}>
        <span class="via-toggle-check" aria-hidden="true">${on ? '✓' : ''}</span>
        <span class="via-toggle-label">${esc(v.label)}${auto ? ' · auto' : ''}</span>
      </button>`;
  }).join('');

  panelViasEl.querySelectorAll('.via-toggle:not(.is-auto)').forEach(btn => {
    btn.addEventListener('click', () => toggleVia(btn.dataset.key));
  });
}

// Las vías manuales son booleanos bajo contactos/<emailKey>/vias/ (aditivo, como
// los toggles de comportamiento). Sella actualizadoPor + fechaActualizacion. No
// toca campos crudos del formulario ni la cualificación.
async function toggleVia(key) {
  if (!currentLead || !VIAS_KEYS.has(key)) return;
  const emailKey = emailToKey(currentLead.email);
  const contacto = contactosCache[emailKey] ?? (contactosCache[emailKey] = {});
  const vias     = contacto.vias ?? (contacto.vias = {});
  const turnOn   = vias[key] !== true;
  const por      = auth.currentUser.email;
  const now      = new Date().toISOString();

  if (turnOn) vias[key] = true; else delete vias[key];
  contacto.actualizadoPor     = por;
  contacto.fechaActualizacion = now;

  setViaStatus('Guardando…');
  const result = await resilientSave('update', `contactos/${emailKey}`, {
    [`vias/${key}`]: turnOn ? true : null,
    actualizadoPor:     por,
    fechaActualizacion: now,
  });

  renderVias(contacto);
  await refreshAfterEdit();
  setViaStatus(result.queued ? 'Guardado localmente ↑' : 'Guardado ✓', result.queued ? '' : 'ok');
}

// ── Fase 2.5: señales de la IA sobre las notas ────────────────────────────────

// Hash SHA-256 (hex) del texto analizado. Sirve para detectar si la nota cambió
// desde el último análisis (sugerencia obsoleta) y para gatear la frescura de la
// intención temporal en la cola. crypto.subtle existe en contexto seguro
// (https + localhost/127.0.0.1), que es como se sirve esta app.
async function hashNota(text) {
  const data = new TextEncoder().encode(String(text || '').trim());
  const buf  = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

function setAnalizarStatus(msg, type = '') {
  analizarStatus.textContent = msg;
  analizarStatus.className    = 'panel-status' + (type ? ` ${type}` : '');
}

// Llama al proxy con la nota + contexto y guarda el JSON de señales TAL CUAL llega
// bajo contactos/<emailKey>/senales/, añadiendo solo notaHash y fechaAnalisis.
// No toca la cualificación ni ningún otro campo del contacto.
async function analizarNota() {
  if (!currentLead) return;
  const emailKey = emailToKey(currentLead.email);
  const nota     = panelForm['notas'].value.trim();
  if (!nota) {
    setAnalizarStatus('Escribe una nota antes de analizar.', 'err');
    return;
  }

  setAnalizarStatus('Analizando…');
  btnAnalizar.disabled = true;

  try {
    const token = await auth.currentUser.getIdToken();
    const res = await fetch(PROXY_ANALIZAR_URL, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        nota,
        pais:           panelForm['pais'].value.trim(),
        nivelEnsenanza: panelForm['nivelEnsenanza'].value,
        institucion:    panelForm['institucion'].value.trim(),
      }),
    });
    if (!res.ok) throw new Error(`proxy ${res.status}`);

    const senales = await res.json();
    // Dos campos que ponemos NOSOTROS (no el modelo). El resto se guarda intacto.
    senales.notaHash     = await hashNota(nota);
    senales.fechaAnalisis = new Date().toISOString();

    // Guarda exactamente lo que devolvió el proxy (+ los dos campos nuestros).
    // 'set' sobre la subruta senales/ la reemplaza entera sin tocar el resto.
    const contacto = contactosCache[emailKey] ?? (contactosCache[emailKey] = {});
    contacto.senales = senales;
    const result = await resilientSave('set', `contactos/${emailKey}/senales`, senales);

    renderSugerencia(contacto);
    maybeRefreshCola();   // la intención temporal de la cola puede haber cambiado
    setAnalizarStatus(result.queued ? 'Guardado localmente ↑' : 'Análisis listo ✓',
                      result.queued ? '' : 'ok');
  } catch (err) {
    console.warn('analizarNota', err);
    setAnalizarStatus('No se pudo analizar la nota ahora. Inténtalo de nuevo.', 'err');
  } finally {
    btnAnalizar.disabled = false;
  }
}

// Pinta la tarjeta con la sugerencia guardada en contactos/<emailKey>/senales/.
// Lee cualificacionSugerida, confianza, justificacion y accionSugerida tal como
// llegan del proxy. Reglas:
//   · si cualificacionManual ya es true → informa, pero NO propone cambio.
//   · si la nota cambió desde el análisis (hash distinto) → marca obsoleta y
//     ofrece "Reanalizar".
//   · resto → botones "Aplicar" / "Ignorar".
async function renderSugerencia(contacto) {
  const sug = contacto?.senales;
  if (!sug || !sug.cualificacionSugerida) {
    sugSectionEl.hidden = true;
    return;
  }

  // El hash se compara contra la nota actual del formulario (async). Guardamos a
  // qué ficha pertenece para no pintar si el usuario cambió de lead durante el await.
  const emailKey   = currentLead ? emailToKey(currentLead.email) : null;
  const notaActual = panelForm['notas'].value.trim();
  const hashActual = notaActual ? await hashNota(notaActual) : '';
  if (!currentLead || emailToKey(currentLead.email) !== emailKey) return;

  const obsoleta = !!(sug.notaHash && hashActual && sug.notaHash !== hashActual);
  const manual   = contacto?.cualificacionManual === true;

  sugSectionEl.hidden = false;

  const conf = sug.confianza != null && sug.confianza !== ''
    ? esc(String(sug.confianza)) : '—';

  let avisos = '';
  if (obsoleta) {
    avisos += `<p class="sug-aviso desactualizada">⚠ La nota cambió desde el último análisis. La sugerencia está desactualizada.</p>`;
  }
  if (manual) {
    avisos += `<p class="sug-aviso manual">La cualificación está fijada a mano; la sugerencia no la modifica.</p>`;
  }

  let botones = '';
  if (obsoleta) {
    botones = `<button type="button" id="sug-reanalizar" class="btn-panel-save">Reanalizar</button>`;
  } else if (!manual) {
    botones = `
      <button type="button" id="sug-aplicar" class="btn-panel-save">Aplicar</button>
      <button type="button" id="sug-ignorar" class="btn-panel-cancel">Ignorar</button>`;
  }

  sugCardEl.innerHTML = `
    <div class="sug-head">
      ${cualificacionBadge(sug.cualificacionSugerida, false)}
      <span class="sug-conf">Confianza: ${conf}</span>
    </div>
    ${sug.justificacion ? `<p class="sug-just">${esc(sug.justificacion)}</p>` : ''}
    ${sug.accionSugerida ? `<p class="sug-accion"><strong>Acción sugerida:</strong> ${esc(sug.accionSugerida)}</p>` : ''}
    ${avisos}
    ${botones ? `<div class="sug-botones">${botones}</div>` : ''}
  `;

  document.getElementById('sug-aplicar')?.addEventListener('click', aplicarSugerencia);
  document.getElementById('sug-ignorar')?.addEventListener('click', ignorarSugerencia);
  document.getElementById('sug-reanalizar')?.addEventListener('click', analizarNota);
}

// "Aplicar": copia cualificacionSugerida → cualificacion y fija cualificacionManual.
// La sugerencia NUNCA pisa un manual previo (renderSugerencia ya oculta el botón
// si manual es true). Sella actualizadoPor/fechaActualizacion como cualquier edición.
async function aplicarSugerencia() {
  if (!currentLead) return;
  const emailKey = emailToKey(currentLead.email);
  const contacto = contactosCache[emailKey] ?? (contactosCache[emailKey] = {});
  const cual     = contacto?.senales?.cualificacionSugerida;
  if (!cual) return;

  const por = auth.currentUser.email;
  const now = new Date().toISOString();

  contacto.cualificacion       = cual;
  contacto.cualificacionManual = true;
  contacto.actualizadoPor      = por;
  contacto.fechaActualizacion  = now;

  setAnalizarStatus('Aplicando…');
  const result = await resilientSave('update', `contactos/${emailKey}`, {
    cualificacion:       cual,
    cualificacionManual: true,
    actualizadoPor:      por,
    fechaActualizacion:  now,
  });

  // Refleja en el formulario abierto y en la tabla/stats/cola.
  panelForm['cualificacion'].value = cual;
  await refreshAfterEdit();
  renderSugerencia(contacto);   // ahora mostrará el aviso "fijada a mano"

  setAnalizarStatus(result.queued ? 'Guardado localmente ↑' : 'Aplicado ✓',
                    result.queued ? '' : 'ok');
}

// "Ignorar": descarta la tarjeta de la vista. Deja senales/ guardado (sin aplicar);
// reaparece si se reabre la ficha.
function ignorarSugerencia() {
  sugSectionEl.hidden = true;
}

// Una entrada por persona (dedup por email): la cualificación y el próximo paso
// viven por persona en contactos/. allRows ya viene ordenado por fecha desc, así
// que el primer lead visto de cada email es el más reciente.
// Construye TODAS las personas (dedup por email), cada una con su conjunto de
// vías (derivadas de sus capturas ∪ manuales) y los campos que necesitan tanto el
// listado como la cola. NO filtra el frío aquí: el listado los muestra; la cola
// los excluye después (la cualificación manda sobre el número).
async function buildPersonas() {
  const map = new Map();
  for (const r of allRows) {
    if (!r.email) continue;
    const k = r.email.toLowerCase();
    if (!map.has(k)) {
      const contacto = contactosCache[emailToKey(r.email)] ?? {};
      map.set(k, {
        email:            r.email,
        nombre:           r.nombre,
        apellidos:        r.apellidos,
        contacto,
        cualificacion:    contacto.cualificacion    ?? '',
        propietario:      contacto.propietario      ?? '',
        fechaProximoPaso: contacto.fechaProximoPaso ?? '',
        rango:            rangoUrgencia(contacto.comportamiento),
        recencia:         contacto.fechaActualizacion || r.fecha || '',
        ultimoLead:       r,
        eventos:          [],
        eventoSlugs:      new Set(),   // slugs de sus capturas (para agrupar por evento)
        eventosRaw:       new Set(),   // evento_origen legado (fallback de agrupación)
        viasSet:          new Set(),
      });
    }
    const p = map.get(k);
    if (r.evento && r.evento !== '—' && !p.eventos.includes(r.evento)) p.eventos.push(r.evento);
    if (r.eventoSlug) p.eventoSlugs.add(r.eventoSlug);
    if (r.eventoRaw)  p.eventosRaw.add(r.eventoRaw);
    const vd = viaDerivada(r.tallerId);
    if (vd) p.viasSet.add(vd);
  }

  const personas = [...map.values()];
  for (const p of personas) {
    p.vias = viasDePersona(p.viasSet, p.contacto);   // derivadas ∪ manuales, ordenadas
  }

  // Precomputa la intención temporal de cada persona ya gateada por frescura
  // (el hash es async, así que no cabe en el comparador síncrono compararCola).
  await Promise.all(personas.map(async p => {
    p.intencion = await intencionTemporalFresca(p.contacto);
  }));

  return personas;
}

async function rebuildPersonas() {
  personasCache = await buildPersonas();
}

// Intención temporal declarada (Fase 2.5), leída de senales/contexto/intencionTemporal:
// concreta > vaga > ninguna. Devuelve 2 / 1 / 0.
// Degradación: se usa la señal SOLO si no está obsoleta — el hash de la nota
// analizada (senales.notaHash) debe coincidir con el hash de la nota actual. Si no
// hay señales, no hay hash, la nota cambió o el hash falla, devuelve 0 y este paso
// del orden se salta solo (no rompe).
async function intencionTemporalFresca(contacto) {
  const v     = contacto?.senales?.contexto?.intencionTemporal;
  const score = v === 'concreta' ? 2 : v === 'vaga' ? 1 : 0;
  if (score === 0) return 0;

  const storedHash = contacto?.senales?.notaHash;
  const nota       = (contacto?.notas || '').trim();
  if (!storedHash || !nota) return 0;   // sin hash o sin nota → no fiable → degradar

  try {
    const actual = await hashNota(nota);
    return actual === storedHash ? score : 0;   // obsoleta → degradar
  } catch {
    return 0;
  }
}

// Orden en cascada: cualificación → rango de urgencia → intención temporal (si
// existe y está fresca, precomputada en buildPersonas) → recencia.
function compararCola(a, b) {
  const ca = PESO_CUALIFICACION[a.cualificacion] ?? 2;
  const cb = PESO_CUALIFICACION[b.cualificacion] ?? 2;
  if (ca !== cb) return ca - cb;
  if (a.rango !== b.rango) return b.rango - a.rango;
  const ia = a.intencion ?? 0;
  const ib = b.intencion ?? 0;
  if (ia !== ib) return ib - ia;
  return (b.recencia || '').localeCompare(a.recencia || '');
}

function colaItemHtml(p) {
  const nombre   = [p.nombre, p.apellidos].filter(x => x && x !== '—').join(' ') || p.email;
  const fechaStr = p.fechaProximoPaso ? formatFechaCorta(p.fechaProximoPaso) : 'sin fecha';
  return `
    <li class="cola-item" data-taller="${esc(p.ultimoLead.tallerId)}"
        data-key="${esc(p.ultimoLead.pushKey)}" title="Abrir ficha">
      <div class="cola-item-main">
        <span class="cola-nombre">${esc(nombre)}</span>
        <span class="cola-eventos">${esc(p.eventos.join(' · ') || '—')}</span>
      </div>
      <div class="cola-item-meta">
        ${cualificacionBadge(p.cualificacion, false)}
        ${rangoBadge(p.rango)}
        <span class="cola-fecha">${esc(fechaStr)}</span>
      </div>
    </li>`;
}

// Domingo (fin) de la semana natural en curso, en formato 'YYYY-MM-DD'.
// "Esta semana" = próximo paso vencido o con fecha hasta este domingo inclusive.
function finSemanaISO() {
  const d   = new Date();
  const dow = (d.getDay() + 6) % 7;        // 0 = lunes … 6 = domingo
  d.setDate(d.getDate() + (6 - dow));      // avanza hasta el domingo
  return d.toLocaleDateString('en-CA');
}

async function renderCola() {
  // El frío NUNCA entra en la cola (la cualificación manda sobre el número).
  const personas    = (await buildPersonas()).filter(p => p.cualificacion !== 'frio');
  const finDeSemana = finSemanaISO();

  const buckets = { semana: [], triage: [], madurando: [] };
  for (const p of personas) {
    const f = p.fechaProximoPaso;
    if (!f)                    buckets.triage.push(p);     // sin fecha → triaje
    else if (f <= finDeSemana) buckets.semana.push(p);     // vencida o dentro de esta semana
    else                       buckets.madurando.push(p);  // futuro, tras esta semana
  }
  // El comparador en cascada ordena los dos cubos accionables; "Madurando" se
  // ordena por su fecha (lo que antes vuelve, antes aparece).
  buckets.semana.sort(compararCola);
  buckets.triage.sort(compararCola);
  buckets.madurando.sort((a, b) =>
    (a.fechaProximoPaso || '').localeCompare(b.fechaProximoPaso || ''));

  const defs = [
    { key: 'semana',    titulo: 'Esta semana',        sub: 'Próximo paso vencido o dentro de esta semana' },
    { key: 'triage',    titulo: 'Sin fecha · triaje', sub: 'Sin próximo paso — ponle fecha' },
    { key: 'madurando', titulo: 'Madurando',          sub: 'Próximo paso más adelante' },
  ];

  colaView.innerHTML = defs.map(d => `
    <section class="cola-bucket cola-${d.key}">
      <header class="cola-bucket-head">
        <h3 class="cola-bucket-title">${d.titulo} <span class="cola-bucket-count">${buckets[d.key].length}</span></h3>
        <p class="cola-bucket-sub">${d.sub}</p>
      </header>
      <ul class="cola-list">
        ${buckets[d.key].length === 0
          ? '<li class="cola-empty">Nadie por ahora.</li>'
          : buckets[d.key].map(colaItemHtml).join('')}
      </ul>
    </section>
  `).join('');

  colaView.querySelectorAll('.cola-item').forEach(li => {
    li.addEventListener('click', () => {
      const lead = allRows.find(r =>
        r.tallerId === li.dataset.taller && r.pushKey === li.dataset.key);
      if (lead) openPanel(lead);
    });
  });

  leadsCount.textContent = `${personas.length} en cola`;
}

function maybeRefreshCola() {
  if (appMode === 'cola') renderCola();
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function emailToKey(email) {
  return String(email).toLowerCase().replace(/\./g, ',');
}

function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatFecha(str) {
  if (!str) return '—';
  const d = new Date(str);
  if (isNaN(d)) return esc(str);
  return d.toLocaleString('es-ES', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function formatFechaCorta(str) {
  if (!str) return '—';
  const d = new Date(str);
  if (isNaN(d)) return esc(str);
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function isCooling(lead, contacto) {
  if (contacto?.cualificacionManual === true) return false;
  const refStr = contacto?.fechaActualizacion ?? lead.fecha;
  if (!refStr) return false;
  const days = (Date.now() - new Date(refStr).getTime()) / 86_400_000;
  return days > 30;
}

function cualificacionBadge(cual, cooling) {
  if (cooling && !cual) return '<span class="badge-cal enfriandose">Enfriándose</span>';
  if (!cual)            return '<span class="badge-cal vacio">—</span>';
  const labels = { frio: 'Frío', templado: 'Templado', caliente: 'Caliente' };
  return `<span class="badge-cal ${esc(cual)}">${esc(labels[cual] ?? cual)}</span>`;
}
