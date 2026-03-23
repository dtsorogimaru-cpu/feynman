import { readdir, readFile, stat } from "node:fs/promises";
import { basename, join } from "node:path";
import { pathToFileURL } from "node:url";

import { getFeynmanHome } from "./shared.js";

function extractMessageText(message: unknown): string {
	if (!message || typeof message !== "object") {
		return "";
	}

	const content = (message as { content?: unknown }).content;
	if (typeof content === "string") {
		return content;
	}
	if (!Array.isArray(content)) {
		return "";
	}

	return content
		.map((item) => {
			if (!item || typeof item !== "object") {
				return "";
			}
			const record = item as { type?: string; text?: unknown; arguments?: unknown; name?: unknown };
			if (record.type === "text" && typeof record.text === "string") {
				return record.text;
			}
			if (record.type === "toolCall") {
				const name = typeof record.name === "string" ? record.name : "tool";
				const args =
					typeof record.arguments === "string"
						? record.arguments
						: record.arguments
							? JSON.stringify(record.arguments)
							: "";
				return `[tool:${name}] ${args}`;
			}
			return "";
		})
		.filter(Boolean)
		.join("\n");
}

function buildExcerpt(text: string, query: string, radius = 180): string {
	const normalizedText = text.replace(/\s+/g, " ").trim();
	if (!normalizedText) {
		return "";
	}

	const lower = normalizedText.toLowerCase();
	const q = query.toLowerCase();
	const index = lower.indexOf(q);
	if (index === -1) {
		return normalizedText.slice(0, radius * 2) + (normalizedText.length > radius * 2 ? "..." : "");
	}

	const start = Math.max(0, index - radius);
	const end = Math.min(normalizedText.length, index + q.length + radius);
	const prefix = start > 0 ? "..." : "";
	const suffix = end < normalizedText.length ? "..." : "";
	return `${prefix}${normalizedText.slice(start, end)}${suffix}`;
}

export async function searchSessionTranscripts(query: string, limit: number): Promise<{
	query: string;
	results: Array<{
		sessionId: string;
		sessionFile: string;
		startedAt?: string;
		cwd?: string;
		matchCount: number;
		topMatches: Array<{ role: string; timestamp?: string; excerpt: string }>;
	}>;
}> {
	const packageRoot = process.env.FEYNMAN_PI_NPM_ROOT;
	if (packageRoot) {
		try {
			const indexerPath = pathToFileURL(
				join(packageRoot, "@kaiserlich-dev", "pi-session-search", "extensions", "indexer.ts"),
			).href;
			const indexer = await import(indexerPath) as {
				updateIndex?: (onProgress?: (msg: string) => void) => Promise<number>;
				search?: (query: string, limit?: number) => Array<{
					sessionPath: string;
					project: string;
					timestamp: string;
					snippet: string;
					rank: number;
					title: string | null;
				}>;
				getSessionSnippets?: (sessionPath: string, query: string, limit?: number) => string[];
			};

			await indexer.updateIndex?.();
			const results = indexer.search?.(query, limit) ?? [];
			if (results.length > 0) {
				return {
					query,
					results: results.map((result) => ({
						sessionId: basename(result.sessionPath),
						sessionFile: result.sessionPath,
						startedAt: result.timestamp,
						cwd: result.project,
						matchCount: 1,
						topMatches: (indexer.getSessionSnippets?.(result.sessionPath, query, 4) ?? [result.snippet])
							.filter(Boolean)
							.map((excerpt) => ({
								role: "match",
								excerpt,
							})),
					})),
				};
			}
		} catch {
			// Fall back to direct JSONL scanning below.
		}
	}

	const sessionDir = join(getFeynmanHome(), "sessions");
	const terms = query
		.toLowerCase()
		.split(/\s+/)
		.map((term) => term.trim())
		.filter((term) => term.length >= 2);
	const needle = query.toLowerCase();

	let files: string[] = [];
	try {
		files = (await readdir(sessionDir))
			.filter((entry) => entry.endsWith(".jsonl"))
			.map((entry) => join(sessionDir, entry));
	} catch {
		return { query, results: [] };
	}

	const sessions = [];
	for (const file of files) {
		const raw = await readFile(file, "utf8").catch(() => "");
		if (!raw) {
			continue;
		}

		let sessionId = basename(file);
		let startedAt: string | undefined;
		let cwd: string | undefined;
		const matches: Array<{ role: string; timestamp?: string; excerpt: string }> = [];

		for (const line of raw.split("\n")) {
			if (!line.trim()) {
				continue;
			}
			try {
				const record = JSON.parse(line) as {
					type?: string;
					id?: string;
					timestamp?: string;
					cwd?: string;
					message?: { role?: string; content?: unknown };
				};
				if (record.type === "session") {
					sessionId = record.id ?? sessionId;
					startedAt = record.timestamp;
					cwd = record.cwd;
					continue;
				}
				if (record.type !== "message" || !record.message) {
					continue;
				}

				const text = extractMessageText(record.message);
				if (!text) {
					continue;
				}
				const lower = text.toLowerCase();
				const matched = lower.includes(needle) || terms.some((term) => lower.includes(term));
				if (!matched) {
					continue;
				}
				matches.push({
					role: record.message.role ?? "unknown",
					timestamp: record.timestamp,
					excerpt: buildExcerpt(text, query),
				});
			} catch {
				continue;
			}
		}

		if (matches.length === 0) {
			continue;
		}

		let mtime = 0;
		try {
			mtime = (await stat(file)).mtimeMs;
		} catch {
			mtime = 0;
		}

		sessions.push({
			sessionId,
			sessionFile: file,
			startedAt,
			cwd,
			matchCount: matches.length,
			topMatches: matches.slice(0, 4),
			mtime,
		});
	}

	sessions.sort((a, b) => {
		if (b.matchCount !== a.matchCount) {
			return b.matchCount - a.matchCount;
		}
		return b.mtime - a.mtime;
	});

	return {
		query,
		results: sessions.slice(0, limit).map(({ mtime: _mtime, ...session }) => session),
	};
}
