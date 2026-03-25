import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";

import { getBootstrapStatePath } from "../config/paths.js";

type BootstrapRecord = {
	lastAppliedSourceHash: string;
	lastAppliedTargetHash: string;
};

type BootstrapState = {
	version: 1;
	files: Record<string, BootstrapRecord>;
};

export type BootstrapSyncResult = {
	copied: string[];
	updated: string[];
	skipped: string[];
};

function sha256(text: string): string {
	return createHash("sha256").update(text).digest("hex");
}

function readBootstrapState(path: string): BootstrapState {
	if (!existsSync(path)) {
		return { version: 1, files: {} };
	}

	try {
		const parsed = JSON.parse(readFileSync(path, "utf8")) as BootstrapState;
		return {
			version: 1,
			files: parsed.files && typeof parsed.files === "object" ? parsed.files : {},
		};
	} catch {
		return { version: 1, files: {} };
	}
}

function writeBootstrapState(path: string, state: BootstrapState): void {
	mkdirSync(dirname(path), { recursive: true });
	writeFileSync(path, JSON.stringify(state, null, 2) + "\n", "utf8");
}

function listFiles(root: string): string[] {
	if (!existsSync(root)) {
		return [];
	}

	const files: string[] = [];
	for (const entry of readdirSync(root, { withFileTypes: true })) {
		const path = resolve(root, entry.name);
		if (entry.isDirectory()) {
			files.push(...listFiles(path));
			continue;
		}
		if (entry.isFile()) {
			files.push(path);
		}
	}
	return files.sort();
}

function syncManagedFiles(
	sourceRoot: string,
	targetRoot: string,
	state: BootstrapState,
	result: BootstrapSyncResult,
): void {
	for (const sourcePath of listFiles(sourceRoot)) {
		const key = relative(sourceRoot, sourcePath);
		const targetPath = resolve(targetRoot, key);
		const sourceText = readFileSync(sourcePath, "utf8");
		const sourceHash = sha256(sourceText);
		const previous = state.files[key];

		mkdirSync(dirname(targetPath), { recursive: true });

		if (!existsSync(targetPath)) {
			writeFileSync(targetPath, sourceText, "utf8");
			state.files[key] = {
				lastAppliedSourceHash: sourceHash,
				lastAppliedTargetHash: sourceHash,
			};
			result.copied.push(key);
			continue;
		}

		const currentTargetText = readFileSync(targetPath, "utf8");
		const currentTargetHash = sha256(currentTargetText);

		if (currentTargetHash === sourceHash) {
			state.files[key] = {
				lastAppliedSourceHash: sourceHash,
				lastAppliedTargetHash: currentTargetHash,
			};
			continue;
		}

		if (!previous) {
			result.skipped.push(key);
			continue;
		}

		if (currentTargetHash !== previous.lastAppliedTargetHash) {
			result.skipped.push(key);
			continue;
		}

		writeFileSync(targetPath, sourceText, "utf8");
		state.files[key] = {
			lastAppliedSourceHash: sourceHash,
			lastAppliedTargetHash: sourceHash,
		};
		result.updated.push(key);
	}
}

export function syncBundledAssets(appRoot: string, agentDir: string): BootstrapSyncResult {
	const statePath = getBootstrapStatePath();
	const state = readBootstrapState(statePath);
	const result: BootstrapSyncResult = {
		copied: [],
		updated: [],
		skipped: [],
	};

	syncManagedFiles(resolve(appRoot, ".feynman", "themes"), resolve(agentDir, "themes"), state, result);
	syncManagedFiles(resolve(appRoot, ".feynman", "agents"), resolve(agentDir, "agents"), state, result);
	syncManagedFiles(resolve(appRoot, "skills"), resolve(agentDir, "skills"), state, result);

	writeBootstrapState(statePath, state);
	return result;
}
