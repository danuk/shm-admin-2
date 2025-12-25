import ttSnippets from './ttSnippets';

function normalizeBody(body: string | string[]): string {
  return Array.isArray(body) ? body.join('\n') : body;
}

function normalizePrefixes(prefix: string | string[]): string[] {
  return Array.isArray(prefix) ? prefix : [prefix];
}

export function registerTTCompletion(monaco: any) {
  if (!monaco || (monaco as any).__ttCompletionRegistered) {
    return;
  }
  (monaco as any).__ttCompletionRegistered = true;

  if (!monaco.languages.getLanguages().some((lang: any) => lang.id === 'tt')) {
    monaco.languages.register({ id: 'tt' });
  }

  const allSuggestions = Object.entries(ttSnippets).flatMap(([key, snippet]) => {
    const body = normalizeBody(snippet.body);
    const prefixes = normalizePrefixes(snippet.prefix);
    return prefixes.map((prefix) => ({
      label: prefix,
      kind: monaco.languages.CompletionItemKind.Snippet,
      detail: snippet.description || key,
      documentation: snippet.description || key,
      insertText: body,
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    }));
  });

  const getSuggestions = (model: any, position: any) => {
    const lineContent = model.getLineContent(position.lineNumber);
    const before = lineContent.slice(0, position.column - 1);
    const lastOpen = before.lastIndexOf('{{');
    const lastClose = before.lastIndexOf('}}');
    const inTag = lastOpen > lastClose;

    if (!inTag) {
      return [];
    }

    const dotMatch = /([A-Za-z0-9_]+)\.$/.exec(before.trim());
    const groupPrefix = dotMatch ? `${dotMatch[1]}.` : null;

    if (groupPrefix) {
      return allSuggestions.filter((item) => String(item.label).startsWith(groupPrefix));
    }

    if (before.trim().endsWith('.')) {
      return allSuggestions.filter((item) => String(item.label).includes('.'));
    }

    return allSuggestions;
  };

  const languages = ['tt', 'plaintext', 'html', 'json', 'javascript', 'shell', 'perl'];
  languages.forEach((language) => {
    monaco.languages.registerCompletionItemProvider(language, {
      triggerCharacters: ['{', '.'],
      provideCompletionItems: (model: any, position: any) => ({
        suggestions: getSuggestions(model, position),
      }),
    });
  });
}
