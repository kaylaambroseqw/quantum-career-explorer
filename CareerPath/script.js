/* ============================================================
   QUANTUM CAREER PATH EXPLORER — script.js
   Interactive features: filters, modal, canvas, animations
   ============================================================ */

/* ── STATE ──────────────────────────────────────────────────── */
let selectedRoleId = 'csm';
let activeModal    = null;
let activeScenario = null;

// Self-selected roles: { roleId: { vertical: [], lateral: [], crossDept: [] } }
const customNextSteps = {};

/* ── NAVIGATION & COMPARISON STATE ─────────────────────────── */
let modalHistory       = [];        // [{id, mode}, ...] for back button
let _skipHistoryPush   = false;     // prevents double-push during back nav
const comparisonRoles  = new Set(); // role IDs toggled for comparison
let comparisonIdx      = 0;         // current index in comparison cycle

let constellationExplore   = false; // "Explore All" click-navigate mode
let constellationHistory   = [];    // history stack for constellation back button
let constellationCurrentId = null;  // current center role in explore mode

/* ── EXPLORE-ALL ZOOM STATE ─────────────────────────────────── */
let exploreZoomed      = false;   // true when zoomed into a role in Explore All
let exploreSelectedId  = null;    // role currently zoomed to
let _eaRolePos         = {};      // cached role positions from last renderExploreAll
let _eaDeptColor       = {};      // cached dept colors from last renderExploreAll
let _eaCanvasW         = 1400;    // canvas width for current explore-all render
let _eaCanvasH         = 1120;    // canvas height for current explore-all render
let _eaPreRoleZoomVB   = null;    // viewBox before role-zoom, restored on zoom-out

/* ── CAREER PATHWAY CANVAS ──────────────────────────────────── */
(function () {
  const canvas = document.getElementById('latticeCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const C = {
    // QW Brand: current node / CTAs
    accent:     '#E3530F',   // QW Orange
    accent2:    '#FF7500',   // Accent Orange
    accentSoft: '#FEF0E7',
    // QW Brand: vertical moves
    darkBlue:   '#003B75',   // QW Dark Blue
    darkBlueSoft:'#E6EDF5',
    // QW Brand: lateral moves
    medBlue:    '#0077CD',   // Medium Blue
    medBlueSoft:'#E6F2FB',
    // Ink / surfaces
    ink:        '#24272C',   // Dark Gray
    inkSoft:    '#555960',   // Medium Gray
    inkFaint:   '#898D96',   // Light Gray
    surface:    '#ffffff',
    surface2:   '#F5F6F8',
    surface3:   '#C7C9D4',
  };

  // Node definitions — x/y are 0–1 fractions of canvas size
  // Layout: vertical moves top, lateral side-to-side, cross-dept cornerwise
  const nodes = [
    {
      id: 'csm', label: 'Customer Success\nManager', sublabel: 'You · IC · Mid-Senior',
      x: .20, y: .52, w: 148, h: 52,
      bg: C.accent, border: C.accent, text: '#fff', subtext: 'rgba(255,255,255,.72)',
      current: true,
    },
    {
      id: 'senior-csm', label: 'Senior CSM', sublabel: '↑ Vertical · ~18–24 mo',
      x: .48, y: .16, w: 138, h: 48,
      bg: C.darkBlueSoft, border: C.darkBlue, text: C.darkBlue, subtext: C.medBlue,
    },
    {
      id: 'csm-manager', label: 'CSM Manager', sublabel: '↑ People Leadership',
      x: .78, y: .16, w: 138, h: 48,
      bg: C.darkBlueSoft, border: C.darkBlue, text: C.darkBlue, subtext: C.medBlue,
    },
    {
      id: 'partnership-success-manager', label: 'Partnership\nSuccess Manager', sublabel: '↔ Lateral · Same level',
      x: .78, y: .52, w: 138, h: 48,
      bg: C.medBlueSoft, border: C.medBlue, text: C.darkBlue, subtext: C.medBlue,
    },
    {
      id: 'account-executive', label: 'Account Executive', sublabel: '⟺ Cross-dept · Sales',
      x: .65, y: .84, w: 138, h: 48,
      bg: C.accentSoft, border: C.accent2, text: '#7A2700', subtext: C.accent,
    },
  ];

  const edges = [
    { from: 0, to: 1, type: 'vertical'  },
    { from: 0, to: 2, type: 'vertical'  },
    { from: 0, to: 3, type: 'lateral'   },
    { from: 0, to: 4, type: 'crossdept' },
  ];

  let W, H, hoveredNode = null, t = 0;

  function resize() {
    const dpr  = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width  = rect.width  * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    W = rect.width;
    H = rect.height;
  }

  function nodeRect(node) {
    return {
      x: node.x * W - node.w / 2,
      y: node.y * H - node.h / 2,
      w: node.w,
      h: node.h,
    };
  }

  function hitTest(mx, my) {
    for (let i = nodes.length - 1; i >= 0; i--) {
      const { x, y, w, h } = nodeRect(nodes[i]);
      if (mx >= x && mx <= x + w && my >= y && my <= y + h) return i;
    }
    return null;
  }

  function drawEdge(edge) {
    const a = nodeRect(nodes[edge.from]);
    const b = nodeRect(nodes[edge.to]);
    const aCx = a.x + a.w / 2, aCy = a.y + a.h / 2;
    const bCx = b.x + b.w / 2, bCy = b.y + b.h / 2;
    const dy = bCy - aCy;

    let ax, ay, bx, by, cp1x, cp1y, cp2x, cp2y;

    if (dy < -20) {
      // Destination is above — exit top-center, enter bottom-center
      ax = aCx; ay = a.y;
      bx = bCx; by = b.y + b.h;
      cp1x = ax + (bx - ax) * 0.3; cp1y = ay - 50;
      cp2x = bx;                    cp2y = by + 50;
    } else if (dy > 20) {
      // Destination is below (cross-dept corner) — exit bottom-right, enter left
      ax = a.x + a.w * 0.85; ay = a.y + a.h;
      bx = b.x;              by = bCy;
      cp1x = ax + 20; cp1y = ay + 30;
      cp2x = bx - 30; cp2y = by;
    } else {
      // Roughly horizontal (lateral) — exit right, enter left
      ax = a.x + a.w; ay = aCy;
      bx = b.x;       by = bCy;
      const cpx = ax + (bx - ax) * 0.5;
      cp1x = cpx; cp1y = ay;
      cp2x = cpx; cp2y = by;
    }

    const colors = { vertical: C.darkBlue, lateral: C.medBlue, crossdept: C.accent };
    const dashes = { vertical: [], lateral: [5, 4], crossdept: [3, 5] };

    ctx.save();
    ctx.strokeStyle = colors[edge.type];
    ctx.lineWidth   = 1.5;
    ctx.globalAlpha = 0.35;
    ctx.setLineDash(dashes[edge.type]);
    ctx.lineDashOffset = -t * (edge.type === 'vertical' ? 0.5 : 0.3);
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, bx, by);
    ctx.stroke();

    // Arrowhead — angle based on final bezier tangent
    ctx.globalAlpha = 0.5;
    ctx.setLineDash([]);
    const angle = Math.atan2(by - cp2y, bx - cp2x);
    ctx.translate(bx, by);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-8, -4);
    ctx.lineTo(-8,  4);
    ctx.closePath();
    ctx.fillStyle = colors[edge.type];
    ctx.fill();
    ctx.restore();
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function drawNode(node, i) {
    const { x, y, w, h } = nodeRect(node);
    const isHovered = hoveredNode === i;
    const r = 10;

    // Pulse glow on current node
    if (node.current) {
      const pulse = Math.sin(t * 0.04) * 0.5 + 0.5;
      ctx.save();
      ctx.globalAlpha = 0.12 + pulse * 0.08;
      ctx.fillStyle = C.accent;
      roundRect(x - 8, y - 8, w + 16, h + 16, r + 6);
      ctx.fill();
      ctx.restore();
    }

    // Shadow on hover
    if (isHovered) {
      ctx.save();
      ctx.shadowColor = node.border;
      ctx.shadowBlur = 16;
      roundRect(x, y, w, h, r);
      ctx.fillStyle = node.bg;
      ctx.fill();
      ctx.restore();
    }

    // Card fill
    roundRect(x, y, w, h, r);
    ctx.fillStyle = node.bg;
    ctx.fill();

    // Border
    ctx.save();
    ctx.strokeStyle = node.border;
    ctx.lineWidth   = isHovered ? 2 : 1.5;
    roundRect(x, y, w, h, r);
    ctx.stroke();
    ctx.restore();

    // Label (possibly two lines)
    const lines = node.label.split('\n');
    const lineH = 14;
    const totalTextH = lines.length * lineH + (node.sublabel ? 13 : 0);
    let ty = y + (h - totalTextH) / 2 + lineH * 0.8;

    ctx.save();
    ctx.font = `600 12px Inter, system-ui, sans-serif`;
    ctx.fillStyle = node.text;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    lines.forEach(line => {
      ctx.fillText(line, x + w / 2, ty);
      ty += lineH;
    });

    // Sublabel
    if (node.sublabel) {
      ctx.font = `500 10px Inter, system-ui, sans-serif`;
      ctx.fillStyle = node.subtext;
      ctx.fillText(node.sublabel, x + w / 2, ty + 2);
    }
    ctx.restore();
  }

  function drawLegend() {
    const items = [
      { color: C.darkBlue, dash: [],    label: '↑ Vertical'   },
      { color: C.medBlue,  dash: [4,3], label: '↔ Lateral'    },
      { color: C.accent,   dash: [2,4], label: '⟺ Cross-dept' },
    ];
    const startX = 10, startY = H - 18;
    ctx.font = '500 10px Inter, system-ui, sans-serif';
    ctx.textBaseline = 'middle';
    let cx = startX;
    items.forEach(item => {
      ctx.save();
      ctx.strokeStyle = item.color;
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = 0.75;
      ctx.setLineDash(item.dash);
      ctx.beginPath();
      ctx.moveTo(cx, startY);
      ctx.lineTo(cx + 16, startY);
      ctx.stroke();
      ctx.restore();
      ctx.fillStyle = C.inkFaint;
      ctx.textAlign = 'left';
      ctx.fillText(item.label, cx + 20, startY);
      cx += ctx.measureText(item.label).width + 36;
    });
  }

  function draw() {
    resize();
    ctx.clearRect(0, 0, W, H);

    // Background
    ctx.fillStyle = C.surface2;
    ctx.fillRect(0, 0, W, H);

    // Subtle grid dots
    ctx.fillStyle = C.surface3;
    for (let gx = 16; gx < W; gx += 24)
      for (let gy = 16; gy < H; gy += 24) {
        ctx.beginPath();
        ctx.arc(gx, gy, 1, 0, Math.PI * 2);
        ctx.fill();
      }

    edges.forEach(drawEdge);
    nodes.forEach(drawNode);
    drawLegend();
    t++;
    requestAnimationFrame(draw);
  }

  // Interactions
  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    hoveredNode = hitTest(e.clientX - rect.left, e.clientY - rect.top);
    canvas.style.cursor = hoveredNode !== null ? 'pointer' : 'default';
  });

  canvas.addEventListener('mouseleave', () => { hoveredNode = null; });

  canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const idx  = hitTest(e.clientX - rect.left, e.clientY - rect.top);
    if (idx !== null && QW_ROLES[nodes[idx].id]) openModal(nodes[idx].id);
  });

  draw();
})();

