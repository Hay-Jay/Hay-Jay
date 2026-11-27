// Renders every video in videos.js to a 1080x1920 30fps MP4 (TikTok / Reels / Shorts)
// with narration, plus one PNG per scene for Instagram carousels.
//   node render.mjs              -> all videos
//   node render.mjs why-obi      -> just one
//   node render.mjs --silent     -> no narration
// Needs: Node 18+, Playwright (with Chromium), ffmpeg, and for narration: pip install edge-tts
import { createRequire } from 'node:module';
import { spawn, execFileSync } from 'node:child_process';
import { mkdirSync, existsSync, readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import os from 'node:os';
import path from 'node:path';

// createRequire also honours NODE_PATH / globally installed Playwright.
const { chromium } = createRequire(import.meta.url)('playwright');
const here = path.dirname(fileURLToPath(import.meta.url));
const FPS = 30;
const VO_LEAD = 0.25;   // seconds of quiet before each scene's line
const VO_TAIL = 0.55;   // breathing room after it
const PARALLEL = Math.max(1, Math.min(3, os.cpus().length - 1));
const args = process.argv.slice(2);
const silent = args.includes('--silent');
const only = args.filter(a => !a.startsWith('--'));
for (const d of ['videos', 'stills', 'vo']) mkdirSync(path.join(here, d), { recursive: true });

const run = (cmd, a) => new Promise((res, rej) => {
  const p = spawn(cmd, a, { stdio: ['ignore', 'inherit', 'inherit'] });
  p.on('close', c => (c === 0 ? res() : rej(new Error(`${cmd} exit ${c}`))));
});
const probe = f => +execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).toString().trim();
const nn = i => String(i + 1).padStart(2, '0');
// Emotion -> delivery for the Edge voice: [rate offset %, pitch Hz, volume %].
const MOODS = { calm: [-4, 0, 0], serious: [-2, -2, 0], grave: [-10, -6, 0], hopeful: [0, 3, 0], urgent: [8, 4, 5], fired: [12, 8, 10] };
function moodProsody(mood, base, basePitch = 0, pitchScale = 1) {
  const [r, p, v] = MOODS[mood] || MOODS.serious;
  const sign = n => (n >= 0 ? '+' : '') + n;
  return [sign(parseInt(base, 10) + r) + '%', sign(basePitch + Math.round(p * pitchScale)) + 'Hz', sign(v) + '%'];
}

// Sound effects, synthesised once (no third-party audio): a soft whoosh for cuts, a low hit for stamps.
const SFX = { whoosh: path.join(here, 'assets', 'sfx', 'whoosh.wav'), hit: path.join(here, 'assets', 'sfx', 'hit.wav') };
mkdirSync(path.dirname(SFX.whoosh), { recursive: true });
if (!existsSync(SFX.whoosh)) await run('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'lavfi', '-i', 'anoisesrc=d=0.5:c=pink:a=0.6:r=44100',
  '-af', 'highpass=f=400,lowpass=f=5000,afade=t=in:d=0.3:curve=exp,afade=t=out:st=0.3:d=0.2:curve=exp,aformat=channel_layouts=stereo', SFX.whoosh]);
if (!existsSync(SFX.hit)) await run('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'lavfi', '-i', "aevalsrc='0.9*sin(2*PI*110*t*exp(-5*t))*exp(-9*t)':d=0.45:s=44100",
  '-af', 'lowpass=f=1200,aformat=channel_layouts=stereo', SFX.hit]);

const browser = await chromium.launch();
const pageUrl = pathToFileURL(path.join(here, 'studio.html')).href + '?render=1';
async function openPage() {
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  await page.goto(pageUrl);
  await page.evaluate(() => window.__ready);
  return page;
}

