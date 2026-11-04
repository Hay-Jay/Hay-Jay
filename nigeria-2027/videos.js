/* Content for the Naija 2027 videos.
   Edit the words/numbers here, then re-render with:  node render.mjs
   Every number has a source listed on the video's last scene and in README.md.
   Put your TikTok / IG handle here so it shows on every frame: */
window.HANDLE = '#Nigeria2027';

/* Narrator voice (Microsoft Edge neural TTS). Nigerian English options:
   'en-NG-AbeoNeural' (male) or 'en-NG-EzinneNeural' (female). */
window.VOICE = { name: 'en-NG-AbeoNeural', rate: '+10%' };

const IMG = {
  // Every candidate is shown the same way (initials, no photo) to keep the videos neutral.
  // To use photos, add a freely licensed one for EACH candidate and set all three paths.
  tinubu: '',
  atiku: '',
  obi: '',
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

const profile = (initials, name, party, color, facts) => ({
  dur: 5.6,
  html: `
    <div class="row a" data-a="up" style="align-items:center;gap:36px">
      <div class="cand" style="--c:${color};padding:0;border:0;background:none"><div class="ph" style="width:220px;height:220px;font-size:96px">${initials}</div></div>
      <div><span class="pill" style="background:${color};color:#021;border-color:transparent">${party}</span><div class="h2" style="margin-top:18px">${name}</div></div>
    </div>
    <div class="gap"></div>
    ${facts.map(([k, v, note], i) => `<div class="card a" data-a="left" data-t="${.4 + i * .3}" style="margin-bottom:22px"><div class="small">${k}</div><div class="h3">${v}</div>${note ? `<div class="sub" style="margin-top:6px">${note}</div>` : ''}</div>`).join('')}`,
});

/* A real article clipping (made by clip.mjs) shown as a paper cutout with an animated highlighter. */
const fmtDate = d => { if (!d || d.length < 7) return d || ''; const m = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']; const [y, mo, da] = d.split('-'); return (da ? +da + ' ' : '') + m[+mo - 1] + ' ' + y; };
const marksHtml = (c, t) => c.marks.map((m, i) => `<div class="hlw" style="left:${m.x * 100}%;top:${(m.y * 100) - .4}%;width:${m.w * 100}%;height:${(m.h * 100) + .8}%"><i class="a" data-a="bar" data-t="${t + i * .28}" data-d=".45" data-w="100"></i></div>`).join('');
const receipt = (id, { kind = 'real', label, t = .3, stamp, stampCls = '', tall, note } = {}) => {
  const c = (window.CLIPS || {})[id];
  if (!c) return `<div class="card"><div class="body">[missing clipping: ${id}. Run node clip.mjs]</div></div>`;
  const onHead = c.marksOn === 'head';
  return `
    <div class="a" data-a="up" data-t="${t - .2}"><span class="srcpill ${kind === 'prom' || stampCls === 'green' ? 'prom' : 'real'}">${label || (kind === 'prom' ? 'Promised' : 'Reality')} <span>${c.outlet} · ${fmtDate(c.date)}</span></span></div>
    <div class="rcpt">
      <div class="paper head ${tall || onHead ? 'tall' : ''} a" data-a="up" data-t="${t}"><img src="assets/clips/${id}-head.png" alt="">${onHead ? marksHtml(c, t + .8) : ''}</div>
      ${onHead ? '' : `<div class="paper quote a" data-a="right" data-t="${t + .5}"><img src="assets/clips/${id}-quote.png" alt="">${marksHtml(c, t + 1.1)}</div>`}
    </div>
    ${stamp ? `<div class="verdict"><div class="h3 a" data-a="up" data-t="${t + 2}">${note || ''}</div><div class="a" data-a="stamp" data-t="${t + 2.4}"><span class="stamp ${stampCls}">${stamp}</span></div></div>` : ''}`;
};
const promiseCard = (text, src) => `
  <div class="a" data-a="up" data-t=".1"><span class="srcpill prom">Promised <span>${src}</span></span></div>
  <div class="gap"></div>
  <div class="h2 a" data-a="up" data-t=".3">“${text}”</div>`;

const claimCard = (text, who, label = 'Claim') => `
  <div class="a" data-a="up" data-t=".1"><span class="srcpill">${label} <span>${who}</span></span></div>
  <div class="gap"></div>
  <div class="h2 a" data-a="up" data-t=".3" style="font-size:88px">“${text}”</div>`;

const trio = (kicker, rows) => ({
  dur: 6.5,
  html: `
    <div class="kicker a" data-a="up">${kicker}</div>
    <div class="cands">${rows.map(([name, party, color, text], i) => `
      <div class="cand a" data-a="left" data-t="${.3 + i * .45}" style="--c:${color}">
        <div class="ph" style="width:130px;height:130px;font-size:56px">${name.split(' ').map(w => w[0]).join('')}</div>
        <div><div class="meta" style="margin:0 0 6px"><span class="party">${party}</span>${name}</div><div class="h3" style="font-size:58px">${text}</div></div>
      </div>`).join('')}
    </div>`,
});

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
          ${cand(IMG.obi, 'PO', 'Peter Obi', 'NDC', 'var(--ndc)', 'Running mate: Rabiu Kwankwaso', 1.1)}
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
    caption: 'Petrol: ₦185 → ₦1,335. Dollar: ₦461 → ~₦1,350. Poverty: 56% → 63%. Prices don\'t vote. You do. 🇳🇬 #Nigeria2027 #CostOfLiving #Naira #Fuel #NigeriaDecides2027',
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
    caption: '68.5 million registered Nigerians didn\'t vote in 2023. The winning margin was 1.8 million. Do the maths. 🇳🇬 #Nigeria2027 #Election2023 #PVC #EveryVoteCounts',
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
        <div class="body a" data-a="up" data-t="2.2">States won: Tinubu <b>12</b> · Atiku <b>12</b> · Obi <b>11 + FCT</b> · Kwankwaso <b>1</b></div>` },
      { dur: 6, html: `
        <div class="kicker a" data-a="up">Do the maths</div>
        <div class="body a" data-a="up" data-t=".1">Gap between 1st and 2nd place</div>
        <div class="big a" data-a="count" data-t=".3" data-to="1.81" data-dec="2" data-suf="M">1.81M</div>
        <div class="gap"></div>
        <div class="body a" data-a="up" data-t="1">Registered voters who stayed home</div>
        <div class="big a red" data-a="count" data-t="1.2" data-to="68.5" data-dec="1" data-suf="M">68.5M</div>
        <div class="gap"></div>
        <div class="h3 a" data-a="up" data-t="2.2">The margin was less than <span class="mark">3%</span> of the people who didn't vote.</div>` },
      { dur: 5.4, html: `
        <div class="kicker a" data-a="up">2027 is a new race</div>
        <div class="h2 a" data-a="up" data-t=".1">New parties.<br>New tickets.</div>
        <div class="gap"></div>
        <div class="card a" data-a="left" data-t=".5"><div class="body">Tinubu: <b>APC</b>, now the incumbent</div></div>
        <div class="gap-s"></div>
        <div class="card a" data-a="left" data-t=".8"><div class="body">Atiku: PDP → <b>ADC</b></div></div>
        <div class="gap-s"></div>
        <div class="card a" data-a="left" data-t="1.1"><div class="body">Obi: LP → <b>NDC</b>, with Kwankwaso</div></div>
        <div class="gap"></div>
        <div class="h3 a" data-a="up" data-t="1.8">2023 results don't carry over. <span class="mark">Turnout decides.</span></div>` },
      { dur: 3.6, html: `
        <div class="h1 a" data-a="up">Don't let<br>68.5 million<br>stay home</div>
        <div class="gap"></div>
        <div class="h1 a hl" data-a="pop" data-t=".8">again.</div>` },
      sources([
        '<b>INEC</b> declared results, 1 March 2023',
        '<b>Registered:</b> 93,469,008 · <b>Votes cast:</b> 24,965,218',
        '<b>Tinubu</b> 8,794,726 · <b>Atiku</b> 6,984,520 · <b>Obi</b> 6,101,533 · <b>Kwankwaso</b> 1,496,687',
        '<b>2027 tickets:</b> INEC nomination publication, Aug 2026',
      ]),
    ],
  },

  /* ------------------------------------------------------------------ */
  {
    id: 'know-the-candidates',
    title: '4 · Know the candidates',
    caption: 'Three leading tickets for 16 January 2027: their records, side by side. Compare them, ask hard questions, then choose for yourself. 🇳🇬 #Nigeria2027 #NigeriaDecides2027 #KnowYourCandidates #INEC',
    scenes: [
      { dur: 4, html: `
        <div class="kicker a" data-a="up">Before you vote</div>
        <div class="h1 a" data-a="up" data-t=".1">Know the<br><span class="mark">candidates</span></div>
        <div class="gap"></div>
        <div class="body a" data-a="up" data-t=".8">Three leading tickets. The same questions for all of them.</div>
        <div class="sub a" data-a="up" data-t="1.1">Listed by their 2023 vote totals.</div>` },
      profile('BT', 'Bola Tinubu', 'APC', 'var(--apc)', [
        ['President', 'since May 2023'],
        ['Governor of Lagos', '1999 – 2007'],
        ['Running mate', 'Kashim Shettima', 'Vice President, former Borno governor'],
      ]),
      profile('AA', 'Atiku Abubakar', 'ADC', 'var(--adc)', [
        ['Vice President', '1999 – 2007'],
        ['PDP presidential candidate', '2019 and 2023'],
        ['Running mate', 'Rotimi Amaechi', 'Former Rivers governor and transport minister'],
      ]),
      profile('PO', 'Peter Obi', 'NDC', 'var(--ndc)', [
        ['Governor of Anambra', '2006 – 2014'],
        ['Labour Party presidential candidate', '2023'],
        ['Running mate', 'Rabiu Kwankwaso', 'Former Kano governor, 2023 NNPP candidate'],
      ]),
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
        <div class="h3 a" data-a="up" data-t="1.8">Ask every candidate: <span class="mark">what is your plan?</span></div>` },
      { dur: 4.4, html: `
        <div class="kicker a" data-a="up">16 January 2027</div>
        <div class="h1 a" data-a="up" data-t=".1">Compare.<br>Question.</div>
        <div class="h1 a hl" data-a="pop" data-t=".7">Choose for yourself.</div>
        <div class="gap"></div>
        <div class="body a" data-a="up" data-t="1.3">Then vote, and protect your vote.</div>` },
      sources([
        '<b>INEC</b> nomination publication, Aug 2026 (tickets and parties)',
        '<b>Wikipedia:</b> Bola Tinubu · Atiku Abubakar · Peter Obi (offices held)',
        '<b>World Bank</b> Apr 2026 · <b>NBS</b> CPI Sept 2026',
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
  /* ------------------------------------------------------------------ */
  {
    id: 'promise-vs-reality',
    title: '6 · Promise vs reality: 3 years in',
    caption: 'In 2022 the promises were big: 12% growth, 15,000MW of power, meters for all, an end to extreme poverty. Here are the receipts 3 years later, including what did improve. Judge for yourself. 🇳🇬 #Nigeria2027 #PromiseVsReality #FactCheck #NigeriaDecides2027',
    scenes: [
      { dur: 4, html: `
        <div class="kicker a" data-a="up">2022 promises → 2026 data</div>
        <div class="h1 a" data-a="up" data-t=".1">Promise<br>vs<br><span class="mark">reality</span></div>
        <div class="gap"></div>
        <div class="body a" data-a="up" data-t=".8">President Tinubu's campaign promises, checked against the receipts.</div>` },
      { dur: 5, html: `<div class="kicker a" data-a="up">Promise 1 · The economy</div>${receipt('promise-growth', { kind: 'prom' })}` },
      { dur: 6, html: `<div class="kicker a" data-a="up">Promise 1 · The economy</div>${receipt('reality-growth', { stamp: 'Far behind', stampCls: 'amber', note: '4.43% vs 12% promised' })}` },
      { dur: 5, html: `<div class="kicker a" data-a="up">Promise 2 · Electricity</div>${receipt('promise-power', { kind: 'prom' })}` },
      { dur: 6, mood: 'red', html: `<div class="kicker a" data-a="up">Promise 2 · Electricity</div>${receipt('reality-power', { stamp: 'Not delivered', note: '5,802 MW of 15,000 promised' })}` },
      { dur: 4.5, html: `<div class="kicker a" data-a="up">Promise 3 · Electricity bills</div>${promiseCard('All electricity bills will be meter-based.', 'Renewed Hope Agenda, p.30')}` },
      { dur: 6, html: `<div class="kicker a" data-a="up">Promise 3 · Electricity bills</div>${receipt('reality-meters', { stamp: 'Not yet', stampCls: 'amber', note: '4.8M homes still unmetered' })}` },
      { dur: 4.5, html: `<div class="kicker a" data-a="up">Promise 4 · Poverty</div>${promiseCard('End extreme poverty.', 'Renewed Hope Agenda, 2022')}` },
      { dur: 6, mood: 'red', html: `<div class="kicker a" data-a="up">Promise 4 · Poverty</div>${receipt('reality-poverty', { stamp: 'Worse', note: '56% → 63% in poverty' })}` },
      { dur: 6, mood: 'red', html: `<div class="kicker a" data-a="up">Promise 5 · Refineries</div>${receipt('reality-refinery', { label: 'Reality', stamp: 'Failed so far', note: 'Shut down after a $1.5bn rehab' })}` },
      { dur: 7, html: `
        <div class="kicker a" data-a="up">To be fair: what improved</div>
        <div class="vs">
          <div class="card a" data-a="left" data-t=".2"><div class="small hl">Inflation</div><div class="h3">Down from 34.8% (Dec 2024) to 14.6%</div></div>
          <div class="card a" data-a="left" data-t=".5"><div class="small hl">Foreign reserves</div><div class="h3">$35.1bn → $54.9bn</div></div>
          <div class="card a" data-a="left" data-t=".8"><div class="small hl">Oil theft</div><div class="h3">Lowest since 2009</div></div>
          <div class="card a" data-a="left" data-t="1.1"><div class="small hl">Non-oil exports</div><div class="h3">Record $6.1bn in 2025</div></div>
        </div>
        <div class="src a" data-a="fade" data-t="1.6">Rated TRUE by FactCheckHub, 2 Oct 2026 · CBN reserve data</div>` },
      { dur: 5, html: `
        <div class="kicker a" data-a="up">The scorecard</div>
        <div class="row a" data-a="up" data-t=".1" style="gap:22px">
          <div class="card" style="flex:1;text-align:center"><div class="big red" style="font-size:160px">0</div><div class="small">Fully kept</div></div>
          <div class="card" style="flex:1;text-align:center"><div class="big gold" style="font-size:160px">2</div><div class="small">Behind / not yet</div></div>
          <div class="card" style="flex:1;text-align:center"><div class="big red" style="font-size:160px">3</div><div class="small">Not delivered / worse / failed</div></div>
        </div>
        <div class="gap"></div>
        <div class="h3 a" data-a="up" data-t=".9">Some numbers are up. The big promises are not met.</div>
        <div class="gap-s"></div>
        <div class="h2 a hl" data-a="pop" data-t="1.5">Judge the record.</div>` },
      sources([
        '<b>Promises:</b> BusinessDay, 9 Jun 2022 · Nairametrics, 10 Jun 2022 · Renewed Hope Agenda',
        '<b>Growth:</b> NBS via Nairametrics, 31 Aug 2026',
        '<b>Power:</b> TCN via Nairametrics, 6 Mar 2025 · <b>Meters:</b> Nairametrics, 2 Oct 2026',
        '<b>Poverty:</b> World Bank via Nairametrics, 10 Apr 2026',
        '<b>Refineries:</b> NNPC via Nairametrics, 5 Feb 2026 · <b>Fair check:</b> FactCheckHub, 2 Oct 2026',
      ]),
    ],
  },
  /* ------------------------------------------------------------------ */
  {
    id: 'fact-check',
    title: '7 · Fact-check: what the presidency said',
    caption: '"$30 billion in foreign investment." "Ways and Means debt cleared." Independent fact-checkers looked at the presidency\'s claims: here are the verdicts, the ones that were TRUE, and fakes about the President you should not share either. 🇳🇬 #Nigeria2027 #FactCheck #Dubawa #FactCheckHub',
    scenes: [
      { dur: 4, html: `
        <div class="kicker a" data-a="up">Independent fact-checkers</div>
        <div class="h1 a" data-a="up" data-t=".1">Fact-check:<br>what the<br><span class="mark">presidency</span><br>said</div>
        <div class="gap"></div>
        <div class="body a" data-a="up" data-t=".8">Claims from official speeches and accounts, and the verdicts.</div>` },
      { dur: 4.5, html: `<div class="kicker a" data-a="up">Claim 1 · Investment</div>${claimCard('Nigeria attracted foreign direct investments worth more than $30 billion in the last year.', 'President Tinubu · Independence Day broadcast, 1 Oct 2024')}` },
      { dur: 6.5, mood: 'red', html: `<div class="kicker a" data-a="up">Claim 1 · Investment</div>${receipt('fc-fdi', { label: 'Verdict', stamp: 'False', note: 'NBS: about $363M in 9 months' })}` },
      { dur: 4.5, html: `<div class="kicker a" data-a="up">Claim 2 · Debt</div>${claimCard('We have cleared the Ways and Means debt of over ₦30 trillion.', 'President Tinubu · Independence Day broadcast, 1 Oct 2024')}` },
      { dur: 6.5, mood: 'red', html: `<div class="kicker a" data-a="up">Claim 2 · Debt</div>${receipt('fc-waysmeans', { label: 'Verdict', stamp: 'Misleading', stampCls: 'amber', note: 'Turned into a 40-year loan, not paid off' })}` },
      { dur: 4.5, html: `<div class="kicker a" data-a="up">Claim 3 · A "new" message</div>${claimCard('A video of the President asking Nigerians to look beyond temporary pains, posted during the #EndBadGovernance protests.', '@NGRPresident and @officialABAT on X · 7 Aug 2024', 'Posted')}` },
      { dur: 6.5, mood: 'red', html: `<div class="kicker a" data-a="up">Claim 3 · A "new" message</div>${receipt('fc-oldvideo', { label: 'Verdict', stamp: 'Misleading', stampCls: 'amber', note: 'Old July 2023 video, not new' })}` },
      { dur: 6.5, html: `<div class="kicker a" data-a="up">To be fair: claims rated TRUE</div>${receipt('factcheck-economy', { label: 'Verdict', stamp: 'True', stampCls: 'green', note: 'Growth, inflation, oil theft, exports (Oct 2026)' })}` },
      { dur: 6, html: `
        <div class="kicker a" data-a="up">Fakes about the President: don't share them</div>
        <div class="vs">
          <div class="card a" data-a="left" data-t=".2"><div class="small red">Misleading</div><div class="h3">"Named the world's 3rd most corrupt person"</div><div class="sub" style="margin-top:6px">He got the 3rd most nominations in an OCCRP reader poll. Not a ranking. (Dubawa)</div></div>
          <div class="card a" data-a="left" data-t=".6"><div class="small gold">Unproven</div><div class="h3">"He lives in France and rules remotely"</div><div class="sub" style="margin-top:6px">No evidence. Two trips to France in 2026. (FactCheckHub)</div></div>
        </div>
        <div class="gap"></div>
        <div class="h3 a" data-a="up" data-t="1.4">Fakes make the real facts easier to dismiss.</div>` },
      { dur: 4.5, html: `
        <div class="kicker a" data-a="up">The rule</div>
        <div class="h1 a" data-a="up" data-t=".1">Check<br>every claim.</div>
        <div class="h1 a hl" data-a="pop" data-t=".7">From every side.</div>
        <div class="gap"></div>
        <div class="body a" data-a="up" data-t="1.3">Then vote on January 16.</div>` },
      sources([
        '<b>Claims 1–2:</b> FactCheckHub, “Fact-checking Tinubu’s independence day speech”, Oct 2024',
        '<b>Claim 3:</b> Dubawa, 10 Aug 2024 (presidency X pages, old video)',
        '<b>TRUE claims:</b> FactCheckHub, 2 Oct 2026',
        '<b>Fakes:</b> Dubawa (OCCRP “3rd most corrupt”) · FactCheckHub (France claim)',
      ]),
    ],
  },
  /* ------------------------------------------------------------------ */
  {
    id: 'where-the-money-went',
    title: '8 · Where did the money go?',
    caption: 'The Auditor-General flagged ₦1.34 trillion in lapses. ₦33.75bn in cash transfers could not be verified. Big trials are still dragging. Here are the receipts, with the agencies\' replies. Allegations are not convictions, so demand the trials finish. 🇳🇬 #Nigeria2027 #Accountability #AuditorGeneral #EFCC',
    scenes: [
      { dur: 4.5, html: `
        <div class="kicker a" data-a="up">Audits · court cases · spending</div>
        <div class="h1 a" data-a="up" data-t=".1">Where did<br>the <span class="mark">money</span><br>go?</div>
        <div class="gap"></div>
        <div class="body a" data-a="up" data-t=".8">Only official reports, court records and verified facts. An allegation is not a conviction.</div>` },
      { dur: 6.5, mood: 'red', html: `<div class="kicker a" data-a="up">1 · The Auditor-General's report</div>${receipt('m-audit', { label: 'Official audit', stamp: '₦1.34tn', note: 'Irregularities and lapses across ministries and agencies' })}` },
      { dur: 6.5, mood: 'red', html: `<div class="kicker a" data-a="up">2 · Cash transfers to the poor</div>${receipt('m-cashtransfer', { label: 'Official audit', stamp: 'Unverified', stampCls: 'amber', note: '₦33.75bn. The office disputes part of the finding' })}` },
      { dur: 6.5, mood: 'red', html: `<div class="kicker a" data-a="up">3 · Humanitarian ministry</div>${receipt('m-bettaedu', { label: 'Reported', stamp: 'Suspended', stampCls: 'amber', note: '₦585M memo to a private account. EFCC probe' })}` },
      { dur: 6.5, html: `<div class="kicker a" data-a="up">4 · Ex-CBN governor</div>${receipt('m-emefiele', { label: 'In court', stamp: 'On trial', stampCls: 'amber', note: 'Emefiele: 20 counts. Denies the charges' })}` },
      { dur: 6.5, html: `<div class="kicker a" data-a="up">5 · Ex-Kogi governor</div>${receipt('m-bello', { label: 'In court', stamp: 'On trial', stampCls: 'amber', note: 'Yahaya Bello: ₦80bn. Denies it, and is an APC Senate candidate' })}` },
      { dur: 6.5, mood: 'red', html: `<div class="kicker a" data-a="up">6 · Spending choices</div>${receipt('m-suvs', { label: 'Verified', stamp: 'True', stampCls: 'green', note: '₦70bn for SUVs for 469 lawmakers, during a cost-of-living crisis' })}` },
      { dur: 5.5, html: `
        <div class="kicker a" data-a="up">What we should demand</div>
        <div class="check a" data-a="left" data-t=".1"><div class="n">1</div><div class="t">Finish the trials<span>Courts, not TikTok, decide guilt. Years of delay help nobody.</span></div></div>
        <div class="check a" data-a="left" data-t=".5"><div class="n">2</div><div class="t">Answer the audit<span>Agencies must appear before the Public Accounts Committees.</span></div></div>
        <div class="check a" data-a="left" data-t=".9"><div class="n">3</div><div class="t">Sign the Audit Service Bill<span>Give the Auditor-General real independence.</span></div></div>` },
      { dur: 4, html: `
        <div class="h1 a" data-a="up">It's our<br>money.</div>
        <div class="h1 a hl" data-a="pop" data-t=".7">Ask where it went.</div>` },
      sources([
        '<b>Audit:</b> Auditor-General report to NASS, Jul 2026, via Daily Trust · StatePress',
        '<b>Edu:</b> ICIR, Jan 2024 · <b>Emefiele:</b> Naija News, 20 Oct 2026',
        '<b>Bello:</b> Nairametrics, 24 Apr 2026 · allAfrica, May 2026',
        '<b>SUVs:</b> Dubawa, 11 Aug 2024 (rated TRUE)',
        'Everyone named is presumed innocent unless convicted by a court.',
      ]),
    ],
  },

  /* ------------------------------------------------------------------ */
  {
    id: 'candidate-scorecard',
    title: '9 · Candidate scorecard',
    caption: 'Tinubu, Atiku, Obi: same questions, same rules. Experience, 2027 pitch, what is on the record (with their own replies), and the question each one must answer. Score them yourself. 🇳🇬 #Nigeria2027 #Tinubu #Atiku #PeterObi #KnowYourCandidates',
    scenes: [
      { dur: 4, html: `
        <div class="kicker a" data-a="up">Same questions · same rules</div>
        <div class="h1 a" data-a="up" data-t=".1">Candidate<br><span class="mark">scorecard</span></div>
        <div class="gap"></div>
        <div class="body a" data-a="up" data-t=".8">Tinubu. Atiku. Obi. Every claim has a source. Every allegation comes with their reply.</div>` },
      trio('Round 1 · Experience', [
        ['Bola Tinubu', 'APC', 'var(--apc)', 'Lagos governor 8 yrs · President since 2023'],
        ['Atiku Abubakar', 'ADC', 'var(--adc)', 'Vice President 8 yrs (1999–2007) · businessman'],
        ['Peter Obi', 'NDC', 'var(--ndc)', 'Anambra governor ~8 yrs (2006–2014) · businessman'],
      ]),
      trio('Round 2 · The 2027 pitch', [
        ['Bola Tinubu', 'APC', 'var(--apc)', 'Continue reforms: a $1 trillion economy by 2030'],
        ['Atiku Abubakar', 'ADC', 'var(--adc)', 'Restore a form of fuel subsidy · restructure the federation'],
        ['Peter Obi', 'NDC', 'var(--ndc)', 'Move Nigeria from consumption to production'],
      ]),
      { dur: 7, html: `<div class="kicker a" data-a="up">Round 3 · On the record · Tinubu</div>${receipt('s-tinubu', { label: 'On record', stamp: '$460,000', stampCls: 'amber', note: '1993 US case. Tribunal (2023): not a conviction' })}` },
      { dur: 7, html: `<div class="kicker a" data-a="up">Round 3 · On the record · Atiku</div>${receipt('s-atiku', { label: 'On record', stamp: '$40M', stampCls: 'amber', note: '2010 US Senate report. He denies wrongdoing' })}` },
      { dur: 7, html: `<div class="kicker a" data-a="up">Round 3 · On the record · Obi</div>${receipt('s-obi', { label: 'On record', stamp: 'Undeclared', stampCls: 'amber', note: 'Pandora Papers, 2021. Says he broke no law' })}` },
      trio('Round 4 · The question each must answer', [
        ['Bola Tinubu', 'APC', 'var(--apc)', 'Your 2022 targets were missed. Why trust the 2030 ones?'],
        ['Atiku Abubakar', 'ADC', 'var(--adc)', 'How will you pay for a fuel subsidy, and stop the leakages this time?'],
        ['Peter Obi', 'NDC', 'var(--ndc)', 'How, how fast, and with what money will production replace imports?'],
      ]),
      { dur: 4.5, html: `
        <div class="h1 a" data-a="up">No perfect<br>candidate.</div>
        <div class="h1 a hl" data-a="pop" data-t=".7">Score them yourself.</div>
        <div class="gap"></div>
        <div class="body a" data-a="up" data-t="1.3">Then vote on January 16.</div>` },
      sources([
        '<b>Offices and tickets:</b> INEC 2026 · Wikipedia',
        '<b>Pitches:</b> Renewed Hope plan 2026–2030 · Atiku/ADC screening speech, Arise TV · Obi manifesto launch, VON',
        '<b>Tinubu:</b> Vanguard, 11 Apr 2023 · <b>Atiku:</b> US Senate PSI report 2010, via Vanguard',
        '<b>Obi:</b> ICIR/Premium Times Pandora Papers, Oct 2021 · ThisDay, 7 Oct 2021',
        'Allegations are not convictions. None of the three has been convicted.',
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
    ['calm',    'Here is the official result. Tinubu, eight point seven nine million. Atiku, six point nine eight million. Peter Obi, six point one million. Kwankwaso, one point five million. Tinubu and Atiku won twelve states each, Obi won eleven and Abuja, and Kwankwaso won Kano.'],
    ['urgent',  'Now do the maths. The gap between first and second place was one point eight million votes. That is less than three percent of the people who stayed home!'],
    ['serious', 'And twenty twenty-seven is a new race. Atiku has moved to the ADC. Obi has moved to the NDC, with Kwankwaso as his running mate. Tinubu runs as the incumbent. Old results don\'t carry over. Turnout decides.'],
    ['fired',   'Don\'t let sixty-eight million people stay home again!'],
    ['calm',    'Every number is from INEC. Check it. Then share it.'],
  ],
  'know-the-candidates': [
    ['calm',    'Before you vote, know the candidates. Three leading tickets... and the same questions for all of them.'],
    ['serious', 'Bola Tinubu, APC. President since May twenty twenty-three, and governor of Lagos State from nineteen ninety-nine to two thousand and seven. His running mate is Vice President Kashim Shettima.'],
    ['serious', 'Atiku Abubakar, ADC. Vice President from nineteen ninety-nine to two thousand and seven, and the PDP candidate in twenty nineteen and twenty twenty-three. His running mate is Rotimi Amaechi.'],
    ['serious', 'Peter Obi, NDC. Governor of Anambra State from two thousand and six to twenty fourteen, and the Labour Party candidate in twenty twenty-three. His running mate is Rabiu Kwankwaso.'],
    ['grave',   'Why do we need change? Poverty, up to sixty-three percent. Petrol, seven times more expensive. The naira has lost two thirds of its value. So ask every candidate... what is your plan?'],
    ['fired',   'Compare them. Question them. Then choose for yourself. Vote on January sixteenth, and protect your vote!'],
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
  'promise-vs-reality': [
    ['serious', 'In twenty twenty-two, candidate Tinubu made big promises. Three years into his presidency... here are the receipts.'],
    ['serious', 'Promise one: the economy. His agenda targeted twelve percent growth.'],
    ['serious', 'Reality? The best quarter so far was four point four three percent. Far behind.'],
    ['serious', 'Promise two: fifteen thousand megawatts of electricity.'],
    ['grave',   'Reality: the highest the national grid has ever reached is about five thousand eight hundred megawatts. Not delivered.'],
    ['serious', 'Promise three: every electricity bill based on a meter. No more estimated bills.'],
    ['serious', 'Reality: four point eight million customers still have no meter. Not yet.'],
    ['serious', 'Promise four: end extreme poverty.'],
    ['grave',   'Reality: the World Bank says poverty rose to sixty-three percent in twenty twenty-five. That is worse.'],
    ['grave',   'And the refineries? NNPC shut down the state-owned refineries, after the Port Harcourt rehab. Failed, so far.'],
    ['calm',    'To be fair, some things improved. Inflation is down from its peak. Foreign reserves are up. Oil theft is the lowest since two thousand and nine. And non-oil exports hit a record. Fact-checkers rated these claims true.'],
    ['fired',   'The scorecard. Five big promises. None fully kept. Some numbers are up, but the big promises are not met. Judge the record, and vote on January sixteenth!'],
    ['calm',    'Every article is on screen. Look them up, then share this.'],
  ],
  'fact-check': [
    ['serious', 'What has the presidency told Nigerians... and what did independent fact-checkers find?'],
    ['serious', 'Claim one. On Independence Day twenty twenty-four, the President said Nigeria attracted more than thirty billion dollars in foreign direct investment in a year.'],
    ['grave',   'The verdict: false. Official NBS data shows about three hundred and sixty-three million dollars over nine months. Not thirty billion.'],
    ['serious', 'Claim two. In the same speech: we have cleared the Ways and Means debt of over thirty trillion naira.'],
    ['grave',   'The verdict: misleading. The debt was not paid off. It was turned into a forty-year loan that Nigerians will keep paying.'],
    ['serious', 'Claim three. During the hunger protests in August twenty twenty-four, the presidency posted a video of the President asking Nigerians to look beyond temporary pains.'],
    ['grave',   'The verdict: misleading. It was an old video from July twenty twenty-three, posted without saying so.'],
    ['calm',    'To be fair, some claims checked out. In October twenty twenty-six, fact-checkers rated his claims on growth, inflation, oil theft and exports... true.'],
    ['urgent',  'And fakes about the President? Don\'t share them. He was never named the world\'s third most corrupt person. And there is no evidence he lives in France. Fakes make the real facts easier to dismiss.'],
    ['fired',   'So check every claim. From every side. Then vote on January sixteenth!'],
    ['calm',    'Every fact-check is on screen. Look them up, then share this.'],
  ],
  'where-the-money-went': [
    ['serious', 'Where did the money go? Only official reports, court records and verified facts here. And remember: an allegation is not a conviction.'],
    ['grave',   'One. The Auditor-General\'s latest report flagged irregularities and lapses worth over one point three four trillion naira, across ministries and agencies.'],
    ['grave',   'Two. Thirty-three point seven five billion naira in cash transfers to poor households. The auditors could not confirm it reached real beneficiaries. The office disputes part of this.'],
    ['serious', 'Three. In January twenty twenty-four, the humanitarian minister was suspended after a memo asked for five hundred and eighty-five million naira to be paid into a private account. The EFCC investigated.'],
    ['serious', 'Four. The former Central Bank governor, Godwin Emefiele, is on trial on twenty counts. He denies the charges.'],
    ['serious', 'Five. Former Kogi governor Yahaya Bello is on trial over eighty billion naira. He denies it... and he is now an APC Senate candidate.'],
    ['grave',   'Six. Seventy billion naira for SUVs for four hundred and sixty-nine lawmakers. Verified true. During a cost-of-living crisis.'],
    ['urgent',  'So what should we demand? Finish the trials. Make the agencies answer the audit. And sign the Audit Service Bill, so the Auditor-General is truly independent.'],
    ['fired',   'It is our money. Ask where it went!'],
    ['calm',    'Every source is on screen. Everyone named is presumed innocent unless convicted by a court.'],
  ],
  'candidate-scorecard': [
    ['calm',    'Tinubu. Atiku. Obi. Same questions, same rules. Every claim has a source, and every allegation comes with their reply.'],
    ['serious', 'Round one: experience. Tinubu governed Lagos for eight years and has been President since twenty twenty-three. Atiku was Vice President for eight years. Obi governed Anambra for about eight years.'],
    ['serious', 'Round two: the pitch. Tinubu wants to continue his reforms, toward a one trillion dollar economy by twenty thirty. Atiku promises to restore a form of fuel subsidy and restructure the federation. Obi wants to move Nigeria from consumption to production.'],
    ['serious', 'Round three: what is on the record. Tinubu forfeited four hundred and sixty thousand dollars in a US case in nineteen ninety-three. His side says it was a civil settlement, not a conviction, and a tribunal agreed in twenty twenty-three.'],
    ['serious', 'Atiku: a twenty ten US Senate report said over forty million dollars in suspect funds entered the US through his wife\'s accounts. He says no court has ever found him guilty.'],
    ['serious', 'Obi: the Pandora Papers said he did not declare offshore companies while governor. He says he broke no law.'],
    ['urgent',  'Round four: the question each must answer. Tinubu: your targets were missed... why trust the next ones? Atiku: how will you pay for a fuel subsidy? Obi: how, how fast, and with what money?'],
    ['fired',   'There is no perfect candidate. Score them yourself. Then vote on January sixteenth!'],
    ['calm',    'All sources are on screen. None of the three has been convicted of a crime.'],
  ],
};
