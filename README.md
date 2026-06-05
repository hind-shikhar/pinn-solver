# PINNsolver 🧠⚡

> **Solve any ODE or PDE with a Physics-Informed Neural Network — entirely in your browser.**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Netlify-00C7B7?style=flat-square&logo=netlify)](https://app.netlify.com/start)
[![TensorFlow.js](https://img.shields.io/badge/TensorFlow.js-4.15-FF6F00?style=flat-square&logo=tensorflow)](https://www.tensorflow.org/js)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue?style=flat-square)](LICENSE)

PINNsolver is a browser-based tool that trains a neural network to satisfy your differential equation and its boundary conditions — no Python, no server, no install required. All computation runs on your GPU via WebGL (or WebGPU where available).

---

## 🚀 Quick Start

```bash
# Option 1: npx serve (Node.js)
npx serve .

# Option 2: Python built-in server
python -m http.server 8080

# Option 3: npm script
npm start
```

Then open **http://localhost:3000** (or 8080 for Python).

---

## 📐 Equation Notation

| Notation | Meaning | Example |
|---|---|---|
| `u_x` | ∂u/∂x | `u_x + u = 0` |
| `u_t` | ∂u/∂t | `u_t - alpha * u_xx = 0` |
| `u_xx` | ∂²u/∂x² | heat, wave, Poisson |
| `u_yy` | ∂²u/∂y² | 2D elliptic PDEs |
| `u_tt` | ∂²u/∂t² | wave equation |
| `u_xt` | ∂²u/∂x∂t | mixed derivative |

Built-in functions: `sin`, `cos`, `exp`, `log`, `sqrt`, `tanh`, `pi`

Parameters are user-defined (e.g. `alpha`, `nu`, `k`) and set in the parameter table.

---

## 📦 9 Built-in Presets

| Preset | Type | Equation |
|---|---|---|
| **Exponential Decay** | ODE | `u_t + λ·u = 0` |
| **Harmonic Oscillator** | ODE | `u_tt + ω²·u = 0` |
| **Logistic Growth** | ODE | `u_t - r·u·(1 - u/K) = 0` |
| **Heat Equation** | PDE 1D+t | `u_t - α·u_xx = 0` |
| **Burgers' Equation** | PDE 1D+t | `u_t + u·u_x - ν·u_xx = 0` |
| **Wave Equation** | PDE 1D+t | `u_tt - c²·u_xx = 0` |
| **Helmholtz Equation** | PDE 2D | `u_xx + u_yy + k²·u = 0` |
| **Allen-Cahn** | PDE 1D+t | `u_t - ε·u_xx + u³ - u = 0` |
| **Poisson Equation** | PDE 2D | `u_xx + u_yy + f(x,y) = 0` |

ODE presets also show the **exact analytical solution** overlaid on the PINN prediction.

---

## 🏗️ Architecture

```
pde-pinn-starter/
├── index.html          # Landing page
├── solver.html         # Main solver application
├── about.html          # Learn page (PINN theory)
├── css/
│   └── style.css       # Design system (dark theme, glassmorphism)
└── js/
    ├── diff-utils.js   # Shared automatic differentiation (tf.grad)
    ├── eq-parser.js    # Equation → TF residual function
    ├── bc-parser.js    # Boundary condition enforcement
    ├── pinn.js         # Neural network + training loop
    ├── visualizer.js   # Plotly charts (solution, loss, residual)
    └── app.js          # UI orchestration, state, presets, export
```

### Key Technical Details

- **Automatic Differentiation**: Uses recursive `tf.grad` closures (NOT `tf.grads`) to keep the full computation chain visible to the outer `variableGrads` tape — this is essential for PINN training.
- **Fourier Feature Embedding**: Optional `[cos(2πBx), sin(2πBx)]` input lifting dramatically improves accuracy for high-frequency solutions (Wave, Burgers', Helmholtz). Toggle via the UI checkbox.
- **LR Decay**: Exponential `lr(t) = lr₀ · e^(−decay · t/T)` — helps convergence in the final training phase.
- **WebGPU**: Automatically preferred over WebGL when available (2–5× faster on Chrome 113+).

---

## ⚙️ Hyperparameter Guide

| Parameter | Default | Tips |
|---|---|---|
| Hidden Layers | 4 | Use 4–6 for most PDEs |
| Neurons/Layer | 32 | 32–64; larger = slower but more expressive |
| Activation | tanh | tanh is best for smooth PDEs; sin for oscillatory |
| Learning Rate | 0.001 | 0.001–0.005 is typical |
| LR Decay | 0.0005 | Increase to 0.001–0.003 for stiff problems |
| Epochs | 3000 | 2000 minimum; 5000+ for hard PDEs |
| Interior Points | 1000 | 2000+ for 2D PDEs |
| Physics Weight | 1 | Increase if PDE residual dominates |
| BC Weight | 10 | High BC weight ensures boundary conditions are satisfied |
| Fourier Features | off | Enable for oscillatory/multiscale solutions |

---

## 📤 Export

After training completes, an export toolbar appears:
- **⬇ CSV** — downloads a grid of `(x, t, u)` values
- **💾 Model** — saves trained TF.js model weights to Downloads
- **📋 Config** — copies the full equation + hyperparameters to clipboard as JSON

---

## 🌐 Deploy

### Netlify (drag & drop — easiest)
1. Go to [app.netlify.com/drop](https://app.netlify.com/drop)
2. Drag the `pde-pinn-starter/` folder onto the page
3. Done — you get a live HTTPS URL instantly

### Vercel
```bash
npm install -g vercel
vercel --prod
```

### GitHub Pages
1. Push to a GitHub repo
2. Settings → Pages → Source → main branch
3. Live at `https://username.github.io/repo-name`

---

## ⚠️ Known Limitations

- **Convergence is not guaranteed** — PINNs can fail on stiff problems or with poor hyperparameters. Increase epochs, neurons, or BC weight if results are poor.
- **2D+time PDEs** (3 input variables) are not yet supported.
- **Neumann BCs** on the derivative direction must match the variable being differentiated.
- Training speed depends on your GPU. WebGPU (Chrome 113+) is significantly faster than WebGL.

---

## 📄 License

MIT — free to use, modify, and distribute.
