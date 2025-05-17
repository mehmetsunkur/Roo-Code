import * as vscode from "vscode"
import * as fs from "fs"
import * as path from "path"

import { RooCodeAPI, TokenUsage } from "../exports/roo-code"
import {
	copyDir,
	gatherHostInfoAndWrite,
	locateFolder,
	logWorkspaceFolders,
	TaskConfig,
	writeEnvVarsToFile,
} from "./taskUtils"
import { ClineProvider } from "../core/webview/ClineProvider"
import { exportSettings } from "./importExport"
import { Task } from "../core/task/Task"

export async function logTheTask(
	clineObject: RooCodeAPI,
	currentTaskConfig: TaskConfig,
	taskId: string,
	usage: TokenUsage,
	outputChannel: vscode.OutputChannel,
	provider: ClineProvider,
) {
	const currentCline: Task | undefined = await provider.getCurrentCline()
	if (!currentCline) {
		return
	}

	if (!currentCline) {
		outputChannel.appendLine("No provider found")
		return
	}
	const { taskDirPath } = await provider.getTaskWithId(taskId)

	const taskDir = taskDirPath
	const systemPromptJson = path.join(taskDir, "system_prompt.json")
	const apiProviderJson = path.join(taskDir, "api_provider.json")
	const aosVsceSettingsUri = vscode.Uri.file(path.join(taskDir, "roo-code-settings.json"))
	await exportSettings(
		{ providerSettingsManager: provider.providerSettingsManager, contextProxy: provider.contextProxy },
		aosVsceSettingsUri,
	)
	await writeEnvVarsToFile(path.join(taskDir, "env_vars.json"))
	await gatherHostInfoAndWrite(path.join(taskDir, "host.json"))
	await logWorkspaceFolders(path.join(taskDir, "vscode_workspace.json"))

	const taskConfig = currentTaskConfig
	taskConfig.systemPrompt
	try {
		await fs.promises.writeFile(systemPromptJson, JSON.stringify(taskConfig.systemPrompt, null, 2), "utf8")
		await fs.promises.writeFile(apiProviderJson, JSON.stringify(taskConfig.apiProvider, null, 2), "utf8")

		outputChannel.appendLine(`Task configuration saved to ${systemPromptJson},${apiProviderJson}`)

		// log the task data to workspace for debug puposes
		const aosTaskDir = path.join(provider.cwd, ".aos", "task-log", "entry", taskId)
		await copyDir(taskDir, aosTaskDir, false)
		// log the task data to main data pool as training dataset
		const aosDataPoolDirName = "aos-data-pool"
		const aosDataPoolDir = await locateFolder(provider.cwd, "aos-data-pool")
		if (!aosDataPoolDir) {
			const errMsg = `Folder "${aosDataPoolDirName}" not found any where in parent of workspace: ${provider.cwd}`
			outputChannel.appendLine(errMsg)
			vscode.window.showErrorMessage(errMsg)
			return
		}
		const aosDataPoolLogEntryDir = path.join(aosDataPoolDir, "task-log", "entry")
		const aosDataPoolTaskLogEntryDir = path.join(aosDataPoolLogEntryDir, taskId)
		await copyDir(taskDir, aosDataPoolTaskLogEntryDir, false)
		outputChannel.appendLine(`Task directory copied to ${aosTaskDir}`)
	} catch (error) {
		outputChannel.appendLine(`Error saving task configuration: ${error}`)
		vscode.window.showErrorMessage(`Failed to save task configuration: ${error}`)
	}
}
export async function onTaskError(taskId: string, error: string, outputChannel: vscode.OutputChannel) {
	outputChannel.appendLine(" task onTaskError")
}

export async function onTaskUpdate(taskId: string, message: string, outputChannel: vscode.OutputChannel) {
	outputChannel.appendLine(" task onTaskUpdate")
}

export async function onTaskDelete(taskId: string, outputChannel: vscode.OutputChannel) {
	outputChannel.appendLine(" task onTaskDelete")
}

export async function onTaskRetry(taskId: string, outputChannel: vscode.OutputChannel) {
	outputChannel.appendLine(" task onTaskRetry")
}

export async function onTaskRetryDelayed(taskId: string, outputChannel: vscode.OutputChannel) {
	outputChannel.appendLine(" task onTaskRetryDelayed")
}
