import * as vscode from "vscode"

export async function watchPrompts(context: vscode.ExtensionContext, outputChannel: vscode.OutputChannel) {
	// Create file system watchers for system.prmt and iterate.prmt
	const systemFileWatcher = vscode.workspace.createFileSystemWatcher("**/system.prmt")
	const iterateFileWatcher = vscode.workspace.createFileSystemWatcher("**/iterate.prmt")

	const config = vscode.workspace.getConfiguration()
	const allowedCommands: string[] =
		vscode.workspace.getConfiguration("roo-cline").get<string[]>("allowedCommands") || []
	const lastone: string | undefined = allowedCommands.pop()
	vscode.window.showInformationMessage(`last one : ${lastone}`)
	config.update("roo-cline", allowedCommands, vscode.ConfigurationTarget.WorkspaceFolder, false)
	vscode.window.showInformationMessage(`last one removed : ${lastone}`)
	// Handle system.prmt changes
	systemFileWatcher.onDidCreate((uri) => {
		vscode.window.showInformationMessage(`System prompt file changed: ${uri.fsPath}`)
		outputChannel.appendLine(`System prompt file changed at ${new Date().toISOString()}: ${uri.fsPath}`)
	})

	// Handle iterate.prmt detection
	iterateFileWatcher.onDidCreate((uri) => {
		vscode.window.showInformationMessage(`Iterate prompt file detected: ${uri.fsPath}`)
		outputChannel.appendLine(`Iterate prompt file detected at ${new Date().toISOString()}: ${uri.fsPath}`)
	})

	// Check for iterate.prmt when workspace folders change
	vscode.workspace.onDidChangeWorkspaceFolders(async (event) => {
		for (const folder of event.added) {
			const files = await vscode.workspace.findFiles(new vscode.RelativePattern(folder, "iterate.prmt"))
			if (files.length > 0) {
				vscode.window.showInformationMessage(`Iterate prompt file found in workspace: ${files[0].fsPath}`)
				outputChannel.appendLine(`Iterate prompt file found at ${new Date().toISOString()}: ${files[0].fsPath}`)
			}
		}
	})

	// Add watchers to subscriptions for cleanup
	context.subscriptions.push(systemFileWatcher, iterateFileWatcher)

	// Check for existing iterate.prmt files in current workspace folders
	if (vscode.workspace.workspaceFolders) {
		for (const folder of vscode.workspace.workspaceFolders) {
			const files = await vscode.workspace.findFiles(new vscode.RelativePattern(folder, "iterate.prmt"))
			if (files.length > 0) {
				vscode.window.showInformationMessage(`Iterate prompt file found in workspace: ${files[0].fsPath}`)
				outputChannel.appendLine(`Iterate prompt file found at ${new Date().toISOString()}: ${files[0].fsPath}`)
			}
		}
	}
}
