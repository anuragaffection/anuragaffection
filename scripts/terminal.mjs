// Draws assets/terminal.svg: a terminal that types three commands and their answers.
// Pure SVG + CSS animation (GitHub shows it as an image, no scripts needed).
// Edit LINES and run: node scripts/terminal.mjs

import { writeFileSync } from "node:fs";

const LINES = [
  { cmd: "whoami", out: "Anurag · Developer × Educator" },
  { cmd: "cat stack.txt", out: "MERN · Go · Java · DSA · AWS · Flutter" },
  { cmd: "echo $MOTTO", out: "सीखना और सिखाना — learn, and teach." },
];

const W = 720;
const LINE_H = 26;
const TOP = 58;
const CHAR_S = 0.06; // typing speed per character
const PAUSE = 0.5;

const esc = (t) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

let t = 0.4;
let y = TOP;
const css = [];
const rows = [];
LINES.forEach((line, i) => {
  const typeDur = line.cmd.length * CHAR_S;
  // command: revealed left-to-right by a clip that grows with the typing
  rows.push(
    `<g><text x="24" y="${y}" class="p">$</text>` +
      `<clipPath id="c${i}"><rect x="40" y="${y - 18}" height="24" width="0" class="w${i}"/></clipPath>` +
      `<text x="42" y="${y}" class="cmd" clip-path="url(#c${i})">${esc(line.cmd)}</text></g>`,
  );
  css.push(
    `.w${i}{animation:w${i} ${typeDur}s steps(${line.cmd.length}) ${t}s forwards}` +
      `@keyframes w${i}{to{width:${line.cmd.length * 10 + 4}px}}`,
  );
  t += typeDur + PAUSE;
  y += LINE_H;
  // output: fades in after the command is typed
  rows.push(`<text x="24" y="${y}" class="out o${i}">${esc(line.out)}</text>`);
  css.push(`.o${i}{opacity:0;animation:show .3s ${t}s forwards}`);
  t += PAUSE;
  y += LINE_H + 8;
});
// blinking cursor on the last prompt
rows.push(`<text x="24" y="${y}" class="p">$</text><rect x="42" y="${y - 15}" width="9" height="18" class="cur"/>`);
const H = y + 24;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Anurag: Developer × Educator. MERN, Go, Java, DSA, AWS, Flutter. सीखना और सिखाना — learn, and teach.">
<style>
text{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,"Noto Sans Devanagari",monospace;font-size:16px}
.p{fill:#3fb950}.cmd{fill:#e6edf3}.out{fill:#8b949e}
.cur{fill:#e6edf3;animation:blink 1s step-end infinite}
@keyframes blink{50%{opacity:0}}@keyframes show{to{opacity:1}}
${css.join("\n")}
</style>
<rect width="${W}" height="${H}" rx="12" fill="#0d1117" stroke="#30363d"/>
<circle cx="22" cy="20" r="6" fill="#ff5f56"/><circle cx="42" cy="20" r="6" fill="#ffbd2e"/><circle cx="62" cy="20" r="6" fill="#27c93f"/>
<text x="${W / 2}" y="25" text-anchor="middle" fill="#6e7681" style="font-size:13px">anurag@github: ~</text>
${rows.join("\n")}
</svg>
`;
writeFileSync("assets/terminal.svg", svg);
console.log(`assets/terminal.svg (${W}×${H}, ${t.toFixed(1)}s of animation)`);
