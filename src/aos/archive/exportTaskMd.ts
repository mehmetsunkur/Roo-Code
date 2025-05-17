import * as vscode from "vscode"
import * as path from "path"
import * as os from "os"

import { formatContentBlockToMarkdown } from "../../integrations/misc/export-markdown"
import Anthropic from "@anthropic-ai/sdk"

export async function exportTask(dateTs: number, conversationHistory: Anthropic.MessageParam[]) {
	// File name
	const date = new Date(dateTs)
	const month = date.toLocaleString("en-US", { month: "short" }).toLowerCase()
	const day = date.getDate()
	const year = date.getFullYear()
	let hours = date.getHours()
	const minutes = date.getMinutes().toString().padStart(2, "0")
	const seconds = date.getSeconds().toString().padStart(2, "0")
	const ampm = hours >= 12 ? "pm" : "am"
	hours = hours % 12
	hours = hours ? hours : 12 // the hour '0' should be '12'
	const fileName = `cline_task_${month}-${day}-${year}_${hours}-${minutes}-${seconds}-${ampm}.md`
	const saveUri = vscode.Uri.file(path.join(os.homedir(), "Downloads", fileName))

	const markdownContent = await taskToMarkdown(dateTs, conversationHistory)
	await vscode.workspace.fs.writeFile(saveUri, Buffer.from(markdownContent))
}

export async function taskToMarkdown(dateTs: number, conversationHistory: Anthropic.MessageParam[]) {
	// Generate markdown
	const markdownContent = conversationHistory
		.map((message) => {
			const role = message.role === "user" ? "**User:**" : "**Assistant:**"
			const content = Array.isArray(message.content)
				? message.content.map((block) => formatContentBlockToMarkdown(block)).join("\n")
				: message.content
			return `${role}\n\n${content}\n\n`
		})
		.join("---\n\n")
	return markdownContent
}
