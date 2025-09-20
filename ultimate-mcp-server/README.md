# Ultimate MCP Server 🚀

**The most comprehensive MCP server for development and automation**

Combines database access, Windows automation, file system operations, Git tools, web capabilities, and more into a single high-performance server.

## 🌟 Features

### 🗄️ Database Access
- **20+ Database Support**: MySQL, PostgreSQL, SQLite, MongoDB, Redis, BigQuery, Snowflake, Oracle
- **Async Operations**: High-performance async database operations
- **Connection Pooling**: Efficient connection management
- **Query Builder**: Smart SQL query construction

### 🐱 GitHub & Git Integration
- **Repository Management**: Clone, pull, push, branch operations
- **Issue & PR Automation**: Create, update, manage issues and pull requests
- **Workflow Intelligence**: Monitor GitHub Actions, analyze builds
- **Local Git Operations**: Full git command support

### 📁 File System Operations
- **File Management**: Read, write, copy, move, delete files
- **Directory Operations**: Create, list, search directories
- **Content Search**: Find files by content or pattern
- **Project Structure**: Visualize project hierarchies

### 🖥️ Windows Automation (Windows Only)
- **Desktop Interaction**: Click, type, scroll, drag operations
- **App Control**: Launch applications, switch windows
- **UI Automation**: Interact with any Windows UI element
- **Screenshot Capture**: Visual desktop state analysis
- **Clipboard Operations**: Copy/paste automation

### 🌐 Web Capabilities
- **Web Scraping**: Extract content from any webpage
- **API Testing**: Make HTTP requests with full control
- **Browser Automation**: Control web browsers (when paired with browser tools)
- **Content Processing**: Convert HTML to markdown

### 🔧 Development Tools
- **Terminal Operations**: Execute shell commands
- **Environment Management**: Handle environment variables
- **Project Analysis**: Analyze codebases and structures
- **System Information**: Get detailed system stats

## 🚀 Quick Start

### Installation

```bash
# Clone or create the server directory
cd ultimate-mcp-server

# Install with uv (recommended)
uv sync

# Or install with pip
pip install -e .
```

### Configuration for Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "ultimate-mcp": {
      "command": "uv",
      "args": [
        "--directory",
        "C:\\path\\to\\ultimate-mcp-server",
        "run",
        "main.py"
      ],
      "env": {}
    }
  }
}
```

### Running the Server

```bash
# Start the server
uv run main.py

# Or with Python directly
python main.py
```

## 🛠️ Tool Categories

### File System Tools
- `read-file` - Read file contents
- `write-file` - Write content to file
- `list-directory` - List directory contents
- `search-files` - Search files by pattern
- `create-directory` - Create directories
- `delete-file` - Delete files
- `copy-file` - Copy files
- `move-file` - Move/rename files
- `find-files-with-content` - Search file contents
- `project-structure` - Show project tree

### Git Tools
- `git-status` - Repository status
- `git-add` - Stage files
- `git-commit` - Commit changes
- `git-push` - Push to remote
- `git-pull` - Pull from remote
- `git-log` - Commit history
- `git-branch` - Branch operations

### Terminal Tools
- `execute-command` - Run shell commands
- `get-current-directory` - Get working directory
- `change-directory` - Change directory

### Windows Automation Tools (Windows Only)
- `launch-app` - Launch applications
- `powershell-command` - Execute PowerShell
- `desktop-state` - Get desktop state
- `click-element` - Click UI elements
- `type-text` - Type text input
- `clipboard-ops` - Clipboard operations
- `scroll-window` - Scroll windows
- `keyboard-shortcut` - Execute shortcuts

### Web Tools
- `web-scrape` - Scrape webpage content
- `api-request` - Make HTTP requests

### System Tools
- `system-info` - Get system information
- `get-environment-variable` - Get env vars
- `set-environment-variable` - Set env vars

## 🔧 Advanced Configuration

### Database Connections

The server supports multiple database connections. Configure in your MCP client or through environment variables:

```bash
# PostgreSQL
export POSTGRES_HOST=localhost
export POSTGRES_PORT=5432
export POSTGRES_USER=username
export POSTGRES_PASSWORD=password
export POSTGRES_DB=database

# MySQL
export MYSQL_HOST=localhost
export MYSQL_PORT=3306
export MYSQL_USER=username
export MYSQL_PASSWORD=password
export MYSQL_DB=database
```

### Windows Tools Setup

Windows automation tools require additional packages:

```bash
# Install Windows-specific dependencies
uv add pywin32 wmi psutil

# Or with pip
pip install pywin32 wmi psutil
```

### Development Mode

```bash
# Install development dependencies
uv sync --group dev

# Run tests
pytest

# Format code
black .
ruff check --fix .

# Type checking
mypy .
```

## 🏗️ Architecture

The Ultimate MCP Server is built on:

- **FastMCP**: High-performance MCP framework
- **Modular Design**: Easy to extend and customize
- **Async Support**: Non-blocking operations
- **Error Handling**: Robust error management
- **Cross-Platform**: Works on Windows, macOS, Linux

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📝 License

MIT License - feel free to use and modify as needed.

## 🆘 Support

- **Issues**: Create GitHub issues for bugs
- **Features**: Request features through issues
- **Documentation**: Check the docs for detailed guides

---

**Built for developers who want everything in one place.** 🎯