// ---- 1. narration clips (cached by text) and scene timing for every video ----
const meta = await openPage();
const { videos, voice, voices } = await meta.evaluate(() => ({
  voice: window.VOICE, voices: window.VOICES || {},
  videos: VIDEOS.map(v => ({ id: v.id, sfx: v.sfx, clone: v.voice === 'clone', pre: v.voice === 'eleven', vkey: typeof v.voice === 'string' && !['clone', 'eleven'].includes(v.voice) ? v.voice : null, durs: v.scenes.map(s => s.dur), lines: (window.NARRATION || {})[v.id] || [] })),
}));
await meta.close();

// Cloned voice: mood -> [exaggeration, cfg_weight] (higher exaggeration = more emotion; lower cfg = slower, weightier)
const CLONE = { calm: [0.45, 0.5], serious: [0.55, 0.45], grave: [0.6, 0.4], hopeful: [0.55, 0.5], urgent: [0.7, 0.45], fired: [0.8, 0.35] };
const CLONE_PY = process.env.CLONE_PY || 'python3';  // set CLONE_PY to the Python that has chatterbox-tts
const timing = {};
for (const v of videos.filter(v => v.clone && !silent && (!only.length || only.includes(v.id)))) {
  const dir = path.join(here, 'vo', v.id); mkdirSync(dir, { recursive: true });
  const jobs = [];
  v.lines.forEach((line, i) => {
    const [mood, text] = Array.isArray(line) ? line : ['serious', line]; if (!text) return;
    const [ex, cfg] = CLONE[mood] || CLONE.serious;
    const out = path.join(dir, `${nn(i)}.wav`), txt = path.join(dir, `${nn(i)}.txt`), key = `clone|${ex}|${cfg}|${text}`;
    if (!existsSync(out) || !existsSync(txt) || readFileSync(txt, 'utf8') !== key) jobs.push({ text, out, ex, cfg, txt, key });
  });
  if (jobs.length) {
    const jf = path.join(dir, 'jobs.json'); writeFileSync(jf, JSON.stringify(jobs));
    await run(CLONE_PY, [path.join(here, 'clonevoice.py'), jf]);
    jobs.forEach(j => writeFileSync(j.txt, j.key));
  }
}
for (const v of videos) {
  const dir = path.join(here, 'vo', v.id);
  mkdirSync(dir, { recursive: true });
  v.clips = [];
  for (let i = 0; i < v.durs.length; i++) {
    const line = v.lines[i];
    const [mood, text, lineVoice] = Array.isArray(line) ? line : ['serious', line];
    const vc = voices[lineVoice || v.vkey] || voice;
    const [rate, pitch, vol] = moodProsody(mood, vc.rate, vc.pitch || 0, vc.pitchScale ?? 1);
    if (silent || !text) { v.clips.push(null); continue; }
    if (v.pre) {
      // ElevenLabs narration is generated ahead of time (via the ElevenLabs connector) as vo/<id>/NN.mp3.
      const mp3 = path.join(dir, `${nn(i)}.mp3`);
      if (!existsSync(mp3)) { console.warn(`missing ${mp3}`); v.clips.push(null); continue; }
      const len = probe(mp3); v.clips.push({ mp3, len });
      v.durs[i] = Math.max(v.durs[i], +(VO_LEAD + len + VO_TAIL).toFixed(2)); continue;
    }
    if (v.clone) {
      const wav = path.join(dir, `${nn(i)}.wav`);
      if (!existsSync(wav)) { v.clips.push(null); continue; }
      const len = probe(wav); v.clips.push({ mp3: wav, len });
      v.durs[i] = Math.max(v.durs[i], +(VO_LEAD + len + VO_TAIL).toFixed(2)); continue;
    }
    const mp3 = path.join(dir, `${nn(i)}.mp3`), txt = path.join(dir, `${nn(i)}.txt`);
    const key = `${vc.name}|${rate}|${pitch}|${vol}|${text}`;
    if (!existsSync(mp3) || !existsSync(txt) || readFileSync(txt, 'utf8') !== key) {
      process.stdout.write(`voice ${v.id} ${nn(i)}\n`);
      await run('python3', [path.join(here, 'voiceover.py'), vc.name, rate, text, mp3, pitch, vol]);
      writeFileSync(txt, key);
    }
    const len = probe(mp3);
    v.clips.push({ mp3, len });
    v.durs[i] = Math.max(v.durs[i], +(VO_LEAD + len + VO_TAIL).toFixed(2));
  }
  timing[v.id] = v.durs;
}
if (!silent) writeFileSync(path.join(here, 'vo', 'timing.js'),
  '// Generated by render.mjs: scene lengths stretched to fit the narration.\nwindow.VO_TIMING = ' + JSON.stringify(timing, null, 1) + ';\n');

