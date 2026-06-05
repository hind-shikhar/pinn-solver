/**
 * diff-utils.js — Shared automatic differentiation utilities
 *
 * Extracted from eq-parser.js and bc-parser.js to eliminate duplication.
 * Both modules import `computeDerivative` from this shared utility.
 */

/**
 * Compute an arbitrary-order derivative of a TF.js model output
 * using recursive closure-based tf.grad calls.
 *
 * WHY CLOSURE-BASED tf.grad (not tf.grads):
 *   tf.grads() creates its own isolated gradient tape, opaque to any
 *   outer tf.variableGrads tape. That breaks optimizer gradient flow.
 *   Recursive tf.grad closures keep the full chain visible to ALL
 *   simultaneously-active tapes.
 *
 * @param {tf.LayersModel} model      - The neural network
 * @param {Object}         inputs     - { x: Tensor, t: Tensor, ... }
 * @param {string[]}       inputVars  - Ordered variable names, e.g. ['x','t']
 * @param {string}         spec       - Derivative spec, e.g. 'xx', 'xt', 't'
 * @returns {tf.Tensor}               - Shape [N, 1]
 */
function computeDerivative(model, inputs, inputVars, spec) {
  const chars = Array.from(spec); // 'xx'→['x','x'], 'xt'→['x','t']

  /**
   * Processes chars RIGHT→LEFT (outermost first, innermost last).
   * @param {number}  charIdx      - Index in chars[]
   * @param {Object}  frozen       - { x: tensor, t: tensor, … } — current values
   * @param {boolean} isOutermost  - true → return [N,1]; false → return scalar for enclosing tf.grad
   */
  const computeRec = (charIdx, frozen, isOutermost) => {
    if (charIdx < 0) {
      // Base: run model; .sum() → scalar so enclosing tf.grad can differentiate
      const inpList = inputVars.map(v => frozen[v]);
      const inp     = inpList.length === 1 ? inpList[0] : tf.concat(inpList, 1);
      return model.predict(inp).sum();
    }

    const char     = chars[charIdx];
    const varValue = frozen[char];

    // tf.grad replaces varValue with a tape-watched tensor;
    // freezing everything else keeps the full chain visible to outer tapes.
    const gradResult = tf.grad(
      varTensor => computeRec(charIdx - 1, { ...frozen, [char]: varTensor }, false)
    )(varValue);

    // Non-outermost levels need a scalar for the enclosing tf.grad.
    // sum-trick: d(Σ_j f_j)/d(x_i) = df_i/dx_i for independent points.
    return isOutermost ? gradResult : gradResult.sum();
  };

  return computeRec(chars.length - 1, inputs, true);
}

window.computeDerivative = computeDerivative;
