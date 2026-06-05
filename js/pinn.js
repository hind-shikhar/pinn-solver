class PINNActivationLayer extends tf.layers.Layer {
  constructor(config) {
    super(config);
    this.activation = config.activation || 'tanh';
  }
  computeOutputShape(inputShape) { return inputShape; }
  call(inputs) {
    const x = inputs[0];
    switch (this.activation) {
      case 'sin':
        return tf.sin(x);
      case 'swish':
        // x * sigmoid(x), but native sigmoid breaks 2nd deriv.
        // sigmoid(x) = 1 / (1 + exp(-x))
        const sig = tf.scalar(1).div(tf.scalar(1).add(tf.exp(x.neg())));
        return x.mul(sig);
      case 'gelu':
        // Approximation: x * sigmoid(1.702 * x)
        const sig2 = tf.scalar(1).div(tf.scalar(1).add(tf.exp(x.mul(-1.702))));
        return x.mul(sig2);
      case 'elu':
        // ELU might still have issues natively, fallback
        return tf.elu(x);
      case 'tanh':
      default:
        // Math.tanh(x) = (exp(x) - exp(-x)) / (exp(x) + exp(-x))
        const expX = tf.exp(x);
        const expNx = tf.exp(x.neg());
        return expX.sub(expNx).div(expX.add(expNx));
    }
  }
  getConfig() {
    const config = super.getConfig();
    Object.assign(config, { activation: this.activation });
    return config;
  }
  static get className() { return 'PINNActivationLayer'; }
}
tf.serialization.registerClass(PINNActivationLayer);

class PINN {
  /**
   * @param {Object} config
   *   equationConfig: { parser: EquationParser, domain, bcs, params }
   *   networkConfig:  {
   *     layers, neurons, activation, lr,
   *     physicsWeight, bcWeight,          // loss weights (default 1.0 / 10.0)
   *     lrDecay,                          // exponential decay per epoch (0 = disabled)
   *     useFourier, fourierScale,         // Fourier feature embedding
   *     fourierFeatures,                  // number of random Fourier features
   *   }
   */
  constructor(config) {
    this.eqConfig  = config.equationConfig;
    this.netConfig = config.networkConfig;

    this.model      = null;
    this.optimizer  = null;
    this._fourierB  = null; // random Fourier projection matrix
    this.history    = { epoch: [], physicsLoss: [], bcLoss: [], totalLoss: [], lr: [] };
    this.isPaused   = false;
    this.isStopped  = false;
    this._resolve   = null; // for pause/resume promise

    // Expose parsed info
    this.parser    = this.eqConfig.parser;
    this.inputVars = this.parser.inputVars;
    this.domain    = this.eqConfig.domain;
    this.bcList    = this.eqConfig.bcs;
    this.params    = this.eqConfig.params || {};

    // Build residual fn and BC parser
    this._residualFn = null; // built after model creation
    this._bcParser   = new BCParser(this.bcList, this.domain, this.inputVars, this.params);
  }

  /* ══════════════════════════════════════════════════════════
     Network Construction
     ══════════════════════════════════════════════════════════ */

