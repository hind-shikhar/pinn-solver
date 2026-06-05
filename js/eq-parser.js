

/* ══════════════════════════════════════════════════════════════
   1. Tensor-aware Expression Evaluator
   ══════════════════════════════════════════════════════════════ */
class ExpressionEvaluator {
  /**
   * @param {string} expr  - The math expression string
   * @param {Object} scope - Maps variable names → TF tensor | number
   */
  constructor(expr, scope) {
    this.src = expr.replace(/\s+/g, ''); // strip whitespace
    this.pos = 0;
    this.scope = scope;
  }

  parse() {
    const result = this._parseExpr();
    if (this.pos < this.src.length)
      throw new Error(`Unexpected token at pos ${this.pos}: '${this.src[this.pos]}'`);
    return result;
  }

  // ── Grammar ──────────────────────────────────────────────
  // expr    := term   (('+' | '-') term)*
  // term    := factor (('*' | '/') factor)*
  // factor  := unary  ('^'         unary)?
  // unary   := '-' unary | base
  // base    := '(' expr ')' | func '(' arglist ')' | number | ident

  _parseExpr() {
    let left = this._parseTerm();
    while (this.pos < this.src.length) {
      const ch = this.src[this.pos];
      if (ch === '+') { this.pos++; left = this._tadd(left, this._parseTerm()); }
      else if (ch === '-') { this.pos++; left = this._tsub(left, this._parseTerm()); }
      else break;
    }
    return left;
  }

  _parseTerm() {
    let left = this._parseFactor();
    while (this.pos < this.src.length) {
      const ch = this.src[this.pos];
      if (ch === '*') { this.pos++; left = this._tmul(left, this._parseFactor()); }
      else if (ch === '/') { this.pos++; left = this._tdiv(left, this._parseFactor()); }
      else break;
    }
    return left;
  }

  _parseFactor() {
    let base = this._parseUnary();
    if (this.pos < this.src.length && this.src[this.pos] === '^') {
      this.pos++;
      const exp = this._parseUnary();
      base = this._tpow(base, exp);
    }
    return base;
  }

  _parseUnary() {
    if (this.src[this.pos] === '-') {
      this.pos++;
      return this._tneg(this._parseUnary());
    }
    return this._parseBase();
  }

  _parseBase() {
    const ch = this.src[this.pos];

    // Parenthesised sub-expression
    if (ch === '(') {
      this.pos++;
      const val = this._parseExpr();
      if (this.src[this.pos] === ')') this.pos++;
      return val;
    }

    // Number literal
    if (/[0-9]/.test(ch) || (ch === '.' && /[0-9]/.test(this.src[this.pos + 1]))) {
      return this._parseNumber();
    }

    // Identifier (variable or function)
    if (/[a-zA-Z_]/.test(ch)) {
      return this._parseIdentOrFunc();
    }

    throw new Error(`Unexpected character '${ch}' at position ${this.pos}`);
  }

  _parseNumber() {
    const start = this.pos;
    while (this.pos < this.src.length && /[0-9.]/.test(this.src[this.pos])) this.pos++;
    // scientific notation: 1e-3, 2E+10
    if (this.pos < this.src.length && /[eE]/.test(this.src[this.pos])) {
      this.pos++;
      if (/[+-]/.test(this.src[this.pos])) this.pos++;
      while (this.pos < this.src.length && /[0-9]/.test(this.src[this.pos])) this.pos++;
    }
    return parseFloat(this.src.slice(start, this.pos));
  }

  _parseIdentOrFunc() {
    const start = this.pos;
    while (this.pos < this.src.length && /[a-zA-Z0-9_]/.test(this.src[this.pos])) this.pos++;
    const name = this.src.slice(start, this.pos);

    // Check if a function call follows
    if (this.src[this.pos] === '(') {
      this.pos++; // consume '('
      const args = [];
      if (this.src[this.pos] !== ')') {
        args.push(this._parseExpr());
        while (this.src[this.pos] === ',') { this.pos++; args.push(this._parseExpr()); }
      }
      if (this.src[this.pos] === ')') this.pos++;
      return this._applyFunc(name, args);
    }

    // Variable lookup
    return this._lookupVar(name);
  }

  _lookupVar(name) {
    if (name === 'pi' || name === 'PI') return Math.PI;
    if (name === 'e'  || name === 'E')  return Math.E;
    if (name in this.scope) return this.scope[name];
    throw new Error(`Unknown variable: "${name}". Did you define it as a parameter?`);
  }