// ---- 2. render ----
async function renderVideo(v) {
  const page = await openPage();
  const duration = await page.evaluate(async ([id, durs]) => { window.__build(id, durs); await window.__fitted; return window.__duration; }, [v.id, v.durs]);
  await page.evaluate(() => Promise.all([...document.images].map(i => i.decode?.().catch(() => {}))));

  // narration track: each clip placed at its scene start + lead-in
  const tmp = mkdtempSync(path.join(os.tmpdir(), 'vo-'));
  const track = path.join(tmp, 'track.wav');
  const clips = v.clips.map((c, i) => c && { ...c, at: v.durs.slice(0, i).reduce((a, b) => a + b, 0) + VO_LEAD }).filter(Boolean);
  if (clips.length && v.sfx !== false) {
    const cues = await page.evaluate(() => window.__sfx());
    cues.cuts.forEach(at => clips.push({ mp3: SFX.whoosh, at: Math.max(0, at - 0.18), gain: 0.35 }));
    cues.hits.forEach(at => clips.push({ mp3: SFX.hit, at, gain: 0.5 }));
  }
  if (clips.length) {
    const inputs = clips.flatMap(c => ['-i', c.mp3]);
    const fx = clips.map((c, i) => `[${i}:a]aresample=44100,aformat=channel_layouts=stereo,volume=${c.gain || 1},adelay=${Math.round(c.at * 1000)}:all=1[a${i}]`).join(';')
      + ';' + clips.map((_, i) => `[a${i}]`).join('') + `amix=inputs=${clips.length}:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=11[out]`;
    await run('ffmpeg', ['-y', '-loglevel', 'error', ...inputs, '-filter_complex', fx, '-map', '[out]', '-ar', '44100', track]);
  }
  const audioIn = clips.length ? ['-i', track] : ['-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100'];

  const frames = Math.round(duration * FPS);
  const out = path.join(here, 'videos', `${v.id}.mp4`);
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-', ...audioIn,
    '-map', '0:v', '-map', '1:a', '-af', 'apad', '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p', '-profile:v', 'high',
    '-r', String(FPS), '-c:a', 'aac', '-b:a', '128k', '-shortest', '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((res, rej) => ff.on('close', c => (c === 0 ? res() : rej(new Error('ffmpeg exit ' + c)))));
  for (let i = 0; i < frames; i++) {
    await page.evaluate(t => window.__seek(t), i / FPS);
    const buf = await page.screenshot({ type: 'jpeg', quality: 92 });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (i % 300 === 0) console.log(`${v.id}: ${i}/${frames}`);
  }
  ff.stdin.end();
  await done;
  console.log(`${v.id}: ${frames} frames (${duration.toFixed(1)}s) -> videos/${v.id}.mp4`);

  const scenes = await page.evaluate(() => window.__scenes());
  for (const [n, s] of scenes.entries()) {
    await page.evaluate(t => window.__seek(t), s.start + s.dur - (n === scenes.length - 1 ? 0.05 : 0.35));
    await page.screenshot({ path: path.join(here, 'stills', `${v.id}-${nn(n)}.png`) });
  }
  await page.close();
}

const queue = videos.filter(v => !only.length || only.includes(v.id));
await Promise.all(Array.from({ length: PARALLEL }, async () => { while (queue.length) await renderVideo(queue.shift()); }));
await browser.close();
