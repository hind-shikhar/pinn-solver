

class BCParser {
  /**
   * @param {Array}  bcList    - Array of BC objects from the UI
   * @param {Object} domain    - { x:[xmin,xmax], t:[tmin,tmax], y:[ymin,ymax] }
   * @param {Array}  inputVars - Ordered input vars, e.g. ['x','t']
   * @param {Object} params    - User parameters {alpha:0.01, ...}
   */
  constructor(bcList, domain, inputVars, params = {}) {
    this.bcList    = bcList;
    this.domain    = domain;
    this.inputVars = inputVars;
    this.params    = params;
  }

  /**
   * Compute total BC loss for the model.
   * Samples N_b points on each boundary, evaluates model and compares to target.
   *
   * @param {tf.LayersModel} model
   * @param {number}         nPerBc  - Points to sample per BC
   * @returns {tf.Tensor}   scalar loss
   */
  computeBCLoss(model, nPerBc = 100) {
    // NOTE: Do NOT wrap in tf.tidy here — this is called inside tf.variableGrads
    // and tf.tidy would dispose intermediate tensors that the gradient tape needs.
    const losses = [];

    for (const bc of this.bcList) {
      try {
        const bcLoss = this._computeSingleBCLoss(model, bc, nPerBc);
        if (bcLoss !== null) losses.push(bcLoss);
      } catch (e) {
        console.warn('BC loss error for', bc, e.message);
      }
    }

    if (losses.length === 0) return tf.scalar(0);
    return tf.addN(losses).div(tf.scalar(losses.length));
  }

  /* ── Private ─────────────────────────────────────────────── */

  _computeSingleBCLoss(model, bc, nPts) {
    const { quantity, fixedVar, fixedVal, expression } = bc;

    if (!expression || expression.trim() === '') return null;

    // Sample points on this boundary
    const inputs = this._sampleBoundaryPts(fixedVar, fixedVal, nPts);
    if (!inputs) return null;

    // Compute model quantity (u or derivative)
    let modelVal;
    if (quantity === 'u') {
      const inp = this._makeInputTensor(inputs);
      modelVal = model.predict(inp);
    } else {
      // Derivative quantity: compute via auto-diff
      const deriv = quantity.slice(2); // 'x', 't', 'xx', etc.
      modelVal = this._computeDerivAtBoundary(model, inputs, deriv);
    }

    // Compute target value from expression
    const targetVal = this._evalExpression(expression, inputs);

    // MSE loss
    return tf.losses.meanSquaredError(targetVal, modelVal);
  }

  /**
   * Sample N points on a boundary:
   * If fixedVar == 'x', x is fixed at fixedVal, t (and y) are sampled uniformly.
   * Returns { x: tensor, t: tensor, y?: tensor }
   */
  _sampleBoundaryPts(fixedVar, fixedVal, n) {
    const inputs = {};
    const { domain, inputVars } = this;

    for (const v of inputVars) {
      if (v === fixedVar) {
        // Pin this variable to fixedVal
        inputs[v] = tf.ones([n, 1]).mul(tf.scalar(fixedVal));
      } else {
        // Uniformly sample free variable in its domain
        const [lo, hi] = domain[v] || [0, 1];
        inputs[v] = tf.randomUniform([n, 1], lo, hi);
      }
    }

    return inputs;
  }

  /**
   * Evaluate a math expression at the boundary sample points.
   * Free variables (x, t, y) are available as tensors in scope.
   */
  _evalExpression(expr, inputs) {
    const scope = { ...this.params };
    this.inputVars.forEach(v => { if (inputs[v]) scope[v] = inputs[v]; });
    scope.pi = Math.PI;
    scope.e  = Math.E;

    const evaluator = new ExpressionEvaluator(expr, scope);
    const result = evaluator.parse();

    // If result is a plain number, broadcast to [n, 1] tensor
    if (!(result instanceof tf.Tensor)) {
      return tf.scalar(result).broadcastTo([inputs[this.inputVars[0]].shape[0], 1]);
    }
    // Ensure shape is [N, 1]
    if (result.shape.length === 1) return result.reshape([-1, 1]);
    if (result.shape[1] === undefined) return result.reshape([-1, 1]);
    return result;
  }

  /** Compute a derivative of the model at the given boundary inputs */
  _computeDerivAtBoundary(model, inputs, derivSpec) {
    // Delegate to shared utility in diff-utils.js to avoid code duplication.
    return computeDerivative(model, inputs, this.inputVars, derivSpec);
  }

  /** Concatenate input tensors in inputVars order */
  _makeInputTensor(inputs) {
    if (this.inputVars.length === 1) return inputs[this.inputVars[0]];
    return tf.concat(this.inputVars.map(v => inputs[v]), 1);
  }

  /* ── Validation helpers ──────────────────────────────────── */

  /**
   * Validate a single BC object (static, no model needed).
   * Returns { valid: boolean, error?: string }
   */
  static validateBC(bc, params = {}) {
    const { quantity, fixedVar, fixedVal, expression } = bc;

    if (!quantity || !fixedVar) return { valid: false, error: 'Missing quantity or variable.' };
    if (isNaN(parseFloat(fixedVal))) return { valid: false, error: 'Fixed value must be a number.' };
    if (!expression || !expression.trim()) return { valid: false, error: 'Expression is empty.' };

    // Try evaluating the expression with dummy scalar scope
    try {
      const dummyScope = { ...params, x: 0.5, t: 0.1, y: 0.5, pi: Math.PI, e: Math.E };
      const ev = new ExpressionEvaluator(expression, dummyScope);
      ev.parse();
      return { valid: true };
    } catch (e) {
      return { valid: false, error: e.message };
    }
  }

  /**
   * Generate LaTeX for displaying a BC nicely.
   */
  static toLatex(bc) {
    const quantityLatex = {
      'u':    'u',
      'u_x':  '\\frac{\\partial u}{\\partial x}',
      'u_t':  '\\frac{\\partial u}{\\partial t}',
      'u_y':  '\\frac{\\partial u}{\\partial y}',
      'u_xx': '\\frac{\\partial^2 u}{\\partial x^2}',
      'u_yy': '\\frac{\\partial^2 u}{\\partial y^2}',
      'u_tt': '\\frac{\\partial^2 u}{\\partial t^2}',
    };
    const q  = quantityLatex[bc.quantity] || bc.quantity;
    const cv = bc.fixedVar;
    const cval = bc.fixedVal;
    const expr = bc.expression.replace(/\*/g,' \\cdot ').replace(/pi/g,'\\pi');
    return `\\left.${q}\\right|_{${cv}=${cval}} = ${expr}`;
  }
}

window.BCParser = BCParser;