  _applyFunc(name, args) {
    const a = args[0];
    const b = args[1];
    switch (name.toLowerCase()) {
      case 'sin':  return this._tfunc(tf.sin,  a);
      case 'cos':  return this._tfunc(tf.cos,  a);
      case 'tan':  return this._tfunc(tf.tan,  a);
      case 'exp':  return this._tfunc(tf.exp,  a);
      case 'log':  return this._tfunc(tf.log,  a);
      case 'sqrt': return this._tfunc(tf.sqrt, a);
      case 'abs':  return this._tfunc(tf.abs,  a);
      case 'tanh': return this._tfunc(tf.tanh, a);
      case 'sinh': return this._tfunc(tf.sinh, a);
      case 'cosh': return this._tfunc(tf.cosh, a);
      case 'sign': return this._tfunc(tf.sign, a);
      case 'relu': return this._tfunc(x => tf.relu(x), a);
      case 'pow':  return this._tpow(a, b);
      case 'max':  return tf.maximum(this._toT(a), this._toT(b));
      case 'min':  return tf.minimum(this._toT(a), this._toT(b));
      case 'atan': return this._tfunc(tf.atan, a);
      case 'asin': return this._tfunc(tf.asin, a);
      case 'acos': return this._tfunc(tf.acos, a);
      default: throw new Error(`Unknown function: "${name}"`);
    }
  }

  // ── Tensor-aware arithmetic helpers ─────────────────────
  _isT(v) { return v instanceof tf.Tensor; }
  _toT(v) { return this._isT(v) ? v : tf.scalar(v); }

  _tadd(a, b) { if (!this._isT(a) && !this._isT(b)) return a + b; return tf.add(this._toT(a), this._toT(b)); }
  _tsub(a, b) { if (!this._isT(a) && !this._isT(b)) return a - b; return tf.sub(this._toT(a), this._toT(b)); }
  _tmul(a, b) { if (!this._isT(a) && !this._isT(b)) return a * b; return tf.mul(this._toT(a), this._toT(b)); }
  _tdiv(a, b) { if (!this._isT(a) && !this._isT(b)) return a / b; return tf.div(this._toT(a), this._toT(b)); }
  _tpow(a, b) { if (!this._isT(a) && !this._isT(b)) return Math.pow(a, b); return tf.pow(this._toT(a), this._toT(b)); }
  _tneg(a)    { if (!this._isT(a)) return -a; return tf.neg(a); }
  _tfunc(fn, a) {
    if (!this._isT(a)) {
      // apply JS Math equivalent for pure numbers
      try { return fn(tf.scalar(a)).dataSync()[0]; } catch(e) { return a; }
    }
    return fn(a);
  }
}


/* ══════════════════════════════════════════════════════════════
   2. Equation Parser
   ══════════════════════════════════════════════════════════════ */
class EquationParser {
  /**
   * @param {string} eqStr   - Equation like "u_t - 0.01*u_xx = 0"
   * @param {Object} params  - User-defined params, e.g. {alpha: 0.01}
   */
  constructor(eqStr, params = {}) {
    this.raw    = eqStr.trim();
    this.params = params;
    this.info   = this._analyse();
  }

  /* ── Public API ─────────────────────────────────────────── */

  /** Auto-detected equation type: 'ode' | 'pde-1d' | 'pde-2d' | 'unknown' */
  get type()      { return this.info.type; }

  /** Ordered array of input variable names, e.g. ['x','t'] */
  get inputVars() { return this.info.inputVars; }

  /** Array of derivative token strings found, e.g. ['u_t','u_xx'] */
  get derivTerms(){ return this.info.derivTerms; }

  /** Human-readable summary */
  get summary()   { return this.info.summary; }

  /**
   * Build a residual function bound to the given TF.js model.
   * @param {tf.LayersModel} model
   * @returns {function(inputs: Object): tf.Tensor}  inputs = {x?,t?,y?}
   */
  buildResidualFn(model) {
    const { lhsExpr, rhsExpr, derivTerms, inputVars } = this.info;
    const params = this.params;

    return (inputs) => {
      // Compute all required derivatives
      const scope = { ...params };
      inputVars.forEach(v => { if (inputs[v]) scope[v] = inputs[v]; });

      // Model prediction u
      const inputTensor = this._makeInputTensor(inputs, inputVars);
      scope.u = model.predict(inputTensor);

      // Derivatives
      for (const dname of derivTerms) {
        const spec = dname.slice(2); // e.g. 'xx', 'xt', 't'
        scope[dname] = this._computeDerivative(model, inputs, inputVars, spec);
      }

      // Evaluate residual: lhs - rhs
      const residualExprStr = (rhsExpr.trim() === '0')
        ? lhsExpr
        : `(${lhsExpr})-(${rhsExpr})`;

      const evaluator = new ExpressionEvaluator(residualExprStr, scope);
      return evaluator.parse();
    };
  }

