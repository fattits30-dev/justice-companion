#!/usr/bin/env python3
"""
Ultimate All-in-One MCP Server
Combines AgentMode database capabilities with Windows automation, file system, browser control, and more.
"""

import os
import sys
import asyncio
import subprocess
import json
from contextlib import asynccontextmanager
from collections.abc import AsyncIterator
from dataclasses import dataclass
from typing import Any, Literal
from collections import defaultdict
from pathlib import Path
import importlib.resources

# Database and API capabilities (from AgentMode)
from starlette.responses import PlainTextResponse
import click
from fastmcp import FastMCP
import platformdirs

# Windows automation capabilities (from Windows-MCP)
from fastmcp.utilities.types import Image
try:
    from humancursor import SystemCursor
    from platform import system, release
    from markdownify import markdownify
    import uiautomation as ua
    import pyautogui as pg
    import pyperclip as pc
    import requests
    WINDOWS_TOOLS_AVAILABLE = True
except ImportError:
    WINDOWS_TOOLS_AVAILABLE = False
    print("Windows tools not available - install: pip install humancursor pyautogui pyperclip uiautomation markdownify requests")

# File system capabilities
import shutil
import glob
from textwrap import dedent

# Configuration
HOME_DIRECTORY = platformdirs.user_data_dir('ultimate-mcp', ensure_exists=True)
PORT = os.getenv("PORT", 13000)

if WINDOWS_TOOLS_AVAILABLE:
    pg.FAILSAFE = False
    pg.PAUSE = 1.0
    os_name = system()
    version = release()

instructions = dedent(f'''
Ultimate MCP Server provides comprehensive development and automation capabilities:

DATABASE ACCESS: Connect to 20+ databases (MySQL, PostgreSQL, SQLite, MongoDB, etc.)
GITHUB INTEGRATION: Repository management, PRs, issues, workflows
FILE SYSTEM: Read, write, search, and manage files and directories
WINDOWS AUTOMATION: Desktop interaction, app control, UI automation
WEB CAPABILITIES: Browser control, web scraping, API testing
DEVELOPMENT TOOLS: Git operations, terminal commands, project management

All tools integrated into a single, high-performance server.
''')

@dataclass
class AppContext:
    db: Any = None
    desktop: Any = None
    cursor: Any = None

# Global state
connection_mapping = {}
connections_created = []
app_context = AppContext()

@asynccontextmanager
async def lifespan(app: FastMCP):
    """Initialize all subsystems"""
    print("Starting Ultimate MCP Server...")

    # Initialize Windows tools if available
    if WINDOWS_TOOLS_AVAILABLE:
        try:
            from src.desktop import Desktop
            app_context.desktop = Desktop()
            app_context.cursor = SystemCursor()
            print("Windows automation tools loaded")
        except ImportError:
            print("Windows desktop module not found - Windows tools disabled")

    await asyncio.sleep(1)
    print("Ultimate MCP Server ready!")
    yield
    print("Ultimate MCP Server shutting down...")

# Initialize the MCP server
mcp = FastMCP(name='ultimate-mcp', instructions=instructions, lifespan=lifespan)

# =============================================================================
# FILE SYSTEM TOOLS
# =============================================================================

