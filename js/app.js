
/* ══════════════════════════════════════════════════════════════
   1. PRESETS  (9 total: 3 ODE + 6 PDE)
   ══════════════════════════════════════════════════════════════ */
const PRESETS = [
  {
    id:       'exp-decay',
    name:     'Exponential Decay',
    type:     'ODE',
    equation: 'u_t + lambda * u = 0',
    domain:   { t: [0, 3] },
    params:   { lambda: 1 },
    bcs: [
      { quantity: 'u', fixedVar: 't', fixedVal: 0, expression: '1' },
    ],
    description: 'Classic ODE: u(t) = e^{-λt}',
    // Known analytical solution for overlay
    exactFn: (params) => (t) => Math.exp(-(params.lambda ?? 1) * t),
  },
  {
    id:       'harmonic',
    name:     'Harmonic Oscillator',
    type:     'ODE',
    equation: 'u_tt + omega * omega * u = 0',
    domain:   { t: [0, 2 * Math.PI] },
    params:   { omega: 1 },
    bcs: [
      { quantity: 'u',   fixedVar: 't', fixedVal: 0, expression: '1' },
      { quantity: 'u_t', fixedVar: 't', fixedVal: 0, expression: '0' },
    ],
    description: 'u(t) = cos(ωt)',
    exactFn: (params) => (t) => Math.cos((params.omega ?? 1) * t),
  },
  {
    id:       'logistic',
    name:     'Logistic Growth',
    type:     'ODE',
    equation: 'u_t - r * u * (1 - u / K) = 0',
    domain:   { t: [0, 10] },
    params:   { r: 1, K: 1 },
    bcs: [
      { quantity: 'u', fixedVar: 't', fixedVal: 0, expression: '0.1' },
    ],
    description: 'Logistic equation: population dynamics',
    // u(t) = K / (1 + ((K-u0)/u0)*exp(-r*t)), u0=0.1
    exactFn: (params) => (t) => {
      const K = params.K ?? 1, r = params.r ?? 1, u0 = 0.1;
      return K / (1 + ((K - u0) / u0) * Math.exp(-r * t));
    },
  },
  {
    id:       'heat',
    name:     'Heat Equation',
    type:     'PDE',
    equation: 'u_t - alpha * u_xx = 0',
    domain:   { x: [0, 1], t: [0, 1] },
    params:   { alpha: 0.01 },
    bcs: [
      { quantity: 'u', fixedVar: 'x', fixedVal: 0,   expression: '0' },
      { quantity: 'u', fixedVar: 'x', fixedVal: 1,   expression: '0' },
      { quantity: 'u', fixedVar: 't', fixedVal: 0,   expression: 'sin(pi * x)' },
    ],
    description: '∂u/∂t = α ∂²u/∂x²',
  },
  {
    id:       'burgers',
    name:     "Burgers' Equation",
    type:     'PDE',
    equation: 'u_t + u * u_x - nu * u_xx = 0',
    domain:   { x: [-1, 1], t: [0, 1] },
    params:   { nu: 0.01 },
    bcs: [
      { quantity: 'u', fixedVar: 'x', fixedVal: -1, expression: '0' },
      { quantity: 'u', fixedVar: 'x', fixedVal:  1, expression: '0' },
      { quantity: 'u', fixedVar: 't', fixedVal:  0, expression: '-sin(pi * x)' },
    ],
    description: 'Nonlinear convection-diffusion',
  },
  {
    id:       'wave',
    name:     'Wave Equation',
    type:     'PDE',
    equation: 'u_tt - c * c * u_xx = 0',
    domain:   { x: [0, 1], t: [0, 1] },
    params:   { c: 1 },
    bcs: [
      { quantity: 'u',   fixedVar: 'x', fixedVal: 0, expression: '0' },
      { quantity: 'u',   fixedVar: 'x', fixedVal: 1, expression: '0' },
      { quantity: 'u',   fixedVar: 't', fixedVal: 0, expression: 'sin(pi * x)' },
      { quantity: 'u_t', fixedVar: 't', fixedVal: 0, expression: '0' },
    ],
    description: '∂²u/∂t² = c² ∂²u/∂x²',
  },
  {
    id:       'helmholtz',
    name:     'Helmholtz Equation',
    type:     'PDE',
    equation: 'u_xx + u_yy + k * k * u = 0',
    domain:   { x: [0, 1], y: [0, 1] },
    params:   { k: Math.PI },
    bcs: [
      { quantity: 'u', fixedVar: 'x', fixedVal: 0, expression: '0' },
      { quantity: 'u', fixedVar: 'x', fixedVal: 1, expression: '0' },
      { quantity: 'u', fixedVar: 'y', fixedVal: 0, expression: 'sin(pi * x)' },
      { quantity: 'u', fixedVar: 'y', fixedVal: 1, expression: '-sin(pi * x)' },
    ],
    description: '∇²u + k²u = 0 (2D steady state)',
  },
  {
    id:       'allen-cahn',
    name:     'Allen-Cahn',
    type:     'PDE',
    equation: 'u_t - eps * u_xx + u * u * u - u = 0',
    domain:   { x: [-1, 1], t: [0, 1] },
    params:   { eps: 0.001 },
    bcs: [
      { quantity: 'u', fixedVar: 'x', fixedVal: -1, expression: '-1' },
      { quantity: 'u', fixedVar: 'x', fixedVal:  1, expression: '1' },
      { quantity: 'u', fixedVar: 't', fixedVal:  0, expression: 'x * x * x - x' },
    ],
    description: 'Phase-field interface equation',
  },
  {
    id:       'poisson',
    name:     'Poisson Equation',
    type:     'PDE',
    equation: 'u_xx + u_yy + 2 * pi * pi * sin(pi * x) * sin(pi * y) = 0',
    domain:   { x: [0, 1], y: [0, 1] },
    params:   {},
    bcs: [
      { quantity: 'u', fixedVar: 'x', fixedVal: 0, expression: '0' },
      { quantity: 'u', fixedVar: 'x', fixedVal: 1, expression: '0' },
      { quantity: 'u', fixedVar: 'y', fixedVal: 0, expression: '0' },
      { quantity: 'u', fixedVar: 'y', fixedVal: 1, expression: '0' },
    ],
    description: '−∇²u = f(x,y), exact: sin(πx)sin(πy)',
  },
];

