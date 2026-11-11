// Wraps a page's body in the shared document: head, skip link, HUD, header, command bar, footer, scripts.
import { esc, jsonLd } from './util.mjs';
import { sprite } from '../partials/icons.mjs';
import { header } from '../partials/header.mjs';
import { footer } from '../partials/footer.mjs';
import { cmdShell } from '../partials/cmd.mjs';

export function layout(ctx, page) {
  const { cfg } = ctx;
  const gl = page.gl || 'off';
  const canonical = ctx.abs(page.path);
  const ogImage = page.ogImage || ctx.abs('assets/emblem.webp');
  const css = ['base', ...(page.css || [])];
  const js = ['core', ...(page.js || [])];
  const desc = page.description;

  // Runs before first paint: marks the page as JS-enabled, finds out whether WebGL is usable and (on the tunnel page) picks 3D or the plain grid,
  // so the right layout is in place from the first frame.
  const boot = `window.MC={root:${JSON.stringify(ctx.root)},idx:${JSON.stringify(ctx.idx)},mode:${JSON.stringify(gl)}};` +
    `(function(){var d=document.documentElement,M=window.MC;d.classList.add('js');M.file=location.protocol==='file:';` +
    `try{M.reduce=matchMedia('(prefers-reduced-motion: reduce)').matches}catch(e){M.reduce=false}` +
    (gl === 'off' ? `M.canGL=false;M.gl=false;` :
      `try{var c=document.createElement('canvas'),g=c.getContext('webgl2')||c.getContext('webgl');M.canGL=!!g;if(g){var l=g.getExtension('WEBGL_lose_context');if(l)l.loseContext()}}catch(e){M.canGL=false}` +
      `M.gl=!!M.canGL&&!M.file;` +
      (gl === 'tunnel' ? `if(M.reduce||/[?&]view=grid/.test(location.search))M.gl=false;if(M.gl)d.classList.add('gl-on');` : '')) +
    `if(!M.gl)d.classList.add('no-gl');})();`;

  const baseTag = page.baseHref ? `<base href="${esc(page.baseHref)}">\n` : '';
  const fonts = ['archivo-var-latin', 'jetbrains-mono-var-latin'].map(f => `<link rel="preload" href="${ctx.asset(`assets/fonts/${f}.woff2`)}" as="font" type="font/woff2" crossorigin>`).join('\n');

  return `<!doctype html>
<html lang="en" data-gl="${gl}" data-page="${esc(page.key)}">
<head>
<meta charset="utf-8">
${baseTag}<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#030304">
<meta name="color-scheme" content="dark">
<title>${esc(page.title)}</title>
<meta name="description" content="${esc(desc)}">
${page.noindex ? '<meta name="robots" content="noindex">\n' : `<link rel="canonical" href="${esc(canonical)}">\n`}<link rel="icon" href="${ctx.asset('assets/emblem.webp')}" type="image/webp">
<link rel="apple-touch-icon" href="${ctx.asset('assets/emblem.webp')}">
<link rel="manifest" href="${ctx.asset('site.webmanifest')}">
<meta property="og:site_name" content="MONOCHROME®">
<meta property="og:type" content="${page.ogType || 'website'}">
<meta property="og:title" content="${esc(page.ogTitle || page.title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${esc(canonical)}">
<meta property="og:image" content="${esc(ogImage)}">
<meta name="twitter:card" content="${page.ogImage ? 'summary_large_image' : 'summary'}">
${fonts}
<script>${boot}</script>
${css.map(c => `<link rel="stylesheet" href="${ctx.asset(`css/${c}.css`)}">`).join('\n')}
${(page.jsonld || []).map(jsonLd).join('\n')}
</head>
<body class="p-${esc(page.key)}">
${sprite}
<a class="skip" href="#main">Skip to content</a>
<div class="progress" id="progress" aria-hidden="true"></div>
<div class="veil" id="veil" aria-hidden="true"></div>
<div class="grain" aria-hidden="true"></div>
<div class="hud hud-l" aria-hidden="true"><span id="hudCh">${esc(page.hud || 'CH.00')}</span><i></i><span id="hudDepth">DEPTH 000.0 M</span></div>
<div class="hud hud-r" aria-hidden="true"><span id="hudVel">VEL +0.00</span><i></i><span id="hudClock">REGINA SK --:--:--</span></div>
<div class="cursor" id="cursor" aria-hidden="true"><span id="cursorTxt">OPEN</span></div>

${header(ctx, page)}

<main id="main" tabindex="-1">
${page.body}
</main>
${page.afterMain || ''}
${footer(ctx, page)}
${cmdShell()}

<script src="${ctx.asset('config.js')}" defer></script>
${js.map(j => `<script src="${ctx.asset(`js/${j}.js`)}" defer></script>`).join('\n')}
</body>
</html>
`;
}
