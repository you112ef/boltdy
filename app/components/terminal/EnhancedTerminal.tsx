import { useStore } from '@nanostores/react';
import { useState, useRef, useEffect, useCallback } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { SearchAddon } from '@xterm/addon-search';
import { WebglAddon } from '@xterm/addon-webgl';
import { agentStore } from '~/lib/stores/agent';
import { classNames } from '~/utils/classNames';

interface EnhancedTerminalProps {
  className?: string;
  onTerminalReady?: (terminal: XTerm) => void;
  onCommand?: (command: string) => void;
  initialCommands?: string[];
  theme?: 'dark' | 'light';
  enableAI?: boolean;
}

interface TerminalSession {
  id: string;
  name: string;
  terminal: XTerm;
  history: string[];
  isActive: boolean;
  created: number;
}

interface CommandSuggestion {
  command: string;
  description: string;
  category: string;
  example?: string;
}

const COMMON_COMMANDS: CommandSuggestion[] = [
  // File Operations
  { command: 'ls', description: 'List directory contents', category: 'Files', example: 'ls -la' },
  { command: 'cd', description: 'Change directory', category: 'Files', example: 'cd /path/to/dir' },
  { command: 'pwd', description: 'Print working directory', category: 'Files' },
  { command: 'mkdir', description: 'Create directory', category: 'Files', example: 'mkdir new-folder' },
  { command: 'rm', description: 'Remove files/directories', category: 'Files', example: 'rm -rf folder' },
  { command: 'cp', description: 'Copy files/directories', category: 'Files', example: 'cp file.txt backup.txt' },
  { command: 'mv', description: 'Move/rename files', category: 'Files', example: 'mv old.txt new.txt' },
  
  // Git Commands
  { command: 'git init', description: 'Initialize git repository', category: 'Git' },
  { command: 'git status', description: 'Show git status', category: 'Git' },
  { command: 'git add', description: 'Stage changes', category: 'Git', example: 'git add .' },
  { command: 'git commit', description: 'Commit changes', category: 'Git', example: 'git commit -m "message"' },
  { command: 'git push', description: 'Push to remote', category: 'Git', example: 'git push origin main' },
  { command: 'git pull', description: 'Pull from remote', category: 'Git' },
  { command: 'git branch', description: 'List/create branches', category: 'Git', example: 'git branch feature' },
  
  // Node/NPM Commands
  { command: 'npm init', description: 'Initialize npm package', category: 'Node', example: 'npm init -y' },
  { command: 'npm install', description: 'Install packages', category: 'Node', example: 'npm install package-name' },
  { command: 'npm run', description: 'Run npm script', category: 'Node', example: 'npm run dev' },
  { command: 'npx', description: 'Execute npm package', category: 'Node', example: 'npx create-react-app' },
  
  // Development
  { command: 'code .', description: 'Open VS Code', category: 'Dev' },
  { command: 'python', description: 'Run Python', category: 'Dev', example: 'python script.py' },
  { command: 'node', description: 'Run Node.js', category: 'Dev', example: 'node script.js' },
  { command: 'curl', description: 'HTTP client', category: 'Dev', example: 'curl -X GET https://api.example.com' },
];

