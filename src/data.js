export const navLinks = [
  { href: '#work', label: 'Use cases' },
  { href: '#about', label: 'How it works' },
  { href: '#services', label: 'Features' },
  { href: '#contact', label: 'Docs' },
]

export const projects = [
  {
    meta: ['Research networks', 'Multi-agent'],
    title: 'A lead agent, paying its own team',
    desc: 'A lead agent fans out sub-queries to specialist agents and pays each one only for what it actually uses.',
    visual: 'network',
  },
  {
    meta: ['Trading systems', 'Autonomous'],
    title: 'Bots paying for signal, per query',
    desc: 'Autonomous trading bots pay data and signal providers per query, with spend capped to strategy budget in real time.',
    visual: 'signal',
  },
  {
    meta: ['Orchestration', 'Sub-agents'],
    title: 'A marketplace of sub-agents',
    desc: 'Orchestrators delegate tasks to a marketplace of sub-agents and settle per completed unit of work.',
    visual: 'market',
  },
  {
    meta: ['Data marketplaces', 'Machine-to-machine'],
    title: 'Metered access to live data',
    desc: 'Feed providers charge per row or per refresh, and agents settle automatically as they consume it.',
    visual: 'data',
  },
]

export const plates = [
  { src: '/assets/gpu-00-marketplace.png', label: '01 — Marketplace' },
  { src: '/assets/gpu-01-call.png', label: '02 — Call' },
  { src: '/assets/gpu-02-meter.png', label: '03 — Meter' },
  { src: '/assets/gpu-03-authorize.png', label: '04 — Authorize' },
  { src: '/assets/gpu-04-settle.png', label: '05 — Settle' },
  { src: '/assets/gpu-05-audit.png', label: '06 — Audit trail' },
]

export const manifesto =
  "A payment isn't a transaction. It's trust. Made instant. Made small enough to happen a thousand times a second, so an agent can ask for exactly what it needs and pay for exactly what it used — nothing invoiced, nothing owed."

export const capabilities = [
  'Real-time settlement',
  'Usage-based pricing',
  'Programmable limits',
  'Audit trail',
  'Agent identity',
  'Escrow & holds',
]

export const services = [
  { num: '01', name: 'Real-time settlement', desc: 'No batching windows. Value moves the instant a call completes.' },
  { num: '02', name: 'Usage-based pricing', desc: 'Price per call, per token, or per compute-second — set by the receiving agent.' },
  { num: '03', name: 'Spending limits', desc: 'Cap what an agent can spend per hour, per counterparty, or per task.' },
  { num: '04', name: 'Agent identity', desc: "Every call is signed and verifiable, so counterparties know exactly who they're paying." },
  { num: '05', name: 'Escrow & holds', desc: 'Funds can be held pending task completion, then released automatically on success.' },
  { num: '06', name: 'Full audit trail', desc: 'Every authorization and settlement is logged, signed, and queryable.' },
]

export const stats = [
  { target: 180, label: 'Median settlement (ms)' },
  { target: 99, label: 'Authorization uptime %' },
  { target: 4200, label: 'Agents connected' },
  { target: 40, label: 'Auth latency (ms)' },
]

export const marquee = [
  'Orchestrator.ai',
  'Signal Mesh',
  'Fieldwork Agents',
  'Loop Trading',
  'Northbound Data',
  'Sub-Agent Exchange',
]
