import { Link } from "react-router-dom";
import { SAMPLE_CHARACTER as hero } from "../../utils/sampleData";
import "./Samples.css";

const signed = (number) => (number >= 0 ? `+${number}` : `${number}`);

// A short "how this works on your own sheet" note beside each part. Plain
// text (no hover or animation needed to read it).
function Guide({ children }) {
  return <p className="sample__guide">{children}</p>;
}

// "See before you sign up": a read-only, made-up character sheet with notes
// on what each part does on a real one. It only reads utils/sampleData.js:
// nothing is fetched, saved or shared, and no account is touched.
function SampleCharacterPage() {
  return (
    <main className="sample">
      <p className="sample__badge">Sample · made-up character · nothing here is saved</p>
      <h1 className="sample__title">{hero.name}</h1>
      <p className="sample__subtitle">
        Level {hero.level} {hero.race} {hero.className} ({hero.subclass}) · {hero.background}
      </p>
      <p className="sample__intro">
        This is what a QuestKeeper character sheet keeps track of. On your own sheet every number below is
        yours, works itself out as you level up, and rolls the dice when you tap it.
      </p>

      <section className="sample__section" aria-labelledby="sample-vitals">
        <h2 id="sample-vitals">At a glance</h2>
        <dl className="sample__stats">
          <div>
            <dt>Hit points</dt>
            <dd>
              {hero.hitPoints.current} / {hero.hitPoints.max}
            </dd>
          </div>
          <div>
            <dt>Armor Class</dt>
            <dd>{hero.armorClass}</dd>
          </div>
          <div>
            <dt>Initiative</dt>
            <dd>{signed(hero.initiative)}</dd>
          </div>
          <div>
            <dt>Speed</dt>
            <dd>{hero.speed} ft</dd>
          </div>
          <div>
            <dt>Proficiency</dt>
            <dd>{signed(hero.proficiency)}</dd>
          </div>
        </dl>
        <p className="sample__condition">
          <strong>Condition:</strong> {hero.conditions.join(", ")}
        </p>
        <Guide>
          On your sheet: type damage or healing into HP, and timed conditions count down on their own at
          your table. Armor Class follows the armor you&apos;re wearing.
        </Guide>
      </section>

      <section className="sample__section" aria-labelledby="sample-abilities">
        <h2 id="sample-abilities">Abilities and best skills</h2>
        <ul className="sample__abilities">
          {hero.abilities.map((ability) => (
            <li key={ability.key}>
              <span className="sample__ability-key">{ability.key}</span>
              <span className="sample__ability-score">{ability.score}</span>
              <span className="sample__ability-mod">{signed(ability.mod)}</span>
            </li>
          ))}
        </ul>
        <ul className="sample__list">
          {hero.skills.map((skill) => (
            <li key={skill.name}>
              <strong>{skill.name}</strong> {signed(skill.bonus)} <span className="sample__muted">({skill.note})</span>
            </li>
          ))}
        </ul>
        <Guide>On your sheet: tap any modifier to roll it, with advantage or disadvantage if you need.</Guide>
      </section>

      <section className="sample__section" aria-labelledby="sample-attacks">
        <h2 id="sample-attacks">Attacks</h2>
        <table className="sample__table">
          <thead>
            <tr>
              <th scope="col">Weapon</th>
              <th scope="col">To hit</th>
              <th scope="col">Damage</th>
            </tr>
          </thead>
          <tbody>
            {hero.attacks.map((attack) => (
              <tr key={attack.name}>
                <th scope="row">
                  {attack.name}
                  {attack.note && <span className="sample__muted"> · {attack.note}</span>}
                </th>
                <td data-label="To hit">{signed(attack.toHit)}</td>
                <td data-label="Damage">
                  {attack.damage} {attack.type}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Guide>
          On your sheet: weapons from your inventory become attacks in one tap, with to-hit and damage worked
          out for you. At your DM&apos;s table, you attack a monster and the app checks the hit against its
          secret AC.
        </Guide>
      </section>

      <section className="sample__section" aria-labelledby="sample-features">
        <h2 id="sample-features">Features</h2>
        <ul className="sample__list">
          {hero.features.map((feature) => (
            <li key={feature.name}>
              <strong>{feature.name}:</strong> {feature.text}
            </li>
          ))}
        </ul>
        <Guide>
          On your sheet: your class and race features fill in as you level up, and limited-use ones get
          pips that refill on a short or long rest.
        </Guide>
      </section>

      <section className="sample__section" aria-labelledby="sample-inventory">
        <h2 id="sample-inventory">Inventory</h2>
        <ul className="sample__list sample__list--inline">
          {hero.inventory.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="sample__next" aria-labelledby="sample-next">
        <h2 id="sample-next">Make one of your own</h2>
        <p>
          Not sure what to play? The quiz suggests three builds and fills one in for you. You&apos;ll need a
          free account to save your character.
        </p>
        <div className="sample__actions">
          <Link className="sample__primary" to="/quiz">
            Take the character quiz
          </Link>
          <Link className="sample__secondary" to="/characters/new">
            Build from scratch
          </Link>
          <Link className="sample__secondary" to="/sample/table">
            See the sample DM table
          </Link>
        </div>
      </section>
    </main>
  );
}

export default SampleCharacterPage;
