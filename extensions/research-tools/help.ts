import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

type HelpCommand = { usage: string; description: string };
type HelpSection = { title: string; commands: HelpCommand[] };

function buildHelpSections(): HelpSection[] {
	return [
		{
			title: "Research Workflows",
			commands: [
				{ usage: "/deepresearch <topic>", description: "Source-heavy investigation with parallel researchers." },
				{ usage: "/lit <topic>", description: "Literature review using paper search." },
				{ usage: "/review <artifact>", description: "Simulated peer review with objections and revision plan." },
				{ usage: "/audit <item>", description: "Audit a paper against its public codebase." },
				{ usage: "/replicate <paper>", description: "Replication workflow for a paper or claim." },
				{ usage: "/draft <topic>", description: "Paper-style draft from research findings." },
				{ usage: "/compare <topic>", description: "Compare sources with agreements and disagreements." },
				{ usage: "/autoresearch <target>", description: "Autonomous experiment optimization loop." },
				{ usage: "/watch <topic>", description: "Recurring research watch on a topic." },
			],
		},
		{
			title: "Agents & Delegation",
			commands: [
				{ usage: "/agents", description: "Open the agent and chain manager." },
				{ usage: "/run <agent> <task>", description: "Run a single subagent." },
				{ usage: "/chain agent1 -> agent2", description: "Run agents in sequence." },
				{ usage: "/parallel agent1 -> agent2", description: "Run agents in parallel." },
			],
		},
		{
			title: "Project & Session",
			commands: [
				{ usage: "/init", description: "Bootstrap AGENTS.md and session-log folders." },
				{ usage: "/log", description: "Write a session log to notes/." },
				{ usage: "/jobs", description: "Inspect active background work." },
				{ usage: "/search", description: "Search prior sessions." },
				{ usage: "/preview", description: "Preview a generated artifact." },
			],
		},
		{
			title: "Setup",
			commands: [
				{ usage: "/alpha-login", description: "Sign in to alphaXiv." },
				{ usage: "/alpha-status", description: "Check alphaXiv auth." },
				{ usage: "/alpha-logout", description: "Clear alphaXiv auth." },
			],
		},
	];
}

export function registerHelpCommand(pi: ExtensionAPI): void {
	pi.registerCommand("help", {
		description: "Show grouped Feynman commands and prefill the editor with a selected command.",
		handler: async (_args, ctx) => {
			const sections = buildHelpSections();
			const items = sections.flatMap((section) => [
				`--- ${section.title} ---`,
				...section.commands.map((cmd) => `${cmd.usage} — ${cmd.description}`),
			]);

			const selected = await ctx.ui.select("Feynman Help", items);
			if (!selected || selected.startsWith("---")) return;

			const usage = selected.split(" — ")[0];
			ctx.ui.setEditorText(usage);
			ctx.ui.notify(`Prefilled ${usage}`, "info");
		},
	});
}
