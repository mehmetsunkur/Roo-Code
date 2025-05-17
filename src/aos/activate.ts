import * as vscode from "vscode"
import { RooCodeAPI, TokenUsage } from "../exports/roo-code"
import { generateTaskConfig, TaskConfig } from "./taskUtils"
import { logTheTask } from "./taskLog"
import { watchPrompts } from "./watchPrompts"
import { ClineProvider } from "../core/webview/ClineProvider"
import { watchRooSettings } from "./watchRooSettings"
export let currentTaskConfig: TaskConfig | undefined = undefined

export async function activateAosCode(context: vscode.ExtensionContext, api: RooCodeAPI, provider: ClineProvider) {
	const outputChannel = vscode.window.createOutputChannel("Agent-Operating-System")
	context.subscriptions.push(outputChannel)

	watchRooSettings(context, provider, outputChannel)

	api.on("taskStarted", async (taskId: string) => {
		outputChannel.appendLine(`Task started: ${taskId}`)
	})

	api.on("taskCompleted", async (taskId: string, usage: TokenUsage) => {
		outputChannel.appendLine(`Task started: ${taskId}`)
		currentTaskConfig = await generateTaskConfig(api, provider)
		if (!currentTaskConfig) {
			vscode.window.showInformationMessage("No task config found")
			outputChannel.appendLine("No task config found")
			return
		}
		await logTheTask(api, currentTaskConfig, taskId, usage, outputChannel, provider)
	})

	watchPrompts(context, outputChannel)
	let debugCommand = vscode.commands.registerCommand("auto-cline.debog", async () => {
		const sysPrmpt = generateTaskConfig(api, provider)
		outputChannel.appendLine(`System Prompt: ${sysPrmpt}`)
	})

	context.subscriptions.push(debugCommand)
}
