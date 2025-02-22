"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const node_cache_1 = __importDefault(require("node-cache"));
const eventsource_1 = require("eventsource");
// Cache results for 1 hour
const cache = new node_cache_1.default({ stdTTL: 3600 });
function activate(context) {
    console.log('Extension "framework-copilot" is now active!');
    // Command Registration
    let disposable = vscode.commands.registerCommand('extension.frameworkCopilot', () => __awaiter(this, void 0, void 0, function* () {
        vscode.window.showInformationMessage('Framework Copilot Activated!');
        console.log('Command "extension.frameworkCopilot" executed.');
        // Fetch and log snippets to debug console
        try {
            const snippets = yield fetchSnippetsFromService();
            console.log('Fetched Snippets:', snippets);
        }
        catch (error) {
            console.error('Error fetching snippets:', error);
        }
    }));
    context.subscriptions.push(disposable);
    // Completion Provider Registration
    const provider = vscode.languages.registerCompletionItemProvider({ scheme: 'file', language: 'javascript' }, {
        provideCompletionItems: (document, position) => __awaiter(this, void 0, void 0, function* () {
            console.log('Providing completion items...');
            const completionItems = [];
            try {
                const snippets = yield fetchSnippetsFromService();
                snippets.forEach((snippet) => {
                    const completionItem = new vscode.CompletionItem(snippet.label, vscode.CompletionItemKind.Function);
                    completionItem.detail = snippet.detail;
                    completionItem.insertText = snippet.code;
                    completionItems.push(completionItem);
                });
                console.log('Completion items provided:', completionItems);
            }
            catch (error) {
                console.error('Failed to fetch snippets:', error);
            }
            return completionItems;
        })
    });
    context.subscriptions.push(provider);
    // Listen for text changes and trigger on "@electrode <query>"
    const editorChangeListener = vscode.workspace.onDidChangeTextDocument((event) => __awaiter(this, void 0, void 0, function* () {
        const editor = vscode.window.activeTextEditor;
        if (!editor)
            return;
        const document = editor.document;
        const text = document.getText();
        const match = text.match(/@electrode\s+([^\s]+)/);
        if (match) {
            const query = match[1];
            console.log(`Detected "@electrode ${query}"`);
            // Fetch and log snippets to debug console
            try {
                const snippets = yield fetchSnippetsFromService();
                console.log('Fetched Snippets:', snippets);
                // Optionally, you can show the snippets in a message or use them in some other way
                vscode.window.showInformationMessage(`Fetched ${snippets.length} snippets for query: ${query}`);
            }
            catch (error) {
                console.error('Error fetching snippets:', error);
            }
        }
    }));
    context.subscriptions.push(editorChangeListener);
}
function deactivate() {
    console.log('Extension "framework-copilot" is now deactivated.');
}
// Fetch Snippets with Error Handling
function fetchSnippetsFromService() {
    return __awaiter(this, void 0, void 0, function* () {
        const owner = 'electrode-io';
        const repo = 'electrode';
        const ref = 'main';
        const cacheKey = 'pui-snippets';
        if (cache.has(cacheKey)) {
            console.log('Returning cached snippets.');
            return cache.get(cacheKey);
        }
        try {
            console.log('Fetching snippets from service...');
            const snippets = [];
            const host = `http://localhost:3000/snippets?owner=${owner}&repo=${repo}&ref=${ref}`;
            console.log('Connecting to:', host);
            return new Promise((resolve, reject) => {
                const eventSource = new eventsource_1.EventSource(host);
                eventSource.onmessage = (event) => {
                    const snippet = JSON.parse(event.data);
                    snippets.push(snippet);
                    console.log('Snippet received:', snippet);
                };
                eventSource.onerror = (error) => {
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
        }
        catch (error) {
            if (error instanceof Error) {
                console.error('Error fetching snippets:', error.message);
                console.error('Error stack:', error.stack);
            }
            else {
                console.error('Unknown error fetching snippets:', error);
            }
            return []; // Return empty array on failure to prevent breaking extension
        }
    });
}
