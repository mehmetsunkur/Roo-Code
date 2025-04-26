import * as path from "path"
import fs from "fs/promises"

import * as vscode from "vscode"
import { ProviderSettingsManager } from "../core/config/ProviderSettingsManager"
import { ContextProxy } from "../core/config/ContextProxy"

/** origin: src/core/config/importExport.ts */

type ImportExportOptions = {
	providerSettingsManager: ProviderSettingsManager
	contextProxy: ContextProxy
}
export const exportSettings = async (
	{ providerSettingsManager, contextProxy }: ImportExportOptions,
	exportFilePath: vscode.Uri,
) => {
	const uri = exportFilePath
	const providerProfiles = await providerSettingsManager.export()
	const globalSettings = await contextProxy.export()

	const dirname = path.dirname(uri.fsPath)
	await fs.mkdir(dirname, { recursive: true })
	await fs.writeFile(uri.fsPath, JSON.stringify({ providerProfiles, globalSettings }, null, 2), "utf-8")
}
