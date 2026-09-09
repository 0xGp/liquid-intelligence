# Relay

**A payment rail for AI agents**

Technical white paper · September 2026 · Version 0.1

---

## Abstract

Software agents already call other agents — for research, signals, data, and delegated work. They do this thousands of times more often than a human would open an invoice. Existing money rails were built for people and for batches: cards, ACH, monthly billing, purchase orders. They are too slow, too coarse, and too human to sit on the critical path of a machine-to-machine request.

Relay is a **metered payment rail** that sits between agents. Every call is priced, authorized, and settled **before the response leaves the wire**. Value moves in milliseconds, in units as small as a single query, token, row, or compute-second. The paying agent spends against programmable limits. The receiving agent is paid for exactly what it used. Nothing is invoiced. Nothing is owed.

This paper describes the problem, the protocol shape, the lifecycle of a settled call, the trust and identity model, and the product surface Relay exposes to agent builders.

---

## 1. The problem

### 1.1 Agents are already counterparties

A lead research agent fans out sub-queries to specialists. A trading bot buys a signal. An orchestrator delegates a unit of work to a marketplace of sub-agents. A model refreshes a live data feed. In each case, one program is consuming a scarce resource owned by another program.

Today that consumption is usually:

- **Free and informal** — until it is abused, then it is shut off.
- **Human-billed** — API keys, prepaid credits, monthly invoices, sales contracts.
- **All-or-nothing** — a subscription that overpays for idle capacity, or a hard block that under-serves a burst.

None of these match the actual unit of work: a call.

### 1.2 Human rails fail at machine tempo

Human payment systems assume:

| Assumption | Reality for agents |
|---|---|
| A person is in the loop | No person is watching each call |
| Settlement can wait hours or days | The next call is already in flight |
| The unit of sale is a SKU or a month | The unit of sale is a query, a token, a row |
| Chargebacks and invoices repair mistakes | There is no time to repair; the work already happened |
| Identity is an email and a card | Identity is a key, a workload, a policy |

A rail for agents must therefore be **small, fast, signed, and capped**. Small enough that a single call is worth settling. Fast enough that settlement is cheaper than waiting. Signed so both sides can prove who paid whom. Capped so a runaway agent cannot drain a treasury.

### 1.3 Trust is the product

A payment between agents is not only a transfer of value. It is a compressed statement of trust:

- I know who you are.
- I know what this call is allowed to cost.
- I know the funds exist.
- I know they will move when the work is done.
- I can prove all of that later.

Relay treats that statement as infrastructure.

---

## 2. What Relay is

Relay is **not a bank, not a card network, and not an LLM**. It is a settlement pipe that agents plug into.

At the product level it provides six primitives:

1. **Real-time settlement** — value moves when the call completes, with no batching window.
2. **Usage-based pricing** — the receiving agent prices per call, per token, per row, or per compute-second.
3. **Spending limits** — the paying agent (or its operator) caps spend per hour, per counterparty, or per task.
4. **Agent identity** — every call is signed and verifiable.
5. **Escrow and holds** — funds can be reserved until the task succeeds, then released automatically.
6. **Audit trail** — every authorization and settlement is logged, signed, and queryable.

The public claim of the rail is simple:

> Agents pay agents. Per call. In real time.

---

## 3. Design principles

**Meter the wire, not the month.** Charge the actual unit of consumption. If the work was one query, settle one query.

**Authorize before serve.** The receiving agent should not spend compute on a caller who cannot pay. Authorization is a precondition of work, not a reconciliation after it.

**Settle at machine speed.** Target median settlement on the order of hundreds of milliseconds, authorization on the order of tens of milliseconds. If settlement is slower than the call, agents will go around the rail.

**Programmable risk.** Humans set policy (budgets, counterparties, max price). Agents execute inside that policy. A runaway loop hits a limit, not a finance team.

**Proof over invoices.** The audit trail is the books. Every settled call is a signed receipt. Disputes start from cryptographic evidence, not from a PDF.

**Hold when the work is uncertain.** For multi-step or long tasks, escrow the estimated cost, then release or reverse on completion. Do not pretend a 20-minute job is a 20-millisecond card swipe.

---

## 4. Actors and accounts

```
 Operator (human or org)
    │  issues policy, funds treasury, reviews audit
    ▼
 Paying agent  ──call──►  Relay  ──work──►  Receiving agent
    │                      │                      │
    │  wallet, limits      │  meter, auth,        │  price list,
    │  identity key        │  escrow, settle      │  identity key
```

**Operator.** Owns the treasury. Writes spend policy. Is the legal and financial principal. Does not sit in the request path.

**Paying agent.** Holds a Relay identity and a wallet (or a sub-balance drawn from the operator treasury). Signs requests. Consumes services.

**Receiving agent.** Publishes a price. Signs responses. Earns into its own wallet.

**Relay.** Does not do the agent’s job. It meters the call, checks identity and limits, holds or moves value, and writes the receipt.

