import { isLoggedIn as isAlphaLoggedIn, login as loginAlpha } from "@companion-ai/alpha-hub/lib";

import { getDefaultSessionDir, getFeynmanHome } from "../config/paths.js";
import { getPiWebAccessStatus, getPiWebSearchConfigPath } from "../pi/web-access.js";
import { normalizeFeynmanSettings } from "../pi/settings.js";
import type { ThinkingLevel } from "../pi/settings.js";
import { getCurrentModelSpec, runModelSetup } from "../model/commands.js";
import { buildModelStatusSnapshotFromRecords, getAvailableModelRecords, getSupportedModelRecords } from "../model/catalog.js";
import { PANDOC_FALLBACK_PATHS, resolveExecutable } from "../system/executables.js";
import { promptText } from "./prompts.js";
import { setupPreviewDependencies } from "./preview.js";
import { runDoctor } from "./doctor.js";
import { printInfo, printPanel, printSection, printSuccess } from "../ui/terminal.js";

type SetupOptions = {
	settingsPath: string;
	bundledSettingsPath: string;
	authPath: string;
	workingDir: string;
	sessionDir: string;
	appRoot: string;
	defaultThinkingLevel?: ThinkingLevel;
};

async function explainWebAccess(): Promise<void> {
	const status = getPiWebAccessStatus();
	printSection("Web Access");
	printInfo("Feynman uses the bundled `pi-web-access` package directly.");
	printInfo("Default v1 path: sign into gemini.google.com in a supported Chromium browser.");
	printInfo(`Current search route: ${status.routeLabel}`);
	printInfo(`Pi config path: ${status.configPath}`);
	printInfo("Advanced users can edit the Pi config directly if they want API keys or a different route.");
}

function isPreviewConfigured() {
	return Boolean(resolveExecutable("pandoc", PANDOC_FALLBACK_PATHS));
}

function isInteractiveTerminal(): boolean {
	return Boolean(process.stdin.isTTY && process.stdout.isTTY);
}

function printNonInteractiveSetupGuidance(): void {
	printPanel("Feynman Setup", [
		"Non-interactive terminal detected.",
	]);
	printInfo("Use the explicit commands instead of the interactive setup wizard:");
	printInfo("  feynman status");
	printInfo("  feynman model login <provider>");
	printInfo("  feynman model set <provider/model>");
	printInfo("  feynman search status");
	printInfo(`  edit ${getPiWebSearchConfigPath()}    # optional advanced web config`);
	printInfo("  feynman alpha login");
	printInfo("  feynman doctor");
	printInfo("  feynman   # Pi's /login flow still works inside chat if you prefer it");
}

async function runPreviewSetup(): Promise<void> {
	const result = setupPreviewDependencies();
	printSuccess(result.message);
}

function printConfigurationLocation(appRoot: string): void {
	printSection("Configuration Location");
	printInfo(`Data folder:  ${getFeynmanHome()}`);
	printInfo(`Sessions:     ${getDefaultSessionDir()}`);
	printInfo(`Install dir:  ${appRoot}`);
}

function printSetupSummary(settingsPath: string, authPath: string): void {
	const modelStatus = buildModelStatusSnapshotFromRecords(
		getSupportedModelRecords(authPath),
		getAvailableModelRecords(authPath),
		getCurrentModelSpec(settingsPath),
	);
	printSection("Setup Summary");
	printInfo(`Model: ${getCurrentModelSpec(settingsPath) ?? "not set"}`);
	printInfo(`Model valid: ${modelStatus.currentValid ? "yes" : "no"}`);
	printInfo(`Recommended model: ${modelStatus.recommended ?? "not available"}`);
	printInfo(`alphaXiv: ${isAlphaLoggedIn() ? "configured" : "missing"}`);
	printInfo(`Web access: pi-web-access (${getPiWebAccessStatus().routeLabel})`);
	printInfo(`Preview: ${isPreviewConfigured() ? "configured" : "not configured"}`);
	for (const line of modelStatus.guidance) {
		printInfo(line);
	}
}

async function runFullSetup(options: SetupOptions): Promise<void> {
	printConfigurationLocation(options.appRoot);
	await runModelSetup(options.settingsPath, options.authPath);
	if (!isAlphaLoggedIn()) {
		await loginAlpha();
		printSuccess("alphaXiv login complete");
	} else {
		printInfo("alphaXiv login already configured");
	}
	await explainWebAccess();
	await runPreviewSetup();
	normalizeFeynmanSettings(
		options.settingsPath,
		options.bundledSettingsPath,
		options.defaultThinkingLevel ?? "medium",
		options.authPath,
	);
	runDoctor({
		settingsPath: options.settingsPath,
		authPath: options.authPath,
		sessionDir: options.sessionDir,
		workingDir: options.workingDir,
		appRoot: options.appRoot,
	});
	printSetupSummary(options.settingsPath, options.authPath);
}

function hasExistingSetup(settingsPath: string, authPath: string): boolean {
	const modelStatus = buildModelStatusSnapshotFromRecords(
		getSupportedModelRecords(authPath),
		getAvailableModelRecords(authPath),
		getCurrentModelSpec(settingsPath),
	);
	return Boolean(
		modelStatus.current ||
		modelStatus.availableModels.length > 0 ||
		isAlphaLoggedIn() ||
		isPreviewConfigured(),
	);
}

async function runDefaultInteractiveSetup(options: SetupOptions): Promise<void> {
	const existing = hasExistingSetup(options.settingsPath, options.authPath);
	printPanel("Feynman Setup Wizard", [
		"Guided setup for the research-first Pi agent.",
		"Press Ctrl+C at any time to exit.",
	]);

	if (existing) {
		printSection("Full Setup");
		printInfo("Existing configuration detected. Rerunning the full guided setup.");
	} else {
		printInfo("We'll walk you through:");
		printInfo("  1. Model Selection");
		printInfo("  2. alphaXiv Login");
		printInfo("  3. Preview Dependencies");
	}
	printInfo("Press Enter to begin, or Ctrl+C to exit.");
	await promptText("Press Enter to start");
	await runFullSetup(options);
}

export async function runSetup(options: SetupOptions): Promise<void> {
	if (!isInteractiveTerminal()) {
		printNonInteractiveSetupGuidance();
		return;
	}

	await runDefaultInteractiveSetup(options);
}