/* ══════════════════════════════════════════════════════════════
   2. AppState — encapsulated mutable state (replaces bare globals)
   ══════════════════════════════════════════════════════════════ */
const AppState = {
  pinnInstance:   null,
  trainingState:  'idle',     // 'idle' | 'running' | 'paused' | 'done'
  currentEqType:  'unknown',
  plotMode:       'heatmap',  // 'heatmap' | 'surface'
  activePresetId: null,       // ID of currently loaded preset
};

// Keep legacy variable aliases for backward-compat with inline event handlers
Object.defineProperty(window, 'pinnInstance',  { get: () => AppState.pinnInstance,  set: v => { AppState.pinnInstance  = v; } });
Object.defineProperty(window, 'trainingState', { get: () => AppState.trainingState, set: v => { AppState.trainingState = v; } });
Object.defineProperty(window, 'currentEqType', { get: () => AppState.currentEqType, set: v => { AppState.currentEqType = v; } });
Object.defineProperty(window, 'plotMode',      { get: () => AppState.plotMode,      set: v => { AppState.plotMode      = v; } });

/* ══════════════════════════════════════════════════════════════
   3. DOM helpers
   ══════════════════════════════════════════════════════════════ */
const $ = id => document.getElementById(id);
const toast = (msg, type = 'info', duration = 3000) => {
  const container = $('toastContainer');
  if (!container) {
    // Fallback when toast container is not in DOM (e.g. non-solver pages)
    const level = type === 'error' ? 'error' : type === 'success' ? 'log' : 'info';
    console[level]('[PINNsolver]', msg);
    return;
  }
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.setAttribute('role', 'status');
  el.setAttribute('aria-live', 'polite');
  el.innerHTML = `<span>${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</span> ${msg}`;
  container.appendChild(el);
  setTimeout(() => el.remove(), duration);
};

/* ══════════════════════════════════════════════════════════════
   localStorage helpers — persist/restore solver config
   ══════════════════════════════════════════════════════════════ */
const LS_KEY = 'pinnsolver_config_v1';

function saveConfigToStorage() {
  try {
    const cfg = {
      equation:   $('eqInput')?.value || '',
      domain: {
        xMin: $('xMin')?.value, xMax: $('xMax')?.value,
        tMin: $('tMin')?.value, tMax: $('tMax')?.value,
        yMin: $('yMin')?.value, yMax: $('yMax')?.value,
      },
      params: collectParams(),
      bcs:    collectBCs(),
      netLayers:    $('netLayers')?.value,
      netNeurons:   $('netNeurons')?.value,
      netActivation:$('netActivation')?.value,
      netLr:        $('netLr')?.value,
      lrDecay:      $('lrDecay')?.value,
      physicsWeight:$('physicsWeight')?.value,
      bcWeight:     $('bcWeight')?.value,
      trainEpochs:  $('trainEpochs')?.value,
      trainNf:      $('trainNf')?.value,
      updateEvery:  $('updateEvery')?.value,
      useFourier:   $('useFourier')?.checked,
      activePreset: AppState.activePresetId,
    };
    localStorage.setItem(LS_KEY, JSON.stringify(cfg));
  } catch(e) { /* quota exceeded or private mode — silently ignore */ }
}