Wallets are **agent-scoped**. An orchestrator can hold a parent balance and issue **task-scoped sub-wallets** to children, each with its own cap. That is how a lead agent pays a team without giving every specialist the keys to the company.

---

## 5. Lifecycle of a settled call

The product surface is five stages. They are sequential on the happy path and abortable at every gate.

### 5.1 Call

The paying agent constructs a **call intent**:

- caller identity
- callee identity
- capability requested (e.g. `signals.quote`, `data.rows`, `research.subquery`)
- estimated usage (tokens, rows, seconds) if known
- task / correlation id
- max acceptable price
- signature

The intent is sent to Relay (directly, or via an SDK that wraps the callee’s endpoint). Relay does not yet move money. It only accepts a well-formed, signed request.

### 5.2 Meter

Relay binds the intent to a **meter**.

Meters are defined by the receiving agent:

| Meter | Typical use |
|---|---|
| Per call | Cheap, fixed-cost endpoints |
| Per token | Model inference |
| Per row / per refresh | Data feeds |
| Per compute-second | Heavy jobs |
| Composite | e.g. base fee + token overage |

If usage is known up front (a single priced call), the meter is a constant. If usage is observed during the call (streaming tokens), Relay opens a **running meter** against a hold.

The paying agent’s `max_price` is checked against the receiver’s quote. If the quote exceeds the max, the call is rejected before work starts.

### 5.3 Authorize

Authorization answers four questions, in order:

1. **Who?** Is the caller a known, unrevoked identity?
2. **May they?** Does policy allow this counterparty, this capability, this task?
3. **Can they pay?** Is there available balance (or credit) for the quoted maximum?
4. **Within limits?** Would this call breach hourly, per-task, or per-counterparty caps?

If any check fails, Relay returns a structured denial (`identity`, `policy`, `insufficient_funds`, `limit`). No work is performed. No hold is placed.

If all checks pass, Relay issues an **authorization grant**: a short-lived, signed token bound to the call id, the meter, and the maximum amount. The receiving agent will not start work without a valid grant.

On this path Relay may **hold** the authorized amount (see §6).

### 5.4 Settle

When the receiving agent finishes (or the stream ends), it reports **final usage**. Relay:

- computes the actual charge from the meter
- never charges above the authorized maximum
- releases unused hold back to the payer
- credits the receiver
- writes a signed **settlement receipt** to both sides

Settlement is the moment value actually moves. The product target is **no batching window**: the receipt is the books.

If the receiver fails, times out, or returns an error classified as non-billable, the hold is released in full. Partial work can be settled at the metered amount if both sides’ terms allow it.

### 5.5 Audit trail

Every authorization, denial, hold, release, and settlement is appended to an **append-only log**, keyed by:

- call id
- task / correlation id
- payer and payee identities
- meter and amounts
- timestamps
- signatures

Operators query this log the way they query a ledger: by agent, by counterparty, by task, by time. Agents can fetch the receipt for a single call without seeing the rest of the treasury.

This is how “nothing invoiced, nothing owed” stays true: the trail is complete at the granularity of the work.

---

## 6. Escrow and holds

Not every call is a round trip of a few milliseconds. Orchestrators, research jobs, and marketplace tasks can run long enough that “pay after” leaves the receiver exposed, and “pay before” leaves the payer exposed.

Relay therefore supports **holds**:

1. Authorize for `max_amount`.
2. Lock that amount in escrow, still owned by the payer, invisible to other spend.
3. On success, settle the metered amount from escrow; return the remainder.
4. On failure, return the full hold.
5. On dispute or timeout, follow the capability’s published terms (release, split, or operator review).

Holds are the machine equivalent of a card authorization. They make multi-step work possible without monthly contracts.

Task-scoped wallets compose with holds: a lead agent funds a task wallet, children authorize against it, and when the task closes the unused balance returns to the parent.

---

## 7. Identity

Every Relay principal is an **agent identity**:

- a public key (or a certificate chain rooted at the operator)
- a Relay account id
- optional metadata: owner, environment, capabilities advertised

Calls are signed. Grants are signed. Receipts are signed. Revocation is immediate: a revoked key cannot authorize, even if a wallet still has funds.

Identity is **not** a human login. Humans authenticate to the operator console. Agents authenticate with keys, rotated on a schedule, scoped to environments (dev / staging / prod).

This is what makes counterparties willing to serve strangers at machine speed: they are not serving a stranger. They are serving a verifiable principal with a wallet and a policy.

---

## 8. Pricing and limits

**Receivers publish prices.** A price list is versioned. The grant records which version was quoted, so a mid-call price change cannot rewrite history.

**Payers publish limits.** Typical dimensions:

- max spend per hour / day
- max spend per counterparty
- max spend per task
- max price per call
- allow / deny lists of counterparties and capabilities

Limits are evaluated at authorization time against **committed** spend (settled + outstanding holds), not only against settled spend. That prevents a burst of in-flight calls from overrunning the budget.

When a limit would be breached, Relay fails closed. The agent can retry with a cheaper callee, a smaller request, or wait for the window to reset — or the operator can raise the cap.

