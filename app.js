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

// ── DOM refs — tabla ──────────────────────────────────────────────────────────
const leadsStatus = document.getElementById('leads-status');
const leadsTable  = document.getElementById('leads-table');
const leadsTbody  = document.getElementById('leads-tbody');
const leadsCount  = document.getElementById('leads-count');

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
const newLeadModal  = document.getElementById('new-lead-modal');
const nlClose       = document.getElementById('nl-close');
const nlEventoLabel = document.getElementById('nl-evento-label');
const nlForm        = document.getElementById('nl-form');
const nlError       = document.getElementById('nl-error');
const nlStatus      = document.getElementById('nl-status');

// ── Estado ────────────────────────────────────────────────────────────────────
let allRows        = [];
let contactosCache = {};
let eventosCache   = {};
let currentLead    = null;
let lastFocusedEl  = null;
let appMode        = 'repaso';   // 'repaso' | 'evento'
let activeEventKey = null;
let currentQuickLead = null;
let quickQualValue   = '';
let pendingQueue   = [];

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
          allRows.push({
            tallerId,
            pushKey:       leadSnap.key,
            nombre:        d.nombre        ?? '—',
            apellidos:     d.apellidos     ?? '—',
            email:         d.email         ?? '',
            evento:        d.evento_origen ?? '—',
            fecha:         d.fecha_envio   ?? '',
            notaDelEvento: d.gestion?.notaDelEvento ?? '',
          });
        });
      });
      allRows.sort((a, b) => b.fecha.localeCompare(a.fecha));
    }

    if (allRows.length === 0) {
      leadsStatus.textContent = 'No hay leads todavía.';
      leadsStatus.hidden      = false;
    } else {
      leadsCount.textContent = `${allRows.length} lead${allRows.length !== 1 ? 's' : ''}`;
      leadsStatus.hidden = true;
      leadsTable.hidden  = false;
      renderTable();
    }

  } catch (err) {
    leadsStatus.textContent = 'Error al cargar. Recarga la página.';
    leadsStatus.hidden      = false;
    console.error(err);
  }
}

// ── Tabla ─────────────────────────────────────────────────────────────────────
function renderTable() {
  leadsTbody.innerHTML = '';

  let rows = allRows;
  if (appMode === 'evento' && activeEventKey) {
    const nombre = (eventosCache[activeEventKey]?.nombre ?? '').toLowerCase().trim();
    rows = allRows.filter(r => r.evento.toLowerCase().trim() === nombre);
  }

  if (rows.length === 0 && appMode === 'evento' && activeEventKey) {
    leadsTbody.innerHTML = `<tr><td colspan="8" class="table-empty">
      Sin leads para este evento. Usa <strong>+ Nuevo lead</strong> para añadir el primero.
    </td></tr>`;
    return;
  }

  rows.forEach((r) => {
    const emailKey = emailToKey(r.email);
    const contacto = contactosCache[emailKey] ?? {};
    const cooling  = isCooling(r, contacto);

    const tr = document.createElement('tr');
    tr.dataset.taller = r.tallerId;
    tr.dataset.key    = r.pushKey;
    tr.title          = 'Abrir ficha';
    tr.innerHTML = `
      <td><span class="badge-taller">${esc(r.tallerId)}</span></td>
      <td>${esc(r.nombre)}</td>
      <td>${esc(r.apellidos)}</td>
      <td><a href="mailto:${esc(r.email)}">${esc(r.email)}</a></td>
      <td>${esc(r.evento)}</td>
      <td>${formatFecha(r.fecha)}</td>
      <td>${cualificacionBadge(contacto.cualificacion, cooling)}</td>
      <td>${esc(contacto.propietario || '—')}</td>
    `;
    tr.addEventListener('click', (e) => {
      if (e.target.closest('a')) return;
      if (appMode === 'evento') {
        openQuickPanel(r);
      } else {
        openPanel(r);
      }
    });
    leadsTbody.appendChild(tr);
  });
}