function restoreConfigFromStorage() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return false;
    const cfg = JSON.parse(raw);

    if (cfg.equation && $('eqInput')) {
      $('eqInput').value = cfg.equation;
      $('eqInput').dispatchEvent(new Event('input'));
    }
    const d = cfg.domain || {};
    if ($('xMin') && d.xMin != null) $('xMin').value = d.xMin;
    if ($('xMax') && d.xMax != null) $('xMax').value = d.xMax;
    if ($('tMin') && d.tMin != null) $('tMin').value = d.tMin;
    if ($('tMax') && d.tMax != null) $('tMax').value = d.tMax;
    if ($('yMin') && d.yMin != null) $('yMin').value = d.yMin;
    if ($('yMax') && d.yMax != null) $('yMax').value = d.yMax;

    const tbody = $('paramTableBody');
    if (tbody && cfg.params) {
      tbody.innerHTML = '';
      Object.entries(cfg.params).forEach(([k, v]) => addParamRow(k, v));
    }
    if (cfg.bcs) { clearBCTable(); cfg.bcs.forEach(bc => addBCRow(bc)); }

    if ($('netLayers')    && cfg.netLayers)    $('netLayers').value    = cfg.netLayers;
    if ($('netNeurons')   && cfg.netNeurons)   $('netNeurons').value   = cfg.netNeurons;
    if ($('netActivation')&& cfg.netActivation)$('netActivation').value= cfg.netActivation;
    if ($('netLr')        && cfg.netLr)        $('netLr').value        = cfg.netLr;
    if ($('lrDecay')      && cfg.lrDecay)      $('lrDecay').value      = cfg.lrDecay;
    if ($('physicsWeight')&& cfg.physicsWeight)$('physicsWeight').value = cfg.physicsWeight;
    if ($('bcWeight')     && cfg.bcWeight)     $('bcWeight').value      = cfg.bcWeight;
    if ($('trainEpochs')  && cfg.trainEpochs)  $('trainEpochs').value   = cfg.trainEpochs;
    if ($('trainNf')      && cfg.trainNf)      $('trainNf').value       = cfg.trainNf;
    if ($('updateEvery')  && cfg.updateEvery)  $('updateEvery').value   = cfg.updateEvery;
    if ($('useFourier')   && cfg.useFourier != null) $('useFourier').checked = cfg.useFourier;

    AppState.activePresetId = cfg.activePreset || null;
    return true;
  } catch(e) { return false; }
}

/* ══════════════════════════════════════════════════════════════
   4. Equation Input & KaTeX Preview
   ══════════════════════════════════════════════════════════════ */
function initEquationInput() {
  const eqInput   = $('eqInput');
  const preview   = $('eqPreview');
  const typeBadge = $('typeBadge');
  if (!eqInput) return;

  let debounceTimer;
  eqInput.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      handleEquationChange(eqInput.value, preview, typeBadge);
    }, 300);
  });

  // Initial parse if default value present
  if (eqInput.value) {
    handleEquationChange(eqInput.value, preview, typeBadge);
  }
}

function handleEquationChange(eqStr, previewEl, typeBadgeEl) {
  if (!eqStr.trim()) {
    if (previewEl) previewEl.innerHTML = '<span style="color:var(--text-muted)">Type an equation above…</span>';
    setTypeBadge(typeBadgeEl, 'unknown');
    return;
  }

  // Validate
  const validation = EquationParser.validate(eqStr, collectParams());
  if (!validation.valid) {
    if (previewEl) {
      previewEl.className = 'katex-preview invalid';
      previewEl.innerHTML = `<span style="color:var(--danger);font-size:12px">⚠ ${validation.error}</span>`;
    }
    setTypeBadge(typeBadgeEl, 'unknown');
    currentEqType = 'unknown';
    return;
  }

  // Render KaTeX
  if (previewEl && window.katex) {
    try {
      const latex = EquationParser.toLatex(eqStr) + ' = 0';
      previewEl.className = 'katex-preview valid';
      previewEl.innerHTML = '<span class="preview-label">Preview:</span>';
      const mathEl = document.createElement('span');
      katex.render(latex, mathEl, { throwOnError: false, displayMode: false, maxSize: 60 });
      previewEl.appendChild(mathEl);
    } catch (e) {
      previewEl.innerHTML = `<code style="color:var(--accent)">${eqStr}</code>`;
    }
  }

  // Update type badge
  const t = validation.type;
  currentEqType = t;
  setTypeBadge(typeBadgeEl, t);

  // Show/hide domain fields based on type
  updateDomainVisibility(validation.inputVars);

  // Update BC variable options
  updateBCVariableOptions(validation.inputVars);
}

