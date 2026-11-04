/* Core facts. Every entry carries a source key from S. */
const S = { // sources
  inecTime:{t:'INEC revised timetable (VON)',u:'https://von.gov.ng/inec-issues-revised-timetable-for-2027-general-election/'},
  voters:{t:'Voter register (Nairametrics, Oct 2026)',u:'https://nairametrics.com/2026/10/06/lagos-kano-kaduna-top-nigerias-voter-register-ahead-of-2027/'},
  wiki27:{t:'2027 Nigerian general election (Wikipedia)',u:'https://en.wikipedia.org/wiki/2027_Nigerian_general_election'},
  wiki23:{t:'2023 presidential election (Wikipedia/INEC)',u:'https://en.wikipedia.org/wiki/2023_Nigerian_presidential_election'},
  poverty:{t:'World Bank via Nairametrics, Apr 2026',u:'https://nairametrics.com/2026/04/10/nigerias-poverty-rate-hits-63-in-2025-despite-inflation-slowdown-world-bank/'},
  gdp:{t:'NBS via Nairametrics, Aug 2026',u:'https://nairametrics.com/2026/08/31/nigerias-gdp-grows-by-4-43-in-q2-2026/'},
  power22:{t:'Nairametrics, Jun 2022',u:'https://nairametrics.com/2022/06/10/tinubu-says-his-administration-will-focus-on-building-15000mw-power-generation/'},
  power25:{t:'TCN via Nairametrics, Mar 2025',u:'https://nairametrics.com/2025/03/06/nigerias-power-generation-hits-record-5801-84mw-tcn'},
  growth22:{t:'BusinessDay, Jun 2022',u:'https://businessday.ng/politics/article/tinubu-targets-12-gdp-growth-in-economic-agenda/'},
  meters:{t:'Nairametrics, Oct 2026',u:'https://nairametrics.com/2026/10/02/fg-installs-707765-meters-in-q2-4-8-million-electricity-customers-remain-unmetered/'},
  refinery:{t:'NNPC via Nairametrics, Feb 2026',u:'https://nairametrics.com/2026/02/05/nnpc-shuts-state-owned-refineries-after-assessments-show-value-leakage-ojulari'},
  fch24:{t:'FactCheckHub, Oct 2024',u:'https://factcheckhub.com/fact-checking-tinubus-independence-day-speech/'},
  fch26:{t:'FactCheckHub, 2 Oct 2026',u:'https://factcheckhub.com/nigeria-at-66-fact-checking-tinubus-independence-day-economics/'},
  dubVideo:{t:'Dubawa, 10 Aug 2024',u:'https://dubawa.org/presidency-tinubus-x-pages-circulate-old-video-amid-endbadgovernance-protest/'},
  dub5:{t:'Dubawa, 11 Aug 2024',u:'https://dubawa.org/fact-checking-five-economic-claims-in-viral-response-to-tinubus-speech/'},
  dubOccrp:{t:'Dubawa',u:'https://dubawa.org/false-tinubu-not-third-most-corrupt-person-in-world/'},
  fchFrance:{t:'FactCheckHub',u:'https://factcheckhub.com/no-evidence-tinubu-lives-in-france-governs-nigeria-remotely/'},
  audit:{t:'Daily Trust, Jul 2026',u:'https://dailytrust.com/25-mdas-varsities-others-flagged-in-n1-34trn-audit-lapses/'},
  cash:{t:'StatePress, Sep 2026',u:'https://www.statepress.ng/2026/09/auditor-general-queries-n3375bn-cash.html'},
  edu:{t:'ICIR, Jan 2024',u:'https://www.icirnigeria.org/efcc-grills-betta-edu-over-n585m-scandal/'},
  emefiele:{t:'Naija News, 20 Oct 2026',u:'https://www.naijanews.com/2026/10/20/6-23-million-fraud-emefiele-has-case-to-answer-efcc-tells-court/'},
  bello:{t:'Nairametrics, Apr 2026',u:'https://nairametrics.com/2026/04/24/yahaya-bello-efcc-n80-billion-alleged-fraud-case-adjourned-to-may-6/'},
  tinubu460:{t:'Vanguard, Apr 2023',u:'https://www.vanguardngr.com/2023/04/alleged-drug-case-why-tinubu-forfeited-460000-in-us-apc-tells-court/'},
  atikuPSI:{t:'Vanguard (US Senate PSI report, 2010)',u:'https://www.vanguardngr.com/2017/12/u-s-senate-report-abubakar-atikus-albatross/'},
  atikuReply:{t:'allAfrica, Sep 2026',u:'https://allafrica.com/stories/202609290489.html'},
  obiPandora:{t:'ICIR / Premium Times, Oct 2021',u:'https://www.icirnigeria.org/pandora-papers-inside-peter-obis-secret-businesses-and-how-he-broke-the-law/'},
  obiReply:{t:'ThisDay, Oct 2021',u:'https://thisdaylive.com/index.php/2021/10/07/pandora-papers-i-broke-no-law-says-peter-obi'},
  atikuPitch:{t:'Arise TV, 2026',u:'https://www.arise.tv/atiku-outlines-economic-security-blueprint-as-adc-screening-panel-clears-him-for-2027-race/'},
  obiPitch:{t:'Voice of Nigeria, Aug 2026',u:'https://von.gov.ng/peter-obi-launches-2027-presidential-campaign/'},
  tinubuPitch:{t:'allAfrica, Oct 2026',u:'https://allafrica.com/stories/202610260027.html'},
  sbm:{t:'SBM Intelligence via BusinessDay, 2026',u:'https://businessday.ng/news/article/2027-elections-peter-obi-kwankwaso-get-favourable-ratings-ahead-of-incumbent-tinubu-in-new-survey/'},
  sbmWrong:{t:'SBM via Nairametrics, Jun 2026',u:'https://nairametrics.com/2026/06/14/2027-poll-nearly-80-of-nigerians-say-country-moving-in-wrong-direction/'},
  sbmSubsidy:{t:'SBM via Legit.ng',u:'https://www.legit.ng/politics/1732298-ariku-claims-tinubus-fuel-policy-rejected-by-674-nigerians-survey/'},
  tmg:{t:'Vanguard, Sep 2026',u:'https://www.vanguardngr.com/2026/09/tinubu-must-go-poll-puts-atiku-ahead-of-obi-others-for-2027/'},
  noPolls:{t:'African Business, Sep 2026',u:'https://african.business/2026/09/politics/a-divided-nigerian-opposition-takes-on-tinubu'},
  inec100:{t:'Premium Times',u:'https://www.premiumtimesng.com/news/top-news/914520-2027-inec-to-address-nigerians-as-election-countdown-hits-100-days.html'},
  channelsWatch:{t:'Channels TV, 16 Oct 2026',u:'https://www.channelstv.com/2026/10/16/nigeria-2027-election-watch-inec-leadership-changes-and-apc-reveals-its-campaign-priorities/'},
  deepfakes:{t:'The Sun',u:'https://thesun.ng/2027-elections-inec-raises-alarm-over-deepfakes-ai-generated-fake-news'},
  register:{t:'The Sun',u:'https://thesun.ng/2027-inec-and-unanswered-questions/'},
  tinubu27:{t:'allAfrica, 26 Oct 2026',u:'https://allafrica.com/stories/202610260027.html'},
  inflation:{t:'NBS CPI (Trading Economics)',u:'https://tradingeconomics.com/nigeria/inflation-cpi'},
  fuel:{t:'dailyfuels.com, Nov 2026',u:'https://dailyfuels.com/nigeria/'}
};
const C = [
  {id:'tinubu',name:'Bola Tinubu',ini:'BT',party:'APC',c:'var(--apc)',mate:'Kashim Shettima',home:'Lagos',
    exp:'Governor of Lagos 1999–2007 · President since May 2023',
    r23:'1st in 2023: 8.79M votes (36.6%), 12 states',
    pitch:'Continue the reforms, toward a $1 trillion economy by 2030',pitchSrc:'tinubuPitch',
    record:'Forfeited $460,000 in a 1993 US civil case.',reply:'His side: a settlement, not a conviction. A 2023 tribunal agreed.',recSrc:'tinubu460',
    question:'Your 2022 targets (12% growth, 15,000 MW) were missed. Why trust the 2030 ones?'},
  {id:'atiku',name:'Atiku Abubakar',ini:'AA',party:'ADC',c:'var(--adc)',mate:'Rotimi Amaechi',home:'Adamawa',
    exp:'Vice President 1999–2007 · businessman',
    r23:'2nd in 2023 (PDP): 6.98M votes (29.1%), 12 states',
    pitch:'Restore a form of fuel subsidy, restructure the federation, job-led growth',pitchSrc:'atikuPitch',
    record:'A 2010 US Senate report said $40M in "suspect funds" entered the US via his then-wife.',reply:'He says no court has ever found him guilty.',recSrc:'atikuPSI',
    question:'How will you pay for a fuel subsidy, and stop the leakages this time?'},
  {id:'obi',name:'Peter Obi',ini:'PO',party:'NDC',c:'var(--ndc)',mate:'Rabiu Kwankwaso',home:'Anambra',
    exp:'Governor of Anambra 2006–2014 · businessman',
    r23:'3rd in 2023 (LP): 6.10M votes (25.4%), 11 states + FCT',
    pitch:'Move Nigeria from consumption to production',pitchSrc:'obiPitch',
    record:'Pandora Papers (2021): offshore companies not declared while governor.',reply:'He says he broke no law.',recSrc:'obiPandora',
    question:'How, how fast, and with what money will production replace imports?'}
];
const ROUNDS = [['exp','Experience'],['r23','2023 result'],['pitch','The 2027 pitch'],['record','On the record'],['question','The question they must answer']];
const FACTS = [
  {claim:'Nigeria attracted foreign direct investments worth more than $30 billion in the last year.',who:'President Tinubu, Independence Day broadcast',when:'1 Oct 2024',v:'false',label:'False',why:'NBS data shows about $363M in FDI over the nine months to March 2024.',src:'fch24'},
  {claim:'We have cleared the Ways and Means debt of over ₦30 trillion.',who:'President Tinubu, same broadcast',when:'1 Oct 2024',v:'mis',label:'Misleading',why:'The debt was securitised into a 40-year loan, not paid off.',src:'fch24'},
  {claim:'Nigeria inherited a reserve of over $33 billion.',who:'President Tinubu, same broadcast',when:'1 Oct 2024',v:'mis',label:'Mostly false',why:'Reserves handed over in May 2023 were about $35 billion.',src:'fch24'},
  {claim:'A video of the President asking Nigerians to look beyond temporary pains (posted as new during the protests).',who:'@NGRPresident and @officialABAT on X',when:'7 Aug 2024',v:'mis',label:'Misleading',why:'It was a July 2023 broadcast reposted without saying it was old.',src:'dubVideo'},
  {claim:'We have paid back the inherited forex backlog of $7 billion.',who:'President Tinubu',when:'1 Oct 2024',v:'true',label:'True',why:'The CBN said legitimate outstanding FX obligations were settled by March 2024.',src:'fch24'},
  {claim:'Our economy has grown by over 4 per cent this year.',who:'President Tinubu, Independence Day',when:'1 Oct 2026',v:'true',label:'True',why:'NBS: 4.43% year-on-year in Q2 2026 (a single quarter, not the full year).',src:'fch26'},
  {claim:'Inflation has fallen substantially from its peak.',who:'President Tinubu',when:'1 Oct 2026',v:'true',label:'True',why:'Headline inflation fell to 15.39% in Aug 2026 from 23.14% a year earlier. Food inflation is still near 20%.',src:'fch26'},
  {claim:'Oil theft is down.',who:'President Tinubu',when:'1 Oct 2026',v:'true',label:'True',why:'NUPRC: losses averaged 9,600 barrels a day in 2025, the lowest since 2009.',src:'fch26'},
  {claim:'The current administration awarded ₦70 billion to procure SUVs for members of the National Assembly.',who:'Viral post',when:'Aug 2024',v:'true',label:'True',why:'₦70bn was allocated for Toyota Prados for 469 lawmakers in the amended supplementary budget.',src:'dub5'},
  {claim:'Tinubu was named the world\'s third most corrupt person.',who:'Viral post',when:'2024',v:'mis',label:'Misleading',why:'He got the third-most nominations in an OCCRP reader poll. It is not a ranking.',src:'dubOccrp'},
  {claim:'Tinubu lives in France and governs Nigeria remotely.',who:'Viral post',when:'2026',v:'mis',label:'Unproven',why:'No evidence. A travel tracker shows two trips to France in 2026.',src:'fchFrance'}
];
const PROMISES = [
  {topic:'Economy',promised:'12% GDP growth a year',reality:'Best quarter so far: 4.43% (Q2 2026)',v:'mis',label:'Far behind',ps:'growth22',rs:'gdp'},
  {topic:'Electricity',promised:'15,000 MW of power',reality:'Record peak 5,802 MW (Mar 2025)',v:'false',label:'Not delivered',ps:'power22',rs:'power25'},
  {topic:'Electricity bills',promised:'All bills meter-based',reality:'4.8M customers still unmetered (Q2 2026)',v:'mis',label:'Not yet',ps:'meters',rs:'meters'},
  {topic:'Poverty',promised:'End extreme poverty',reality:'Poverty rose from 56% (2023) to 63% (2025)',v:'false',label:'Worse',ps:'poverty',rs:'poverty'},
  {topic:'Refineries',promised:'Working state refineries',reality:'NNPC shut them after rehab, citing losses',v:'false',label:'Failed so far',ps:'refinery',rs:'refinery'}
];
const MONEY = [
  {t:'₦1.34 trillion in audit lapses',d:'The Auditor-General flagged irregularities, weak controls and other lapses across ministries and agencies (report sent to NASS, July 2026).',tag:'Official audit',src:'audit'},
  {t:'₦33.75bn in cash transfers unverified',d:'Auditors could not confirm 2023 transfers to 3.29M households reached real beneficiaries. The cash transfer office disputes part of this.',tag:'Official audit',src:'cash'},
  {t:'₦585M memo to a private account',d:'The humanitarian minister was suspended in Jan 2024 after a memo asked for ₦585M to be paid into a private account. The EFCC investigated.',tag:'Reported',src:'edu'},
  {t:'Emefiele on trial',d:'The former CBN governor faces an amended 20-count charge, including a $6.23M withdrawal. He denies the charges.',tag:'In court',src:'emefiele'},
  {t:'Yahaya Bello on trial',d:'The former Kogi governor is on trial over ₦80bn. He denies it and won the APC Senate primary for Kogi Central.',tag:'In court',src:'bello'},
  {t:'₦70bn for lawmakers\' SUVs',d:'Approved in the amended 2022 supplementary budget in 2023, during a cost-of-living crisis. Rated TRUE by Dubawa.',tag:'Verified',src:'dub5'}
];

