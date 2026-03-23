import "dotenv/config";

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { parseArgs } from "node:util";
import { fileURLToPath } from "node:url";

import {
	getUserName as getAlphaUserName,
	isLoggedIn as isAlphaLoggedIn,
	login as loginAlpha,
	logout as logoutAlpha,
} from "@companion-ai/alpha-hub/lib";
import { AuthStorage, DefaultPackageManager, ModelRegistry, SettingsManager } from "@mariozechner/pi-coding-agent";

import { syncBundledAssets } from "./bootstrap/sync.js";
import { ensureFeynmanHome, getDefaultSessionDir, getFeynmanAgentDir, getFeynmanHome } from "./config/paths.js";
import { launchPiChat } from "./pi/launch.js";
import { normalizeFeynmanSettings, normalizeThinkingLevel, parseModelSpec } from "./pi/settings.js";
import {
	loginModelProvider,
	logoutModelProvider,
	printModelList,
	setDefaultModelSpec,
} from "./model/commands.js";
import { printSearchStatus } from "./search/commands.js";
import { runDoctor, runStatus } from "./setup/doctor.js";
import { setupPreviewDependencies } from "./setup/preview.js";
import { runSetup } from "./setup/setup.js";
import { printInfo, printPanel, printSection } from "./ui/terminal.js";

const TOP_LEVEL_COMMANDS = new Set(["alpha", "chat", "doctor", "help", "model", "search", "setup", "status", "update"]);
const RESEARCH_WORKFLOW_COMMANDS = new Set([
	"audit",
	"autoresearch",
	"compare",
	"deepresearch",
	"draft",
	"jobs",
	"lit",
	"log",
	"replicate",
	"review",
	"watch",
]);

function printHelp(): void {
	printPanel("Feynman", [
		"Research-first agent shell built on Pi.",
		"Use `feynman setup` first if this is a new machine.",
	]);

	printSection("Getting Started");
	printInfo("feynman");
	printInfo("feynman setup");
	printInfo("feynman doctor");
	printInfo("feynman model");
	printInfo("feynman search status");

	printSection("Commands");
	printInfo("feynman chat [prompt]       Start chat explicitly, optionally with an initial prompt");
	printInfo("feynman setup               Run the guided setup");
	printInfo("feynman doctor              Diagnose config, auth, Pi runtime, and preview deps");
	printInfo("feynman status              Show the current setup summary");
	printInfo("feynman model list          Show available models in auth storage");
	printInfo("feynman model login [id]    Login to a Pi OAuth model provider");
	printInfo("feynman model logout [id]   Logout from a Pi OAuth model provider");
	printInfo("feynman model set <spec>    Set the default model");
	printInfo("feynman update [package]    Update installed packages (or a specific one)");
	printInfo("feynman search status       Show Pi web-access status and config path");
	printInfo("feynman alpha login|logout|status");

	printSection("Research Workflows");
	printInfo("feynman deepresearch <topic>  Start a thorough source-heavy investigation");
	printInfo("feynman lit <topic>           Start the literature-review workflow");
	printInfo("feynman review <artifact>     Start the peer-review workflow");
	printInfo("feynman audit <item>          Start the paper/code audit workflow");
	printInfo("feynman replicate <target>    Start the replication workflow");
	printInfo("feynman draft <topic>         Start the paper-style draft workflow");
	printInfo("feynman compare <topic>       Start the source-comparison workflow");
	printInfo("feynman watch <topic>         Start the recurring research watch workflow");

	printSection("Legacy Flags");
	printInfo('--prompt "<text>"           Run one prompt and exit');
	printInfo("--alpha-login               Sign in to alphaXiv and exit");
	printInfo("--alpha-logout              Clear alphaXiv auth and exit");
	printInfo("--alpha-status              Show alphaXiv auth status and exit");
	printInfo("--model provider:model      Force a specific model");
	printInfo("--thinking level            off | minimal | low | medium | high | xhigh");
	printInfo("--cwd /path/to/workdir      Working directory for tools");
	printInfo("--session-dir /path         Session storage directory");
	printInfo("--doctor                    Alias for `feynman doctor`");
	printInfo("--setup-preview             Alias for `feynman setup preview`");

	printSection("REPL");
	printInfo("Inside the REPL, slash workflows come from the live prompt-template and extension command set.");
}