function setTypeBadge(el, type) {
  if (!el) return;
  const labels = {
    'ode':     ['ODE', '1D ordinary DE'],
    'pde-1d':  ['PDE — 1D+t', '2D spatiotemporal'],
    'pde-2d':  ['PDE — 2D', '2D spatial or 3D'],
    'unknown': ['—', 'Type not detected'],
  };
  const [short, long] = labels[type] || labels['unknown'];
  el.className = `type-badge ${type}`;
  el.textContent = short;
  el.title = long;
}

function updateDomainVisibility(inputVars) {
  const domainX = $('domainX');
  const domainT = $('domainT');
  const domainY = $('domainY');
  if (domainX) domainX.style.display = inputVars.includes('x') ? '' : 'none';
  if (domainT) domainT.style.display = inputVars.includes('t') ? '' : 'none';
  if (domainY) domainY.style.display = inputVars.includes('y') ? '' : 'none';

  // Show/hide plot mode selector
  const plotModeRow = $('plotModeRow');
  if (plotModeRow) plotModeRow.style.display = (inputVars.length >= 2) ? '' : 'none';
}

function updateBCVariableOptions(inputVars) {
  // Update all "fixed var" selects in the BC table
  document.querySelectorAll('.bc-fixedvar-select').forEach(sel => {
    const current = sel.value;
    sel.innerHTML = inputVars.map(v => `<option value="${v}" ${v === current ? 'selected' : ''}>${v}</option>`).join('');
  });
}

/* ══════════════════════════════════════════════════════════════
   5. Parameter Table
   ══════════════════════════════════════════════════════════════ */
function initParamTable() {
  const addBtn = $('addParamBtn');
  if (addBtn) addBtn.addEventListener('click', addParamRow);
}

function addParamRow(name = '', value = '') {
  const tbody = $('paramTableBody');
  if (!tbody) return;
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td><input class="input input-mono param-name" type="text" placeholder="alpha" value="${name}" style="width:100%"></td>
    <td><input class="input input-mono param-value" type="number" placeholder="0.01" value="${value}" style="width:100%"></td>
    <td><button class="btn btn-icon btn-danger" onclick="this.closest('tr').remove()" title="Remove">✕</button></td>`;
  tbody.appendChild(tr);
}

function collectParams() {
  const params = {};
  document.querySelectorAll('#paramTableBody tr').forEach(tr => {
    const name  = tr.querySelector('.param-name')?.value.trim();
    const value = parseFloat(tr.querySelector('.param-value')?.value);
    if (name && !isNaN(value)) params[name] = value;
  });
  return params;
}

/* ══════════════════════════════════════════════════════════════
   6. BC Table
   ══════════════════════════════════════════════════════════════ */
function initBCTable() {
  const addBtn = $('addBCBtn');
  if (addBtn) addBtn.addEventListener('click', () => addBCRow());
}

function addBCRow(bc = {}) {
  const tbody = $('bcTableBody');
  if (!tbody) return;

  const inputVarsList = ($('eqInput')?.value)
    ? (EquationParser.validate($('eqInput').value).inputVars || ['x', 't'])
    : ['x', 't'];

  const quantityOptions = ['u', 'u_x', 'u_t', 'u_y', 'u_xx', 'u_yy', 'u_tt']
    .map(q => `<option value="${q}" ${q === (bc.quantity || 'u') ? 'selected' : ''}>${q}</option>`).join('');

  const varOptions = inputVarsList
    .map(v => `<option value="${v}" ${v === (bc.fixedVar || inputVarsList[0]) ? 'selected' : ''}>${v}</option>`).join('');

  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td>
      <select class="select bc-quantity-select" style="min-width:80px;font-size:13px">
        ${quantityOptions}
      </select>
    <td>
      <select class="select bc-fixedvar-select" style="min-width:50px;font-size:13px">
        ${varOptions}
      </select>
    </td>
    <td>
      <input class="input input-mono bc-fixedval" type="number" step="any"
             value="${bc.fixedVal !== undefined ? bc.fixedVal : 0}" style="width:70px;font-size:13px">
    </td>
    <td>
      <input class="input input-mono bc-expression" type="text"
             placeholder="e.g. sin(pi*x)" value="${bc.expression || ''}" style="min-width:120px;font-size:13px">
    </td>
    <td>
      <button class="btn btn-icon btn-danger btn-sm" onclick="this.closest('tr').remove()" title="Remove BC">✕</button>
    </td>`;
  tbody.appendChild(tr);
}

