import { useState, useRef } from 'react';
import { workbenchStore } from '~/lib/stores/workbench';
import { agentStore } from '~/lib/stores/agent';
import { classNames } from '~/utils/classNames';

interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  tags: string[];
  files: Record<string, string>;
  dependencies?: Record<string, string>;
  scripts?: Record<string, string>;
}

interface ProjectImporterProps {
  onProjectCreated?: (projectName: string) => void;
  className?: string;
}

const PROJECT_TEMPLATES: ProjectTemplate[] = [
  {
    id: 'react-ts',
    name: 'React + TypeScript',
    description: 'Modern React application with TypeScript, Vite, and Tailwind CSS',
    category: 'Frontend',
    icon: 'i-ph:logo-react',
    tags: ['React', 'TypeScript', 'Vite', 'Tailwind'],
    files: {
      'package.json': JSON.stringify({
        name: 'react-typescript-app',
        private: true,
        version: '0.0.0',
        type: 'module',
        scripts: {
          dev: 'vite',
          build: 'tsc && vite build',
          preview: 'vite preview'
        },
        dependencies: {
          react: '^18.2.0',
          'react-dom': '^18.2.0'
        },
        devDependencies: {
          '@types/react': '^18.2.43',
          '@types/react-dom': '^18.2.17',
          '@vitejs/plugin-react': '^4.2.1',
          typescript: '^5.2.2',
          vite: '^5.0.8'
        }
      }, null, 2),
      'vite.config.ts': `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})`,
      'tsconfig.json': JSON.stringify({
        compilerOptions: {
          target: 'ES2020',
          useDefineForClassFields: true,
          lib: ['ES2020', 'DOM', 'DOM.Iterable'],
          module: 'ESNext',
          skipLibCheck: true,
          moduleResolution: 'bundler',
          allowImportingTsExtensions: true,
          resolveJsonModule: true,
          isolatedModules: true,
          noEmit: true,
          jsx: 'react-jsx',
          strict: true,
          noUnusedLocals: true,
          noUnusedParameters: true,
          noFallthroughCasesInSwitch: true
        },
        include: ['src'],
        references: [{ path: './tsconfig.node.json' }]
      }, null, 2),
      'src/App.tsx': `import React from 'react'
import './App.css'

function App() {
  return (
    <div className="App">
      <h1>Hello React + TypeScript!</h1>
      <p>Built with Vite</p>
    </div>
  )
}

export default App`,
      'src/main.tsx': `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)`,
      'src/App.css': `.App {
  text-align: center;
  padding: 2rem;
}`,
      'src/index.css': `body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}`,
      'index.html': `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>React + TypeScript App</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`
    }
  },
  {
    id: 'nextjs',
    name: 'Next.js',
    description: 'Full-stack React framework with TypeScript and Tailwind CSS',
    category: 'Fullstack',
    icon: 'i-ph:logo-nextjs',
    tags: ['Next.js', 'React', 'TypeScript', 'Tailwind'],
    files: {
      'package.json': JSON.stringify({
        name: 'nextjs-app',
        version: '0.1.0',
        private: true,
        scripts: {
          dev: 'next dev',
          build: 'next build',
          start: 'next start'
        },
        dependencies: {
          next: '14.0.0',
          react: '^18',
          'react-dom': '^18'
        },
        devDependencies: {
          typescript: '^5',
          '@types/node': '^20',
          '@types/react': '^18',
          '@types/react-dom': '^18'
        }
      }, null, 2),
      'next.config.js': `/** @type {import('next').NextConfig} */
const nextConfig = {}

module.exports = nextConfig`,
      'tsconfig.json': JSON.stringify({
        compilerOptions: {
          lib: ['dom', 'dom.iterable', 'es6'],
          allowJs: true,
          skipLibCheck: true,
          strict: true,
          noEmit: true,
          esModuleInterop: true,
          module: 'esnext',
          moduleResolution: 'bundler',
          resolveJsonModule: true,
          isolatedModules: true,
          jsx: 'preserve',
          incremental: true,
          plugins: [{ name: 'next' }],
          paths: { '@/*': ['./src/*'] }
        },
        include: ['next-env.d.ts', '**/*.ts', '**/*.tsx', '.next/types/**/*.ts'],
        exclude: ['node_modules']
      }, null, 2),
      'src/app/page.tsx': `export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold">Welcome to Next.js!</h1>
      <p className="mt-4 text-xl">Get started by editing src/app/page.tsx</p>
    </main>
  )
}`,
      'src/app/layout.tsx': `import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Next.js App',
  description: 'Generated by create next app',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}`,
      'src/app/globals.css': `@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  color: rgb(var(--foreground-rgb));
  background: linear-gradient(
      to bottom,
      transparent,
      rgb(var(--background-end-rgb))
    )
    rgb(var(--background-start-rgb));
}`
    }
  },
  {
    id: 'python-flask',
    name: 'Python Flask API',
    description: 'REST API with Flask, SQLAlchemy, and JWT authentication',
    category: 'Backend',
    icon: 'i-ph:python-logo',
    tags: ['Python', 'Flask', 'API', 'SQLAlchemy'],
    files: {
      'requirements.txt': `Flask==2.3.3
Flask-SQLAlchemy==3.0.5
Flask-JWT-Extended==4.5.3
Flask-CORS==4.0.0
python-dotenv==1.0.0`,
      'app.py': `from flask import Flask, jsonify, request
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from flask_cors import CORS
from datetime import timedelta
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'super-secret')
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL', 'sqlite:///app.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)
jwt = JWTManager(app)
CORS(app)

# Models
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)

    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email
        }

# Routes
@app.route('/api/health')
def health():
    return jsonify({'status': 'healthy'})

@app.route('/api/auth/login', methods=['POST'])
def login():
    username = request.json.get('username')
    password = request.json.get('password')
    
    # Add your authentication logic here
    if username == 'admin' and password == 'password':
        access_token = create_access_token(
            identity=username,
            expires_delta=timedelta(days=1)
        )
        return jsonify({'access_token': access_token})
    
    return jsonify({'error': 'Invalid credentials'}), 401

@app.route('/api/users')
@jwt_required()
def get_users():
    users = User.query.all()
    return jsonify([user.to_dict() for user in users])

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True)`,
      '.env': `JWT_SECRET_KEY=your-secret-key-here
DATABASE_URL=sqlite:///app.db`,
      'README.md': `# Flask API

## Setup

1. Install dependencies:
   \`\`\`bash
   pip install -r requirements.txt
   \`\`\`

2. Run the application:
   \`\`\`bash
   python app.py
   \`\`\`

## Endpoints

- \`GET /api/health\` - Health check
- \`POST /api/auth/login\` - User login
- \`GET /api/users\` - Get all users (requires JWT)
`
    }
  },
  {
    id: 'node-express',
    name: 'Node.js Express API',
    description: 'RESTful API with Express, MongoDB, and TypeScript',
    category: 'Backend',
    icon: 'i-ph:node-logo',
    tags: ['Node.js', 'Express', 'TypeScript', 'MongoDB'],
    files: {
      'package.json': JSON.stringify({
        name: 'express-api',
        version: '1.0.0',
        description: 'Express API with TypeScript',
        main: 'dist/index.js',
        scripts: {
          dev: 'ts-node-dev --respawn --transpile-only src/index.ts',
          build: 'tsc',
          start: 'node dist/index.js'
        },
        dependencies: {
          express: '^4.18.2',
          mongoose: '^7.6.3',
          cors: '^2.8.5',
          dotenv: '^16.3.1',
          jsonwebtoken: '^9.0.2'
        },
        devDependencies: {
          '@types/express': '^4.17.20',
          '@types/cors': '^2.8.15',
          '@types/jsonwebtoken': '^9.0.4',
          typescript: '^5.2.2',
          'ts-node-dev': '^2.0.0'
        }
      }, null, 2),
      'tsconfig.json': JSON.stringify({
        compilerOptions: {
          target: 'ES2020',
          module: 'commonjs',
          lib: ['ES2020'],
          outDir: './dist',
          rootDir: './src',
          strict: true,
          esModuleInterop: true,
          skipLibCheck: true,
          forceConsistentCasingInFileNames: true,
          resolveJsonModule: true
        },
        include: ['src/**/*'],
        exclude: ['node_modules', 'dist']
      }, null, 2),
      'src/index.ts': `import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.get('/api/users', (req, res) => {
  res.json([
    { id: 1, name: 'John Doe', email: 'john@example.com' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com' }
  ]);
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Database connection
if (process.env.MONGODB_URI) {
  mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));
}

app.listen(PORT, () => {
  console.log(\`Server running on port \${PORT}\`);
});`,
      '.env': `PORT=3000
MONGODB_URI=mongodb://localhost:27017/express-api
JWT_SECRET=your-jwt-secret-here`,
      'README.md': `# Express TypeScript API

## Setup

1. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`

2. Copy environment variables:
   \`\`\`bash
   cp .env.example .env
   \`\`\`

3. Run in development mode:
   \`\`\`bash
   npm run dev
   \`\`\`

## Build for production

\`\`\`bash
npm run build
npm start
\`\`\`
`
    }
  }
];

