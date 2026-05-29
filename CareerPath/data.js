/* ============================================================
   QUANTUM WORKPLACE — Career Path Data
   Source: QW Career Pathways Framework 2026
   ============================================================ */

const QW_ROLES = {

  /* ── CUSTOMER SUCCESS ──────────────────────────────────── */
  'associate-csm': {
    id: 'associate-csm',
    title: 'Associate CSM',
    fullTitle: 'Associate Customer Success Manager',
    dept: 'Customer Success',
    track: 'IC',
    level: 'Entry',
    overview: 'Supports Customer Success Managers in managing a portfolio of accounts. Handles customer onboarding logistics, scheduling, and follow-up. Monitors customer health scores and flags early churn signals.',
    competencies: [
      'Customer communication and relationship building',
      'CRM and CS platform basics (Gainsight, Salesforce)',
      'Time management and multi-account organization',
      'Active listening and empathy',
      'Product knowledge development',
    ],
    milestones: [
      'Independently manages a portfolio of small accounts with positive NPS',
      'Conducts QBRs for assigned accounts with minimal coaching',
      'Demonstrates product proficiency sufficient to answer most customer questions independently',
    ],
    next: {
      vertical: ['account-manager'],
      lateral: [],
      crossDept: [],
    },
    timeline: '—',
  },

  'account-manager': {
    id: 'account-manager',
    title: 'Account Manager',
    fullTitle: 'Account Manager',
    dept: 'Customer Success',
    track: 'IC',
    level: 'Mid-Level',
    overview: 'Manages a portfolio of mid-sized accounts with accountability for renewal and expansion. Conducts quarterly business reviews and ongoing strategic check-ins. Identifies and drives expansion opportunities.',
    competencies: [
      'Account management and renewal strategy',
      'QBR facilitation and executive communication',
      'Upsell and expansion identification',
      'Customer health monitoring (Gainsight)',
      'Multi-stakeholder relationship management',
    ],
    milestones: [
      'Achieves renewal rate target for 2+ consecutive quarters',
      'Closes at least one expansion deal independently',
      'Demonstrates measurable customer health improvement in portfolio',
    ],
    next: {
      vertical: ['csm'],
      lateral: ['partnership-success-manager', 'customer-implementation-manager'],
      crossDept: ['account-executive', 'product-manager'],
    },
    timeline: '—',
  },

  'csm': {
    id: 'csm',
    title: 'Customer Success Manager',
    fullTitle: 'Customer Success Manager',
    dept: 'Customer Success',
    track: 'IC',
    level: 'Mid-Senior',
    overview: 'Owns a strategic book of business with full accountability for retention, expansion, and customer health. Develops deep relationships with customer champions and executive sponsors. Leads strategic planning conversations and translates customer goals into product adoption roadmaps.',
    competencies: [
      'Strategic account management and customer ROI storytelling',
      'Executive relationship building',
      'Renewal forecasting and churn risk mitigation',
      'Product expertise and use-case mapping',
      'Mentoring and peer development',
    ],
    milestones: [
      'Manages book of business with 90%+ renewal rate',
      'Grows portfolio NPS by measurable margin',
      'Converts at least one at-risk account to healthy/advocate status',
    ],
    next: {
      vertical: ['senior-csm', 'csm-manager'],
      lateral: ['partnership-success-manager', 'senior-cim'],
      crossDept: ['account-executive', 'director-product-marketing'],
    },
    timeline: '—',
  },

  'senior-csm': {
    id: 'senior-csm',
    title: 'Senior CSM',
    fullTitle: 'Senior Customer Success Manager',
    dept: 'Customer Success',
    track: 'IC',
    level: 'Senior',
    overview: 'Manages enterprise and strategic accounts with complex stakeholder environments. Leads executive business reviews with VP and C-level contacts. Serves as escalation point for critical accounts and defines CS team best practices.',
    competencies: [
      'Enterprise account management and C-suite engagement',
      'Escalation management and recovery',
      'CS program and process design',
      'Churn modeling and risk analytics',
      'Mentoring and CS capability building',
    ],
    milestones: [
      'Manages 100%+ renewal rate for enterprise book for 2+ years',
      'Leads successful recovery of at least one strategic at-risk account',
      'Mentors at least two CSMs to measurable growth',
    ],
    next: {
      vertical: ['principal-csm', 'csm-director-strategic'],
      lateral: [],
      crossDept: ['director-customer-success', 'director-product-marketing'],
    },
    timeline: '~18–24 months from CSM',
  },

  'principal-csm': {
    id: 'principal-csm',
    title: 'Principal CSM',
    fullTitle: 'Principal Customer Success Manager',
    dept: 'Customer Success',
    track: 'IC',
    level: 'Principal',
    overview: 'Owns Quantum Workplace\'s highest-value or most complex customer relationships. Defines and evolves CS best practices, playbooks, and engagement frameworks. Serves as executive sponsor counterpart for key accounts.',
    competencies: [
      'Executive relationship management at enterprise scale',
      'CS strategy and program design',
      'Revenue impact analysis and customer advocacy',
      'Board-level communication and stakeholder influence',
    ],
    milestones: [
      'Manages portfolio of strategic accounts with industry-leading NPS and retention',
      'Designs a CS program adopted org-wide',
      'Recognized externally as a customer success thought leader',
    ],
    next: {
      vertical: [],
      lateral: [],
      crossDept: ['director-customer-success'],
    },
    timeline: '—',
  },

  'csm-manager': {
    id: 'csm-manager',
    title: 'CSM Manager',
    fullTitle: 'CSM Manager',
    dept: 'Customer Success',
    track: 'Management',
    level: 'Manager',
    overview: 'Manages a team of 4–8 CSMs with accountability for team renewal and expansion targets. Coaches CSMs on account strategy, QBR preparation, and risk management. Owns team onboarding and talent development.',
    competencies: [
      'CS team leadership and coaching',
      'Portfolio health management and retention forecasting',
      'CS toolstack management (Gainsight, Salesforce)',
      'Talent development and performance management',
      'Cross-functional partnership with Sales and Product',
    ],
    milestones: [
      'Team achieves 90%+ renewal rate for 2+ quarters',
      'Develops at least one CSM to Senior-level promotion readiness',
      'Builds and documents a scalable CS coaching cadence',
    ],
    next: {
      vertical: ['director-customer-success'],
      lateral: [],
      crossDept: [],
    },
    timeline: '—',
  },

  'director-customer-success': {
    id: 'director-customer-success',
    title: 'Director of CS',
    fullTitle: 'Director of Customer Success',
    dept: 'Customer Success',
    track: 'Management',
    level: 'Director',
    overview: 'Leads the full CS organization with accountability for retention, expansion, and customer health at scale. Partners with CCO and CRO on customer success strategy and revenue targets.',
    competencies: [
      'CS org leadership and multi-team management',
      'Retention and expansion strategy at scale',
      'CS technology and program design',
      'Executive communication and board reporting',
      'CS culture and talent strategy',
    ],
    milestones: [
      'CS org achieves company retention and NPS targets for 2+ years',
      'Builds a scalable CS motion adaptable to company growth',
      'Develops a CS Manager ready for Director-level progression',
    ],
    next: {
      vertical: ['chief-customer-officer'],
      lateral: [],
      crossDept: [],
    },
    timeline: '—',
  },

  'partnership-success-manager': {
    id: 'partnership-success-manager',
    title: 'Partnership Success Manager',
    fullTitle: 'Partnership Success Manager',
    dept: 'Customer Success',
    track: 'IC',
    level: 'Mid-Level',
    overview: 'Manages success relationships with channel partners, resellers, and integration partners. Ensures partners are equipped to deliver value using the Quantum Workplace platform.',
    competencies: [
      'Partner relationship management',
      'CS platform expertise',
      'Training and enablement delivery',
      'Cross-functional collaboration with BD and Sales',
    ],
    milestones: [
      'Achieves partner satisfaction and retention targets',
      'Enables partners to independently run QBRs and onboarding',
    ],
    next: {
      vertical: ['senior-csm'],
      lateral: ['csm'],
      crossDept: ['partner-development-manager'],
    },
    timeline: '—',
  },

  /* ── CUSTOMER IMPLEMENTATION ───────────────────────────── */
  'customer-implementation-manager': {
    id: 'customer-implementation-manager',
    title: 'Customer Implementation Manager',
    fullTitle: 'Customer Implementation Manager',
    dept: 'Customer Implementation & Support',
    track: 'IC',
    level: 'Mid-Level',
    overview: 'Owns end-to-end onboarding and implementation for a portfolio of new customers. Acts as primary technical point of contact during implementation. Partners with CS on handoff to ensure smooth transition to long-term success.',
    competencies: [
      'Project management and timeline ownership',
      'Customer onboarding and training facilitation',
      'Platform configuration and data migration',
      'Stakeholder management across customer orgs',
      'Risk identification and escalation',
    ],
    milestones: [
      'Achieves on-time implementation rate of 90%+ for assigned accounts',
      'Owns full onboarding cycle independently with minimal escalations',
    ],
    next: {
      vertical: ['senior-cim'],
      lateral: ['csm', 'account-manager'],
      crossDept: ['account-executive'],
    },
    timeline: '—',
  },

  'senior-cim': {
    id: 'senior-cim',
    title: 'Sr. Implementation Manager',
    fullTitle: 'Senior Customer Implementation Manager',
    dept: 'Customer Implementation & Support',
    track: 'IC',
    level: 'Senior',
    overview: 'Manages complex, enterprise-scale implementations. Defines implementation methodology and serves as an escalation resource for the team.',
    competencies: [
      'Enterprise implementation strategy',
      'Technical project leadership',
      'Customer executive relationship management',
      'Process design and documentation',
    ],
    milestones: [
      'Leads enterprise implementation with 95%+ CSAT',
      'Contributes to implementation playbook used by full team',
    ],
    next: {
      vertical: ['cim-manager'],
      lateral: ['senior-csm'],
      crossDept: [],
    },
    timeline: '—',
  },

  /* ── SALES ─────────────────────────────────────────────── */
  'sdr': {
    id: 'sdr',
    title: 'Sales Development Rep',
    fullTitle: 'Sales Development Representative',
    dept: 'Sales Development',
    track: 'IC',
    level: 'Entry',
    overview: 'Prospects and qualifies outbound leads through calls, emails, and social outreach. Schedules discovery calls and demos for Account Executives. Maintains accurate lead activity in CRM.',
    competencies: [
      'Prospecting and cold outreach',
      'CRM fundamentals (Salesforce)',
      'Active listening and objection handling basics',
      'Time management and pipeline hygiene',
      'Product and industry knowledge development',
    ],
    milestones: [
      'Consistently meets or exceeds monthly qualified meeting quota',
      'Maintains clean, accurate CRM pipeline',
      'Demonstrates product knowledge sufficient to conduct first-call discovery',
      'Qualifies for AE promotion after 12–18 months of consistent performance',
    ],
    next: {
      vertical: ['account-executive', 'sdr-manager'],
      lateral: ['bdr'],
      crossDept: ['csm'],
    },
    timeline: '—',
  },

  'account-executive': {
    id: 'account-executive',
    title: 'Account Executive',
    fullTitle: 'Account Executive',
    dept: 'Sales',
    track: 'IC',
    level: 'Mid-Level',
    overview: 'Manages full sales cycle from discovery through close for assigned territory or segment. Conducts compelling product demonstrations tailored to prospect needs. Builds multi-stakeholder relationships within prospect organizations.',
    competencies: [
      'Full-cycle sales execution (discovery, demo, proposal, negotiation, close)',
      'Multi-stakeholder selling and executive communication',
      'Pipeline management and sales forecasting',
      'CRM proficiency and sales methodology (MEDDIC, Challenger)',
      'Collaboration with CS and Marketing on deal support',
    ],
    milestones: [
      'Achieves or exceeds annual quota for 2+ consecutive years',
      'Manages a strong ARR pipeline independently',
      'Demonstrates consistent forecast accuracy within 10%',
      'Closes deals with 3+ stakeholders involved',
    ],
    next: {
      vertical: ['senior-ae', 'account-manager'],
      lateral: [],
      crossDept: ['csm', 'partner-development-manager'],
    },
    timeline: '—',
  },

  'senior-ae': {
    id: 'senior-ae',
    title: 'Senior Account Executive',
    fullTitle: 'Senior Account Executive',
    dept: 'Sales',
    track: 'IC',
    level: 'Senior',
    overview: 'Owns a strategic territory or named accounts with complex, multi-stakeholder deals. Develops and executes account plans for high-value enterprise prospects. Mentors junior AEs and contributes to sales playbook development.',
    competencies: [
      'Enterprise and strategic account selling',
      'Executive presence and C-suite communication',
      'Account planning and territory strategy',
      'Deal coaching and peer mentoring',
      'Competitive positioning and value-based selling',
    ],
    milestones: [
      'Closes one or more enterprise deals above ARR threshold',
      'Mentors a junior AE to quota achievement',
      'Contributes meaningfully to sales enablement or playbook',
      'Maintains top-quartile performance for 2+ years',
    ],
    next: {
      vertical: ['ae-team-lead'],
      lateral: [],
      crossDept: ['sales-enablement-manager'],
    },
    timeline: '—',
  },

  'ae-team-lead': {
    id: 'ae-team-lead',
    title: 'AE Team Lead',
    fullTitle: 'AE Team Lead',
    dept: 'Sales',
    track: 'IC → Management',
    level: 'Team Lead',
    overview: 'Carries a reduced individual quota while coaching a small pod of AEs (3–5). Runs deal reviews, pipeline inspections, and coaching sessions. Partners with the Director of Sales on territory design and go-to-market strategy.',
    competencies: [
      'Player-coach sales leadership',
      'Deal coaching and pipeline management',
      'Recruiting and onboarding support',
      'Forecasting and territory analysis',
      'Cross-functional collaboration with CS, Marketing, and BD',
    ],
    milestones: [
      'Pod collectively achieves quota for 2+ consecutive quarters',
      'Successfully onboards and ramps at least one new AE',
      'Contributes to a major process or playbook improvement',
    ],
    next: {
      vertical: ['director-sales'],
      lateral: [],
      crossDept: ['sales-enablement-manager'],
    },
    timeline: '—',
  },

  /* ── PRODUCT ────────────────────────────────────────────── */
  'product-manager': {
    id: 'product-manager',
    title: 'Product Manager',
    fullTitle: 'Product Manager',
    dept: 'Product',
    track: 'IC',
    level: 'Mid-Level',
    overview: 'Defines product requirements, works with Engineering and Design to ship features. Owns the roadmap for a product area and translates customer needs into product decisions.',
    competencies: [
      'Product requirements definition and documentation',
      'Cross-functional collaboration (Eng, Design, Data)',
      'Customer discovery and user research',
      'Roadmap prioritization and OKR alignment',
      'Data-driven decision making',
    ],
    milestones: [
      'Ships a major feature with measurable customer impact',
      'Owns a product area roadmap with minimal direction',
      'Leads cross-functional sprint planning independently',
    ],
    next: {
      vertical: ['senior-pm'],
      lateral: ['product-designer-ii', 'data-scientist-ii'],
      crossDept: ['csm', 'insights-analyst', 'sales-enablement-manager'],
    },
    timeline: '—',
  },

  /* ── MARKETING ──────────────────────────────────────────── */
  'director-product-marketing': {
    id: 'director-product-marketing',
    title: 'Director of Product Marketing',
    fullTitle: 'Director of Product Marketing',
    dept: 'Marketing',
    track: 'Management',
    level: 'Director',
    overview: 'Sets product marketing strategy, manages positioning and messaging, and leads a team of PMMs. Partners closely with Product and Sales to drive GTM motions.',
    competencies: [
      'Product positioning and messaging at scale',
      'GTM strategy and launch management',
      'Sales enablement and competitive intelligence',
      'Team leadership and PMM development',
      'Executive communication and cross-functional influence',
    ],
    milestones: [
      'Leads a successful major product launch with measurable pipeline impact',
      'Builds and manages a high-performing PMM team',
      'Develops competitive positioning adopted across Sales org',
    ],
    next: {
      vertical: ['vp-marketing'],
      lateral: [],
      crossDept: [],
    },
    timeline: '—',
  },

};

