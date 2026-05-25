// js/components/piano.js
// ─── Piano interactif — UI clavier + Web Audio API ────────────────────────────
//  Le modèle 3D est le GLB chargé dans museum.js (loadStaticDecoration).
//  Ce module gère uniquement : proximité, prompt, UI clavier, son.
//
//  Intégration :
//    museum.js  → setupPianoAt(x, z)          (enregistre la position du GLB)
//    main.js    → updatePiano(camera)          (détection proximité, chaque frame)
//    main.js    → isPianoActive()              (bloque les déplacements)
//    main.js    → handlePianoKeyE()            (touche E pour activer)

import * as THREE from 'three';

// ─── Constantes ───────────────────────────────────────────────────────────────
const PROXIMITY = 3.0;   // distance (unités monde) pour afficher le prompt

const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    || (window.innerWidth <= 1024 && navigator.maxTouchPoints > 0);

// Notes : id, fréquence Hz, white (blanche/noire), event.code physique,
//         az (label AZERTY), sol (nom solfège)
const NOTES = [
    { id:'C4',  freq:261.63, white:true,  code:'KeyA', az:'Q', sol:'Do'   },
    { id:'Cs4', freq:277.18, white:false, code:'KeyW', az:'Z', sol:'Do♯'  },
    { id:'D4',  freq:293.66, white:true,  code:'KeyS', az:'S', sol:'Ré'   },
    { id:'Ds4', freq:311.13, white:false, code:'KeyE', az:'E', sol:'Ré♯'  },
    { id:'E4',  freq:329.63, white:true,  code:'KeyD', az:'D', sol:'Mi'   },
    { id:'F4',  freq:349.23, white:true,  code:'KeyF', az:'F', sol:'Fa'   },
    { id:'Fs4', freq:369.99, white:false, code:'KeyT', az:'T', sol:'Fa♯'  },
    { id:'G4',  freq:392.00, white:true,  code:'KeyG', az:'G', sol:'Sol'  },
    { id:'Gs4', freq:415.30, white:false, code:'KeyY', az:'Y', sol:'Sol♯' },
    { id:'A4',  freq:440.00, white:true,  code:'KeyH', az:'H', sol:'La'   },
    { id:'As4', freq:466.16, white:false, code:'KeyU', az:'U', sol:'La♯'  },
    { id:'B4',  freq:493.88, white:true,  code:'KeyJ', az:'J', sol:'Si'   },
    { id:'C5',  freq:523.25, white:true,  code:'KeyK', az:'K', sol:'Do'   },
];

const WHITE_NOTES = NOTES.filter(n => n.white);
const BLACK_NOTES = NOTES.filter(n => !n.white);

// Index de la touche blanche à GAUCHE de chaque touche noire (position UI)
const BLACK_LEFT = { Cs4:0, Ds4:1, Fs4:3, Gs4:4, As4:5 };

// ─── État du module ───────────────────────────────────────────────────────────
let _anchorPos   = new THREE.Vector3();  // position monde du piano (fournie par museum.js)
let _active      = false;   // Piano ouvert ?
let _near        = false;   // Joueur proche ?
let _promptEl    = null;    // Div prompt d'approche
let _uiEl        = null;    // Div UI clavier (overlay)
let _keyEls      = {};      // noteId → element DOM de la touche
let _audioCtx    = null;
let _activeNotes = new Map();   // noteId   → { osc, osc2, gain }
let _pointerMap  = new Map();   // pointerId → noteId  (multi-touch)
let _kbDown      = null;
let _kbUp        = null;

export function isPianoActive() { return _active; }

// ─── Enregistre la position du GLB (appelé depuis museum.js) ─────────────────
export function setupPianoAt(x, z) {
    _anchorPos.set(x, 0, z);
}

// ═════════════════════════════════════════════════════════════════════════════
// 1. PROMPT D'APPROCHE
// ═════════════════════════════════════════════════════════════════════════════
function _buildPrompt() {
    if (_promptEl) return;
    _promptEl = document.createElement('div');
    _promptEl.id = 'piano-prompt';
    _promptEl.style.cssText = `
        display:none; position:absolute; bottom:22%; left:50%;
        transform:translateX(-50%) translateY(20px);
        background:rgba(10,10,10,0.93); border:1px solid rgba(212,175,55,0.55);
        border-radius:10px; padding:16px 30px; text-align:center;
        font-family:'Georgia',serif; color:white; z-index:120;
        backdrop-filter:blur(8px); pointer-events:auto; cursor:pointer;
        opacity:0; transition:opacity 0.3s ease, transform 0.3s ease;
        box-shadow:0 0 24px rgba(212,175,55,0.18);
    `;
    _promptEl.innerHTML = `
        <div style="font-size:30px;margin-bottom:6px;">🎹</div>
        <div style="font-size:16px;font-style:italic;margin-bottom:10px;">Piano à queue</div>
        <div style="font-size:12px;color:#d4af37;letter-spacing:2px;text-transform:uppercase;">
            ${isMobile ? 'Toucher pour jouer' : 'E — Jouer du piano'}
        </div>
    `;
    document.body.appendChild(_promptEl);
    _promptEl.addEventListener('click', activatePiano);
}