async function handleAlphaCommand(action: string | undefined): Promise<void> {
	if (action === "login") {
		const result = await loginAlpha();
		const name =
			result.userInfo &&
			typeof result.userInfo === "object" &&
			"name" in result.userInfo &&
			typeof result.userInfo.name === "string"
				? result.userInfo.name
				: getAlphaUserName();
		console.log(name ? `alphaXiv login complete: ${name}` : "alphaXiv login complete");
		return;
	}

	if (action === "logout") {
		logoutAlpha();
		console.log("alphaXiv auth cleared");
		return;
	}

	if (!action || action === "status") {
		if (isAlphaLoggedIn()) {
			const name = getAlphaUserName();
			console.log(name ? `alphaXiv logged in as ${name}` : "alphaXiv logged in");
		} else {
			console.log("alphaXiv not logged in");
		}
		return;
	}

	throw new Error(`Unknown alpha command: ${action}`);
}

async function handleModelCommand(subcommand: string | undefined, args: string[], feynmanSettingsPath: string, feynmanAuthPath: string): Promise<void> {
	if (!subcommand || subcommand === "list") {
		printModelList(feynmanSettingsPath, feynmanAuthPath);
		return;
	}

	if (subcommand === "login") {
		await loginModelProvider(feynmanAuthPath, args[0]);
		return;
	}

	if (subcommand === "logout") {
		await logoutModelProvider(feynmanAuthPath, args[0]);
		return;
	}

	if (subcommand === "set") {
		const spec = args[0];
		if (!spec) {
			throw new Error("Usage: feynman model set <provider/model>");
		}
		setDefaultModelSpec(feynmanSettingsPath, feynmanAuthPath, spec);
		return;
	}

	throw new Error(`Unknown model command: ${subcommand}`);
}

async function handleUpdateCommand(workingDir: string, feynmanAgentDir: string, source?: string): Promise<void> {
	const settingsManager = SettingsManager.create(workingDir, feynmanAgentDir);
	const packageManager = new DefaultPackageManager({
		cwd: workingDir,
		agentDir: feynmanAgentDir,
		settingsManager,
	});

	packageManager.setProgressCallback((event) => {
		if (event.type === "start") {
			console.log(`Updating ${event.source}...`);
		} else if (event.type === "complete") {
			console.log(`Updated ${event.source}`);
		} else if (event.type === "error") {
			console.error(`Failed to update ${event.source}: ${event.message ?? "unknown error"}`);
		}
	});

	await packageManager.update(source);
	await settingsManager.flush();
	console.log("All packages up to date.");
}

function handleSearchCommand(subcommand: string | undefined): void {
	if (!subcommand || subcommand === "status") {
		printSearchStatus();
		return;
	}

	throw new Error(`Unknown search command: ${subcommand}`);
}

function loadPackageVersion(appRoot: string): { version?: string } {
	try {
		return JSON.parse(readFileSync(resolve(appRoot, "package.json"), "utf8")) as { version?: string };
	} catch {
		return {};
	}
}

export function resolveInitialPrompt(
	command: string | undefined,
	rest: string[],
	oneShotPrompt: string | undefined,
): string | undefined {
	if (oneShotPrompt) {
		return oneShotPrompt;
	}
	if (!command) {
		return undefined;
	}
	if (command === "chat") {
		return rest.length > 0 ? rest.join(" ") : undefined;
	}
	if (RESEARCH_WORKFLOW_COMMANDS.has(command)) {
		return [`/${command}`, ...rest].join(" ").trim();
	}
	if (!TOP_LEVEL_COMMANDS.has(command)) {
		return [command, ...rest].join(" ");
	}
	return undefined;
}

