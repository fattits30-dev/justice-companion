#!/usr/bin/env python3
"""
MCP Server for File System Operations
Focused server for reading, writing, searching, and managing files and directories.
"""

import os
import shutil
import glob
from pathlib import Path
from typing import Literal
from fastmcp import FastMCP

mcp = FastMCP(
    name='mcp-file-system',
    instructions='File system operations server for reading, writing, searching, and managing files and directories.'
)

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

if __name__ == "__main__":
    mcp.run()