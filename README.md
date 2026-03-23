# Feynman

`feynman` is a research-first CLI built on `@mariozechner/pi-coding-agent`.

It keeps the useful parts of a coding agent:
- file access
- shell execution
- persistent sessions
- custom extensions

But it biases the runtime toward general research work:
- literature review
- source discovery and paper lookup
- source comparison
- research memo writing
- paper and report drafting
- session recall and durable research memory
- recurring and deferred research jobs
- replication planning when relevant

The primary paper backend is `@companion-ai/alpha-hub` and your alphaXiv account.
The rest of the workflow is augmented through a curated `.pi/settings.json` package stack.

## Install

```bash
npm install -g @companion-ai/feynman
```

Then authenticate alphaXiv and start the CLI:

```bash
feynman setup
feynman
```

For local development:

```bash
cd /Users/advaitpaliwal/Companion/Code/feynman
npm install
cp .env.example .env
npm run start
```

Feynman uses Pi under the hood, but the user-facing entrypoint is `feynman`, not `pi`.
When you run `feynman`, it launches the real Pi interactive TUI with Feynman's research extensions, prompt templates, package stack, memory snapshot, and branded defaults preloaded.

Most users should not need slash commands. The intended default is:
- ask naturally
- let Feynman route into the right workflow
- use slash commands only as explicit shortcuts or overrides

## Commands

Inside the REPL:

- `/help` shows local commands
- `/init` bootstraps `AGENTS.md` and `notes/session-logs/`
- `/alpha-login` signs in to alphaXiv
- `/alpha-status` checks alphaXiv auth
- `/new` starts a new persisted session
- `/exit` quits
- `/deepresearch <topic>` runs a thorough source-heavy investigation workflow
- `/lit <topic>` expands the literature-review prompt template
- `/review <artifact>` simulates a peer review for an AI research artifact
- `/audit <item>` expands the paper/code audit prompt template
- `/replicate <paper or claim>` expands the replication prompt template
- `/draft <topic>` expands the paper-style writing prompt template
- `/compare <topic>` expands the source comparison prompt template
- `/autoresearch <idea>` expands the autonomous experiment loop
- `/watch <topic>` schedules or prepares a recurring research watch
- `/log` writes a durable session log to `notes/`
- `/jobs` inspects active background work

Package-powered workflows inside the REPL:

- `/agents` opens the subagent and chain manager
- `/run` and `/parallel` delegate work to subagents when you want explicit decomposition
- `/ps` opens the background process panel
- `/schedule-prompt` manages recurring and deferred jobs
- `/search` opens indexed session search
- `/preview` previews generated artifacts in the terminal, browser, or PDF

Outside the REPL:

- `feynman setup` runs the guided setup for model auth, alpha login, Pi web access, and preview deps
- `feynman model login <provider>` logs into a Pi OAuth model provider from the outer Feynman CLI
- `feynman --alpha-login` signs in to alphaXiv
- `feynman --alpha-status` checks alphaXiv auth
- `feynman --doctor` checks models, auth, preview dependencies, and branded settings
- `feynman --setup-preview` installs `pandoc` automatically on macOS/Homebrew systems when preview support is missing

## Web Search Routing

Feynman v1 keeps web access simple: it uses the bundled `pi-web-access` package directly instead of maintaining a second Feynman-owned provider layer.

The Pi web stack underneath supports three runtime routes:

- `auto` — prefer Perplexity when configured, otherwise fall back to Gemini
- `perplexity` — force Perplexity Sonar
- `gemini` — force Gemini

By default, the expected path is zero-config Gemini Browser via a signed-in Chromium profile. Advanced users can edit `~/.pi/web-search.json` directly if they want Gemini API keys, Perplexity keys, or a different route.

Useful commands:

- `feynman search status` — show the active Pi web-access route and config path

## Custom Tools

The starter extension adds:

- `alpha_search` for alphaXiv-backed paper discovery
- `alpha_get_paper` for fetching paper reports or raw text
- `alpha_ask_paper` for targeted paper Q&A
- `alpha_annotate_paper` for persistent local notes
- `alpha_list_annotations` for recall across sessions
- `alpha_read_code` for reading a paper repository
- `session_search` for recovering prior Feynman work from stored transcripts
- `preview_file` for browser/PDF review of generated artifacts

Feynman also ships bundled research subagents in `.pi/agents/`:

- `researcher` for evidence gathering
- `reviewer` for peer-review style criticism
- `writer` for polished memo and draft writing
- `citation` for inline citations and source verification

Feynman uses `@companion-ai/alpha-hub` directly in-process rather than shelling out to the CLI.

## Curated Pi Stack

Feynman loads a lean research stack from [.pi/settings.json](/Users/advaitpaliwal/Companion/Code/feynman/.pi/settings.json):

- `pi-subagents` for parallel literature gathering and decomposition
- `pi-btw` for fast side-thread /btw conversations without interrupting the main run
- `pi-docparser` for PDFs, Office docs, spreadsheets, and images
- `pi-web-access` for broader web, GitHub, PDF, and media access
- `pi-markdown-preview` for polished Markdown and LaTeX-heavy research writeups
- `@walterra/pi-charts` for charts and quantitative visualizations
- `pi-generative-ui` for interactive HTML-style widgets
- `pi-mermaid` for diagrams in the TUI
- `@aliou/pi-processes` for long-running experiments and log tails
- `pi-zotero` for citation-library workflows
- `@kaiserlich-dev/pi-session-search` for indexed session recall and summarize/resume UI
- `pi-schedule-prompt` for recurring and deferred research jobs
- `@samfp/pi-memory` for automatic preference/correction memory across sessions

The default expectation is source-grounded outputs with explicit `Sources` sections containing direct URLs and durable artifacts written to `outputs/`, `notes/`, `experiments/`, or `papers/`.

## Layout

```text
feynman/
├── .pi/agents/   # Bundled research subagents and chains
├── extensions/   # Custom research tools
├── papers/       # Polished paper-style drafts and writeups
├── prompts/      # Slash-style prompt templates
└── src/          # Branded launcher around the embedded Pi TUI
```