  buildModel() {
    const { layers, neurons, activation, useFourier, fourierFeatures = 64, fourierScale = 1.0 } = this.netConfig;
    const inputDim  = this.inputVars.length;
    const actFn     = this._getActivation(activation);

    // ── Fourier Feature Embedding ──────────────────────────────────────────
    // Lifts inputs from R^d → R^{2m} via [cos(2πBx), sin(2πBx)] where B is
    // a fixed random matrix. This dramatically improves accuracy for PDEs with
    // high-frequency or multiscale solutions (Wave, Burgers', Helmholtz).
    // Reference: Tancik et al. (2020) "Fourier Features Let Networks Learn
    // High Frequency Functions in Low Dimensional Domains".
    let firstLayerInputDim = inputDim;
    if (useFourier) {
      // Store B as a non-trainable TF variable so it persists with the model
      this._fourierB = tf.variable(
        tf.randomNormal([inputDim, fourierFeatures]).mul(tf.scalar(fourierScale)),
        false, // not trainable
        'fourierB'
      );
      firstLayerInputDim = 2 * fourierFeatures;
    }

    const modelLayers = [
      tf.layers.dense({ units: neurons, inputShape: [firstLayerInputDim], kernelInitializer: 'glorotNormal' }),
      new PINNActivationLayer({ activation: actFn })
    ];

    for (let i = 1; i < layers; i++) {
      modelLayers.push(tf.layers.dense({ units: neurons, kernelInitializer: 'glorotNormal' }));
      modelLayers.push(new PINNActivationLayer({ activation: actFn }));
    }

    modelLayers.push(
      tf.layers.dense({ units: 1, kernelInitializer: 'glorotNormal' }) // Linear output
    );

    this.model = tf.sequential({ layers: modelLayers });

    this.optimizer = tf.train.adam(this.netConfig.lr || 0.001);

    // Wrap model.predict to apply Fourier embedding if enabled
    const rawPredict = this.model.predict.bind(this.model);
    if (useFourier && this._fourierB) {
      const B = this._fourierB;
      this.model.predict = (x) => {
        // x: [N, inputDim] → embedded: [N, 2*fourierFeatures]
        const proj     = x.matMul(B).mul(tf.scalar(2 * Math.PI));
        const embedded = tf.concat([tf.cos(proj), tf.sin(proj)], 1);
        return rawPredict(embedded);
      };
    }

    // Build residual function with the (possibly Fourier-wrapped) model
    this._residualFn = this.parser.buildResidualFn(this.model);

    return this.model;
  }

  /* ══════════════════════════════════════════════════════════
     Collocation Point Sampling
     ══════════════════════════════════════════════════════════ */

  _sampleInterior(n) {
    const inputs = {};
    for (const v of this.inputVars) {
      const [lo, hi] = this.domain[v] || [0, 1];
      inputs[v] = tf.randomUniform([n, 1], lo, hi);
    }
    return inputs;
  }

  /* ══════════════════════════════════════════════════════════
     Loss Computation
     ══════════════════════════════════════════════════════════ */

  _computePhysicsLoss(nf) {
    // NOTE: No tf.tidy here — this is called inside tf.variableGrads;
    // tf.tidy would dispose intermediate tensors the gradient tape needs.
    const pts      = this._sampleInterior(nf);
    const residual = this._residualFn(pts);
    if (!(residual instanceof tf.Tensor)) {
      // Bug Fix: dispose collocation tensors to prevent memory leak on early return
      Object.values(pts).forEach(t => t.dispose());
      return tf.scalar(0);
    }
    return tf.mean(tf.square(residual));
  }

  _computeBCLoss(nb) {
    return this._bcParser.computeBCLoss(this.model, nb);
  }

  _computeTotalLoss(nf, nb, physicsWeight = 1.0, bcWeight = 1.0) {
    const pLoss = this._computePhysicsLoss(nf);
    const bLoss = this._computeBCLoss(nb);

    const total = tf.tidy(() =>
      tf.add(
        tf.mul(tf.scalar(physicsWeight), pLoss),
        tf.mul(tf.scalar(bcWeight), bLoss)
      )
    );

    return { total, physicsLoss: pLoss, bcLoss: bLoss };
  }

  /* ══════════════════════════════════════════════════════════
     Training Step
     ══════════════════════════════════════════════════════════ */

