/* ============================================================
   QUANTUM CAREER PATH EXPLORER — script.js
   Interactive features: filters, modal, canvas, animations
   ============================================================ */

/* ── STATE ──────────────────────────────────────────────────── */
let selectedRoleId = 'csm';
let activeModal    = null;
let activeScenario = null;

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
    if (!vertical.length && !lateral.length && !crossDept.length)
      return '<p class="modal-empty">Highest level in this track.</p>';

    const section = (type, icon, heading, ids) => {
      if (!ids.length) return '';
      const chips = ids.map(id => {
        const label = QW_ROLES[id]?.title || id;
        return `<button class="next-step-chip next-step-${type}" onclick="openModal('${id}')" title="View ${label}">${icon} ${label}</button>`;
      }).join('');
      return `
        <div class="next-steps-group">
          <p class="next-steps-group-label">${heading}</p>
          <div class="next-steps-group-chips">${chips}</div>
        </div>`;
    };

    return [
      section('vertical',  '↑', 'Vertical paths',              vertical),
      section('lateral',   '↔', 'Lateral moves',               lateral),
      section('crossdept', '⟺', 'Cross-department opportunities', crossDept),
    ].join('');
  };

  const trackBadge = role.track === 'Management'
    ? `<span class="track-badge track-mgmt">Management Track</span>`
    : `<span class="track-badge track-ic">IC Track</span>`;

  return `
    <div class="modal-header">
      <div class="modal-header-left">
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

function startOver() {
  closeModal();
  selectedRoleId = null;
  selectedTargetRoleId = null;
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

  overlay.innerHTML = `<div class="modal-box" role="dialog" aria-modal="true">${buildModalHTML(roleId, mode)}</div>`;
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
  activeModal = roleId;

  // Focus first focusable element
  requestAnimationFrame(() => {
    const closeBtn = overlay.querySelector('.modal-close');
    if (closeBtn) closeBtn.focus();
  });
}

function closeModal() {
  const overlay = document.getElementById('modal-overlay');
  if (overlay) {
    overlay.classList.remove('open');
    document.body.style.overflow = '';
    activeModal = null;
  }
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

  // Pseudo-random stars seeded by roleId
  function pseudoRand(seed) {
    let s = seed;
    return () => { s = (s * 16807 + 0) % 2147483647; return (s - 1) / 2147483646; };
  }
  const rand = pseudoRand(roleId.split('').reduce((a, c) => a + c.charCodeAt(0), 0));
  const stars = Array.from({ length: 50 }, () => ({
    x: (rand() * W).toFixed(1), y: (rand() * H).toFixed(1),
    r: (rand() * 1.3 + 0.4).toFixed(2), o: (rand() * 0.45 + 0.12).toFixed(2),
  }));

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
      <rect class="c-node-pill" x="${px.toFixed(1)}" y="${py.toFixed(1)}" width="${pw}" height="${ph}" rx="${rx}" fill="${cfg.fill}" stroke="${cfg.stroke}" stroke-width="${sw}"/>
      <text x="${nx.toFixed(1)}" y="${iconY}" text-anchor="middle" fill="${cfg.stroke}" font-size="${ICON_FS}" font-family="Inter,system-ui,sans-serif" font-weight="700">${cfg.icon}</text>
      ${titleRows}
      <text x="${nx.toFixed(1)}" y="${deptY}" text-anchor="middle" fill="${cfg.stroke}" font-size="${DEPT_FS}" font-family="Inter,sans-serif" font-weight="400" opacity="0.7">${n.role.dept}</text>
    </g>`;
  }

  const svgHTML = `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;display:block;border-radius:16px;border:1.5px solid #62B6F3" role="img" aria-label="Career constellation map for ${role.title}">
  <defs>
    <radialGradient id="c-bg" cx="50%" cy="50%" r="65%">
      <stop offset="0%" stop-color="#FFFFFF"/>
      <stop offset="65%" stop-color="#F5F6FA"/>
      <stop offset="100%" stop-color="#ECEEF4"/>
    </radialGradient>
    <radialGradient id="c-center-glow" cx="50%" cy="50%" r="22%">
      <stop offset="0%" stop-color="#E3530F" stop-opacity="0.07"/>
      <stop offset="100%" stop-color="#E3530F" stop-opacity="0"/>
    </radialGradient>
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
  </defs>

  <!-- Background -->
  <rect width="${W}" height="${H}" fill="url(#c-bg)" rx="16"/>
  <rect width="${W}" height="${H}" fill="url(#c-center-glow)" rx="16"/>

  <!-- Dot grid -->
  ${stars.map(s => `<circle cx="${s.x}" cy="${s.y}" r="${s.r}" fill="#B8BCC8" opacity="${(parseFloat(s.o) * 0.6).toFixed(2)}"/>`).join('\n  ')}

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
    <circle cx="${cx}" cy="${cy}" r="${CR}" fill="#E3530F" stroke="#FF7500" stroke-width="2.5" filter="url(#glow-center)"/>
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

    // Click: open modal in "plan" mode (Step 3 → Development Planner)
    const activate = () => openModal(rId, 'plan');
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
document.addEventListener('DOMContentLoaded', () => {
  // Constellation filter buttons
  document.getElementById('cFilterBar')?.addEventListener('click', (e) => {
    const btn = e.target.closest('.c-filter-btn');
    if (!btn || !selectedRoleId) return;
    document.querySelectorAll('.c-filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const type = btn.dataset.type || null; // '' → null for "All"
    renderConstellation(selectedRoleId, type);
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
