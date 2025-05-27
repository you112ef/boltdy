import { memo, Fragment } from 'react';
import { Markdown } from './Markdown';
import type { JSONValue } from 'ai';
import Popover from '~/components/ui/Popover';
import { workbenchStore } from '~/lib/stores/workbench';
import { WORK_DIR } from '~/utils/constants';
import WithTooltip from '~/components/ui/Tooltip';

interface AssistantMessageProps {
  content: string;
  annotations?: JSONValue[];
  messageId?: string;
  onRewind?: (messageId: string) => void;
  onFork?: (messageId: string) => void;
}

function openArtifactInWorkbench(filePath: string) {
  filePath = normalizedFilePath(filePath);

  if (workbenchStore.currentView.get() !== 'code') {
    workbenchStore.currentView.set('code');
  }

  workbenchStore.setSelectedFile(`${WORK_DIR}/${filePath}`);
}

function normalizedFilePath(path: string) {
  let normalizedPath = path;

  if (normalizedPath.startsWith(WORK_DIR)) {
    normalizedPath = path.replace(WORK_DIR, '');
  }

  if (normalizedPath.startsWith('/')) {
    normalizedPath = normalizedPath.slice(1);
  }

  return normalizedPath;
}

export const AssistantMessage = memo(({ content, annotations, messageId, onRewind, onFork }: AssistantMessageProps) => {
  const filteredAnnotations = (annotations?.filter(
    (annotation: JSONValue) => annotation && typeof annotation === 'object' && Object.keys(annotation).includes('type'),
  ) || []) as { type: string; value: any } & { [key: string]: any }[];

  let chatSummary: string | undefined = undefined;

  if (filteredAnnotations.find((annotation) => annotation.type === 'chatSummary')) {
    chatSummary = filteredAnnotations.find((annotation) => annotation.type === 'chatSummary')?.summary;
  }

  let codeContext: string[] | undefined = undefined;

  if (filteredAnnotations.find((annotation) => annotation.type === 'codeContext')) {
    codeContext = filteredAnnotations.find((annotation) => annotation.type === 'codeContext')?.files;
  }

  const usage: {
    completionTokens: number;
    promptTokens: number;
    totalTokens: number;
  } = filteredAnnotations.find((annotation) => annotation.type === 'usage')?.value;

  return (
    <div className="overflow-hidden w-full">
      <>
        <div className="flex gap-2 items-center text-xs sm:text-sm text-bolt-elements-textSecondary mb-2"> {/* Base text-xs, sm and up is text-sm */}
          {(codeContext || chatSummary) && (
            <Popover side="right" align="start" trigger={<div className="i-ph:info text-base sm:text-lg" />}> {/* Icon size adjustment */}
              {chatSummary && (
                <div className="max-w-chat p-2"> {/* Added padding to popover content */}
                  <div className="summary max-h-96 flex flex-col gap-1"> {/* Added gap */}
                    <h2 className="border border-bolt-elements-borderColor rounded-md p-2 text-sm sm:text-base font-medium">Summary</h2> {/* Adjusted padding and text size */}
                    <div className="overflow-y-auto m-1 text-xs sm:text-sm"> {/* Adjusted margin and text size, removed zoom */}
                      <Markdown>{chatSummary}</Markdown>
                    </div>
                  </div>
                  {codeContext && (
                    <div className="code-context flex flex-col p-2 mt-2 border border-bolt-elements-borderColor rounded-md gap-1"> {/* Adjusted padding, margin, added gap */}
                      <h2 className="text-sm sm:text-base font-medium">Context</h2> {/* Adjusted text size */}
                      <div className="flex flex-wrap gap-2 mt-1"> {/* flex-wrap and smaller gap, removed zoom and custom 'bolt' class if unused */}
                        {codeContext.map((x) => {
                          const normalized = normalizedFilePath(x);
                          return (
                            <Fragment key={normalized}>
                              <code
                                className="bg-bolt-elements-artifacts-inlineCode-background text-bolt-elements-artifacts-inlineCode-text px-1.5 py-0.5 text-2xs sm:text-xs rounded-md hover:underline cursor-pointer" // Adjusted padding and text size
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  openArtifactInWorkbench(normalized);
                                }}
                              >
                                {normalized}
                              </code>
                            </Fragment>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
              <div className="context"></div>
            </Popover>
          )}
          <div className="flex w-full items-center justify-between">
            {usage && (
              <div className="text-2xs sm:text-xs"> {/* Adjusted token usage text size */}
                Tokens: {usage.totalTokens} (prompt: {usage.promptTokens}, completion: {usage.completionTokens})
              </div>
            )}
            {(onRewind || onFork) && messageId && (
              <div className="flex gap-2 flex-col lg:flex-row ms-auto"> {/* Changed ml-auto to ms-auto for RTL */}
                {onRewind && (
                  <WithTooltip tooltip="Revert to this message">
                    <button
                      onClick={() => onRewind(messageId)}
                      key="i-ph:arrow-u-up-left"
                      className="i-ph:arrow-u-up-left text-lg sm:text-xl text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary transition-colors" // Adjusted icon size
                    />
                  </WithTooltip>
                )}
                {onFork && (
                  <WithTooltip tooltip="Fork chat from this message">
                    <button
                      onClick={() => onFork(messageId)}
                      key="i-ph:git-fork"
                      className="i-ph:git-fork text-lg sm:text-xl text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary transition-colors" // Adjusted icon size
                    />
                  </WithTooltip>
                )}
              </div>
            )}
          </div>
        </div>
      </>
      <Markdown html>{content}</Markdown>
    </div>
  );
});
