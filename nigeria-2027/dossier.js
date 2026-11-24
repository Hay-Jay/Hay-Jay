/* ======================= THE DOSSIER: one video per candidate (all 18) =======================
   Same structure for every candidate, so no one gets softer or harder treatment:
   who they are → the road here → what they have done → what they promise → the questions
   → on the campaign trail (or what voters should ask) → where they sit on the Naija Decides Rank.
   Facts come from site/src/bios.js (Premium Times profiles, Oct 2026, plus named outlets) and the
   sourced items in site/src/news.js. Questions are labelled as allegations, court matters or disputes.
   Narration is ElevenLabs (voice Olakunle, eleven_v4), generated per video and split into
   vo/<id>/NN.mp3 by tools/split-vo.mjs. Loaded after videos.js, so the generic promo is not appended:
   the rank card is the closing call to action. */
(function () {
  const PC = {APC:'#4aa3ff',ADC:'#ff9d3a',NDC:'#3dff9a',PDP:'#e8443a',LP:'#d9e021',SDP:'#ff7ac8',APM:'#9fd3ff',PRP:'#ff5050',AAC:'#ff3b3b',AA:'#c6a7ff',ADP:'#ffd27a',APP:'#7affd7',BP:'#d4b483',DLA:'#a0ffa0',NDP:'#ffa4a4',NRM:'#7ab6ff',YPP:'#ffcf3d',ZLP:'#b0b0ff'};
  // Naija Decides Rank, snapshot of 24 Nov 2026 (polls + 7-day news attention). [id, short name, party, previous position]
  const RANK_DATE = '24 Nov 2026';
  const RANK = [['obi','Obi','NDC',1],['atiku','Atiku','ADC',2],['tinubu','Tinubu','APC',3],['seyi-makinde','Makinde','APM',4],['omoyele-sowore','Sowore','AAC',6],
    ['adewole-adebayo','Adebayo','SDP',5],['donald-duke','Duke','PRP',7],['sandy-ojang-onor','Onor','PDP',10],['rufai-adekunle-omo-aje','Omo-Aje','AA',8],['peter-ada-agada','Agada','YPP',9],
    ['sunday-chibuzo-okereke','S. Okereke','LP',13],['sunday-adenuga','Adenuga','BP',11],['moses-olusoji-adebisi','Adebisi','DLA',12],['nkem-esther-okereke','N. Okereke','NRM',16],
    ['aliyu-abbas-bin','Abbas-Bin','ADP',14],['ada-elizabeth-fredrick-okwori','Okwori','NDP',15],['daniel-nwanyanwu','Nwanyanwu','ZLP',17],['kabiru-yusuf','K. Yusuf','APP',18]];

  const esc = s => String(s);
  const ini = n => n.split(' ').filter((w, i, a) => i === 0 || i === a.length - 1).map(w => w[0]).join('');

  function hero(d, c) {
    const face = d.photo
      ? `<div class="dz-photo a" data-a="zoom" style="background-image:url('${d.photo}');background-position:${d.pos || 'center 20%'}"></div><div class="dz-shade"></div>`
      : `<div class="dz-mono a" data-a="pop" data-t=".1" style="--c:${c}">${ini(d.name)}</div>`;
    return { dur: 5, cls: d.photo ? 'hero' : '', html: `
      ${face}
      <div class="kicker a" data-a="up" data-t=".2">The dossier · Meet the 18</div>
      <div class="a" data-a="up" data-t=".35"><span class="pill" style="background:${c};color:#021;border-color:transparent">${d.party}</span> <span class="pill">Age ${d.age}</span></div>
      <div class="h1 a" data-a="up" data-t=".55" style="margin-top:16px">${d.name}</div>
      <div class="body a" data-a="up" data-t=".95">${d.hook}</div>` };
  }
  const road = d => ({ dur: 6, html: `
    <div class="kicker a" data-a="up">The road here</div>
    <div class="dz-tl">${d.road.map(([y, t], i) => `<div class="a" data-a="left" data-t="${.25 + i * .32}"><b>${y}</b><span>${t}</span></div>`).join('')}</div>
    <div class="src a" data-a="fade" data-t="1.6">${d.src || 'Premium Times candidate profiles, Oct 2026'}</div>` });
  const done = d => ({ dur: 6, html: `
    <div class="kicker a" data-a="up">What ${d.he} has done</div>
    ${d.done.map(([h, s], i) => `<div class="dz-ck a" data-a="left" data-t="${.25 + i * .4}"><i>✓</i><div><div class="h3">${h}</div>${s ? `<div class="sub">${s}</div>` : ''}</div></div>`).join('')}
    <div class="src a" data-a="fade" data-t="1.6">${d.doneSrc || d.src || 'Premium Times candidate profiles, Oct 2026'}</div>` });
  const promise = d => ({ dur: 6, html: `
    <div class="kicker a" data-a="up">What ${d.he} promises</div>
    ${d.promise.map((p, i) => `<div class="dz-pr a" data-a="right" data-t="${.25 + i * .4}"><span>“</span>${p}</div>`).join('')}
    ${/^No detailed/.test(d.promise[0]) ? '' : `<div class="a" data-a="stamp" data-t="${.6 + d.promise.length * .4}" style="margin-top:26px"><span class="stamp amber">Promise</span></div>`}
    <div class="src a" data-a="fade" data-t="1.8" style="margin-top:64px">${d.promSrc || d.src || 'Premium Times candidate profiles, Oct 2026'}</div>` });
  const questions = d => ({ dur: 6.5, mood: 'red', html: `
    <div class="kicker a red" data-a="up">The questions</div>
    ${d.q.map(([tag, h, s], i) => `<div class="dz-q a" data-a="left" data-t="${.25 + i * .5}"><span class="tag">${tag}</span><div class="h3">${h}</div>${s ? `<div class="sub">${s}</div>` : ''}</div>`).join('')}
    <div class="src a" data-a="fade" data-t="1.8">${d.qSrc || d.src || 'Premium Times candidate profiles, Oct 2026'}</div>` });
  // Campaign trail: real news clippings (article photo + headline, key words highlighted).
  const trail = d => ({ dur: 6.5, html: `
    <div class="kicker a" data-a="up">On the campaign trail</div>
    ${d.trail.map(([img, outlet, date, head, hl], i) => `<div class="dz-clip a" data-a="${i ? 'right' : 'left'}" data-t="${.2 + i * .7}" style="transform-origin:center">
      <div class="im" style="background-image:url('${img}')"></div>
      <div class="tx"><div class="meta">${outlet} · ${date}</div><div class="hd">${head.replace(hl, `<mark><em class="a" data-a="hl" data-t="${.9 + i * .7}">${hl}</em></mark>`)}</div></div></div>`).join('')}` });
  const ask = d => ({ dur: 6, html: `
    <div class="kicker a" data-a="up">What voters should ask</div>
    ${d.ask.map((a, i) => `<div class="dz-ask a" data-a="up" data-t="${.25 + i * .4}"><b>?</b>${a}</div>`).join('')}
    <div class="body a" data-a="up" data-t="1.7" style="margin-top:24px">Little is on the public record. <span class="hl">Ask before you vote.</span></div>` });
  // Closing call to action: the live Naija Decides Rank, billboard style.
  function rank(d, c) {
    const pos = RANK.findIndex(r => r[0] === d.id) + 1, prev = RANK[pos - 1][3];
    const mv = prev > pos ? `<span class="up">▲ up from #${prev}</span>` : prev < pos ? `<span class="down">▼ down from #${prev}</span>` : `<span class="flat">● steady</span>`;
    const rows = RANK.slice(0, 5).map((r, i) => [i + 1, r]);
    if (pos > 5) rows.push(['…', null], [pos, RANK[pos - 1]]);
    return { dur: 7, html: `
      <div class="kicker a" data-a="up">The Naija Decides Rank · ${RANK_DATE}</div>
      <div class="dz-rk a" data-a="pop" data-t=".2"><b>#${pos}</b><div><span>of 18</span>${mv}</div></div>
      <div class="dz-board">${rows.map(([n, r], i) => r ? `<div class="a ${r[0] === d.id ? 'me' : ''}" data-a="left" data-t="${.6 + i * .12}" style="--c:${PC[r[2]]}"><em>${n}</em><span>${r[1]}</span><small>${r[2]}</small></div>` : `<div class="gapr a" data-a="fade" data-t="${.6 + i * .12}">⋮</div>`).join('')}</div>
      <div class="h3 a" data-a="up" data-t="1.6" style="margin-top:22px">Who's rising? Who's falling?</div>
      <div class="a" data-a="stamp" data-t="2.1" style="margin-top:20px"><span class="linkbio" style="font-size:72px;padding:14px 40px">Live rank · link in bio</span></div>
      <div class="src a" data-a="fade" data-t="2.4">Polls + news attention, updated twice a day. Not a prediction.</div>` };
  }

  const D = [
    { id:'tinubu', name:'Bola Tinubu', party:'APC', age:74, he:'he', photo:'site/photos/tinubu.jpg',
      hook:'The sitting president. He wants four more years.',
      road:[['1999–2007','Lagos State governor'],['2013','Co-founded the APC'],['2023','Won the presidency: 8.79M votes'],['2027','Running for a second term']],
      done:[['Ended the petrol subsidy','May 2023'],['Unified the exchange rate','June 2023'],['4.2% growth','World Bank, first half of 2026']],
      promise:['Finish the reforms: growth, investment, security','Dedicated power for industrial zones, with quarterly reports','50,000 new student hostel beds by end of 2027'],
      promSrc:'Premium Times profiles; APC manifesto via Premium Times; Punch, 23 Nov 2026',
      q:[['The cost','Inflation and food prices rose sharply','after the 2023 reforms'],['Allegation','1993 US civil forfeiture of funds','linked to drug proceeds. No criminal charge or conviction.']],
      trail:[['site/news/n83.jpg','Punch','23 Nov 2026','At Onikan rally, Tinubu courts Lagos Igbo voters','courts Lagos Igbo voters'],['site/news/n66.jpg','Punch','23 Nov 2026','Tinubu pledges 50,000 new hostel beds by end of 2027','50,000 new hostel beds']],
      vo:['Bola Tinubu. The sitting president, and he wants four more years.',
          'Lagos governor for eight years. Co-founder of the APC. In twenty twenty-three he won the presidency with eight point eight million votes.',
          'In office, he ended the petrol subsidy and unified the exchange rate. The World Bank reported four point two percent growth in early twenty twenty-six.',
          'His promise: finish the reforms. Dedicated power for factories, and fifty thousand new student hostel beds.',
          'The questions. Inflation and food prices rose sharply after the reforms. And a nineteen ninety-three US civil forfeiture case. No criminal charge, no conviction.',
          'On the campaign trail, he is courting voters in Lagos, the state he lost in twenty twenty-three.'] },
    { id:'atiku', say:'Atiku', name:'Atiku Abubakar', party:'ADC', age:79, he:'he', photo:'site/photos/atiku.jpg',
      hook:'Former vice president. Oldest on the ballot. Fourth time as a presidential candidate.',
      road:[['1969–89','Nigeria Customs Service'],['1999–2007','Vice President'],['2007 · 2019 · 2023','Ran for president'],['May 2026','Won the ADC primary']],
      done:[['Chaired the privatisation council','as Vice President, 1999–2007'],['Built big businesses','Intels, ABTI'],['6.98M votes in 2023','came 2nd']],
      promise:['Restructure Nigeria','Private-sector-led growth','Cheaper fuel and a revived Ajaokuta steel mill'],
      promSrc:'Premium Times profiles; Vanguard and Premium Times, 24 Nov 2026',
      q:[['In court','A court voided his ADC nomination','5 Nov 2026. The ADC has appealed.'],['Arbitration','$500,000 paid to his then-wife','Mambilla case. The tribunal found no evidence he used his office.']],
      trail:[['site/news/n99.jpg','Vanguard','24 Nov 2026','Atiku takes campaign to Kogi: "Nigerians deserve to live with dignity"','live with dignity'],['site/news/n51.jpg','Vanguard','22 Nov 2026','Atiku: "I have not stepped down"','I have not stepped down']],
      vo:['Atiku Abubakar. Former vice president, the oldest candidate on the ballot, and a presidential candidate for the fourth time.',
          'Twenty years in Customs. Vice president from nineteen ninety-nine to two thousand and seven. He ran for president in two thousand and seven, twenty nineteen and twenty twenty-three.',
          'As vice president he chaired the privatisation council. He built big businesses. In twenty twenty-three he came second, with nearly seven million votes.',
          'He promises to restructure Nigeria, private-sector-led growth, cheaper fuel, and a revived Ajaokuta steel mill.',
          'The questions. On the fifth of November, a court voided his ADC nomination. The party has appealed. And in the Mambilla arbitration, a payment to his then-wife, though the tribunal found no evidence he used his office.',
          'On the trail he says, I have not stepped down, and he is taking the campaign state by state.'] },
    { id:'obi', name:'Peter Obi', party:'NDC', age:65, he:'he', photo:'site/photos/obi.jpg',
      hook:'Third in 2023 with 6.1 million votes. Now running with Rabiu Kwankwaso.',
      road:[['Business','Trader; chaired Fidelity Bank'],['2006–2014','Anambra governor (court restored his mandate)'],['2019','Atiku\'s running mate'],['2023','Labour Party: 6.10M votes, 3rd']],
      done:[['Invested in schools','as Anambra governor'],['Returned mission schools','to their churches'],['6,101,533 votes in 2023','came 3rd']],
      promise:['One term only','Security, farming, factories, education, health','"From consumption to production"'],
      q:[['Pandora Papers','Offshore companies he had not declared','2021. He said nothing illegal was involved.'],['Disputed','The savings he says he left Anambra','Some officials dispute the figure.']],
      trail:[['site/news/n82.jpg','Daily Post','23 Nov 2026','Obi in Suleja: stay at your polling unit until votes are counted','stay at your polling unit'],['site/news/n60.jpg','Arise News','22 Nov 2026','Obi backs SmartBallot app for mobilising voters and agents','SmartBallot app']],
      vo:['Peter Obi. Third in twenty twenty-three with six point one million votes, and now running with Rabiu Kwankwaso.',
          'Trader and banker. Governor of Anambra for eight years, after a court restored his mandate. Atiku\'s running mate in twenty nineteen.',
          'As governor he invested in schools and handed mission schools back to their churches.',
          'He promises one term only. Security, farming, factories, education and health. From consumption to production.',
          'The questions. In twenty twenty-one, the Pandora Papers named offshore companies he had not declared. He said nothing illegal was involved. And the savings he says he left Anambra are disputed.',
          'On the trail he is telling supporters to stay at their polling units until the votes are counted.'] },
    { id:'seyi-makinde', name:'Seyi Makinde', party:'APM', age:58, he:'he', photo:'site/photos/makinde.jpg',
      hook:'Two-term Oyo governor. First run for president.',
      road:[['Engineer','Founded Makon Engineering'],['2015','Lost the Oyo governorship'],['2019 · 2023','Elected, then re-elected, Oyo governor'],['May 2026','APM presidential nominee']],
      done:[['Scrapped the ₦3,000 school levy','in Oyo'],['Took sole ownership of LAUTECH','for Oyo State'],['Large road-building programme','across the state']],
      promise:['Decentralised policing','A four-year Government of National Unity','Keep the student loan fund (NELFUND)'],
      promSrc:'Premium Times profiles; Daily Post, 22 Nov 2026',
      q:[['The running mate','Lawal Daura was sacked as DSS chief','Aug 2018, after masked agents blocked the National Assembly.']],
      trail:[['site/news/n55.jpg','Punch','22 Nov 2026','Makinde: "Nigeria is not working for most citizens"','not working for most citizens'],['site/news/n61.jpg','Daily Post','22 Nov 2026','Makinde: student loan fund is the one Tinubu policy he would keep','one Tinubu policy he would keep']],
      vo:['Seyi Makinde. Two-term governor of Oyo State, on his first run for president.',
          'An engineer who built his own company. He lost the Oyo governorship in twenty fifteen, won it in twenty nineteen, and was re-elected in twenty twenty-three.',
          'In Oyo he scrapped the school levy, took full ownership of LAUTECH for the state, and built roads across the state.',
          'He promises decentralised policing and a four-year government of national unity. And he says he would keep the student loan fund.',
          'The question: his running mate. Lawal Daura was sacked as head of the DSS in twenty eighteen, after masked agents blocked the National Assembly.',
          'On the trail, his message is a national reset. Nigeria, he says, is not working for most citizens.'] },
    { id:'omoyele-sowore', name:'Omoyele Sowore', party:'AAC', age:55, he:'he', photo:'site/photos/sowore.jpg',
      hook:'Activist, publisher, and on trial while he campaigns.',
      road:[['UNILAG','Student union leader'],['2006','Founded SaharaReporters'],['2018','Founded the AAC'],['2019 · 2023','Ran for president: 33,953 and 14,608 votes']],
      done:[['Led the 2019 #RevolutionNow protests',''],['Held by the DSS for months','despite court orders to release him'],['Built SaharaReporters','an online news outlet']],
      promise:['₦500,000 minimum wage (about ₦7.1tn a year)','Free education and 1 million homes','Restore the fuel subsidy'],
      q:[['In court','A cybercrime case is pending','over 2025 posts calling Tinubu a "criminal"'],['Struck out','The 2019 treason charge','was struck out in February 2024']],
      trail:[['site/news/n96.jpg','Punch','24 Nov 2026','Sowore pulls AAC out of the National Peace Accord','out of the National Peace Accord'],['site/news/n76.jpg','Daily Post','23 Nov 2026','Sowore leads protest at INEC headquarters','protest at INEC headquarters']],
      vo:['Omoyele Sowore. Activist, publisher, and on trial while he campaigns.',
          'A student union leader at UNILAG. He founded SaharaReporters in two thousand and six, and the AAC in twenty eighteen. This is his third run.',
          'He led the RevolutionNow protests in twenty nineteen, and was held by the DSS for months, despite court orders to release him.',
          'He promises a five hundred thousand naira minimum wage, free education, a million homes, and a return of the fuel subsidy.',
          'The questions. A cybercrime case over his posts about Tinubu is still in court. The old treason charge was struck out in twenty twenty-four.',
          'This week he led a protest at INEC headquarters, and pulled his party out of the national peace accord.'] },
    { id:'adewole-adebayo', name:'Adewole Adebayo', party:'SDP', age:54, he:'he', photo:'site/photos/adebayo.jpg',
      hook:'Lawyer and TV founder. Second run for president.',
      road:[['2000','Called to the bar (also New York and California)'],['2006','Liberia Truth Commission member'],['2016','Founded KAFTAN TV'],['2023','SDP candidate: 80,267 votes']],
      done:[['Commissioner, Liberia\'s TRC','2006'],['Founded KAFTAN TV','2016'],['80,267 votes in 2023','SDP']],
      promise:['"Farewell to Poverty and Insecurity"','His blueprint for the economy and security'],
      q:[['Record','Has never held elected office',''],['The ticket','Running mate Usman Bugaje, 74','']],
      ask:['How is the blueprint paid for?','Who is on his economic team?','What would he do in his first 100 days?'],
      vo:['Adewole Adebayo. A lawyer and TV founder, on his second run for president.',
          'Called to the bar in Nigeria, New York and California. He served on Liberia\'s truth commission, and founded KAFTAN TV in twenty sixteen.',
          'In twenty twenty-three he ran for the SDP and got eighty thousand votes.',
          'His plan is called Farewell to Poverty and Insecurity.',
          'The questions. He has never held elected office. And his running mate is seventy-four.',
          'Little of his plan is costed in public. Ask how it is paid for, and who would deliver it.'] },
    { id:'donald-duke', name:'Donald Duke', party:'PRP', age:65, he:'he', photo:'site/photos/duke.jpg',
      hook:'Former Cross River governor. The man behind Obudu, Tinapa and Carnival Calabar.',
      road:[['Lawyer','ABU; master\'s at Penn'],['1999–2007','Cross River governor'],['2019','SDP candidate: 34,746 votes'],['June 2026','Cleared as PRP candidate']],
      done:[['Revived Obudu Ranch',''],['Launched Carnival Calabar',''],['Built Tinapa','a business and leisure resort']],
      promise:['Security and growth','Petrol at about ₦300 a litre'],
      q:[['Disputed','Tinapa\'s debts','Valued at ₦58.7bn in 2024 accounts. His successor disputes the liabilities.'],['In court','A suit against his nomination','was dismissed']],
      ask:['How would petrol reach ₦300 a litre?','Who pays for it?','What is his security plan?'],
      vo:['Donald Duke. Former governor of Cross River, and the man behind Obudu Ranch, Tinapa and Carnival Calabar.',
          'A lawyer trained at ABU and Penn. Governor for eight years. He ran for president on the SDP ticket in twenty nineteen.',
          'He revived Obudu Ranch, launched Carnival Calabar, and built the Tinapa resort.',
          'He promises security, growth, and petrol at about three hundred naira a litre.',
          'The questions. Tinapa\'s debts are still disputed by his successor. And a suit against his nomination was dismissed.',
          'Ask him how petrol gets to three hundred naira a litre, and who pays for it.'] },
    { id:'sandy-ojang-onor', name:'Sandy Ojang Onor', party:'PDP', age:60, he:'he',
      hook:'Senator and history professor. Flying the PDP flag.',
      road:[['1999–2002','Etung local government chairman'],['Cross River','Commissioner for agriculture'],['2019','Senator, Cross River Central'],['May 2026','PDP consensus candidate']],
      done:[['Sponsored a healthcare fund bill','Advanced Healthcare Development Fund Bill'],['Senator since 2019',''],['PhD in History','University of Calabar']],
      promise:['Local government autonomy','Rural development, jobs and security'],
      q:[['Split party','A rival PDP faction backs Goodluck Jonathan','INEC lists Onor.'],['Rainbow Coalition','His PDP faction backs Tinubu','The party says Onor is still in the race.']],
      qSrc:'Premium Times profiles; Premium Times; The Sun, Nov 2026',
      ask:['Is he running to win?','Where does he stand on the Rainbow Coalition?','What is his plan for the economy?'],
      vo:['Sandy Ojang Onor. A senator and history professor, flying the PDP flag.',
          'He chaired his local government, served as a Cross River commissioner, and has been a senator since twenty nineteen.',
          'In the Senate he sponsored a bill for a healthcare development fund.',
          'He promises local government autonomy, rural development, jobs and security.',
          'The questions. A rival PDP faction backs Goodluck Jonathan. And his own faction\'s Rainbow Coalition backs Tinubu, though the party says Onor is still in the race.',
          'So ask him directly: is he running to win?'] },
    { id:'rufai-adekunle-omo-aje', name:'Rufai Adekunle Omo-Aje', party:'AA', age:71, he:'he', photo:'site/photos/omo-aje.jpg', pos:'center 25%',
      hook:'Party chairman turned candidate, in a fight for his own party.',
      road:[['Ede, Osun','Businessman'],['2020','Action Alliance national chairman'],['2026','AA presidential candidate']],
      done:[['Leads the Action Alliance','since 2020'],['AA: 14,542 votes in 2023','']],
      promise:['No detailed manifesto published yet'],
      q:[['Disputed','A rival AA faction disputes his leadership','and asked INEC to recognise another candidate'],['Unverified','Rivals claim he works for another campaign','No evidence has been published.']],
      qSrc:'Premium Times profiles; Blueprint; Leadership, Nov 2026',
      ask:['What is his plan?','Who is his team?','Will the leadership dispute end before January?'],
      vo:['Rufai Adekunle Omo-Aje. A party chairman turned candidate, in a fight for his own party.',
          'A businessman from Ede in Osun State. He has led the Action Alliance since twenty twenty.',
          'His party got about fourteen thousand votes in twenty twenty-three.',
          'A detailed manifesto has not been published yet.',
          'The questions. A rival faction disputes his leadership and has asked INEC to recognise another candidate. It also claims he works for another campaign, which is unverified.',
          'Ask for the plan, and the team.'] },
    { id:'peter-ada-agada', name:'Peter Ada Agada', party:'YPP', age:54, he:'he', photo:'site/photos/agada.jpg',
      hook:'An architect who wants to run Nigeria like a project site.',
      road:[['UNIJOS · UNILAG','Architecture degrees and a PhD'],['Obidient Movement','Former finance director'],['2026','Disqualified at Labour Party screening'],['Aug 2026','YPP candidate']],
      done:[['Architect','with a PhD'],['Ran finances for the Obidient Movement',''],['Running with Patience Key','']],
      promise:['"Run Nigeria like a project site"'],
      q:[['Record','Has never held public office',''],['Switch','Moved parties after LP disqualified him','then won a YPP substitution primary']],
      ask:['What does "project site" mean for the budget?','Who is on his team?','How does he reach voters nationwide?'],
      vo:['Peter Ada Agada. An architect who wants to run Nigeria like a project site.',
          'Degrees in architecture and a PhD. He was finance director of the Obidient Movement.',
          'He is running with Patience Key.',
          'His promise: run Nigeria like a project site.',
          'The questions. He has never held public office. And he moved to the YPP after the Labour Party disqualified him.',
          'Ask what that plan means for the budget, and who would deliver it.'] },
    { id:'sunday-chibuzo-okereke', say:'Sunday Okereke', name:'Sunday Chibuzo Okereke', party:'LP', age:43, he:'he', photo:'site/photos/okereke.jpg',
      hook:'Labour Party candidate. The party that came third in 2023.',
      road:[['UNN','Accounting degree'],['Federal University Lokoja','PhD in Legislative Governance'],['ERGAF-AFRICA','President'],['May 2026','Labour Party consensus candidate']],
      done:[['Lecturer','Miva Open University'],['Leads LP\'s ticket','6.1M votes in 2023, when Obi was its candidate']],
      promise:['A production economy','Make NYSC optional'],
      q:[['Record','Little national record',''],['Split party','A faction led by Julius Abure endorsed Tinubu','Obi, LP\'s 2023 candidate, now runs for the NDC']],
      qSrc:'Premium Times profiles; Vanguard, 23 Nov 2026',
      ask:['How does a production economy become a budget?','Why make NYSC optional?','Can LP hold its 2023 voters?'],
      vo:['Sunday Chibuzo Okereke. Candidate of the Labour Party, the party that came third in twenty twenty-three.',
          'An accountant with a PhD in legislative governance. He leads ERGAF Africa and lectures at Miva Open University.',
          'He now carries the ticket that got six million votes in twenty twenty-three, when Peter Obi was the candidate.',
          'He promises a production economy, and would make NYSC optional.',
          'The questions. He has little national record. And his party is split: a faction led by Julius Abure has endorsed Tinubu.',
          'Ask how his plan becomes a budget.'] },
    { id:'sunday-adenuga', name:'Sunday Adenuga', party:'BP', age:52, he:'he', photo:'site/photos/adenuga.jpg',
      hook:'IT professional. Boot Party chairman. Second run.',
      road:[['Northumbria','MSc Project Management'],['IT','Governance professional'],['2020','Boot Party national chairman'],['2023','Candidate: 16,156 votes']],
      done:[['Leads the Boot Party','since 2020'],['16,156 votes in 2023','']],
      promise:['"One Working Nigeria"'],
      q:[['Record','Has never held public office',''],['The ticket','Running mate Usman Mustapha, 40','']],
      ask:['What does One Working Nigeria change first?','How is it paid for?','Who is on his team?'],
      vo:['Sunday Adenuga. An IT professional and Boot Party chairman, on his second run.',
          'A master\'s in project management. He has led the Boot Party since twenty twenty.',
          'In twenty twenty-three he got about sixteen thousand votes.',
          'His agenda is called One Working Nigeria.',
          'The question: he has never held public office.',
          'Ask what One Working Nigeria changes first, and how it is paid for.'] },
    { id:'moses-olusoji-adebisi', name:'Moses Olusoji Adebisi', party:'DLA', age:35, he:'he', photo:'site/photos/adebisi.jpg',
      hook:'The youngest candidate on the ballot.',
      road:[['Gbongan, Osun','Home town'],['ISCG University','HRM degree'],['20 Aug 2026','DLA candidate after a substitution primary']],
      done:[['Youngest candidate, at 35',''],['Running mate Abubakar Nafisat, 35','']],
      promise:['"The Divine Order for a New Nigeria"'],
      q:[['Contested','His substitution was challenged','by some of the party\'s governorship candidates']],
      ask:['What is in the Divine Order plan?','Who is on his team?','What has he run before?'],
      vo:['Moses Olusoji Adebisi. At thirty-five, the youngest candidate on the ballot.',
          'From Gbongan in Osun State. He became the DLA candidate in a substitution primary in August.',
          'His running mate is also thirty-five.',
          'His programme is called The Divine Order for a New Nigeria.',
          'The question: his substitution was contested by some of his party\'s governorship candidates.',
          'Ask what is actually in the plan, and who would deliver it.'] },
    { id:'nkem-esther-okereke', say:'Nkem Okereke', name:'Nkem Esther Okereke', party:'NRM', age:43, he:'she', photo:'site/photos/nkem.jpg',
      hook:'Actress, producer, businesswoman. One of two women on the ballot.',
      road:[['University of Abuja','Political Science; PhD in International Relations'],['Film','Actress and producer'],['Business','Founded Kamdera Services'],['May 2026','NRM candidate']],
      done:[['Founded Kamdera Services','an HR and talent company'],['Actress and film producer',''],['One of two women running','']],
      promise:['The "ESTHER Agenda"','Education, security, technology, housing, entrepreneurship, restitution'],
      q:[['Record','Has never held public office','']],
      ask:['Which ESTHER promise comes first?','How is it paid for?','Who is on her team?'],
      vo:['Nkem Esther Okereke. Actress, producer and businesswoman. One of only two women on the ballot.',
          'She holds a PhD in international relations, and founded an HR and talent company.',
          'She was chosen by voice vote at her party\'s convention in May.',
          'Her plan is the ESTHER Agenda: education, security, technology, housing, entrepreneurship and restitution.',
          'The question: she has never held public office.',
          'Ask which promise comes first, and how it is paid for.'] },
    { id:'aliyu-abbas-bin', name:'Aliyu Abbas-Bin', party:'ADP', age:44, he:'he', photo:'site/photos/abbas.jpg',
      hook:'From Almajiri pupil to presidential candidate.',
      road:[['Kano','Grew up as an Almajiri pupil'],['2018','Atiku\'s aide on youth groups'],['National Youth Alliance','Founder'],['May 2026','ADP consensus candidate']],
      done:[['Founded the National Youth Alliance',''],['ADP: 43,924 votes in 2023','']],
      promise:['An eight-point agenda','Focus on youth and artificial intelligence'],
      q:[['In court','His nomination is being challenged','by party member Johnson Chukwuka']],
      ask:['What are the eight points?','How does AI create jobs here?','Will the court case end in time?'],
      vo:['Aliyu Abbas-Bin. From Almajiri pupil to presidential candidate.',
          'He grew up as an Almajiri pupil in Kano, worked as an aide to Atiku on youth groups, and founded the National Youth Alliance.',
          'His party got about forty-four thousand votes in twenty twenty-three.',
          'He has an eight-point agenda, focused on young people and artificial intelligence.',
          'The question: his nomination is being challenged in court by a member of his own party.',
          'Ask what the eight points are, and how AI creates jobs.'] },
    { id:'ada-elizabeth-fredrick-okwori', name:'Ada Elizabeth Fredrick Okwori', party:'NDP', age:48, he:'she', photo:'site/photos/okwori.jpg',
      hook:'One of two women on the ballot, for a party registered this year.',
      road:[['Benue','Home state'],['2015','Coordinated Ward2Ward for Jonathan'],['NDP','Helped found the party'],['Feb 2026','NDP registered after a court order']],
      done:[['Organised Ward2Ward','a 2015 support group for Jonathan'],['Co-founded the NDP',''],['One of two women running','']],
      promise:['No detailed manifesto published yet'],
      q:[['Record','Has never held public office','']],
      ask:['What is her plan?','Who is on her team?','What would she do first?'],
      vo:['Ada Elizabeth Fredrick Okwori. One of two women on the ballot, for a party registered this year.',
          'From Benue State. In twenty fifteen she coordinated a support group for Goodluck Jonathan. Then she helped found the NDP, registered in February after a court order.',
          'She is one of only two women in the race.',
          'A detailed manifesto has not been published yet.',
          'The question: she has never held public office.',
          'Ask for the plan, and the team.'] },
    { id:'daniel-nwanyanwu', name:'Daniel Nwanyanwu', party:'ZLP', age:66, he:'he',
      hook:'Former Labour Party chairman. Second run for president.',
      road:[['UNILAG','Law degrees'],['2004–2014','Labour Party national chairman'],['ZLP','Later national chairman'],['2023','ZLP candidate: 77,665 votes']],
      done:[['Led the Labour Party for 10 years','when it won Ondo with Mimiko'],['77,665 votes in 2023','']],
      promise:['National unity','Tackle insecurity and corruption','Clean energy and industry'],
      promSrc:'Premium Times profiles; Punch',
      q:[['Record','Has never held elected office',''],['The ticket','Running mate Hassan Khalid, 37','']],
      ask:['How would he fight corruption?','What is his security plan?','Who is on his team?'],
      vo:['Daniel Nwanyanwu. Former Labour Party chairman, on his second run for president.',
          'A lawyer who led the Labour Party for ten years, including when it won Ondo State, and later chaired the Zenith Labour Party.',
          'In twenty twenty-three he got about seventy-eight thousand votes.',
          'He promises national unity, a fight against insecurity and corruption, and clean energy.',
          'The question: he has never held elected office.',
          'Ask how he would actually fight corruption.'] },
    { id:'kabiru-yusuf', say:'Kabiru Yusuf', name:'Kabiru Yusuf', party:'APP', age:54, he:'he',
      hook:'The least-known candidate on the ballot.',
      road:[['Education','School certificates and an ND'],['2026','APP presidential candidate']],
      done:[['APP: 12,839 votes in 2023','']],
      promise:['No detailed manifesto published yet'],
      q:[['Record','Very little public record','']],
      ask:['What is his plan?','Who is on his team?','Where is he from, and what has he done?'],
      vo:['Kabiru Yusuf. The least-known candidate on the ballot.',
          'He is fifty-four, and the APP\'s candidate. Little else about him is published.',
          'His party got about thirteen thousand votes in twenty twenty-three.',
          'A detailed manifesto has not been published yet.',
          'The question: there is very little public record.',
          'Ask for a plan, and a team.'] },
  ];

  const rankLine = d => { const pos = RANK.findIndex(r => r[0] === d.id) + 1; return `Right now, ${d.say || d.name.split(' ').slice(-1)[0]} is number ${pos} on the Naija Decides Rank. Who is rising, and who is falling? Check the live rank. The link is in our bio.`; };

  D.forEach(d => {
    const c = PC[d.party];
    const id = 'dossier-' + d.id;
    const sixth = d.trail ? trail(d) : ask(d);
    const tags = ['#Nigeria2027', '#NigeriaDecides2027', '#MeetThe18', '#' + d.name.replace(/[^A-Za-z]/g, ''), '#' + d.party];
    window.VIDEOS.push({
      id, voice: 'eleven', dossier: true,
      title: `The dossier: ${d.name} (${d.party})`,
      caption: `${d.name} (${d.party}): what ${d.he} has done, what ${d.he} promises, and the questions. Sourced and neutral, same format for all 18 candidates. Where does ${d.he === 'she' ? 'she' : 'he'} rank today? See the live Naija Decides Rank: link in bio. 🇳🇬 ${tags.join(' ')}`,
      scenes: [hero(d, c), road(d), done(d), promise(d), questions(d), sixth, rank(d, c)],
    });
    window.NARRATION[id] = [...d.vo, rankLine(d)].map(t => ['serious', t]);
  });
  window.DOSSIERS = D.map(d => 'dossier-' + d.id);
})();
