import ttSnippets from './ttSnippets';

function normalizeBody(body: string | string[]): string {
  return Array.isArray(body) ? body.join('\n') : body;
}

function normalizePrefixes(prefix: string | string[]): string[] {
  return Array.isArray(prefix) ? prefix : [prefix];
}

export function registerTTCompletion(monaco: any, enableForAllLanguages: boolean = false) {
  if (!monaco) {
    return;
  }

  // Всегда создаем темы заново для корректной работы
  monaco.editor.defineTheme('tt-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'keyword', foreground: '#569CD6', fontStyle: 'bold' },
      { token: 'string', foreground: '#CE9178' },
      { token: 'comment', foreground: '#6A9955', fontStyle: 'italic' },
      { token: 'tag', foreground: '#92C5F8' },
      { token: 'number', foreground: '#B5CEA8' },
      { token: 'variable', foreground: '#9CDCFE' },
      { token: 'operator', foreground: '#D4D4D4' },
      { token: 'delimiter', foreground: '#DCDCAA' },
      { token: 'text', foreground: '#D4D4D4' }
    ],
    colors: {}
  });
  
  monaco.editor.defineTheme('tt-light', {
    base: 'vs',
    inherit: true,
    rules: [
      { token: 'keyword', foreground: '#0000FF', fontStyle: 'bold' },
      { token: 'string', foreground: '#A31515' },
      { token: 'comment', foreground: '#008000', fontStyle: 'italic' },
      { token: 'tag', foreground: '#800080' },
      { token: 'number', foreground: '#098658' },
      { token: 'variable', foreground: '#001080' },
      { token: 'operator', foreground: '#000000' },
      { token: 'delimiter', foreground: '#0451A5' },
      { token: 'text', foreground: '#000000' }
    ],
    colors: {}
  });

  // Проверяем, инициализирована ли уже система TT (только один раз для языка tt и UI)
  if (!(monaco as any).__ttLanguageRegistered) {
    (monaco as any).__ttLanguageRegistered = true;
    
    monaco.languages.register({ 
      id: 'tt',
      extensions: ['.tt', '.tt2'],
      aliases: ['Template Toolkit', 'tt'],
      mimetypes: ['text/x-tt']
    });

    // Определяем токенизатор для синтаксической подсветки
    monaco.languages.setMonarchTokensProvider('tt', {
      tokenizer: {
        root: [
          // Template Toolkit директивы - более точные паттерны
          [/\{\{\s*(BLOCK|END|FOR|FOREACH|WHILE|IF|ELSIF|ELSE|UNLESS|SWITCH|CASE|DEFAULT|INCLUDE|PROCESS|INSERT|WRAPPER|FILTER|MACRO|CALL|SET|GET|TRY|CATCH|THROW|LAST|NEXT|STOP|RETURN|CLEAR|META|TAGS|PERL|RAWPERL)\b/, 'keyword'],
          [/\[%\s*(BLOCK|END|FOR|FOREACH|WHILE|IF|ELSIF|ELSE|UNLESS|SWITCH|CASE|DEFAULT|INCLUDE|PROCESS|INSERT|WRAPPER|FILTER|MACRO|CALL|SET|GET|TRY|CATCH|THROW|LAST|NEXT|STOP|RETURN|CLEAR|META|TAGS|PERL|RAWPERL)\b/, 'keyword'],
          
          // Template Toolkit переменные и выражения
          [/\{\{[^}]*\}\}/, 'string'],
          [/\[%[^%]*%\]/, 'string'],
          
          // Комментарии Template Toolkit
          [/\{\{#[^}]*#\}\}/, 'comment'],
          [/\[%#[^%]*#%\]/, 'comment'],
          
          // Переменные и операторы внутри TT блоков  
          [/\{\{/, { token: 'delimiter', bracket: '@open', next: '@ttBlock' }],
          [/\[%/, { token: 'delimiter', bracket: '@open', next: '@ttBlock' }],
          
          // HTML теги
          [/<\/?[a-zA-Z][\w:.-]*\/?>/, 'tag'],
          
          // Строки
          [/"([^"\\]|\\.)*"/, 'string'],
          [/'([^'\\]|\\.)*'/, 'string'],
          
          // Числа
          [/\b\d+(\.\d+)?\b/, 'number'],
          
          // Обычный текст
          [/[^{<\["']+/, 'text']
        ],
        
        ttBlock: [
          // Закрывающие теги
          [/\}\}/, { token: 'delimiter', bracket: '@close', next: '@pop' }],
          [/%\]/, { token: 'delimiter', bracket: '@close', next: '@pop' }],
          
          // Ключевые слова внутри блоков
          [/(BLOCK|END|FOR|FOREACH|WHILE|IF|ELSIF|ELSE|UNLESS|SWITCH|CASE|DEFAULT|INCLUDE|PROCESS|INSERT|WRAPPER|FILTER|MACRO|CALL|SET|GET|TRY|CATCH|THROW|LAST|NEXT|STOP|RETURN|CLEAR|META|TAGS|PERL|RAWPERL)\b/, 'keyword'],
          
          // Операторы и пунктуация
          [/[=!<>]=?/, 'operator'],
          [/[+\-*\/]/, 'operator'],
          [/[()[\]{}|]/, 'delimiter'],
          
          // Переменные (начинающиеся с букв)
          [/[a-zA-Z_]\w*/, 'variable'],
          
          // Строки внутри блоков
          [/"([^"\\]|\\.)*"/, 'string'],
          [/'([^'\\]|\\.)*'/, 'string'],
          
          // Числа
          [/\b\d+(\.\d+)?\b/, 'number'],
          
          // Пробелы
          [/\s+/, 'white']
        ]
      }
    });


  }

  // Очищаем старые провайдеры если они были
  if ((monaco as any).__ttProviders) {
    (monaco as any).__ttProviders.forEach((disposable: any) => disposable.dispose());
  }
  (monaco as any).__ttProviders = [];

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

  // Определяем языки для регистрации провайдеров автодополнения
  const languagesToRegister = enableForAllLanguages 
    ? ['tt', 'plaintext', 'html', 'json', 'javascript', 'shell', 'perl']
    : ['tt']; // Только для 'tt' если не включен флаг для всех языков
    
  languagesToRegister.forEach((language) => {
    const disposable = monaco.languages.registerCompletionItemProvider(language, {
      triggerCharacters: ['{', '.'],
      provideCompletionItems: (model: any, position: any) => ({
        suggestions: getSuggestions(model, position),
      }),
    });
    (monaco as any).__ttProviders.push(disposable);
  });
}