/* ── MODAL SYSTEM ───────────────────────────────────────────── */
function buildModalHTML(roleId, mode = 'explore') {
  const role = QW_ROLES[roleId];
  if (!role) return '';

  const moveTypeBadge = (label, color) =>
    `<span class="move-type-pill move-type-${color}">${label}</span>`;

  const nextStepsHTML = () => {
    const { vertical = [], lateral = [], crossDept = [] } = role.next || {};
    const custom = customNextSteps[roleId] || {};
    const customVertical  = custom.vertical  || [];
    const customLateral   = custom.lateral   || [];
    const customCrossDept = custom.crossDept || [];

    if (!vertical.length && !lateral.length && !crossDept.length &&
        !customVertical.length && !customLateral.length && !customCrossDept.length)
      return '<p class="modal-empty">Highest level in this track.</p>';

    const section = (type, icon, heading, ids, customIds, allowAdd) => {
      const allIds = ids.filter(id => QW_ROLES[id]);
      // Chips with compare toggle
      const chip = (id, isCustom) => {
        const label = QW_ROLES[id]?.title || id;
        const inCmp = comparisonRoles.has(id);
        const removeSpan = isCustom
          ? `<span class="next-step-remove" onclick="removeCustomNext(event,'${roleId}','${type}','${id}')" title="Remove">×</span>`
          : '';
        const chipClass = isCustom ? 'next-step-custom' : `next-step-${type}`;
        return `<span class="chip-wrap">
          <button class="next-step-chip ${chipClass}${inCmp ? ' chip-comparing' : ''}" onclick="openModal('${id}')" title="View ${label}">${icon} ${label}${removeSpan}</button>
          <button class="chip-cmp-btn${inCmp ? ' active' : ''}" onclick="toggleCompare('${id}',event)" title="${inCmp ? 'Remove from compare' : 'Add to compare'}">⊕</button>
        </span>`;
      };
      const recChips  = allIds.map(id => chip(id, false)).join('');
      const custChips = customIds.map(id => chip(id, true)).join('');
      if (!allIds.length && !customIds.length && !allowAdd) return '';
      const addBtn = allowAdd
        ? `<button class="next-step-add-btn" onclick="openCustomRolePicker('${roleId}','${type}',this)" title="Add a role you're interested in">＋</button>`
        : '';
      return `
        <div class="next-steps-group">
          <div class="next-steps-group-header">
            <p class="next-steps-group-label">${heading}</p>
            ${addBtn}
          </div>
          <div class="next-steps-group-chips">${recChips}${custChips}</div>
        </div>`;
    };

    const groups = [
      section('vertical',  '↑', 'Vertical paths',                 vertical,  customVertical,  true),
      section('lateral',   '↔', 'Lateral moves',                  lateral,   customLateral,   true),
      section('crossdept', '⟺', 'Cross-department opportunities', crossDept, customCrossDept, true),
    ].join('');

    // Comparison bar — shows when 1+ role is toggled
    const cmpBar = comparisonRoles.size > 0 ? (() => {
      const cmpList = [...comparisonRoles];
      const currentInCmp = cmpList.includes(activeModal?.id);
      return `<div class="compare-bar">
        <span class="compare-bar-label">↔ Comparing ${comparisonRoles.size} role${comparisonRoles.size !== 1 ? 's' : ''}:</span>
        <div class="compare-bar-chips">
          ${cmpList.map(id => `<span class="compare-mini-chip${activeModal?.id === id ? ' current' : ''}">
            <span class="cmp-chip-label" onclick="openModal('${id}')">${QW_ROLES[id]?.title || id}</span>
            <span class="cmp-chip-x" onclick="toggleCompare('${id}',event)" title="Remove">×</span>
          </span>`).join('')}
        </div>
        <div class="compare-bar-nav">
          <button class="cmp-nav-btn" onclick="navigateComparison(-1)" title="Previous">←</button>
          <button class="cmp-nav-btn" onclick="navigateComparison(1)"  title="Next">→</button>
          <button class="cmp-clear-btn" onclick="clearComparison()">✕ Clear</button>
        </div>
      </div>`;
    })() : '';

    return groups + cmpBar;
  };

  const trackBadge = role.track === 'Management'
    ? `<span class="track-badge track-mgmt">Management Track</span>`
    : `<span class="track-badge track-ic">IC Track</span>`;

  // Back button: visible when there's navigation history
  const backInfo = modalHistory.length > 0 ? modalHistory[modalHistory.length - 1] : null;
  const backBtn  = backInfo
    ? `<button class="modal-back-btn" onclick="goBackInModal()">← ${QW_ROLES[backInfo.id]?.title || 'Back'}</button>`
    : '';

  return `
    <div class="modal-header">
      <div class="modal-header-left">
        ${backBtn}
        <p class="modal-dept">${role.dept}</p>
        <h2 class="modal-title">${role.fullTitle}</h2>
        <div class="modal-meta">
          ${trackBadge}
        </div>
      </div>
      <button class="modal-close" onclick="closeModal()" aria-label="Close">✕</button>
    </div>

    <div class="modal-tabs" role="tablist">
      <button class="modal-tab active" data-tab="overview"        onclick="switchTab(this, 'overview')">Overview</button>
      <button class="modal-tab"        data-tab="competencies"  onclick="switchTab(this, 'competencies')">Competencies</button>
      <button class="modal-tab"        data-tab="manager-input" onclick="switchTab(this, 'manager-input')">Manager Input</button>
      <button class="modal-tab"        data-tab="next"          onclick="switchTab(this, 'next')">Next steps</button>
    </div>

    <div class="modal-body">
      <div class="modal-panel active" data-panel="overview">
        <p class="modal-overview-text">${role.overview}</p>
      </div>

      <div class="modal-panel" data-panel="competencies">
        <ul class="modal-list">
          ${(role.competencies || []).map(c => `<li>${c}</li>`).join('')}
        </ul>
      </div>

      <div class="modal-panel" data-panel="manager-input">
        <p class="modal-overview-text modal-manager-placeholder">We're still building this out — but you'll see what makes a great Qwirk in this role right here. Stay tuned.</p>
      </div>

      <div class="modal-panel" data-panel="next">
        ${nextStepsHTML()}
      </div>
    </div>

    <div class="modal-footer">
      ${mode === 'plan'
        ? `<button class="modal-explore-btn modal-plan-btn" onclick="openDevPlanner('${roleId}')">Let's plan →</button>`
        : mode === 'restart'
          ? `<button class="modal-explore-btn modal-restart-btn" onclick="startOver()">← Let's start over</button>`
          : `<button class="modal-explore-btn" onclick="exploreRole('${roleId}')">Let's explore →</button>`
      }
    </div>
  `;
}

function exploreRole(roleId) {
  closeModal();
  selectedRoleId = roleId;
  renderStep2(roleId);
}

/* ── CUSTOM NEXT STEPS ──────────────────────────────────────── */
function removeCustomNext(event, roleId, type, targetId) {
  event.stopPropagation();
  if (!customNextSteps[roleId]) return;
  const arr = customNextSteps[roleId][type];
  if (!arr) return;
  const idx = arr.indexOf(targetId);
  if (idx !== -1) arr.splice(idx, 1);
  // Re-render the modal's next panel in place
  const panel = document.querySelector('[data-panel="next"]');
  if (panel) {
    const box = document.getElementById('modalBox');
    if (box) {
      box.innerHTML = buildModalHTML(roleId, activeModal?.mode || 'explore');
      // Switch back to next tab
      const nextTab = box.querySelector('[data-tab="next"]');
      if (nextTab) switchTab(nextTab, 'next');
    }
  }
}

function openCustomRolePicker(roleId, type, btn) {
  // Close any existing picker
  document.querySelectorAll('.custom-role-picker').forEach(p => p.remove());

  const existing = [
    ...(QW_ROLES[roleId]?.next?.vertical  || []),
    ...(QW_ROLES[roleId]?.next?.lateral   || []),
    ...(QW_ROLES[roleId]?.next?.crossDept || []),
    ...((customNextSteps[roleId]?.vertical)  || []),
    ...((customNextSteps[roleId]?.lateral)   || []),
    ...((customNextSteps[roleId]?.crossDept) || []),
    roleId,
  ];

  // Build list of all roles except already-listed ones
  const allRoles = Object.values(QW_ROLES)
    .filter(r => !existing.includes(r.id))
    .sort((a, b) => a.title.localeCompare(b.title));

  const picker = document.createElement('div');
  picker.className = 'custom-role-picker';
  picker.innerHTML = `
    <div class="crp-header">
      <input class="crp-search" placeholder="Search roles…" autocomplete="off" />
      <button class="crp-close" onclick="this.closest('.custom-role-picker').remove()">✕</button>
    </div>
    <ul class="crp-list"></ul>
  `;

  const renderList = (filter) => {
    const ul = picker.querySelector('.crp-list');
    const filtered = allRoles.filter(r =>
      r.title.toLowerCase().includes(filter.toLowerCase()) ||
      r.dept.toLowerCase().includes(filter.toLowerCase())
    ).slice(0, 8);
    ul.innerHTML = filtered.map(r =>
      `<li class="crp-item" data-id="${r.id}">
        <span class="crp-item-title">${r.title}</span>
        <span class="crp-item-dept">${r.dept}</span>
      </li>`
    ).join('') || '<li class="crp-no-results">No roles found</li>';

    ul.querySelectorAll('.crp-item').forEach(li => {
      li.addEventListener('click', () => {
        const targetId = li.dataset.id;
        if (!customNextSteps[roleId]) customNextSteps[roleId] = {};
        if (!customNextSteps[roleId][type]) customNextSteps[roleId][type] = [];
        if (!customNextSteps[roleId][type].includes(targetId)) {
          customNextSteps[roleId][type].push(targetId);
        }
        picker.remove();
        // Re-render modal
        const box = document.getElementById('modalBox');
        if (box) {
          box.innerHTML = buildModalHTML(roleId, activeModal?.mode || 'explore');
          const nextTab = box.querySelector('[data-tab="next"]');
          if (nextTab) switchTab(nextTab, 'next');
        }
      });
    });
  };

  renderList('');
  picker.querySelector('.crp-search').addEventListener('input', e => renderList(e.target.value));

  // Position below the + button
  btn.closest('.next-steps-group').appendChild(picker);
  picker.querySelector('.crp-search').focus();

  // Close on outside click
  setTimeout(() => {
    document.addEventListener('click', function handler(e) {
      if (!picker.contains(e.target)) {
        picker.remove();
        document.removeEventListener('click', handler);
      }
    });
  }, 50);
}

function startOver() {
  closeModal();
  selectedRoleId = null;
  selectedTargetRoleId = null;
  // Reset explore mode
  constellationExplore   = false;
  constellationCurrentId = null;
  constellationHistory   = [];
  exploreZoomed          = false;
  exploreSelectedId      = null;
  comparisonRoles.clear();
  document.getElementById('constellationStage')?.classList.remove('explore-mode');
  // Hide downstream steps
  ['step2', 'step3', 'step4'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
  // Clear selected card state
  document.querySelectorAll('.role-card-selected').forEach(c => c.classList.remove('role-card-selected'));
  document.querySelectorAll('.role-card-badge').forEach(b => b.remove());
  // Scroll to Step 1
  const step1 = document.getElementById('experience');
  if (step1) step1.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

let selectedTargetRoleId = null;

function openDevPlanner(targetRoleId) {
  closeModal();
  selectedTargetRoleId = targetRoleId;
  renderDevPlanner(selectedRoleId, targetRoleId);
}

/* ── STEP 4: DEVELOPMENT PLANNER ───────────────────────────── */
function renderDevPlanner(sourceId, targetId) {
  const source = QW_ROLES[sourceId];
  const target = QW_ROLES[targetId];
  const section = document.getElementById('step4');
  if (!section || !source || !target) return;

  // Determine move type
  const moveType = (source.next?.vertical || []).includes(targetId) ? 'vertical'
    : (source.next?.lateral || []).includes(targetId) ? 'lateral'
    : 'crossDept';

  // Update header
  document.getElementById('dpSourceRole').textContent = source.title;
  document.getElementById('dpTargetRole').textContent = target.title;

  // ── Skill gap — deterministic % based on competency + source overlap
  function hashPct(str, base, range) {
    let h = 0;
    for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
    return base + (h % range);
  }
  const sourceCompSet = new Set((source.competencies || []).map(c => c.split(' ')[0].toLowerCase()));
  const gapRows = (target.competencies || []).slice(0, 6).map(comp => {
    const keyword = comp.split(' ')[0].toLowerCase();
    const overlap = sourceCompSet.has(keyword);
    const pct = overlap ? hashPct(comp + sourceId, 62, 28) : hashPct(comp + sourceId, 18, 38);
    const cls  = pct >= 65 ? 'skill-bar-high' : pct >= 40 ? 'skill-bar-med' : 'skill-bar-low';
    const label = pct >= 65 ? 'Strong' : pct >= 40 ? 'Developing' : 'Gap';
    return `<div class="skill-bar-row">
      <span class="skill-name">${comp}</span>
      <div class="skill-bar-track"><div class="skill-bar-fill ${cls}" style="--w:${pct}%"></div></div>
      <span class="skill-pct skill-pct-${cls.replace('skill-bar-','')}">${pct}%</span>
    </div>`;
  }).join('');
  document.getElementById('dpSkillGap').innerHTML = gapRows || '<p style="color:var(--ink-faint);font-style:italic">No competency data for this role yet.</p>';

  // ── Manager conversation starters
  const targetDept  = target.dept || '';
  const targetTitle = target.title;
  const starters = {
    vertical: [
      `"I'd like to discuss what it would take to grow into ${targetTitle} — what would you want to see from me over the next 12–18 months?"`,
      `"What competencies should I prioritize right now to be ready for the ${targetTitle} expectations?"`,
      `"Can we build a development plan together that maps directly to the ${targetTitle} role?"`,
      `"How am I tracking on the skills that matter most for leveling up into ${targetTitle}?"`,
    ],
    lateral: [
      `"I've been thinking about a lateral move to ${targetTitle}. Would you help me evaluate whether my skills translate well?"`,
      `"What would a transition to ${targetTitle} realistically look like, and how long does it typically take?"`,
      `"Are there stretch projects that could give me hands-on exposure to the ${targetDept} team?"`,
      `"I want to make sure a move to ${targetTitle} sets me up for long-term growth — what would you suggest I learn first?"`,
    ],
    crossDept: [
      `"I've been thinking about how my skills could transfer to ${targetTitle} in ${targetDept}. Can we explore that together?"`,
      `"What would I need to demonstrate in my current role to be a strong candidate for ${targetTitle}?"`,
      `"Are there cross-functional projects where I could work alongside the ${targetDept} team?"`,
      `"I'd love to build a 12-month roadmap toward ${targetTitle}. Can we start that conversation?"`,
    ],
  };
  const starterList = starters[moveType] || starters.vertical;
  document.getElementById('dpConvoStarters').innerHTML = starterList
    .map(s => `<div class="dp-convo-item">${s}</div>`).join('');

  // ── Action buttons
  const bookmarkBtn = document.getElementById('dpBookmark');
  const saveBtn     = document.getElementById('dpSave');
  const exportBtn   = document.getElementById('dpExport');

  if (bookmarkBtn) {
    let bookmarked = false;
    bookmarkBtn.onclick = () => {
      bookmarked = !bookmarked;
      bookmarkBtn.textContent = bookmarked ? '✓ Bookmarked' : '🔖 Bookmark this role';
      bookmarkBtn.classList.toggle('dp-action-done', bookmarked);
    };
  }
  if (saveBtn) {
    let saved = false;
    saveBtn.onclick = () => {
      saved = !saved;
      saveBtn.textContent = saved ? '✓ Pathway saved — click to unsave' : '💾 Save this pathway';
      saveBtn.classList.toggle('dp-action-done', saved);
    };
  }
  if (exportBtn) exportBtn.onclick = () => {
    const lines = [
      `DEVELOPMENT PLAN — ${source.title} → ${target.title}`,
      `Generated: ${new Date().toLocaleDateString()}`,
      '',
      '── GOAL ──',
      `Move from ${source.title} to ${target.title} (${moveType === 'vertical' ? 'Vertical' : moveType === 'lateral' ? 'Lateral' : 'Cross-Department'} path)`,
      '',
      '── COMPETENCIES TO DEVELOP ──',
      ...(target.competencies || []).slice(0, 6).map(c => `• ${c}`),
      '',
      '── CONVERSATION STARTER ──',
      starterList[0].replace(/^"|"$/g, ''),
    ].join('\n');
    navigator.clipboard?.writeText(lines).then(() => {
      exportBtn.textContent = '✓ Copied to clipboard';
      exportBtn.classList.add('dp-action-done');
      setTimeout(() => {
        exportBtn.textContent = '📤 Export goals to manager';

        exportBtn.classList.remove('dp-action-done');
      }, 3000);
    });
  };

  // Show and scroll
  section.style.display = '';
  requestAnimationFrame(() => section.scrollIntoView({ behavior: 'smooth', block: 'start' }));
}

function openModal(roleId, mode = 'explore') {
  const role = QW_ROLES[roleId];
  if (!role) return;

  // Push current modal to history for back navigation (unless this is a back nav)
  if (!_skipHistoryPush && activeModal && activeModal.id !== roleId) {
    modalHistory.push({ id: activeModal.id, mode: activeModal.mode });
  }
  _skipHistoryPush = false;

  let overlay = document.getElementById('modal-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'modal-overlay';
    overlay.className = 'modal-overlay';
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal();
    });
    document.body.appendChild(overlay);
  }

  overlay.innerHTML = `<div id="modalBox" class="modal-box" role="dialog" aria-modal="true">${buildModalHTML(roleId, mode)}</div>`;
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
  activeModal = { id: roleId, mode };

  // Focus first focusable element
  requestAnimationFrame(() => {
    const closeBtn = overlay.querySelector('.modal-close');
    if (closeBtn) closeBtn.focus();
  });
}

function closeModal() {
  modalHistory = [];
  const overlay = document.getElementById('modal-overlay');
  if (overlay) {
    overlay.classList.remove('open');
    document.body.style.overflow = '';
    activeModal = null;
  }
}

function goBackInModal() {
  if (modalHistory.length === 0) return;
  const prev = modalHistory.pop();
  _skipHistoryPush = true;
  openModal(prev.id, prev.mode);
}

function switchTab(btn, tabName) {
  const box = btn.closest('.modal-box');
  box.querySelectorAll('.modal-tab').forEach(t => t.classList.remove('active'));
  box.querySelectorAll('.modal-panel').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  const panel = box.querySelector(`[data-panel="${tabName}"]`);
  if (panel) panel.classList.add('active');
}

// Keyboard close
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && activeModal) closeModal();
});

/* ── COMPARISON HELPERS ─────────────────────────────────────── */
function toggleCompare(roleId, evt) {
  if (evt) evt.stopPropagation();
  if (comparisonRoles.has(roleId)) {
    comparisonRoles.delete(roleId);
  } else {
    comparisonRoles.add(roleId);
    comparisonIdx = [...comparisonRoles].indexOf(roleId);
  }
  // Re-render the current modal in-place (staying on Next Steps tab)
  const box = document.getElementById('modalBox');
  if (box && activeModal) {
    box.innerHTML = buildModalHTML(activeModal.id, activeModal.mode);
    const nextTab = box.querySelector('[data-tab="next"]');
    if (nextTab) switchTab(nextTab, 'next');
  }
}

function clearComparison() {
  comparisonRoles.clear();
  comparisonIdx = 0;
  const box = document.getElementById('modalBox');
  if (box && activeModal) {
    box.innerHTML = buildModalHTML(activeModal.id, activeModal.mode);
    const nextTab = box.querySelector('[data-tab="next"]');
    if (nextTab) switchTab(nextTab, 'next');
  }
}

function navigateComparison(dir) {
  const roles = [...comparisonRoles];
  if (roles.length === 0) return;
  const currentIdx = roles.indexOf(activeModal?.id);
  const nextIdx = currentIdx === -1
    ? (dir > 0 ? 0 : roles.length - 1)
    : (currentIdx + dir + roles.length) % roles.length;
  openModal(roles[nextIdx], activeModal?.mode || 'explore');
}

/* ── CONSTELLATION EXPLORE HELPERS ─────────────────────────── */
function goBackConstellation(steps) {
  steps = steps || 1;
  if (constellationHistory.length === 0) return;
  for (let i = 0; i < steps - 1; i++) {
    if (constellationHistory.length > 1) constellationHistory.pop();
  }
  constellationCurrentId = constellationHistory.pop() || selectedRoleId;
  if (constellationExplore) {
    renderExploreAll(constellationCurrentId);
  } else {
    renderConstellation(constellationCurrentId, null);
  }
  updateConstellationBreadcrumb();
  const heading = document.getElementById('step3Heading');
  if (heading) heading.textContent = `Every path from ${QW_ROLES[constellationCurrentId]?.title || ''}.`;
}

function updateConstellationBreadcrumb() {
  const bc = document.getElementById('constellationBreadcrumb');
  if (!bc) return;

  // Always show role title when Step 3 has an active role
  const displayId = constellationCurrentId || selectedRoleId;
  const role = QW_ROLES[displayId];
  if (!role) { bc.style.display = 'none'; return; }
  bc.style.display = '';

  // When zoomed in: show "Full map" button + zoomed role name
  if (exploreZoomed && exploreSelectedId) {
    const zRole = QW_ROLES[exploreSelectedId];
    bc.innerHTML = `<button class="crumb-back crumb-zoom-out" onclick="zoomExploreOut()">⊙ Full map</button>` +
      `<div class="crumb-trail"><span class="crumb-current">${zRole?.title || ''}</span></div>`;
    return;
  }

  // In explore mode with navigation history: show full trail + Back
  if (constellationExplore && constellationHistory.length > 0) {
    const trail = [...constellationHistory, displayId];
    const crumbs = trail.map((id, i) => {
      const t = QW_ROLES[id]?.title || id;
      if (i === trail.length - 1) return `<span class="crumb-current">${t}</span>`;
      const stepsBack = trail.length - 1 - i;
      return `<span class="crumb-link" onclick="goBackConstellation(${stepsBack})">${t}</span>`;
    }).join('<span class="crumb-sep">›</span>');
    bc.innerHTML = `<button class="crumb-back" onclick="goBackConstellation(1)">← Back</button><div class="crumb-trail">${crumbs}</div>`;
    return;
  }

  // Default: just show current role title (no Back button)
  bc.innerHTML = `<div class="crumb-trail"><span class="crumb-current">${role.title}</span></div>`;
}

/* ── ROLE SELECTOR ──────────────────────────────────────────── */
(function () {
  const deptContainer  = document.getElementById('filterDept');
  const trackContainer = document.getElementById('filterTrack');
  const cardGrid       = document.getElementById('roleCardGrid');

  // ── Canonical mappings for filter dimensions
  const TRACK_MAP = {
    'IC': 'IC', 'IC/Lead': 'IC', 'IC/Management': 'IC',
    'Management': 'People Leadership', 'Executive': 'People Leadership',
  };
  const TRACK_ORDER = ['All','IC','People Leadership'];

  // Active filter state
  let activeDept  = 'All';
  let activeTrack = 'All';
  let searchQuery = '';

  // ── Build team pills
  (QW_DEPARTMENTS || ['All']).forEach((dept, i) => {
    const pill = document.createElement('span');
    pill.className = 'filter-pill' + (i === 0 ? ' active' : '');
    pill.textContent = dept;
    deptContainer.appendChild(pill);
  });

  // ── Build track pills
  TRACK_ORDER.forEach((track, i) => {
    const pill = document.createElement('span');
    pill.className = 'filter-pill' + (i === 0 ? ' active' : '');
    pill.textContent = track;
    trackContainer.appendChild(pill);
  });

  // ── Build role cards from QW_ROLES (sorted by dept then title)
  const sortedRoles = Object.values(QW_ROLES).sort((a, b) => {
    if (a.dept < b.dept) return -1;
    if (a.dept > b.dept) return  1;
    return a.title.localeCompare(b.title);
  });

  sortedRoles.forEach(role => {
    const canonicalTrack = TRACK_MAP[role.track] || 'IC';
    const trackLabel = canonicalTrack === 'People Leadership' ? 'People Leadership' : 'IC Track';

    const card = document.createElement('div');
    card.className = 'role-card';
    card.dataset.roleId = role.id;
    card.dataset.dept   = role.dept || '';
    card.dataset.track  = canonicalTrack;
    card.innerHTML = `
      <div class="role-card-dept">${role.dept}</div>
      <div class="role-card-title">${role.title}</div>
      <div class="role-card-level">${trackLabel}</div>
    `;
    card.dataset.matches = '1'; // default: all visible before any filter
    cardGrid.appendChild(card);
  });

  // ── Apply all filters
  function getCards() { return Array.from(cardGrid.querySelectorAll('.role-card')); }

  const CARDS_PER_PAGE = 12;
  let visibleCount = CARDS_PER_PAGE;
  const loadMoreWrap  = document.getElementById('loadMoreWrap');
  const loadMoreBtn   = document.getElementById('loadMoreBtn');
  const loadMoreCount = document.getElementById('loadMoreCount');

  function updatePagination() {
    const cards = getCards();
    const matching = cards.filter(c => c.dataset.matches === '1');
    const total = matching.length;
    matching.forEach((c, i) => {
      c.style.display = i < visibleCount ? '' : 'none';
    });
    const showing = Math.min(visibleCount, total);
    if (total > CARDS_PER_PAGE) {
      loadMoreWrap.style.display = 'flex';
      loadMoreCount.textContent = `Showing ${showing} of ${total} roles`;
      loadMoreBtn.style.display = showing >= total ? 'none' : '';
    } else {
      loadMoreWrap.style.display = 'none';
    }
  }

  loadMoreBtn?.addEventListener('click', () => {
    visibleCount += CARDS_PER_PAGE;
    updatePagination();
  });

  function applyFilters() {
    visibleCount = CARDS_PER_PAGE;
    getCards().forEach(card => {
      const matchDept  = activeDept  === 'All' || card.dataset.dept  === activeDept;
      const matchTrack = activeTrack === 'All' || card.dataset.track === activeTrack;
      const matchSearch = !searchQuery || card.textContent.toLowerCase().includes(searchQuery);
      const show = matchDept && matchTrack && matchSearch;
      card.dataset.matches = show ? '1' : '0';
      card.style.display = show ? '' : 'none';
      if (show) {
        card.style.animation = 'none';
        requestAnimationFrame(() => { card.style.animation = ''; card.classList.add('card-fade-in'); });
      }
    });
    updatePagination();
  }

  // ── Wire up pill containers
  function makePillHandler(container, setter) {
    container.addEventListener('click', (e) => {
      const pill = e.target.closest('.filter-pill');
      if (!pill) return;
      container.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      setter(pill.textContent.trim());
      applyFilters();
    });
  }

  makePillHandler(deptContainer,  v => activeDept  = v);
  makePillHandler(trackContainer, v => activeTrack = v);

  // ── Wire up card clicks
  cardGrid.addEventListener('click', (e) => {
    const card = e.target.closest('.role-card');
    if (!card) return;
    const roleId = card.dataset.roleId;

    getCards().forEach(c => c.classList.remove('role-card-selected'));
    card.classList.add('role-card-selected');
    cardGrid.querySelectorAll('.role-card-badge').forEach(b => b.remove());
    const badge = document.createElement('div');
    badge.className = 'role-card-badge';
    badge.textContent = 'You are here';
    card.appendChild(badge);

    selectedRoleId = roleId;
    // Hide downstream steps when picking a new starting role
    const s2 = document.getElementById('step2');
    const s3 = document.getElementById('step3');
    if (s2) s2.style.display = 'none';
    if (s3) s3.style.display = 'none';
    openModal(roleId);
  });

  // ── Search bar live filter
  const searchBar = document.querySelector('.search-bar');
  if (searchBar) {
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Search roles, teams, or skills…';
    input.style.cssText = 'border:none;background:none;outline:none;font:inherit;color:inherit;width:100%;font-size:.88rem;';
    const placeholder = searchBar.querySelector('.search-placeholder');
    if (placeholder) placeholder.replaceWith(input);

    input.addEventListener('input', () => {
      searchQuery = input.value.toLowerCase();
      applyFilters();
      updatePagination();
    });
  }

  // ── Initial pagination render
  updatePagination();
})();

/* ── STEP 2: PATH CHOICE ────────────────────────────────────── */
function getAspirationContent(pathType, sourceRole, targetIds) {
  const targets = targetIds.map(id => QW_ROLES[id]).filter(Boolean);
  if (!targets.length) return null;

  const TRACK_MAP_LOCAL = { 'IC':'IC','IC/Lead':'IC','IC/Management':'IC','Management':'People Leadership','Executive':'People Leadership' };
  const hasMgmt   = targets.some(r => TRACK_MAP_LOCAL[r.track] === 'People Leadership');
  const targetDepts = [...new Set(targets.map(r => r.dept))];
  const firstLevel  = targets[0]?.level || '';

  const prompts = {
    vertical: {
      icon: '↑', label: 'Grow in your role',
      text() {
        if (hasMgmt && targets.some(r => TRACK_MAP_LOCAL[r.track] === 'IC'))
          return "You're ready to level up — whether by leading people or going deeper in your craft.";
        if (hasMgmt)
          return "You enjoy developing others and are ready to build, coach, and lead a team.";
        if (/Director/i.test(firstLevel))
          return "You're ready to own strategy, lead cross-functional decisions, and drive department-level impact.";
        if (/VP|Executive|C-Suite/i.test(firstLevel))
          return "You want to operate at the organizational level and shape where the company is headed.";
        if (/Senior|Principal|Lead/i.test(firstLevel))
          return "You want deeper expertise, bigger accounts or projects, and to be the go-to in your domain.";
        return "You're ready for expanded scope, greater ownership, and more complex challenges.";
      }
    },
    lateral: {
      icon: '↔', label: 'Try something adjacent',
      text() {
        const dept = targetDepts[0] || '';
        if (dept.includes('Implementation'))
          return "You're drawn to the onboarding and technical setup side of the customer journey.";
        if (dept.includes('Partner') || dept.includes('Business Development'))
          return "You love building relationships and want to expand that into an ecosystem or partner model.";
        if (dept.includes('Support'))
          return "You want to support customers across a broader surface area with diverse issues.";
        return "You want to try a parallel path that uses your strengths in a fresh context — same level, new perspective.";
      }
    },
    crossDept: {
      icon: '⟺', label: 'Make a bold move',
      text() {
        if (targetDepts.some(d => d.includes('Sales')))
          return "You want more strategic work but less day-to-day client interaction — you're drawn to winning new business.";
        if (targetDepts.some(d => d.includes('Product')))
          return "You're passionate about what gets built, not just how it's delivered — you want a seat at the roadmap table.";
        if (targetDepts.some(d => d.includes('Marketing')))
          return "You want to shape how the world sees Quantum Workplace — telling the story at scale.";
        if (targetDepts.some(d => d.includes('Customer Success')))
          return "You want to own long-term customer relationships and be accountable for their outcomes.";
        if (targetDepts.some(d => d.includes('People') || d.includes('HR')))
          return "You care deeply about culture and Qwirk experience — you want to impact the org from the inside out.";
        if (targetDepts.some(d => d.includes('Insights') || d.includes('Analytics')))
          return "You want to get closer to the data and surface insights that drive smarter decisions.";
        if (targetDepts.some(d => d.includes('Technology') || d.includes('Engineering')))
          return "You're drawn to solving problems at the product and systems level — you want to build.";
        if (targetDepts.some(d => d.includes('Business Development') || d.includes('Partner')))
          return "You want to explore strategic growth opportunities and build ecosystem-level relationships.";
        return "You want to bring your skills to a completely different part of the business and start fresh.";
      }
    }
  };

  const cfg = prompts[pathType];
  if (!cfg) return null;
  return { icon: cfg.icon, label: cfg.label, text: cfg.text(), targetIds };
}

function renderStep2(roleId) {
  const role = QW_ROLES[roleId];
  const section   = document.getElementById('step2');
  const roleName  = document.getElementById('step2RoleName');
  const grid      = document.getElementById('pathCardsGrid');
  if (!section || !grid || !role) return;

  // Update heading
  roleName.textContent = role.title;

  // Build path definitions
  const { vertical = [], lateral = [], crossDept = [] } = role.next || {};
  const pathDefs = [
    { type: 'vertical',  cssClass: 'path-card-vertical',  ids: vertical  },
    { type: 'lateral',   cssClass: 'path-card-lateral',   ids: lateral   },
    { type: 'crossDept', cssClass: 'path-card-crossdept', ids: crossDept },
  ];

  grid.innerHTML = '';

  {
    grid.className = 'path-cards-grid cols-3';

    pathDefs.forEach(({ type, cssClass, ids }) => {
      const content = getAspirationContent(type, role, ids);
      if (!content) {
        // Show empty state card
        const emptyMessages = {
          vertical:  "We're still charting the upward path for this role — check back soon.",
          lateral:   "We're still mapping the lateral moves from here — more coming soon.",
          crossDept: "Cross-department paths for this role are still being explored.",
        };
        const icons  = { vertical: '↑', lateral: '↔', crossDept: '⟺' };
        const labels = { vertical: 'Grow in your role', lateral: 'Try something adjacent', crossDept: 'Make a bold move' };
        const card = document.createElement('div');
        card.className = `path-card ${cssClass} path-card-empty-state`;
        card.innerHTML = `
          <div class="path-card-header">
            <div class="path-card-icon">${icons[type]}</div>
            <span class="path-card-type-label">${labels[type]}</span>
          </div>
          <p class="path-card-prompt path-card-coming-soon">${emptyMessages[type]}</p>
          <p class="path-card-placeholder-note">This path isn't mapped yet — but your career definitely has one.</p>
        `;
        grid.appendChild(card);
        return;
      }

      const card = document.createElement('div');
      card.className = `path-card ${cssClass}`;
      card.dataset.pathType = type;

      // Role chips — display only, not clickable
      const chipsHTML = content.targetIds.map(id => {
        const target = QW_ROLES[id];
        if (!target) return '';
        return `<span class="path-role-chip">${target.title}</span>`;
      }).join('');

      card.innerHTML = `
        <div class="path-card-header">
          <div class="path-card-icon">${content.icon}</div>
          <span class="path-card-type-label">${content.label}</span>
        </div>
        <p class="path-card-prompt">${content.text}</p>
        <div class="path-card-roles">${chipsHTML}</div>
      `;

      // Card click → toggle active state
      card.addEventListener('click', (e) => {
        // Card body click → toggle selected state
        const wasActive = card.classList.contains('path-card-active');
        grid.querySelectorAll('.path-card').forEach(c => c.classList.remove('path-card-active'));
        if (!wasActive) {
          card.classList.add('path-card-active');
          const pt = card.dataset.pathType;
          renderConstellation(selectedRoleId, pt);
          syncConstellationFilter(pt);
        } else {
          renderConstellation(selectedRoleId, null);
          syncConstellationFilter(null);
        }
      });

      grid.appendChild(card);
    });
  }

  // Show section and scroll to it
  section.style.display = '';
  requestAnimationFrame(() => {
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}

/* ── SYNC CONSTELLATION FILTER BUTTONS ──────────────────────── */
function syncConstellationFilter(type) {
  // Reset explore mode when a step-2 card changes the path filter
  if (constellationExplore) {
    constellationExplore   = false;
    constellationCurrentId = null;
    constellationHistory   = [];
    document.getElementById('constellationStage')?.classList.remove('explore-mode');
    const bc = document.getElementById('constellationBreadcrumb');
    if (bc) bc.style.display = 'none';
  }
  const bar = document.getElementById('cFilterBar');
  if (!bar) return;
  bar.querySelectorAll('.c-filter-btn').forEach(b => {
    b.classList.toggle('active', (b.dataset.type || null) === type);
  });
}

/* ── STEP 3: CONSTELLATION MAP ──────────────────────────────── */
function renderConstellation(roleId, highlightType) {
  const role = QW_ROLES[roleId];
  const section = document.getElementById('step3');
  const stage   = document.getElementById('constellationStage');
  const heading = document.getElementById('step3Heading');
  if (!section || !stage || !role) return;

  if (heading) heading.textContent = `Every path from ${role.title}.`;

  const { vertical = [], lateral = [], crossDept = [] } = role.next || {};
  const W = 1000, H = 680;
  const cx = W / 2, cy = H / 2;
  const R  = 255; // orbit radius — wider to accommodate taller pills
  const NR = 46;  // node circle radius (legacy, unused for pills)
  const CR = 58;  // center circle radius

  // Type config (light-mode palette) — vertical=orange, lateral=light-blue, crossDept=dark-blue
  const T = {
    vertical:  { stroke: '#E3530F', glow: 'rgba(227,83,15,.55)',  fill: '#FEF0E7', dash: '',      icon: '↑', label: 'Vertical'    },
    lateral:   { stroke: '#62B6F3', glow: 'rgba(98,182,243,.60)', fill: '#EAF4FD', dash: '6 4',   icon: '↔', label: 'Lateral'     },
    crossDept: { stroke: '#003B75', glow: 'rgba(0,59,117,.45)',   fill: '#E6EDF5', dash: '2.5 4', icon: '⟺', label: 'Cross-Dept' },
  };

  // Pill dimensions computed per-node based on text length (see buildNodes)

  // Angle calculator: group each type into arcs
  function arcAngles(type, count) {
    if (count === 0) return [];
    // Vertical: spread around top (270°)
    if (type === 'vertical') {
      const spread = count === 1 ? 0 : Math.min(55, 80 / (count - 1));
      return Array.from({ length: count }, (_, i) => 270 + (i - (count - 1) / 2) * spread);
    }
    // Lateral: alternate left (180°) and right (0°/360°)
    if (type === 'lateral') {
      if (count === 1) return [185];
      if (count === 2) return [185, 355];
      const half = Math.ceil(count / 2);
      return Array.from({ length: count }, (_, i) =>
        i < half ? 180 + (i + 1) * 15 : 360 - (i - half + 1) * 15
      );
    }
    // Cross-dept: spread around bottom (90°)
    const spread = count === 1 ? 0 : Math.min(55, 80 / (count - 1));
    return Array.from({ length: count }, (_, i) => 90 + (i - (count - 1) / 2) * spread);
  }

  // Compute dynamic pill width/height per node from its text content
  // Uses 9.5px/char estimate (conservative for Inter 11px bold) with generous padding
  function pillDims(lines) {
    const maxChars = Math.max(...lines.map(l => l.length));
    const pw = Math.max(130, Math.min(230, maxChars * 9.5 + 54));
    const ph = lines.length >= 3 ? 94 : lines.length === 2 ? 80 : 66;
    return { pw, ph };
  }

  // Build path nodes with x/y positions and per-node pill dimensions
  // Allow up to 3 lines so long titles never need cramming into 2
  const buildNodes = (ids, type) =>
    arcAngles(type, ids.length).map((deg, i) => {
      const rad = deg * Math.PI / 180;
      const role = QW_ROLES[ids[i]];
      if (!role) return null;
      const lines = wrapTitle(role.title, 11).slice(0, 3);
      const { pw, ph } = pillDims(lines);
      return {
        id: ids[i], type,
        x: cx + R * Math.cos(rad),
        y: cy + R * Math.sin(rad),
        aboveCenter: Math.sin(rad) < -0.25,
        role, lines, pw, ph,
      };
    }).filter(n => n);

  const pathNodes = [
    ...buildNodes(vertical, 'vertical'),
    ...buildNodes(lateral,  'lateral'),
    ...buildNodes(crossDept,'crossDept'),
  ];

  // Text wrapper for SVG
  function wrapTitle(text, maxLen = 12) {
    const words = text.split(' ');
    const lines = []; let cur = '';
    for (const w of words) {
      const test = cur ? cur + ' ' + w : w;
      if (test.length <= maxLen) { cur = test; }
      else { if (cur) lines.push(cur); cur = w; }
    }
    if (cur) lines.push(cur);
    return lines.slice(0, 3);
  }

  // Build SVG text lines for a label
  function labelSVG(x, y, text, above, color) {
    const lines = wrapTitle(text);
    const lh = 13;
    const startY = above ? y - NR - 10 - (lines.length - 1) * lh : y + NR + 16;
    return lines.map((l, i) =>
      `<text x="${x.toFixed(1)}" y="${(startY + i * lh).toFixed(1)}" text-anchor="middle" fill="${color}" font-size="11" font-family="Inter,sans-serif" font-weight="500" opacity="0.9">${l}</text>`
    ).join('');
  }

  // Center label — role title (white, bold), vertically centered in circle
  function centerLabelSVG() {
    const lines = wrapTitle(role.title, 12);
    const lh = 14;
    const titleH = (lines.length - 1) * lh;
    return lines.map((l, i) =>
      `<text x="${cx}" y="${(cy - titleH / 2 + i * lh + 4).toFixed(1)}" text-anchor="middle" fill="#FFFFFF" font-size="11.5" font-family="Inter,sans-serif" font-weight="700">${l}</text>`
    ).join('');
  }

  // (stars removed — replaced by perspective grid)

  // Distance from pill-center to pill-edge in direction (dx,dy)
  function pillEdgeDist(dx, dy, pw, ph) {
    const len = Math.hypot(dx, dy);
    if (len === 0) return pw / 2;
    const ux = Math.abs(dx / len), uy = Math.abs(dy / len);
    const tx = ux > 0 ? (pw / 2) / ux : Infinity;
    const ty = uy > 0 ? (ph / 2) / uy : Infinity;
    return Math.min(tx, ty);
  }

  // Line from center circle to pill node
  function lineSVG(n) {
    const cfg = T[n.type];
    const isHL = !highlightType || n.type === highlightType;
    const dx = n.x - cx, dy = n.y - cy;
    const len = Math.hypot(dx, dy);
    const edgeDist = pillEdgeDist(dx, dy, n.pw, n.ph);
    const x1 = (cx + dx * (CR / len)).toFixed(1);
    const y1 = (cy + dy * (CR / len)).toFixed(1);
    const x2 = (cx + dx * ((len - edgeDist) / len)).toFixed(1);
    const y2 = (cy + dy * ((len - edgeDist) / len)).toFixed(1);
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${cfg.stroke}" stroke-width="${isHL ? 1.8 : 0.8}" opacity="${isHL ? 0.55 : 0.12}" stroke-dasharray="${cfg.dash}"/>`;
  }

  // Pill-shaped node with icon + bold title + dept — variable size, larger text
  function nodeSVG(n) {
    const cfg = T[n.type];
    const isHL = !highlightType || n.type === highlightType;
    const op = isHL ? 1 : 0.35;
    const sw = isHL ? 2 : 1.2;
    const { pw, ph, lines } = n;
    const px = n.x - pw / 2, py = n.y - ph / 2;
    const nx = n.x;
    const rx = Math.min(28, ph / 2); // pill border-radius

    const ICON_FS = 11, TITLE_FS = 11, DEPT_FS = 9.5;
    const lh = 13; // line height
    const gap = 3;

    // Vertically center: icon row + title rows + dept row
    const rowCount = 1 + lines.length + 1;
    const blockH   = rowCount * lh + (rowCount - 1) * gap;
    const blockTop = py + (ph - blockH) / 2;

    const iconY   = (blockTop + lh * 0.82).toFixed(1);
    const titleRows = lines.map((l, i) => {
      const y = (blockTop + (i + 1) * (lh + gap) + lh * 0.82).toFixed(1);
      return `<text x="${nx.toFixed(1)}" y="${y}" text-anchor="middle" fill="${cfg.stroke}" font-size="${TITLE_FS}" font-family="Inter,sans-serif" font-weight="700">${l}</text>`;
    }).join('');
    const deptY = (blockTop + (lines.length + 1) * (lh + gap) + lh * 0.82).toFixed(1);

    return `
    <g class="c-node c-node-${n.type}" data-role-id="${n.id}" data-color="${cfg.stroke}" data-glow="${cfg.glow}" tabindex="0" role="button" aria-label="View ${n.role.title}" style="cursor:pointer;opacity:${op}">
      <rect class="c-node-halo" x="${(px - 10).toFixed(1)}" y="${(py - 10).toFixed(1)}" width="${pw + 20}" height="${ph + 20}" rx="${rx + 10}" fill="none" stroke="${cfg.stroke}" stroke-width="1" opacity="${isHL ? 0.22 : 0}"/>
      <rect class="c-node-pill" x="${px.toFixed(1)}" y="${py.toFixed(1)}" width="${pw}" height="${ph}" rx="${rx}" fill="${cfg.fill}" stroke="${cfg.stroke}" stroke-width="${sw}" filter="${isHL ? 'url(#node-shadow)' : 'none'}"/>
      <text x="${nx.toFixed(1)}" y="${iconY}" text-anchor="middle" fill="${cfg.stroke}" font-size="${ICON_FS}" font-family="Inter,system-ui,sans-serif" font-weight="700">${cfg.icon}</text>
      ${titleRows}
      <text x="${nx.toFixed(1)}" y="${deptY}" text-anchor="middle" fill="${cfg.stroke}" font-size="${DEPT_FS}" font-family="Inter,sans-serif" font-weight="400" opacity="0.7">${n.role.dept}</text>
    </g>`;
  }

  // Perspective grid (replaces dots) — lines converge at vanishing point above SVG
  const vpX = cx, vpY = -H * 0.22;
  const numH = 11, numV = 18;
  const perspGrid = [
    ...Array.from({length: numH}, (_, i) => {
      const t = (i + 1) / (numH + 1);
      const y = (H * t).toFixed(1);
      const op = (0.04 + t * 0.055).toFixed(3);
      return `<line x1="0" y1="${y}" x2="${W}" y2="${y}" stroke="#8EA4C0" stroke-width="0.7" opacity="${op}"/>`;
    }),
    ...Array.from({length: numV}, (_, i) => {
      const t = i / (numV - 1);
      const xBot = (W * t).toFixed(1);
      const op = (0.04 + Math.abs(t - 0.5) * 0.03).toFixed(3);
      return `<line x1="${vpX.toFixed(1)}" y1="${vpY.toFixed(1)}" x2="${xBot}" y2="${H}" stroke="#8EA4C0" stroke-width="0.7" opacity="${op}"/>`;
    }),
  ].join('\n  ');

  const svgHTML = `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;display:block;border-radius:16px;border:1.5px solid #62B6F3" role="img" aria-label="Career constellation map for ${role.title}">
  <defs>
    <linearGradient id="c-bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"   stop-color="#C6D6E8"/>
      <stop offset="38%"  stop-color="#E2EBF6"/>
      <stop offset="100%" stop-color="#F4F7FC"/>
    </linearGradient>
    <filter id="glow-vertical"  x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="glow-lateral"   x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="glow-crossDept" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="glow-center"    x="-60%" y="-60%" width="220%" height="220%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <!-- 3D depth: drop shadows for pills and center -->
    <filter id="node-shadow" x="-25%" y="-35%" width="150%" height="170%">
      <feDropShadow dx="0" dy="5" stdDeviation="7" flood-color="#000" flood-opacity="0.12"/>
    </filter>
    <filter id="center-shadow" x="-45%" y="-50%" width="190%" height="200%">
      <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#E3530F" flood-opacity="0.30"/>
    </filter>
  </defs>

  <!-- Terrain background -->
  <rect width="${W}" height="${H}" fill="url(#c-bg)" rx="16"/>

  <!-- Perspective grid floor -->
  ${perspGrid}

  <!-- Lines -->
  ${pathNodes.map(lineSVG).join('\n  ')}

  <!-- Path nodes -->
  ${pathNodes.map(nodeSVG).join('\n  ')}

  <!-- Center node (clickable) -->
  <g class="c-center" data-role-id="${roleId}" style="cursor:pointer">
    <circle cx="${cx}" cy="${cy}" r="${CR + 24}" fill="none" stroke="#FF7500" stroke-width="1.5" opacity="0">
      <animate attributeName="r"       values="${CR};${CR + 50}"  dur="2.8s" repeatCount="indefinite"/>
      <animate attributeName="opacity" values="0.5;0"              dur="2.8s" repeatCount="indefinite"/>
    </circle>
    <circle cx="${cx}" cy="${cy}" r="${CR + 10}" fill="none" stroke="#FF7500" stroke-width="1" opacity="0">
      <animate attributeName="r"       values="${CR};${CR + 48}"  dur="2.8s" begin="1.4s" repeatCount="indefinite"/>
      <animate attributeName="opacity" values="0.4;0"              dur="2.8s" begin="1.4s" repeatCount="indefinite"/>
    </circle>
    <circle cx="${cx}" cy="${cy}" r="${CR}" fill="#E3530F" stroke="#FF7500" stroke-width="2.5" filter="url(#center-shadow)"/>
    ${centerLabelSVG()}
    <text x="${cx}" y="${(cy + CR - 15).toFixed(1)}" text-anchor="middle" fill="white" font-size="8.5" font-family="Inter,sans-serif" font-weight="700" letter-spacing="0.08em">YOU ARE HERE</text>
  </g>
</svg>`;

  stage.innerHTML = svgHTML;

  // Wire up path node click/keyboard/hover handlers
  stage.querySelectorAll('.c-node').forEach(node => {
    const rId = node.dataset.roleId;
    if (!rId || !QW_ROLES[rId]) return;
    const glowColor = node.dataset.glow || 'rgba(227,83,15,.5)';

    // Click: explore mode navigates constellation; normal mode opens modal
    const activate = () => {
      if (constellationExplore) {
        constellationHistory.push(constellationCurrentId || roleId);
        constellationCurrentId = rId;
        renderConstellation(rId, null);
        updateConstellationBreadcrumb();
        const heading = document.getElementById('step3Heading');
        if (heading) heading.textContent = `Every path from ${QW_ROLES[rId]?.title || ''}.`;
      } else {
        openModal(rId, 'plan');
      }
    };
    node.addEventListener('click', activate);
    node.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') activate(); });

    // Hover: drop-shadow glow + dim others
    node.addEventListener('mouseenter', () => {
      node.style.filter = `drop-shadow(0 0 14px ${glowColor})`;
      stage.querySelectorAll('.c-node').forEach(n => { if (n !== node) n.style.opacity = '0.3'; });
    });
    node.addEventListener('mouseleave', () => {
      node.style.filter = '';
      stage.querySelectorAll('.c-node').forEach(n => {
        const isHL = !highlightType || n.classList.contains(`c-node-${highlightType}`);
        n.style.opacity = isHL ? '1' : '0.35';
      });
    });
  });

  // Wire center node: click opens role modal in "explore" mode
  const centerNode = stage.querySelector('.c-center');
  if (centerNode) {
    centerNode.addEventListener('click', () => openModal(roleId, 'restart'));
    centerNode.addEventListener('mouseenter', () => {
      centerNode.style.filter = 'drop-shadow(0 0 18px rgba(227,83,15,.6))';
    });
    centerNode.addEventListener('mouseleave', () => { centerNode.style.filter = ''; });
  }

  // Show and scroll
  section.style.display = '';
  requestAnimationFrame(() => section.scrollIntoView({ behavior: 'smooth', block: 'start' }));

  // Always update breadcrumb when constellation renders
  constellationCurrentId = roleId;
  updateConstellationBreadcrumb();
}