function collectBCs() {
  const bcs = [];
  document.querySelectorAll('#bcTableBody tr').forEach(tr => {
    const quantity  = tr.querySelector('.bc-quantity-select')?.value;
    const fixedVar  = tr.querySelector('.bc-fixedvar-select')?.value;
    const fixedVal  = parseFloat(tr.querySelector('.bc-fixedval')?.value);
    const expression = tr.querySelector('.bc-expression')?.value.trim();
    if (quantity && fixedVar && expression) {
      bcs.push({ quantity, fixedVar, fixedVal: isNaN(fixedVal) ? 0 : fixedVal, expression });
    }
  });
  return bcs;
}

function clearBCTable() {
  const tbody = $('bcTableBody');
  if (tbody) tbody.innerHTML = '';
}

/* ══════════════════════════════════════════════════════════════
   7. Domain Collection
   ══════════════════════════════════════════════════════════════ */
function collectDomain() {
  const domain = {};
  const tryParse = id => parseFloat($(id)?.value || '0');

  if ($('xMin')) domain.x = [tryParse('xMin'), tryParse('xMax')];
  if ($('tMin') && $('domainT')?.style.display !== 'none') domain.t = [tryParse('tMin'), tryParse('tMax')];
  if ($('yMin') && $('domainY')?.style.display !== 'none') domain.y = [tryParse('yMin'), tryParse('yMax')];

  return domain;
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   8. Preset Loading
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
function loadPreset(presetId) {
  const preset = PRESETS.find(p => p.id === presetId);
  if (!preset) return;

  const eqInput = $('eqInput');
  if (eqInput) {
    eqInput.value = preset.equation;
    eqInput.dispatchEvent(new Event('input'));
  }

  if (preset.domain.x) {
    if ($('xMin')) $('xMin').value = preset.domain.x[0];
    if ($('xMax')) $('xMax').value = preset.domain.x[1];
  }
  if (preset.domain.t) {
    if ($('tMin')) $('tMin').value = preset.domain.t[0];
    if ($('tMax')) $('tMax').value = preset.domain.t[1];
  }
  if (preset.domain.y) {
    if ($('yMin')) $('yMin').value = preset.domain.y[0];
    if ($('yMax')) $('yMax').value = preset.domain.y[1];
  }

  const tbody = $('paramTableBody');
  if (tbody) tbody.innerHTML = '';
  Object.entries(preset.params || {}).forEach(([k, v]) => addParamRow(k, v));

  clearBCTable();
  (preset.bcs || []).forEach(bc => addBCRow(bc));

  AppState.activePresetId = presetId;
  saveConfigToStorage();

  toast('Loaded: ' + preset.name, 'success');

  document.querySelectorAll('.preset-pill').forEach(p => {
    p.classList.toggle('active', p.dataset.preset === presetId);
  });
}

function renderPresetPills() {
  const container = $('presetPills');
  if (!container) return;
  container.innerHTML = PRESETS.map(p =>
    '<button class="preset-pill" data-preset="' + p.id + '" onclick="loadPreset(\'' + p.id + '\')" title="' + p.description + '" aria-label="Load ' + p.name + ' preset">' +
    '<span class="pill-type ' + (p.type.toLowerCase() === 'ode' ? 'ode' : 'pde') + '">' + p.type + '</span> ' + p.name + '</button>'
  ).join('');
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   9. Training Controls
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
function initTrainingControls() {
  const startBtn = $('startBtn');
  const pauseBtn = $('pauseBtn');
  const resetBtn = $('resetBtn');
  if (startBtn) startBtn.addEventListener('click', handleStart);
  if (pauseBtn) pauseBtn.addEventListener('click', handlePauseResume);
  if (resetBtn) resetBtn.addEventListener('click', handleReset);
}

async function handleStart() {
  if (AppState.trainingState === 'running') return;

  const eqStr = $('eqInput')?.value?.trim();
  if (!eqStr) { toast('Please enter an equation first.', 'error'); return; }

  const params = collectParams();
  const validation = EquationParser.validate(eqStr, params);
  if (!validation.valid) { toast('Equation has errors: ' + validation.error, 'error'); return; }

  const domain = collectDomain();
  const bcs = collectBCs();
  const eqType = validation.type;
  const inputVars = validation.inputVars;

  for (const v of inputVars) {
    if (!domain[v]) { toast('Missing domain bounds for variable ' + v, 'error'); return; }
    if (domain[v][0] >= domain[v][1]) { toast('Domain for ' + v + ': min must be < max.', 'error'); return; }
  }

  const layers        = parseInt($('netLayers')?.value    || 4);
  const neurons       = parseInt($('netNeurons')?.value   || 32);
  const activation    = $('netActivation')?.value          || 'tanh';
  const lr            = parseFloat($('netLr')?.value        || 0.001);
  const lrDecay       = parseFloat($('lrDecay')?.value      || 0);
  const epochs        = parseInt($('trainEpochs')?.value    || 2000);
  const nf            = parseInt($('trainNf')?.value        || 1000);
  const nb            = parseInt($('trainNb')?.value        || 50);
  const updateEvery   = parseInt($('updateEvery')?.value    || 20);
  const physicsWeight = parseFloat($('physicsWeight')?.value ?? 1.0);
  const bcWeight      = parseFloat($('bcWeight')?.value      ?? 1.0);
  const useFourier    = $('useFourier')?.checked ?? false;

  saveConfigToStorage();

  const activePreset = PRESETS.find(p => p.id === AppState.activePresetId);

  if (AppState.pinnInstance) AppState.pinnInstance.dispose();

  try {
    const parser = new EquationParser(eqStr, params);

    AppState.pinnInstance = new PINN({
      equationConfig: { parser, domain, bcs, params },
      networkConfig:  { layers, neurons, activation, lr, lrDecay, physicsWeight, bcWeight, useFourier },
    });

    AppState.pinnInstance.buildModel();

    const exactFn = (eqType === 'ode' && activePreset?.exactFn)
      ? activePreset.exactFn(params)
      : null;

    Visualizer.resetPlots();
    const exportBar = $('exportBar');
    if (exportBar) exportBar.style.display = 'none';
    setTrainingState('running');
    updateMetrics({ epoch: 0, totalEpochs: epochs, totalLoss: 0, physicsLoss: 0, bcLoss: 0 });

    await AppState.pinnInstance.train({
      epochs, nf, nb, updateEvery,
      onEpoch: async (data) => {
        updateMetrics(data);
        Visualizer.updateLoss(data.history);
        const modeStr = (eqType === 'ode') ? 'ode' : (eqType === 'pde-2d' ? 'pde-2d' : 'pde-1d');
        await Visualizer.updateSolution(AppState.pinnInstance, modeStr, { plotType: AppState.plotMode, exactFn });
        if (data.epoch % (updateEvery * 5) === 0) {
          await Visualizer.updateResidual(AppState.pinnInstance, modeStr);
        }
      },
      onDone: async () => {
        setTrainingState('done');
        toast('Training complete! 🎉', 'success', 4000);
        const modeStr = (eqType === 'ode') ? 'ode' : (eqType === 'pde-2d' ? 'pde-2d' : 'pde-1d');
        await Visualizer.updateResidual(AppState.pinnInstance, modeStr);
        if (exportBar) exportBar.style.display = 'flex';
      },
    });

  } catch (err) {
    console.error('Training error:', err);
    toast('Error: ' + err.message, 'error', 5000);
    setTrainingState('idle');
  }
}

function handlePauseResume() {
  if (!AppState.pinnInstance) return;
  if (AppState.trainingState === 'running') {
    AppState.pinnInstance.pause();
    setTrainingState('paused');
    toast('Training paused ⏸', 'info');
  } else if (AppState.trainingState === 'paused') {
    AppState.pinnInstance.resume();
    setTrainingState('running');
    toast('Training resumed ▶', 'info');
  }
}

function handleReset() {
  if (AppState.pinnInstance) {
    AppState.pinnInstance.stop();
    AppState.pinnInstance.dispose();
    AppState.pinnInstance = null;
  }
  setTrainingState('idle');
  Visualizer.resetPlots();
  updateMetrics({ epoch: 0, totalEpochs: 0, totalLoss: 0, physicsLoss: 0, bcLoss: 0 });
  const exportBar = $('exportBar');
  if (exportBar) exportBar.style.display = 'none';
  toast('Reset complete ↺', 'info');
}

/* ══════════════════════════════════════════════════════════════
   10. Export Functions
   ══════════════════════════════════════════════════════════════ */

/** Download the current solution grid as a CSV file. */
function exportCSV() {
  const pinn = AppState.pinnInstance;
  if (!pinn) return;
  try {
    const vars = pinn.inputVars;
    let rows = ['# PINNsolver solution export'];
    if (vars.length === 1) {
      const { coords, values } = pinn.predict1D(200);
      rows.push([vars[0], 'u'].join(','));
      coords.forEach((x, i) => rows.push(`${x.toFixed(6)},${values[i].toFixed(8)}`));
    } else {
      const { xs, ts, grid } = pinn.predict2D(60, 60);
      rows.push([vars[0], vars[1], 'u'].join(','));
      xs.forEach((x, i) => ts.forEach((t, j) => rows.push(`${x.toFixed(6)},${t.toFixed(6)},${grid[i][j].toFixed(8)}`)));
    }
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement('a'), { href: url, download: 'pinn_solution.csv' });
    a.click();
    URL.revokeObjectURL(url);
    toast('Solution downloaded as CSV ✅', 'success');
  } catch(e) {
    toast('CSV export failed: ' + e.message, 'error');
  }
}

/** Save the trained TF.js model to the browser downloads folder. */
async function exportModel() {
  const pinn = AppState.pinnInstance;
  if (!pinn?.model) return;
  try {
    await pinn.model.save('downloads://pinn-model');
    toast('Model saved to downloads 💾', 'success');
  } catch(e) {
    toast('Model save failed: ' + e.message, 'error');
  }
}

/** Copy equation + config as JSON to clipboard. */
function copyConfig() {
  try {
    const cfg = {
      equation:     $('eqInput')?.value,
      params:       collectParams(),
      domain:       collectDomain(),
      bcs:          collectBCs(),
      network: {
        layers:     $('netLayers')?.value,
        neurons:    $('netNeurons')?.value,
        activation: $('netActivation')?.value,
        lr:         $('netLr')?.value,
        lrDecay:    $('lrDecay')?.value,
      },
      training: {
        epochs:         $('trainEpochs')?.value,
        nInterior:      $('trainNf')?.value,
        nBoundary:      $('trainNb')?.value,
        physicsWeight:  $('physicsWeight')?.value,
        bcWeight:       $('bcWeight')?.value,
        useFourier:     $('useFourier')?.checked,
      },
    };
    navigator.clipboard.writeText(JSON.stringify(cfg, null, 2))
      .then(() => toast('Config copied to clipboard 📋', 'success'))
      .catch(() => toast('Clipboard unavailable — check browser permissions', 'error'));
  } catch(e) {
    toast('Copy failed: ' + e.message, 'error');
  }
}

function initExportBar() {
  const csvBtn    = $('exportCsvBtn');
  const modelBtn  = $('exportModelBtn');
  const configBtn = $('exportConfigBtn');
  if (csvBtn)    csvBtn.addEventListener('click', exportCSV);
  if (modelBtn)  modelBtn.addEventListener('click', exportModel);
  if (configBtn) configBtn.addEventListener('click', copyConfig);
}

/* ══════════════════════════════════════════════════════════════
   10. UI State Updates
   ══════════════════════════════════════════════════════════════ */
function setTrainingState(state) {
  trainingState = state;

  const startBtn   = $('startBtn');
  const pauseBtn   = $('pauseBtn');
  const resetBtn   = $('resetBtn');
  const statusDot  = $('statusDot');
  const statusText = $('statusText');

  if (startBtn) {
    startBtn.disabled = (state === 'running' || state === 'paused');
    startBtn.classList.toggle('btn-pulse', state === 'running');
  }
  if (pauseBtn) {
    pauseBtn.disabled = (state === 'idle' || state === 'done');
    pauseBtn.textContent = state === 'paused' ? '▶ Resume' : '⏸ Pause';
  }
  if (resetBtn) resetBtn.disabled = (state === 'idle');

  if (statusDot) {
    statusDot.className = `status-dot ${state === 'running' ? 'running' : state === 'paused' ? 'paused' : state === 'done' ? 'done' : ''}`;
  }
  if (statusText) {
    const labels = { idle: 'Idle', running: 'Training…', paused: 'Paused', done: 'Complete' };
    statusText.textContent = labels[state] || 'Idle';
  }
}

function updateMetrics(data) {
  const fmt = v => {
    if (v === 0 || v === undefined) return '—';
    if (v < 0.001) return v.toExponential(2);
    return v.toFixed(4);
  };

  const set = (id, val) => { const el = $(id); if (el) el.textContent = val; };

  set('metricEpoch',      data.epoch > 0 ? `${data.epoch} / ${data.totalEpochs}` : '—');
  set('metricTotal',      fmt(data.totalLoss));
  set('metricPhysics',    fmt(data.physicsLoss));
  set('metricBC',         fmt(data.bcLoss));

  // Progress bar
  const bar = $('progressFill');
  if (bar && data.totalEpochs > 0) {
    bar.style.width = `${Math.min(100, (data.epoch / data.totalEpochs) * 100).toFixed(1)}%`;
  }
}

/* ══════════════════════════════════════════════════════════════
   11. Plot Mode Toggle
   ══════════════════════════════════════════════════════════════ */
function initPlotModeToggle() {
  document.querySelectorAll('.plot-mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.plot-mode-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      plotMode = btn.dataset.mode;

      // Re-render if training is done or paused
      if (pinnInstance && trainingState !== 'idle') {
        // Bug Fix: correctly derive mode from currentEqType — was always hardcoded to 'pde-1d'
        const modeStr = (currentEqType === 'ode') ? 'ode' : (currentEqType === 'pde-2d' ? 'pde-2d' : 'pde-1d');
        Visualizer.updateSolution(pinnInstance, modeStr, { plotType: plotMode });
      }
    });
  });
}