/* ── DEPARTMENT METADATA ────────────────────────────────────── */
const QW_DEPARTMENTS = [
  'Customer Success',
  'Customer Implementation & Support',
  'Sales',
  'Sales Development',
  'Product',
  'Engineering',
  'Marketing',
  'People / HR',
  'Revenue Operations',
  'Insights',
  'Business Development',
  'Finance & Administration',
  'Information Technology',
];

/* ── CROSS-DEPT MOBILITY MATRIX ─────────────────────────────── */
const QW_MOBILITY = [
  {
    from: 'Sales Development Representative',
    to: 'Account Executive',
    why: 'Strong pipeline mastery and deal knowledge',
    need: 'After 12–24 months of consistent SDR quota achievement',
  },
  {
    from: 'Account Executive',
    to: 'Customer Success Manager',
    why: 'Customer relationship skills and product knowledge',
    need: 'After 1–2 years of AE experience; CS orientation required',
  },
  {
    from: 'Customer Success Manager',
    to: 'Account Executive',
    why: 'Customer relationship depth and product storytelling',
    need: 'After 3+ years of CS; demonstrated expansion/growth mindset',
  },
  {
    from: 'Software Developer',
    to: 'Product Manager',
    why: 'Technical depth and cross-functional experience',
    need: 'After 2–3 years of Dev experience; PM training or MBA a plus',
  },
  {
    from: 'Customer Support Specialist',
    to: 'Customer Implementation Manager',
    why: 'Platform expertise and customer communication',
    need: 'After 2 years of support experience; project management skills',
  },
  {
    from: 'Product Designer',
    to: 'Lead Researcher (Insights)',
    why: 'UX research background and human behavioral interest',
    need: 'After 3+ years of design/research experience',
  },
  {
    from: 'Insights Analyst',
    to: 'Marketing Analyst / Product Manager',
    why: 'Data fluency and business impact orientation',
    need: 'After 2+ years of analytics; demonstrated business partnership',
  },
  {
    from: 'Marketing Analyst',
    to: 'Revenue Operations Manager',
    why: 'Campaign analytics and GTM data familiarity',
    need: 'After 2–3 years of marketing analytics; CRM proficiency',
  },
  {
    from: 'People Operations Specialist',
    to: 'Employee Experience Manager',
    why: 'HR knowledge and engagement program interest',
    need: 'After 2 years in HR operations; strong communication skills',
  },
  {
    from: 'Data Scientist',
    to: 'Product Manager',
    why: 'Analytical rigor and product understanding',
    need: 'After 2+ years of data science; demonstrated PM interest and skills',
  },
];

/* ── SCENARIO MODE ──────────────────────────────────────────── */
const QW_SCENARIOS = [
  {
    prompt: 'You want more strategic work but less day-to-day client interaction.',
    roles: ['Revenue Operations Manager', 'Sales Enablement Manager', 'Product Manager', 'Insights Analyst'],
  },
  {
    prompt: 'You enjoy coaching others and want to build a team.',
    roles: ['CSM Manager', 'SDR Manager', 'People Operations Specialist', 'L&D Specialist'],
  },
  {
    prompt: 'You want to move into a more technical role.',
    roles: ['Data Implementation Analyst', 'Revenue Operations Analyst', 'Product Manager', 'Data Scientist'],
  },
  {
    prompt: 'You\'re excited by new business and want a growth challenge.',
    roles: ['Account Executive', 'Business Development Representative', 'Partner Development Manager', 'Sales Enablement Manager'],
  },
];
