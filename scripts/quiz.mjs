// README quiz: a question lives in README.md, answers arrive as GitHub issues titled
// "quiz: Q<id> <A-D>", and the workflow (.github/workflows/quiz.yml) runs this script.
//
//   node scripts/quiz.mjs answer   ISSUE_TITLE / ISSUE_USER from the issue -> reply.md + state
//   node scripts/quiz.mjs rotate   pick the next question (daily schedule)
//   node scripts/quiz.mjs render   only redraw README.md from quiz/state.json
//
// No dependencies. The issue title is untrusted input: it is only ever matched by a strict
// regex, never put into a shell command or the README as-is.

import { readFileSync, writeFileSync } from "node:fs";

const REPO = "anuragaffection/anuragaffection";
const QUESTIONS = JSON.parse(readFileSync("quiz/questions.json", "utf8"));
const STATE_FILE = "quiz/state.json";
const LETTERS = ["A", "B", "C", "D"];

const loadState = () => JSON.parse(readFileSync(STATE_FILE, "utf8"));
const saveState = (s) => writeFileSync(STATE_FILE, JSON.stringify(s, null, 2) + "\n");
const byId = (id) => QUESTIONS.find((q) => q.id === id);

/** Next question: one not asked in this round; a new round starts when all were asked. */
function rotate(state) {
  let left = QUESTIONS.filter((q) => !state.asked.includes(q.id) && q.id !== state.current);
  if (left.length === 0) {
    state.asked = [];
    left = QUESTIONS.filter((q) => q.id !== state.current);
  }
  const next = left[Math.floor(Math.random() * left.length)];
  if (state.current) state.asked.push(state.current);
  state.current = next.id;
  state.tried = {}; // login -> letters tried on this question
  state.since = new Date().toISOString();
}

const answerLink = (q, letter) => {
  const title = encodeURIComponent(`quiz: Q${q.id} ${letter}`);
  const body = encodeURIComponent(
    "Just press **Create** below — a bot checks your answer, replies here in about a minute and updates the leaderboard.",
  );
  return `https://github.com/${REPO}/issues/new?title=${title}&body=${body}`;
};

function quizBlock(state) {
  const q = byId(state.current);
  const cell = (i) => `<a href="${answerLink(q, LETTERS[i])}"><b>${LETTERS[i]}</b>&nbsp;&nbsp;${escapeHtml(q.options[i])}</a>`;
  const last = state.lastSolved
    ? `<sub>Last one (${escapeHtml(byId(state.lastSolved.id)?.topic ?? "")}) solved by <a href="https://github.com/${state.lastSolved.login}">@${state.lastSolved.login}</a></sub>`
    : `<sub>Be the first to solve one!</sub>`;
  return [
    `<p><code>${escapeHtml(q.topic)}</code>&nbsp; <b>${escapeHtml(q.q)}</b></p>`,
    "",
    "<table>",
    `<tr><td>${cell(0)}</td><td>${cell(1)}</td></tr>`,
    `<tr><td>${cell(2)}</td><td>${cell(3)}</td></tr>`,
    "</table>",
    "",
    `<sub>Click an answer → press <b>Create</b> on the issue page → the bot replies. A new question appears when someone gets it right, and every morning.</sub><br>`,
    last,
  ].join("\n");
}

function boardBlock(state) {
  const rows = Object.entries(state.leaderboard)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 10);
  if (rows.length === 0) return "<sub>No one yet — your avatar could be the first here.</sub>";
  return rows
    .map(
      ([login, n]) =>
        `<a href="https://github.com/${login}" title="@${login}: ${n} correct"><img src="https://github.com/${login}.png?size=48" width="40" height="40" alt="@${login}"></a><sup>&nbsp;${n}</sup>`,
    )
    .join("&nbsp;&nbsp;");
}

const escapeHtml = (t) =>
  String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function render(state) {
  let readme = readFileSync("README.md", "utf8");
  const put = (name, html) => {
    const re = new RegExp(`(<!-- ${name}:START -->)[\\s\\S]*?(<!-- ${name}:END -->)`);
    if (!re.test(readme)) throw new Error(`README.md has no ${name} markers`);
    readme = readme.replace(re, `$1\n${html}\n$2`);
  };
  put("QUIZ", quizBlock(state));
  put("BOARD", boardBlock(state));
  writeFileSync("README.md", readme);
}

function answer(state) {
  const title = process.env.ISSUE_TITLE ?? "";
  const login = process.env.ISSUE_USER ?? "";
  const m = /^quiz:\s*Q(\d{1,3})\s+([ABCD])\s*$/i.exec(title.trim());
  if (!m || !/^[A-Za-z0-9-]{1,39}$/.test(login)) {
    writeFileSync("reply.md", "🤔 I couldn't read that answer. Please use one of the answer links in the README.");
    return;
  }
  const id = Number(m[1]);
  const letter = m[2].toUpperCase();
  const q = byId(state.current);

  if (id !== state.current) {
    writeFileSync(
      "reply.md",
      `⏱️ That question was already replaced by a new one. Have a look at the [current question](https://github.com/${REPO}) and try again!`,
    );
    return;
  }

  const tried = (state.tried[login] ??= []);
  if (!tried.includes(letter)) tried.push(letter);
  const correct = LETTERS[q.answer];

  if (letter === correct) {
    state.leaderboard[login] = (state.leaderboard[login] ?? 0) + 1;
    state.lastSolved = { id: q.id, login };
    rotate(state);
    writeFileSync(
      "reply.md",
      [
        `✅ **Correct, @${login}!** It's **${correct}) ${q.options[q.answer]}**.`,
        "",
        `> ${q.why}`,
        "",
        `You now have **${state.leaderboard[login]}** on the [leaderboard](https://github.com/${REPO}). A new question is live — go get it! 🧠`,
      ].join("\n"),
    );
  } else {
    writeFileSync(
      "reply.md",
      `❌ **Not quite, @${login}** — ${letter}) isn't it. The question is still open: pick another answer in the [README](https://github.com/${REPO}).`,
    );
  }
}

const cmd = process.argv[2];
const state = loadState();
if (cmd === "answer") answer(state);
else if (cmd === "rotate") rotate(state);
else if (cmd !== "render") throw new Error(`unknown command: ${cmd}`);
saveState(state);
render(state);