  async _trainStep(nf, nb, shouldFetch = true) {
    const physicsWeight = this.netConfig.physicsWeight ?? 1.0;
    const bcWeight      = this.netConfig.bcWeight      ?? 1.0;

    let physicsVal = 0, bcVal = 0;

    if (shouldFetch) {
      // Step 1: measure individual loss values for the dashboard (no grad tape needed)
      const [pL, bL] = tf.tidy(() => [
        this._computePhysicsLoss(nf),
        this._computeBCLoss(nb)
      ]);

      const [pvArr, bvArr] = await Promise.all([pL.data(), bL.data()]);
      physicsVal = pvArr[0];
      bcVal = bvArr[0];
      tf.dispose([pL, bL]);
    }

    // Step 2: gradient computation — wrapped in tf.tidy to prevent massive memory leaks!
    const totalValTensor = tf.tidy(() => {
      const { value, grads } = tf.variableGrads(() => {
        const pLoss = this._computePhysicsLoss(nf);
        const bLoss = this._computeBCLoss(nb);
        return tf.add(
          tf.mul(tf.scalar(physicsWeight), pLoss),
          tf.mul(tf.scalar(bcWeight), bLoss)
        );
      });
      this.optimizer.applyGradients(grads);
      return value;
    });

    let totalVal = 0;
    if (shouldFetch) {
      const totalArr = await totalValTensor.data();
      totalVal = totalArr[0];
    }
    totalValTensor.dispose();

    return {
      physicsLoss: physicsVal,
      bcLoss:      bcVal,
      totalLoss:   totalVal,
    };
  }

  /* ══════════════════════════════════════════════════════════
     Main Training Loop
     ══════════════════════════════════════════════════════════ */

  /**
   * @param {Object} trainConfig
   *   epochs, nf (collocation pts), nb (bc pts per bc), updateEvery,
   *   onEpoch: (epochData) => void   — called every updateEvery epochs
   *   onDone:  (finalData) => void   — called when training completes
   */
  async train(trainConfig) {
    const {
      epochs      = 2000,
      nf          = 1000,
      nb          = 50,
      updateEvery = 20,
      onEpoch     = null,
      onDone      = null,
    } = trainConfig;

    const initialLr = this.netConfig.lr  || 0.001;
    const lrDecay   = this.netConfig.lrDecay ?? 0; // 0 = disabled

    this.isStopped = false;
    this.isPaused  = false;
    this.history   = { epoch: [], physicsLoss: [], bcLoss: [], totalLoss: [], lr: [] };

    for (let ep = 0; ep < epochs; ep++) {
      if (this.isStopped) break;

      // Pause support
      if (this.isPaused) {
        await new Promise(resolve => { this._resolve = resolve; });
      }

      // ── Learning Rate Scheduler (exponential decay) ──────────────────────
      // lr(ep) = lr0 * exp(-lrDecay * ep/epochs)
      // lrDecay=0 → constant LR; lrDecay=3 → LR drops to ~5% by end.
      if (lrDecay > 0) {
        const decayedLr = initialLr * Math.exp(-lrDecay * ep / epochs);
        this.optimizer.learningRate = decayedLr;
      }

      const shouldUpdate = (ep % updateEvery === 0 || ep === epochs - 1);

      // Train one step
      const metrics = await this._trainStep(nf, nb, shouldUpdate);
      const currentLr = this.optimizer.learningRate;

      // Only record history and trigger callbacks on update intervals
      // This massively reduces GPU-CPU synchronization overhead.
      if (shouldUpdate) {
        this.history.epoch.push(ep + 1);
        this.history.physicsLoss.push(metrics.physicsLoss);
        this.history.bcLoss.push(metrics.bcLoss);
        this.history.totalLoss.push(metrics.totalLoss);
        this.history.lr.push(typeof currentLr === 'number' ? currentLr : initialLr);

        if (onEpoch) {
          await onEpoch({
            epoch:       ep + 1,
            totalEpochs: epochs,
            currentLr:   this.history.lr[this.history.lr.length - 1],
            ...metrics,
            history:     this.history,
            model:       this.model,
          });
        }
      }

      // Yield to browser every 5 epochs to keep UI responsive without heavily throttling training
      if (ep % 5 === 0) {
        await tf.nextFrame();
      }
    }

    if (onDone) onDone({ history: this.history });
  }

  pause()  { this.isPaused = true; }
  resume() { this.isPaused = false; if (this._resolve) { this._resolve(); this._resolve = null; } }
  stop()   { this.isStopped = true; this.resume(); }

  /* ══════════════════════════════════════════════════════════
     Inference / Prediction
     ══════════════════════════════════════════════════════════ */

