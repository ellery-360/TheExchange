/* =====================================================================
 *  THE EXCHANGE — the crawl
 *  Save as:  app/crawl/page.jsx
 *
 *  Self-contained. Inherits the fonts and colour variables already set
 *  by app/layout.jsx and app/globals.css, and changes neither.
 *  Reachable at  /crawl
 * =================================================================== */

export const metadata = {
  title: "The Crawl",
  description: "Historic City pub crawl, Saturday 10 October",
};

const ROUTE_URL =
  "https://www.google.com/maps/dir/?api=1" +
  "&origin=The+Old+Thameside+Inn+Clink+Street+SE1+9DG" +
  "&destination=Cittie+of+Yorke+22+High+Holborn+WC1V+6BN" +
  "&waypoints=" +
  [
    "The+Oyster+Shed+Angel+Lane+EC4R+3UD",
    "The+Bell+Bush+Lane+EC4R+0AN",
    "Ye+Olde+Cheshire+Cheese+145+Fleet+Street+EC4A+2BP",
    "The+Seven+Stars+53+Carey+Street+WC2A+2JB",
  ].join("%7C") +
  "&travelmode=walking";

const maps = (q) =>
  "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(q);

const STOPS = [
  {
    n: "I", time: "1:00", name: "The Old Thameside Inn",
    addr: "Pickfords Wharf, Clink St, SE1 9DG",
    note: "Riverside pints next to the Golden Hinde. Start here.",
    walk: "10 min east and over London Bridge", sam: false,
  },
  {
    n: "II", time: "1:45", name: "The Oyster Shed",
    addr: "1 Angel Lane, EC4R 3UD",
    note: "North bank, Shard views. One pint and move.",
    walk: "4 min north", sam: false,
  },
  {
    n: "III", time: "2:18", name: "The Bell Tavern",
    addr: "29 Bush Lane, EC4R 0AN",
    note: "Hidden down an alley. Grade II listed.",
    walk: "15 min west — the long one", sam: false, tight: true,
  },
  {
    n: "IV", time: "2:47", name: "Ye Olde Cheshire Cheese",
    addr: "145 Fleet St, EC4A 2BP",
    note: "Rebuilt in 1667 after the Great Fire. Go down to the cellars.",
    walk: "5 min north", sam: true,
  },
  {
    n: "V", time: "3:28", name: "The Seven Stars",
    addr: "53 Carey St, WC2A 2JB",
    note: "Built 1540 and survived the Fire. Barristers everywhere.",
    walk: "5 min up Chancery Lane", sam: false,
  },
  {
    n: "VI", time: "4:00", name: "Cittie of Yorke",
    addr: "22 High Holborn, WC1V 6BN",
    note: "Vaulted ceiling, cubicle booths, the great vat above the bar.",
    walk: null, sam: true,
  },
];

const FOOTBALL = [
  {
    verdict: "the pick", tone: "good",
    name: "The Square Pig",
    addr: "30–32 Procter St, WC1V 6NX",
    walk: "5 min north from the Cittie of Yorke",
    note:
      "A proper sports pub with Sky and several screens. Closest to where " +
      "the crawl finishes and the only one of the three that definitely " +
      "shows it. Send someone ahead at 4:45 to hold a corner.",
  },
  {
    verdict: "ring first", tone: "warn",
    name: "The Lord Raglan",
    addr: "61 St Martin's Le Grand, EC1A 4ER",
    walk: "18 min east — back the way we came",
    note:
      "Worth knowing this is St Martin's LE GRAND, by St Paul's, not " +
      "St Martin's Lane. It is a mile east of Holborn, so it undoes the " +
      "last half of the crawl. It is also a City pub, and plenty of those " +
      "shut at weekends. Phone before anyone walks it: 020 7726 4756.",
  },
  {
    verdict: "will not work", tone: "bad",
    name: "The Princess Louise",
    addr: "208 High Holborn, WC1V 7BW",
    walk: "2 min west",
    note:
      "Samuel Smith's. They took every television out in 2004 and never " +
      "put one back, and phones are banned indoors too. Beautiful " +
      "Victorian pub, wrong afternoon. Same reason we cannot simply stay " +
      "put in the Cittie of Yorke.",
  },
];

