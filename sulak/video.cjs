// Видео-облёт MP4 по видам работ. Запуск: node sulak/video.cjs  (после build.mjs)
const { chromium } = require(process.env.PW || '/opt/node-tools/node_modules/playwright');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const here = __dirname;
const TOUR = require('./src/tour.js');
const viewer = path.join(here, 'dist', 'Сулак_3069-ЭС_3D.html');
const out = process.env.OUT || path.join(here, 'dist', 'Сулак_3069-ЭС_видео.mp4');
const tmp = process.env.FRAMES || path.join(here, '.frames');
const FPS = +(process.env.FPS || 25), SEG = 6.0, FLY = 1.4, W = 1280, H = 720;

const ease = k => k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
const lerp = (a, b, k) => a.map((v, i) => v + (b[i] - v) * k);
function orbit(p, c, ang) { // поворот камеры вокруг цели по вертикальной оси
  const dx = p[0] - c[0], dz = p[2] - c[2], s = Math.sin(ang), co = Math.cos(ang);
  return [c[0] + dx * co - dz * s, p[1], c[2] + dx * s + dz * co];
}
const SWAY = 0.16; // рад, плавный доворот за время показа

(async () => {
  fs.rmSync(tmp, { recursive: true, force: true }); fs.mkdirSync(tmp, { recursive: true });
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto('file://' + viewer);
  await page.addStyleTag({ content: '#side,#hint,#bar,#card,#tip{display:none!important} #app{grid-template-columns:1fr!important}' });
  await page.evaluate(() => { window.__paused = true; window.__onlySel = true; window.dispatchEvent(new Event('resize')); });
  await page.waitForTimeout(800);
  if (errs.length) throw new Error(errs.join('\n'));

  let f = 0;
  for (let i = 0; i < TOUR.length; i++) {
    const s = TOUR[i], prev = TOUR[i - 1];
    await page.evaluate(([tag, also]) => { window.__also = also; window.__sulak.hl(tag); }, [s.tag, s.also || []]);
    const n = Math.round(SEG * FPS);
    for (let k = 0; k < n; k++) {
      const tsec = k / FPS;
      const hold = Math.max(0, tsec - (prev ? FLY : 0)) / (SEG - (prev ? FLY : 0));
      const endP = orbit(s.p, s.c, -SWAY / 2);
      let p = orbit(s.p, s.c, -SWAY / 2 + SWAY * hold), c = s.c;
      if (prev && tsec < FLY) {
        const e = ease(tsec / FLY), pp = orbit(prev.p, prev.c, SWAY / 2);
        p = lerp(pp, endP, e); c = lerp(prev.c, s.c, e);
      }
      await page.evaluate(([p, c, cap]) => window.__sulak.frame(p, c, cap), [p, c, [s.t, s.a, s.b, s.n]]);
      fs.writeFileSync(path.join(tmp, String(f++).padStart(5, '0') + '.jpg'), await page.screenshot({ type: 'jpeg', quality: 92 }));
    }
    process.stdout.write(`${i + 1}/${TOUR.length} `);
  }
  await browser.close();
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', path.join(tmp, '%05d.jpg'),
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'medium', '-crf', '22', '-movflags', '+faststart', out]);
  if (!process.env.KEEP) fs.rmSync(tmp, { recursive: true, force: true });
  console.log('\n' + out, (fs.statSync(out).size / 1048576).toFixed(1) + ' MB');
})();