export function ProjectImporter({ onProjectCreated, className }: ProjectImporterProps) {
  const [activeTab, setActiveTab] = useState<'templates' | 'github' | 'upload'>('templates');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [projectName, setProjectName] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const zipInputRef = useRef<HTMLInputElement>(null);

  const categories = [...new Set(PROJECT_TEMPLATES.map(t => t.category))];
  
  const filteredTemplates = PROJECT_TEMPLATES.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         template.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = !selectedCategory || template.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleCreateFromTemplate = async () => {
    if (!selectedTemplate || !projectName.trim()) return;

    setIsCreating(true);
    try {
      const template = PROJECT_TEMPLATES.find(t => t.id === selectedTemplate);
      if (!template) return;

      // Create project files
      for (const [filePath, content] of Object.entries(template.files)) {
        await workbenchStore.createFile(filePath, content);
      }

      // Add to agent memory
      agentStore.addMemory(
        `Created new project "${projectName}" from template "${template.name}"`,
        'project-importer',
        'project-creation'
      );

      onProjectCreated?.(projectName);
    } catch (error) {
      console.error('Failed to create project:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleCloneFromGitHub = async () => {
    if (!githubUrl.trim() || !projectName.trim()) return;

    setIsCreating(true);
    try {
      // Extract repo info from URL
      const repoMatch = githubUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
      if (!repoMatch) {
        throw new Error('Invalid GitHub URL');
      }

      const [, owner, repo] = repoMatch;
      const apiUrl = `https://api.github.com/repos/${owner}/${repo.replace('.git', '')}/contents`;

      // Fetch repository structure
      const response = await fetch(apiUrl);
      if (!response.ok) {
        throw new Error('Failed to fetch repository');
      }

      const files = await response.json();
      
      // Create files in workbench
      for (const file of files) {
        if (file.type === 'file') {
          const fileResponse = await fetch(file.download_url);
          const content = await fileResponse.text();
          await workbenchStore.createFile(file.name, content);
        }
      }

      agentStore.addMemory(
        `Cloned GitHub repository "${githubUrl}" as project "${projectName}"`,
        'project-importer',
        'github-clone'
      );

      onProjectCreated?.(projectName);
    } catch (error) {
      console.error('Failed to clone repository:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    setIsCreating(true);
    try {
      for (const file of Array.from(files)) {
        const content = await file.text();
        await workbenchStore.createFile(file.name, content);
      }

      agentStore.addMemory(
        `Uploaded ${files.length} files to create new project`,
        'project-importer',
        'file-upload'
      );

      onProjectCreated?.('Uploaded Project');
    } catch (error) {
      console.error('Failed to upload files:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleZipUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || !files[0]) return;

    setIsCreating(true);
    try {
      // Here you would implement ZIP extraction
      // For now, we'll simulate it
      console.log('ZIP upload not yet implemented');
      
      agentStore.addMemory(
        `Uploaded ZIP file to create new project`,
        'project-importer',
        'zip-upload'
      );

      onProjectCreated?.('ZIP Project');
    } catch (error) {
      console.error('Failed to upload ZIP:', error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className={classNames('h-full flex flex-col bg-bolt-elements-background-depth-1', className)}>
      {/* Header */}
      <div className="p-4 border-b border-bolt-elements-borderColor">
        <h2 className="text-xl font-semibold text-bolt-elements-textPrimary flex items-center gap-2">
          <div className="i-ph:folder-plus text-violet-400" />
          Create or Import Project
        </h2>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-bolt-elements-borderColor">
        {[
          { key: 'templates', label: 'Templates', icon: 'i-ph:squares-four' },
          { key: 'github', label: 'GitHub', icon: 'i-ph:github-logo' },
          { key: 'upload', label: 'Upload', icon: 'i-ph:upload' }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={classNames(
              'flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors',
              activeTab === tab.key
                ? 'text-violet-400 border-b-2 border-violet-400'
                : 'text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary'
            )}
          >
            <div className={classNames(tab.icon, 'w-4 h-4')} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {activeTab === 'templates' && (
          <div className="space-y-4">
            {/* Search and Filter */}
            <div className="flex gap-3">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search templates..."
                className="flex-1 px-3 py-2 bg-bolt-elements-background-depth-2 border border-bolt-elements-borderColor rounded text-bolt-elements-textPrimary placeholder-bolt-elements-textTertiary focus:border-violet-400 focus:outline-none"
              />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 bg-bolt-elements-background-depth-2 border border-bolt-elements-borderColor rounded text-bolt-elements-textPrimary focus:border-violet-400 focus:outline-none"
              >
                <option value="">All Categories</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>

            {/* Templates Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredTemplates.map((template) => (
                <div
                  key={template.id}
                  className={classNames(
                    'p-4 rounded-lg border cursor-pointer transition-all',
                    selectedTemplate === template.id
                      ? 'border-violet-400 bg-violet-600/10'
                      : 'border-bolt-elements-borderColor hover:border-violet-400/50 hover:bg-bolt-elements-background-depth-2'
                  )}
                  onClick={() => setSelectedTemplate(template.id)}
                >
                  <div className="flex items-start gap-3">
                    <div className={classNames(template.icon, 'w-8 h-8 text-violet-400 flex-shrink-0')} />
                    <div className="flex-1">
                      <h3 className="font-semibold text-bolt-elements-textPrimary">{template.name}</h3>
                      <p className="text-sm text-bolt-elements-textSecondary mt-1">{template.description}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {template.tags.map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-1 text-xs bg-violet-600/20 text-violet-300 rounded"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Project Name Input */}
            {selectedTemplate && (
              <div className="space-y-3 p-4 bg-bolt-elements-background-depth-2 rounded-lg">
                <label className="block text-sm font-medium text-bolt-elements-textPrimary">
                  Project Name:
                </label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="Enter project name..."
                  className="w-full px-3 py-2 bg-bolt-elements-background-depth-1 border border-bolt-elements-borderColor rounded text-bolt-elements-textPrimary placeholder-bolt-elements-textTertiary focus:border-violet-400 focus:outline-none"
                />
                <button
                  onClick={handleCreateFromTemplate}
                  disabled={!projectName.trim() || isCreating}
                  className="w-full btn-primary px-4 py-2 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCreating ? 'Creating...' : 'Create Project'}
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'github' && (
          <div className="space-y-4">
            <div className="text-center py-8">
              <div className="i-ph:github-logo text-6xl text-bolt-elements-textTertiary mb-4" />
              <h3 className="text-lg font-semibold text-bolt-elements-textPrimary mb-2">
                Clone from GitHub
              </h3>
              <p className="text-bolt-elements-textSecondary">
                Import any public GitHub repository into your workspace
              </p>
            </div>

            <div className="space-y-3 max-w-md mx-auto">
              <div>
                <label className="block text-sm font-medium text-bolt-elements-textPrimary mb-2">
                  GitHub Repository URL:
                </label>
                <input
                  type="url"
                  value={githubUrl}
                  onChange={(e) => setGithubUrl(e.target.value)}
                  placeholder="https://github.com/username/repository"
                  className="w-full px-3 py-2 bg-bolt-elements-background-depth-2 border border-bolt-elements-borderColor rounded text-bolt-elements-textPrimary placeholder-bolt-elements-textTertiary focus:border-violet-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-bolt-elements-textPrimary mb-2">
                  Project Name:
                </label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="Enter project name..."
                  className="w-full px-3 py-2 bg-bolt-elements-background-depth-2 border border-bolt-elements-borderColor rounded text-bolt-elements-textPrimary placeholder-bolt-elements-textTertiary focus:border-violet-400 focus:outline-none"
                />
              </div>

              <button
                onClick={handleCloneFromGitHub}
                disabled={!githubUrl.trim() || !projectName.trim() || isCreating}
                className="w-full btn-primary px-4 py-2 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCreating ? 'Cloning...' : 'Clone Repository'}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'upload' && (
          <div className="space-y-6">
            <div className="text-center py-8">
              <div className="i-ph:upload text-6xl text-bolt-elements-textTertiary mb-4" />
              <h3 className="text-lg font-semibold text-bolt-elements-textPrimary mb-2">
                Upload Files
              </h3>
              <p className="text-bolt-elements-textSecondary">
                Upload individual files or ZIP archives to create a new project
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
              {/* Individual Files */}
              <div className="p-6 border-2 border-dashed border-bolt-elements-borderColor rounded-lg text-center hover:border-violet-400 transition-colors">
                <div className="i-ph:files text-4xl text-bolt-elements-textTertiary mb-3" />
                <h4 className="font-medium text-bolt-elements-textPrimary mb-2">
                  Upload Files
                </h4>
                <p className="text-sm text-bolt-elements-textSecondary mb-4">
                  Select multiple files to upload
                </p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors"
                >
                  Choose Files
                </button>
              </div>

              {/* ZIP Archive */}
              <div className="p-6 border-2 border-dashed border-bolt-elements-borderColor rounded-lg text-center hover:border-violet-400 transition-colors">
                <div className="i-ph:file-zip text-4xl text-bolt-elements-textTertiary mb-3" />
                <h4 className="font-medium text-bolt-elements-textPrimary mb-2">
                  Upload ZIP
                </h4>
                <p className="text-sm text-bolt-elements-textSecondary mb-4">
                  Upload a ZIP archive to extract
                </p>
                <button
                  onClick={() => zipInputRef.current?.click()}
                  className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors"
                >
                  Choose ZIP
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileUpload}
      />
      <input
        ref={zipInputRef}
        type="file"
        accept=".zip"
        className="hidden"
        onChange={handleZipUpload}
      />
    </div>
  );
}