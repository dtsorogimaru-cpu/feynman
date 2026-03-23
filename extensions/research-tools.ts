import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

import { registerAlphaCommands, registerAlphaTools } from "./research-tools/alpha.js";
import { installFeynmanHeader } from "./research-tools/header.js";
import { registerHelpCommand } from "./research-tools/help.js";
import { registerInitCommand, registerPreviewTool, registerSessionSearchTool } from "./research-tools/project.js";

export default function researchTools(pi: ExtensionAPI): void {
	const cache: { agentSummaryPromise?: Promise<{ count: number; lines: string[] }> } = {};

	pi.on("session_start", async (_event, ctx) => {
		await installFeynmanHeader(pi, ctx, cache);
	});

	pi.on("session_switch", async (_event, ctx) => {
		await installFeynmanHeader(pi, ctx, cache);
	});

	registerAlphaCommands(pi);
	registerHelpCommand(pi);
	registerInitCommand(pi);
	registerSessionSearchTool(pi);
	registerAlphaTools(pi);
	registerPreviewTool(pi);
}