  /** Static helper: quick validation without constructing the full object */
  static validate(eqStr, params = {}) {
    try {
      const p = new EquationParser(eqStr, params);
      return { valid: true, type: p.type, inputVars: p.inputVars, derivTerms: p.derivTerms };
    } catch (err) {
      return { valid: false, error: err.message };
    }
  }

  /** Convert the equation to a LaTeX-like string for KaTeX rendering */
  static toLatex(eqStr) {
    return eqStr
      .replace(/u_tt/g,  '\\frac{\\partial^2 u}{\\partial t^2}')
      .replace(/u_xx/g,  '\\frac{\\partial^2 u}{\\partial x^2}')
      .replace(/u_yy/g,  '\\frac{\\partial^2 u}{\\partial y^2}')
      .replace(/u_xt/g,  '\\frac{\\partial^2 u}{\\partial x \\partial t}')
      .replace(/u_yt/g,  '\\frac{\\partial^2 u}{\\partial y \\partial t}')
      .replace(/u_xy/g,  '\\frac{\\partial^2 u}{\\partial x \\partial y}')
      .replace(/u_t/g,   '\\frac{\\partial u}{\\partial t}')
      .replace(/u_x/g,   '\\frac{\\partial u}{\\partial x}')
      .replace(/u_y/g,   '\\frac{\\partial u}{\\partial y}')
      .replace(/\*/g,    ' \\cdot ')
      .replace(/pi/g,    '\\pi')
      .replace(/sqrt\(([^)]+)\)/g, '\\sqrt{$1}')
      .replace(/\^/g,    '^');
  }

  /* ── Private: Analysis ──────────────────────────────────── */
  _analyse() {
    const raw = this.raw;

    // Split on '='
    const eqParts = raw.split('=');
    const lhsExpr = eqParts[0].trim();
    const rhsExpr = eqParts.length > 1 ? eqParts[1].trim() : '0';

    // Collect all derivative tokens (u_xx, u_xt, u_t, u_x, u_y, u_yy, u_tt)
    const derivSet = new Set();
    const derivPattern = /u_([xyt]{1,3})/g;
    let m;
    while ((m = derivPattern.exec(raw)) !== null) {
      derivSet.add('u_' + m[1]);
    }
    const derivTerms = Array.from(derivSet);

    // Detect independent variables
    // NOTE: We detect 't' strictly via derivative notation (u_t, u_tt) only.
    // /\bt\b/ is intentionally NOT used — it was too broad and falsely matched
    // parameter names like 'theta', 'tau', or constants ending in 't'.
    const hasX = /u_x/.test(raw);
    const hasT = /u_t/.test(raw);
    const hasY = /u_y/.test(raw);

    // Detect equation type
    let type, inputVars, summary;
    if (hasX && hasY && hasT) {
      type = 'pde-2d'; inputVars = ['x', 'y', 't'];
      summary = 'PDE (2D + time)';
    } else if (hasX && hasY) {
      type = 'pde-2d'; inputVars = ['x', 'y'];
      summary = 'PDE (2D steady)';
    } else if (hasX && hasT) {
      type = 'pde-1d'; inputVars = ['x', 't'];
      summary = 'PDE (1D + time)';
    } else if (hasT && !hasX && !hasY) {
      type = 'ode'; inputVars = ['t'];
      summary = 'ODE (in t)';
    } else if (hasX && !hasT && !hasY) {
      type = 'ode'; inputVars = ['x'];
      summary = 'ODE (in x)';
    } else {
      type = 'unknown'; inputVars = ['t'];
      summary = 'Unknown / no derivatives found';
    }

    return { lhsExpr, rhsExpr, derivTerms, type, inputVars, summary };
  }

  /* ── Private: Derivative Computation ───────────────────── */
  _computeDerivative(model, inputs, inputVars, spec) {
    // Delegate to shared utility in diff-utils.js to avoid code duplication.
    // See diff-utils.js for full explanation of the closure-based tf.grad approach.
    return computeDerivative(model, inputs, inputVars, spec);
  }

  /** Concatenate input tensors in the order of inputVars */
  _makeInputTensor(inputs, inputVars) {
    if (inputVars.length === 1) return inputs[inputVars[0]];
    return tf.concat(inputVars.map(v => inputs[v]), 1);
  }
}

// Attach to global scope for use in other scripts
window.ExpressionEvaluator = ExpressionEvaluator;
window.EquationParser       = EquationParser;