/* ══════════════════════════════════════════════════════════════
   12. Slider Labels
   ══════════════════════════════════════════════════════════════ */
function initSliders() {
  document.querySelectorAll('input[type="range"]').forEach(slider => {
    const label = document.querySelector(`[data-for="${slider.id}"]`);
    if (label) label.textContent = slider.value;
    slider.addEventListener('input', () => {
      if (label) label.textContent = slider.value;
    });
  });
}

/* ══════════════════════════════════════════════════════════════
   13. Fade-in on scroll
   ══════════════════════════════════════════════════════════════ */
function initScrollAnimations() {
  const observer = new IntersectionObserver(
    entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); }),
    { threshold: 0.1 }
  );
  document.querySelectorAll('.fade-up, .scale-in').forEach(el => observer.observe(el));
}

/* ══════════════════════════════════════════════════════════════
   14. Collapsible Panels
   ══════════════════════════════════════════════════════════════ */
function initCollapsibles() {
  document.querySelectorAll('.collapsible-header').forEach(header => {
    const body = header.nextElementSibling;
    if (!body) return;
    // Compute natural height
    body.style.maxHeight = body.scrollHeight + 'px';

    header.addEventListener('click', () => {
      const isOpen = !body.classList.contains('closed');
      body.classList.toggle('closed', isOpen);
      header.classList.toggle('open', !isOpen);
      if (!isOpen) body.style.maxHeight = body.scrollHeight + 'px';
    });
    // Start open
    header.classList.add('open');
  });
}