---

## 9. Failure, timeout, and dispute

| Event | Default behavior |
|---|---|
| Auth denied | No hold, no work, structured error |
| Callee never starts | Grant expires, hold released |
| Callee errors (non-billable) | Hold released |
| Partial stream | Settle metered usage if terms allow; else release |
| Charge would exceed grant | Cap at grant; receiver ate the overage |
| Double-report of usage | Idempotent on call id; first valid report wins |
| Key compromise | Revoke, freeze wallet, rotate, replay audit |

Relay does not try to be a court. It tries to make the common cases automatic and the rare cases **evidence-complete**. Operator review starts from receipts, not from chat logs.

---

## 10. How an agent uses the rail

From a builder’s point of view the path is:

1. **Create an operator account** and fund a treasury.
2. **Issue an agent identity** (key + wallet) for each workload.
3. **Set policy** — budgets, counterparties, max prices.
4. **If you sell work:** publish a meter and a price; require a Relay grant on inbound calls.
5. **If you buy work:** wrap outbound calls with the Relay SDK so each request carries a signed intent and waits for a grant.
6. **Read the audit trail** in the console or via API — by task, by agent, by counterparty.

The agent’s “wallet” is not a place the model thinks about in natural language. It is a runtime constraint: the SDK either obtains a grant or the call does not go out.

That is the operational meaning of the product line *give your agents a wallet, not an invoice*.

---

## 11. Reference architectures

### 11.1 Lead agent, paying its own team

A research orchestrator receives a user task with a budget. It opens a task wallet, fans out sub-queries to specialist agents, and lets Relay settle each sub-call against that wallet. Specialists are paid only for what they actually used. Unused budget returns when the task closes.

### 11.2 Bots paying for signal, per query

A trading agent is capped to a strategy budget. Each signal query is authorized against remaining budget in real time. If the strategy is down for the day, further signal spend is denied — the model cannot “just try once more” with someone else’s money.

### 11.3 Marketplace of sub-agents

An orchestrator posts work. Eligible sub-agents quote. The orchestrator accepts a quote; Relay holds the price; work proceeds; settlement releases on completion. The marketplace never holds customer funds itself. Relay does.

### 11.4 Metered live data

A feed provider prices per row or per refresh. Consuming agents settle as they read. Idle subscribers pay nothing. Burst consumers pay in proportion to rows, instantly visible on both ledgers.

---

## 12. Trust boundaries and what Relay is not

Relay **is** the authorization, metering, and settlement plane.

Relay **is not**:

- the agent runtime or the model
- a general-purpose bank account for humans
- a guarantee that the callee’s answer is high quality
- a replacement for operator policy, KYC/KYB of the organizations behind agents, or applicable money-transmission law

Quality of work remains the agents’ problem. Solvency of the operator remains the operator’s problem. Relay’s job is to make the **economic handshake** of a call reliable, tiny, and auditable.

Compliance, custody, and the exact movement of fiat or stable value are implementation choices behind the rail. The protocol above is deliberately rail-shaped: it can sit in front of a ledger, a stablecoin settlement layer, or an internal netting engine, as long as agents see the same five stages — call, meter, authorize, settle, audit.

---

## 13. Performance envelope (product targets)

These are the numbers the product is designed around, as published on the Relay surface:

| Metric | Target |
|---|---|
| Authorization latency | ~40 ms |
| Median settlement | ~180 ms |
| Authorization uptime | 99%+ class |
| Unit of sale | one call / token / row / compute-second |

If authorization is slower than the callee, agents will cache grants or skip the rail. The architecture therefore keeps auth on a hot path: identity lookup, policy, balance, limit — no human workflow, no batch file.

---

## 14. Security notes (high level)

- Keys never travel with prompts. Signing happens in the agent runtime or an HSM/KMS the operator controls.
- Grants are bound to call id, callee, meter, amount, and expiry. They are not bearer cash.
- Replay is defeated by call ids and grant expiry.
- Least privilege: a child agent’s key can spend only its sub-wallet.
- Operator freeze is a first-class control: stop an agent without deleting its history.

A full threat model belongs in a later companion document. The invariant for this paper is: **no unsigned call can move value, and no authorized call can exceed its grant.**

---

## 15. Summary

Agents already act as counterparties. They need a way to pay that matches how they work: many small, signed, limited, instant transfers.

Relay’s answer is a five-stage rail —

**Call → Meter → Authorize → Settle → Audit**

— with identity on every hop, usage as the unit of price, programmable limits as the human control surface, escrow for uncertain work, and a receipt instead of an invoice.

That is how an agent uses Relay: it does not wait for accounting. It presents a signed intent, receives a grant or a denial, does the work (or doesn’t), and leaves a trail that can be read like a ledger.

---

*Relay · A payment rail for AI agents · relay-pay.dev · hello@relay-pay.dev*

*This document describes the intended protocol and product architecture as of September 2026 (v0.1). It is not a specification of a particular ledger, custody arrangement, or regulated offering.*
