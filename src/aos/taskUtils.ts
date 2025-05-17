import * as vscode from "vscode"
import * as fs from "fs"
import * as os from "os"
import * as path from "path"

import { RooCodeAPI } from "../exports/roo-code"
import { defaultModeSlug, getGroupName, getModeBySlug } from "../shared/modes"
import { buildApiHandler } from "../api"
import { ClineProvider } from "../core/webview/ClineProvider"
import { SYSTEM_PROMPT } from "../core/prompts/system"
import { MultiSearchReplaceDiffStrategy } from "../core/diff/strategies/multi-search-replace"

export type TaskConfig = {
	systemPrompt: string | undefined
	apiProvider: {
		name: string
		model: string
	}
}

export async function locateFolder(srcDir: string, folderName: string): Promise<string | null> {
	let currentDir = srcDir

	while (true) {
		const targetPath = path.join(currentDir, folderName)
		try {
			fs.promises.stat
			const stat = await fs.promises.stat(targetPath)
			if (stat.isDirectory()) {
				return targetPath
			}
		} catch (err) {
			// If not found, ignore error and move up
		}

		const parentDir = path.dirname(currentDir)
		if (parentDir === currentDir) {
			// Reached the filesystem root
			break
		}
		currentDir = parentDir
	}

	return null // Folder not found
}

// copies files and directories recursively
export async function copyDir(srcDir: string, destDir: string, recursive: boolean) {
	try {
		if (!fs.existsSync(destDir)) {
			fs.mkdirSync(destDir, { recursive: true })
		}
		const entries = fs.readdirSync(srcDir, { withFileTypes: true })
		for (const entry of entries) {
			const srcPath = path.join(srcDir, entry.name)
			const destPath = path.join(destDir, entry.name)
			if (entry.isDirectory()) {
				if (recursive) {
					await copyDir(srcPath, destPath, recursive)
				}
			} else {
				fs.copyFileSync(srcPath, destPath)
			}
		}
	} catch (error) {
		if (error instanceof vscode.FileSystemError && error.code === "EntryNotFound") {
			console.warn("Prompts file not found:", error)
			vscode.window.showWarningMessage("Prompts file not found")
		} else {
			throw error // Re-throw the error if it's not a file not found error
		}
	}
}

export async function generateTaskConfig(cline: RooCodeAPI, provider: ClineProvider): Promise<TaskConfig> {
	const {
		apiConfiguration,
		customModePrompts,
		customInstructions,
		browserViewportSize,
		diffEnabled,
		mcpEnabled,
		fuzzyMatchThreshold,
		experiments,
		enableMcpServerCreation,
		browserToolEnabled,
		language,
		mode,
	} = await provider.getState()

	// Create diffStrategy based on current model and settings.
	const diffStrategy = new MultiSearchReplaceDiffStrategy(fuzzyMatchThreshold)

	// const diffStrategy = new DiffStrategy({
	// 	model: apiConfiguration.apiModelId || apiConfiguration.openRouterModelId || "",
	// 	experiments,
	// 	fuzzyMatchThreshold,
	// })

	const cwd = provider.cwd

	const modeOrDefaultSlug = mode ?? defaultModeSlug
	const customModes = await provider.customModesManager.getCustomModes()

	const rooIgnoreInstructions = undefined

	// Determine if browser tools can be used based on model support, mode, and user settings
	let modelSupportsComputerUse = false

	// Create a temporary API handler to check if the model supports computer use
	// This avoids relying on an active Cline instance which might not exist during preview
	const currentApiConfigName = cline.getConfiguration().currentApiConfigName
	const currentApiConfigMeta = cline
		.getConfiguration()
		.listApiConfigMeta?.find((meta) => meta.name === currentApiConfigName)
	const currentApiProvider = currentApiConfigMeta?.apiProvider
	if (!currentApiProvider) {
		throw new Error("No API provider found")
	}
	const tempApiHandler = buildApiHandler(apiConfiguration)
	const model = tempApiHandler.getModel()
	const currentApiConfigModelId = model.id

	modelSupportsComputerUse = tempApiHandler.getModel().info.supportsComputerUse ?? false

	// Check if the current mode includes the browser tool group
	const modeConfig = getModeBySlug(modeOrDefaultSlug, customModes)
	const modeSupportsBrowser = modeConfig?.groups.some((group) => getGroupName(group) === "browser") ?? false

	// Only enable browser tools if the model supports it, the mode includes browser tools,
	// and browser tools are enabled in settings
	const canUseBrowserTool = modelSupportsComputerUse && modeSupportsBrowser && (browserToolEnabled ?? true)
	const systemPrompt = await SYSTEM_PROMPT(
		provider.context,
		cwd,
		canUseBrowserTool,
		mcpEnabled ? provider.getMcpHub() : undefined,
		diffStrategy,
		browserViewportSize ?? "900x600",
		mode,
		customModePrompts,
		customModes,
		customInstructions,
		diffEnabled,
		experiments,
		enableMcpServerCreation,
		language,
		rooIgnoreInstructions,
	)
	return {
		systemPrompt,
		apiProvider: {
			name: currentApiProvider,
			model: currentApiConfigModelId,
		},
	}
	// return systemPrompt;
	// return undefined;
}

export async function writeEnvVarsToFile(outputPath: string): Promise<void> {
	const envVars = process.env

	const jsonContent = JSON.stringify(envVars, null, 2) // Pretty print with 2 spaces

	await fs.promises.writeFile(outputPath, jsonContent, { encoding: "utf-8" })
}

export async function gatherHostInfoAndWrite(outputPath: string): Promise<void> {
	const userInfo = os.userInfo()
	const hostInfo = {
		hostname: os.hostname(),
		platform: os.platform(),
		arch: os.arch(),
		domainName: process.env.USERDOMAIN || "Unknown", // Works mainly on Windows
		cpuCores: os.cpus().length,
		cpuModel: os.cpus()[0]?.model || "Unknown",
		totalMemoryGB: (os.totalmem() / 1024 ** 3).toFixed(2),
		freeMemoryGB: (os.freemem() / 1024 ** 3).toFixed(2),
		uptimeHours: (os.uptime() / 3600).toFixed(2),
		networkInterfaces: os.networkInterfaces(),
	}

	const jsonContent = JSON.stringify({ hostInfo: hostInfo, userInfo: userInfo }, null, 2)

	await fs.promises.writeFile(outputPath, jsonContent, { encoding: "utf-8" })
}

export async function logWorkspaceFolders(outputPath: string): Promise<void> {
	const folders = vscode.workspace.workspaceFolders

	const jsonContent = JSON.stringify(folders, null, 2)

	await fs.promises.writeFile(outputPath, jsonContent, { encoding: "utf-8" })
}
