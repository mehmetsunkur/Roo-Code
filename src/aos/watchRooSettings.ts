import * as vscode from "vscode"

import { ClineProvider } from "../core/webview/ClineProvider"
import { t } from "../i18n"

import { importSettings } from "./importExport"

export async function importAosRooSettings(
	provider: ClineProvider,
	uri: vscode.Uri,
	outputChannel: vscode.OutputChannel,
) {
	const success = await importSettings({
		configJsonPath: uri.fsPath,
		providerSettingsManager: provider.providerSettingsManager,
		contextProxy: provider.contextProxy,
		customModesManager: provider.customModesManager,
	})
	if (success) {
		provider.settingsImportedAt = Date.now()
		await provider.postStateToWebview()
		await vscode.window.showInformationMessage(t("common:info.settings_imported"))
	} else {
		const msg = "Warning: could not import rooSettings.json file not found at " + uri.fsPath
		vscode.window.showWarningMessage(msg)
		outputChannel.appendLine(msg)
	}
}

export async function watchRooSettings(
	context: vscode.ExtensionContext,
	provider: ClineProvider,
	outputChannel: vscode.OutputChannel,
) {
	// Check if rooSettings.json exists
	const rooSettingsUri = vscode.Uri.file("/aos/roo-code-settings.json")

	const rooSettingsWatcher = vscode.workspace.createFileSystemWatcher(rooSettingsUri.fsPath)
	rooSettingsWatcher.onDidCreate(async (uri) => {
		const msg = `rooSettings.json file created, importing at: ${rooSettingsUri.fsPath}`
		vscode.window.showInformationMessage(msg)
		outputChannel.appendLine(msg)
		await importAosRooSettings(provider, uri, outputChannel)
	})
	rooSettingsWatcher.onDidChange(async (uri) => {
		const msg = `rooSettings.json file changed, importing at: ${rooSettingsUri.fsPath}`
		vscode.window.showInformationMessage(msg)
		outputChannel.appendLine(msg)
		await importAosRooSettings(provider, uri, outputChannel)
	})

	// Add watchers to subscriptions for cleanup
	context.subscriptions.push(rooSettingsWatcher)
	// import setting if the file already exixts
	try {
		await vscode.workspace.fs.stat(rooSettingsUri)
		const msg = `rooSettings.json file found importing at: ${rooSettingsUri.fsPath}`
		vscode.window.showInformationMessage(msg)
		outputChannel.appendLine(msg)
		await importAosRooSettings(provider, rooSettingsUri, outputChannel)
	} catch (err) {
		const msg = "Warning: rooSettings.json file not found at " + rooSettingsUri.fsPath
		vscode.window.showWarningMessage(msg)
		outputChannel.appendLine(msg)
	}
}