export function EnhancedTerminal({
  className,
  onTerminalReady,
  onCommand,
  initialCommands = [],
  theme = 'dark',
  enableAI = true
}: EnhancedTerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const [sessions, setSessions] = useState<TerminalSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [currentCommand, setCurrentCommand] = useState('');
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showAIHelper, setShowAIHelper] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [aiSuggestion, setAiSuggestion] = useState('');
  
  const fitAddonRef = useRef<FitAddon>();
  const searchAddonRef = useRef<SearchAddon>();

  const createTerminalTheme = useCallback(() => {
    return {
      background: '#0d0d0d',
      foreground: '#e4e4e7',
      cursor: '#a855f7',
      cursorAccent: '#a855f7',
      selection: 'rgba(168, 85, 247, 0.3)',
      black: '#000000',
      red: '#ff5c57',
      green: '#5af78e',
      yellow: '#f3f99d',
      blue: '#57c7ff',
      magenta: '#a855f7',
      cyan: '#9aedfe',
      white: '#e4e4e7',
      brightBlack: '#686868',
      brightRed: '#ff6ac1',
      brightGreen: '#5af78e',
      brightYellow: '#f3f99d',
      brightBlue: '#57c7ff',
      brightMagenta: '#a855f7',
      brightCyan: '#9aedfe',
      brightWhite: '#ffffff',
    };
  }, []);

  const createTerminalSession = useCallback((name: string) => {
    const sessionId = `terminal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const terminal = new XTerm({
      cursorBlink: true,
      convertEol: true,
      fontFamily: 'JetBrains Mono, Consolas, Monaco, monospace',
      fontSize: 14,
      lineHeight: 1.2,
      theme: createTerminalTheme(),
      allowProposedApi: true,
    });

    // Add addons
    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();
    const searchAddon = new SearchAddon();
    
    try {
      const webglAddon = new WebglAddon();
      terminal.loadAddon(webglAddon);
    } catch (e) {
      console.log('WebGL addon not available, falling back to canvas renderer');
    }

    terminal.loadAddon(fitAddon);
    terminal.loadAddon(webLinksAddon);
    terminal.loadAddon(searchAddon);

    fitAddonRef.current = fitAddon;
    searchAddonRef.current = searchAddon;

    const session: TerminalSession = {
      id: sessionId,
      name,
      terminal,
      history: [],
      isActive: sessions.length === 0,
      created: Date.now(),
    };

    // Handle terminal data
    terminal.onData((data) => {
      if (data === '\r') { // Enter key
        const line = currentCommand.trim();
        if (line) {
          setCommandHistory(prev => [...prev, line]);
          handleCommand(line);
          setCurrentCommand('');
          
          if (enableAI) {
            agentStore.addMemory(
              `Terminal command executed: ${line}`,
              'enhanced-terminal',
              'command-history'
            );
          }
        }
      } else if (data === '\u007F') { // Backspace
        if (currentCommand.length > 0) {
          setCurrentCommand(prev => prev.slice(0, -1));
          terminal.write('\b \b');
        }
      } else if (data === '\u0003') { // Ctrl+C
        terminal.writeln('^C');
        setCurrentCommand('');
        terminal.write('$ ');
      } else if (data === '\u0012') { // Ctrl+R - Search history
        setShowCommandPalette(true);
      } else {
        setCurrentCommand(prev => prev + data);
        terminal.write(data);
      }
    });

    // Initialize terminal
    if (terminalRef.current) {
      terminal.open(terminalRef.current);
      fitAddon.fit();
      
      terminal.writeln('🚀 Enhanced Terminal Ready');
      terminal.writeln('💡 Press Ctrl+R for command palette, Ctrl+H for AI help');
      terminal.write('$ ');
    }

    onTerminalReady?.(terminal);
    return session;
  }, [sessions.length, currentCommand, createTerminalTheme, enableAI, onTerminalReady]);

  const handleCommand = (command: string) => {
    const activeSession = sessions.find(s => s.id === activeSessionId);
    if (!activeSession) return;

    // Add to session history
    setSessions(prev => prev.map(s => 
      s.id === activeSessionId 
        ? { ...s, history: [...s.history, command] }
        : s
    ));

    onCommand?.(command);

    // AI assistance for command suggestions
    if (enableAI && command.startsWith('help ')) {
      const topic = command.replace('help ', '');
      generateAIHelp(topic);
    }

    // Simulate command execution (you would integrate with actual terminal here)
    setTimeout(() => {
      const output = simulateCommandOutput(command);
      activeSession.terminal.writeln(output);
      activeSession.terminal.write('$ ');
    }, 100);
  };

  const simulateCommandOutput = (command: string): string => {
    if (command.startsWith('ls')) {
      return 'file1.txt  file2.js  folder1/  folder2/';
    } else if (command.startsWith('pwd')) {
      return '/home/user/project';
    } else if (command.startsWith('whoami')) {
      return 'developer';
    } else if (command.startsWith('date')) {
      return new Date().toString();
    } else if (command.startsWith('echo')) {
      return command.replace('echo ', '');
    } else if (command === 'clear') {
      const activeSession = sessions.find(s => s.id === activeSessionId);
      activeSession?.terminal.clear();
      return '';
    } else {
      return `Command executed: ${command}`;
    }
  };

  const generateAIHelp = async (topic: string) => {
    // Simulate AI help generation
    const helpTexts: Record<string, string> = {
      git: 'Git is a version control system. Common commands: init, add, commit, push, pull',
      npm: 'NPM is a package manager for Node.js. Common commands: init, install, run, publish',
      docker: 'Docker is a containerization platform. Common commands: build, run, push, pull',
      python: 'Python is a programming language. Run scripts with: python script.py',
    };

    const help = helpTexts[topic.toLowerCase()] || `Here's what I know about ${topic}...`;
    setAiSuggestion(help);
    setShowAIHelper(true);
  };

  const filteredCommands = COMMON_COMMANDS.filter(cmd =>
    cmd.command.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cmd.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Initialize first session
  useEffect(() => {
    if (sessions.length === 0) {
      const firstSession = createTerminalSession('Main');
      setSessions([firstSession]);
      setActiveSessionId(firstSession.id);
    }
  }, [sessions.length, createTerminalSession]);

  // Execute initial commands
  useEffect(() => {
    if (initialCommands.length > 0 && sessions.length > 0) {
      const activeSession = sessions.find(s => s.id === activeSessionId);
      if (activeSession) {
        initialCommands.forEach((cmd, index) => {
          setTimeout(() => {
            activeSession.terminal.writeln(`$ ${cmd}`);
            handleCommand(cmd);
          }, index * 1000);
        });
      }
    }
  }, [initialCommands, sessions, activeSessionId]);

  const activeSession = sessions.find(s => s.id === activeSessionId);

  return (
    <div className={classNames('h-full flex flex-col bg-bolt-elements-background-depth-1', className)}>
      {/* Terminal Header */}
      <div className="flex items-center justify-between p-2 bg-bolt-elements-background-depth-3 border-b border-bolt-elements-borderColor">
        <div className="flex items-center gap-2">
          <div className="i-ph:terminal text-lg text-violet-400" />
          <span className="font-semibold text-bolt-elements-textPrimary">Enhanced Terminal</span>
          {activeSession && (
            <span className="text-sm text-bolt-elements-textSecondary">
              - {activeSession.name}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowCommandPalette(true)}
            className="p-1.5 rounded hover:bg-bolt-elements-background-depth-4 text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary transition-colors"
            title="Command Palette (Ctrl+R)"
          >
            <div className="i-ph:magnifying-glass w-4 h-4" />
          </button>

          {enableAI && (
            <button
              onClick={() => setShowAIHelper(true)}
              className="p-1.5 rounded hover:bg-bolt-elements-background-depth-4 text-violet-400 hover:text-violet-300 transition-colors"
              title="AI Helper (Ctrl+H)"
            >
              <div className="i-ph:robot w-4 h-4" />
            </button>
          )}

          <button
            onClick={() => {
              const newSession = createTerminalSession(`Terminal ${sessions.length + 1}`);
              setSessions(prev => [...prev, newSession]);
              setActiveSessionId(newSession.id);
            }}
            className="p-1.5 rounded hover:bg-bolt-elements-background-depth-4 text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary transition-colors"
            title="New Terminal"
          >
            <div className="i-ph:plus w-4 h-4" />
          </button>

          <button
            onClick={() => activeSession?.terminal.clear()}
            className="p-1.5 rounded hover:bg-bolt-elements-background-depth-4 text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary transition-colors"
            title="Clear Terminal"
          >
            <div className="i-ph:trash w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Terminal Tabs */}
      {sessions.length > 1 && (
        <div className="flex bg-bolt-elements-background-depth-2 border-b border-bolt-elements-borderColor">
          {sessions.map((session) => (
            <button
              key={session.id}
              onClick={() => setActiveSessionId(session.id)}
              className={classNames(
                'px-4 py-2 text-sm border-r border-bolt-elements-borderColor transition-colors',
                session.id === activeSessionId
                  ? 'bg-bolt-elements-background-depth-1 text-bolt-elements-textPrimary'
                  : 'text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary hover:bg-bolt-elements-background-depth-3'
              )}
            >
              {session.name}
              {sessions.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSessions(prev => prev.filter(s => s.id !== session.id));
                    if (session.id === activeSessionId && sessions.length > 1) {
                      const remainingSessions = sessions.filter(s => s.id !== session.id);
                      setActiveSessionId(remainingSessions[0].id);
                    }
                  }}
                  className="ml-2 text-red-400 hover:text-red-300"
                >
                  ×
                </button>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Terminal Display */}
      <div className="flex-1 p-2">
        <div ref={terminalRef} className="h-full w-full" />
      </div>

      {/* Command Palette */}
      {showCommandPalette && (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center pt-20 z-50">
          <div className="bg-bolt-elements-background-depth-1 rounded-lg border border-bolt-elements-borderColor w-96 max-w-[90vw] max-h-80 overflow-hidden">
            <div className="p-3 border-b border-bolt-elements-borderColor">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search commands..."
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
                filteredCommands.map((cmd, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setCurrentCommand(cmd.command);
                      activeSession?.terminal.write('\r\n$ ' + cmd.command);
                      setShowCommandPalette(false);
                      setSearchQuery('');
                    }}
                    className="w-full p-3 text-left hover:bg-bolt-elements-background-depth-2 transition-colors border-none bg-transparent"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-bolt-elements-textPrimary">
                          {cmd.command}
                        </div>
                        <div className="text-xs text-bolt-elements-textSecondary">
                          {cmd.description}
                        </div>
                      </div>
                      <span className="text-xs text-violet-400 bg-violet-600/20 px-2 py-1 rounded">
                        {cmd.category}
                      </span>
                    </div>
                    {cmd.example && (
                      <div className="text-xs text-bolt-elements-textTertiary mt-1 font-mono">
                        {cmd.example}
                      </div>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* AI Helper */}
      {showAIHelper && (
        <div className="fixed bottom-4 right-4 w-80 bg-bolt-elements-background-depth-1 border border-bolt-elements-borderColor rounded-lg shadow-lg p-4 z-40">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-bolt-elements-textPrimary flex items-center gap-2">
              <div className="i-ph:robot text-violet-400" />
              AI Terminal Assistant
            </h4>
            <button
              onClick={() => setShowAIHelper(false)}
              className="text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary"
            >
              <div className="i-ph:x w-4 h-4" />
            </button>
          </div>
          
          {aiSuggestion ? (
            <div className="text-sm text-bolt-elements-textPrimary bg-bolt-elements-background-depth-2 p-3 rounded">
              {aiSuggestion}
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-bolt-elements-textSecondary">
                Type "help [topic]" for AI assistance, or ask me anything!
              </p>
              <div className="flex flex-wrap gap-1">
                {['git', 'npm', 'docker', 'python'].map((topic) => (
                  <button
                    key={topic}
                    onClick={() => generateAIHelp(topic)}
                    className="px-2 py-1 text-xs bg-violet-600/20 text-violet-300 rounded hover:bg-violet-600/30 transition-colors"
                  >
                    {topic}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Status Bar */}
      <div className="flex items-center justify-between px-3 py-1 bg-bolt-elements-background-depth-3 border-t border-bolt-elements-borderColor text-xs text-bolt-elements-textSecondary">
        <div className="flex items-center gap-4">
          <span>Sessions: {sessions.length}</span>
          <span>History: {commandHistory.length} commands</span>
          {enableAI && <span className="text-violet-400">AI: Enabled</span>}
        </div>
        
        <div className="flex items-center gap-2">
          <span>Enhanced Terminal v2.0</span>
        </div>
      </div>
    </div>
  );
}