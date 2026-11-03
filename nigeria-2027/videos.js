/* Content for the Naija 2027 videos.
   Edit the words/numbers here, then re-render with:  node render.mjs
   Every number has a source listed on the video's last scene and in README.md.
   Put your TikTok / IG handle here so it shows on every frame: */
window.HANDLE = '#Nigeria2027';

/* Narrator voice (Microsoft Edge neural TTS). Nigerian English options:
   'en-NG-AbeoNeural' (male) or 'en-NG-EzinneNeural' (female). */
window.VOICE = { name: 'en-NG-AbeoNeural', rate: '+18%' };

const IMG = {
  obi: 'assets/img/peter-obi.png',
  // Rivals show initials (no photo) so the ballot cards stay consistent.
  // Drop a freely licensed photo in assets/img/ and put its path here to use one.
  tinubu: '',
  atiku: '',
};

const hbar = (label, value, w, color, t) => `
  <div class="hbar a" data-a="up" data-t="${t}">
    <div class="lab"><span>${label}</span><b>${value}</b></div>
    <div class="track"><div class="fill a" data-a="bar" data-t="${t + .15}" data-w="${w}" style="background:${color}"></div></div>
  </div>`;

const people = (n, t) => `<div class="people a" data-a="people" data-t="${t}" data-n="${n}">${'<i></i>'.repeat(100)}</div>`;

const cand = (img, initials, name, party, color, meta, t, star) => `
  <div class="cand a ${star ? 'star' : ''}" data-a="left" data-t="${t}" style="--c:${color}">
    <div class="ph"${img ? ` style="background-image:url('${img}')"` : ''}>${img ? '' : initials}</div>
    <div><div class="nm">${name}</div><div class="meta"><span class="party">${party}</span>${meta}</div></div>
  </div>`;

const sources = (items) => ({
  dur: 3.2,
  html: `
    <div class="kicker a" data-a="up">Sources · check the facts</div>
    <ul class="srcs">${items.map((s, i) => `<li class="a" data-a="up" data-t="${.12 + i * .1}">${s}</li>`).join('')}</ul>
    <div class="gap"></div>
    <div class="body a" data-a="up" data-t="${.2 + items.length * .1}">Share this. <span class="hl">Facts travel when you send them.</span></div>`,
});

