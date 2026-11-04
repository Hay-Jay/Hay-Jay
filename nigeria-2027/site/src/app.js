(function(){
/* ======================= CONFIG ======================= */
const CONFIG = {
  handle: '#Nigeria2027',                 // your @handle
  pollFormUrl: '',                        // paste your Google Form link to switch on the viewer poll
};

/* ======================= DATA ======================= */
/*OLD_DATA*/

Object.assign(S, {
  n_youth:{t:'Naija News, 3 Nov 2026',u:'https://www.naijanews.com/2026/11/03/inec-explains-drop-youth-voter-registration-ahead-2027-elections/'},
  n_police:{t:'Naija News, 3 Nov 2026',u:'https://www.naijanews.com/2026/11/03/national-assembly-to-transmit-state-police-bill-to-president-tinubu/'},
  n_sokoto:{t:'Naija News, 3 Nov 2026',u:'https://www.naijanews.com/2026/11/03/atiku-disrupt-adc-campaign-rally-in-sokoto/'},
  n_elrufai:{t:'Naija News, 3 Nov 2026',u:'https://www.naijanews.com/2026/11/03/el-rufai-issues-directives-on-2027-elections/'},
  n_melaye:{t:'Naija News, 3 Nov 2026',u:'https://www.naijanews.com/2026/11/03/inec-apc-2027-elections-dino-melaye-alarm/'},
  n_list:{t:'Naija News, 12 Sep 2026',u:'https://www.naijanews.com/2026/09/12/inec-releases-presidential-candidates/'},
  sowore:{t:'Omoyele Sowore (Wikipedia)',u:'https://en.wikipedia.org/wiki/Omoyele_Sowore'},
  duke:{t:'Donald Duke (Wikipedia)',u:'https://en.wikipedia.org/wiki/Donald_Duke'},
  makinde:{t:'Seyi Makinde (Wikipedia)',u:'https://en.wikipedia.org/wiki/Seyi_Makinde'},
  adebayo:{t:'Adewole Adebayo (Wikipedia)',u:'https://en.wikipedia.org/wiki/Adewole_Adebayo'},
  abbas:{t:'Wikimedia Commons (Aliyu Bin Abbas)',u:'https://commons.wikimedia.org/wiki/File:Aliyu_Bin_Abbas_certificate_of_return.jpg'},
  reserves:{t:'CBN data via FactCheckHub / Africa Check',u:'https://factcheckhub.com/nigeria-at-66-fact-checking-tinubus-independence-day-economics/'}
});

// Freely licensed portraits only (Wikimedia Commons), cropped square around the face. Candidates without a free photo keep initials.
const PHOTOS = { tinubu:'photos/tinubu.jpg', atiku:'photos/atiku.jpg', obi:'photos/obi.jpg', 'seyi-makinde':'photos/makinde.jpg', 'omoyele-sowore':'photos/sowore.jpg', 'adewole-adebayo':'photos/adebayo.jpg', 'aliyu-abbas-bin':'photos/abbas.jpg' };
const CREDITS = [
  'Photos via Wikimedia Commons, cropped (and for Makinde, upscaled) by Naija Decides; adaptations of CC BY-SA photos are shared under the same licence.',
  'Tinubu: Nosa Asemota, CC BY-SA 4.0.', 'Atiku: Morten Fauerby / Atiku Abubakar (Flickr), CC BY 2.0.', 'Obi: official portrait as published by Premium Times (4 Nov 2022); photographer not credited.',
  'Makinde: Oduola Matthew, CC BY-SA 4.0.', 'Sowore: Mohamed Nanabhay, CC BY 2.0.', 'Adebayo: Benbaahi, CC BY-SA 4.0.', 'Abbas-Bin: Ultimatemastery, CC BY-SA 4.0.'
];
C.forEach(c => c.photo = PHOTOS[c.id] || '');
C.find(c => c.id === 'tinubu').img = 'img/s-tinubu.jpg';
C.find(c => c.id === 'atiku').img = 'img/s-atiku.jpg';
C.find(c => c.id === 'obi').img = 'img/s-obi.jpg';
const FIMG = {0:'img/fc-fdi.jpg',1:'img/fc-waysmeans.jpg',3:'img/fc-oldvideo.jpg',5:'img/factcheck-economy.jpg',8:'img/m-suvs.jpg'};
FACTS.forEach((f, i) => f.img = FIMG[i] || '');
const PIMG = ['img/reality-growth.jpg','img/reality-power.jpg','img/reality-meters.jpg','img/reality-poverty.jpg','img/reality-refinery.jpg'];
PROMISES.forEach((p, i) => p.img = PIMG[i]);
const MIMG = ['img/m-audit.jpg','img/m-cashtransfer.jpg','img/m-bettaedu.jpg','img/m-emefiele.jpg','img/m-bello.jpg','img/m-suvs.jpg'];
MONEY.forEach((m, i) => m.img = MIMG[i]);

const NEWS = {edition:'Week of 2–8 November 2026', note:'The full roundup video drops every Sunday at 6pm WAT.', items:[
  {img:'img/n-youth.jpg',tag:'INEC',h:'Young voters shrink to 29.8% of the register',d:'INEC says under-35s make up 29.79% of the register under review, down from 39.65% in 2023. The chairman says it is mostly 2023 voters ageing into older brackets.',why:'Young voters swung Lagos in 2023. A smaller youth share changes the maths.',src:'n_youth',outlet:'Naija News'},
  {img:'img/n-statepolice.jpg',tag:'Security',h:'State police bill heads to Tinubu',d:'28 state assemblies approved the constitutional amendment. The National Assembly says it will now send the bill for the President\'s assent.',why:'If signed, states could run their own police forces for the first time.',src:'n_police',outlet:'Naija News'},
  {img:'img/n-sokoto.jpg',tag:'Allegation',h:'Atiku alleges a plot to disrupt the ADC rally in Sokoto',d:'At an Abuja briefing, Atiku accused the DSS leadership of mobilising protesters so the state could impose a curfew. These are his claims; the report carries no DSS response.',why:'Watch for rally restrictions across states as campaigns heat up.',src:'n_sokoto',outlet:'Naija News'},
  {img:'img/n-elrufai.jpg',tag:'Campaign',h:'El-Rufai tells supporters: vote ADC at every level',d:'The former Kaduna governor\'s directive covers presidential, governorship and legislative races across Kaduna\'s 23 local government areas.',why:'Kaduna has 4.66M registered voters, the third most in Nigeria.',src:'n_elrufai',outlet:'Naija News'},
  {img:'img/n-deepfakes.jpg',tag:'INEC',h:'INEC warns: deepfakes and cloned voices are coming',d:'Chairman Joash Amupitan said manipulated videos, cloned voices and fabricated images could undermine trust in the 2027 vote.',why:'Check before you share. Practise with our Fact or Cap game.',src:'deepfakes',outlet:'The Sun',cta:['#play','Play Fact or Cap']},
  {img:'img/n-melaye.jpg',tag:'Allegation',h:'Dino Melaye claims INEC is helping the APC rig',d:'The former senator made the claim on Arise TV. The report includes no supporting evidence and no response from INEC.',why:'Serious claims need evidence. We will follow up if any is published.',src:'n_melaye',outlet:'Naija News'},
  {img:'img/n-list.jpg',tag:'Ballot',h:'18 candidates, 2 women: the full ballot',d:'INEC\'s final list has 18 presidential tickets, 16 led by men and 2 by women, with four female running mates.',why:'See all 18 ranked by the evidence on our scoreboard.',src:'n_list',outlet:'Naija News',cta:['#candidates','Open the scoreboard']}
]};

const PCOL = {APC:'var(--apc)',ADC:'var(--adc)',NDC:'var(--ndc)',PDP:'#e8443a',LP:'#d9e021',SDP:'#ff7ac8',APM:'#9fd3ff',PRP:'#ff5050',AAC:'#ff3b3b',AA:'#c6a7ff',ADP:'#ffd27a',APP:'#7affd7',BP:'#d4b483',DLA:'#a0ffa0',NDP:'#ffa4a4',NRM:'#7ab6ff',YPP:'#ffcf3d',ZLP:'#b0b0ff'};
const ALL = [
  ['APC','Bola Tinubu','Kashim Shettima',1,'President since May 2023 · Lagos governor 1999–2007','8.79M votes, 1st (36.6%)','tinubu'],
  ['ADC','Atiku Abubakar','Rotimi Amaechi',1,'Vice President 1999–2007','6.98M votes, 2nd (29.1%, PDP)','atiku'],
  ['NDC','Peter Obi','Rabiu Kwankwaso',1,'Anambra governor 2006–2014','6.10M votes, 3rd (25.4%, LP)','obi'],
  ['APM','Seyi Makinde','Musa Lawal Daura',2,'Governor of Oyo State since 2019, re-elected in 2023. Engineer and businessman before politics. Running for president for the first time.','Did not run','makinde'],
  ['PRP','Donald Duke','Kabiru Rabiu',2,'Governor of Cross River 1999–2007, known for the Obudu Ranch and Tinapa projects. Ran for president in 2019 (SDP).','Did not run','duke'],
  ['PDP','Sandy Ojang Onor','Umaru Babangida',2,'Candidate of the 2023 runner-up party','Did not run','n_list'],
  ['LP','Sunday Chibuzo Okereke','Hajja Bintu Konto',2,'Candidate of Obi\'s 2023 party (6.1M votes)','Did not run','n_list'],
  ['AAC','Omoyele Sowore','Haruna Garba Magashi',2,'Founder of Sahara Reporters (2006) and the AAC (2018). Led the 2019 #RevolutionNow protests and was detained by the DSS. Ran in 2019 (33,953 votes) and 2023.','About 14,608 votes','sowore'],
  ['SDP','Adewole Adebayo','Usman Muhammed Bugaje',2,'Lawyer and founder of KAFTAN TV. SDP presidential candidate in 2023, running again.','Ran (SDP)','adebayo'],
  ['AA','Rufai Adekunle Omo-Aje','Shehu Hussaini',3,'','Did not run','n_list'],
  ['ADP','Aliyu Abbas-Bin','Chinazam Ike',3,'Also written Aliyu Bin Abbas. Founder of the National Youth Alliance youth group; declared ADP presidential candidate in June 2026.','Did not run','abbas'],
  ['APP','Kabiru Yusuf','Peace Egobia Ofordile',3,'','Did not run','n_list'],
  ['BP','Sunday Adenuga','Usman Turaki Mustapha',3,'Boot Party candidate in 2023 too','Ran (BP)','n_list'],
  ['DLA','Moses Olusoji Adebisi','Nafisat Usaku Abubakar',3,'','Did not run','n_list'],
  ['NDP','Ada Elizabeth Fredrick Okwori','Uchenna Anthony Chukwuemeka',3,'One of two women on the ballot','Did not run','n_list'],
  ['NRM','Nkem Esther Okereke','Nasir Muhammed Sulaiman',3,'One of two women on the ballot','Did not run','n_list'],
  ['YPP','Peter Ada Agada','Patience Ndidi Key',3,'','Did not run','n_list'],
  ['ZLP','Daniel Nwanyanwu','Hassan Khalid',3,'Zenith Labour Party candidate in 2023 too','Ran (ZLP)','n_list']
].map(([party, name, mate, tier, note, r23, src]) => ({party, name, mate, tier, note, r23, src, id: name.toLowerCase().replace(/[^a-z]+/g, '-'),
  ini: name.split(' ').filter((w, i, a) => i === 0 || i === a.length - 1).map(w => w[0]).join(''), c: PCOL[party] || '#888'}));
ALL[0].id = 'tinubu'; ALL[1].id = 'atiku'; ALL[2].id = 'obi';
ALL.forEach(a => { a.photo = PHOTOS[a.id] || ''; });
const SIGNALS = { tinubu:{fav:'−58.5', straw:'—'}, atiku:{fav:'not reported', straw:'73.6%'}, obi:{fav:'+58.3', straw:'22.3%'} };
// Popularity index: the only measured signals that exist. Missing values count as neutral (50).
const POP = { tinubu:{fav:-58.5, share:36.6, straw:null}, atiku:{fav:null, share:29.1, straw:73.6}, obi:{fav:58.3, share:25.4, straw:22.3} };
const POPSIG = [
  ['fav','2026 favourability','SBM Intelligence net favourability, May 2026 (−100 to +100)', v => (v + 100) / 2, 'sbm'],
  ['share','2023 vote share','Share of votes cast in 2023, scaled to the winner', v => v / 36.6 * 100, 'wiki23'],
  ['straw','Online straw poll','Self-selected online poll, Sep 2026, run by an anti-Tinubu group', v => v / 73.6 * 100, 'tmg']
];
const POPW_DEFAULT = {fav:50, share:35, straw:15};
function popScores(){
  const w = store.get('popw', POPW_DEFAULT); const tot = POPSIG.reduce((a, [k]) => a + (+w[k] || 0), 0) || 1; const out = {};
  Object.entries(POP).forEach(([id, d]) => { out[id] = Math.round(POPSIG.reduce((a, [k, , , f]) => a + (+w[k] || 0) * (d[k] == null ? 50 : f(d[k])), 0) / tot * 10) / 10; });
  return out;
}
function ranked(){ const sc = popScores(); const top = ALL.filter(a => sc[a.id] != null).sort((x, y) => sc[y.id] - sc[x.id]); return [...top, ...ALL.filter(a => sc[a.id] == null).sort((x, y) => x.tier - y.tier)]; }
function popPanel(){
  const w = store.get('popw', POPW_DEFAULT); const sc = popScores(); const order = Object.keys(sc).sort((a, b) => sc[b] - sc[a]);
  return `<div class="verdict pop"><div class="sec-h"><div><div class="eyebrow">Popularity index · you set the weights</div><h2>Who is most popular?</h2></div><button class="btn" id="popreset">Reset weights</button></div>
    <div class="podium">${order.map((id, i) => { const c = cand(id); return `<div class="pod p${i + 1}">${face(c, i === 0 ? 120 : 96)}<div class="pos">#${i + 1}</div><b>${c.name}</b><span class="party" style="--c:${c.c}">${c.party}</span><div class="score">${sc[id]}</div><div class="bar" style="--c:${c.c};width:100%"><div class="t"><i style="width:${sc[id]}%"></i></div></div></div>`; }).join('')}</div>
    <div class="grid g3">${POPSIG.map(([k, l, d, , sk]) => `<label class="slider"><span class="row" style="justify-content:space-between"><b>${l}</b><span class="n" id="w-${k}">${w[k]}%</span></span><input type="range" min="0" max="100" step="5" value="${w[k]}" data-w="${k}" aria-label="Weight for ${l}"><span class="muted small">${d} · ${src(sk)}</span></label>`).join('')}</div>
    <p class="muted small">Index = weighted average of each signal scaled to 0–100. Atiku has no published favourability score and Tinubu was not in the straw poll, so those gaps count as a neutral 50. When a scientific poll or our viewer poll by age is published, it gets added here. This measures popularity so far, not who will win.</p></div>`;
}
const TIERS = {1:['Frontrunner','5M+ votes in 2023, or measured in national polling'],2:['Contender','Sitting or former governor, a past national candidate, or the nominee of a party that won 1M+ votes in 2023'],3:['Long shot','No national track record yet']};

const STATS = [
  {id:'petrol',label:'Petrol price',a:['May 2023','₦185',185],b:['Nov 2026','₦1,335',1335],bad:'up',unit:'per litre',src:'fuel'},
  {id:'naira',label:'Naira per US$',a:['May 2023','₦461',461],b:['2026','₦1,350',1350],bad:'up',unit:'official rate',src:'fuel'},
  {id:'poverty',label:'People in poverty',a:['2023','56%',56],b:['2025','63%',63],bad:'up',unit:'World Bank',src:'poverty'},
  {id:'inflation',label:'Inflation',a:['May 2023','22.4%',22.41],b:['Sep 2026','14.6%',14.63],bad:'up',unit:'index rebased in 2025',src:'inflation'},
  {id:'power',label:'Electricity',a:['Promised','15,000 MW',15000],b:['Record peak','5,802 MW',5802],bad:'down',unit:'grid generation',src:'power25'},
  {id:'growth',label:'GDP growth',a:['Promised','12%',12],b:['Best quarter','4.43%',4.43],bad:'down',unit:'a year',src:'gdp'},
  {id:'reserves',label:'Foreign reserves',a:['May 2023','$35.1bn',35.1],b:['Sep 2026','$54.9bn',54.9],bad:'down',unit:'CBN',src:'reserves'},
  {id:'voters',label:'Registered voters',a:['2023','93.5M',93.5],b:['2027','110M',110],bad:'none',unit:'INEC',src:'voters'},
  {id:'youth',label:'Youth share of register',a:['2023','39.7%',39.65],b:['2027','29.8%',29.79],bad:'down',unit:'INEC',src:'n_youth'},
  {id:'turnout',label:'Turnout',a:['2019','34.8%',34.75],b:['2023','26.7%',26.71],bad:'down',unit:'of registered voters',src:'wiki23'}
];

/* ======================= COMMUNITY & GUIDE DATA ======================= */
Object.assign(S, {
  etrans:{t:'AFP via Yahoo News',u:'https://www.yahoo.com/news/articles/nigeria-launches-election-race-poll-122017720.html'},
  timetable:{t:'INEC revised timetable (Inquirer, Feb 2026)',u:'https://inquirer.ng/2026/02/27/nigeria-sets-new-2027-election-dates-as-inec-revises-timetable/'}
});
CONFIG.community = {
  // Paste links here to switch the buttons on: the TikTok/IG/X post where each week's debate happens,
  // a Google Form for arguments, and one for topic ideas.
  debatePost: '', argumentForm: '', topicForm: ''
};
const MOTIONS = [
  {id:'subsidy', tag:'Economy', title:'Bring back the fuel subsidy', ctx:'Atiku promises to restore a form of fuel subsidy. An SBM survey found 67.4% of respondents back restoring it. Petrol is about ₦1,335 a litre, up from ₦185 in May 2023.', srcs:['sbmSubsidy','atikuPitch','fuel'],
    yes:['Transport and food costs follow petrol prices; relief would reach almost every household.','Wages have not kept up: poverty rose from 56% to 63% after removal.'],
    no:['Past subsidies cost trillions and were plagued by fraud and smuggling.','The money saved can fund roads, health and education instead, if it is accounted for.']},
  {id:'police', tag:'Security', title:'Should the President sign the state police bill?', ctx:'28 state assemblies have approved the constitutional amendment, and the National Assembly says it will send the bill for assent.', srcs:['n_police'],
    yes:['Local police know their communities and can respond faster to kidnapping and banditry.','One federal force for 200+ million people is stretched too thin.'],
    no:['Governors could use their police against opponents and journalists.','Many states struggle to pay salaries; underfunded police can do more harm than good.']},
  {id:'economy', tag:'Economy', title:'Is the economy getting better?', ctx:'Growth hit 4.43% in Q2 2026 and inflation fell from 34.8% to 14.6%. Poverty is at 63% and food inflation is near 20%.', srcs:['gdp','inflation','poverty'],
    yes:['Growth is the strongest in years, reserves are up and oil theft is down.','Inflation has more than halved from its peak.'],
    no:['Slower price rises are not lower prices: food still costs far more than in 2023.','More Nigerians are poor now than before the reforms.']},
  {id:'restructure', tag:'Governance', title:'Should Nigeria restructure (more power to the states)?', ctx:'Atiku has made restructuring part of his pitch. Supporters want states to control more resources and decisions.', srcs:['atikuPitch'],
    yes:['States closest to people can plan for local needs better than Abuja.','Competition between states can spread what works.'],
    no:['Weaker states could be left behind without federal transfers.','Restructuring needs constitutional changes that take years.']},
  {id:'etrans', tag:'Elections', title:'Should electronic results upload be compulsory?', ctx:'Lawmakers amended the election law to require electronic transmission of results, with paper records allowed during network failures.', srcs:['etrans'],
    yes:['Uploading polling-unit results straight away makes tampering during collation harder.','Anyone can check their unit\'s result on IReV.'],
    no:['Network coverage is patchy; a paper fallback is needed so votes are not lost.','Technology can fail or be blamed for failures, as some argued in 2023.']},
  {id:'youth', tag:'Elections', title:'Experience or a new generation?', ctx:'Young people are now 29.8% of the register, down from 39.7% in 2023. The three frontrunners all held top offices before 2015.', srcs:['n_youth'],
    yes:['Running a country takes experience; there is no time to learn on the job.','Proven records let voters judge what candidates actually did.'],
    no:['The same generation has led for decades with mixed results.','New leaders bring new ideas and owe fewer old political debts.']}
];
const COMMUNITY_PICKS = []; // weekly best arguments from viewers: {motion:'subsidy', side:'yes'|'no', text:'…', by:'@handle'}
const TIMELINE = [
  ['23 Apr – 30 May 2026','Party primaries','Parties pick candidates under the Electoral Act 2026.','timetable'],
  ['19 Aug 2026','Presidential campaigns open','National Assembly campaigns open the same day. Governorship campaigns follow on 9 Sep.','timetable'],
  ['12 Sep 2026','Final list of candidates','INEC publishes 18 presidential tickets.','n_list'],
  ['December 2026','Voter register on display','Check that your name and polling unit are correct.','register'],
  ['10 Dec 2026','Party agents named','Parties submit the agents who will watch every polling unit.','inecTime'],
  ['14 Jan 2027','Campaigns end','Campaigning stops 24 hours before polls open.','timetable'],
  ['16 Jan 2027','Presidential & National Assembly elections','Polls open 8:00am. Bring your PVC.','inecTime'],
  ['6 Feb 2027','Governorship & State Assembly elections','Your second trip to the polling unit.','inecTime']
];
const GLOSSARY = [
  ['PVC','Permanent Voter Card. You cannot vote without it. Collect it from INEC before election day.'],
  ['Polling unit','The exact place you are registered to vote. Find it on INEC\'s voter portal and visit before the day.'],
  ['BVAS','Bimodal Voter Accreditation System: the device that checks your fingerprint or face before you vote.'],
  ['IReV','INEC Result Viewing portal. Polling-unit result sheets are uploaded here for anyone to check.'],
  ['Form EC8A','The result sheet filled in at each polling unit. Its photo is what appears on IReV.'],
  ['Collation','Adding up polling-unit results at ward, local government and state centres before the national total.'],
  ['Running mate','The vice-presidential candidate on the same ticket.'],
  ['Spread rule','To win outright, a candidate needs the most votes plus at least 25% in two-thirds of the states and the FCT.']
];

/* ======================= HELPERS ======================= */
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const src = k => S[k] ? `<a href="${S[k].u}" target="_blank" rel="noopener">${esc(S[k].t)}</a>` : '';
const toast = m => { const t = $('#toast'); t.textContent = m; t.classList.add('on'); clearTimeout(toast.h); toast.h = setTimeout(() => t.classList.remove('on'), 1800); };
const store = { get(k, d){ try { return JSON.parse(localStorage.getItem('nd.' + k)) ?? d; } catch { return d; } }, set(k, v){ try { localStorage.setItem('nd.' + k, JSON.stringify(v)); } catch {} } };
const ELECTION = new Date('2027-01-16T08:00:00+01:00');
const cand = id => C.find(c => c.id === id);
const face = (c, s) => `<div class="face" style="--c:${c.c};${s ? `--s:${s}px;` : ''}${c.photo ? `background-image:url('${c.photo}');color:transparent` : ''}" role="img" aria-label="${esc(c.name)}">${c.photo ? '' : c.ini}</div>`;
const copy = (text, ok) => navigator.clipboard.writeText(text).then(() => toast(ok || 'Copied'), () => toast('Copy blocked on this device'));
const clip = (img, outlet, alt) => img ? `<div class="clip"><img src="${img}" alt="${esc(alt || 'Article screenshot')}" loading="lazy"><span class="outlet">${esc(outlet || '')}</span></div>` : '';
const daysLeft = () => Math.max(0, Math.ceil((ELECTION - new Date()) / 864e5));

/* ======================= VIEWS ======================= */
const VIEWS = {
  home:{label:'Home', render(){
    const lead = NEWS.items[0];
    return `
    <div class="hero">
      <div style="display:grid;gap:18px">
        <div class="eyebrow">Nigeria decides · 16 January 2027</div>
        <h1>Know before<br>you <span class="mark">vote</span></h1>
        <p class="muted" style="font-size:18px">Independent, sourced facts on the race. Compare the candidates, test your knowledge, check the claims, follow the money.</p>
        <div class="row"><a class="btn pri" href="#play">Play Fact or Cap</a><a class="btn" href="#compare">Compare candidates</a><a class="btn" href="#match">Find your match</a></div>
      </div>
      <div style="display:grid;gap:16px">
        <div class="trio">${['atiku','tinubu','obi'].map(id => { const c = cand(id); return `<a class="p" href="#candidates">${face(c)}<span class="party" style="--c:${c.c}">${c.party}</span><span class="n">${c.name}</span></a>`; }).join('')}</div>
        <div class="card" style="gap:10px"><div class="eyebrow">Countdown to polling day</div>
          <div class="clock" id="clock"><div><b>–</b><span>Days</span></div><div><b>–</b><span>Hours</span></div><div><b>–</b><span>Mins</span></div><div><b>–</b><span>Secs</span></div></div>
          <div class="src">Polls open 8:00am WAT · ${src('inecTime')}</div></div>
      </div>
    </div>
    ${(() => { const sc = popScores(); const o = Object.keys(sc).sort((a, b) => sc[b] - sc[a]); return `<a class="card lift" href="#candidates" style="text-decoration:none;color:inherit"><div class="sec-h"><div><div class="eyebrow">Popularity index</div><h3>Who is most popular right now?</h3></div><span class="btn">Full ranking</span></div><div class="row" style="gap:18px">${o.map((id, i) => `<div class="row" style="gap:10px">${face(cand(id), 52)}<div><div class="muted small">#${i + 1}</div><b>${cand(id).name.split(' ')[1]}</b> <span style="font:400 22px var(--display);color:var(--accent)">${sc[id]}</span></div></div>`).join('')}</div></a>`; })()}
    <div class="grid g4">
      <div class="card stat lift"><div class="k">Registered voters</div><div class="v">110M</div><div class="src">${src('voters')}</div></div>
      <div class="card stat lift"><div class="k">2023 turnout</div><div class="v" style="color:var(--false)">26.7%</div><div class="src">${src('wiki23')}</div></div>
      <div class="card stat lift"><div class="k">In poverty (2025)</div><div class="v" style="color:var(--false)">63%</div><div class="src">${src('poverty')}</div></div>
      <div class="card stat lift"><div class="k">On the ballot</div><div class="v">18</div><div class="src">${src('n_list')}</div></div>
    </div>
    <div style="display:grid;gap:16px"><div class="sec-h"><div><div class="eyebrow">${esc(NEWS.edition)}</div><h2>This week</h2></div><a class="btn" href="#news">All the news</a></div>
      <div class="news-grid">${NEWS.items.slice(0, 6).map((n, i) => story(n, i === 0 ? 'lead' : '')).join('')}</div></div>
    <div style="display:grid;gap:16px"><div class="sec-h"><div><div class="eyebrow">Interactive</div><h2>Play &amp; compare</h2></div><a class="btn" href="#play">All games</a></div>${gameTiles()}</div>
    <div class="verdict"><div class="sec-h"><div><div class="eyebrow">The debate hall</div><h2>Pick a side</h2></div><a class="btn pri" href="#community">Join the debate</a></div><div class="grid g3">${MOTIONS.slice(0, 3).map(m => `<a class="card lift" href="#community" style="text-decoration:none;color:inherit"><span class="tag">${esc(m.tag)}</span><h3>${esc(m.title)}</h3><span class="muted small">See both sides →</span></a>`).join('')}</div></div>
    <div style="display:grid;gap:16px"><div class="sec-h"><div><div class="eyebrow">Claims vs evidence</div><h2>Latest fact-checks</h2></div><a class="btn" href="#facts">See all</a></div>
      <div class="grid g3">${FACTS.slice(0, 3).map(factCard).join('')}</div></div>`; }},

  news:{label:'News', render(){
    return `<div style="display:grid;gap:10px"><div class="eyebrow">Sunday edition · ${esc(NEWS.edition)}</div><h2>The week in the race</h2><p class="muted">${esc(NEWS.note)} Every story links to the original article. Claims made by politicians are labelled as claims.</p></div>
      <div class="chips" id="nf">${['All', ...new Set(NEWS.items.map(n => n.tag))].map(t => `<button class="chip" data-t="${t}" aria-pressed="${store.get('nf', 'All') === t}">${t}</button>`).join('')}</div>
      <div class="news-grid">${NEWS.items.filter(n => store.get('nf', 'All') === 'All' || n.tag === store.get('nf', 'All')).map((n, i) => story(n, i === 0 ? 'lead' : i < 3 ? '' : 'wide')).join('')}</div>
      <div class="card"><div class="eyebrow">Also this week</div><h3>Tinubu: "Poverty will go"</h3><p class="muted">The President set out his 2027 promises at the APC campaign launch in Kaduna. We will check them against his 2022 promises in a coming video.</p><div class="src">${src('tinubu27')}</div></div>`; },
    after(){ $('#nf').onclick = e => { const b = e.target.closest('[data-t]'); if (b) { store.set('nf', b.dataset.t); route(); } }; }},

  candidates:{label:'Candidates', render(){
    const myRank = store.get('rank', null);
    return `<div style="display:grid;gap:10px"><div class="eyebrow">All 18 tickets · ranked by popularity</div><h2>The scoreboard</h2>
      <p class="muted">Ranked by popularity: favourability, 2023 votes and polling. No scientific vote-intention poll has been published yet (${src('noPolls')}), so you decide how much each signal counts. Candidates with no popularity data are listed by standing. Tap anyone for their profile.</p></div>
      <div class="grid g3">${Object.entries(TIERS).map(([k, [n, d]]) => `<div class="card"><span class="tier t${k}" style="justify-self:start">${n}</span><div class="muted small">${d}</div></div>`).join('')}</div>
      ${popPanel()}
      <div class="card" style="padding:8px 12px"><div class="tw"><table class="sb"><thead><tr><th>#</th><th>Candidate</th><th>Popularity</th><th>Standing</th><th>2023 result</th><th>Favourability</th><th>Straw poll</th>${myRank ? '<th>Your rank</th>' : ''}</tr></thead><tbody>
      ${(() => { const sc = popScores(); return ranked().map((a, i) => { const s = SIGNALS[a.id] || {}; const yr = myRank ? myRank.indexOf(a.id) + 1 : 0; return `<tr class="cand" data-id="${a.id}" tabindex="0"><td class="rank">${i + 1}</td>
        <td><div class="who">${face(a, 42)}<div><b>${esc(a.name)}</b><div class="muted small"><span class="party" style="--c:${a.c}">${a.party}</span> with ${esc(a.mate)}</div></div></div></td>
        <td class="n">${sc[a.id] != null ? `<b style="font:400 24px/1 var(--display)">${sc[a.id]}</b>` : '<span class="muted small">No data yet</span>'}</td><td><span class="tier t${a.tier}">${TIERS[a.tier][0]}</span></td><td class="small">${esc(a.r23)}</td><td class="n small">${s.fav || '—'}</td><td class="n small">${s.straw || '—'}</td>${myRank ? `<td class="n">${yr ? '#' + yr : '—'}</td>` : ''}</tr>
        <tr class="prof" data-for="${a.id}" hidden><td></td><td colspan="${myRank ? 7 : 6}">${profile(a)}</td></tr>`; }).join(''); })()}
      </tbody></table></div></div>
      <div class="src">Favourability: SBM Intelligence net score, May 2026 (${src('sbm')}). Straw poll: self-selected online poll by an anti-Tinubu group (${src('tmg')}). Ballot: ${src('n_list')}.</div>
      <div class="verdict"><div class="eyebrow">Your turn</div><h3>Rank them yourself</h3><p class="muted">Drag the candidates into your own order. Your ranking shows up in this table and you can share it.</p><a class="btn pri" href="#play" data-game="rank" style="justify-self:start">Make my ranking</a></div>`; },
    after(){
      $('#app').oninput = e => { const r = e.target.closest('[data-w]'); if (r) $('#w-' + r.dataset.w).textContent = r.value + '%'; };
      $('#app').onchange = e => { const r = e.target.closest('[data-w]'); if (!r) return; const w = store.get('popw', POPW_DEFAULT); w[r.dataset.w] = +r.value; store.set('popw', w); const y = scrollY; route(); scrollTo(0, y); };
      $('#app').onclick = e => { if (e.target.id === 'popreset') { store.set('popw', POPW_DEFAULT); const y = scrollY; route(); scrollTo(0, y); return; } const g = e.target.closest('[data-game]'); if (g) { store.set('game', g.dataset.game); return; } const r = e.target.closest('tr.cand'); if (!r) return; const p = document.querySelector(`tr.prof[data-for="${r.dataset.id}"]`); p.hidden = !p.hidden; }; $('#app').onkeydown = e => { if (e.key === 'Enter' && e.target.matches('tr.cand')) e.target.click(); }; }},

  compare:{label:'Compare', render(){
    const [a, b] = store.get('pair', ['tinubu', 'obi']);
    const opt = sel => C.map(c => `<option value="${c.id}" ${c.id === sel ? 'selected' : ''}>${c.name} (${c.party})</option>`).join('');
    return `<div style="display:grid;gap:10px"><div class="eyebrow">Head to head · you are the judge</div><h2>Compare &amp; debate</h2>
      <p class="muted">Pick two. Read each round, then choose who won it. Every allegation comes with the candidate's own reply.</p></div>
      <div class="row" style="justify-content:center"><select id="ca" aria-label="First candidate">${opt(a)}</select><b class="muted">vs</b><select id="cb" aria-label="Second candidate">${opt(b)}</select></div>
      <div class="matchup" id="matchup"></div>
      <div id="rounds" style="display:grid;gap:14px"></div>
      <div class="verdict" id="verdict"></div>`; },
    after(){ const go = () => { store.set('pair', [$('#ca').value, $('#cb').value]); drawRounds(); }; $('#ca').onchange = go; $('#cb').onchange = go; drawRounds(); }},

  community:{label:'Community', render(){
    const side = store.get('sides', {}); const cm = CONFIG.community;
    const picks = COMMUNITY_PICKS;
    return `<div style="display:grid;gap:10px"><div class="eyebrow">The debate hall</div><h2>Pick a side. Make your case.</h2>
      <p class="muted">Big questions in the race, the facts behind them and the strongest argument on each side. Choose where you stand, then take it to the comments. The best arguments from viewers are featured here every Sunday.</p>
      <div class="row">${cm.debatePost ? `<a class="btn pri" href="${esc(cm.debatePost)}" target="_blank" rel="noopener">Join this week's debate</a>` : ''}${cm.argumentForm ? `<a class="btn" href="${esc(cm.argumentForm)}" target="_blank" rel="noopener">Submit an argument</a>` : ''}${cm.topicForm ? `<a class="btn" href="${esc(cm.topicForm)}" target="_blank" rel="noopener">Suggest a topic</a>` : ''}</div></div>
      <div class="chips" id="mf">${['All', ...new Set(MOTIONS.map(m => m.tag))].map(t => `<button class="chip" data-mt="${t}" aria-pressed="${store.get('mf', 'All') === t}">${t}</button>`).join('')}</div>
      <div class="grid g2">${MOTIONS.filter(m => store.get('mf', 'All') === 'All' || m.tag === store.get('mf', 'All')).map(m => motionCard(m, side[m.id])).join('')}</div>
      <div class="verdict"><div class="eyebrow">Your stance card</div>${Object.keys(side).length ? `<div class="grid g2" style="gap:8px">${MOTIONS.filter(m => side[m.id]).map(m => `<div class="row" style="justify-content:space-between"><span>${esc(m.title)}</span><span class="vd ${side[m.id] === 'yes' ? 'true' : side[m.id] === 'no' ? 'false' : 'mis'}">${side[m.id] === 'yes' ? 'For' : side[m.id] === 'no' ? 'Against' : 'Unsure'}</span></div>`).join('')}</div><button class="btn pri" id="sshare" style="justify-self:start">Copy my stances</button>` : '<p class="muted">Pick a side on any topic above and your stances collect here, ready to share.</p>'}</div>
      <div class="card"><div class="eyebrow">Featured from the community</div>${picks.length ? picks.map(p => `<div class="why"><b>${esc(MOTIONS.find(m => m.id === p.motion)?.title || '')} · ${p.side === 'yes' ? 'For' : 'Against'}:</b> ${esc(p.text)} <span class="muted small">${esc(p.by || '')}</span></div>`).join('') : '<p class="muted">The best arguments from your comments will appear here, with both sides represented, starting this Sunday.</p>'}</div>
      <div class="card"><h3>House rules</h3><p class="muted">Argue the issue, not the person. No tribal or religious insults. Back claims with a source. Posts that share fakes or threats are removed.</p></div>`; },
    after(){ $('#app').onclick = e => {
      const t = e.target.closest('[data-mt]'); if (t) { store.set('mf', t.dataset.mt); route(); return; }
      const b = e.target.closest('[data-side]'); if (b) { const sd = store.get('sides', {}); sd[b.dataset.m] = sd[b.dataset.m] === b.dataset.side ? undefined : b.dataset.side; store.set('sides', sd); route(); return; }
      if (e.target.id === 'sshare') { const sd = store.get('sides', {}); copy(MOTIONS.filter(m => sd[m.id]).map(m => `${m.title}: ${sd[m.id] === 'yes' ? 'FOR' : sd[m.id] === 'no' ? 'AGAINST' : 'UNSURE'}`).join('\n') + `\nWhere do you stand? ${CONFIG.handle}`, 'Stances copied'); }
    }; }},

  guide:{label:'Guide', render(){
    const next = TIMELINE.find(t => !/2026/.test(t[0]) || t[0].startsWith('December') || t[0].startsWith('10 Dec')) ;
    return `<div style="display:grid;gap:10px"><div class="eyebrow">Everything you need for 16 January</div><h2>The election guide</h2><p class="muted">Key dates, how voting works, and the words you will hear on election day.</p></div>
      <div class="card"><h3>Key dates</h3><ol class="timeline">${TIMELINE.map(([d, h, x, s]) => `<li class="${/2027/.test(d) ? 'up' : ''}"><div class="d">${esc(d)}</div><div><b>${esc(h)}</b><div class="muted small">${esc(x)} <span class="src">${src(s)}</span></div></div></li>`).join('')}</ol></div>
      <div class="grid g2">
        <div class="card"><h3>How to vote, step by step</h3><ol class="steps">${['Collect your PVC from INEC before election day.','Check your name and polling unit when the register is displayed in December.','Go early on 16 January. Polls open at 8:00am.','Get accredited: BVAS checks your fingerprint or face.','Vote in secret, fold your ballot and drop it in the box.','Stay calm and watch the count at your polling unit.','Check that your unit\'s result on IReV matches the sheet posted at the unit.'].map(x => `<li>${x}</li>`).join('')}</ol><div class="src">${src('inecTime')}</div></div>
        <div class="card"><h3>Where the votes are</h3><div class="bars">${[['Lagos',7.49],['Kano',6.57],['Kaduna',4.66]].map(([n, v]) => barRow({n:`${n} · ${v}M`, v: Math.round(v / 7.49 * 100), c:'var(--accent)'})).join('')}</div><p class="muted small">The three biggest of 110M registered voters. Young people are 29.8% of the register.</p><div class="src">${src('voters')} · ${src('n_youth')}</div></div>
      </div>
      <div class="card"><h3>Election words, explained</h3><dl class="gloss">${GLOSSARY.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl></div>`; }},
  play:{label:'Play', render(){
    const g = store.get('game', 'fact');
    return `<div style="display:grid;gap:10px"><div class="eyebrow">Learn by playing</div><h2>Play</h2><p class="muted">Three quick games built on verified facts. Share your score in the comments.</p></div>
      ${gameTiles(g)}<div id="game"></div>`; },
    after(){ $('#app').onclick = e => { const t = e.target.closest('[data-game]'); if (t) { e.preventDefault(); store.set('game', t.dataset.game); route(); } }; const g = store.get('game', 'fact'); ({fact: factOrCap, lab: statLab, rank: rankGame})[g](); }},

  facts:{label:'Facts', render(){
    const tab = store.get('facttab', 'checks'); const f = store.get('fcf', 'all');
    const tabs = `<div class="chips" id="ft">${[['checks','Fact-checks'],['promises','Promises vs reality'],['money','Where did the money go?']].map(([k, l]) => `<button class="chip" data-tab="${k}" aria-pressed="${tab === k}">${l}</button>`).join('')}</div>`;
    if (tab === 'promises') return `<div style="display:grid;gap:10px"><div class="eyebrow">2022 campaign → 2026 data</div><h2>Promise vs reality</h2></div>${tabs}
      <p class="muted">Some things did improve: inflation is down from its peak, reserves rose from $35.1bn to $54.9bn, oil theft is the lowest since 2009 and non-oil exports hit a record (${src('fch26')}).</p>
      <div class="grid g2">${PROMISES.map(p => `<div class="card lift">${clip(p.img, S[p.rs].t.split(',')[0].split(' via ').pop())}<div class="row" style="justify-content:space-between"><div class="eyebrow">${p.topic}</div><span class="vd ${p.v}">${p.label}</span></div>
        <div><div class="muted small">Promised</div><div class="claim" style="font-size:17px">${esc(p.promised)}</div></div><div><div class="muted small">Reality</div><b>${esc(p.reality)}</b></div><div class="src">${src(p.ps)}${p.ps !== p.rs ? ' · ' + src(p.rs) : ''}</div></div>`).join('')}</div>
      <div class="verdict"><h3>Scorecard: 0 of 5 big promises fully kept</h3><div class="muted small">Behind or not yet: 2 · Not delivered, worse or failed: 3.</div></div>`;
    if (tab === 'money') return `<div style="display:grid;gap:10px"><div class="eyebrow">Audits · court cases · spending</div><h2>Where did the money go?</h2></div>${tabs}
      <p class="muted">Only official reports, court records and verified facts. Everyone named is presumed innocent unless convicted by a court.</p>
      <div class="grid g2">${MONEY.map(m => `<div class="card lift">${clip(m.img, S[m.src].t.split(',')[0])}<span class="vd ${m.tag === 'Verified' ? 'true' : m.tag === 'In court' ? 'mis' : 'false'}" style="justify-self:start">${m.tag}</span><h3>${esc(m.t)}</h3><p class="muted">${esc(m.d)}</p><div class="src">${src(m.src)}</div></div>`).join('')}</div>`;
    return `<div style="display:grid;gap:10px"><div class="eyebrow">Claims vs evidence</div><h2>Fact-checks</h2><p class="muted">Verdicts from independent fact-checkers on claims by the presidency and viral posts. We include claims rated TRUE and fakes against every side.</p></div>${tabs}
      <div class="chips" id="fcf">${[['all','All'],['false','False'],['mis','Misleading / unproven'],['true','True']].map(([k, l]) => `<button class="chip" data-f="${k}" aria-pressed="${k === f}">${l}</button>`).join('')}</div>
      <div class="grid g2">${FACTS.filter(x => f === 'all' || x.v === f).map(factCard).join('')}</div>`; },
    after(){ $('#app').onclick = e => { const t = e.target.closest('[data-tab]'); if (t) { store.set('facttab', t.dataset.tab); route(); return; } const b = e.target.closest('[data-f]'); if (b) { store.set('fcf', b.dataset.f); route(); } }; }},

  polls:{label:'Polls', render(){
    const v = POLLS.viewer;
    return `<div style="display:grid;gap:10px"><div class="eyebrow">Who is ahead?</div><h2>What the polls really say</h2>
      <p class="muted">No scientific vote-intention poll for 2027 has been published (${src('noPolls')}). Here is what exists, with its limits stated plainly.</p></div>
      <div class="grid g2">
        <div class="card"><h3>Favourability</h3><p class="muted small">SBM Intelligence net score, May 2026, about 829 respondents. A mood snapshot, not a forecast. Atiku's score was not reported.</p>
          ${POLLS.sbm.map(r => { const c = C.find(x => r.n.includes(x.name.split(' ')[1])); return `<div class="diverge"><div class="row" style="gap:8px">${c ? face(c, 30) : ''}<div class="small"><b>${r.n.split(' ')[1]}</b><div style="color:${r.c};font-variant-numeric:tabular-nums">${r.v > 0 ? '+' : ''}${r.v}</div></div></div><div class="axis"><i style="background:${r.c};${r.v >= 0 ? `left:50%;width:${r.v / 2}%` : `right:50%;width:${-r.v / 2}%`}"></i></div></div>`; }).join('')}
          <div class="diverge"><span></span><div class="row small muted" style="justify-content:space-between"><span>−100</span><span>0</span><span>+100</span></div></div>
          <div class="src">${src('sbm')}</div></div>
        <div class="card"><h3>Mood of the country</h3><div class="grid g2" style="gap:12px">
          <div class="stat"><div class="v" style="color:var(--false)">~80%</div><div class="muted small">say Nigeria is heading the wrong way</div><div class="src">${src('sbmWrong')}</div></div>
          <div class="stat"><div class="v">67.4%</div><div class="muted small">back restoring the petrol subsidy</div><div class="src">${src('sbmSubsidy')}</div></div></div></div>
        <div class="card"><h3>Online straw poll</h3><p class="muted small">"Tinubu Must Go" movement, 24–25 Sep 2026, 109,799 self-selected respondents. Run by an anti-Tinubu group; not representative.</p><div class="bars">${POLLS.tmg.map(barRow).join('')}</div><div class="src">${src('tmg')}</div></div>
        <div class="card"><h3>The last real result: 2023</h3><p class="muted small">Share of votes cast. Turnout 26.7%.</p><div class="bars">${POLLS.r23.map(barRow).join('')}</div><div class="src">${src('wiki23')}</div></div>
      </div>
      <div class="verdict"><h3>Viewer poll by age</h3><p class="muted">Our weekly poll of viewers, by age group. It is unscientific: it shows only who answered.</p>
        ${CONFIG.pollFormUrl ? `<a class="btn pri" style="justify-self:start" href="${esc(CONFIG.pollFormUrl)}" target="_blank" rel="noopener">Vote in this week's poll</a>` : `<div class="muted small">Voting opens soon. Results by age (18–24, 25–34, 35–44, 45–54, 55+) are published every Sunday.</div>`}
        ${v ? viewerTable(v) : ''}</div>`; }},

  match:{label:'Match me', render(){
    const ans = store.get('match', {});
    return `<div style="display:grid;gap:10px"><div class="eyebrow">Candidate match</div><h2>Who matches your views?</h2>
      <p class="muted">Six questions based on the candidates' stated 2027 pitches. Where a candidate hasn't taken a clear public position, the answer counts for nobody. A guide, not advice.</p></div>
      <div style="display:grid;gap:12px">${MATCH.map((m, i) => `<div class="q"><b>${i + 1}. ${esc(m.q)}</b><div class="opts">${m.o.map(([l], j) => `<button data-q="${i}" data-o="${j}" aria-pressed="${ans[i] === j}">${esc(l)}</button>`).join('')}</div></div>`).join('')}</div>
      <div class="verdict" id="mres"></div>`; },
    after(){ drawMatch(); $('#app').onclick = e => { const b = e.target.closest('[data-q]'); if (!b) return; const a = store.get('match', {}); a[b.dataset.q] = +b.dataset.o; store.set('match', a); b.parentElement.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === b)); drawMatch(); }; }},

  ask:{label:'Ask', render(){
    return `<div style="display:grid;gap:10px"><div class="eyebrow">Ask anything about the race</div><h2>Ask a question</h2><p class="muted">Answers come from the verified facts on this site, with the source. If we don't have it, we say so.</p></div>
      <form class="askbox" id="askf"><label class="muted small" for="q" style="flex-basis:100%">Your question</label><input id="q" placeholder="e.g. Who won in 2023?" autocomplete="off"><button class="btn pri" type="submit">Ask</button></form>
      <div class="sugs">${['When is the election?','Who is likely to win?','Did Tinubu deliver 15,000 MW?','What is Peter Obi promising?','Was the $30 billion claim true?','How do I make my vote count?'].map(s => `<button data-s="${esc(s)}">${esc(s)}</button>`).join('')}</div>
      <div id="answers" style="display:grid;gap:12px"></div>`; },
    after(){ $('#askf').onsubmit = e => { e.preventDefault(); ask($('#q').value); }; $('.sugs').onclick = e => { const b = e.target.closest('[data-s]'); if (b) { $('#q').value = b.dataset.s; ask(b.dataset.s); } }; }}
};

/* ======================= PIECES ======================= */
function motionCard(m, mine){ return `<article class="card motion lift"><div class="row" style="justify-content:space-between"><span class="tag">${esc(m.tag)}</span>${mine ? `<span class="vd ${mine === 'yes' ? 'true' : mine === 'no' ? 'false' : 'mis'}">You: ${mine === 'yes' ? 'For' : mine === 'no' ? 'Against' : 'Unsure'}</span>` : ''}</div><h3>${esc(m.title)}</h3><p class="muted">${esc(m.ctx)}</p><div class="src">${m.srcs.map(src).join(' · ')}</div>
  <div class="sides"><div class="for"><div class="eyebrow">For</div>${m.yes.map(x => `<p>${esc(x)}</p>`).join('')}</div><div class="against"><div class="eyebrow">Against</div>${m.no.map(x => `<p>${esc(x)}</p>`).join('')}</div></div>
  <div class="pick">${[['yes','I\'m for it'],['no','I\'m against'],['unsure','Not sure']].map(([k, l]) => `<button data-m="${m.id}" data-side="${k}" aria-pressed="${mine === k}">${l}</button>`).join('')}</div></article>`; }
function story(n, cls){ return `<article class="story lift ${cls}">${clip(n.img, n.outlet, n.h)}<div class="row"><span class="tag ${n.tag === 'Allegation' ? 'alleg' : ''}">${esc(n.tag)}</span></div><h3>${esc(n.h)}</h3><p class="muted">${esc(n.d)}</p>${n.why ? `<div class="why"><b>Why it matters:</b> ${esc(n.why)}</div>` : ''}<div class="row" style="justify-content:space-between"><span class="src">${src(n.src)}</span>${n.cta ? `<a class="btn" href="${n.cta[0]}" ${n.cta[0] === '#play' ? 'data-game="fact"' : ''}>${esc(n.cta[1])}</a>` : ''}</div></article>`; }
function factCard(x){ return `<div class="card lift">${x.img ? clip(x.img, S[x.src].t.split(',')[0]) : ''}<div class="row" style="justify-content:space-between"><span class="meta">${esc(x.who)} · ${esc(x.when)}</span><span class="vd ${x.v}">${x.label}</span></div><div class="claim">${esc(x.claim)}</div><p class="muted">${esc(x.why)}</p><div class="src">${src(x.src)}</div></div>`; }
function barRow(r){ return `<div class="bar" style="--c:${r.c}"><div class="l"><span>${esc(r.n)}</span><span style="font-variant-numeric:tabular-nums">${r.v}%</span></div><div class="t"><i style="width:${r.v}%"></i></div></div>`; }
function viewerTable(v){ const cols = ['tinubu','atiku','obi','other']; return `<div class="tw"><table><thead><tr><th>Age</th>${cols.map(c => `<th>${c === 'other' ? 'Other' : cand(c).name}</th>`).join('')}<th>Votes</th></tr></thead><tbody>${Object.entries(v.ages).map(([age, r]) => { const t = cols.reduce((a, c) => a + (r[c] || 0), 0) || 1; return `<tr><td>${age}</td>${cols.map(c => `<td class="n">${Math.round((r[c] || 0) / t * 100)}%</td>`).join('')}<td class="n">${t}</td></tr>`; }).join('')}</tbody></table></div><div class="src">Updated ${esc(v.updated)} · ${v.total} responses · unscientific</div>`; }
function gameTiles(active){ return `<div class="games">${[
  ['fact','Fact or Cap?','Swipe real claims about the race. Can you spot the cap?', FACTS.length + ' claims'],
  ['lab','Stat Lab','Drag stats onto the board to compare then vs now.', STATS.length + ' stats'],
  ['rank','Rank them','Drag all 18 candidates into your order and share it.', '18 tickets']].map(([k, t, d, n]) => `<a class="game-tile lift" href="#play" data-game="${k}" ${active === k ? 'style="border-color:var(--accent)"' : ''}><span class="eyebrow">${n}</span><h3 style="font-size:30px">${t}</h3><p class="muted">${d}</p><span class="btn ${active === k ? 'pri' : ''}" style="justify-self:start">${active === k ? 'Playing' : 'Play'}</span></a>`).join('')}</div>`; }
function profile(a){
  const c = C.find(x => x.id === a.id);
  if (!c) return `<div class="row" style="padding:6px 0;align-items:flex-start;flex-wrap:nowrap">${a.photo ? face(a, 96) : ''}<div style="display:grid;gap:6px;min-width:0"><div class="muted small">Running mate: ${esc(a.mate)}</div><div>${a.note ? esc(a.note) : 'Little public record yet. Ask the campaign for its plan, its team and how it would pay for it.'}</div><div class="src">${src(a.src)}</div></div></div>`;
  return `<div class="grid g2" style="padding:6px 0"><div style="display:grid;gap:10px"><div><div class="muted small">Experience</div>${esc(c.exp)}</div><div><div class="muted small">2027 pitch</div>${esc(c.pitch)} <span class="src">${src(c.pitchSrc)}</span></div><div><div class="muted small">On the record</div>${esc(c.record)}<div class="muted small">${esc(c.reply)}</div></div><div><div class="muted small">The question to ask</div><b>${esc(c.question)}</b></div><a class="btn" href="#compare" style="justify-self:start">Compare ${esc(c.name.split(' ')[1])}</a></div>${clip(c.img, S[c.recSrc].t.split(' (')[0].split(',')[0])}</div>`;
}

function drawRounds(){
  const a = cand($('#ca').value), b = cand($('#cb').value);
  $('#matchup').innerHTML = `${face(a)}<span class="vsx">VS</span>${face(b)}`;
  const picks = store.get('picks', {}); const key = [a.id, b.id].sort().join('-'); const mine = picks[key] || {};
  $('#rounds').innerHTML = a.id === b.id ? `<div class="card muted">Pick two different candidates.</div>` : ROUNDS.map(([k, l], i) => `
    <div class="round"><div class="sec-h"><h3>Round ${i + 1} · ${l}</h3>
      <div class="pick" data-r="${k}">${[a, b].map(c => `<button data-w="${c.id}" aria-pressed="${mine[k] === c.id}">${c.name.split(' ')[1]} wins</button>`).join('')}<button data-w="tie" aria-pressed="${mine[k] === 'tie'}">Tie</button></div></div>
      <div class="vs">${[a, b].map(c => `<div class="side" style="--c:${c.c}"><div class="who">${face(c, 34)}${c.name} · ${c.party}</div><div>${esc(c[k])}</div>${k === 'record' ? `<div class="muted small">${esc(c.reply)}</div><div class="src">${src(c.recSrc)}</div>` : k === 'pitch' ? `<div class="src">${src(c.pitchSrc)}</div>` : ''}</div>`).join('')}</div></div>`).join('');
  $('#rounds').onclick = e => { const btn = e.target.closest('[data-w]'); if (!btn) return; const r = btn.parentElement.dataset.r; const p = store.get('picks', {}); p[key] = p[key] || {}; p[key][r] = p[key][r] === btn.dataset.w ? undefined : btn.dataset.w; store.set('picks', p); drawRounds(); };
  const score = {[a.id]:0, [b.id]:0}; let n = 0; Object.values(mine).forEach(w => { if (!w) return; n++; if (score[w] !== undefined) score[w]++; });
  const lead = score[a.id] === score[b.id] ? null : (score[a.id] > score[b.id] ? a : b);
  const text = `My Naija Decides debate: ${a.name} ${score[a.id]} – ${score[b.id]} ${b.name}${lead ? `. ${lead.name} wins it for me.` : '.'} Judge for yourself: ${CONFIG.handle}`;
  $('#verdict').innerHTML = a.id === b.id ? '' : `<div class="eyebrow">Your verdict · ${n} of ${ROUNDS.length} rounds judged</div><h2>${a.name.split(' ')[1]} ${score[a.id]} – ${score[b.id]} ${b.name.split(' ')[1]}</h2>
    <p class="muted">${n === 0 ? 'Judge the rounds above to see your result.' : lead ? `${lead.name} won more of your rounds. Your picks stay on this device.` : 'Level so far. Your picks stay on this device.'}</p>${n ? `<button class="btn pri" id="sharev" style="justify-self:start">Copy my verdict</button>` : ''}`;
  const s = $('#sharev'); if (s) s.onclick = () => copy(text, 'Verdict copied. Paste it in the comments');
}
function drawMatch(){
  const ans = store.get('match', {}); const tot = {tinubu:0, atiku:0, obi:0}; let max = 0, n = 0;
  MATCH.forEach((m, i) => { const best = Math.max(...m.o.map(([, w]) => Math.max(0, ...Object.values(w)))); if (ans[i] === undefined) return; n++; max += best; Object.entries(m.o[ans[i]][1]).forEach(([c, w]) => tot[c] += w); });
  const rows = C.map(c => ({n:`${c.name} (${c.party})`, v: max ? Math.round(tot[c.id] / max * 100) : 0, c:c.c, id:c.id})).sort((x, y) => y.v - x.v);
  $('#mres').innerHTML = n ? `<div class="eyebrow">Your match · ${n} of ${MATCH.length} answered</div><div class="row">${face(cand(rows[0].id), 64)}<div><div class="muted small">Closest match</div><h3>${rows[0].n}</h3></div></div><div class="bars">${rows.map(barRow).join('')}</div>
    <p class="muted small">Based on stated pitches: ${C.map(c => src(c.pitchSrc)).join(' · ')}. Read the full records before you decide.</p><div class="row"><button class="btn pri" id="mshare">Copy my result</button><button class="btn" id="mreset">Start again</button></div>`
    : `<div class="eyebrow">Your match</div><p class="muted">Answer the questions above to see how closely each candidate's pitch matches your views.</p>`;
  const sh = $('#mshare'); if (sh) sh.onclick = () => copy(`My Naija Decides match: ${rows.map(r => `${r.n.split(' (')[0]} ${r.v}%`).join(', ')}. Find yours: ${CONFIG.handle}`, 'Result copied');
  const rs = $('#mreset'); if (rs) rs.onclick = () => { store.set('match', {}); route(); };
}

/* ---------- Game 1: Fact or Cap ---------- */
function factOrCap(){
  const st = store.get('foc', {i:0, right:0, played:0, best:0, streak:0});
  const order = FACTS.map((_, i) => i);
  const g = $('#game');
  const draw = () => {
    if (st.i >= order.length) { g.innerHTML = `<div class="verdict" style="text-align:center;justify-items:center"><div class="eyebrow">Round complete</div><h2>${st.right} / ${st.played}</h2><p class="muted">${st.right === st.played ? 'Perfect. You can smell cap from a mile away.' : 'Now you know. Share this before the fakes reach your family group chat.'}</p><div class="row"><button class="btn pri" id="fshare">Copy my score</button><button class="btn" id="fagain">Play again</button></div></div>`;
      $('#fshare').onclick = () => copy(`I scored ${st.right}/${st.played} on Naija Decides "Fact or Cap?". Can you beat me? ${CONFIG.handle}`, 'Score copied'); $('#fagain').onclick = () => { Object.assign(st, {i:0, right:0, played:0, streak:0}); store.set('foc', st); draw(); }; return; }
    const f = FACTS[order[st.i]];
    g.innerHTML = `<div class="score"><span>Card <b>${st.i + 1}</b>/${order.length}</span><span>Score <b>${st.right}</b></span><span>Streak <b>${st.streak}</b></span></div>
      <div class="deck"><div class="fc" id="card"><span class="lab yes">Fact</span><span class="lab no">Cap</span><div class="meta">${esc(f.who)} · ${esc(f.when)}</div><div class="claim">${esc(f.claim)}</div><div class="meta">Swipe right for Fact, left for Cap. Or use the buttons.</div></div></div>
      <div class="fc-actions"><button class="cap" id="bcap">🧢 Cap</button><button class="fact" id="bfact">✅ Fact</button></div><div id="rev"></div>`;
    const card = $('#card'); let x0 = null, dx = 0;
    card.onpointerdown = e => { x0 = e.clientX; card.setPointerCapture(e.pointerId); card.style.transition = 'none'; };
    card.onpointermove = e => { if (x0 === null) return; dx = e.clientX - x0; card.style.transform = `translateX(${dx}px) rotate(${dx / 18}deg)`; card.querySelector('.yes').style.opacity = Math.max(0, dx / 120); card.querySelector('.no').style.opacity = Math.max(0, -dx / 120); };
    card.onpointerup = () => { if (x0 === null) return; x0 = null; card.style.transition = 'transform .25s'; if (Math.abs(dx) > 110) answer(dx > 0); else { card.style.transform = ''; card.querySelectorAll('.lab').forEach(l => l.style.opacity = 0); } dx = 0; };
    $('#bfact').onclick = () => answer(true); $('#bcap').onclick = () => answer(false);
    function answer(saysFact){
      const isFact = f.v === 'true'; const ok = saysFact === isFact;
      st.played++; if (ok) { st.right++; st.streak++; } else st.streak = 0; st.best = Math.max(st.best, st.streak);
      card.style.transform = `translateX(${saysFact ? 600 : -600}px) rotate(${saysFact ? 20 : -20}deg)`; card.style.opacity = 0;
      document.querySelector('.fc-actions').remove();
      $('#rev').innerHTML = `<div class="reveal"><div class="row" style="justify-content:space-between"><h3 style="color:${ok ? 'var(--true)' : 'var(--false)'}">${ok ? 'Correct!' : 'Not quite'}</h3><span class="vd ${f.v}">${f.label}</span></div><div class="claim" style="font-size:16px">${esc(f.claim)}</div><p>${esc(f.why)}</p>${f.img ? clip(f.img, S[f.src].t.split(',')[0]) : ''}<div class="src">${src(f.src)}</div><button class="btn pri" id="fnext" style="justify-self:start">Next claim</button></div>`;
      st.i++; store.set('foc', st);
      $('#fnext').onclick = draw; $('#fnext').focus();
    }
  };
  draw();
}

/* ---------- Game 2: Stat Lab (drag and drop) ---------- */
function statLab(){
  const g = $('#game'); let onBoard = store.get('lab', ['petrol', 'poverty']);
  const draw = () => {
    g.innerHTML = `<div class="card" style="gap:14px"><div class="eyebrow">Drag a stat onto the board, or tap it</div><div class="tray" id="tray">${STATS.map(s => `<span class="statchip" data-stat="${s.id}" role="button" tabindex="0" aria-disabled="${onBoard.includes(s.id)}">${esc(s.label)}</span>`).join('')}</div></div>
      <div class="board" id="board" aria-label="Comparison board">${onBoard.length ? onBoard.map(statRow).join('') : '<div class="muted" style="text-align:center;padding:40px 0">Drop stats here to compare then vs now.</div>'}</div>
      ${onBoard.length ? `<div class="row"><button class="btn pri" id="lshare">Copy these stats</button><button class="btn" id="lclear">Clear board</button></div>` : ''}`;
    requestAnimationFrame(() => g.querySelectorAll('.bar .t i[data-w]').forEach(i => i.style.width = i.dataset.w + '%'));
    const add = id => { if (!onBoard.includes(id)) { onBoard.unshift(id); store.set('lab', onBoard); draw(); } };
    g.querySelectorAll('.statchip').forEach(chip => {
      chip.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); add(chip.dataset.stat); } };
      chip.onpointerdown = e => {
        if (chip.getAttribute('aria-disabled') === 'true') return;
        const sx = e.clientX, sy = e.clientY; let ghost = null; const board = $('#board');
        const move = ev => { if (!ghost && Math.hypot(ev.clientX - sx, ev.clientY - sy) > 6) { ghost = chip.cloneNode(true); ghost.classList.add('ghost'); document.body.appendChild(ghost); }
          if (ghost) { ghost.style.left = ev.clientX + 'px'; ghost.style.top = ev.clientY + 'px'; const r = board.getBoundingClientRect(); board.classList.toggle('over', ev.clientX > r.left && ev.clientX < r.right && ev.clientY > r.top && ev.clientY < r.bottom); } };
        const up = ev => { removeEventListener('pointermove', move); removeEventListener('pointerup', up);
          if (!ghost) { add(chip.dataset.stat); return; } ghost.remove(); const over = board.classList.contains('over'); board.classList.remove('over'); if (over) add(chip.dataset.stat); };
        addEventListener('pointermove', move); addEventListener('pointerup', up);
      };
    });
    g.querySelectorAll('[data-rm]').forEach(b => b.onclick = () => { onBoard = onBoard.filter(x => x !== b.dataset.rm); store.set('lab', onBoard); draw(); });
    const sh = $('#lshare'); if (sh) sh.onclick = () => copy(onBoard.map(id => { const s = STATS.find(x => x.id === id); return `${s.label}: ${s.a[1]} (${s.a[0]}) → ${s.b[1]} (${s.b[0]})`; }).join('\n') + `\nSources on Naija Decides ${CONFIG.handle}`, 'Stats copied');
    const cl = $('#lclear'); if (cl) cl.onclick = () => { onBoard = []; store.set('lab', onBoard); draw(); };
  };
  draw();
}
function statRow(id){
  const s = STATS.find(x => x.id === id); const max = Math.max(s.a[2], s.b[2]);
  const worse = s.bad === 'none' ? null : (s.bad === 'up' ? s.b[2] > s.a[2] : s.b[2] < s.a[2]);
  const col = worse === null ? 'var(--accent)' : worse ? 'var(--false)' : 'var(--true)';
  const ch = s.a[2] ? Math.round((s.b[2] - s.a[2]) / s.a[2] * 100) : 0;
  return `<div class="statrow"><div class="sec-h"><h3>${esc(s.label)}</h3><button class="btn" data-rm="${s.id}" aria-label="Remove ${esc(s.label)}">Remove</button></div>
    <div class="nums"><div><div class="muted small">${esc(s.a[0])}</div><div class="num">${esc(s.a[1])}</div></div><div class="arrow">→</div><div><div class="muted small">${esc(s.b[0])}</div><div class="num" style="color:${col}">${esc(s.b[1])}</div></div></div>
    <div class="bars"><div class="bar" style="--c:rgba(255,255,255,.35)"><div class="t"><i data-w="${s.a[2] / max * 100}" style="width:0"></i></div></div><div class="bar" style="--c:${col}"><div class="t"><i data-w="${s.b[2] / max * 100}" style="width:0"></i></div></div></div>
    <div class="row" style="justify-content:space-between"><span class="small" style="color:${col};font-weight:800">${ch > 0 ? '+' : ''}${ch}% · ${worse === null ? 'change' : worse ? 'worse' : 'better'}</span><span class="src">${esc(s.unit)} · ${src(s.src)}</span></div></div>`;
}

/* ---------- Game 3: Rank them (drag to reorder) ---------- */
function rankGame(){
  const g = $('#game'); let order = store.get('rank', null) || ALL.map(a => a.id);
  const byId = id => ALL.find(a => a.id === id);
  const draw = () => {
    g.innerHTML = `<div class="sec-h"><p class="muted">Drag the handle (or use the arrows) to put all 18 in your order. Your ranking appears on the Candidates scoreboard.</p><div class="row"><button class="btn pri" id="rshare">Copy my top 5</button><button class="btn" id="rreset">Reset</button></div></div>
      <ol class="ranklist" id="rl">${order.map((id, i) => { const a = byId(id); return `<li data-id="${id}"><span class="rank">${i + 1}</span>${face(a, 38)}<div style="min-width:0"><b>${esc(a.name)}</b><div class="muted small"><span class="party" style="--c:${a.c}">${a.party}</span> <span class="tier t${a.tier}">${TIERS[a.tier][0]}</span></div></div><div class="mv"><button data-up="${i}" aria-label="Move ${esc(a.name)} up">↑</button><button data-dn="${i}" aria-label="Move ${esc(a.name)} down">↓</button><span class="handle" aria-hidden="true">⠿</span></div></li>`; }).join('')}</ol>`;
    const save = () => { store.set('rank', order); draw(); };
    $('#rl').onclick = e => { const u = e.target.closest('[data-up]'), d = e.target.closest('[data-dn]'); if (u && +u.dataset.up > 0) { const i = +u.dataset.up; [order[i - 1], order[i]] = [order[i], order[i - 1]]; save(); } if (d && +d.dataset.dn < order.length - 1) { const i = +d.dataset.dn; [order[i + 1], order[i]] = [order[i], order[i + 1]]; save(); } };
    g.querySelectorAll('.handle').forEach(h => h.onpointerdown = e => {
      e.preventDefault(); const li = h.closest('li'); li.classList.add('dragging'); const list = $('#rl');
      const move = ev => { const over = document.elementFromPoint(ev.clientX, ev.clientY)?.closest('#rl li'); if (!over || over === li) return; const r = over.getBoundingClientRect(); list.insertBefore(li, ev.clientY < r.top + r.height / 2 ? over : over.nextSibling); };
      const up = () => { removeEventListener('pointermove', move); removeEventListener('pointerup', up); order = [...list.children].map(x => x.dataset.id); save(); };
      addEventListener('pointermove', move); addEventListener('pointerup', up);
    });
    $('#rshare').onclick = () => copy(`My Naija Decides top 5: ${order.slice(0, 5).map((id, i) => `${i + 1}. ${byId(id).name}`).join('  ')}. Make yours: ${CONFIG.handle}`, 'Top 5 copied');
    $('#rreset').onclick = () => { order = ALL.map(a => a.id); store.set('rank', null); draw(); };
  };
  draw();
}

/* ---------- Ask ---------- */
const STOP = new Set('the a an is are was were of to in on for and or what who how when did does do i me my about with be this that it at by from will can much many there'.split(' '));
const toks = s => s.toLowerCase().replace(/[^a-z0-9₦$%. ]/g, ' ').split(/\s+/).filter(w => w && !STOP.has(w)).map(w => w.replace(/s$/, ''));
function search(q){ const qt = toks(q); return KB.map(([qq, a, s]) => { const kt = new Set(toks(qq + ' ' + a)); const hit = qt.filter(t => kt.has(t)).length; const qhit = qt.filter(t => toks(qq).includes(t)).length; return {qq, a, s, score: hit + qhit * 1.5}; }).filter(r => r.score > 0).sort((x, y) => y.score - x.score); }
let sampleP = null;
async function ask(q){
  q = (q || '').trim(); if (!q) return;
  const box = document.createElement('div'); box.className = 'answer'; $('#answers').prepend(box);
  const head = `<b>${esc(q)}</b>`;
  sampleP = sampleP || (window.claude ? window.claude.use('sample').catch(() => null) : Promise.resolve(null));
  const sample = await sampleP;
  if (sample) {
    box.innerHTML = head + '<div class="muted">Thinking…</div>';
    const facts = KB.map(([qq, a, s]) => `- ${qq} ${a} (Source: ${S[s].t}, ${S[s].u})`).join('\n') + '\n' + NEWS.items.map(n => `- News (${NEWS.edition}): ${n.h}. ${n.d} (Source: ${S[n.src].t}, ${S[n.src].u})`).join('\n') + '\n- The 18 presidential tickets: ' + ALL.map(a => `${a.name}/${a.mate} (${a.party})`).join('; ');
    const prompt = `You answer questions for "Naija Decides", a neutral civic site about Nigeria's 16 January 2027 presidential election. Use ONLY the verified facts below. Be even-handed between candidates, never tell people who to vote for, say "alleged" for anything not decided by a court, and if the facts don't cover the question, say you don't have verified information on that yet. Answer in 2-4 short sentences in plain English, then a line "Source:" with the source name and link.\n\nVERIFIED FACTS (as of 4 Nov 2026):\n${facts}\n\nQUESTION: ${q}`;
    try { const out = await sample(prompt, { modelTier: 'quick', onText: ({text}) => { box.innerHTML = head + `<div>${esc(text)}</div>`; } }); box.innerHTML = head + `<div>${esc(out.text)}</div><div class="src">AI answer from this site's verified facts.</div>`; return; } catch (e) {}
  }
  const hits = search(q);
  if (!hits.length) { box.innerHTML = head + `<div>We don't have verified information on that yet. Try a suggested question, or ask us on TikTok, Instagram or X and we may cover it in a video.</div>`; return; }
  const [top, ...more] = hits;
  box.innerHTML = head + `<div>${esc(top.a)}</div><div class="src">Source: ${src(top.s)}</div>` + (more.length ? `<div class="muted small" style="white-space:normal">Related: ${more.slice(0, 3).map(r => `<a href="#ask" data-rel="${esc(r.qq)}">${esc(r.qq)}</a>`).join(' · ')}</div>` : '');
  box.onclick = e => { const r = e.target.closest('[data-rel]'); if (r) { e.preventDefault(); $('#q').value = r.dataset.rel; ask(r.dataset.rel); } };
}

/* ======================= ROUTER ======================= */
const ORDER = ['home','news','candidates','compare','community','play','facts','guide','polls','match','ask'];
$('#tabs').innerHTML = ORDER.map(k => `<a href="#${k}" data-k="${k}">${VIEWS[k].label}</a>`).join('');
const tick = [`${daysLeft()} days to the vote`, ...NEWS.items.map(n => n.h), 'Petrol: ₦185 → ₦1,335', 'Poverty: 56% → 63%', '18 tickets on the ballot', 'Play Fact or Cap'];
$('#ticker').innerHTML = [...tick, ...tick].map(t => `<span>${esc(t)}</span>`).join('');
$('#credits').textContent = CREDITS.join(' ');
document.addEventListener('click', e => { const g = e.target.closest('a[data-game]'); if (g) store.set('game', g.dataset.game); });
function route(){
  const k = VIEWS[location.hash.slice(1)] ? location.hash.slice(1) : 'home';
  document.querySelectorAll('#tabs a').forEach(a => a.setAttribute('aria-current', a.dataset.k === k ? 'page' : 'false'));
  $('#app').onclick = null; $('#app').onkeydown = null; $('#app').oninput = null; $('#app').onchange = null;
  $('#app').innerHTML = `<section class="view">${VIEWS[k].render()}</section>`;
  VIEWS[k].after && VIEWS[k].after();
  const t = document.querySelector(`#tabs a[data-k="${k}"]`); t && t.scrollIntoView({block:'nearest', inline:'center'});
  clock();
}
function clock(){ const el = $('#clock'); if (!el) return; let s = Math.max(0, (ELECTION - new Date()) / 1000); const b = el.querySelectorAll('b'); b[0].textContent = Math.floor(s / 86400); b[1].textContent = Math.floor(s % 86400 / 3600); b[2].textContent = Math.floor(s % 3600 / 60); b[3].textContent = Math.floor(s % 60); }
setInterval(clock, 1000);
addEventListener('hashchange', () => { route(); window.scrollTo(0, 0); });
route();
})();
