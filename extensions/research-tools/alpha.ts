import {
	annotatePaper,
	askPaper,
	clearPaperAnnotation,
	disconnect,
	getPaper,
	getUserName as getAlphaUserName,
	isLoggedIn as isAlphaLoggedIn,
	listPaperAnnotations,
	login as loginAlpha,
	logout as logoutAlpha,
	readPaperCode,
	searchPapers,
} from "@companion-ai/alpha-hub/lib";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";

import { formatToolText } from "./shared.js";

export function registerAlphaCommands(pi: ExtensionAPI): void {
	pi.registerCommand("alpha-login", {
		description: "Sign in to alphaXiv from inside Feynman.",
		handler: async (_args, ctx) => {
			if (isAlphaLoggedIn()) {
				const name = getAlphaUserName();
				ctx.ui.notify(name ? `alphaXiv already connected as ${name}` : "alphaXiv already connected", "info");
				return;
			}

			await loginAlpha();
			const name = getAlphaUserName();
			ctx.ui.notify(name ? `alphaXiv connected as ${name}` : "alphaXiv login complete", "info");
		},
	});

	pi.registerCommand("alpha-logout", {
		description: "Clear alphaXiv auth from inside Feynman.",
		handler: async (_args, ctx) => {
			logoutAlpha();
			ctx.ui.notify("alphaXiv auth cleared", "info");
		},
	});

	pi.registerCommand("alpha-status", {
		description: "Show alphaXiv authentication status.",
		handler: async (_args, ctx) => {
			if (!isAlphaLoggedIn()) {
				ctx.ui.notify("alphaXiv not connected", "warning");
				return;
			}

			const name = getAlphaUserName();
			ctx.ui.notify(name ? `alphaXiv connected as ${name}` : "alphaXiv connected", "info");
		},
	});
}

export function registerAlphaTools(pi: ExtensionAPI): void {
	pi.registerTool({
		name: "alpha_search",
		label: "Alpha Search",
		description: "Search papers through alphaXiv using semantic, keyword, both, agentic, or all retrieval modes.",
		parameters: Type.Object({
			query: Type.String({ description: "Paper search query." }),
			mode: Type.Optional(
				Type.String({
					description: "Search mode: semantic, keyword, both, agentic, or all.",
				}),
			),
		}),
		async execute(_toolCallId, params) {
			try {
				const result = await searchPapers(params.query, params.mode?.trim() || "all");
				return {
					content: [{ type: "text", text: formatToolText(result) }],
					details: result,
				};
			} finally {
				await disconnect();
			}
		},
	});

	pi.registerTool({
		name: "alpha_get_paper",
		label: "Alpha Get Paper",
		description: "Fetch a paper report or full text, plus any local annotation, using alphaXiv.",
		parameters: Type.Object({
			paper: Type.String({
				description: "arXiv ID, arXiv URL, or alphaXiv URL.",
			}),
			fullText: Type.Optional(
				Type.Boolean({
					description: "Return raw full text instead of the AI report.",
				}),
			),
		}),
		async execute(_toolCallId, params) {
			try {
				const result = await getPaper(params.paper, { fullText: params.fullText });
				return {
					content: [{ type: "text", text: formatToolText(result) }],
					details: result,
				};
			} finally {
				await disconnect();
			}
		},
	});

	pi.registerTool({
		name: "alpha_ask_paper",
		label: "Alpha Ask Paper",
		description: "Ask a targeted question about a paper using alphaXiv's PDF analysis.",
		parameters: Type.Object({
			paper: Type.String({
				description: "arXiv ID, arXiv URL, or alphaXiv URL.",
			}),
			question: Type.String({
				description: "Question to ask about the paper.",
			}),
		}),
		async execute(_toolCallId, params) {
			try {
				const result = await askPaper(params.paper, params.question);
				return {
					content: [{ type: "text", text: formatToolText(result) }],
					details: result,
				};
			} finally {
				await disconnect();
			}
		},
	});

	pi.registerTool({
		name: "alpha_annotate_paper",
		label: "Alpha Annotate Paper",
		description: "Write or clear a persistent local annotation for a paper.",
		parameters: Type.Object({
			paper: Type.String({
				description: "Paper ID to annotate.",
			}),
			note: Type.Optional(
				Type.String({
					description: "Annotation text. Omit when clear=true.",
				}),
			),
			clear: Type.Optional(
				Type.Boolean({
					description: "Clear the existing annotation instead of writing one.",
				}),
			),
		}),
		async execute(_toolCallId, params) {
			const result = params.clear
				? await clearPaperAnnotation(params.paper)
				: params.note
					? await annotatePaper(params.paper, params.note)
					: (() => {
							throw new Error("Provide either note or clear=true.");
						})();

			return {
				content: [{ type: "text", text: formatToolText(result) }],
				details: result,
			};
		},
	});

	pi.registerTool({
		name: "alpha_list_annotations",
		label: "Alpha List Annotations",
		description: "List all persistent local paper annotations.",
		parameters: Type.Object({}),
		async execute() {
			const result = await listPaperAnnotations();
			return {
				content: [{ type: "text", text: formatToolText(result) }],
				details: result,
			};
		},
	});

	pi.registerTool({
		name: "alpha_read_code",
		label: "Alpha Read Code",
		description: "Read files from a paper's GitHub repository through alphaXiv.",
		parameters: Type.Object({
			githubUrl: Type.String({
				description: "GitHub repository URL for the paper implementation.",
			}),
			path: Type.Optional(
				Type.String({
					description: "Repository path to inspect. Use / for the repo overview.",
				}),
			),
		}),
		async execute(_toolCallId, params) {
			try {
				const result = await readPaperCode(params.githubUrl, params.path?.trim() || "/");
				return {
					content: [{ type: "text", text: formatToolText(result) }],
					details: result,
				};
			} finally {
				await disconnect();
			}
		},
	});
}