window.VIDEOS = [
  /* ------------------------------------------------------------------ */
  {
    id: 'countdown',
    title: '1 · Nigeria 2027: what you need to know',
    caption: 'Nigeria votes on 16 January 2027. 110 million registered voters. Three big names. In 2023 only 26.7% of us showed up. Not this time. 🇳🇬 #Nigeria2027 #NigeriaDecides2027 #INEC #PVC #Election',
    scenes: [
      { dur: 4, html: `
        <div class="kicker a" data-a="up">Nigeria decides</div>
        <div class="mega a" data-a="pop" data-t=".15">JAN 16</div>
        <div class="h2 a hl" data-a="up" data-t=".45">2027</div>
        <div class="gap"></div>
        <div class="body a" data-a="up" data-t=".8">Presidential &amp; National Assembly elections</div>
        <div class="gap-s"></div>
        <div class="sub a" data-a="up" data-t="1.1">Governorship &amp; State Assembly: <b style="color:#fff">Feb 6, 2027</b></div>
        <div class="gap"></div>
        <div class="a" data-a="pop" data-t="1.6"><span class="pill"><span class="count a hl" data-a="count" data-t="1.6" data-to="74">74</span> days to go · as of 3 Nov 2026</span></div>` },
      { dur: 5, html: `
        <div class="kicker a" data-a="up">Registered voters</div>
        <div class="big a" data-a="count" data-t=".1" data-to="110" data-suf="M">110M</div>
        <div class="body a" data-a="up" data-t=".6">Nigerians on INEC's voter register</div>
        <div class="gap-l"></div>
        <div class="small a" data-a="up" data-t="1">Biggest states</div>
        ${hbar('Lagos', '7.49M', 100, 'var(--green)', 1.2)}
        ${hbar('Kano', '6.57M', 87.7, 'var(--green)', 1.45)}
        ${hbar('Kaduna', '4.66M', 62.3, 'var(--green)', 1.7)}` },
      { dur: 6, html: `
        <div class="kicker a" data-a="up">The big three</div>
        <div class="h2 a" data-a="up" data-t=".1">Who's on<br>the ballot</div>
        <div class="gap"></div>
        <div class="cands">
          ${cand(IMG.tinubu, 'BT', 'Bola Tinubu', 'APC', 'var(--apc)', 'Incumbent · VP: Kashim Shettima', .5)}
          ${cand(IMG.atiku, 'AA', 'Atiku Abubakar', 'ADC', 'var(--adc)', 'Running mate: Rotimi Amaechi', .8)}
          ${cand(IMG.obi, 'PO', 'Peter Obi', 'NDC', 'var(--ndc)', 'Running mate: Rabiu Kwankwaso', 1.1, true)}
        </div>
        <div class="small a" data-a="up" data-t="1.6" style="margin-top:28px">+ other parties' candidates on the INEC list</div>` },
      { dur: 5, mood: 'red', html: `
        <div class="kicker a red" data-a="up">2023 turnout</div>
        <div class="ringwrap a" data-a="pop" data-t=".1">
          <svg viewBox="0 0 200 200"><circle cx="100" cy="100" r="86" fill="none" stroke="rgba(255,255,255,.1)" stroke-width="22"/>
          <circle class="a" data-a="ring" data-t=".3" data-p="26.7" cx="100" cy="100" r="86" fill="none" stroke="#ff5a4e" stroke-width="22" stroke-linecap="round"/></svg>
          <div class="c"><div class="big a" data-a="count" data-t=".3" data-to="26.7" data-dec="1" data-suf="%">26.7%</div><div class="small">of registered voters voted</div></div>
        </div>
        <div class="gap"></div>
        <div class="h3 a" data-a="up" data-t="1.4">Nearly <span class="mark-red">7 in 10</span><br>stayed home.</div>` },
      { dur: 5, html: `
        <div class="kicker a" data-a="up">Your move</div>
        <div class="check a" data-a="left" data-t=".1"><div class="n">1</div><div class="t">Collect your PVC</div></div>
        <div class="check a" data-a="left" data-t=".4"><div class="n">2</div><div class="t">Know your polling unit</div></div>
        <div class="check a" data-a="left" data-t=".7"><div class="n">3</div><div class="t">Vote on Jan 16</div></div>
        <div class="check a" data-a="left" data-t="1"><div class="n">4</div><div class="t">Stay till it's counted</div></div>
        <div class="gap"></div>
        <div class="h2 a hl" data-a="pop" data-t="1.6">Show up.</div>` },
      sources([
        '<b>INEC</b> revised timetable, Feb 2026 (Jan 16 / Feb 6)',
        '<b>INEC</b> via Nairametrics, Oct 2026: 110M voters, state totals',
        '<b>INEC</b> candidate list · Wikipedia: 2027 Nigerian general election',
        '<b>INEC</b> 2023 results: 24.97M votes of 93.47M registered',
      ]),
    ],
  },

  /* ------------------------------------------------------------------ */
  {
    id: 'your-money',
    title: '2 · Your money: 2023 vs now',
    caption: 'Petrol: ₦185 → ₦1,335. Dollar: ₦461 → ~₦1,350. Poverty: 56% → 63%. Prices don\'t vote. You do. 🇳🇬 #Nigeria2027 #CostOfLiving #Naira #Fuel #Obidient',
    scenes: [
      { dur: 3.4, html: `
        <div class="kicker a" data-a="up">May 2023 → today</div>
        <div class="h1 a" data-a="up" data-t=".1">What<br>happened<br>to your<br><span class="mark">money?</span></div>
        <div class="gap"></div>
        <div class="sub a" data-a="up" data-t=".9">4 numbers every Nigerian should know before Jan 16.</div>` },
      { dur: 5.4, mood: 'red', html: `
        <div class="kicker a" data-a="up">01 · Petrol, per litre</div>
        <div class="cmp">
          <div class="col"><div class="val a" data-a="count" data-t=".3" data-to="185" data-pre="₦">₦185</div><div class="pillar a" data-a="pillar" data-t=".3" data-h="13.9" style="background:rgba(255,255,255,.35)"></div><div class="when">Before May 2023</div></div>
          <div class="col"><div class="val a red" data-a="count" data-t=".7" data-to="1335" data-pre="₦">₦1,335</div><div class="pillar a" data-a="pillar" data-t=".7" data-h="100" style="background:var(--red)"></div><div class="when">Nov 2026</div></div>
        </div>
        <div class="gap"></div>
        <div class="a" data-a="stamp" data-t="2.2"><span class="stamp">7× more</span></div>` },
      { dur: 5.4, mood: 'red', html: `
        <div class="kicker a" data-a="up">02 · Naira per US dollar</div>
        <div class="row">
          <div class="card a" data-a="up" data-t=".2" style="flex:1"><div class="small">Mid-2023</div><div class="h2">₦461</div></div>
          <div class="card a" data-a="up" data-t=".5" style="flex:1;border-color:var(--red)"><div class="small">2026</div><div class="h2 red">~₦1,350</div></div>
        </div>
        <div class="gap-l"></div>
        <div class="body a" data-a="up" data-t="1.1">Your naira now buys</div>
        <div class="mega a red" data-a="count" data-t="1.2" data-to="66" data-suf="%">66%</div>
        <div class="h3 a" data-a="up" data-t="1.8">fewer dollars.</div>` },
      { dur: 6, mood: 'red', html: `
        <div class="kicker a" data-a="up">03 · Nigerians in poverty</div>
        <div class="row" style="align-items:baseline;gap:40px">
          <div class="a" data-a="up" data-t=".1"><div class="small">2023</div><div class="h2">56%</div></div>
          <div class="a" data-a="up" data-t=".3"><div class="small">2025</div><div class="big red">63%</div></div>
        </div>
        ${people(63, .6)}
        <div class="gap"></div>
        <div class="body a" data-a="up" data-t="2">That's about <span class="mark-red">140 million</span> people.</div>
        <div class="src a" data-a="fade" data-t="2.2">World Bank, Nigeria Development Update, Apr 2026</div>` },
      { dur: 5.4, html: `
        <div class="kicker a" data-a="up">04 · Inflation, Sept 2026</div>
        <div class="body a" data-a="up" data-t=".1">Headline inflation is down to</div>
        <div class="h1 a" data-a="count" data-t=".3" data-to="14.63" data-dec="2" data-suf="%">14.63%</div>
        <div class="gap"></div>
        <div class="body a" data-a="up" data-t="1">…but food prices are still up</div>
        <div class="mega a red" data-a="count" data-t="1.2" data-to="19.59" data-dec="1" data-suf="%">19.6%</div>
        <div class="sub a" data-a="up" data-t="1.9">year on year. Slower rises are not lower prices.</div>` },
      { dur: 4, html: `
        <div class="h1 a" data-a="up">Prices<br>don't vote.</div>
        <div class="gap"></div>
        <div class="mega a hl" data-a="pop" data-t=".7">You do.</div>
        <div class="gap"></div>
        <div class="body a" data-a="up" data-t="1.4">Saturday, 16 January 2027.</div>` },
      sources([
        '<b>Petrol:</b> pre-subsidy pump price ~₦185 (May 2023); ₦1,335 avg, Nov 2026 (dailyfuels.com)',
        '<b>Naira:</b> ~₦461/$ official, May 2023; ₦1,330–1,358/$ official, Aug–Sep 2026',
        '<b>Poverty:</b> World Bank Nigeria Development Update, Apr 2026',
        '<b>Inflation:</b> NBS CPI, Sept 2026 (released 15 Oct 2026)',
      ]),
    ],
  },

  /* ------------------------------------------------------------------ */
  {
    id: 'rewind-2023',
    title: '3 · 2023 rewind: the votes that never came',
    caption: '68.5 million registered Nigerians didn\'t vote in 2023. The winning margin was 2.7 million. Do the maths. 🇳🇬 #Nigeria2027 #Election2023 #PVC #EveryVoteCounts',
    scenes: [
      { dur: 4.2, mood: 'red', html: `
        <div class="kicker a red" data-a="up">2023 presidential election</div>
        <div class="big a red" data-a="count" data-t=".1" data-to="68.5" data-dec="1" data-suf="M">68.5M</div>
        <div class="h2 a" data-a="up" data-t=".7">registered voters<br>didn't vote.</div>
        <div class="gap"></div>
        <div class="sub a" data-a="up" data-t="1.3">24.97 million voted out of 93.47 million registered.</div>` },
      { dur: 7, html: `
        <div class="kicker a" data-a="up">The official result</div>
        <div class="h3 a" data-a="up" data-t=".1">Votes · share</div>
        <div class="gap-s"></div>
        ${hbar('Bola Tinubu · APC', '8.79M · 36.6%', 100, 'var(--apc)', .4)}
        ${hbar('Atiku Abubakar · PDP', '6.98M · 29.1%', 79.4, 'var(--adc)', .7)}
        ${hbar('Peter Obi · LP', '6.10M · 25.4%', 69.4, 'var(--ndc)', 1.0)}
        ${hbar('Rabiu Kwankwaso · NNPP', '1.50M · 6.2%', 17, 'var(--nnpp)', 1.3)}
        <div class="gap"></div>
        <div class="body a" data-a="up" data-t="2.2">Obi won <span class="mark">Lagos</span> and <span class="mark">Abuja (FCT)</span>.</div>` },
      { dur: 6, html: `
        <div class="kicker a" data-a="up">Do the maths</div>
        <div class="body a" data-a="up" data-t=".1">Gap between 1st and Obi</div>
        <div class="big a" data-a="count" data-t=".3" data-to="2.69" data-dec="2" data-suf="M">2.69M</div>
        <div class="gap"></div>
        <div class="body a" data-a="up" data-t="1">Registered voters who stayed home</div>
        <div class="big a red" data-a="count" data-t="1.2" data-to="68.5" data-dec="1" data-suf="M">68.5M</div>
        <div class="gap"></div>
        <div class="h3 a" data-a="up" data-t="2.2">The margin was less than <span class="mark">4%</span> of the people who didn't vote.</div>` },
      { dur: 5.4, html: `
        <div class="kicker a" data-a="up">2027 is a new ticket</div>
        <div class="body a" data-a="up" data-t=".1">Obi + Kwankwaso ran <b>separately</b> in 2023:</div>
        <div class="gap"></div>
        <div class="row a" data-a="up" data-t=".4" style="align-items:center;gap:20px">
          <div class="h2" style="color:var(--ndc)">6.10M</div><div class="h2">+</div><div class="h2" style="color:var(--nnpp)">1.50M</div>
        </div>
        <div class="mega a hl" data-a="count" data-t="1" data-to="7.6" data-dec="1" data-suf="M">7.6M</div>
        <div class="gap-s"></div>
        <div class="body a" data-a="up" data-t="1.8">Now they're on <span class="mark">one ticket</span> (NDC).</div>
        <div class="sub a" data-a="up" data-t="2.2">Past votes don't transfer automatically. Turnout decides.</div>` },
      { dur: 3.6, html: `
        <div class="h1 a" data-a="up">Don't let<br>68.5 million<br>stay home</div>
        <div class="gap"></div>
        <div class="h1 a hl" data-a="pop" data-t=".8">again.</div>` },
      sources([
        '<b>INEC</b> declared results, 1 March 2023',
        '<b>Registered:</b> 93,469,008 · <b>Votes cast:</b> 24,965,218',
        '<b>Tinubu</b> 8,794,726 · <b>Atiku</b> 6,984,520 · <b>Obi</b> 6,101,533 · <b>Kwankwaso</b> 1,496,687',
        '<b>2027 ticket:</b> INEC nomination publication, Aug 2026',
      ]),
    ],
  },

  /* ------------------------------------------------------------------ */
  {
    id: 'why-obi',
    title: '4 · Why Peter Obi',
    caption: 'Former Anambra governor. Named "Most Prudent Governor in Nigeria". Pitch: move Nigeria from consuming to producing. Obi–Kwankwaso, NDC, 16 Jan 2027. 🇳🇬 #PeterObi #Obidient #Nigeria2027 #NDC',
    scenes: [
      { dur: 4.6, cls: 'hero', html: `
        <div class="hero-ph a" data-a="zoom" style="background-image:url('${IMG.obi}')"></div>
        <div style="position:relative">
          <div class="kicker a" data-a="up" data-t=".3">NDC presidential candidate · 2027</div>
          <div class="mega a" data-a="up" data-t=".5" style="font-size:230px">PETER<br>OBI</div>
          <div class="gap-s"></div>
          <div class="body a" data-a="up" data-t="1">Running mate: <span class="hl">Rabiu Kwankwaso</span></div>
        </div>` },
      { dur: 6, html: `
        <div class="kicker a" data-a="up">The record</div>
        <div class="card a" data-a="left" data-t=".2"><div class="small">Governor of Anambra State</div><div class="h2">2006 – 2014</div><div class="sub">Won his 2003 mandate back in court, re-elected in 2010.</div></div>
        <div class="gap-s"></div>
        <div class="card a" data-a="left" data-t=".6"><div class="small">ThisDay, 2009</div><div class="h3">"Most Prudent Governor in Nigeria"</div></div>
        <div class="gap-s"></div>
        <div class="card a" data-a="left" data-t="1"><div class="small">The Sun, 2007</div><div class="h3">Man of the Year</div></div>` },
      { dur: 5.6, html: `
        <div class="kicker a" data-a="up">The plan</div>
        <div class="h1 a" data-a="up" data-t=".1">From<br><span class="red">consumption</span></div>
        <div class="h1 a" data-a="pop" data-t=".6">↓</div>
        <div class="h1 a" data-a="up" data-t=".9">to <span class="mark">production</span></div>
        <div class="gap"></div>
        <div class="body a" data-a="up" data-t="1.6">Grow food, make goods, create jobs here, not import them.</div>
        <div class="src a" data-a="fade" data-t="1.9">Obi campaign manifesto launch, Onitsha, Aug 2026</div>` },
      { dur: 6, mood: 'red', html: `
        <div class="kicker a red" data-a="up">Why we need change</div>
        <div class="card a" data-a="left" data-t=".2"><div class="row" style="justify-content:space-between;align-items:center"><div class="body">Poverty</div><div class="h3 red">56% → 63%</div></div></div>
        <div class="gap-s"></div>
        <div class="card a" data-a="left" data-t=".5"><div class="row" style="justify-content:space-between;align-items:center"><div class="body">Petrol / litre</div><div class="h3 red">₦185 → ₦1,335</div></div></div>
        <div class="gap-s"></div>
        <div class="card a" data-a="left" data-t=".8"><div class="row" style="justify-content:space-between;align-items:center"><div class="body">₦ per $1</div><div class="h3 red">₦461 → ₦1,350</div></div></div>
        <div class="gap-s"></div>
        <div class="card a" data-a="left" data-t="1.1"><div class="row" style="justify-content:space-between;align-items:center"><div class="body">Food inflation</div><div class="h3 red">19.6%</div></div></div>
        <div class="gap"></div>
        <div class="h3 a" data-a="up" data-t="1.8">Same choices, same results.</div>` },
      { dur: 4.4, html: `
        <div class="kicker a" data-a="up">16 January 2027</div>
        <div class="mega a hl" data-a="pop" data-t=".1" style="font-size:190px">OBI–<br>KWANKWASO</div>
        <div class="gap"></div>
        <div class="h2 a" data-a="up" data-t=".9">Vote NDC.</div>
        <div class="body a" data-a="up" data-t="1.3">Then protect your vote.</div>` },
      sources([
        '<b>Wikipedia:</b> Peter Obi (offices, awards, party history)',
        '<b>INEC</b> nomination publication, Aug 2026 (Obi–Kwankwaso, NDC)',
        '<b>Voice of Nigeria:</b> Obi launches 2027 campaign',
        '<b>World Bank</b> Apr 2026 · <b>NBS</b> CPI Sept 2026',
        '<b>Photo:</b> Wikimedia Commons, “Peter Obi.png” (free licence)',
      ]),
    ],
  },

  /* ------------------------------------------------------------------ */
  {
    id: 'protect-your-vote',
    title: '5 · How to make your vote count',
    caption: 'PVC ✅ Polling unit ✅ Go early ✅ Stay till the count ✅ Check IReV ✅ Save this and send it to 5 people. 🇳🇬 #Nigeria2027 #PVC #INEC #IReV #ProtectYourVote',
    scenes: [
      { dur: 3.4, html: `
        <div class="kicker a" data-a="up">Save this for Jan 16</div>
        <div class="h1 a" data-a="up" data-t=".1">How to<br>make your<br>vote <span class="mark">count</span></div>
        <div class="gap"></div>
        <div class="sub a" data-a="up" data-t=".8">5 steps. 30 seconds.</div>` },
      { dur: 4.2, html: `
        <div class="check a" data-a="left"><div class="n">1</div><div class="t">Get your PVC<span>No PVC, no vote. Collect it from INEC before election day.</span></div></div>
        <div class="gap"></div>
        <div class="check a" data-a="left" data-t=".7"><div class="n">2</div><div class="t">Know your polling unit<span>Check it on INEC's voter portal, then go and see it before the day.</span></div></div>` },
      { dur: 4.2, html: `
        <div class="check a" data-a="left"><div class="n">3</div><div class="t">Go early<span>Queue, get accredited, vote. Bring water and patience.</span></div></div>
        <div class="gap"></div>
        <div class="check a" data-a="left" data-t=".7"><div class="n">4</div><div class="t">Stay for the count<span>Results are counted and posted at your unit. Watch it happen.</span></div></div>` },
      { dur: 4.2, html: `
        <div class="check a" data-a="left"><div class="n">5</div><div class="t">Check it on IReV<span>INEC's Result Viewing portal shows each polling unit's result sheet. Compare it with what was posted.</span></div></div>
        <div class="gap-l"></div>
        <div class="h3 a" data-a="up" data-t="1">Bring 5 people with you.</div>` },
      { dur: 4, html: `
        <div class="body a" data-a="up">In 2023 the winner got</div>
        <div class="big a" data-a="count" data-t=".2" data-to="8.79" data-dec="2" data-suf="M">8.79M</div>
        <div class="body a" data-a="up" data-t=".8">There are</div>
        <div class="big a hl" data-a="count" data-t="1" data-to="110" data-suf="M">110M</div>
        <div class="body a" data-a="up" data-t="1.6">registered voters now. <b>We are the majority.</b></div>` },
      sources([
        '<b>INEC:</b> voter registration, polling units, IReV portal',
        '<b>INEC</b> 2023 results · <b>INEC</b> voter register, Oct 2026',
      ]),
    ],
  },
];
/* Narration: one line per scene, in order, as [emotion, words].
   Emotions: 'calm' 'serious' 'grave' 'urgent' 'hopeful' 'fired'
   (render.mjs turns these into delivery settings for the voice engine).
   Write numbers the way they should be SAID. Commas, full stops and "..." become pauses.
   A scene stretches automatically if its line runs longer than the scene. */