/* ── ROLE DETAIL PANEL ──────────────────────────────────────── */
function showRolePanel(roleId) {
  const role = QW_ROLES[roleId];
  const panel = document.getElementById('roleDetailPanel');
  if (!panel || !role) return;

  document.getElementById('rdpDept').textContent    = role.dept;
  document.getElementById('rdpTitle').textContent   = role.title;
  document.getElementById('rdpOverview').textContent = role.overview || '';

  const meta = document.getElementById('rdpMeta');
  meta.innerHTML = `
    <span class="rdp-badge">${role.track === 'Management' || role.track === 'Executive' ? 'People Leadership' : 'IC Track'}</span>
  `;

  const comps = document.getElementById('rdpComps');
  comps.innerHTML = (role.competencies || []).slice(0, 5)
    .map(c => `<span class="rdp-comp-chip">${c}</span>`).join('');

  panel.style.display = '';
  // Re-trigger animation
  panel.style.animation = 'none';
  requestAnimationFrame(() => { panel.style.animation = ''; });

  // Scroll panel into view
  requestAnimationFrame(() => panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' }));

  // Hide step2 and step3 when picking a new role
  const s2 = document.getElementById('step2');
  const s3 = document.getElementById('step3');
  if (s2) s2.style.display = 'none';
  if (s3) s3.style.display = 'none';
}

/* ── DOM CONTENT LOADED WIRING ──────────────────────────────── */
/* ── EXPLORE ALL: FULL ORG GRAPH ─────────────────────────────── */
/* ── EXPLORE-ALL ZOOM HELPERS ───────────────────────────────── */

/** Smoothly animate an SVG's viewBox from current to target [x,y,w,h]. */
function animateViewBox(svg, target, duration) {
  if (!svg) return;
  duration = duration || 580;
  const cur = (svg.getAttribute('viewBox') || '0 0 1400 1120').split(' ').map(Number);
  const start = performance.now();
  function step(now) {
    const raw = Math.min(1, (now - start) / duration);
    // ease-in-out cubic
    const t = raw < 0.5 ? 4 * raw * raw * raw : 1 - Math.pow(-2 * raw + 2, 3) / 2;
    const vb = cur.map((c, i) => (c + (target[i] - c) * t).toFixed(2)).join(' ');
    svg.setAttribute('viewBox', vb);
    if (raw < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

/** Zoom and pan Explore All into a selected role, add burst + expanded card. */
function zoomExploreToRole(rId) {
  const stage = document.getElementById('constellationStage');
  if (!stage) return;
  const svg   = stage.querySelector('svg[id="ea-svg"]');
  if (!svg) return;
  const pos   = _eaRolePos[rId];
  const role  = QW_ROLES[rId];
  if (!pos || !role) return;

  // Save current viewBox so zoom-out can restore map zoom level
  _eaPreRoleZoomVB = svg.getAttribute('viewBox').split(' ').map(Number);

  exploreZoomed     = true;
  exploreSelectedId = rId;

  // ── 1. Compute zoomed viewBox — must stay SQUARE to prevent container resize
  //    (canvas is 1400×1400; square viewBox keeps aspect-ratio:1 container stable)
  const zW = 340, zH = 340;
  let vbX = pos.x - zW / 2;
  let vbY = pos.y - zH / 2;
  vbX = Math.max(0, Math.min(_eaCanvasW - zW, vbX));
  vbY = Math.max(0, Math.min(_eaCanvasH - zH, vbY));
  animateViewBox(svg, [vbX, vbY, zW, zH]);

  // ── 2. Dim non-connected nodes (extra dim while zoomed)
  const hlRole = role;
  const hlConn = new Set([
    rId,
    ...(hlRole.next?.vertical  || []),
    ...(hlRole.next?.lateral   || []),
    ...(hlRole.next?.crossDept || []),
  ]);
  svg.querySelectorAll('.ea-node').forEach(n => {
    n.style.transition = 'opacity 0.32s ease';
    n.style.opacity    = hlConn.has(n.dataset.roleId) ? '1' : '0.08';
  });
  svg.querySelectorAll('.ea-line').forEach(l => {
    const ids = (l.dataset.ids || '').split('|');
    const hit = ids.includes(rId);
    l.style.transition  = 'opacity 0.32s ease, stroke-width 0.32s ease';
    l.style.opacity     = hit ? '0.80' : '0.03';
    l.style.strokeWidth = hit ? '2.8'  : '0.4';
  });

  // ── 3. Build ripple burst + expanded card in overlay group
  const overlay = svg.querySelector('#ea-overlay');
  if (!overlay) return;
  overlay.innerHTML = '';

  const color = _eaDeptColor[role.dept] || '#003B75';
  const cx = pos.x.toFixed(2), cy = pos.y.toFixed(2);

  // Ripple circles (3 rings that expand and fade)
  const ripples = [1, 2, 3].map(i => {
    const delay = ((i - 1) * 0.16).toFixed(2);
    const maxR  = 60 + i * 22;
    return `<circle cx="${cx}" cy="${cy}" r="6" fill="none" stroke="${color}" stroke-width="${(2.5 - i * 0.4).toFixed(1)}" opacity="0">
      <animate attributeName="r"       values="6;${maxR}"   dur="0.85s" begin="${delay}s" fill="freeze" calcMode="spline" keySplines="0.25 0.1 0.25 1"/>
      <animate attributeName="opacity" values="0.7;0"       dur="0.85s" begin="${delay}s" fill="freeze" calcMode="spline" keySplines="0.25 0.1 0.25 1"/>
    </circle>`;
  }).join('');

  // ── 4. Expanded card (positioned above node; flip below if near top)
  const cardW = 138, cardH = 104;
  const cardX = pos.x - cardW / 2;
  let cardY   = pos.y - pos.h / 2 - 14 - cardH;
  if (cardY < vbY + 6) cardY = pos.y + pos.h / 2 + 14; // flip below

  const connV  = (role.next?.vertical  || []).length;
  const connL  = (role.next?.lateral   || []).length;
  const connCd = (role.next?.crossDept || []).length;
  const trackLabel = (role.track === 'Management' || role.track === 'Executive') ? 'People Leadership' : 'IC';

  // Word-wrap title (max ~18 chars per line)
  const words = (role.fullTitle || role.title).split(' ');
  const lines = [];
  let cur = '';
  for (const w of words) {
    if (cur && (cur + ' ' + w).length > 18) { lines.push(cur); cur = w; }
    else cur = cur ? cur + ' ' + w : w;
  }
  if (cur) lines.push(cur);
  const titleLines = lines.slice(0, 2); // max 2 lines

  const lineH = 12.5;
  const titleStartY = cardY + 30;
  const titlesHTML  = titleLines.map((l, i) =>
    `<text x="${pos.x.toFixed(2)}" y="${(titleStartY + i * lineH).toFixed(2)}"
      text-anchor="middle" fill="#1a1d22" font-size="10.5" font-family="Inter,sans-serif" font-weight="700">${l}</text>`
  ).join('');

  const statsY = cardY + 30 + titleLines.length * lineH + 8;
  const plusCx = (cardX + cardW - 15).toFixed(2);
  const plusCy = (cardY + cardH - 15).toFixed(2);

  const cardHTML = `
    <g id="ea-card">
      <rect x="${cardX.toFixed(2)}" y="${cardY.toFixed(2)}" width="${cardW}" height="${cardH}" rx="9"
        fill="white" stroke="${color}" stroke-width="1.8"
        style="filter:drop-shadow(0 4px 16px rgba(0,0,0,.18))"/>
      <text x="${pos.x.toFixed(2)}" y="${(cardY + 16).toFixed(2)}" text-anchor="middle"
        fill="${color}" font-size="6.5" font-family="Inter,sans-serif" font-weight="700" letter-spacing="0.06em">
        ${role.dept.toUpperCase()} · ${trackLabel}
      </text>
      ${titlesHTML}
      <text x="${(cardX + 12).toFixed(2)}" y="${statsY.toFixed(2)}" fill="#E3530F" font-size="7.5" font-family="Inter,sans-serif" font-weight="600">↑ ${connV} vertical</text>
      <text x="${(cardX + 12).toFixed(2)}" y="${(statsY + 10).toFixed(2)}" fill="#0077CD" font-size="7.5" font-family="Inter,sans-serif" font-weight="600">↔ ${connL} lateral</text>
      <text x="${(cardX + 12).toFixed(2)}" y="${(statsY + 20).toFixed(2)}" fill="#003B75" font-size="7.5" font-family="Inter,sans-serif" font-weight="600">⟺ ${connCd} cross-dept</text>
      <!-- + button to open role modal -->
      <g class="ea-open-modal-btn" data-role-id="${rId}" style="cursor:pointer">
        <circle cx="${plusCx}" cy="${plusCy}" r="11.5" fill="${color}"/>
        <text x="${plusCx}" y="${(parseFloat(plusCy) + 4.5).toFixed(2)}" text-anchor="middle"
          fill="white" font-size="16" font-family="Inter,sans-serif" font-weight="300" pointer-events="none">+</text>
      </g>
    </g>`;

  overlay.innerHTML = ripples + cardHTML;

  // Wire the + button
  overlay.querySelector('.ea-open-modal-btn')?.addEventListener('click', e => {
    e.stopPropagation();
    openModal(rId);
  });

  // Update heading + breadcrumb
  const heading = document.getElementById('step3Heading');
  if (heading) heading.textContent = `Every path from ${role.title || ''}.`;
  updateConstellationBreadcrumb();
}

/** Zoom back out to the full Explore All map. */
function zoomExploreOut() {
  const stage = document.getElementById('constellationStage');
  if (!stage) return;
  const svg = stage.querySelector('svg[id="ea-svg"]');
  if (!svg) return;

  // Animate back to the map zoom level that was active before the role zoom
  const restoreVB = _eaPreRoleZoomVB || [0, 0, _eaCanvasW, _eaCanvasH];
  animateViewBox(svg, restoreVB);
  _eaPreRoleZoomVB = null;
  exploreZoomed = false;

  // Clear overlay
  const overlay = svg.querySelector('#ea-overlay');
  if (overlay) overlay.innerHTML = '';

  // Restore node/line opacities to the current highlight state (lines hidden by default)
  const hlId   = constellationCurrentId;
  const hlRole = QW_ROLES[hlId];
  const hlConn = new Set([
    hlId,
    ...(hlRole?.next?.vertical  || []),
    ...(hlRole?.next?.lateral   || []),
    ...(hlRole?.next?.crossDept || []),
  ]);
  svg.querySelectorAll('.ea-node').forEach(n => {
    const nId = n.dataset.roleId;
    const isHL2 = nId === hlId;
    const isCn2 = hlConn.has(nId) && !isHL2;
    n.style.transition = 'opacity 0.35s ease';
    n.style.opacity    = isHL2 ? '1' : isCn2 ? '0.85' : '0.55';
  });
  svg.querySelectorAll('.ea-line').forEach(l => {
    const ids = (l.dataset.ids || '').split('|');
    const hit = ids.includes(hlId);
    l.style.transition  = 'opacity 0.35s ease';
    l.style.opacity     = hit ? '0.45' : '0'; // hidden by default
    l.style.strokeWidth = hit ? '2' : '1';
  });

  updateConstellationBreadcrumb();
}

/* ── EXPLORE-ALL MAP ZOOM (button / scroll / reset) ─────────── */
function eaMapZoomIn() {
  const svg = document.querySelector('#ea-svg');
  if (!svg || exploreZoomed) return;
  const [x, y, w, h] = svg.getAttribute('viewBox').split(' ').map(Number);
  // Keep square (w === h always for the 1400×1400 canvas)
  const newSide = Math.max(300, w * 0.70);
  const nx = Math.max(0, Math.min(_eaCanvasW - newSide, x + (w - newSide) / 2));
  const ny = Math.max(0, Math.min(_eaCanvasH - newSide, y + (h - newSide) / 2));
  animateViewBox(svg, [nx, ny, newSide, newSide]);
}

function eaMapZoomOut() {
  const svg = document.querySelector('#ea-svg');
  if (!svg || exploreZoomed) return;
  const [x, y, w, h] = svg.getAttribute('viewBox').split(' ').map(Number);
  const newSide = Math.min(_eaCanvasW, w / 0.70);
  const nx = Math.max(0, Math.min(_eaCanvasW - newSide, x + (w - newSide) / 2));
  const ny = Math.max(0, Math.min(_eaCanvasH - newSide, y + (h - newSide) / 2));
  animateViewBox(svg, [nx, ny, newSide, newSide]);
}

function eaMapZoomReset() {
  const svg = document.querySelector('#ea-svg');
  if (!svg) return;
  animateViewBox(svg, [0, 0, _eaCanvasW, _eaCanvasH]);
}

function renderExploreAll(highlightId) {
  const stage   = document.getElementById('constellationStage');
  const section = document.getElementById('step3');
  if (!stage || !section) return;

  // Reset zoom state on fresh render
  exploreZoomed     = false;
  exploreSelectedId = null;

  // ── Canvas (square for circular layout)
  const W = 1400, H = 1400;
  const cx = 700, cy = 700;
  _eaCanvasW = W; _eaCanvasH = H;

  // ── Two-ring dept assignment
  const INNER_RING = ['Executive','Finance & Operations','Data Science','Insights','Employee Success','BPTW','Quality','Product Design'];
  const OUTER_RING = ['Technology & Engineering','Product Management','Marketing','Sales','Customer Success','Customer Implementation','Customer Support','Sales Development'];
  const R_INNER = 355, R_OUTER = 578;

  // ── QW Brand-aligned color palette (4 families from brand expression)
  const DEPT_COLOR = {
    // Dark Blue family — leadership/operations
    'Executive':               '#003B75',
    'Finance & Operations':    '#004F9A',
    'Employee Success':        '#1A65B0',
    'BPTW':                    '#0A4D8C',
    // QW Orange family — revenue/growth
    'Marketing':               '#D44D0D',
    'Sales':                   '#B83A08',
    'Sales Development':       '#E3530F',
    'Customer Success':        '#C04510',
    // Medium Blue family — product/technology
    'Technology & Engineering':'#005899',
    'Product Management':      '#0077CD',
    'Data Science':            '#006AB8',
    'Quality':                 '#0082D4',
    // Light Blue family — service/insights
    'Customer Implementation': '#2D88BE',
    'Customer Support':        '#4499CC',
    'Insights':                '#3D91C4',
    'Product Design':          '#5AABD6',
  };
  const deptColor = d => DEPT_COLOR[d] || '#003B75';

  // ── Group roles by dept
  const allDepts = (QW_DEPARTMENTS || []).filter(d => d && d !== 'All');
  const validInner  = INNER_RING.filter(d => allDepts.includes(d));
  const validOuter  = OUTER_RING.filter(d => allDepts.includes(d));
  const remainDepts = allDepts.filter(d => !INNER_RING.includes(d) && !OUTER_RING.includes(d));
  const outerDepts  = [...validOuter, ...remainDepts];
  const allOrdered  = [...validInner, ...outerDepts];

  const byDept = {};
  allOrdered.forEach(d => { byDept[d] = []; });
  Object.values(QW_ROLES).forEach(r => { if (byDept[r.dept] !== undefined) byDept[r.dept].push(r); });

  // ── Node & zone dimensions (enlarged for readability)
  const nodeW = 102, nodeH = 30, perRow = 2, gapX = 7, gapY = 8, padding = 13, labelH = 20;
  const zoneW = perRow * nodeW + (perRow - 1) * gapX + 2 * padding; // 237

  // ── Compute zone centers and role positions for both rings
  const deptZone = {}, rolePos = {};

  const placeRing = (depts, R, startAngleDeg) => {
    const N = depts.length;
    if (!N) return;
    depts.forEach((dept, i) => {
      const angle = (startAngleDeg + (i / N) * 360) * Math.PI / 180;
      const zoneCx = cx + R * Math.cos(angle);
      const zoneCy = cy + R * Math.sin(angle);
      const roles  = byDept[dept] || [];
      const nRows  = Math.max(1, Math.ceil(roles.length / perRow));
      const zoneH  = nRows * nodeH + Math.max(0, nRows - 1) * gapY + 2 * padding + labelH;
      const zoneX  = zoneCx - zoneW / 2;
      const zoneY  = zoneCy - zoneH / 2;
      deptZone[dept] = { x: zoneX, y: zoneY, w: zoneW, h: zoneH, cx: zoneCx, cy: zoneCy };
      const startX = zoneX + padding;
      const startY = zoneY + labelH + padding;
      roles.forEach((role, j) => {
        const r = Math.floor(j / perRow), c = j % perRow;
        rolePos[role.id] = {
          x: startX + c * (nodeW + gapX) + nodeW / 2,
          y: startY + r * (nodeH + gapY) + nodeH / 2,
          w: nodeW, h: nodeH,
        };
      });
    });
  };

  const outerOffset = outerDepts.length > 0 ? (360 / outerDepts.length) / 2 : 0;
  placeRing(validInner, R_INNER, -90);
  placeRing(outerDepts, R_OUTER, -90 + outerOffset);

  // Cache for zoom helpers
  _eaRolePos   = rolePos;
  _eaDeptColor = DEPT_COLOR;

  // ── Pre-compute highlight connections
  const hlRole = QW_ROLES[highlightId];
  const hlConnected = new Set([
    highlightId,
    ...(hlRole?.next?.vertical  || []),
    ...(hlRole?.next?.lateral   || []),
    ...(hlRole?.next?.crossDept || []),
  ]);

  // ── Connection lines (hidden by default; highlighted role's lines shown at 0.45)
  const lineColorMap = { vertical: '#E3530F', lateral: '#0077CD', crossDept: '#003B75' };
  const lineDashMap  = { vertical: '',        lateral: '5 3',     crossDept: '2 3'     };
  const connLines = [];
  const drawn = new Set();
  Object.values(QW_ROLES).forEach(role => {
    const src = rolePos[role.id]; if (!src) return;
    const addLine = (ids, type) => (ids || []).forEach(tid => {
      const dst = rolePos[tid]; if (!dst) return;
      const key = [role.id, tid].sort().join('|') + type;
      if (drawn.has(key)) return; drawn.add(key);
      const isHL = role.id === highlightId || tid === highlightId;
      connLines.push({ x1: src.x, y1: src.y, x2: dst.x, y2: dst.y, type, ids: [role.id, tid], isHL });
    });
    addLine(role.next?.vertical, 'vertical');
    addLine(role.next?.lateral,  'lateral');
    addLine(role.next?.crossDept,'crossDept');
  });

  const linesHTML = connLines.map(l => {
    const c = lineColorMap[l.type] || '#aaa', d = lineDashMap[l.type] || '';
    const op = l.isHL ? '0.45' : '0', sw = l.isHL ? '2' : '1';
    return `<line class="ea-line" data-ids="${l.ids.join('|')}" x1="${l.x1.toFixed(1)}" y1="${l.y1.toFixed(1)}" x2="${l.x2.toFixed(1)}" y2="${l.y2.toFixed(1)}" stroke="${c}" stroke-width="${sw}" opacity="${op}" stroke-dasharray="${d}"/>`;
  }).join('');

  // ── Zone backgrounds + dept labels
  const zonesHTML = allOrdered.map(dept => {
    const z = deptZone[dept]; if (!z) return '';
    const color = deptColor(dept);
    const shortLabel = dept.length > 22 ? dept.replace(' & ', ' &\n').split('\n')[0] : dept;
    return `
    <rect x="${z.x.toFixed(1)}" y="${z.y.toFixed(1)}" width="${z.w.toFixed(1)}" height="${z.h.toFixed(1)}" rx="10"
      fill="${color}" fill-opacity="0.07" stroke="${color}" stroke-width="1" stroke-opacity="0.25"/>
    <text x="${z.cx.toFixed(1)}" y="${(z.y + 14).toFixed(1)}" text-anchor="middle"
      fill="${color}" font-size="7.5" font-family="Inter,sans-serif" font-weight="700" letter-spacing="0.06em" opacity="0.75">${dept.toUpperCase()}</text>`;
  }).join('');

  // ── Role nodes
  const nodesHTML = Object.values(QW_ROLES).map(role => {
    const pos = rolePos[role.id]; if (!pos) return '';
    const isHL   = role.id === highlightId;
    const isConn = hlConnected.has(role.id) && !isHL;
    const color  = deptColor(role.dept);
    const maxCh  = 16;
    const label  = role.title.length > maxCh ? role.title.slice(0, maxCh - 1) + '…' : role.title;
    const opBase = isHL ? '1' : isConn ? '0.88' : '0.58';
    return `
    <g class="ea-node" data-role-id="${role.id}" style="cursor:pointer;opacity:${opBase}">
      <title>${role.title} — ${role.dept}</title>
      <rect x="${(pos.x - pos.w/2).toFixed(1)}" y="${(pos.y - pos.h/2).toFixed(1)}" width="${pos.w}" height="${pos.h}" rx="7"
        fill="white"/>
      <rect x="${(pos.x - pos.w/2).toFixed(1)}" y="${(pos.y - pos.h/2).toFixed(1)}" width="${pos.w}" height="${pos.h}" rx="7"
        fill="${isHL ? '#E3530F' : color}" fill-opacity="${isHL ? '1' : '0.14'}"
        stroke="${isHL ? '#FF7500' : color}" stroke-width="${isHL ? '2.5' : '1.3'}" stroke-opacity="${isHL ? '1' : '0.65'}"
        ${isHL ? 'filter="url(#ea-glow)"' : ''}/>
      <text x="${pos.x.toFixed(1)}" y="${(pos.y + 4).toFixed(1)}" text-anchor="middle"
        fill="${isHL ? '#fff' : color}" font-size="7.5" font-family="Inter,sans-serif"
        font-weight="${isHL ? '700' : '500'}" pointer-events="none">${label}</text>
    </g>`;
  }).join('');

  // ── Build SVG
  stage.innerHTML = `<svg id="ea-svg" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;display:block;border-radius:16px" role="img" aria-label="Career constellation — all roles at Quantum Workplace">
  <defs>
    <radialGradient id="ea-bg" cx="50%" cy="50%" r="54%">
      <stop offset="0%"   stop-color="#F6F9FC"/>
      <stop offset="100%" stop-color="#D6E7F4"/>
    </radialGradient>
    <filter id="ea-glow" x="-50%" y="-70%" width="200%" height="240%">
      <feDropShadow dx="0" dy="4" stdDeviation="8" flood-color="#E3530F" flood-opacity="0.5"/>
    </filter>
  </defs>
  <rect id="ea-bg-rect" width="${W}" height="${H}" fill="url(#ea-bg)" rx="16"/>
  <!-- Subtle orbit ring guides -->
  <circle cx="${cx}" cy="${cy}" r="${R_INNER}" fill="none" stroke="#8090A8" stroke-width="0.8" opacity="0.12" stroke-dasharray="4 6"/>
  <circle cx="${cx}" cy="${cy}" r="${R_OUTER}" fill="none" stroke="#8090A8" stroke-width="0.8" opacity="0.09" stroke-dasharray="4 6"/>
  <!-- Center badge -->
  <circle cx="${cx}" cy="${cy}" r="38" fill="#003B75" fill-opacity="0.06" stroke="#003B75" stroke-width="1" stroke-opacity="0.18"/>
  <text x="${cx}" y="${cy - 5}" text-anchor="middle" fill="#003B75" font-size="9" font-family="Inter,sans-serif" font-weight="700" opacity="0.55">QUANTUM</text>
  <text x="${cx}" y="${cy + 9}" text-anchor="middle" fill="#003B75" font-size="9" font-family="Inter,sans-serif" font-weight="700" opacity="0.55">WORKPLACE</text>
  <!-- Connection lines (hidden; revealed on hover) -->
  ${linesHTML}
  <!-- Department zones -->
  ${zonesHTML}
  <!-- Role nodes -->
  ${nodesHTML}
  <!-- Overlay (ripple + zoomed card) -->
  <g id="ea-overlay"></g>
</svg>`;

  // ── Delegated hover via mousemove (avoids node-to-node flicker)
  const eaSvg = stage.querySelector('#ea-svg');
  let _hoverRId = null;

  const restoreHighlightState = () => {
    eaSvg.querySelectorAll('.ea-node').forEach(n => {
      const nId = n.dataset.roleId, isHL = nId === highlightId, isCn = hlConnected.has(nId) && !isHL;
      n.style.transition = 'opacity 0.18s ease';
      n.style.opacity    = isHL ? '1' : isCn ? '0.88' : '0.58';
    });
    eaSvg.querySelectorAll('.ea-line').forEach(l => {
      const hit = (l.dataset.ids || '').split('|').includes(highlightId);
      l.style.transition  = 'opacity 0.18s ease';
      l.style.opacity     = hit ? '0.45' : '0';
      l.style.strokeWidth = hit ? '2' : '1';
    });
  };

  eaSvg.addEventListener('mousemove', (e) => {
    if (exploreZoomed) return;
    const node = e.target.closest('.ea-node');
    const rId  = node?.dataset.roleId || null;
    if (rId === _hoverRId) return;
    _hoverRId = rId;
    if (!rId) { restoreHighlightState(); return; }
    const r    = QW_ROLES[rId];
    const conn = new Set([rId, ...(r?.next?.vertical || []), ...(r?.next?.lateral || []), ...(r?.next?.crossDept || [])]);
    eaSvg.querySelectorAll('.ea-node').forEach(n => {
      n.style.transition = 'opacity 0.15s ease';
      n.style.opacity    = conn.has(n.dataset.roleId) ? '1' : '0.09';
    });
    eaSvg.querySelectorAll('.ea-line').forEach(l => {
      const hit = (l.dataset.ids || '').split('|').includes(rId);
      l.style.transition  = 'opacity 0.15s ease';
      l.style.opacity     = hit ? '0.80' : '0';
      l.style.strokeWidth = hit ? '2.2' : '1';
    });
  });

  eaSvg.addEventListener('mouseleave', () => {
    if (exploreZoomed) return;
    _hoverRId = null;
    restoreHighlightState();
  });

  // ── Node clicks → role zoom
  eaSvg.querySelectorAll('.ea-node').forEach(node => {
    const rId = node.dataset.roleId; if (!rId) return;
    node.addEventListener('click', (e) => {
      e.stopPropagation();
      constellationCurrentId = rId;
      zoomExploreToRole(rId);
    });
  });

  // ── Background click → zoom out of role (not map zoom)
  eaSvg.addEventListener('click', (e) => {
    if (!exploreZoomed) return;
    if (!e.target.closest('.ea-node') && !e.target.closest('#ea-overlay')) zoomExploreOut();
  });

  // ── Scroll wheel: zoom toward cursor position (viewBox stays square)
  eaSvg.addEventListener('wheel', (e) => {
    if (exploreZoomed) return;
    e.preventDefault();
    const vb   = eaSvg.getAttribute('viewBox').split(' ').map(Number);
    const [vx, vy, vw, vh] = vb;
    const factor = e.deltaY < 0 ? 0.82 : 1 / 0.82;
    // Keep width === height so the square container never shifts
    const newSide = Math.min(_eaCanvasW, Math.max(280, vw * factor));
    const newW = newSide, newH = newSide;
    // Keep cursor point fixed in SVG space
    const rect = eaSvg.getBoundingClientRect();
    const mx   = vx + (e.clientX - rect.left) / rect.width  * vw;
    const my   = vy + (e.clientY - rect.top)  / rect.height * vh;
    let nx = mx - (mx - vx) * (newW / vw);
    let ny = my - (my - vy) * (newH / vh);
    nx = Math.max(0, Math.min(_eaCanvasW - newW, nx));
    ny = Math.max(0, Math.min(_eaCanvasH - newH, ny));
    eaSvg.setAttribute('viewBox', `${nx.toFixed(1)} ${ny.toFixed(1)} ${newW.toFixed(1)} ${newH.toFixed(1)}`);
  }, { passive: false });

  // ── Pointer drag: pan when map-zoomed in
  eaSvg.addEventListener('selectstart', (e) => e.preventDefault());
  eaSvg.addEventListener('pointerdown', (e) => {
    if (exploreZoomed || e.target.closest('.ea-node') || e.target.closest('#ea-overlay')) return;
    const vb = eaSvg.getAttribute('viewBox').split(' ').map(Number);
    if (vb[2] >= _eaCanvasW - 1) return; // not zoomed, skip drag
    e.preventDefault(); // prevent text selection on drag start
    e.currentTarget.setPointerCapture(e.pointerId);
    eaSvg.style.cursor = 'grabbing';
    const rect = eaSvg.getBoundingClientRect();
    const scaleX = vb[2] / rect.width, scaleY = vb[3] / rect.height;
    const origVB = [...vb], sx = e.clientX, sy = e.clientY;
    const onMove = (ev) => {
      const dx = (ev.clientX - sx) * scaleX, dy = (ev.clientY - sy) * scaleY;
      const nx = Math.max(0, Math.min(_eaCanvasW - origVB[2], origVB[0] - dx));
      const ny = Math.max(0, Math.min(_eaCanvasH - origVB[3], origVB[1] - dy));
      eaSvg.setAttribute('viewBox', `${nx.toFixed(1)} ${ny.toFixed(1)} ${origVB[2].toFixed(1)} ${origVB[3].toFixed(1)}`);
    };
    const onUp = () => {
      eaSvg.style.cursor = '';
      eaSvg.removeEventListener('pointermove', onMove);
      eaSvg.removeEventListener('pointerup', onUp);
    };
    eaSvg.addEventListener('pointermove', onMove);
    eaSvg.addEventListener('pointerup', onUp);
  });

  // ── Zoom button overlay (appended after SVG so it floats on top)
  const existingControls = stage.querySelector('.ea-map-controls');
  if (existingControls) existingControls.remove();
  const zoomControls = document.createElement('div');
  zoomControls.className = 'ea-map-controls';
  zoomControls.innerHTML =
    `<button class="ea-zoom-btn" onclick="eaMapZoomIn()" title="Zoom in">+</button>` +
    `<button class="ea-zoom-btn" onclick="eaMapZoomOut()" title="Zoom out">−</button>` +
    `<button class="ea-zoom-btn ea-zoom-reset-btn" onclick="eaMapZoomReset()" title="Reset zoom">⊙</button>`;
  stage.appendChild(zoomControls);

  section.style.display = '';
  requestAnimationFrame(() => section.scrollIntoView({ behavior: 'smooth', block: 'start' }));
}

document.addEventListener('DOMContentLoaded', () => {
  // Constellation filter buttons
  document.getElementById('cFilterBar')?.addEventListener('click', (e) => {
    const btn = e.target.closest('.c-filter-btn');
    if (!btn || !selectedRoleId) return;
    document.querySelectorAll('.c-filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const type = btn.dataset.type;

    if (type === 'explore-all') {
      // Enter explore mode: full 93-role map, click highlights role + connections
      constellationExplore   = true;
      constellationCurrentId = selectedRoleId;
      constellationHistory   = [];
      document.getElementById('constellationStage')?.classList.add('explore-mode');
      renderExploreAll(selectedRoleId);
      updateConstellationBreadcrumb();
    } else {
      // Exit explore mode if active
      constellationExplore   = false;
      constellationCurrentId = null;
      constellationHistory   = [];
      document.getElementById('constellationStage')?.classList.remove('explore-mode');
      const bc = document.getElementById('constellationBreadcrumb');
      if (bc) bc.style.display = 'none';
      const filterType = type === '' ? null : type;
      renderConstellation(selectedRoleId, filterType);
    }
  });
});

/* ── SCROLL FADE-IN ANIMATIONS ──────────────────────────────── */
(function () {
  const targets = document.querySelectorAll(
    '.step, .feature-card, .premium-card, .reframe-card, .ux-card, .data-model-card, .mvp-card, blockquote, .closing-box, .role-card, .mobility-table-wrap'
  );
  targets.forEach(el => el.classList.add('fade-in'));

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const siblings = [...(entry.target.parentElement?.querySelectorAll('.fade-in') || [])];
        const idx = siblings.indexOf(entry.target);
        setTimeout(() => entry.target.classList.add('visible'), idx * 70);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.10 });

  targets.forEach(el => observer.observe(el));
})();

/* ── STICKY NAV SHADOW ──────────────────────────────────────── */
(function () {
  const nav = document.querySelector('.nav');
  if (!nav) return;
  const update = () => {
    nav.style.boxShadow = window.scrollY > 10
      ? '0 2px 20px rgba(0,0,0,.08)'
      : 'none';
  };
  window.addEventListener('scroll', update, { passive: true });
})();

/* ── SKILL BARS ANIMATE ON SCROLL ──────────────────────────── */
(function () {
  const bars = document.querySelectorAll('.skill-bar-fill');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.width = entry.target.dataset.width || getComputedStyle(entry.target).getPropertyValue('--w') || '50%';
        entry.target.style.transition = 'width 1.1s cubic-bezier(.22,1,.36,1)';
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });
  bars.forEach(bar => {
    const w = getComputedStyle(bar).getPropertyValue('--w').trim() || '50%';
    bar.dataset.width = w;
    bar.style.width = '0%';
    observer.observe(bar);
  });
})();
