import * as vscode from 'vscode';
import fetch from 'node-fetch';
import NodeCache from 'node-cache';

interface Snippet {
    label: string;
    detail: string;
    code: string;
}

interface SnippetsResponse {
    snippets: Snippet[];
}

const cache = new NodeCache({ stdTTL: 3600 }); // Cache for 1 hour

export function activate(context: vscode.ExtensionContext) {
    console.log('Extension "framework-copilot" is now active!');

    let disposable = vscode.commands.registerCommand('extension.frameworkCopilot', () => {
        vscode.window.showInformationMessage('Framework Copilot Activated!');
    });

    context.subscriptions.push(disposable);

    vscode.languages.registerCompletionItemProvider({ scheme: 'file', language: 'javascript' }, {
        provideCompletionItems: async (document: vscode.TextDocument, position: vscode.Position) => {
            const completionItems: vscode.CompletionItem[] = [];

            const snippets = await fetchSnippetsFromService();

            snippets.forEach((snippet: Snippet) => {
                const completionItem = new vscode.CompletionItem(snippet.label, vscode.CompletionItemKind.Function);
                completionItem.detail = snippet.detail;
                completionItem.insertText = snippet.code;
                completionItems.push(completionItem);
            });

            return completionItems;
        }
    });
}

export function deactivate() {}

async function fetchSnippetsFromService(): Promise<Snippet[]> {
    const cacheKey = 'pui-snippets';
    if (cache.has(cacheKey)) {
        return cache.get(cacheKey) as Snippet[];
    }

    const response = await fetch('http://localhost:3000/snippets?owner=vercel&repo=next.js&ref=main');
    const data = (await response.json()) as SnippetsResponse;
    
    cache.set(cacheKey, data.snippets);
    return data.snippets;
}