/* ══════════════════════════════════════════════════════════════
   15. Particles
   ══════════════════════════════════════════════════════════════ */
function initParticles() {
  const container = document.querySelector('.particles');
  if (!container) return;
  for (let i = 0; i < 30; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    p.style.cssText = `
      left: ${Math.random() * 100}%;
      --dur: ${6 + Math.random() * 10}s;
      --delay: ${Math.random() * 8}s;
      opacity: ${0.3 + Math.random() * 0.5};
      background: ${Math.random() > 0.5 ? 'var(--primary-light)' : 'var(--accent)'};
    `;
    container.appendChild(p);
  }
}

/* ══════════════════════════════════════════════════════════════
   16. TF.js Backend Info (WebGPU → WebGL → CPU fallback)
   ══════════════════════════════════════════════════════════════ */
async function initTFBackend() {
  // Attempt WebGPU first (2–5× faster on modern browsers), fall back to WebGL, then CPU
  const backends = ['webgpu', 'webgl', 'cpu'];
  for (const b of backends) {
    try {
      await tf.setBackend(b);
      await tf.ready();
      break;
    } catch(_) { /* backend not available, try next */ }
  }
  const backend = tf.getBackend();
  const el = $('tfBackend');
  if (el) {
    const icons = { webgpu: '🚀 WebGPU', webgl: '⚡ GPU', cpu: '💻 CPU' };
    el.textContent = icons[backend] || backend;
    el.title = `TensorFlow.js backend: ${backend}`;
  }
  console.log(`TF.js backend: ${backend}`);
}

/* ══════════════════════════════════════════════════════════════
   17. INIT — Entry point
   ══════════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', async () => {
  // Initialize TF.js backend (WebGPU preferred)
  await initTFBackend();

  // Visualizer
  if ($('solutionPlot')) {
    Visualizer.init({
      solutionId: 'solutionPlot',
      lossId:     'lossPlot',
      residualId: 'residualPlot',
    });
  }

  // Render preset pills
  renderPresetPills();

  // Equation input, tables, controls
  initEquationInput();
  initParamTable();
  initBCTable();
  initTrainingControls();
  initPlotModeToggle();
  initSliders();
  initCollapsibles();
  initScrollAnimations();
  initParticles();
  initExportBar();

  // Auto-save config on any equation input change
  $('eqInput')?.addEventListener('change', saveConfigToStorage);

  // Restore last session config, otherwise load default preset
  const restored = restoreConfigFromStorage();
  if (!restored) {
    loadPreset('heat');
  } else if (AppState.activePresetId) {
    // Re-highlight the restored preset pill
    document.querySelectorAll('.preset-pill').forEach(p => {
      p.classList.toggle('active', p.dataset.preset === AppState.activePresetId);
    });
  }
});
