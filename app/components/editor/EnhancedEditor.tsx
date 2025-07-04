import { useStore } from '@nanostores/react';
import { useState, useRef, useEffect } from 'react';
import { EditorView } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { basicSetup } from 'codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { json } from '@codemirror/lang-json';
import { markdown } from '@codemirror/lang-markdown';
import { oneDark } from '@codemirror/theme-one-dark';
import { autocompletion, completionKeymap } from '@codemirror/autocomplete';
import { searchKeymap } from '@codemirror/search';
import { keymap } from '@codemirror/view';
import { indentWithTab } from '@codemirror/commands';
import { agentStore } from '~/lib/stores/agent';
import { classNames } from '~/utils/classNames';

interface EnhancedEditorProps {
  value: string;
  onChange: (value: string) => void;
  language?: string;
  fileName?: string;
  readonly?: boolean;
  className?: string;
  onSave?: () => void;
  onFormat?: () => void;
  showLineNumbers?: boolean;
  showFoldGutter?: boolean;
  enableVim?: boolean;
  enableEmacs?: boolean;
}

// Language detection based on file extension
const getLanguageExtension = (fileName: string) => {
  const ext = fileName.split('.').pop()?.toLowerCase();
  
  switch (ext) {
    case 'js':
    case 'jsx':
    case 'ts':
    case 'tsx':
      return javascript({ jsx: true, typescript: ext.includes('ts') });
    case 'py':
      return python();
    case 'html':
    case 'htm':
      return html();
    case 'css':
    case 'scss':
    case 'sass':
      return css();
    case 'json':
      return json();
    case 'md':
    case 'markdown':
      return markdown();
    default:
      return javascript();
  }
};

// AI-powered code suggestions
const aiCompletionSource = async (context: any) => {
  const word = context.matchBefore(/\w*/);
  if (!word || word.from === word.to) return null;

  // Get current context for AI suggestions
  const currentContext = context.state.doc.toString();
  const agentContext = agentStore.getCurrentSessionContext();
  
  // Here you would integrate with your AI service
  // For now, we'll return some mock suggestions
  const suggestions = [
    'console.log',
    'function',
    'const',
    'let',
    'var',
    'if',
    'else',
    'for',
    'while',
    'return',
    'import',
    'export',
    'class',
    'interface',
    'type'
  ].filter(suggestion => 
    suggestion.toLowerCase().startsWith(word.text.toLowerCase())
  ).map(suggestion => ({
    label: suggestion,
    type: 'keyword',
    info: `AI suggested: ${suggestion}`
  }));

  return {
    from: word.from,
    options: suggestions
  };
};

