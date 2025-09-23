#!/usr/bin/env python3
"""
MCP Server for Terminal Operations
Focused server for shell commands, process management, and system operations.
"""

import os
import subprocess
import platform
from typing import Optional
from fastmcp import FastMCP

mcp = FastMCP(
    name='mcp-terminal',
    instructions='Terminal operations server for shell commands, process management, and system utilities.'
)

@mcp.tool(name='execute-command', description='Execute a shell command')
def execute_command(command: str, working_dir: Optional[str] = None, timeout: int = 30) -> str:
    """Execute shell command"""
    try:
        result = subprocess.run(
            command,
            shell=True,
            capture_output=True,
            text=True,
            cwd=working_dir,
            timeout=timeout
        )
        output = f"Exit Code: {result.returncode}\n"
        if result.stdout:
            output += f"STDOUT:\n{result.stdout}\n"
        if result.stderr:
            output += f"STDERR:\n{result.stderr}\n"
        return output
    except subprocess.TimeoutExpired:
        return f"Command timed out after {timeout} seconds"
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

@mcp.tool(name='list-processes', description='List running processes')
def list_processes(filter_name: Optional[str] = None) -> str:
    """List running processes"""
    try:
        if platform.system() == "Windows":
            cmd = "tasklist"
            if filter_name:
                cmd += f' /FI "IMAGENAME eq {filter_name}*"'
        else:
            cmd = "ps aux"
            if filter_name:
                cmd += f" | grep {filter_name}"

        return execute_command(cmd)
    except Exception as e:
        return f"Error listing processes: {str(e)}"

@mcp.tool(name='kill-process', description='Kill a process by PID or name')
def kill_process(identifier: str, by_name: bool = False) -> str:
    """Kill process"""
    try:
        if platform.system() == "Windows":
            if by_name:
                cmd = f"taskkill /F /IM {identifier}"
            else:
                cmd = f"taskkill /F /PID {identifier}"
        else:
            if by_name:
                cmd = f"pkill {identifier}"
            else:
                cmd = f"kill {identifier}"

        return execute_command(cmd)
    except Exception as e:
        return f"Error killing process: {str(e)}"

@mcp.tool(name='system-info', description='Get detailed system information')
def system_info() -> str:
    """Get system information"""
    try:
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
    except Exception as e:
        return f"Error getting system info: {str(e)}"

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

@mcp.tool(name='which-command', description='Find the location of a command')
def which_command(command: str) -> str:
    """Find command location"""
    try:
        if platform.system() == "Windows":
            result = execute_command(f"where {command}")
        else:
            result = execute_command(f"which {command}")
        return result
    except Exception as e:
        return f"Error finding command: {str(e)}"

@mcp.tool(name='disk-usage', description='Get disk usage information')
def disk_usage(path: str = ".") -> str:
    """Get disk usage"""
    try:
        if platform.system() == "Windows":
            return execute_command(f'dir "{path}" /-c')
        else:
            return execute_command(f"du -sh {path}")
    except Exception as e:
        return f"Error getting disk usage: {str(e)}"

@mcp.tool(name='network-info', description='Get network interface information')
def network_info() -> str:
    """Get network information"""
    try:
        if platform.system() == "Windows":
            return execute_command("ipconfig /all")
        else:
            return execute_command("ifconfig")
    except Exception as e:
        return f"Error getting network info: {str(e)}"

if __name__ == "__main__":
    mcp.run()