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

// Cache results for 1 hour
const cache = new NodeCache({ stdTTL: 3600 });

export function activate(context: vscode.ExtensionContext) {
    console.log('Extension "framework-copilot" is now active!');

    // Command Registration
    let disposable = vscode.commands.registerCommand('extension.frameworkCopilot', async () => {
        vscode.window.showInformationMessage('Framework Copilot Activated!');

        // Fetch and log snippets to debug console
        try {
            const snippets = await fetchSnippetsFromService();
            console.log('Fetched Snippets:', snippets);
        } catch (error) {
            console.error('Error fetching snippets:', error);
        }
    });

    context.subscriptions.push(disposable);

    // Completion Provider Registration
    const provider = vscode.languages.registerCompletionItemProvider(
        { scheme: 'file', language: 'javascript' },
        {
            provideCompletionItems: async (document: vscode.TextDocument, position: vscode.Position) => {
                const completionItems: vscode.CompletionItem[] = [];
                
                try {
                    const snippets = await fetchSnippetsFromService();
                    snippets.forEach((snippet: Snippet) => {
                        const completionItem = new vscode.CompletionItem(
                            snippet.label, 
                            vscode.CompletionItemKind.Function
                        );
                        completionItem.detail = snippet.detail;
                        completionItem.insertText = snippet.code;
                        completionItems.push(completionItem);
                    });
                } catch (error) {
                    console.error('Failed to fetch snippets:', error);
                }

                return completionItems;
            }
        }
    );

    context.subscriptions.push(provider);
}

export function deactivate() {}

// Fetch Snippets with Error Handling
async function fetchSnippetsFromService(): Promise<Snippet[]> {
    const cacheKey = 'pui-snippets';
    if (cache.has(cacheKey)) {
        return cache.get(cacheKey) as Snippet[];
    }

    try {
        const response = await fetch('http://localhost:3000/snippets?owner=vercel&repo=next.js&ref=main');
        
        if (!response.ok) {
            throw new Error(`Failed to fetch snippets: ${response.status} ${response.statusText}`);
        }

        const data = (await response.json()) as SnippetsResponse;
        cache.set(cacheKey, data.snippets);
        return data.snippets;
    } catch (error) {
        console.error('Error fetching snippets:', error);
        return []; // Return empty array on failure to prevent breaking extension
    }
}