window.NARRATION = {
  'countdown': [
    ['urgent',  'Nigerians... mark this date. January sixteenth, twenty twenty-seven. That is when we choose our next president. Governorship elections follow, on February sixth.'],
    ['serious', 'One hundred and ten million of us are registered to vote. Lagos, Kano and Kaduna lead the list.'],
    ['calm',    'Three names stand out. President Bola Tinubu, APC. Atiku Abubakar, ADC. And Peter Obi, NDC... with Rabiu Kwankwaso as his running mate.'],
    ['grave',   'But listen to this. In twenty twenty-three, only twenty-six point seven percent of registered voters actually voted. Nearly seven out of ten... stayed at home.'],
    ['fired',   'Not this time. Collect your PVC. Know your polling unit. Vote on January sixteenth, and stay until every vote is counted. Show up!'],
    ['hopeful', 'Every number here has a source. Share this video. Facts travel when you send them.'],
  ],
  'your-money': [
    ['serious', 'What has happened to your money since May twenty twenty-three? Four numbers. Every Nigerian needs to hear them.'],
    ['grave',   'Number one. Petrol. Before May twenty twenty-three, about one hundred and eighty-five naira a litre. Today? Around one thousand, three hundred and thirty-five. Seven times more.'],
    ['grave',   'Number two. The naira. About four hundred and sixty-one to the dollar in twenty twenty-three. Now, around one thousand, three hundred and fifty. Your money buys sixty-six percent fewer dollars.'],
    ['grave',   'Number three. Poverty. The World Bank says it climbed from fifty-six percent... to sixty-three percent. That is about one hundred and forty million Nigerians.'],
    ['serious', 'Number four. Yes, inflation has slowed, to about fourteen point six percent. But food prices are still rising almost twenty percent a year. Slower rises... are not lower prices.'],
    ['fired',   'Prices don\'t vote. You do! Saturday, January sixteenth, twenty twenty-seven.'],
    ['hopeful', 'The sources are on screen. Send this to someone who needs to see it.'],
  ],
  'rewind-2023': [
    ['grave',   'In twenty twenty-three, sixty-eight and a half million registered Nigerians... did not vote. Only about twenty-five million, out of ninety-three million, turned up.'],
    ['calm',    'Here is the official result. Tinubu, eight point seven nine million. Atiku, six point nine eight million. Peter Obi, six point one million. Kwankwaso, one point five million. And Obi won Lagos, and Abuja.'],
    ['urgent',  'Now do the maths. The gap between first place and Obi was two point seven million votes. That is less than four percent of the people who stayed home!'],
    ['hopeful', 'In twenty twenty-three, Obi and Kwankwaso ran separately, and together they got seven point six million votes. Now, they are on one ticket. But votes don\'t move by themselves. Turnout decides.'],
    ['fired',   'Don\'t let sixty-eight million people stay home again!'],
    ['calm',    'Every number is from INEC. Check it. Then share it.'],
  ],
  'why-obi': [
    ['hopeful', 'Peter Obi. The NDC presidential candidate for twenty twenty-seven... with Rabiu Kwankwaso as his running mate.'],
    ['serious', 'His record. Governor of Anambra State, from two thousand and six to twenty fourteen. He fought for his mandate in court, and won. He was re-elected in twenty ten. ThisDay named him the most prudent governor in Nigeria.'],
    ['hopeful', 'His plan? Move Nigeria from consumption... to production. Grow our own food. Make our own goods. Create jobs here, instead of importing them.'],
    ['grave',   'Why do we need change? Poverty, up to sixty-three percent. Petrol, seven times more expensive. The naira has lost two thirds of its value. The same choices... will give us the same results.'],
    ['fired',   'On January sixteenth, vote Obi, Kwankwaso. Vote NDC! Then protect your vote.'],
    ['calm',    'The sources are on screen. Share this, and let the facts travel.'],
  ],
  'protect-your-vote': [
    ['urgent',  'Save this for January sixteenth. Here is how to make your vote count, in five steps.'],
    ['serious', 'One. Get your PVC. No PVC, no vote. Two. Know your polling unit, and go and see it before election day.'],
    ['serious', 'Three. Go early. Bring water, and bring patience. Four. Stay for the count. Results are counted and posted right there at your unit.'],
    ['urgent',  'Five. Check your unit\'s result on INEC\'s I-Rev portal, and make sure it matches what was posted. And bring five people with you!'],
    ['fired',   'In twenty twenty-three, the winner got eight point seven nine million votes. Today, one hundred and ten million of us are registered. We are the majority!'],
    ['hopeful', 'Share this with everyone you know.'],
  ],
};
