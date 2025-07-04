import { useStore } from '@nanostores/react';
import { useState, useRef, useEffect, useMemo } from 'react';
import { workbenchStore } from '~/lib/stores/workbench';
import { agentStore } from '~/lib/stores/agent';
import { classNames } from '~/utils/classNames';

interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'folder';
  size?: number;
  lastModified?: number;
  children?: FileNode[];
  isExpanded?: boolean;
  isSelected?: boolean;
}

interface EnhancedFileManagerProps {
  className?: string;
  onFileSelect?: (filePath: string) => void;
  onFileCreate?: (filePath: string, content?: string) => void;
  onFileDelete?: (filePath: string) => void;
  onFolderCreate?: (folderPath: string) => void;
  showHidden?: boolean;
  enableDragDrop?: boolean;
}

export function EnhancedFileManager({
  className,
  onFileSelect,
  onFileCreate,
  onFileDelete,
  onFolderCreate,
  showHidden = false,
  enableDragDrop = true
}: EnhancedFileManagerProps) {
  const files = useStore(workbenchStore.files);
  const selectedFile = useStore(workbenchStore.selectedFile);
  
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; path: string } | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createType, setCreateType] = useState<'file' | 'folder'>('file');
  const [createParentPath, setCreateParentPath] = useState('');
  const [createName, setCreateName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'tree' | 'list' | 'grid'>('tree');
  const [sortBy, setSortBy] = useState<'name' | 'type' | 'size' | 'modified'>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  // Convert files object to tree structure
  const fileTree = useMemo(() => {
    const tree: FileNode[] = [];
    const pathMap: Map<string, FileNode> = new Map();

    Object.entries(files).forEach(([path, dirent]) => {
      if (!dirent || (!showHidden && path.startsWith('.'))) return;

      const parts = path.split('/').filter(Boolean);
      let currentPath = '';
      
      parts.forEach((part, index) => {
        const isLast = index === parts.length - 1;
        currentPath = currentPath ? `${currentPath}/${part}` : part;
        
        if (!pathMap.has(currentPath)) {
          const node: FileNode = {
            name: part,
            path: currentPath,
            type: isLast ? dirent.type : 'folder',
            size: isLast && dirent.type === 'file' ? dirent.content?.length : undefined,
            lastModified: Date.now(), // Would come from actual file system
            children: [],
            isExpanded: expandedFolders.has(currentPath),
            isSelected: selectedItems.has(currentPath)
          };
          
          pathMap.set(currentPath, node);
          
          if (index === 0) {
            tree.push(node);
          } else {
            const parentPath = parts.slice(0, index).join('/');
            const parent = pathMap.get(parentPath);
            if (parent) {
              parent.children = parent.children || [];
              parent.children.push(node);
            }
          }
        }
      });
    });

    return tree;
  }, [files, expandedFolders, selectedItems, showHidden]);

  // Filter and sort files
  const filteredAndSortedTree = useMemo(() => {
    const filterNode = (node: FileNode): FileNode | null => {
      if (searchQuery && !node.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        // Check if any children match
        const filteredChildren = node.children?.map(filterNode).filter(Boolean) || [];
        if (filteredChildren.length === 0) return null;
        return { ...node, children: filteredChildren };
      }

      const children = node.children?.map(filterNode).filter(Boolean) || [];
      return { ...node, children };
    };

    const sortNodes = (nodes: FileNode[]): FileNode[] => {
      return nodes.sort((a, b) => {
        // Folders first
        if (a.type !== b.type) {
          return a.type === 'folder' ? -1 : 1;
        }

        let result = 0;
        switch (sortBy) {
          case 'name':
            result = a.name.localeCompare(b.name);
            break;
          case 'type':
            result = a.type.localeCompare(b.type);
            break;
          case 'size':
            result = (a.size || 0) - (b.size || 0);
            break;
          case 'modified':
            result = (a.lastModified || 0) - (b.lastModified || 0);
            break;
        }

        return sortDirection === 'asc' ? result : -result;
      });
    };

    const processTree = (nodes: FileNode[]): FileNode[] => {
      const filtered = nodes.map(filterNode).filter(Boolean) as FileNode[];
      const sorted = sortNodes(filtered);
      return sorted.map(node => ({
        ...node,
        children: node.children ? processTree(node.children) : []
      }));
    };

    return processTree(fileTree);
  }, [fileTree, searchQuery, sortBy, sortDirection]);

  const handleFileClick = (node: FileNode, event: React.MouseEvent) => {
    event.preventDefault();
    
    if (event.ctrlKey || event.metaKey) {
      // Multi-select
      setSelectedItems(prev => {
        const newSet = new Set(prev);
        if (newSet.has(node.path)) {
          newSet.delete(node.path);
        } else {
          newSet.add(node.path);
        }
        return newSet;
      });
    } else {
      setSelectedItems(new Set([node.path]));
      
      if (node.type === 'file') {
        onFileSelect?.(node.path);
      } else {
        // Toggle folder expansion
        setExpandedFolders(prev => {
          const newSet = new Set(prev);
          if (newSet.has(node.path)) {
            newSet.delete(node.path);
          } else {
            newSet.add(node.path);
          }
          return newSet;
        });
      }
    }
  };

  const handleContextMenu = (event: React.MouseEvent, node: FileNode) => {
    event.preventDefault();
    setContextMenu({ x: event.clientX, y: event.clientY, path: node.path });
  };

  const handleCreateItem = () => {
    if (!createName.trim()) return;
    
    const fullPath = createParentPath ? `${createParentPath}/${createName}` : createName;
    
    if (createType === 'file') {
      onFileCreate?.(fullPath, '');
    } else {
      onFolderCreate?.(fullPath);
    }
    
    setShowCreateDialog(false);
    setCreateName('');
    setCreateParentPath('');
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        onFileCreate?.(file.name, content);
      };
      
      if (file.type.startsWith('text/') || file.name.endsWith('.json') || file.name.endsWith('.md')) {
        reader.readAsText(file);
      } else {
        reader.readAsDataURL(file);
      }
    });
    
    event.target.value = '';
  };

  const handleFolderUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        onFileCreate?.(file.webkitRelativePath || file.name, content);
      };
      reader.readAsText(file);
    });
    
    event.target.value = '';
  };

  const handleDragStart = (event: React.DragEvent, node: FileNode) => {
    if (!enableDragDrop) return;
    setDraggedItem(node.path);
    event.dataTransfer.setData('text/plain', node.path);
  };

  const handleDragOver = (event: React.DragEvent, node: FileNode) => {
    if (!enableDragDrop || !draggedItem) return;
    if (node.type === 'folder' && node.path !== draggedItem) {
      event.preventDefault();
      setDropTarget(node.path);
    }
  };

  const handleDrop = (event: React.DragEvent, node: FileNode) => {
    if (!enableDragDrop || !draggedItem) return;
    event.preventDefault();
    
    // Here you would implement the actual move logic
    console.log(`Move ${draggedItem} to ${node.path}`);
    
    setDraggedItem(null);
    setDropTarget(null);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleDateString();
  };

  const getFileIcon = (node: FileNode): string => {
    if (node.type === 'folder') {
      return node.isExpanded ? 'i-ph:folder-open' : 'i-ph:folder';
    }
    
    const ext = node.name.split('.').pop()?.toLowerCase();
    const iconMap: Record<string, string> = {
      'js': 'i-ph:file-js',
      'jsx': 'i-ph:file-jsx',
      'ts': 'i-ph:file-ts',
      'tsx': 'i-ph:file-tsx',
      'html': 'i-ph:file-html',
      'css': 'i-ph:file-css',
      'scss': 'i-ph:file-css',
      'json': 'i-ph:brackets-curly',
      'md': 'i-ph:file-text',
      'py': 'i-ph:file-py',
      'png': 'i-ph:file-image',
      'jpg': 'i-ph:file-image',
      'jpeg': 'i-ph:file-image',
      'gif': 'i-ph:file-image',
      'svg': 'i-ph:file-svg',
    };
    
    return iconMap[ext || ''] || 'i-ph:file';
  };

  const renderTreeNode = (node: FileNode, depth: number = 0) => (
    <div key={node.path} className="select-none">
      <div
        className={classNames(
          'flex items-center gap-2 px-2 py-1 cursor-pointer hover:bg-bolt-elements-background-depth-3 transition-colors',
          selectedItems.has(node.path) && 'bg-violet-600/20 text-violet-300',
          dropTarget === node.path && 'bg-violet-600/10 border border-violet-600/50'
        )}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={(e) => handleFileClick(node, e)}
        onContextMenu={(e) => handleContextMenu(e, node)}
        onDragStart={(e) => handleDragStart(e, node)}
        onDragOver={(e) => handleDragOver(e, node)}
        onDrop={(e) => handleDrop(e, node)}
        draggable={enableDragDrop}
      >
        <div className={classNames(getFileIcon(node), 'w-4 h-4 flex-shrink-0')} />
        <span className="text-sm truncate flex-1">{node.name}</span>
        {node.type === 'file' && node.size && (
          <span className="text-xs text-bolt-elements-textTertiary">
            {formatFileSize(node.size)}
          </span>
        )}
      </div>
      
      {node.type === 'folder' && node.isExpanded && node.children && (
        <div>
          {node.children.map(child => renderTreeNode(child, depth + 1))}
        </div>
      )}
    </div>
  );

  const renderListView = () => (
    <div className="space-y-1">
      {filteredAndSortedTree.map(node => (
        <div
          key={node.path}
          className={classNames(
            'flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-bolt-elements-background-depth-3 transition-colors rounded',
            selectedItems.has(node.path) && 'bg-violet-600/20 text-violet-300'
          )}
          onClick={(e) => handleFileClick(node, e)}
          onContextMenu={(e) => handleContextMenu(e, node)}
        >
          <div className={classNames(getFileIcon(node), 'w-4 h-4 flex-shrink-0')} />
          <span className="text-sm flex-1 truncate">{node.name}</span>
          <span className="text-xs text-bolt-elements-textTertiary w-16 text-right">
            {node.type === 'file' && node.size ? formatFileSize(node.size) : '—'}
          </span>
          <span className="text-xs text-bolt-elements-textTertiary w-20 text-right">
            {node.lastModified ? formatDate(node.lastModified) : '—'}
          </span>
        </div>
      ))}
    </div>
  );

  const renderGridView = () => (
    <div className="grid grid-cols-3 gap-2 p-2">
      {filteredAndSortedTree.map(node => (
        <div
          key={node.path}
          className={classNames(
            'flex flex-col items-center gap-2 p-3 cursor-pointer hover:bg-bolt-elements-background-depth-3 transition-colors rounded border border-bolt-elements-borderColor',
            selectedItems.has(node.path) && 'bg-violet-600/20 border-violet-600/50'
          )}
          onClick={(e) => handleFileClick(node, e)}
          onContextMenu={(e) => handleContextMenu(e, node)}
        >
          <div className={classNames(getFileIcon(node), 'w-8 h-8')} />
          <span className="text-xs text-center truncate w-full">{node.name}</span>
          {node.type === 'file' && node.size && (
            <span className="text-xs text-bolt-elements-textTertiary">
              {formatFileSize(node.size)}
            </span>
          )}
        </div>
      ))}
    </div>
  );

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  return (
    <div className={classNames('h-full flex flex-col bg-bolt-elements-background-depth-1', className)}>
      {/* File Manager Header */}
      <div className="flex items-center justify-between p-3 bg-bolt-elements-background-depth-3 border-b border-bolt-elements-borderColor">
        <div className="flex items-center gap-2">
          <div className="i-ph:folder text-lg text-violet-400" />
          <span className="font-semibold text-bolt-elements-textPrimary">File Manager</span>
        </div>

        <div className="flex items-center gap-1">
          {/* View Mode Toggle */}
          <div className="flex bg-bolt-elements-background-depth-2 rounded p-0.5">
            {(['tree', 'list', 'grid'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={classNames(
                  'p-1.5 rounded transition-colors',
                  viewMode === mode
                    ? 'bg-violet-600 text-white'
                    : 'text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary'
                )}
                title={`${mode.charAt(0).toUpperCase() + mode.slice(1)} view`}
              >
                <div className={`i-ph:${mode === 'tree' ? 'tree-structure' : mode === 'list' ? 'list' : 'grid-four'} w-3 h-3`} />
              </button>
            ))}
          </div>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-1.5 rounded hover:bg-bolt-elements-background-depth-4 text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary transition-colors"
            title="Upload Files"
          >
            <div className="i-ph:upload w-4 h-4" />
          </button>

          <button
            onClick={() => setShowCreateDialog(true)}
            className="p-1.5 rounded hover:bg-bolt-elements-background-depth-4 text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary transition-colors"
            title="Create New"
          >
            <div className="i-ph:plus w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Search and Sort */}
      <div className="p-3 space-y-2">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search files..."
          className="w-full px-3 py-2 bg-bolt-elements-background-depth-2 border border-bolt-elements-borderColor rounded text-bolt-elements-textPrimary placeholder-bolt-elements-textTertiary focus:border-violet-400 focus:outline-none text-sm"
        />
        
        <div className="flex items-center gap-2 text-sm">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-2 py-1 bg-bolt-elements-background-depth-2 border border-bolt-elements-borderColor rounded text-bolt-elements-textPrimary focus:border-violet-400 focus:outline-none"
          >
            <option value="name">Sort by Name</option>
            <option value="type">Sort by Type</option>
            <option value="size">Sort by Size</option>
            <option value="modified">Sort by Modified</option>
          </select>
          
          <button
            onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
            className="p-1 rounded hover:bg-bolt-elements-background-depth-3 text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary transition-colors"
          >
            <div className={classNames(
              'w-3 h-3',
              sortDirection === 'asc' ? 'i-ph:sort-ascending' : 'i-ph:sort-descending'
            )} />
          </button>
        </div>
      </div>

      {/* File Content */}
      <div className="flex-1 overflow-auto">
        {viewMode === 'tree' && (
          <div className="space-y-0.5">
            {filteredAndSortedTree.map(node => renderTreeNode(node))}
          </div>
        )}
        {viewMode === 'list' && renderListView()}
        {viewMode === 'grid' && renderGridView()}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-bolt-elements-background-depth-1 border border-bolt-elements-borderColor rounded-lg shadow-lg py-1 min-w-32"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            onClick={() => {
              setCreateParentPath(contextMenu.path);
              setCreateType('file');
              setShowCreateDialog(true);
              setContextMenu(null);
            }}
            className="w-full px-3 py-2 text-left text-sm text-bolt-elements-textPrimary hover:bg-bolt-elements-background-depth-2 transition-colors"
          >
            <div className="i-ph:file-plus mr-2" />
            New File
          </button>
          <button
            onClick={() => {
              setCreateParentPath(contextMenu.path);
              setCreateType('folder');
              setShowCreateDialog(true);
              setContextMenu(null);
            }}
            className="w-full px-3 py-2 text-left text-sm text-bolt-elements-textPrimary hover:bg-bolt-elements-background-depth-2 transition-colors"
          >
            <div className="i-ph:folder-plus mr-2" />
            New Folder
          </button>
          <hr className="my-1 border-bolt-elements-borderColor" />
          <button
            onClick={() => {
              onFileDelete?.(contextMenu.path);
              setContextMenu(null);
            }}
            className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-bolt-elements-background-depth-2 transition-colors"
          >
            <div className="i-ph:trash mr-2" />
            Delete
          </button>
        </div>
      )}

      {/* Create Dialog */}
      {showCreateDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-bolt-elements-background-depth-1 rounded-lg border border-bolt-elements-borderColor p-6 w-96 max-w-[90vw]">
            <h3 className="text-lg font-semibold text-bolt-elements-textPrimary mb-4">
              Create New {createType === 'file' ? 'File' : 'Folder'}
            </h3>
            
            <div className="space-y-4">
              {createParentPath && (
                <div className="text-sm text-bolt-elements-textSecondary">
                  In: {createParentPath}
                </div>
              )}
              
              <input
                type="text"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder={`Enter ${createType} name...`}
                className="w-full px-3 py-2 bg-bolt-elements-background-depth-2 border border-bolt-elements-borderColor rounded text-bolt-elements-textPrimary placeholder-bolt-elements-textTertiary focus:border-violet-400 focus:outline-none"
                autoFocus
              />
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleCreateItem}
                disabled={!createName.trim()}
                className="flex-1 btn-primary px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create
              </button>
              <button
                onClick={() => setShowCreateDialog(false)}
                className="px-4 py-2 rounded-lg bg-bolt-elements-background-depth-3 hover:bg-bolt-elements-background-depth-4 text-bolt-elements-textPrimary border border-bolt-elements-borderColor text-sm font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileUpload}
      />
      <input
        ref={folderInputRef}
        type="file"
        multiple
        webkitdirectory=""
        className="hidden"
        onChange={handleFolderUpload}
      />
    </div>
  );
}