export default function Crawl() {
  return (
    <div className="cr">
      <style>{CSS}</style>

      <header className="cr-head">
        <div className="cr-crest">✦</div>
        <h1 className="cr-title">The Crawl</h1>
        <p className="cr-sub">
          Saturday the Tenth of October · Thames to Holborn · 500 years in 3 hours
        </p>
        <a className="cr-btn" href={ROUTE_URL} target="_blank" rel="noreferrer">
          Open the walk in Maps
        </a>
      </header>

      <section className="cr-panel cr-before">
        <h2 className="cr-rubric">Before the off</h2>
        <p>
          Some of us are at the <strong>Wetherspoons in London Bridge</strong> for
          breakfast first. Spoons normally stops serving breakfast at midday, so
          be in by <strong>11:30</strong> if you want one. It is about ten minutes
          on foot from there down to the first pub.
        </p>
      </section>

      <section className="cr-panel">
        <h2 className="cr-rubric">The Route</h2>
        <div className="cr-mapwrap">
          <Map />
        </div>
        <p className="cr-mapnote">
          Drawn to scale. About 1.8 miles of walking all in, none of it
          difficult. Gold is the crawl. Dotted is the walk to the football
          afterwards.
        </p>
      </section>

      <section className="cr-panel">
        <h2 className="cr-rubric">The Stops</h2>
        <ol className="cr-stops">
          {STOPS.map((s) => (
            <li key={s.n} className="cr-stop">
              <div className="cr-mark">
                <span className="cr-num">{s.n}</span>
                <span className="cr-time">{s.time}</span>
              </div>
              <div className="cr-body">
                <h3>
                  {s.name}
                  {s.sam && <span className="cr-tag">Sam Smith&apos;s</span>}
                </h3>
                <p className="cr-addr">
                  <a href={maps(s.name + ", " + s.addr)} target="_blank" rel="noreferrer">
                    {s.addr}
                  </a>
                </p>
                <p className="cr-note">{s.note}</p>
                {s.walk && (
                  <p className={`cr-walk ${s.tight ? "cr-tightwalk" : ""}`}>
                    ↓ {s.walk}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ol>
        <p className="cr-rule">
          <strong>One or two pints a stop, no more.</strong> Six pubs in three
          hours only works if nobody settles in. The gap between III and IV is
          the tight one: fifteen minutes of walking inside a twenty-nine minute
          window, so drink up at The Bell.
        </p>
      </section>

      <section className="cr-panel cr-sam">
        <h2 className="cr-rubric">Two house rules you did not know about</h2>
        <p>
          <strong>Stops IV and VI are both Samuel Smith&apos;s pubs.</strong> That
          means pints at about half what you will pay elsewhere, their own beer
          only, and three things banned on the premises: televisions, music and
          phones. Take the group photo outside, and do not get caught checking
          the scores at the bar.
        </p>
      </section>

      <section className="cr-panel">
        <h2 className="cr-rubric">Full Time · United v Spurs, 5:30</h2>
        <p className="cr-fblead">
          The crawl finishes at 4:00 in a pub with no television in it, so we
          have to move. Three options, in the order they actually work.
        </p>
        <div className="cr-fb">
          {FOOTBALL.map((f) => (
            <article key={f.name} className={`cr-card cr-${f.tone}`}>
              <span className="cr-verdict">{f.verdict}</span>
              <h3>{f.name}</h3>
              <p className="cr-addr">
                <a href={maps(f.name + ", " + f.addr)} target="_blank" rel="noreferrer">
                  {f.addr}
                </a>
              </p>
              <p className="cr-walkfrom">{f.walk}</p>
              <p className="cr-note">{f.note}</p>
            </article>
          ))}
        </div>
      </section>

      <footer className="cr-foot">
        Meet at Thameside, one o&apos;clock · do not be the one holding us up
      </footer>
    </div>
  );
}

/* ---------------------------------------------------------------------
 *  The map. Real coordinates, projected with longitude scaled by
 *  cos(latitude) so east-west distances read true. Drawn by hand rather
 *  than tiled, so it needs no API key and matches the rest of the site.
 * ------------------------------------------------------------------- */
function Map() {
  const stops = [
    ["I", 797, 503, 779, 508, "end", "Old Thameside Inn"],
    ["II", 845, 419, 862, 414, "start", "Oyster Shed"],
    ["III", 812, 367, 794, 362, "end", "The Bell"],
    ["IV", 375, 222, 375, 252, "middle", "Ye Olde Cheshire Cheese"],
    ["V", 268, 194, 250, 199, "end", "Seven Stars"],
    ["VI", 270, 90, 293, 85, "start", "Cittie of Yorke"],
  ];

  return (
    <svg viewBox="0 0 1040 606" className="cr-map" role="img"
      aria-label="Walking route from the Old Thameside Inn on the south bank, over London Bridge and west through the City to the Cittie of Yorke in Holborn">

      <rect width="1040" height="606" fill="#12100C" />
      <rect x="14" y="14" width="1012" height="578" fill="none"
        stroke="#C9A227" strokeWidth="1.5" opacity="0.55" />
      <rect x="21" y="21" width="998" height="564" fill="none"
        stroke="#C9A227" strokeWidth="0.6" opacity="0.3" />

      {/* the river */}
      <path
        d="M58 375 L307.7 363 L532.5 387 L707.3 423.1 L857.1 443.2 L982 475.3
           L982 555.6 L857.1 507.5 L707.3 487 L532.5 479 L307.7 463.3 L58 467.3 Z"
        fill="#3A5A8C" opacity="0.26" />
      <path d="M58 375 L307.7 363 L532.5 387 L707.3 423.1 L857.1 443.2 L982 475.3"
        fill="none" stroke="#3A5A8C" strokeWidth="2" opacity="0.85" />
      <path d="M58 467.3 L307.7 463.3 L532.5 479 L707.3 487 L857.1 507.5 L982 555.6"
        fill="none" stroke="#3A5A8C" strokeWidth="2" opacity="0.85" />
      <text x="300" y="430" className="cr-river">THE THAMES</text>

      {/* on to the football, under everything else */}
      <path d="M270.3 90.1 L162.9 78.1 L127.9 58"
        fill="none" stroke="#6E6553" strokeWidth="2.5"
        strokeDasharray="7 7" strokeLinecap="round" />
      <circle cx="127.9" cy="58" r="7" fill="none" stroke="#6E6553" strokeWidth="2" />
      <text x="128" y="40" textAnchor="middle" className="cr-fbmark">
        THE SQUARE PIG · 5:30
      </text>

      {/* the crawl */}
      <path
        d="M797.2 503 L852.1 487 L864.6 467.3 L867.1 427.2 L844.6 419.1
           L834.7 391.1 L812.2 367 L784.7 346.9 L692.3 314.8 L612.4 290.7
           L527.5 254.6 L442.6 226.5 L375.2 222.5 L335.2 206.5 L267.8 194.4
           L275.3 150.3 L270.3 90.1"
        fill="none" stroke="#C9A227" strokeWidth="3.5"
        strokeLinejoin="round" strokeLinecap="round" />

      {/* streets */}
      <text x="890" y="480" className="cr-street" transform="rotate(-90 890 480)">
        LONDON BRIDGE
      </text>
      <text x="660" y="296" className="cr-street">CANNON STREET</text>
      <text x="430" y="212" className="cr-street">FLEET STREET</text>
      <text x="178" y="124" className="cr-street">HIGH HOLBORN</text>

      {/* stops */}
      {stops.map(([n, x, y, lx, ly, anchor, label]) => (
        <g key={n}>
          <circle cx={x} cy={y} r="15" fill="#12100C" stroke="#C9A227" strokeWidth="2.5" />
          <text x={x} y={y + 5} textAnchor="middle" className="cr-pin">{n}</text>
          <text x={lx} y={ly} textAnchor={anchor} className="cr-label">{label}</text>
        </g>
      ))}

      {/* compass and scale */}
      <g opacity="0.75">
        <circle cx="90" cy="566" r="2.5" fill="#C9A227" />
        <path d="M90 566 L90 536 L85 546 L90 536 L95 546" fill="none"
          stroke="#C9A227" strokeWidth="1.6" strokeLinejoin="round" />
        <text x="90" y="528" textAnchor="middle" className="cr-compass">N</text>
      </g>
      <g opacity="0.65">
        <line x1="170" y1="560" x2="350" y2="560" stroke="#E7DCC4" strokeWidth="1.6" />
        <line x1="170" y1="555" x2="170" y2="565" stroke="#E7DCC4" strokeWidth="1.6" />
        <line x1="350" y1="555" x2="350" y2="565" stroke="#E7DCC4" strokeWidth="1.6" />
        <text x="260" y="550" textAnchor="middle" className="cr-compass">500 METRES</text>
      </g>
    </svg>
  );
}

/* ------------------------------------------------------------------ */
const CSS = `
.cr{max-width:1100px;margin:0 auto;padding:0 1.25rem 4rem;
  font-family:'EB Garamond',Georgia,serif;color:var(--vellum,#E7DCC4);line-height:1.6}
.cr *{box-sizing:border-box}
.cr a{color:var(--gold,#C9A227)}

.cr-head{text-align:center;padding:2.6rem 0 1.8rem;border-bottom:1px solid #332C1F}
.cr-crest{color:var(--gold,#C9A227);font-size:1.1rem;letter-spacing:.6em;margin-bottom:.5rem}
.cr-title{font-family:'UnifrakturMaguntia',serif;font-size:clamp(2.8rem,10vw,5.5rem);
  margin:0;line-height:.95;font-weight:400}
.cr-sub{font-family:'Cinzel',serif;font-size:clamp(.58rem,1.8vw,.76rem);letter-spacing:.2em;
  text-transform:uppercase;color:var(--gold,#C9A227);margin:.8rem 0 1.3rem}
.cr-btn{display:inline-block;font-family:'Cinzel',serif;font-size:.68rem;letter-spacing:.16em;
  text-transform:uppercase;background:var(--gold,#C9A227);color:#12100C;
  border:1px solid var(--gold,#C9A227);padding:.6rem 1.2rem;text-decoration:none}
.cr-btn:hover{background:var(--vellum,#E7DCC4);border-color:var(--vellum,#E7DCC4)}

.cr-panel{background:#1C1913;border:1px solid #332C1F;padding:1.4rem;margin-top:1.3rem}
.cr-rubric{font-family:'Cinzel',serif;font-size:.72rem;letter-spacing:.24em;text-transform:uppercase;
  color:var(--rubric,#9E2B25);margin:0 0 1rem;padding-bottom:.55rem;border-bottom:1px solid #332C1F}
.cr-panel p{margin:0 0 .8rem}
.cr-panel p:last-child{margin-bottom:0}
.cr-before{border-left:3px solid var(--verdigris,#4E8C6A)}
.cr-sam{border-left:3px solid var(--gold,#C9A227)}

.cr-mapwrap{overflow-x:auto;-webkit-overflow-scrolling:touch}
.cr-map{display:block;width:100%;min-width:660px;height:auto}
.cr-mapnote{font-size:.88rem;color:var(--dim,#6E6553);font-style:italic;margin-top:.9rem}
.cr-pin{font-family:'Cinzel',serif;font-size:13px;font-weight:700;fill:#C9A227;letter-spacing:.5px}
.cr-label{font-family:'Cinzel',serif;font-size:14px;fill:#E7DCC4;letter-spacing:.9px}
.cr-street{font-family:'Cinzel',serif;font-size:10.5px;fill:#6E6553;letter-spacing:2.2px}
.cr-river{font-family:'Cinzel',serif;font-size:15px;fill:#7FA3D1;letter-spacing:7px;opacity:.75}
.cr-fbmark{font-family:'Cinzel',serif;font-size:11px;fill:#6E6553;letter-spacing:2px}
.cr-compass{font-family:'Cinzel',serif;font-size:10px;fill:#E7DCC4;letter-spacing:2px}

.cr-stops{list-style:none;margin:0;padding:0}
.cr-stop{display:grid;grid-template-columns:4.6rem 1fr;gap:1.1rem;
  padding:1.1rem 0;border-bottom:1px solid #241F17}
.cr-stop:last-child{border-bottom:none}
.cr-mark{text-align:center}
.cr-num{display:block;font-family:'Cinzel',serif;font-size:1.25rem;color:var(--gold,#C9A227);
  border:1.5px solid #332C1F;border-radius:50%;width:2.6rem;height:2.6rem;line-height:2.4rem;margin:0 auto}
.cr-time{display:block;font-family:'Courier Prime',monospace;font-size:.84rem;
  color:var(--vellum,#E7DCC4);margin-top:.45rem}
.cr-body h3{margin:.15rem 0 .25rem;font-size:1.2rem;font-weight:600}
.cr-tag{font-family:'Cinzel',serif;font-size:.52rem;letter-spacing:.12em;text-transform:uppercase;
  color:var(--gold,#C9A227);border:1px solid rgba(201,162,39,.5);padding:.15rem .4rem;
  margin-left:.6rem;vertical-align:middle;white-space:nowrap}
.cr-addr{font-family:'Courier Prime',monospace;font-size:.78rem;margin:0 0 .45rem}
.cr-note{font-size:.95rem;margin:0}
.cr-walk{font-family:'Cinzel',serif;font-size:.62rem;letter-spacing:.14em;text-transform:uppercase;
  color:var(--dim,#6E6553);margin:.7rem 0 0}
.cr-tightwalk{color:var(--rubric,#9E2B25)}
.cr-rule{margin-top:1.2rem;padding-top:1rem;border-top:1px solid #332C1F;font-size:.95rem}

.cr-fblead{color:var(--dim,#6E6553);font-style:italic;margin-bottom:1.1rem}
.cr-fb{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:1px;
  background:#332C1F;border:1px solid #332C1F}
.cr-card{background:#1C1913;padding:1.1rem}
.cr-card h3{margin:.4rem 0 .3rem;font-size:1.15rem;font-weight:600}
.cr-verdict{font-family:'Cinzel',serif;font-size:.56rem;letter-spacing:.18em;text-transform:uppercase;
  padding:.2rem .5rem;border:1px solid}
.cr-good .cr-verdict{color:var(--verdigris,#4E8C6A);border-color:var(--verdigris,#4E8C6A)}
.cr-warn .cr-verdict{color:var(--gold,#C9A227);border-color:var(--gold,#C9A227)}
.cr-bad .cr-verdict{color:var(--rubric,#9E2B25);border-color:var(--rubric,#9E2B25)}
.cr-good{border-top:2px solid var(--verdigris,#4E8C6A)}
.cr-warn{border-top:2px solid var(--gold,#C9A227)}
.cr-bad{border-top:2px solid var(--rubric,#9E2B25)}
.cr-walkfrom{font-family:'Cinzel',serif;font-size:.6rem;letter-spacing:.13em;text-transform:uppercase;
  color:var(--dim,#6E6553);margin:0 0 .6rem}

.cr-foot{text-align:center;margin-top:2.4rem;font-family:'Cinzel',serif;font-size:.62rem;
  letter-spacing:.2em;text-transform:uppercase;color:var(--dim,#6E6553)}

@media (max-width:560px){
  .cr-stop{grid-template-columns:3.6rem 1fr;gap:.8rem}
  .cr-num{width:2.2rem;height:2.2rem;line-height:2rem;font-size:1.05rem}
  .cr-panel{padding:1.1rem}
}
`;
