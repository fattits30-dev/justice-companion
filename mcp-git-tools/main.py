#!/usr/bin/env python3
"""
MCP Server for Git Operations
Focused server for Git version control operations.
"""

import subprocess
from typing import Literal
from fastmcp import FastMCP

mcp = FastMCP(
    name='mcp-git-tools',
    instructions='Git operations server for version control, branch management, and repository operations.'
)

def execute_git_command(command: str, working_dir: str = None) -> str:
    """Execute git command and return result"""
    import os
    try:
        # Default to current working directory if none specified
        if working_dir is None:
            working_dir = os.getcwd()

        result = subprocess.run(
            command,
            shell=True,
            capture_output=True,
            text=True,
            cwd=working_dir,
            timeout=30
        )
        output = f"Working Dir: {working_dir}\nExit Code: {result.returncode}\n"
        if result.stdout:
            output += f"STDOUT:\n{result.stdout}\n"
        if result.stderr:
            output += f"STDERR:\n{result.stderr}\n"
        return output
    except subprocess.TimeoutExpired:
        return "Command timed out after 30 seconds"
    except Exception as e:
        return f"Error executing git command: {str(e)}"

@mcp.tool(name='git-status', description='Get git repository status')
def git_status() -> str:
    """Get git status"""
    # Use the Justice Companion project directory
    project_dir = r"C:\Users\sava6\Desktop\Justice Companion"
    return execute_git_command("git status", working_dir=project_dir)

@mcp.tool(name='git-add', description='Stage files for commit')
def git_add(files: str = ".") -> str:
    """Git add files"""
    return execute_git_command(f"git add {files}")

@mcp.tool(name='git-commit', description='Commit staged changes')
def git_commit(message: str) -> str:
    """Git commit"""
    return execute_git_command(f'git commit -m "{message}"')

@mcp.tool(name='git-push', description='Push commits to remote')
def git_push(branch: str = None) -> str:
    """Git push"""
    cmd = "git push"
    if branch:
        cmd += f" origin {branch}"
    return execute_git_command(cmd)

@mcp.tool(name='git-pull', description='Pull changes from remote')
def git_pull() -> str:
    """Git pull"""
    return execute_git_command("git pull")

@mcp.tool(name='git-log', description='Show git commit history')
def git_log(limit: int = 10) -> str:
    """Git log"""
    # Use the Justice Companion project directory
    project_dir = r"C:\Users\sava6\Desktop\Justice Companion"
    return execute_git_command(f"git log --oneline -n {limit}", working_dir=project_dir)

@mcp.tool(name='git-branch', description='List or create branches')
def git_branch(action: Literal['list', 'create', 'switch'] = 'list', branch_name: str = None) -> str:
    """Git branch operations"""
    if action == 'list':
        return execute_git_command("git branch -a")
    elif action == 'create' and branch_name:
        return execute_git_command(f"git checkout -b {branch_name}")
    elif action == 'switch' and branch_name:
        return execute_git_command(f"git checkout {branch_name}")
    else:
        return "Invalid action or missing branch name"

@mcp.tool(name='git-diff', description='Show git differences')
def git_diff(staged: bool = False) -> str:
    """Git diff"""
    cmd = "git diff --cached" if staged else "git diff"
    return execute_git_command(cmd)

@mcp.tool(name='git-stash', description='Stash operations')
def git_stash(action: Literal['save', 'pop', 'list', 'drop'] = 'save', message: str = None) -> str:
    """Git stash operations"""
    if action == 'save':
        cmd = f"git stash save '{message}'" if message else "git stash save"
    elif action == 'pop':
        cmd = "git stash pop"
    elif action == 'list':
        cmd = "git stash list"
    elif action == 'drop':
        cmd = "git stash drop"
    else:
        return "Invalid stash action"

    return execute_git_command(cmd)

@mcp.tool(name='git-remote', description='Remote repository operations')
def git_remote(action: Literal['list', 'add', 'remove'] = 'list', name: str = None, url: str = None) -> str:
    """Git remote operations"""
    if action == 'list':
        return execute_git_command("git remote -v")
    elif action == 'add' and name and url:
        return execute_git_command(f"git remote add {name} {url}")
    elif action == 'remove' and name:
        return execute_git_command(f"git remote remove {name}")
    else:
        return "Invalid action or missing parameters"

if __name__ == "__main__":
    mcp.run()