import { atom, map, type MapStore, type WritableAtom } from 'nanostores';
import type { ProviderInfo } from '~/types/model';

export interface AgentMemory {
  context: string;
  timestamp: number;
  provider: string;
  model: string;
  tokens?: number;
}

export interface AgentSession {
  id: string;
  name: string;
  provider: ProviderInfo;
  model: string;
  memory: AgentMemory[];
  created: number;
  lastUsed: number;
  isActive: boolean;
}

export interface AgentCommand {
  id: string;
  command: string;
  description: string;
  provider: string;
  model: string;
  template: string;
  isSystem: boolean;
}

export class AgentStore {
  // Agent sessions management
  sessions: MapStore<Record<string, AgentSession>> = map({});
  currentSession: WritableAtom<string | null> = atom(null);
  
  // Agent memory and context
  globalMemory: WritableAtom<AgentMemory[]> = atom([]);
  maxMemorySize: WritableAtom<number> = atom(100);
  
  // Agent commands and templates
  customCommands: MapStore<Record<string, AgentCommand>> = map({});
  
  // Agent state
  isAgentMode: WritableAtom<boolean> = atom(false);
  continuousMode: WritableAtom<boolean> = atom(false);
  autoSaveContext: WritableAtom<boolean> = atom(true);
  
  constructor() {
    this.loadFromStorage();
    this.initializeDefaultCommands();
  }