const POLLS = {
  sbm:[{n:'Peter Obi',v:58.3,c:'var(--ndc)'},{n:'Bola Tinubu',v:-58.5,c:'var(--apc)'}],
  tmg:[{n:'Atiku / Amaechi (ADC)',v:73.6,c:'var(--adc)'},{n:'Obi / Kwankwaso (NDC)',v:22.3,c:'var(--ndc)'},{n:'Others',v:4.1,c:'var(--muted)'}],
  r23:[{n:'Tinubu (APC)',v:36.6,c:'var(--apc)'},{n:'Atiku (PDP)',v:29.1,c:'var(--adc)'},{n:'Obi (LP)',v:25.4,c:'var(--ndc)'},{n:'Kwankwaso (NNPP)',v:6.2,c:'#c792ff'}],
  viewer: null // {updated:'', total:0, ages:{'18-24':{tinubu:0,atiku:0,obi:0,other:0}, ...}} — filled in from your Google Form results
};
const MATCH = [
  {q:'Should the current economic reforms (subsidy removal, floating naira) continue?',o:[['Yes, keep going',{tinubu:2}],['Change course',{atiku:1,obi:1}],['Not sure',{}]]},
  {q:'Should the government bring back some form of fuel subsidy?',o:[['Yes',{atiku:2}],['No',{tinubu:1}],['Not sure',{}]]},
  {q:'What should the next president focus on first?',o:[['Making things here: farms, factories',{obi:2}],['Investment and a bigger economy',{tinubu:2}],['Jobs, stimulus and lower costs of governance',{atiku:2}]]},
  {q:'Should power be restructured between the federal government and the states?',o:[['Yes, a big change',{atiku:2}],['Small changes are enough',{tinubu:1,obi:1}],['Not sure',{}]]},
  {q:'Which experience matters most to you?',o:[['Running the country now',{tinubu:2}],['Vice president for 8 years',{atiku:2}],['Running a state frugally',{obi:2}]]},
  {q:'Continuity or change in 2027?',o:[['Continuity',{tinubu:2}],['Change',{atiku:1,obi:1}],['Depends on the plan',{}]]}
];
const KB = [
  ['When is the presidential election?','Saturday 16 January 2027. Governorship and state assembly elections follow on 6 February 2027.','inecTime'],
  ['How many people are registered to vote?','About 110 million. Lagos (7.49M), Kano (6.57M) and Kaduna (4.66M) have the most.','voters'],
  ['Who are the main candidates?','Bola Tinubu (APC, running mate Kashim Shettima), Atiku Abubakar (ADC, running mate Rotimi Amaechi) and Peter Obi (NDC, running mate Rabiu Kwankwaso). 18 parties field candidates.','wiki27'],
  ['What happened in 2023?','Tinubu won with 8.79M votes (36.6%). Atiku had 6.98M (29.1%), Obi 6.10M (25.4%), Kwankwaso 1.50M (6.2%). Only 26.7% of registered voters voted.','wiki23'],
  ['How many people did not vote in 2023?','About 68.5 million registered voters stayed home. The winning margin was 1.81 million.','wiki23'],
  ['What is the poverty rate?','The World Bank estimates 63% of Nigerians (about 140 million) lived in poverty in 2025, up from 56% in 2023.','poverty'],
  ['How much is petrol now?','Around ₦1,335 a litre in November 2026, compared with about ₦185 before May 2023.','fuel'],
  ['What is inflation now?','Headline inflation was 14.63% in September 2026 (rebased index). Food inflation was 19.59%.','inflation'],
  ['How fast is the economy growing?','Real GDP grew 4.43% year on year in Q2 2026, the best quarter in years. The 2022 campaign target was 12% a year.','gdp'],
  ['Did Tinubu deliver 15,000 megawatts of electricity?','No. The grid\'s record peak is 5,802 MW (March 2025), against a promise of 15,000 MW.','power25'],
  ['What did Tinubu promise in 2022?','Among others: 12% growth a year, 15,000 MW of electricity, meter-based billing for all, and an end to extreme poverty.','growth22'],
  ['Was the $30 billion foreign investment claim true?','No. FactCheckHub rated it FALSE: NBS data shows about $363 million over nine months.','fch24'],
  ['Was the Ways and Means debt cleared?','FactCheckHub rated the claim MISLEADING: the debt was converted into a 40-year loan, not paid off.','fch24'],
  ['What is the $460,000 forfeiture?','In 1993 Tinubu forfeited $460,000 in a US civil case. His side calls it a settlement, not a conviction, and a 2023 tribunal agreed it was not a conviction.','tinubu460'],
  ['What is the Atiku US Senate report?','A 2010 US Senate subcommittee report said $40M in "suspect funds" entered the US through accounts of his then-wife. Atiku says no court has found him guilty.','atikuPSI'],
  ['What are the Pandora Papers about Peter Obi?','In 2021 the Pandora Papers reported offshore companies Obi did not declare while governor. He says he broke no law.','obiPandora'],
  ['What is Atiku promising?','Restoring a form of fuel subsidy, restructuring the federation, job-led growth and lower costs of governance.','atikuPitch'],
  ['What is Peter Obi promising?','Moving Nigeria from consumption to production: growing food, making goods and creating jobs at home.','obiPitch'],
  ['What is Tinubu promising for 2027?','Continuing his reforms toward a $1 trillion economy by 2030, and he says poverty "will go".','tinubuPitch'],
  ['Who is likely to win?','No scientific vote-intention poll has been published. SBM Intelligence\'s favourability tracker rated Obi +58.3 and Tinubu −58.5 (a sentiment snapshot, not a forecast). A self-selected online poll by an anti-Tinubu group put Atiku ahead. Turnout will decide.','noPolls'],
  ['How do I make my vote count?','Collect your PVC, know your polling unit, go early, stay until results are counted and posted, then check your unit\'s result on INEC\'s IReV portal.','inecTime'],
  ['How much did the Auditor-General flag?','Over ₦1.34 trillion in irregularities and lapses across ministries and agencies, in the report sent to the National Assembly in July 2026.','audit'],
  ['Is Emefiele in court?','Yes. The former CBN governor faces an amended 20-count charge. He denies the charges. He has not been convicted.','emefiele'],
  ['What about the cash transfers to the poor?','Auditors could not confirm that ₦33.75bn sent to 3.29M households in 2023 reached real beneficiaries. The office disputes part of this.','cash'],
  ['Did lawmakers get SUVs?','Yes. ₦70bn was allocated for Toyota Prado SUVs for 469 lawmakers in the amended 2022 supplementary budget, approved in 2023.','dub5']
];