export function EnhancedEditor({
  value,
  onChange,
  language,
  fileName = '',
  readonly = false,
  className,
  onSave,
  onFormat,
  showLineNumbers = true,
  showFoldGutter = true,
  enableVim = false,
  enableEmacs = false
}: EnhancedEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);

  // Initialize CodeMirror
  useEffect(() => {
    if (!editorRef.current || viewRef.current) return;

    const extensions = [
      basicSetup,
      getLanguageExtension(fileName),
      EditorView.theme({
        '&': {
          fontSize: '14px',
          fontFamily: 'JetBrains Mono, Consolas, Monaco, monospace'
        },
        '.cm-editor': {
          minHeight: '300px'
        },
        '.cm-focused': {
          outline: 'none',
          borderColor: '#a855f7'
        },
        '.cm-content': {
          padding: '12px',
          lineHeight: '1.5'
        },
        '.cm-line': {
          padding: '0 4px'
        },
        // Violet theme enhancements
        '.cm-cursor': {
          borderLeftColor: '#a855f7'
        },
        '.cm-selectionBackground': {
          backgroundColor: 'rgba(168, 85, 247, 0.2)'
        },
        '.cm-activeLine': {
          backgroundColor: 'rgba(168, 85, 247, 0.05)'
        },
        '.cm-activeLineGutter': {
          backgroundColor: 'rgba(168, 85, 247, 0.1)'
        }
      }),
      oneDark, // Dark theme
      autocompletion({
        override: [aiCompletionSource]
      }),
      keymap.of([
        ...completionKeymap,
        ...searchKeymap,
        indentWithTab,
        {
          key: 'Ctrl-s',
          run: () => {
            onSave?.();
            return true;
          }
        },
        {
          key: 'Ctrl-Shift-f',
          run: () => {
            onFormat?.();
            return true;
          }
        },
        {
          key: 'Ctrl-Shift-p',
          run: () => {
            setShowCommandPalette(true);
            return true;
          }
        }
      ]),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          onChange(update.state.doc.toString());
        }
      }),
      EditorState.readOnly.of(readonly)
    ];

    const state = EditorState.create({
      doc: value,
      extensions
    });

    const view = new EditorView({
      state,
      parent: editorRef.current
    });

    viewRef.current = view;
    setIsReady(true);

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, [fileName]);

  // Update editor content when value changes externally
  useEffect(() => {
    if (viewRef.current && value !== viewRef.current.state.doc.toString()) {
      const transaction = viewRef.current.state.update({
        changes: {
          from: 0,
          to: viewRef.current.state.doc.length,
          insert: value
        }
      });
      viewRef.current.dispatch(transaction);
    }
  }, [value]);

  // AI-powered features
  const handleAiAnalyze = async () => {
    const currentCode = viewRef.current?.state.doc.toString() || '';
    agentStore.addMemory(
      `Code analysis request for ${fileName}: ${currentCode}`,
      'enhanced-editor',
      'code-analysis'
    );
    // Here you would integrate with your AI analysis service
  };

  const handleAiSuggest = async () => {
    const currentCode = viewRef.current?.state.doc.toString() || '';
    // Simulate AI suggestions
    const suggestions = [
      'Add error handling',
      'Optimize performance',
      'Add TypeScript types',
      'Extract to function',
      'Add unit tests'
    ];
    setAiSuggestions(suggestions);
  };

  const handleFormatCode = () => {
    // Implement code formatting logic
    onFormat?.();
  };

  const commands = [
    {
      id: 'save',
      label: 'Save File',
      description: 'Save current file (Ctrl+S)',
      action: () => onSave?.()
    },
    {
      id: 'format',
      label: 'Format Code',
      description: 'Format current file (Ctrl+Shift+F)',
      action: handleFormatCode
    },
    {
      id: 'ai-analyze',
      label: 'AI: Analyze Code',
      description: 'Get AI analysis of current code',
      action: handleAiAnalyze
    },
    {
      id: 'ai-suggest',
      label: 'AI: Get Suggestions',
      description: 'Get AI improvement suggestions',
      action: handleAiSuggest
    },
    {
      id: 'toggle-vim',
      label: 'Toggle Vim Mode',
      description: 'Enable/disable Vim key bindings',
      action: () => {}
    }
  ];

  const filteredCommands = commands.filter(cmd =>
    cmd.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cmd.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className={classNames('relative h-full flex flex-col', className)}>
      {/* Enhanced Editor Toolbar */}
      <div className="flex items-center justify-between p-2 bg-bolt-elements-background-depth-3 border-b border-bolt-elements-borderColor">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-sm text-bolt-elements-textSecondary">
            <div className="i-ph:file-code" />
            <span>{fileName || 'Untitled'}</span>
          </div>
          {language && (
            <span className="px-2 py-1 text-xs bg-violet-600/20 text-violet-300 rounded">
              {language.toUpperCase()}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowCommandPalette(true)}
            className="p-1.5 rounded hover:bg-bolt-elements-background-depth-4 text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary transition-colors"
            title="Command Palette (Ctrl+Shift+P)"
          >
            <div className="i-ph:command w-4 h-4" />
          </button>
          
          <button
            onClick={handleAiAnalyze}
            className="p-1.5 rounded hover:bg-bolt-elements-background-depth-4 text-violet-400 hover:text-violet-300 transition-colors"
            title="AI Analysis"
          >
            <div className="i-ph:robot w-4 h-4" />
          </button>

          <button
            onClick={handleFormatCode}
            className="p-1.5 rounded hover:bg-bolt-elements-background-depth-4 text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary transition-colors"
            title="Format Code (Ctrl+Shift+F)"
          >
            <div className="i-ph:code w-4 h-4" />
          </button>

          <button
            onClick={onSave}
            className="p-1.5 rounded hover:bg-bolt-elements-background-depth-4 text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary transition-colors"
            title="Save (Ctrl+S)"
          >
            <div className="i-ph:floppy-disk w-4 h-4" />
          </button>
        </div>
      </div>

      {/* CodeMirror Editor */}
      <div className="flex-1 overflow-hidden">
        <div ref={editorRef} className="h-full" />
      </div>

      {/* AI Suggestions Panel */}
      {aiSuggestions.length > 0 && (
        <div className="absolute top-16 right-4 w-64 bg-bolt-elements-background-depth-1 border border-bolt-elements-borderColor rounded-lg shadow-lg p-3 z-10">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-bolt-elements-textPrimary">AI Suggestions</h4>
            <button
              onClick={() => setAiSuggestions([])}
              className="text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary"
            >
              <div className="i-ph:x w-4 h-4" />
            </button>
          </div>
          <div className="space-y-1">
            {aiSuggestions.map((suggestion, index) => (
              <div
                key={index}
                className="p-2 rounded bg-bolt-elements-background-depth-2 text-sm text-bolt-elements-textPrimary cursor-pointer hover:bg-bolt-elements-background-depth-3"
              >
                {suggestion}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Command Palette */}
      {showCommandPalette && (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center pt-20 z-50">
          <div className="bg-bolt-elements-background-depth-1 rounded-lg border border-bolt-elements-borderColor w-96 max-w-[90vw] max-h-80 overflow-hidden">
            <div className="p-3 border-b border-bolt-elements-borderColor">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Type a command..."
                className="w-full px-3 py-2 bg-bolt-elements-background-depth-2 border border-bolt-elements-borderColor rounded text-bolt-elements-textPrimary placeholder-bolt-elements-textTertiary focus:border-violet-400 focus:outline-none"
                autoFocus
              />
            </div>
            
            <div className="max-h-64 overflow-y-auto">
              {filteredCommands.length === 0 ? (
                <div className="p-4 text-center text-bolt-elements-textSecondary">
                  No commands found
                </div>
              ) : (
                filteredCommands.map((command) => (
                  <button
                    key={command.id}
                    onClick={() => {
                      command.action();
                      setShowCommandPalette(false);
                      setSearchQuery('');
                    }}
                    className="w-full p-3 text-left hover:bg-bolt-elements-background-depth-2 transition-colors border-none bg-transparent"
                  >
                    <div className="text-sm font-medium text-bolt-elements-textPrimary">
                      {command.label}
                    </div>
                    <div className="text-xs text-bolt-elements-textSecondary">
                      {command.description}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Status Bar */}
      <div className="flex items-center justify-between px-3 py-1 bg-bolt-elements-background-depth-3 border-t border-bolt-elements-borderColor text-xs text-bolt-elements-textSecondary">
        <div className="flex items-center gap-4">
          <span>Line: {viewRef.current?.state.selection.main.head || 0}</span>
          <span>Language: {language || 'Plain Text'}</span>
          {readonly && <span className="text-orange-400">Read Only</span>}
        </div>
        
        <div className="flex items-center gap-2">
          {isReady && (
            <span className="text-green-400">
              <div className="i-ph:check-circle w-3 h-3" />
            </span>
          )}
          <span>Enhanced Editor</span>
        </div>
      </div>
    </div>
  );
}