@mcp.tool(name='read-file', description='Read the contents of a file')
def read_file(file_path: str) -> str:
    """Read file contents"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        return f"File: {file_path}\n\n{content}"
    except Exception as e:
        return f"Error reading file {file_path}: {str(e)}"

@mcp.tool(name='write-file', description='Write content to a file')
def write_file(file_path: str, content: str) -> str:
    """Write content to file"""
    try:
        # Create directory if it doesn't exist
        os.makedirs(os.path.dirname(file_path), exist_ok=True)
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        return f"Successfully wrote to {file_path}"
    except Exception as e:
        return f"Error writing to file {file_path}: {str(e)}"

@mcp.tool(name='list-directory', description='List contents of a directory')
def list_directory(dir_path: str = ".") -> str:
    """List directory contents"""
    try:
        items = []
        for item in os.listdir(dir_path):
            item_path = os.path.join(dir_path, item)
            if os.path.isdir(item_path):
                items.append(f"📁 {item}/")
            else:
                size = os.path.getsize(item_path)
                items.append(f"📄 {item} ({size} bytes)")
        return f"Directory: {dir_path}\n\n" + "\n".join(items)
    except Exception as e:
        return f"Error listing directory {dir_path}: {str(e)}"

@mcp.tool(name='search-files', description='Search for files by pattern')
def search_files(pattern: str, directory: str = ".") -> str:
    """Search for files matching pattern"""
    try:
        matches = glob.glob(os.path.join(directory, pattern), recursive=True)
        if matches:
            return f"Found {len(matches)} matches:\n" + "\n".join(matches)
        else:
            return f"No files found matching pattern: {pattern}"
    except Exception as e:
        return f"Error searching files: {str(e)}"

@mcp.tool(name='create-directory', description='Create a new directory')
def create_directory(dir_path: str) -> str:
    """Create directory"""
    try:
        os.makedirs(dir_path, exist_ok=True)
        return f"Created directory: {dir_path}"
    except Exception as e:
        return f"Error creating directory {dir_path}: {str(e)}"

@mcp.tool(name='delete-file', description='Delete a file')
def delete_file(file_path: str) -> str:
    """Delete file"""
    try:
        os.remove(file_path)
        return f"Deleted file: {file_path}"
    except Exception as e:
        return f"Error deleting file {file_path}: {str(e)}"

@mcp.tool(name='copy-file', description='Copy a file to another location')
def copy_file(source: str, destination: str) -> str:
    """Copy file"""
    try:
        shutil.copy2(source, destination)
        return f"Copied {source} to {destination}"
    except Exception as e:
        return f"Error copying file: {str(e)}"

@mcp.tool(name='move-file', description='Move/rename a file')
def move_file(source: str, destination: str) -> str:
    """Move/rename file"""
    try:
        shutil.move(source, destination)
        return f"Moved {source} to {destination}"
    except Exception as e:
        return f"Error moving file: {str(e)}"

# =============================================================================
# TERMINAL/SHELL TOOLS
# =============================================================================

@mcp.tool(name='execute-command', description='Execute a shell command')
def execute_command(command: str, working_dir: str = None) -> str:
    """Execute shell command"""
    try:
        result = subprocess.run(
            command,
            shell=True,
            capture_output=True,
            text=True,
            cwd=working_dir,
            timeout=30
        )
        output = f"Exit Code: {result.returncode}\n"
        if result.stdout:
            output += f"STDOUT:\n{result.stdout}\n"
        if result.stderr:
            output += f"STDERR:\n{result.stderr}\n"
        return output
    except subprocess.TimeoutExpired:
        return "Command timed out after 30 seconds"
    except Exception as e:
        return f"Error executing command: {str(e)}"

@mcp.tool(name='get-current-directory', description='Get current working directory')
def get_current_directory() -> str:
    """Get current directory"""
    return f"Current directory: {os.getcwd()}"

@mcp.tool(name='change-directory', description='Change working directory')
def change_directory(path: str) -> str:
    """Change directory"""
    try:
        os.chdir(path)
        return f"Changed to directory: {os.getcwd()}"
    except Exception as e:
        return f"Error changing directory: {str(e)}"

# =============================================================================
# GIT TOOLS
# =============================================================================

@mcp.tool(name='git-status', description='Get git repository status')
def git_status() -> str:
    """Get git status"""
    return execute_command("git status")

@mcp.tool(name='git-add', description='Stage files for commit')
def git_add(files: str = ".") -> str:
    """Git add files"""
    return execute_command(f"git add {files}")

@mcp.tool(name='git-commit', description='Commit staged changes')
def git_commit(message: str) -> str:
    """Git commit"""
    return execute_command(f'git commit -m "{message}"')

@mcp.tool(name='git-push', description='Push commits to remote')
def git_push(branch: str = None) -> str:
    """Git push"""
    cmd = "git push"
    if branch:
        cmd += f" origin {branch}"
    return execute_command(cmd)

@mcp.tool(name='git-pull', description='Pull changes from remote')
def git_pull() -> str:
    """Git pull"""
    return execute_command("git pull")

@mcp.tool(name='git-log', description='Show git commit history')
def git_log(limit: int = 10) -> str:
    """Git log"""
    return execute_command(f"git log --oneline -n {limit}")

@mcp.tool(name='git-branch', description='List or create branches')
def git_branch(action: Literal['list', 'create', 'switch'] = 'list', branch_name: str = None) -> str:
    """Git branch operations"""
    if action == 'list':
        return execute_command("git branch -a")
    elif action == 'create' and branch_name:
        return execute_command(f"git checkout -b {branch_name}")
    elif action == 'switch' and branch_name:
        return execute_command(f"git checkout {branch_name}")
    else:
        return "Invalid action or missing branch name"

# =============================================================================
# WINDOWS AUTOMATION TOOLS (if available)
# =============================================================================

if WINDOWS_TOOLS_AVAILABLE:
    @mcp.tool(name='launch-app', description='Launch a Windows application')
    def launch_app(name: str) -> str:
        """Launch Windows application"""
        if not app_context.desktop:
            return "Windows desktop tools not initialized"
        _, status = app_context.desktop.launch_app(name)
        if status != 0:
            return f'Failed to launch {name.title()}.'
        else:
            return f'Launched {name.title()}.'

    @mcp.tool(name='powershell-command', description='Execute PowerShell command')
    def powershell_command(command: str) -> str:
        """Execute PowerShell command"""
        if not app_context.desktop:
            return "Windows desktop tools not initialized"
        response, status = app_context.desktop.execute_command(command)
        return f'Status Code: {status}\nResponse: {response}'

    @mcp.tool(name='desktop-state', description='Get current desktop state with UI elements')
    def desktop_state(use_vision: bool = False) -> str:
        """Get desktop state"""
        if not app_context.desktop:
            return "Windows desktop tools not initialized"

        desktop_state = app_context.desktop.get_state(use_vision=use_vision)
        interactive_elements = desktop_state.tree_state.interactive_elements_to_string()
        informative_elements = desktop_state.tree_state.informative_elements_to_string()
        scrollable_elements = desktop_state.tree_state.scrollable_elements_to_string()
        apps = desktop_state.apps_to_string()
        active_app = desktop_state.active_app_to_string()

        result = [dedent(f'''
        Focused App:
        {active_app}

        Opened Apps:
        {apps}

        List of Interactive Elements:
        {interactive_elements or 'No interactive elements found.'}

        List of Informative Elements:
        {informative_elements or 'No informative elements found.'}

        List of Scrollable Elements:
        {scrollable_elements or 'No scrollable elements found.'}
        ''')]

        if use_vision:
            result.append(Image(data=desktop_state.screenshot, format='png'))

        return result

    @mcp.tool(name='click-element', description='Click on UI element at coordinates')
    def click_element(loc: tuple[int, int], button: Literal['left', 'right', 'middle'] = 'left', clicks: int = 1) -> str:
        """Click on UI element"""
        if not app_context.cursor:
            return "Windows cursor tools not initialized"

        x, y = loc
        app_context.cursor.move_to(loc)
        control = app_context.desktop.get_element_under_cursor()
        pg.mouseDown()
        pg.click(button=button, clicks=clicks)
        pg.mouseUp()
        num_clicks = {1: 'Single', 2: 'Double', 3: 'Triple'}
        return f'{num_clicks.get(clicks)} {button} clicked on {control.Name} Element with ControlType {control.ControlTypeName} at ({x},{y}).'

    @mcp.tool(name='type-text', description='Type text at location')
    def type_text(loc: tuple[int, int], text: str, clear: bool = False) -> str:
        """Type text at coordinates"""
        if not app_context.cursor:
            return "Windows cursor tools not initialized"

        x, y = loc
        app_context.cursor.click_on(loc)
        control = app_context.desktop.get_element_under_cursor()
        if clear:
            pg.hotkey('ctrl', 'a')
            pg.press('backspace')
        pg.typewrite(text, interval=0.1)
        return f'Typed "{text}" on {control.Name} Element with ControlType {control.ControlTypeName} at ({x},{y}).'

    @mcp.tool(name='clipboard-ops', description='Clipboard operations')
    def clipboard_ops(mode: Literal['copy', 'paste'], text: str = None) -> str:
        """Clipboard operations"""
        if mode == 'copy':
            if text:
                pc.copy(text)
                return f'Copied "{text}" to clipboard'
            else:
                return "No text provided to copy"
        elif mode == 'paste':
            clipboard_content = pc.paste()
            return f'Clipboard Content: "{clipboard_content}"'
        else:
            return 'Invalid mode. Use "copy" or "paste".'

    @mcp.tool(name='scroll-window', description='Scroll in window')
    def scroll_window(loc: tuple[int, int] = None, direction: Literal['up', 'down', 'left', 'right'] = 'down', wheel_times: int = 1) -> str:
        """Scroll window"""
        if not app_context.cursor:
            return "Windows cursor tools not initialized"

        if loc:
            app_context.cursor.move_to(loc)

        if direction == 'up':
            ua.WheelUp(wheel_times)
        elif direction == 'down':
            ua.WheelDown(wheel_times)
        elif direction == 'left':
            pg.keyDown('Shift')
            pg.sleep(0.05)
            ua.WheelUp(wheel_times)
            pg.sleep(0.05)
            pg.keyUp('Shift')
        elif direction == 'right':
            pg.keyDown('Shift')
            pg.sleep(0.05)
            ua.WheelDown(wheel_times)
            pg.sleep(0.05)
            pg.keyUp('Shift')

        return f'Scrolled {direction} by {wheel_times} wheel times.'

    @mcp.tool(name='keyboard-shortcut', description='Execute keyboard shortcut')
    def keyboard_shortcut(shortcut: list[str]) -> str:
        """Execute keyboard shortcut"""
        pg.hotkey(*shortcut)
        return f'Pressed {"+".join(shortcut)}.'

# =============================================================================
# WEB TOOLS
# =============================================================================

@mcp.tool(name='web-scrape', description='Scrape webpage content')
def web_scrape(url: str) -> str:
    """Scrape webpage"""
    try:
        import requests
        from markdownify import markdownify
        response = requests.get(url, timeout=10)
        html = response.text
        content = markdownify(html=html)
        return f'Scraped contents of {url}:\n{content}'
    except Exception as e:
        return f"Error scraping {url}: {str(e)}"

@mcp.tool(name='api-request', description='Make HTTP API request')
def api_request(url: str, method: Literal['GET', 'POST', 'PUT', 'DELETE'] = 'GET', headers: dict = None, data: dict = None) -> str:
    """Make API request"""
    try:
        import requests
        response = requests.request(
            method=method,
            url=url,
            headers=headers or {},
            json=data,
            timeout=10
        )
        return f"Status: {response.status_code}\nHeaders: {dict(response.headers)}\nBody: {response.text}"
    except Exception as e:
        return f"Error making API request: {str(e)}"

# =============================================================================
# PROJECT MANAGEMENT TOOLS
# =============================================================================

@mcp.tool(name='find-files-with-content', description='Search for files containing specific text')
def find_files_with_content(search_text: str, directory: str = ".", file_pattern: str = "*") -> str:
    """Search files for content"""
    try:
        import fnmatch
        matches = []
        for root, dirs, files in os.walk(directory):
            for file in files:
                if fnmatch.fnmatch(file, file_pattern):
                    file_path = os.path.join(root, file)
                    try:
                        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                            content = f.read()
                            if search_text.lower() in content.lower():
                                matches.append(file_path)
                    except:
                        continue

        if matches:
            return f"Found '{search_text}' in {len(matches)} files:\n" + "\n".join(matches)
        else:
            return f"No files found containing '{search_text}'"
    except Exception as e:
        return f"Error searching files: {str(e)}"

@mcp.tool(name='project-structure', description='Show project directory structure')
def project_structure(directory: str = ".", max_depth: int = 3) -> str:
    """Show project structure"""
    try:
        structure = []

        def build_tree(path, prefix="", depth=0):
            if depth >= max_depth:
                return

            items = sorted(os.listdir(path))
            for i, item in enumerate(items):
                if item.startswith('.'):
                    continue

                item_path = os.path.join(path, item)
                is_last = i == len(items) - 1
                current_prefix = "└── " if is_last else "├── "

                if os.path.isdir(item_path):
                    structure.append(f"{prefix}{current_prefix}📁 {item}/")
                    next_prefix = prefix + ("    " if is_last else "│   ")
                    build_tree(item_path, next_prefix, depth + 1)
                else:
                    structure.append(f"{prefix}{current_prefix}📄 {item}")

        structure.append(f"📁 {os.path.basename(os.path.abspath(directory))}/")
        build_tree(directory)
        return "\n".join(structure)
    except Exception as e:
        return f"Error showing project structure: {str(e)}"

# =============================================================================
# UTILITY TOOLS
# =============================================================================

@mcp.tool(name='system-info', description='Get system information')
def system_info() -> str:
    """Get system information"""
    import platform
    info = {
        "System": platform.system(),
        "Release": platform.release(),
        "Version": platform.version(),
        "Machine": platform.machine(),
        "Processor": platform.processor(),
        "Python Version": platform.python_version(),
        "Current Directory": os.getcwd(),
        "Home Directory": os.path.expanduser("~"),
        "Environment Variables": len(os.environ)
    }

    result = "System Information:\n"
    for key, value in info.items():
        result += f"{key}: {value}\n"

    return result

@mcp.tool(name='get-environment-variable', description='Get environment variable value')
def get_environment_variable(var_name: str) -> str:
    """Get environment variable"""
    value = os.getenv(var_name)
    if value:
        return f"{var_name}={value}"
    else:
        return f"Environment variable '{var_name}' not found"

@mcp.tool(name='set-environment-variable', description='Set environment variable for this session')
def set_environment_variable(var_name: str, value: str) -> str:
    """Set environment variable"""
    os.environ[var_name] = value
    return f"Set {var_name}={value}"

if __name__ == "__main__":
    print("Ultimate MCP Server Starting...")
    mcp.run()