function _showPrompt() {
    _promptEl.style.display = 'block';
    requestAnimationFrame(() => {
        _promptEl.style.opacity = '1';
        _promptEl.style.transform = 'translateX(-50%) translateY(0)';
    });
}
function _hidePrompt() {
    if (!_promptEl) return;
    _promptEl.style.opacity = '0';
    _promptEl.style.transform = 'translateX(-50%) translateY(20px)';
    setTimeout(() => { if (_promptEl) _promptEl.style.display = 'none'; }, 300);
}

// ═════════════════════════════════════════════════════════════════════════════
// 3. UI CLAVIER (overlay bas d'écran)
// ═════════════════════════════════════════════════════════════════════════════
function _buildUI() {
    if (_uiEl) return;

    _uiEl = document.createElement('div');
    _uiEl.id = 'piano-ui';
    _uiEl.style.cssText = `
        display:none; position:fixed; bottom:0; left:0; right:0;
        background:linear-gradient(to bottom, rgba(6,3,0,0.97) 0%, rgba(14,7,0,1) 100%);
        border-top:1px solid rgba(212,175,55,0.30);
        z-index:500; user-select:none; touch-action:none;
    `;

    // ── Barre titre ──────────────────────────────────────────────────────────
    const bar = document.createElement('div');
    bar.style.cssText = `
        display:flex; justify-content:space-between; align-items:center;
        padding:8px 18px 6px; border-bottom:1px solid rgba(212,175,55,0.16);
    `;
    bar.innerHTML = `
        <div style="display:flex;align-items:center;gap:10px;">
            <span style="font-size:18px;">🎹</span>
            <span style="font-family:'Playfair Display',serif;font-size:14px;
                         color:#d4af37;font-style:italic;letter-spacing:0.5px;">
                Piano à queue
            </span>
        </div>
        <button id="_piano-quit" style="
            background:rgba(212,175,55,0.08); border:1px solid rgba(212,175,55,0.32);
            color:#aaa; padding:5px 14px; border-radius:6px; cursor:pointer;
            font-family:'Georgia',serif; font-size:12px; letter-spacing:1px;
            transition:background 0.2s;
        ">${isMobile ? '✕ Quitter' : 'Échap — Quitter'}</button>
    `;
    _uiEl.appendChild(bar);

    // ── Calcul des dimensions ─────────────────────────────────────────────────
    const gap   = 3;
    const nW    = WHITE_NOTES.length;  // 8
    const maxW  = window.innerWidth - 32;
    const keyW  = Math.min(isMobile ? 50 : 70, Math.floor((maxW - gap * (nW - 1)) / nW));
    const keyH  = isMobile ? 118 : 152;
    const bKeyW = Math.round(keyW * 0.60);
    const bKeyH = Math.round(keyH * 0.62);

    // ── Clavier ───────────────────────────────────────────────────────────────
    const wrap = document.createElement('div');
    wrap.style.cssText = `
        display:flex; justify-content:center;
        padding:14px 0 ${isMobile ? 14 : 18}px;
        height:${keyH + 30}px; overflow:visible; position:relative;
    `;

    const whiteRow = document.createElement('div');
    whiteRow.style.cssText = `display:flex; gap:${gap}px; position:relative;`;

    // Touches blanches
    WHITE_NOTES.forEach(note => {
        const el = document.createElement('div');
        el.dataset.nid = note.id;
        el.style.cssText = `
            width:${keyW}px; height:${keyH}px;
            background:#ede9d9; border:1px solid #b8b0a0;
            border-radius:0 0 7px 7px; cursor:pointer;
            display:flex; flex-direction:column;
            justify-content:flex-end; align-items:center; padding-bottom:8px;
            box-shadow:0 5px 10px rgba(0,0,0,0.55), inset 0 -2px 4px rgba(0,0,0,0.12);
            transition:background 0.07s ease, box-shadow 0.07s ease;
        `;
        el.innerHTML = `
            <span style="font-size:${isMobile ? 11 : 12}px;color:#666;
                         font-family:Georgia,serif;pointer-events:none;">
                ${note.sol}
            </span>
            ${!isMobile
                ? `<span style="font-size:9px;color:#bbb;margin-top:2px;
                               pointer-events:none;">${note.az}</span>`
                : ''}
        `;
        whiteRow.appendChild(el);
        _keyEls[note.id] = el;
    });

    // Touches noires (positionnées en absolu sur whiteRow)
    BLACK_NOTES.forEach(note => {
        const i      = BLACK_LEFT[note.id];             // index blanc à gauche
        const leftPx = (i + 0.5) * (keyW + gap) + keyW / 2 - bKeyW / 2;

        const el = document.createElement('div');
        el.dataset.nid = note.id;
        el.style.cssText = `
            position:absolute; left:${Math.round(leftPx)}px; top:0;
            width:${bKeyW}px; height:${bKeyH}px;
            background:#1c1812; border:1px solid #0a0806;
            border-radius:0 0 5px 5px; cursor:pointer; z-index:2;
            display:flex; flex-direction:column;
            justify-content:flex-end; align-items:center; padding-bottom:5px;
            box-shadow:2px 5px 10px rgba(0,0,0,0.75), inset 0 -1px 3px rgba(255,255,255,0.06);
            transition:background 0.07s ease, box-shadow 0.07s ease;
        `;
        el.innerHTML = !isMobile
            ? `<span style="font-size:9px;color:#666;pointer-events:none;">${note.az}</span>`
            : '';
        whiteRow.appendChild(el);
        _keyEls[note.id] = el;
    });

    wrap.appendChild(whiteRow);
    _uiEl.appendChild(wrap);

    // ── Hint PC ───────────────────────────────────────────────────────────────
    if (!isMobile) {
        const hint = document.createElement('div');
        hint.style.cssText = `
            text-align:center; font-size:10px; color:rgba(212,175,55,0.35);
            letter-spacing:1.5px; padding-bottom:10px;
            font-family:'Georgia',serif; text-transform:uppercase;
        `;
        hint.textContent = 'Maintenez la touche pour sustain · Plusieurs touches simultanées';
        _uiEl.appendChild(hint);
    }

    document.body.appendChild(_uiEl);

    // ── Quitter ───────────────────────────────────────────────────────────────
    _uiEl.querySelector('#_piano-quit').addEventListener('click', deactivatePiano);

    // ── Pointer events (touch + mouse, multi-touch polyphonique) ─────────────
    _uiEl.addEventListener('pointerdown', e => {
        const k = e.target.closest('[data-nid]');
        if (!k) return;
        e.preventDefault();
        k.setPointerCapture(e.pointerId);
        _noteOn(k.dataset.nid);
        _pointerMap.set(e.pointerId, k.dataset.nid);
    });

    _uiEl.addEventListener('pointermove', e => {
        // Glissando : si le doigt glisse sur une autre touche, changer de note
        if (!_pointerMap.has(e.pointerId)) return;
        const under = document.elementFromPoint(e.clientX, e.clientY);
        const k = under && under.closest('[data-nid]');
        if (!k) return;
        const newId = k.dataset.nid;
        const oldId = _pointerMap.get(e.pointerId);
        if (newId !== oldId) {
            _noteOff(oldId);
            _noteOn(newId);
            _pointerMap.set(e.pointerId, newId);
        }
    });

    const _endPointer = e => {
        const id = _pointerMap.get(e.pointerId);
        if (id) { _noteOff(id); _pointerMap.delete(e.pointerId); }
    };
    _uiEl.addEventListener('pointerup',     _endPointer);
    _uiEl.addEventListener('pointercancel', _endPointer);
}

// ═════════════════════════════════════════════════════════════════════════════
// 4. WEB AUDIO API — SYNTHÈSE PIANO (triangle + harmonique)
// ═════════════════════════════════════════════════════════════════════════════
function _getCtx() {
    if (!_audioCtx) _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (_audioCtx.state === 'suspended') _audioCtx.resume();
    return _audioCtx;
}

function _noteOn(id) {
    if (_activeNotes.has(id)) return;  // déjà jouée

    const note = NOTES.find(n => n.id === id);
    if (!note) return;

    const ctx = _getCtx();
    const now = ctx.currentTime;

    // Oscillateur triangle (corps du son piano)
    const osc = ctx.createOscillator();
    osc.type  = 'triangle';
    osc.frequency.setValueAtTime(note.freq, now);

    // Harmonique à l'octave (douceur du timbre)
    const osc2 = ctx.createOscillator();
    osc2.type  = 'sine';
    osc2.frequency.setValueAtTime(note.freq * 2, now);

    const gHarm = ctx.createGain();
    gHarm.gain.setValueAtTime(0.08, now);

    // Enveloppe ADSR — attaque rapide, déclin naturel de piano
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.52, now + 0.006);      // Attack  6 ms
    gain.gain.exponentialRampToValueAtTime(0.22, now + 0.18);  // Decay  180 ms
    // Sustain à 0.22 jusqu'au noteOff

    // Compresseur léger pour équilibrer toutes les notes
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value     = 3.5;
    comp.attack.value    = 0.003;
    comp.release.value   = 0.12;

    osc.connect(gain);
    osc2.connect(gHarm);
    gHarm.connect(gain);
    gain.connect(comp);
    comp.connect(ctx.destination);

    osc.start(now);
    osc2.start(now);

    _activeNotes.set(id, { osc, osc2, gain, ctx });
    _flashKey(id, true);
}

function _noteOff(id) {
    const a = _activeNotes.get(id);
    if (!a) return;

    const { osc, osc2, gain, ctx } = a;
    const now = ctx.currentTime;

    // Release : 300 ms (comme le relâchement d'une touche de piano acoustique)
    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(gain.gain.value, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.30);

    osc.stop(now + 0.31);
    osc2.stop(now + 0.31);

    _activeNotes.delete(id);
    _flashKey(id, false);
}

// ─── Feedback visuel de touche ────────────────────────────────────────────────
function _flashKey(id, pressed) {
    const el = _keyEls[id];
    if (!el) return;
    const isBlack = !NOTES.find(n => n.id === id)?.white;
    if (pressed) {
        el.style.background  = isBlack ? '#c9a01e' : '#ffd94d';
        el.style.boxShadow   = isBlack
            ? 'inset 0 3px 6px rgba(0,0,0,0.5)'
            : '0 1px 4px rgba(0,0,0,0.3), inset 0 3px 4px rgba(0,0,0,0.15)';
    } else {
        el.style.background  = isBlack ? '#1c1812' : '#ede9d9';
        el.style.boxShadow   = isBlack
            ? '2px 5px 10px rgba(0,0,0,0.75), inset 0 -1px 3px rgba(255,255,255,0.06)'
            : '0 5px 10px rgba(0,0,0,0.55), inset 0 -2px 4px rgba(0,0,0,0.12)';
    }
}

// ═════════════════════════════════════════════════════════════════════════════
// 5. ACTIVATION / DÉSACTIVATION
// ═════════════════════════════════════════════════════════════════════════════
export function activatePiano() {
    if (_active) return;
    _active = true;
    _hidePrompt();

    _buildUI();
    _uiEl.style.display = 'block';

    // Clavier physique (PC)
    _kbDown = e => {
        if (e.repeat) return;
        if (e.code === 'Escape') { deactivatePiano(); return; }
        const note = NOTES.find(n => n.code === e.code);
        if (note) { e.preventDefault(); e.stopPropagation(); _noteOn(note.id); }
    };
    _kbUp = e => {
        const note = NOTES.find(n => n.code === e.code);
        if (note) _noteOff(note.id);
    };
    window.addEventListener('keydown', _kbDown, { capture: true });
    window.addEventListener('keyup',   _kbUp,   { capture: true });
}

export function deactivatePiano() {
    if (!_active) return;
    _active = false;

    // Arrêter toutes les notes en cours
    [..._activeNotes.keys()].forEach(_noteOff);
    _pointerMap.clear();

    if (_uiEl) _uiEl.style.display = 'none';

    if (_kbDown) { window.removeEventListener('keydown', _kbDown, { capture: true }); _kbDown = null; }
    if (_kbUp)   { window.removeEventListener('keyup',   _kbUp,   { capture: true }); _kbUp   = null; }
}

// ═════════════════════════════════════════════════════════════════════════════
// 6. MISE À JOUR (appelée chaque frame depuis main.js)
// ═════════════════════════════════════════════════════════════════════════════
export function updatePiano(camera) {
    if (_active) return;

    const isNear = camera.position.distanceTo(_anchorPos) < PROXIMITY;

    if (isNear && !_near) {
        _buildPrompt();
        _showPrompt();
    } else if (!isNear && _near) {
        _hidePrompt();
    }
    _near = isNear;
}

// ── Appelée depuis main.js quand l'utilisateur appuie sur E ──────────────────
export function handlePianoKeyE() {
    if (_near && !_active) activatePiano();
}
