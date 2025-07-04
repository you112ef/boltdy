import { useStore } from '@nanostores/react';
import { useState, useRef, useEffect } from 'react';
import { agentStore, type AgentSession, type AgentCommand } from '~/lib/stores/agent';
import type { ProviderInfo } from '~/types/model';
import { classNames } from '~/utils/classNames';
import { PanelHeader } from '~/components/ui/PanelHeader';
import { PanelHeaderButton } from '~/components/ui/PanelHeaderButton';

interface AgentPanelProps {
  providers: ProviderInfo[];
  models: Array<{ name: string; label: string; provider: string }>;
  onSendMessage?: (message: string, useAgent?: boolean) => void;
  className?: string;
}

export function AgentPanel({ providers, models, onSendMessage, className }: AgentPanelProps) {
  const isAgentMode = useStore(agentStore.isAgentMode);
  const continuousMode = useStore(agentStore.continuousMode);
  const sessions = useStore(agentStore.sessions);
  const currentSession = useStore(agentStore.currentSession);
  const customCommands = useStore(agentStore.customCommands);
  const globalMemory = useStore(agentStore.globalMemory);

  const [showSessionDialog, setShowSessionDialog] = useState(false);
  const [showCommandDialog, setShowCommandDialog] = useState(false);
  const [showStatsDialog, setShowStatsDialog] = useState(false);
  const [newSessionName, setNewSessionName] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<ProviderInfo | null>(null);
  const [selectedModel, setSelectedModel] = useState('');
  const [commandInput, setCommandInput] = useState('');

  const commandInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (providers.length > 0 && !selectedProvider) {
      setSelectedProvider(providers[0]);
      const firstModel = models.find(m => m.provider === providers[0].name);
      if (firstModel) {
        setSelectedModel(firstModel.name);
      }
    }
  }, [providers, models, selectedProvider]);

  const handleCreateSession = () => {
    if (!newSessionName.trim() || !selectedProvider || !selectedModel) return;
    
    const sessionId = agentStore.createSession(newSessionName.trim(), selectedProvider, selectedModel);
    agentStore.activateSession(sessionId);
    setNewSessionName('');
    setShowSessionDialog(false);
  };

  const handleCommandSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commandInput.trim()) return;

    const commands = Object.values(customCommands) as AgentCommand[];
    const matchedCommand = commands.find(cmd => 
      commandInput.startsWith(cmd.command)
    );

    if (matchedCommand) {
      const context = agentStore.getCurrentSessionContext();
      const message = matchedCommand.template.replace('{context}', context);
      onSendMessage?.(message, true);
    } else {
      onSendMessage?.(commandInput, true);
    }

    setCommandInput('');
  };

  const activeSession = currentSession ? sessions[currentSession] : null;
  const availableCommands = Object.values(customCommands) as AgentCommand[];
  const stats = agentStore.getMemoryStats();

  if (!isAgentMode) {
    return (
      <div className={classNames('bg-bolt-elements-background-depth-2 rounded-lg border border-bolt-elements-borderColor p-4', className)}>
        <div className="text-center">
          <div className="i-ph:robot text-4xl text-bolt-elements-textTertiary mb-3" />
          <h3 className="text-lg font-semibold text-bolt-elements-textPrimary mb-2">AI Agent Mode</h3>
          <p className="text-sm text-bolt-elements-textSecondary mb-4">
            Activate agent mode to enable persistent context and multi-model sessions
          </p>
          <button
            onClick={() => agentStore.toggleAgentMode(true)}
            className="btn-primary px-4 py-2 rounded-lg text-sm font-medium"
          >
            <div className="i-ph:play mr-2" />
            Activate Agent
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={classNames('bg-bolt-elements-background-depth-2 rounded-lg border border-bolt-elements-borderColor', className)}>
      <PanelHeader className="border-b border-bolt-elements-borderColor">
        <div className="flex items-center gap-2">
          <div className="i-ph:robot text-lg text-violet-400" />
          <span className="font-semibold">AI Agent</span>
          {activeSession && (
            <span className="text-sm text-bolt-elements-textSecondary">
              - {activeSession.name}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <PanelHeaderButton
            onClick={() => setShowSessionDialog(true)}
            className="text-xs"
          >
            <div className="i-ph:plus" />
            Session
          </PanelHeaderButton>
          <PanelHeaderButton
            onClick={() => setShowStatsDialog(true)}
            className="text-xs"
          >
            <div className="i-ph:chart-bar" />
            Stats
          </PanelHeaderButton>
          <PanelHeaderButton
            onClick={() => agentStore.toggleAgentMode(false)}
            className="text-xs text-red-400"
          >
            <div className="i-ph:stop" />
          </PanelHeaderButton>
        </div>
      </PanelHeader>

      <div className="p-4 space-y-4">
        {/* Agent Status */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-bolt-elements-textSecondary">Memory:</span>
            <span className="text-bolt-elements-textPrimary">{globalMemory.length} items</span>
          </div>
          
          <div className="flex items-center justify-between text-sm">
            <span className="text-bolt-elements-textSecondary">Sessions:</span>
            <span className="text-bolt-elements-textPrimary">{Object.keys(sessions).length}</span>
          </div>

          <div className="flex items-center justify-between">
            <label className="text-sm text-bolt-elements-textSecondary">Continuous Mode:</label>
            <button
              onClick={() => agentStore.toggleContinuousMode()}
              className={classNames(
                'relative inline-flex h-5 w-9 items-center rounded-full transition-colors',
                continuousMode ? 'bg-violet-600' : 'bg-bolt-elements-borderColor'
              )}
            >
              <span
                className={classNames(
                  'inline-block h-3 w-3 transform rounded-full bg-white transition-transform',
                  continuousMode ? 'translate-x-5' : 'translate-x-1'
                )}
              />
            </button>
          </div>
        </div>

        {/* Command Input */}
        <form onSubmit={handleCommandSubmit} className="space-y-2">
          <label className="block text-sm text-bolt-elements-textSecondary">
            Agent Command:
          </label>
          <div className="relative">
            <input
              ref={commandInputRef}
              type="text"
              value={commandInput}
              onChange={(e) => setCommandInput(e.target.value)}
              placeholder="Type command or message..."
              className="w-full px-3 py-2 rounded-lg bg-bolt-elements-background-depth-1 border border-bolt-elements-borderColor text-bolt-elements-textPrimary placeholder-bolt-elements-textTertiary text-sm focus:border-violet-400 focus:outline-none"
            />
            <button
              type="submit"
              className="absolute right-1 top-1 p-1.5 rounded-md bg-violet-600 hover:bg-violet-700 text-white transition-colors"
            >
              <div className="i-ph:paper-plane-tilt w-3 h-3" />
            </button>
          </div>
        </form>

        {/* Quick Commands */}
        <div className="space-y-2">
          <label className="block text-sm text-bolt-elements-textSecondary">
            Quick Commands:
          </label>
          <div className="grid grid-cols-2 gap-2">
            {availableCommands.slice(0, 4).map((cmd) => (
              <button
                key={cmd.id}
                onClick={() => setCommandInput(cmd.command + ' ')}
                className="px-3 py-2 text-xs rounded-md bg-bolt-elements-background-depth-3 hover:bg-bolt-elements-background-depth-4 text-bolt-elements-textPrimary border border-bolt-elements-borderColor transition-colors"
                title={cmd.description}
              >
                {cmd.command}
              </button>
            ))}
          </div>
        </div>

        {/* Active Sessions */}
        {Object.keys(sessions).length > 0 && (
          <div className="space-y-2">
            <label className="block text-sm text-bolt-elements-textSecondary">
              Sessions:
            </label>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {Object.values(sessions).map((session: any) => (
                <div
                  key={session.id}
                  className={classNames(
                    'flex items-center justify-between p-2 rounded-md text-xs border transition-colors cursor-pointer',
                    session.isActive
                      ? 'bg-violet-600/20 border-violet-600/50 text-violet-300'
                      : 'bg-bolt-elements-background-depth-3 border-bolt-elements-borderColor text-bolt-elements-textPrimary hover:bg-bolt-elements-background-depth-4'
                  )}
                  onClick={() => agentStore.activateSession(session.id)}
                >
                  <div className="flex items-center gap-2">
                    <div className={classNames(
                      'w-2 h-2 rounded-full',
                      session.isActive ? 'bg-violet-400' : 'bg-bolt-elements-textTertiary'
                    )} />
                    <span className="font-medium">{session.name}</span>
                    <span className="text-bolt-elements-textTertiary">
                      ({session.provider.name})
                    </span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      agentStore.deleteSession(session.id);
                    }}
                    className="text-red-400 hover:text-red-300 p-1"
                  >
                    <div className="i-ph:trash w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Create Session Dialog */}
      {showSessionDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-bolt-elements-background-depth-1 rounded-lg border border-bolt-elements-borderColor p-6 w-96 max-w-[90vw]">
            <h3 className="text-lg font-semibold text-bolt-elements-textPrimary mb-4">
              Create Agent Session
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-bolt-elements-textSecondary mb-2">
                  Session Name:
                </label>
                <input
                  type="text"
                  value={newSessionName}
                  onChange={(e) => setNewSessionName(e.target.value)}
                  placeholder="Enter session name..."
                  className="w-full px-3 py-2 rounded-lg bg-bolt-elements-background-depth-2 border border-bolt-elements-borderColor text-bolt-elements-textPrimary placeholder-bolt-elements-textTertiary focus:border-violet-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm text-bolt-elements-textSecondary mb-2">
                  Provider:
                </label>
                <select
                  value={selectedProvider?.name || ''}
                  onChange={(e) => {
                    const provider = providers.find(p => p.name === e.target.value);
                    setSelectedProvider(provider || null);
                    if (provider) {
                      const firstModel = models.find(m => m.provider === provider.name);
                      if (firstModel) {
                        setSelectedModel(firstModel.name);
                      }
                    }
                  }}
                  className="w-full px-3 py-2 rounded-lg bg-bolt-elements-background-depth-2 border border-bolt-elements-borderColor text-bolt-elements-textPrimary focus:border-violet-400 focus:outline-none"
                >
                  {providers.map((provider) => (
                    <option key={provider.name} value={provider.name}>
                      {provider.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-bolt-elements-textSecondary mb-2">
                  Model:
                </label>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-bolt-elements-background-depth-2 border border-bolt-elements-borderColor text-bolt-elements-textPrimary focus:border-violet-400 focus:outline-none"
                >
                  {models
                    .filter(m => m.provider === selectedProvider?.name)
                    .map((model) => (
                      <option key={model.name} value={model.name}>
                        {model.label}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleCreateSession}
                disabled={!newSessionName.trim() || !selectedProvider || !selectedModel}
                className="flex-1 btn-primary px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create Session
              </button>
              <button
                onClick={() => setShowSessionDialog(false)}
                className="px-4 py-2 rounded-lg bg-bolt-elements-background-depth-3 hover:bg-bolt-elements-background-depth-4 text-bolt-elements-textPrimary border border-bolt-elements-borderColor text-sm font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats Dialog */}
      {showStatsDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-bolt-elements-background-depth-1 rounded-lg border border-bolt-elements-borderColor p-6 w-96 max-w-[90vw]">
            <h3 className="text-lg font-semibold text-bolt-elements-textPrimary mb-4">
              Agent Statistics
            </h3>
            
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-bolt-elements-textSecondary">Total Memories:</span>
                <span className="text-bolt-elements-textPrimary">{stats.totalMemories}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-bolt-elements-textSecondary">Total Sessions:</span>
                <span className="text-bolt-elements-textPrimary">{stats.totalSessions}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-bolt-elements-textSecondary">Active Sessions:</span>
                <span className="text-bolt-elements-textPrimary">{stats.activeSessions}</span>
              </div>
              
              {Object.keys(stats.providerStats).length > 0 && (
                <div className="pt-3 border-t border-bolt-elements-borderColor">
                  <div className="text-bolt-elements-textSecondary mb-2">Provider Usage:</div>
                  {Object.entries(stats.providerStats).map(([provider, count]) => (
                    <div key={provider} className="flex justify-between ml-2">
                      <span className="text-bolt-elements-textTertiary">{provider}:</span>
                      <span className="text-bolt-elements-textPrimary">{count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => agentStore.clearMemory()}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors"
              >
                Clear Memory
              </button>
              <button
                onClick={() => setShowStatsDialog(false)}
                className="flex-1 px-4 py-2 rounded-lg bg-bolt-elements-background-depth-3 hover:bg-bolt-elements-background-depth-4 text-bolt-elements-textPrimary border border-bolt-elements-borderColor text-sm font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}