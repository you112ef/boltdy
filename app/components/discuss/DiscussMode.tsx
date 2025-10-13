/**
 * Discuss Mode Component for bolt.new v2
 * Provides interactive planning, debugging, and discussion capabilities
 */

import React, { useState, useCallback, useEffect } from 'react';
import { useStore } from '@nanostores/react';
import { motion, AnimatePresence } from 'framer-motion';
import { classNames } from '~/utils/classNames';
import { agentManager, type AgentTask } from '~/lib/agents/AgentManager';
import { IconButton } from '~/components/ui/IconButton';
import { Button } from '~/components/ui/Button';
import { Textarea } from '~/components/ui/Textarea';
import { Badge } from '~/components/ui/Badge';
import { Progress } from '~/components/ui/Progress';
import { Card } from '~/components/ui/Card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/Tabs';
import { ScrollArea } from '~/components/ui/ScrollArea';
import { Separator } from '~/components/ui/Separator';
import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('DiscussMode');

interface DiscussModeProps {
  isOpen: boolean;
  onClose: () => void;
  initialTopic?: string;
  context?: {
    files?: string[];
    currentFile?: string;
    error?: string;
    code?: string;
  };
}

interface DiscussionItem {
  id: string;
  type: 'user' | 'agent' | 'system';
  content: string;
  timestamp: Date;
  metadata?: {
    agentId?: string;
    taskId?: string;
    status?: 'pending' | 'processing' | 'completed' | 'failed';
  };
}

interface PlanningSession {
  id: string;
  title: string;
  description: string;
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  tasks: PlanningTask[];
  createdAt: Date;
  updatedAt: Date;
}

interface PlanningTask {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed' | 'blocked';
  priority: 'low' | 'medium' | 'high' | 'critical';
  estimatedTime?: string;
  dependencies?: string[];
  assignee?: string;
}

