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
function buildModalHTML(roleId) {
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
          <span class="modal-level">${role.level}</span>
          ${trackBadge}
          ${role.timeline !== '—' ? `<span class="modal-timeline">⏱ ${role.timeline}</span>` : ''}
        </div>
      </div>
      <button class="modal-close" onclick="closeModal()" aria-label="Close">✕</button>
    </div>

    <div class="modal-tabs" role="tablist">
      <button class="modal-tab active" data-tab="overview"      onclick="switchTab(this, 'overview')">Overview</button>
      <button class="modal-tab"        data-tab="competencies"  onclick="switchTab(this, 'competencies')">Competencies</button>
      <button class="modal-tab"        data-tab="milestones"    onclick="switchTab(this, 'milestones')">Milestones</button>
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

      <div class="modal-panel" data-panel="milestones">
        <ul class="modal-list modal-list-check">
          ${(role.milestones || []).map(m => `<li>${m}</li>`).join('')}
        </ul>
      </div>

      <div class="modal-panel" data-panel="next">
        ${nextStepsHTML()}
      </div>
    </div>
  `;
}

function openModal(roleId) {
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

  overlay.innerHTML = `<div class="modal-box" role="dialog" aria-modal="true">${buildModalHTML(roleId)}</div>`;
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
  const pillsContainer = document.getElementById('filterPills');
  const cardGrid       = document.getElementById('roleCardGrid');

  // ── Build filter pills from QW_DEPARTMENTS
  (QW_DEPARTMENTS || ['All']).forEach((dept, i) => {
    const pill = document.createElement('span');
    pill.className = 'filter-pill' + (i === 0 ? ' active' : '');
    pill.textContent = dept;
    pillsContainer.appendChild(pill);
  });

  // ── Build role cards from QW_ROLES (sorted by dept then title)
  const sortedRoles = Object.values(QW_ROLES).sort((a, b) => {
    if (a.dept < b.dept) return -1;
    if (a.dept > b.dept) return  1;
    return a.title.localeCompare(b.title);
  });

  sortedRoles.forEach((role, idx) => {
    const card = document.createElement('div');
    card.className = 'role-card';
    card.dataset.roleId = role.id;
    card.innerHTML = `
      <div class="role-card-dept">${role.dept}</div>
      <div class="role-card-title">${role.title}</div>
      <div class="role-card-level">${role.level || ''} · ${role.track === 'Mgmt' ? 'Management Track' : 'IC Track'}</div>
    `;
    cardGrid.appendChild(card);
  });

  // ── Wire up filter pills
  function getCards() { return Array.from(cardGrid.querySelectorAll('.role-card')); }

  pillsContainer.addEventListener('click', (e) => {
    const pill = e.target.closest('.filter-pill');
    if (!pill) return;
    pillsContainer.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
    pill.classList.add('active');
    const dept = pill.textContent.trim();
    getCards().forEach(card => {
      const cardDept = card.querySelector('.role-card-dept')?.textContent?.trim() || '';
      const show = dept === 'All' || cardDept === dept;
      card.style.display = show ? '' : 'none';
      if (show) {
        card.style.animation = 'none';
        requestAnimationFrame(() => {
          card.style.animation = '';
          card.classList.add('card-fade-in');
        });
      }
    });
  });

  // ── Wire up card clicks
  cardGrid.addEventListener('click', (e) => {
    const card = e.target.closest('.role-card');
    if (!card) return;
    const roleId = card.dataset.roleId;

    // Selection state
    getCards().forEach(c => c.classList.remove('role-card-selected'));
    card.classList.add('role-card-selected');
    cardGrid.querySelectorAll('.role-card-badge').forEach(b => b.remove());
    const badge = document.createElement('div');
    badge.className = 'role-card-badge';
    badge.textContent = 'You are here';
    card.appendChild(badge);

    selectedRoleId = roleId;
    updateExampleFlow(roleId);

    // Open modal if role data exists
    if (QW_ROLES[roleId]) openModal(roleId);
  });

  // ── Search bar live filter
  const searchBar = document.querySelector('.search-bar');
  if (searchBar) {
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Search roles, departments, or skills…';
    input.style.cssText = 'border:none;background:none;outline:none;font:inherit;color:inherit;width:100%;font-size:.88rem;';
    const placeholder = searchBar.querySelector('.search-placeholder');
    if (placeholder) placeholder.replaceWith(input);

    input.addEventListener('input', () => {
      const q = input.value.toLowerCase();
      // Reset pills
      pillsContainer.querySelectorAll('.filter-pill').forEach((p, i) => {
        p.classList.toggle('active', i === 0);
      });
      getCards().forEach(card => {
        const text = card.textContent.toLowerCase();
        card.style.display = !q || text.includes(q) ? '' : 'none';
      });
    });
  }
})();

/* ── UPDATE EXAMPLE FLOW ─────────────────────────────────────── */
function updateExampleFlow(roleId) {
  const role = QW_ROLES[roleId];
  if (!role) return;

  // Update "current role" node
  const currentNode = document.querySelector('.flow-node-current .flow-node-title');
  if (currentNode) currentNode.textContent = role.fullTitle;

  // Update branch nodes
  const branchContainer = document.querySelector('.flow-branches');
  if (!branchContainer) return;

  const { vertical = [], lateral = [], crossDept = [] } = role.next || {};
  const allNext = [
    ...vertical.map(id  => ({ id, type: 'vertical',  icon: '↑', label: 'Vertical'   })),
    ...lateral.map(id   => ({ id, type: 'lateral',   icon: '↔', label: 'Lateral'    })),
    ...crossDept.map(id => ({ id, type: 'crossdept', icon: '⟺', label: 'Cross-Dept' })),
  ];

  if (!allNext.length) {
    branchContainer.innerHTML = `<p style="color:var(--ink-faint);font-size:.9rem;">Highest level in this track.</p>`;
    return;
  }

  branchContainer.innerHTML = allNext.map(n => {
    const title = QW_ROLES[n.id]?.title || n.id;
    const cssType = n.type === 'crossdept' ? 'crossdept' : n.type;
    return `
      <div class="flow-branch">
        <div class="flow-node flow-node-${cssType} flow-node-clickable" data-role-id="${n.id}" tabindex="0" role="button" aria-label="View ${title}">
          <div class="flow-node-move-type">${n.icon} ${n.label}</div>
          <div class="flow-node-title">${title}</div>
        </div>
      </div>`;
  }).join('');

  // Wire up click handlers on new nodes
  branchContainer.querySelectorAll('.flow-node-clickable').forEach(node => {
    const rId = node.dataset.roleId;
    const handler = () => { if (rId && QW_ROLES[rId]) openModal(rId); };
    node.addEventListener('click', handler);
    node.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') handler(); });
  });
}

/* ── STATIC FLOW NODE CLICK HANDLERS (initial HTML) ─────────── */
document.addEventListener('DOMContentLoaded', () => {
  // Make static flow nodes clickable
  document.querySelectorAll('.flow-node[data-role-id]').forEach(node => {
    const rId = node.dataset.roleId;
    if (!rId) return;
    node.style.cursor = 'pointer';
    node.setAttribute('tabindex', '0');
    node.setAttribute('role', 'button');
    node.addEventListener('click', () => { if (QW_ROLES[rId]) openModal(rId); });
    node.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { if (QW_ROLES[rId]) openModal(rId); }
    });
  });

  // Initial flow render
  updateExampleFlow(selectedRoleId);

  // Wire up role card "view details" on the static detail card
  const detailCard = document.querySelector('.role-detail-card');
  if (detailCard) {
    const viewBtn = document.createElement('button');
    viewBtn.className = 'btn btn-primary detail-open-btn';
    viewBtn.textContent = 'Open full role detail →';
    viewBtn.addEventListener('click', () => openModal('senior-csm'));
    detailCard.appendChild(viewBtn);
  }
});

/* ── SCENARIO MODE ──────────────────────────────────────────── */
(function () {
  const prompts = document.querySelectorAll('.scenario-prompt');
  prompts.forEach((prompt, idx) => {
    prompt.style.cursor = 'pointer';
    prompt.setAttribute('tabindex', '0');
    prompt.setAttribute('role', 'button');
    prompt.setAttribute('title', 'Click to explore this scenario');

    const toggle = () => {
      const isActive = prompt.classList.contains('scenario-active');
      prompts.forEach(p => p.classList.remove('scenario-active'));
      if (!isActive) {
        prompt.classList.add('scenario-active');
        activeScenario = idx;
      } else {
        activeScenario = null;
      }
    };
    prompt.addEventListener('click', toggle);
    prompt.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') toggle(); });
  });
})();

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
