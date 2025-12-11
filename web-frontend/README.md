# MCP VS Code Web Frontend

Production-quality web frontend for the MCP VS Code project, providing a VS Code-like interface for code editing, execution, and diagnostics.

## Features

### Phase 1 - Complete ✅
- **File Explorer**: Browse project files with expandable directory tree
- **Monaco Editor**: Full-featured code editor with syntax highlighting and IntelliSense
- **Code Execution**: Run Python and JavaScript files directly from the editor
- **Diagnostics Panel**: View errors, warnings, and info from LSP
- **Auto-save**: Save files with Ctrl+S
- **File Management**: Read and write files via MCP Repo server

## Tech Stack

- **React 18** with TypeScript
- **Vite** for fast development and optimized builds
- **Monaco Editor** for VS Code-like editing experience
- **Tailwind CSS** with VS Code color scheme
- **Axios** for MCP API communication
- **React Icons** for UI icons

## Setup

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

```bash
cd web-frontend
npm install
```

### Development

```bash
npm run dev
```

The app will be available at http://localhost:3000

### Build for Production

```bash
npm run build
```

Build output will be in the `dist/` directory.

## Project Structure

```
web-frontend/
├── src/
│   ├── components/
│   │   ├── FileTree.tsx          # File explorer
│   │   ├── MonacoEditor.tsx       # Code editor wrapper
│   │   ├── ExecutionPanel.tsx     # Run code and show results
│   │   └── DiagnosticsPanel.tsx   # Problems panel
│   ├── services/
│   │   └── mcpClient.ts          # MCP API client
│   ├── App.tsx                    # Main application
│   ├── types.ts                   # TypeScript types
│   ├── main.tsx                   # Entry point
│   └── index.css                  # Global styles
├── public/                        # Static assets
├── package.json
├── vite.config.ts
├── tailwind.config.js
└── tsconfig.json
```

## MCP Integration

The frontend communicates with MCP servers through the `/api` endpoint:

### Repo MCP
- `list_files` - List files in a directory
- `get_tree` - Get full directory tree
- `read_file` - Read file contents
- `write_file` - Write file contents
- `apply_patch` - Apply unified diff patches

### VSCode MCP
- `get_diagnostics` - Get LSP diagnostics for a file

### Exec MCP
- `run_python_file` - Execute Python file
- `run_js_file` - Execute JavaScript file
- `run_python_snippet` - Execute Python code snippet
- `run_js_snippet` - Execute JavaScript code snippet

### Git MCP
- `git_status` - Get git status
- `git_commit` - Commit changes

## Configuration

### Environment Variables

Create a `.env` file:

```env
# API endpoint (default: /api)
VITE_API_URL=http://localhost:4000/api

# Enable debug logging
VITE_DEBUG=false
```

### API Proxy

The Vite dev server proxies `/api` requests to `http://localhost:4000` by default. Update `vite.config.ts` to change the backend URL.

## Keyboard Shortcuts

- `Ctrl+S` / `Cmd+S` - Save current file
- Standard Monaco shortcuts (Ctrl+F for find, etc.)

## Next Phases

### Phase 2 - Terminal (Planned)
- WebSocket connection to node-pty backend
- xterm.js terminal UI
- Create/manage multiple terminals
- Send commands to terminal

### Phase 3 - LLM Integration (Planned)
- AI-powered code generation
- Refactoring suggestions
- Unified diff previews
- Apply/reject changes UI

### Phase 4 - Advanced Features (Planned)
- Git integration UI
- Diff viewer for patches
- Multi-file editing
- Search across files
- Settings panel

### Phase 5 - Firebase Deployment (Planned)
- Firebase Hosting setup
- Cloud Functions for API gateway
- Authentication with Firebase Auth
- CI/CD pipeline

## Development Notes

### Hot Module Replacement
Vite provides instant HMR. Changes to components will reflect immediately.

### Type Safety
All MCP responses are typed. See `src/types.ts` for definitions.

### Error Handling
MCP client wraps all API calls with try-catch and returns standardized error responses.

## Troubleshooting

### CORS Issues
Ensure backend allows requests from `http://localhost:3000` in development.

### MCP Connection Failed
1. Check backend is running on port 4000
2. Verify `/api` proxy is configured in `vite.config.ts`
3. Check browser console for error details

### Monaco Editor Not Loading
Clear cache and rebuild:
```bash
rm -rf node_modules dist
npm install
npm run build
```

## License

MIT - See LICENSE file in project root