  // Session management
  createSession(name: string, provider: ProviderInfo, model: string): string {
    const sessionId = `agent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const newSession: AgentSession = {
      id: sessionId,
      name,
      provider,
      model,
      memory: [],
      created: Date.now(),
      lastUsed: Date.now(),
      isActive: false
    };

    this.sessions.setKey(sessionId, newSession);
    this.saveToStorage();
    
    return sessionId;
  }

  activateSession(sessionId: string) {
    const sessions = this.sessions.get();
    
    // Deactivate all sessions
    Object.keys(sessions).forEach(id => {
      if (sessions[id]) {
        sessions[id].isActive = false;
        sessions[id].lastUsed = Date.now();
        this.sessions.setKey(id, sessions[id]);
      }
    });

    // Activate selected session
    const session = sessions[sessionId];
    if (session) {
      session.isActive = true;
      session.lastUsed = Date.now();
      this.sessions.setKey(sessionId, session);
      this.currentSession.set(sessionId);
      this.isAgentMode.set(true);
    }

    this.saveToStorage();
  }

  deleteSession(sessionId: string) {
    const sessions = this.sessions.get();
    delete sessions[sessionId];
    this.sessions.set(sessions);
    
    if (this.currentSession.get() === sessionId) {
      this.currentSession.set(null);
      this.isAgentMode.set(false);
    }
    
    this.saveToStorage();
  }

  // Memory management
  addMemory(context: string, provider: string, model: string, tokens?: number) {
    const memory: AgentMemory = {
      context,
      timestamp: Date.now(),
      provider,
      model,
      tokens
    };

    // Add to global memory
    const globalMemory = this.globalMemory.get();
    globalMemory.push(memory);
    
    // Manage memory size
    const maxSize = this.maxMemorySize.get();
    if (globalMemory.length > maxSize) {
      globalMemory.splice(0, globalMemory.length - maxSize);
    }
    
    this.globalMemory.set(globalMemory);

    // Add to current session if active
    const currentSessionId = this.currentSession.get();
    if (currentSessionId) {
      const session = this.sessions.get()[currentSessionId];
      if (session) {
        session.memory.push(memory);
        if (session.memory.length > 50) { // Session limit
          session.memory.splice(0, session.memory.length - 50);
        }
        this.sessions.setKey(currentSessionId, session);
      }
    }

    if (this.autoSaveContext.get()) {
      this.saveToStorage();
    }
  }

  getContextForModel(provider: string, model: string, limit: number = 10): string {
    const globalMemory = this.globalMemory.get();
    const relevantMemories = globalMemory
      .filter((m: AgentMemory) => m.provider === provider && m.model === model)
      .slice(-limit);

    return relevantMemories.map((m: AgentMemory) => m.context).join('\n\n');
  }

  getCurrentSessionContext(): string {
    const sessionId = this.currentSession.get();
    if (!sessionId) return '';

    const session = this.sessions.get()[sessionId];
    if (!session) return '';

    return session.memory.map((m: AgentMemory) => m.context).join('\n\n');
  }

  clearMemory() {
    this.globalMemory.set([]);
    const sessionId = this.currentSession.get();
    if (sessionId) {
      const session = this.sessions.get()[sessionId];
      if (session) {
        session.memory = [];
        this.sessions.setKey(sessionId, session);
      }
    }
    this.saveToStorage();
  }

  // Custom commands
  addCustomCommand(command: AgentCommand) {
    this.customCommands.setKey(command.id, command);
    this.saveToStorage();
  }

  removeCustomCommand(commandId: string) {
    const commands = this.customCommands.get();
    delete commands[commandId];
    this.customCommands.set(commands);
    this.saveToStorage();
  }

  getCommandsForProvider(provider: string): AgentCommand[] {
    const commands = this.customCommands.get();
    return (Object.values(commands) as AgentCommand[]).filter((cmd: AgentCommand) => 
      cmd.provider === provider || cmd.provider === 'all'
    );
  }

  // Agent modes
  toggleAgentMode(enabled?: boolean) {
    const newState = enabled !== undefined ? enabled : !this.isAgentMode.get();
    this.isAgentMode.set(newState);
    
    if (!newState) {
      this.currentSession.set(null);
      // Deactivate all sessions
      const sessions = this.sessions.get();
      Object.keys(sessions).forEach(id => {
        if (sessions[id]) {
          sessions[id].isActive = false;
          this.sessions.setKey(id, sessions[id]);
        }
      });
    }
    
    this.saveToStorage();
  }

  toggleContinuousMode(enabled?: boolean) {
    const newState = enabled !== undefined ? enabled : !this.continuousMode.get();
    this.continuousMode.set(newState);
    this.saveToStorage();
  }

  // Storage management
  private saveToStorage() {
    try {
      const data = {
        sessions: this.sessions.get(),
        globalMemory: this.globalMemory.get(),
        customCommands: this.customCommands.get(),
        settings: {
          maxMemorySize: this.maxMemorySize.get(),
          autoSaveContext: this.autoSaveContext.get(),
          continuousMode: this.continuousMode.get(),
          isAgentMode: this.isAgentMode.get(),
          currentSession: this.currentSession.get()
        }
      };
      
      localStorage.setItem('bolt_agent_store', JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save agent store:', error);
    }
  }

  private loadFromStorage() {
    try {
      const stored = localStorage.getItem('bolt_agent_store');
      if (stored) {
        const data = JSON.parse(stored);
        
        if (data.sessions) {
          this.sessions.set(data.sessions);
        }
        
        if (data.globalMemory) {
          this.globalMemory.set(data.globalMemory);
        }
        
        if (data.customCommands) {
          this.customCommands.set(data.customCommands);
        }
        
        if (data.settings) {
          this.maxMemorySize.set(data.settings.maxMemorySize || 100);
          this.autoSaveContext.set(data.settings.autoSaveContext ?? true);
          this.continuousMode.set(data.settings.continuousMode ?? false);
          this.isAgentMode.set(data.settings.isAgentMode ?? false);
          this.currentSession.set(data.settings.currentSession || null);
        }
      }
    } catch (error) {
      console.error('Failed to load agent store:', error);
    }
  }

  private initializeDefaultCommands() {
    const defaultCommands: AgentCommand[] = [
      {
        id: 'analyze_code',
        command: '/analyze',
        description: 'Analyze current code and provide insights',
        provider: 'all',
        model: 'all',
        template: 'Analyze the following code and provide insights about structure, quality, and potential improvements:\n\n{context}',
        isSystem: true
      },
      {
        id: 'optimize_performance',
        command: '/optimize', 
        description: 'Suggest performance optimizations',
        provider: 'all',
        model: 'all',
        template: 'Review this code for performance optimizations and suggest improvements:\n\n{context}',
        isSystem: true
      },
      {
        id: 'fix_bugs',
        command: '/debug',
        description: 'Help debug and fix issues',
        provider: 'all',
        model: 'all',
        template: 'Help me debug this code and identify potential issues:\n\n{context}',
        isSystem: true
      },
      {
        id: 'generate_tests',
        command: '/test',
        description: 'Generate unit tests for code',
        provider: 'all',
        model: 'all',
        template: 'Generate comprehensive unit tests for the following code:\n\n{context}',
        isSystem: true
      },
      {
        id: 'explain_code',
        command: '/explain',
        description: 'Explain how code works',
        provider: 'all',
        model: 'all',
        template: 'Explain how this code works in detail:\n\n{context}',
        isSystem: true
      }
    ];

    const currentCommands = this.customCommands.get();
    defaultCommands.forEach(cmd => {
      if (!currentCommands[cmd.id]) {
        currentCommands[cmd.id] = cmd;
      }
    });
    
    this.customCommands.set(currentCommands);
  }

  // Statistics and analytics
  getMemoryStats() {
    const globalMemory = this.globalMemory.get();
    const sessions = this.sessions.get();
    
    const providerStats: Record<string, number> = {};
    const modelStats: Record<string, number> = {};
    
    globalMemory.forEach((memory: AgentMemory) => {
      providerStats[memory.provider] = (providerStats[memory.provider] || 0) + 1;
      modelStats[memory.model] = (modelStats[memory.model] || 0) + 1;
    });

    return {
      totalMemories: globalMemory.length,
      totalSessions: Object.keys(sessions).length,
      activeSessions: (Object.values(sessions) as AgentSession[]).filter((s: AgentSession) => s.isActive).length,
      providerStats,
      modelStats,
      oldestMemory: globalMemory.length > 0 ? globalMemory[0].timestamp : null,
      newestMemory: globalMemory.length > 0 ? globalMemory[globalMemory.length - 1].timestamp : null
    };
  }

  exportData() {
    return {
      sessions: this.sessions.get(),
      globalMemory: this.globalMemory.get(),
      customCommands: this.customCommands.get(),
      exportedAt: Date.now()
    };
  }

  importData(data: any) {
    try {
      if (data.sessions) {
        this.sessions.set(data.sessions);
      }
      if (data.globalMemory) {
        this.globalMemory.set(data.globalMemory);
      }
      if (data.customCommands) {
        this.customCommands.set(data.customCommands);
      }
      this.saveToStorage();
      return true;
    } catch (error) {
      console.error('Failed to import agent data:', error);
      return false;
    }
  }
}

export const agentStore = new AgentStore();