export async function main(): Promise<void> {
	const here = dirname(fileURLToPath(import.meta.url));
	const appRoot = resolve(here, "..");
	const feynmanVersion = loadPackageVersion(appRoot).version;
	const bundledSettingsPath = resolve(appRoot, ".pi", "settings.json");
	const feynmanHome = getFeynmanHome();
	const feynmanAgentDir = getFeynmanAgentDir(feynmanHome);

	ensureFeynmanHome(feynmanHome);
	syncBundledAssets(appRoot, feynmanAgentDir);

	const { values, positionals } = parseArgs({
		args: process.argv.slice(2),
		allowPositionals: true,
		options: {
			cwd: { type: "string" },
			doctor: { type: "boolean" },
			help: { type: "boolean" },
			"alpha-login": { type: "boolean" },
			"alpha-logout": { type: "boolean" },
			"alpha-status": { type: "boolean" },
			model: { type: "string" },
			"new-session": { type: "boolean" },
			prompt: { type: "string" },
			"session-dir": { type: "string" },
			"setup-preview": { type: "boolean" },
			thinking: { type: "string" },
		},
	});

	if (values.help) {
		printHelp();
		return;
	}

	const workingDir = resolve(values.cwd ?? process.cwd());
	const sessionDir = resolve(values["session-dir"] ?? getDefaultSessionDir(feynmanHome));
	const feynmanSettingsPath = resolve(feynmanAgentDir, "settings.json");
	const feynmanAuthPath = resolve(feynmanAgentDir, "auth.json");
	const thinkingLevel = normalizeThinkingLevel(values.thinking ?? process.env.FEYNMAN_THINKING) ?? "medium";

	normalizeFeynmanSettings(feynmanSettingsPath, bundledSettingsPath, thinkingLevel, feynmanAuthPath);

	if (values.doctor) {
		runDoctor({
			settingsPath: feynmanSettingsPath,
			authPath: feynmanAuthPath,
			sessionDir,
			workingDir,
			appRoot,
		});
		return;
	}

	if (values["setup-preview"]) {
		const result = setupPreviewDependencies();
		console.log(result.message);
		return;
	}

	if (values["alpha-login"]) {
		await handleAlphaCommand("login");
		return;
	}

	if (values["alpha-logout"]) {
		await handleAlphaCommand("logout");
		return;
	}

	if (values["alpha-status"]) {
		await handleAlphaCommand("status");
		return;
	}

	const [command, ...rest] = positionals;
	if (command === "help") {
		printHelp();
		return;
	}

	if (command === "setup") {
		await runSetup({
			settingsPath: feynmanSettingsPath,
			bundledSettingsPath,
			authPath: feynmanAuthPath,
			workingDir,
			sessionDir,
			appRoot,
			defaultThinkingLevel: thinkingLevel,
		});
		return;
	}

	if (command === "doctor") {
		runDoctor({
			settingsPath: feynmanSettingsPath,
			authPath: feynmanAuthPath,
			sessionDir,
			workingDir,
			appRoot,
		});
		return;
	}

	if (command === "status") {
		runStatus({
			settingsPath: feynmanSettingsPath,
			authPath: feynmanAuthPath,
			sessionDir,
			workingDir,
			appRoot,
		});
		return;
	}

	if (command === "model") {
		await handleModelCommand(rest[0], rest.slice(1), feynmanSettingsPath, feynmanAuthPath);
		return;
	}

	if (command === "search") {
		handleSearchCommand(rest[0]);
		return;
	}

	if (command === "update") {
		await handleUpdateCommand(workingDir, feynmanAgentDir, rest[0]);
		return;
	}

	if (command === "alpha") {
		await handleAlphaCommand(rest[0]);
		return;
	}

	const explicitModelSpec = values.model ?? process.env.FEYNMAN_MODEL;
	if (explicitModelSpec) {
		const modelRegistry = new ModelRegistry(AuthStorage.create(feynmanAuthPath));
		const explicitModel = parseModelSpec(explicitModelSpec, modelRegistry);
		if (!explicitModel) {
			throw new Error(`Unknown model: ${explicitModelSpec}`);
		}
	}

	await launchPiChat({
		appRoot,
		workingDir,
		sessionDir,
		feynmanAgentDir,
		feynmanVersion,
		thinkingLevel,
		explicitModelSpec,
		oneShotPrompt: values.prompt,
		initialPrompt: resolveInitialPrompt(command, rest, values.prompt),
	});
}
