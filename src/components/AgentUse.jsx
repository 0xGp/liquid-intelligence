export default function AgentUse({ session, provider, onAsk, busy }) {
  if (!session || !provider) return null

  const result = session.result

  return (
    <section className="agent-use">
      <div className="rail-card-label">Use the agent</div>
      <div className="agent-use-head">
        <div>
          <h2>{provider.name} is live</h2>
          <p>
            Paid on Robinhood Chain. {session.remaining} {provider.unit}
            {session.remaining === 1 ? '' : 's'} left on this hold.
          </p>
        </div>
        {session.txUrl ? (
          <a className="agent-tx" href={session.txUrl} target="_blank" rel="noreferrer">
            View settlement
          </a>
        ) : null}
      </div>

      <form
        className="agent-form"
        onSubmit={(e) => {
          e.preventDefault()
          const data = new FormData(e.currentTarget)
          onAsk(String(data.get('prompt') || ''))
        }}
      >
        <input
          name="prompt"
          type="text"
          placeholder={
            provider.id === 'signal'
              ? 'Ticker or pair — e.g. ETH'
              : provider.id === 'north'
                ? 'Table or feed — e.g. prints'
                : 'What should Fieldwork look up?'
          }
          disabled={busy || session.remaining <= 0}
        />
        <button type="submit" disabled={busy || session.remaining <= 0}>
          {busy ? 'Working…' : session.remaining <= 0 ? 'Hold spent' : 'Ask'}
        </button>
      </form>

      {result ? (
        <article className="agent-result">
          <h3>{result.title}</h3>
          {result.body.map((line) => (
            <p key={line}>{line}</p>
          ))}
          {result.ticks ? (
            <dl className="agent-ticks">
              {result.ticks.map((t) => (
                <div key={t.k}>
                  <dt>{t.k}</dt>
                  <dd>{t.v}</dd>
                </div>
              ))}
            </dl>
          ) : null}
          {result.rows ? (
            <table className="agent-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Source</th>
                  <th>Value</th>
                  <th>Note</th>
                </tr>
              </thead>
              <tbody>
                {result.rows.map((row) => (
                  <tr key={`${row.ts}-${row.note}`}>
                    <td>{row.ts}</td>
                    <td>{row.src}</td>
                    <td>{row.val}</td>
                    <td>{row.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </article>
      ) : (
        <p className="rail-empty">Paid. Send a prompt to use {provider.name}.</p>
      )}
    </section>
  )
}
