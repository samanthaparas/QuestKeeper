import { Link } from "react-router-dom";
import { SAMPLE_TABLE as table } from "../../utils/sampleData";
import "./Samples.css";

function Guide({ children }) {
  return <p className="sample__guide">{children}</p>;
}

// "See before you sign up": a guided, read-only snapshot of a DM's table in
// the middle of a fight, with notes on what the DM and the players each see.
// It's a picture, not a game: it only reads utils/sampleData.js, so nothing
// is sent, rolled, joined or saved, and no real table is touched.
function SampleTablePage() {
  const current = table.turnOrder.find((entry) => entry.current);

  return (
    <main className="sample">
      <p className="sample__badge">Sample · made-up table · nothing here is real or saved</p>
      <h1 className="sample__title">{table.name}</h1>
      <p className="sample__subtitle">
        Round {table.round} · {current.name}&apos;s turn
      </p>
      <p className="sample__intro">
        This is what running a fight looks like for the DM. Players join with a code, their characters
        appear here on their own, and everyone&apos;s screen follows the turn order.
      </p>

      <section className="sample__section" aria-labelledby="sample-order">
        <h2 id="sample-order">Turn order</h2>
        <ol className="sample__order">
          {table.turnOrder.map((entry) => (
            <li key={entry.name} className={entry.current ? "sample__order-now" : undefined}>
              <span className="sample__order-init">{entry.initiative}</span>
              <span>
                {entry.name}{" "}
                <span className="sample__muted">({entry.kind === "monster" ? "monster" : "player"})</span>
              </span>
              {entry.current && <strong className="sample__now-label">Now</strong>}
            </li>
          ))}
        </ol>
        <Guide>
          At a real table: players add their own initiative, the turn order moves along as each turn ends,
          and each player&apos;s sheet shows when it&apos;s their turn to act.
        </Guide>
      </section>

      <section className="sample__section" aria-labelledby="sample-party">
        <h2 id="sample-party">The party</h2>
        <ul className="sample__cards">
          {table.party.map((member) => (
            <li key={member.name} className="sample__card">
              <h3>{member.name}</h3>
              <p className="sample__muted">{member.summary}</p>
              <p>
                <strong>HP</strong> {member.hp.current} / {member.hp.max} · <strong>{member.health}</strong> ·{" "}
                <strong>AC</strong> {member.armorClass}
              </p>
              {member.conditions && <p>Condition: {member.conditions.join(", ")}</p>}
              {member.concentration && <p>Concentrating on {member.concentration}</p>}
            </li>
          ))}
        </ul>
        <Guide>
          At a real table: this comes from the players&apos; own sheets, so the DM doesn&apos;t have to ask
          &ldquo;how many hit points do you have left?&rdquo;
        </Guide>
      </section>

      <section className="sample__section sample__section--dm" aria-labelledby="sample-monsters">
        <h2 id="sample-monsters">Monsters (only the DM sees this)</h2>
        <table className="sample__table">
          <thead>
            <tr>
              <th scope="col">Monster</th>
              <th scope="col">HP</th>
              <th scope="col">AC</th>
              <th scope="col">Attack</th>
            </tr>
          </thead>
          <tbody>
            {table.monsters.map((monster) => (
              <tr key={monster.name}>
                <th scope="row">
                  {monster.name} <span className="sample__muted">· {monster.status}</span>
                </th>
                <td data-label="HP">
                  {monster.hp.current} / {monster.hp.max}
                </td>
                <td data-label="AC">{monster.armorClass}</td>
                <td data-label="Attack">{monster.attack}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <Guide>
          Players only ever see a monster&apos;s name and whether it&apos;s healthy, bloodied or down. Its HP,
          AC and attacks stay with the DM.
        </Guide>
      </section>

      <section className="sample__section" aria-labelledby="sample-log">
        <h2 id="sample-log">What everyone sees happen</h2>
        <ol className="sample__log">
          {table.log.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ol>
      </section>

      <section className="sample__next" aria-labelledby="sample-table-next">
        <h2 id="sample-table-next">Run your own session</h2>
        <p>
          Start a table, share its code with your players, and add monsters when the fight begins.
          You&apos;ll need a free account to save a table.
        </p>
        <div className="sample__actions">
          <Link className="sample__primary" to="/dm">
            Open the DM screen
          </Link>
          <Link className="sample__secondary" to="/sample/character">
            See the sample character sheet
          </Link>
          <Link className="sample__secondary" to="/guide">
            Learn the basics
          </Link>
        </div>
      </section>
    </main>
  );
}

export default SampleTablePage;
