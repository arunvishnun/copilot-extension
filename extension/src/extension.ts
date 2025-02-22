import * as vscode from 'vscode';
import NodeCache from 'node-cache';
import { EventSource } from 'eventsource';

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
        console.log('Command "extension.frameworkCopilot" executed.');

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
                console.log('Providing completion items...');
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
                    console.log('Completion items provided:', completionItems);
                } catch (error) {
                    console.error('Failed to fetch snippets:', error);
                }

                return completionItems;
            }
        }
    );

    context.subscriptions.push(provider);

    // Listen for text changes and trigger on "@electrode <query>"
    const editorChangeListener = vscode.workspace.onDidChangeTextDocument(async (event) => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) return;

        const document = editor.document;
        const text = document.getText();
        const match = text.match(/@electrode\s+([^\s]+)/);

        if (match) {
            const query = match[1];
            console.log(`Detected "@electrode ${query}"`);

            // Fetch and log snippets to debug console
            try {
                const snippets = await fetchSnippetsFromService();
                console.log('Fetched Snippets:', snippets);

                // Optionally, you can show the snippets in a message or use them in some other way
                vscode.window.showInformationMessage(`Fetched ${snippets.length} snippets for query: ${query}`);
            } catch (error) {
                console.error('Error fetching snippets:', error);
            }
        }
    });

    context.subscriptions.push(editorChangeListener);
}

export function deactivate() {
    console.log('Extension "framework-copilot" is now deactivated.');
}

// Fetch Snippets with Error Handling
async function fetchSnippetsFromService(): Promise<Snippet[]> {
    const owner = 'electrode-io';
    const repo = 'electrode';
    const ref = 'main';

    const cacheKey = 'pui-snippets';
    if (cache.has(cacheKey)) {
        console.log('Returning cached snippets.');
        return cache.get(cacheKey) as Snippet[];
    }

    try {
        console.log('Fetching snippets from service...');
        const snippets: Snippet[] = [];
        const host = `http://localhost:3000/snippets?owner=${owner}&repo=${repo}&ref=${ref}`;
        console.log('Connecting to:', host);

        return new Promise<Snippet[]>((resolve, reject) => {
            const eventSource = new EventSource(host);

            eventSource.onmessage = (event: MessageEvent) => {
                const snippet: Snippet = JSON.parse(event.data);
                snippets.push(snippet);
                console.log('Snippet received:', snippet);
            };

            eventSource.onerror = (error: Event) => {
                console.error('Error receiving snippets:', error);
                eventSource.close();
                reject(error);
            };

            eventSource.onopen = () => {
                console.log('Connection to server opened.');
            };

            eventSource.addEventListener('end', () => {
                console.log('All snippets received.');
                cache.set(cacheKey, snippets);
                eventSource.close();
                resolve(snippets);
            });
        });
    } catch (error) {
        if (error instanceof Error) {
            console.error('Error fetching snippets:', error.message);
            console.error('Error stack:', error.stack);
        } else {
            console.error('Unknown error fetching snippets:', error);
        }
        return []; // Return empty array on failure to prevent breaking extension
    }
}