  /**
   * Predict u on a grid of points.
   * @param {Object} gridInputs - { x: Float32Array, t?: Float32Array, y?: Float32Array }
   *   Each array is flat; grid is all combinations.
   * @returns { values: Float32Array, shape: [nx, nt?] }
   */
  async predict(gridInputs) {
    const vars = this.inputVars;
    let predTensor;
    let shape;

    if (vars.length === 1) {
      const v    = vars[0];
      shape = [gridInputs[v].length];
      predTensor = tf.tidy(() => {
        const pts  = tf.tensor2d(gridInputs[v], [gridInputs[v].length, 1]);
        return this.model.predict(pts);
      });
    } else if (vars.length === 2) {
      const [v0, v1] = vars;
      const a0 = gridInputs[v0];
      const a1 = gridInputs[v1];
      const n0 = a0.length, n1 = a1.length;
      const total = n0 * n1;
      shape = [n0, n1];

      predTensor = tf.tidy(() => {
        const col0 = [], col1 = [];
        for (let i = 0; i < n0; i++)
          for (let j = 0; j < n1; j++) {
            col0.push(a0[i]);
            col1.push(a1[j]);
          }
        const inp  = tf.concat([
          tf.tensor2d(col0, [total, 1]),
          tf.tensor2d(col1, [total, 1]),
        ], 1);
        return this.model.predict(inp);
      });
    } else {
      console.warn('3-variable prediction grid not yet supported');
      return { values: new Float32Array([0]), shape: [1] };
    }

    const dataArr = await predTensor.data();
    predTensor.dispose();
    return { values: dataArr, shape };
  }

  /**
   * Predict on a uniform 1D grid.
   */
  async predict1D(n = 200) {
    const v = this.inputVars[0];
    const [lo, hi] = this.domain[v] || [0, 1];
    const pts = Array.from({ length: n }, (_, i) => lo + (hi - lo) * i / (n - 1));
    const pred = await this.predict({ [v]: pts });
    return {
      coords: pts,
      values: Array.from(pred.values),
    };
  }

  /**
   * Predict on a uniform 2D grid for two variables.
   */
  async predict2D(nx = 60, nt = 60) {
    const [v0, v1] = this.inputVars;
    const [xlo, xhi] = this.domain[v0] || [0, 1];
    const [tlo, thi] = this.domain[v1] || [0, 1];

    const xs = Array.from({ length: nx }, (_, i) => xlo + (xhi - xlo) * i / (nx - 1));
    const ts = Array.from({ length: nt }, (_, j) => tlo + (thi - tlo) * j / (nt - 1));

    const result = await this.predict({ [v0]: xs, [v1]: ts });
    const grid = [];
    for (let i = 0; i < nx; i++) {
      grid.push(Array.from(result.values.slice(i * nt, (i + 1) * nt)));
    }
    return { xs, ts, grid, shape: [nx, nt] };
  }

  /* ══════════════════════════════════════════════════════════
     Cleanup
     ══════════════════════════════════════════════════════════ */

  dispose() {
    if (this.model) this.model.dispose();
    if (this.optimizer) this.optimizer.dispose();
    if (this._fourierB) this._fourierB.dispose();
  }

  /* ══════════════════════════════════════════════════════════
     Helpers
     ══════════════════════════════════════════════════════════ */

  _getActivation(name) {
    switch ((name || 'tanh').toLowerCase()) {
      case 'tanh':  return 'tanh';
      case 'sin':   return 'sin'; // TF.js supports this
      case 'swish': return 'swish';
      case 'gelu':  return 'gelu';
      case 'elu':   return 'elu';
      default:      return 'tanh';
    }
  }

  /** Return memory stats string for debug */
  memInfo() {
    const m = tf.memory();
    return `Tensors: ${m.numTensors} | Bytes: ${(m.numBytes / 1024).toFixed(1)} KB`;
  }
}

/* ── Utility: linspace ─────────────────────────────────────── */
function linspace(lo, hi, n) {
  return Array.from({ length: n }, (_, i) => lo + (hi - lo) * i / (n - 1));
}

window.PINN      = PINN;
window.linspace  = linspace;
