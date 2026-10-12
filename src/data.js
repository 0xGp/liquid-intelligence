export const navLinks = [
  { href: '#marketplace', label: 'Marketplace' },
  { href: '#api-market', label: 'API Keys' },
  { href: '#list-key', label: 'List Key' },
  { href: '#payments', label: 'Payments' },
  { href: '#about', label: 'How it works' },
]

export const projects = [
  {
    meta: ['Google DeepMind', 'Native Audio'],
    title: 'Google Veo 3.1: Cinematic 4K',
    desc: 'Cinematic quality clips with native synchronized audio, dialogue, and sound effects directly from the model up to 148 seconds.',
    visual: 'network',
  },
  {
    meta: ['Kuaishou', 'Character Motion'],
    title: 'Kling 3.0 Pro: Realistic Human Movement',
    desc: 'Best-in-class physics and character motion consistency across complex shot transitions, with Kling Omni lip-sync capabilities.',
    visual: 'signal',
  },
  {
    meta: ['MiniMax', 'High Throughput'],
    title: 'MiniMax Hailuo 2.3 Pro: Rapid Social Clips',
    desc: 'Lightning-fast turnaround optimized for viral short-form social video at just $0.08 credits per second — the lowest cost in the marketplace.',
    visual: 'market',
  },
  {
    meta: ['Runway', 'Editing Suite'],
    title: 'Runway: Generation with Built-in Directing',
    desc: 'Pairs state-of-the-art diffusion generation with iterative camera controls and canvas editing tools for precise shot crafting.',
    visual: 'data',
  },
]

export const manifesto =
  "Video generation shouldn't require five separate $30/month subscriptions. Pay once with ETH, generate on any model per second of compute, and settle automatically before the render leaves the wire."

export const capabilities = [
  'Per-second output billing',
  'Unified ETH credit balance',
  'Zero monthly lock-in',
  'Instant automatic refund on failure',
  'Ethereum settlement',
  'Multi-provider routing',
]

export const services = [
  { num: '01', name: 'Per-second output billing', desc: 'Every model is billed strictly per second of rendered output. No rounding up to whole minutes, no wasted credits.' },
  { num: '02', name: 'One unified balance', desc: 'Deposit once with ETH. Credits are spendable across Google, Kling, MiniMax, and Runway.' },
  { num: '03', name: 'Zero subscription traps', desc: 'Stop juggling multiple $30/month tier subscriptions. Keep ETH on Ethereum and generate only when inspiration strikes.' },
  { num: '04', name: 'Instant failure refunds', desc: 'If any upstream model fails, timeouts, or errors, your credits are refunded immediately to your on-chain ledger.' },
  { num: '05', name: 'Native audio & 4K support', desc: 'Switch dynamically between budget tiers (Open-Sora at $0.03/s) and Hollywood-grade 4K audio (Veo 3.1 at $0.42/s).' },
  { num: '06', name: 'Full on-chain audit trail', desc: 'Every generation job, model invocation, and micropayment is metered, verified, and queryable on Ethereum.' },
]

export const stats = [
  { target: 5, label: 'Flagship Video Models' },
  { target: 100, label: 'On-chain metered %' },
  { target: 0, label: 'Monthly subscriptions needed' },
  { target: 30, label: 'Avg render turnaround (s)' },
]

export const marquee = [
  'Google Veo 3.1',
  'Kling 3.0 Pro',
  'MiniMax Hailuo 2.3 Pro',
  'Runway Gen',
  'Open-Sora 2.0',
  'Ethereum',
  'ETH Settlement Rail',
]
