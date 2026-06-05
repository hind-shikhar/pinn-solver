

const Visualizer = (() => {

  /* ── Plotly layout defaults ──────────────────────────────── */
  const BASE_LAYOUT = {
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor:  'rgba(0,0,0,0)',
    font:  { family: 'Inter, sans-serif', color: '#94a3b8', size: 12 },
    margin: { t: 40, b: 50, l: 55, r: 20 },
    colorway: ['#a855f7', '#06b6d4', '#10b981', '#f59e0b'],
    xaxis: {
      gridcolor:   'rgba(255,255,255,0.06)',
      linecolor:   'rgba(255,255,255,0.12)',
      zerolinecolor: 'rgba(255,255,255,0.12)',
      tickfont:    { color: '#64748b' },
    },
    yaxis: {
      gridcolor:   'rgba(255,255,255,0.06)',
      linecolor:   'rgba(255,255,255,0.12)',
      zerolinecolor: 'rgba(255,255,255,0.12)',
      tickfont:    { color: '#64748b' },
    },
    legend: {
      bgcolor: 'rgba(0,0,0,0)',
      bordercolor: 'rgba(255,255,255,0.1)',
      borderwidth: 1,
      font: { color: '#94a3b8', size: 11 },
    },
  };

  const HEATMAP_COLORSCALE = [
    [0.0,  '#0d1224'],
    [0.1,  '#1e1060'],
    [0.3,  '#4c1d95'],
    [0.5,  '#7c3aed'],
    [0.7,  '#06b6d4'],
    [0.9,  '#22d3ee'],
    [1.0,  '#f0f9ff'],
  ];

  const RESIDUAL_COLORSCALE = [
    [0.0, '#064e3b'],
    [0.4, '#10b981'],
    [0.5, '#f0f9ff'],
    [0.6, '#f59e0b'],
    [1.0, '#ef4444'],
  ];

  // ── DOM references ──────────────────────────────────────────
  let solutionEl, lossEl, residualEl;
  let currentMode = 'ode'; // 'ode' | 'pde-1d' | 'pde-2d'

  /* ── Initialise ──────────────────────────────────────────── */
  function init({ solutionId, lossId, residualId }) {
    solutionEl  = document.getElementById(solutionId);
    lossEl      = document.getElementById(lossId);
    residualEl  = document.getElementById(residualId);

    _initLossPlot();
    _showPlaceholder(solutionEl, '🧮', 'Solution will appear here after training starts');
    if (residualEl) _showPlaceholder(residualEl, '📉', 'Residual error map');
  }

  /* ── Solution Plot ───────────────────────────────────────── */

  /**
   * Update the solution plot based on PINN prediction.
   * @param {PINN} pinn
   * @param {string} mode - 'ode' | 'pde-1d' | 'pde-2d'
   * @param {Object} opts - { tSlice?, plotType?, varNames? }
   */
  async function updateSolution(pinn, mode, opts = {}) {
    currentMode = mode;
    if (!solutionEl) return;

    try {
      if (mode === 'ode') {
        await _plotODE(pinn, opts);
      } else if (mode === 'pde-1d') {
        const plotType = opts.plotType || 'heatmap';
        if (plotType === 'surface') await _plotSurface(pinn, opts);
        else await _plotHeatmap(pinn, opts);
      } else if (mode === 'pde-2d') {
        await _plot2DSteady(pinn, opts);
      }
    } catch (e) {
      console.warn('Visualizer updateSolution error:', e);
      if (window.toast) window.toast('Plot Error: ' + e.message, 'error', 5000);
    }
  }

  async function _plotODE(pinn, opts) {
    const v  = pinn.inputVars[0];
    const { coords, values } = await pinn.predict1D(200);

    const trace = {
      x: coords, y: values,
      type: 'scatter', mode: 'lines',
      name: 'u(t) — PINN',
      line: { color: '#a855f7', width: 2.5, shape: 'spline' },
    };

    const layout = {
      ...BASE_LAYOUT,
      xaxis: { ...BASE_LAYOUT.xaxis, title: { text: v, font: { color: '#94a3b8' } } },
      yaxis: { ...BASE_LAYOUT.yaxis, title: { text: 'u', font: { color: '#94a3b8' } } },
      margin: { t: 20, b: 50, l: 55, r: 20 },
    };

    // Add exact solution if provided
    if (opts.exactFn) {
      const exactVals = coords.map(x => opts.exactFn(x));
      const traceExact = {
        x: coords, y: exactVals,
        type: 'scatter', mode: 'lines',
        name: 'Exact solution',
        line: { color: '#06b6d4', width: 2, dash: 'dot' },
      };
      Plotly.react(solutionEl, [trace, traceExact], layout, _plotConfig());
    } else {
      Plotly.react(solutionEl, [trace], layout, _plotConfig());
    }
  }

  async function _plotHeatmap(pinn, opts) {
    const [v0, v1] = pinn.inputVars; // e.g. 'x', 't'
    const { xs, ts, grid } = await pinn.predict2D(80, 80);

    const trace = {
      x: ts, y: xs, z: grid,
      type: 'heatmap',
      colorscale: HEATMAP_COLORSCALE,
      colorbar: {
        tickfont: { color: '#64748b', size: 10 },
        thickness: 12,
      },
      zsmooth: 'best',
    };

    const layout = {
      ...BASE_LAYOUT,
      xaxis: { ...BASE_LAYOUT.xaxis, title: { text: v1, font: { color: '#94a3b8' } } },
      yaxis: { ...BASE_LAYOUT.yaxis, title: { text: v0, font: { color: '#94a3b8' } } },
      margin: { t: 20, b: 50, l: 55, r: 20 },
    };

    Plotly.react(solutionEl, [trace], layout, _plotConfig());
  }

  async function _plotSurface(pinn, opts) {
    const [v0, v1] = pinn.inputVars;
    const { xs, ts, grid } = await pinn.predict2D(50, 50);

    const trace = {
      x: ts, y: xs, z: grid,
      type: 'surface',
      colorscale: HEATMAP_COLORSCALE,
      contours: {
        x: { show: true, usecolormap: false, highlightcolor: '#a855f7', project: { x: true } },
      },
      showscale: true,
    };

    const layout = {
      ...BASE_LAYOUT,
      scene: {
        xaxis: { title: v1, gridcolor: 'rgba(255,255,255,0.06)', color: '#64748b' },
        yaxis: { title: v0, gridcolor: 'rgba(255,255,255,0.06)', color: '#64748b' },
        zaxis: { title: 'u',  gridcolor: 'rgba(255,255,255,0.06)', color: '#64748b' },
        bgcolor: 'rgba(0,0,0,0)',
        camera: { eye: { x: 1.5, y: 1.5, z: 1 } },
      },
      margin: { t: 20, b: 10, l: 10, r: 10 },
    };

    Plotly.react(solutionEl, [trace], layout, _plotConfig());
  }

  async function _plot2DSteady(pinn, opts) {
    // For 2D steady (x, y), same as heatmap but different labels
    await _plotHeatmap(pinn, opts);
  }

  /* ── Loss Plot ───────────────────────────────────────────── */

  function _initLossPlot() {
    if (!lossEl) return;
    const traces = [
      { x: [], y: [], name: 'Total Loss',   mode: 'lines', line: { color: '#a855f7', width: 2 } },
      { x: [], y: [], name: 'Physics Loss', mode: 'lines', line: { color: '#06b6d4', width: 1.5, dash: 'dash' } },
      { x: [], y: [], name: 'BC Loss',      mode: 'lines', line: { color: '#10b981', width: 1.5, dash: 'dot' } },
    ];
    const layout = {
      ...BASE_LAYOUT,
      xaxis: { ...BASE_LAYOUT.xaxis, title: { text: 'Epoch', font: { color: '#94a3b8' } } },
      yaxis: { ...BASE_LAYOUT.yaxis, title: { text: 'Loss (log)', font: { color: '#94a3b8' } }, type: 'log' },
      margin: { t: 20, b: 50, l: 55, r: 20 },
    };
    Plotly.newPlot(lossEl, traces, layout, _plotConfig());
  }

  function updateLoss(history) {
    if (!lossEl) return;
    Plotly.react(lossEl, [
      { x: history.epoch, y: history.totalLoss,   name: 'Total Loss',   mode: 'lines', line: { color: '#a855f7', width: 2 } },
      { x: history.epoch, y: history.physicsLoss, name: 'Physics Loss', mode: 'lines', line: { color: '#06b6d4', width: 1.5, dash: 'dash' } },
      { x: history.epoch, y: history.bcLoss,      name: 'BC Loss',      mode: 'lines', line: { color: '#10b981', width: 1.5, dash: 'dot' } },
    ], {
      ...BASE_LAYOUT,
      xaxis: { ...BASE_LAYOUT.xaxis, title: { text: 'Epoch', font: { color: '#94a3b8' } } },
      yaxis: { ...BASE_LAYOUT.yaxis, title: { text: 'Loss (log)', font: { color: '#94a3b8' } }, type: 'log' },
      margin: { t: 20, b: 50, l: 55, r: 20 },
    }, _plotConfig());
  }

  /* ── Residual Plot ───────────────────────────────────────── */

  async function updateResidual(pinn, mode) {
    if (!residualEl || mode === 'ode') return;

    try {
      const [v0, v1] = pinn.inputVars;
      const { xs, ts } = await pinn.predict2D(60, 60);

      // Compute residual at grid points
      const nX = xs.length, nT = ts.length;
      const total = nX * nT;
      const xFlat = [], tFlat = [];
      for (let i = 0; i < nX; i++)
        for (let j = 0; j < nT; j++) {
          xFlat.push(xs[i]);
          tFlat.push(ts[j]);
        }

      const resTensor = tf.tidy(() => {
        const xT = tf.tensor2d(xFlat, [total, 1]);
        const tT = tf.tensor2d(tFlat, [total, 1]);
        const inputs = { [v0]: xT, [v1]: tT };
        const res = pinn._residualFn(inputs);
        return res instanceof tf.Tensor ? tf.abs(res) : tf.scalar(res).broadcastTo([total, 1]);
      });

      const resData = Array.from(await resTensor.data());
      resTensor.dispose();

      const grid = [];
      for (let i = 0; i < nX; i++) {
        grid.push(resData.slice(i * nT, (i + 1) * nT));
      }

      const trace = {
        x: ts, y: xs, z: grid,
        type: 'heatmap',
        colorscale: 'RdBu',
        zmid: 0,
        colorbar: { tickfont: { color: '#64748b', size: 10 }, thickness: 12 },
        zsmooth: 'best',
      };

      const layout = {
        ...BASE_LAYOUT,
        xaxis: { ...BASE_LAYOUT.xaxis, title: { text: v1, font: { color: '#94a3b8' } } },
        yaxis: { ...BASE_LAYOUT.yaxis, title: { text: v0, font: { color: '#94a3b8' } } },
        margin: { t: 20, b: 44, l: 50, r: 20 },
      };

      Plotly.react(residualEl, [trace], layout, _plotConfig());
    } catch (e) {
      console.warn('Residual plot error:', e);
      if (window.toast) window.toast('Residual Plot Error: ' + e.message, 'error', 5000);
    }
  }

  /* ── Placeholder ─────────────────────────────────────────── */

  function _showPlaceholder(el, icon, text) {
    if (!el) return;
    el.innerHTML = `
      <div class="plot-placeholder">
        <div class="placeholder-icon">${icon}</div>
        <div>${text}</div>
      </div>`;
  }

  function resetPlots() {
    if (lossEl) _initLossPlot();
    if (solutionEl) _showPlaceholder(solutionEl, '🧮', 'Solution will appear here after training starts');
    if (residualEl) _showPlaceholder(residualEl, '📉', 'Residual error map');
  }

  /* ── Config helper ───────────────────────────────────────── */
  function _plotConfig() {
    return {
      displayModeBar: true,
      displaylogo:    false,
      responsive:     true,
      modeBarButtonsToRemove: ['sendDataToCloud', 'editInChartStudio'],
      toImageButtonOptions: { format: 'png', scale: 2 },
    };
  }

  /* ── Resize on window change ─────────────────────────────── */
  window.addEventListener('resize', () => {
    [solutionEl, lossEl, residualEl].forEach(el => {
      if (el && el.querySelector('.js-plotly-plot')) Plotly.Plots.resize(el);
    });
  });

  return { init, updateSolution, updateLoss, updateResidual, resetPlots };
})();

window.Visualizer = Visualizer;