export function DiscussMode({ isOpen, onClose, initialTopic, context }: DiscussModeProps) {
  const [activeTab, setActiveTab] = useState<'discuss' | 'planning' | 'debugging'>('discuss');
  const [discussions, setDiscussions] = useState<DiscussionItem[]>([]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [planningSessions, setPlanningSessions] = useState<PlanningSession[]>([]);
  const [currentSession, setCurrentSession] = useState<PlanningSession | null>(null);
  const [debuggingIssues, setDebuggingIssues] = useState<any[]>([]);
  const [agentStats] = useState(() => agentManager.getStats());

  // Initialize with context if provided
  useEffect(() => {
    if (context?.error) {
      setActiveTab('debugging');
      setInput(`I'm encountering this error: ${context.error}`);
    } else if (initialTopic) {
      setInput(initialTopic);
    }
  }, [context, initialTopic]);

  const handleSendMessage = useCallback(async () => {
    if (!input.trim() || isProcessing) return;

    const userMessage: DiscussionItem = {
      id: `msg_${Date.now()}`,
      type: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setDiscussions(prev => [...prev, userMessage]);
    setInput('');
    setIsProcessing(true);

    try {
      // Determine which agent to use based on context and input
      let agentId = 'planning_agent';
      let taskType: AgentTask['type'] = 'planning';

      if (activeTab === 'debugging' || input.toLowerCase().includes('bug') || input.toLowerCase().includes('error')) {
        agentId = 'debug_assistant';
        taskType = 'debugging';
      } else if (input.toLowerCase().includes('analyze') || input.toLowerCase().includes('review')) {
        agentId = 'code_analyzer';
        taskType = 'code_analysis';
      } else if (input.toLowerCase().includes('test') || input.toLowerCase().includes('testing')) {
        agentId = 'test_generator';
        taskType = 'testing';
      } else if (input.toLowerCase().includes('optimize') || input.toLowerCase().includes('performance')) {
        agentId = 'optimization_agent';
        taskType = 'optimization';
      }

      // Create agent task
      const taskId = await agentManager.executeAgentTask(agentId, taskType, {
        message: input.trim(),
        context,
        discussionHistory: discussions.slice(-5), // Last 5 messages for context
      });

      // Add processing message
      const processingMessage: DiscussionItem = {
        id: `processing_${Date.now()}`,
        type: 'system',
        content: `Processing with ${agentManager.getAgent(agentId)?.name}...`,
        timestamp: new Date(),
        metadata: { agentId, taskId, status: 'processing' },
      };

      setDiscussions(prev => [...prev, processingMessage]);

      // Poll for task completion
      const pollTask = () => {
        const task = agentManager.getTaskStatus(taskId);
        if (task) {
          if (task.status === 'completed') {
            const agentResponse: DiscussionItem = {
              id: `response_${Date.now()}`,
              type: 'agent',
              content: this.formatAgentResponse(task.output, agentId),
              timestamp: new Date(),
              metadata: { agentId, taskId, status: 'completed' },
            };

            setDiscussions(prev => {
              const updated = [...prev];
              const processingIndex = updated.findIndex(msg => msg.metadata?.taskId === taskId);
              if (processingIndex !== -1) {
                updated[processingIndex] = agentResponse;
              } else {
                updated.push(agentResponse);
              }
              return updated;
            });

            // Handle specific tab logic
            if (activeTab === 'planning' && task.type === 'planning') {
              this.handlePlanningResponse(task.output);
            } else if (activeTab === 'debugging' && task.type === 'debugging') {
              this.handleDebuggingResponse(task.output);
            }

            setIsProcessing(false);
          } else if (task.status === 'failed') {
            const errorMessage: DiscussionItem = {
              id: `error_${Date.now()}`,
              type: 'system',
              content: `Error: ${task.error || 'Task failed'}`,
              timestamp: new Date(),
              metadata: { agentId, taskId, status: 'failed' },
            };

            setDiscussions(prev => [...prev, errorMessage]);
            setIsProcessing(false);
          } else {
            // Still processing, check again in 500ms
            setTimeout(pollTask, 500);
          }
        } else {
          // Task not found, stop polling
          setIsProcessing(false);
        }
      };

      // Start polling
      setTimeout(pollTask, 500);

    } catch (error) {
      logger.error('Error processing message', error);
      const errorMessage: DiscussionItem = {
        id: `error_${Date.now()}`,
        type: 'system',
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
      };
      setDiscussions(prev => [...prev, errorMessage]);
      setIsProcessing(false);
    }
  }, [input, isProcessing, activeTab, discussions, context]);

  const formatAgentResponse = (output: any, agentId: string): string => {
    if (!output) return 'No response generated.';

    switch (agentId) {
      case 'code_analyzer':
        return this.formatCodeAnalysisResponse(output);
      case 'debug_assistant':
        return this.formatDebuggingResponse(output);
      case 'planning_agent':
        return this.formatPlanningResponse(output);
      case 'test_generator':
        return this.formatTestingResponse(output);
      case 'optimization_agent':
        return this.formatOptimizationResponse(output);
      default:
        return JSON.stringify(output, null, 2);
    }
  };

  const formatCodeAnalysisResponse = (output: any): string => {
    let response = '## Code Analysis Results\n\n';
    
    if (output.analysis) {
      response += '**Analysis:**\n';
      Object.entries(output.analysis).forEach(([key, value]) => {
        response += `- ${key}: ${value}\n`;
      });
      response += '\n';
    }

    if (output.suggestions?.length) {
      response += '**Suggestions:**\n';
      output.suggestions.forEach((suggestion: string, index: number) => {
        response += `${index + 1}. ${suggestion}\n`;
      });
      response += '\n';
    }

    if (output.metrics) {
      response += '**Metrics:**\n';
      Object.entries(output.metrics).forEach(([key, value]) => {
        response += `- ${key}: ${value}\n`;
      });
    }

    return response;
  };

  const formatDebuggingResponse = (output: any): string => {
    let response = '## Debugging Analysis\n\n';
    
    if (output.issues?.length) {
      response += '**Issues Found:**\n';
      output.issues.forEach((issue: any, index: number) => {
        response += `${index + 1}. **${issue.type}** (${issue.severity})\n`;
        response += `   - Line ${issue.line}: ${issue.message}\n`;
        response += `   - Suggestion: ${issue.suggestion}\n\n`;
      });
    }

    if (output.fixes?.length) {
      response += '**Recommended Fixes:**\n';
      output.fixes.forEach((fix: string, index: number) => {
        response += `${index + 1}. ${fix}\n`;
      });
    }

    return response;
  };

  const formatPlanningResponse = (output: any): string => {
    let response = '## Development Plan\n\n';
    
    if (output.plan?.phases) {
      response += '**Project Phases:**\n';
      output.plan.phases.forEach((phase: any, index: number) => {
        response += `### Phase ${index + 1}: ${phase.name}\n`;
        response += `- Duration: ${phase.duration}\n`;
        response += `- Tasks:\n`;
        phase.tasks.forEach((task: string) => {
          response += `  - ${task}\n`;
        });
        response += '\n';
      });
    }

    if (output.milestones?.length) {
      response += '**Key Milestones:**\n';
      output.milestones.forEach((milestone: any, index: number) => {
        response += `${index + 1}. ${milestone.name} - ${milestone.targetDate}\n`;
      });
    }

    return response;
  };

  const formatTestingResponse = (output: any): string => {
    let response = '## Test Generation Results\n\n';
    
    if (output.tests) {
      Object.entries(output.tests).forEach(([type, tests]: [string, any]) => {
        response += `**${type.charAt(0).toUpperCase() + type.slice(1)} Tests:**\n`;
        tests.forEach((test: string, index: number) => {
          response += `${index + 1}. ${test}\n`;
        });
        response += '\n';
      });
    }

    if (output.coverage) {
      response += '**Coverage Analysis:**\n';
      response += `- Target: ${output.coverage.target}%\n`;
      response += `- Current: ${output.coverage.current}%\n`;
      if (output.coverage.missing?.length) {
        response += `- Missing: ${output.coverage.missing.join(', ')}\n`;
      }
    }

    return response;
  };

  const formatOptimizationResponse = (output: any): string => {
    let response = '## Optimization Analysis\n\n';
    
    if (output.optimizations?.length) {
      response += '**Optimization Opportunities:**\n';
      output.optimizations.forEach((opt: any, index: number) => {
        response += `${index + 1}. **${opt.type}** - ${opt.description}\n`;
        response += `   - Impact: ${opt.impact}, Effort: ${opt.effort}\n\n`;
      });
    }

    if (output.metrics) {
      response += '**Performance Metrics:**\n';
      response += 'Before → After\n';
      Object.entries(output.metrics.beforeOptimization).forEach(([key, value]) => {
        const after = output.metrics.afterOptimization[key];
        response += `- ${key}: ${value} → ${after}\n`;
      });
    }

    return response;
  };

  const handlePlanningResponse = (output: any) => {
    if (output.plan) {
      const newSession: PlanningSession = {
        id: `session_${Date.now()}`,
        title: 'New Development Plan',
        description: 'Generated from discussion',
        status: 'draft',
        tasks: output.plan.phases?.flatMap((phase: any, phaseIndex: number) => 
          phase.tasks?.map((task: string, taskIndex: number) => ({
            id: `task_${phaseIndex}_${taskIndex}`,
            title: task,
            description: `Task from ${phase.name}`,
            status: 'pending' as const,
            priority: 'medium' as const,
            estimatedTime: phase.duration,
          })) || []
        ) || [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      setPlanningSessions(prev => [...prev, newSession]);
      setCurrentSession(newSession);
    }
  };

  const handleDebuggingResponse = (output: any) => {
    if (output.issues) {
      setDebuggingIssues(prev => [...prev, ...output.issues]);
    }
  };

  const createNewPlanningSession = () => {
    const newSession: PlanningSession = {
      id: `session_${Date.now()}`,
      title: 'New Planning Session',
      description: '',
      status: 'draft',
      tasks: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    setPlanningSessions(prev => [...prev, newSession]);
    setCurrentSession(newSession);
  };

  const updateTaskStatus = (taskId: string, status: PlanningTask['status']) => {
    if (!currentSession) return;

    const updatedSession = {
      ...currentSession,
      tasks: currentSession.tasks.map(task =>
        task.id === taskId ? { ...task, status } : task
      ),
      updatedAt: new Date(),
    };

    setCurrentSession(updatedSession);
    setPlanningSessions(prev =>
      prev.map(session =>
        session.id === currentSession.id ? updatedSession : session
      )
    );
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-bolt-elements-background-depth-1 rounded-lg shadow-xl border border-bolt-elements-borderColor w-full max-w-6xl h-[80vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-bolt-elements-borderColor">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-accent-500/20 flex items-center justify-center">
              <div className="i-ph:chat-circle text-accent-500" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-bolt-elements-textPrimary">
                Discuss Mode
              </h2>
              <p className="text-sm text-bolt-elements-textSecondary">
                Plan, debug, and discuss your project
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {agentStats.agents.enabled} agents active
            </Badge>
            <IconButton
              icon="i-ph:x"
              onClick={onClose}
              size="sm"
              className="text-bolt-elements-textTertiary hover:text-bolt-elements-textPrimary"
            />
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(value: any) => setActiveTab(value)} className="flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-3 mx-4 mt-4">
            <TabsTrigger value="discuss">Discuss</TabsTrigger>
            <TabsTrigger value="planning">Planning</TabsTrigger>
            <TabsTrigger value="debugging">Debugging</TabsTrigger>
          </TabsList>

          <div className="flex-1 flex flex-col p-4">
            <TabsContent value="discuss" className="flex-1 flex flex-col">
              <DiscussTab
                discussions={discussions}
                input={input}
                setInput={setInput}
                onSend={handleSendMessage}
                isProcessing={isProcessing}
              />
            </TabsContent>

            <TabsContent value="planning" className="flex-1 flex flex-col">
              <PlanningTab
                sessions={planningSessions}
                currentSession={currentSession}
                onSelectSession={setCurrentSession}
                onCreateSession={createNewPlanningSession}
                onUpdateTask={updateTaskStatus}
              />
            </TabsContent>

            <TabsContent value="debugging" className="flex-1 flex flex-col">
              <DebuggingTab
                issues={debuggingIssues}
                discussions={discussions}
                input={input}
                setInput={setInput}
                onSend={handleSendMessage}
                isProcessing={isProcessing}
              />
            </TabsContent>
          </div>
        </Tabs>
      </motion.div>
    </motion.div>
  );
}

// Individual tab components
function DiscussTab({ discussions, input, setInput, onSend, isProcessing }: any) {
  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1 mb-4">
        <div className="space-y-4">
          {discussions.map((discussion: DiscussionItem) => (
            <motion.div
              key={discussion.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={classNames(
                'flex gap-3',
                discussion.type === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              <div
                className={classNames(
                  'max-w-[80%] rounded-lg p-3',
                  discussion.type === 'user'
                    ? 'bg-accent-500 text-white'
                    : discussion.type === 'agent'
                    ? 'bg-bolt-elements-background-depth-2 border border-bolt-elements-borderColor'
                    : 'bg-bolt-elements-background-depth-3 text-bolt-elements-textTertiary'
                )}
              >
                <div className="whitespace-pre-wrap text-sm">
                  {discussion.content}
                </div>
                <div className="text-xs opacity-70 mt-1">
                  {discussion.timestamp.toLocaleTimeString()}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </ScrollArea>

      <div className="flex gap-2">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask questions, request analysis, or discuss your project..."
          className="flex-1 min-h-[60px]"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              onSend();
            }
          }}
        />
        <Button
          onClick={onSend}
          disabled={!input.trim() || isProcessing}
          className="px-4"
        >
          {isProcessing ? (
            <div className="i-svg-spinners:90-ring-with-bg animate-spin" />
          ) : (
            <div className="i-ph:paper-plane-tilt" />
          )}
        </Button>
      </div>
    </div>
  );
}

function PlanningTab({ sessions, currentSession, onSelectSession, onCreateSession, onUpdateTask }: any) {
  return (
    <div className="flex h-full gap-4">
      <div className="w-1/3">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium">Planning Sessions</h3>
          <Button size="sm" onClick={onCreateSession}>
            <div className="i-ph:plus" />
            New
          </Button>
        </div>
        <ScrollArea className="h-[calc(100%-3rem)]">
          <div className="space-y-2">
            {sessions.map((session: PlanningSession) => (
              <Card
                key={session.id}
                className={classNames(
                  'p-3 cursor-pointer transition-colors',
                  currentSession?.id === session.id
                    ? 'bg-accent-500/10 border-accent-500/30'
                    : 'hover:bg-bolt-elements-background-depth-2'
                )}
                onClick={() => onSelectSession(session)}
              >
                <div className="font-medium text-sm">{session.title}</div>
                <div className="text-xs text-bolt-elements-textTertiary mt-1">
                  {session.tasks.length} tasks • {session.status}
                </div>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </div>

      <div className="flex-1">
        {currentSession ? (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium">{currentSession.title}</h3>
              <Badge variant={currentSession.status === 'active' ? 'default' : 'secondary'}>
                {currentSession.status}
              </Badge>
            </div>
            <ScrollArea className="h-[calc(100%-3rem)]">
              <div className="space-y-3">
                {currentSession.tasks.map((task: PlanningTask) => (
                  <Card key={task.id} className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-medium text-sm">{task.title}</div>
                        <div className="text-xs text-bolt-elements-textTertiary mt-1">
                          {task.description}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {task.priority}
                        </Badge>
                        <select
                          value={task.status}
                          onChange={(e) => onUpdateTask(task.id, e.target.value)}
                          className="text-xs bg-transparent border border-bolt-elements-borderColor rounded px-2 py-1"
                        >
                          <option value="pending">Pending</option>
                          <option value="in-progress">In Progress</option>
                          <option value="completed">Completed</option>
                          <option value="blocked">Blocked</option>
                        </select>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-bolt-elements-textTertiary">
            Select a planning session or create a new one
          </div>
        )}
      </div>
    </div>
  );
}

function DebuggingTab({ issues, discussions, input, setInput, onSend, isProcessing }: any) {
  return (
    <div className="flex h-full gap-4">
      <div className="w-1/2">
        <h3 className="font-medium mb-4">Issues Found</h3>
        <ScrollArea className="h-[calc(100%-3rem)]">
          <div className="space-y-3">
            {issues.map((issue: any, index: number) => (
              <Card key={index} className="p-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge
                        variant={issue.severity === 'high' ? 'destructive' : issue.severity === 'medium' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {issue.severity}
                      </Badge>
                      <span className="text-xs text-bolt-elements-textTertiary">
                        Line {issue.line}
                      </span>
                    </div>
                    <div className="font-medium text-sm mb-1">{issue.type}</div>
                    <div className="text-sm text-bolt-elements-textSecondary mb-2">
                      {issue.message}
                    </div>
                    <div className="text-xs text-bolt-elements-textTertiary">
                      💡 {issue.suggestion}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </div>

      <div className="w-1/2">
        <h3 className="font-medium mb-4">Debug Discussion</h3>
        <div className="flex flex-col h-[calc(100%-3rem)]">
          <ScrollArea className="flex-1 mb-4">
            <div className="space-y-3">
              {discussions
                .filter((d: DiscussionItem) => d.type === 'agent' || d.content.toLowerCase().includes('debug'))
                .map((discussion: DiscussionItem) => (
                  <div
                    key={discussion.id}
                    className={classNames(
                      'p-3 rounded-lg text-sm',
                      discussion.type === 'user'
                        ? 'bg-accent-500/10 border border-accent-500/30'
                        : 'bg-bolt-elements-background-depth-2'
                    )}
                  >
                    <div className="whitespace-pre-wrap">
                      {discussion.content}
                    </div>
                  </div>
                ))}
            </div>
          </ScrollArea>

          <div className="flex gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Describe the issue or ask for help..."
              className="flex-1 min-h-[60px]"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  onSend();
                }
              }}
            />
            <Button
              onClick={onSend}
              disabled={!input.trim() || isProcessing}
              className="px-4"
            >
              {isProcessing ? (
                <div className="i-svg-spinners:90-ring-with-bg animate-spin" />
              ) : (
                <div className="i-ph:bug" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}