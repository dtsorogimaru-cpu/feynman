import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, resolve as resolvePath } from "node:path";
import { fileURLToPath } from "node:url";

export const APP_ROOT = resolvePath(dirname(fileURLToPath(import.meta.url)), "..", "..");

export const FEYNMAN_VERSION = (() => {
	try {
		const pkg = JSON.parse(readFileSync(resolvePath(APP_ROOT, "package.json"), "utf8")) as { version?: string };
		return pkg.version ?? "dev";
	} catch {
		return "dev";
	}
})();

export const FEYNMAN_AGENT_LOGO = [
	"███████╗███████╗██╗   ██╗███╗   ██╗███╗   ███╗ █████╗ ███╗   ██╗",
	"██╔════╝██╔════╝╚██╗ ██╔╝████╗  ██║████╗ ████║██╔══██╗████╗  ██║",
	"█████╗  █████╗   ╚████╔╝ ██╔██╗ ██║██╔████╔██║███████║██╔██╗ ██║",
	"██╔══╝  ██╔══╝    ╚██╔╝  ██║╚██╗██║██║╚██╔╝██║██╔══██║██║╚██╗██║",
	"██║     ███████╗   ██║   ██║ ╚████║██║ ╚═╝ ██║██║  ██║██║ ╚████║",
	"╚═╝     ╚══════╝   ╚═╝   ╚═╝  ╚═══╝╚═╝     ╚═╝╚═╝  ╚═╝╚═╝  ╚═══╝",
];

export const FEYNMAN_RESEARCH_TOOLS = [
	"alpha_search",
	"alpha_get_paper",
	"alpha_ask_paper",
	"alpha_annotate_paper",
	"alpha_list_annotations",
	"alpha_read_code",
	"session_search",
	"preview_file",
];

export function formatToolText(result: unknown): string {
	return typeof result === "string" ? result : JSON.stringify(result, null, 2);
}

export function getFeynmanHome(): string {
	const agentDir = process.env.FEYNMAN_CODING_AGENT_DIR ??
		process.env.PI_CODING_AGENT_DIR ??
		resolvePath(homedir(), ".feynman", "agent");
	return dirname(agentDir);
}