function refreshRowCells(lead) {
  const tr = leadsTbody.querySelector(
    `tr[data-taller="${CSS.escape(lead.tallerId)}"][data-key="${CSS.escape(lead.pushKey)}"]`
  );
  if (!tr) return;
  const contacto = contactosCache[emailToKey(lead.email)] ?? {};
  const cooling  = isCooling(lead, contacto);
  tr.cells[6].innerHTML   = cualificacionBadge(contacto.cualificacion, cooling);
  tr.cells[7].textContent = contacto.propietario || '—';
}

// ── Modo evento ───────────────────────────────────────────────────────────────
function setMode(mode) {
  appMode = mode;
  if (mode === 'evento') {
    eventoBar.hidden = false;
    btnModo.classList.add('active');
    btnModo.textContent = '← Modo repaso';
  } else {
    eventoBar.hidden = true;
    btnModo.classList.remove('active');
    btnModo.textContent = 'Modo evento';
    activeEventKey  = null;
    eventoSelect.value = '';
  }
  renderTable();
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

btnModo.addEventListener('click', () => setMode(appMode === 'repaso' ? 'evento' : 'repaso'));
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

function renderEventoList() {
  const entries = Object.entries(eventosCache);
  if (entries.length === 0) {
    emList.innerHTML = '<li class="em-empty">No hay eventos todavía. Añade el primero abajo.</li>';
    return;
  }
  entries.sort((a, b) => (b[1].fecha ?? '').localeCompare(a[1].fecha ?? ''));
  emList.innerHTML = entries.map(([, ev]) => `
    <li>
      <div>
        <span class="em-evento-nombre">${esc(ev.nombre)}</span>
        <span class="em-evento-meta">${ev.ciudad ? esc(ev.ciudad) + ' · ' : ''}${ev.fecha ? formatFechaCorta(ev.fecha) : ''}</span>
      </div>
    </li>
  `).join('');
}

emForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const nombre = emForm['nombre'].value.trim();
  if (!nombre) return;

  const newKey    = push(ref(db, 'eventos')).key;
  const eventoData = {
    nombre,
    fecha:     emForm['fecha'].value,
    ciudad:    emForm['ciudad'].value.trim(),
    creadoPor: auth.currentUser.email,
  };

  emStatus.textContent = 'Guardando…';
  emStatus.className   = 'panel-status';

  const result = await resilientSave('set', `eventos/${newKey}`, eventoData);

  eventosCache[newKey] = eventoData;
  populateEventoSelect();
  renderEventoList();
  emForm.reset();

  emStatus.textContent = result.queued ? 'Guardado localmente ↑' : 'Añadido ✓';
  emStatus.className   = result.queued ? 'panel-status' : 'panel-status ok';
});

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
  const newKey = push(ref(db, 'leads/mesa')).key;
  const leadData = {
    nombre,
    apellidos:      nlForm['apellidos'].value.trim(),
    email,
    evento_origen:  ev?.nombre ?? '',
    fecha_envio:    new Date().toISOString(),
    consentimiento: true,
    canal:          'mesa',
    origen:         'panel',
  };
  const notaInicial = nlForm['nota'].value.trim();

  nlStatus.textContent = 'Guardando…';
  const ops = [resilientSave('set', `leads/mesa/${newKey}`, leadData)];
  if (notaInicial) {
    ops.push(resilientSave('update', `leads/mesa/${newKey}/gestion`, { notaDelEvento: notaInicial }));
  }
  await Promise.all(ops);

  const newRow = {
    tallerId:      'mesa',
    pushKey:       newKey,
    nombre:        leadData.nombre    || '—',
    apellidos:     leadData.apellidos || '—',
    email:         leadData.email     || '',
    evento:        leadData.evento_origen || '—',
    fecha:         leadData.fecha_envio,
    notaDelEvento: notaInicial,
  };
  allRows.unshift(newRow);
  leadsCount.textContent = `${allRows.length} lead${allRows.length !== 1 ? 's' : ''}`;

  if (leadsTable.hidden) {
    leadsStatus.hidden = true;
    leadsTable.hidden  = false;
  }
  renderTable();
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
  allRows
    .filter(r => r.email.toLowerCase() === currentLead.email.toLowerCase())
    .forEach(r => refreshRowCells(r));

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
  allRows
    .filter(r => r.email.toLowerCase() === currentQuickLead.email.toLowerCase())
    .forEach(r => refreshRowCells(r));

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
