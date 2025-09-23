#!/usr/bin/env python3
"""
Enhanced MCP Server for File System Operations with Pagination
Optimized server for handling large directory searches with token limits.
"""

import os
import shutil
import glob
import fnmatch
from pathlib import Path
from typing import Literal, List, Dict, Any
from fastmcp import FastMCP

mcp = FastMCP(
    name='mcp-file-system-enhanced',
    instructions='Enhanced file system operations server with pagination support for large directory searches.'
)

# Configuration for pagination and filtering
MAX_RESULTS_PER_BATCH = 100
MAX_TOKENS_ESTIMATE = 20000  # Conservative estimate to stay under 25k limit
EXCLUDED_DIRECTORIES = {
    'node_modules', '.git', '.vscode', '__pycache__',
    'dist', 'build', '.next', '.cache', 'coverage',
    'debug_archive', 'live_screenshots', 'test_warzone'
}

def should_exclude_directory(dir_name: str) -> bool:
    """Check if directory should be excluded from search"""
    return dir_name in EXCLUDED_DIRECTORIES or dir_name.startswith('.')

def estimate_token_usage(text: str) -> int:
    """Rough estimate of token usage (approximately 4 characters per token)"""
    return len(text) // 4

@mcp.tool(name='paginated-search', description='Search files with pagination to handle large result sets')
def paginated_search(
    pattern: str = "**/*",
    directory: str = ".",
    page: int = 1,
    page_size: int = 50,
    include_extensions: str = "",
    exclude_dirs: str = ""
) -> str:
    """
    Search for files with pagination support

    Args:
        pattern: Glob pattern to match files (default: **/* for all files)
        directory: Directory to search in
        page: Page number (1-based)
        page_size: Number of results per page
        include_extensions: Comma-separated list of extensions (.js,.jsx,.json)
        exclude_dirs: Additional directories to exclude (comma-separated)
    """
    try:
        # Parse additional excluded directories
        additional_excludes = set()
        if exclude_dirs:
            additional_excludes = {d.strip() for d in exclude_dirs.split(',')}

        # Parse extension filters
        extensions = set()
        if include_extensions:
            extensions = {ext.strip().lower() for ext in include_extensions.split(',')}
            if not all(ext.startswith('.') for ext in extensions):
                extensions = {f'.{ext}' if not ext.startswith('.') else ext for ext in extensions}

        matches = []
        for root, dirs, files in os.walk(directory):
            # Filter out excluded directories in-place
            dirs[:] = [d for d in dirs if not should_exclude_directory(d) and d not in additional_excludes]

            for file in files:
                file_path = os.path.join(root, file)

                # Apply extension filter if specified
                if extensions:
                    file_ext = os.path.splitext(file)[1].lower()
                    if file_ext not in extensions:
                        continue

                # Apply pattern matching
                if fnmatch.fnmatch(file, pattern.split('/')[-1]) or pattern == "**/*":
                    matches.append(file_path)

        # Calculate pagination
        total_results = len(matches)
        start_idx = (page - 1) * page_size
        end_idx = start_idx + page_size
        page_results = matches[start_idx:end_idx]

        total_pages = (total_results + page_size - 1) // page_size

        result = f"Page {page} of {total_pages} (Total: {total_results} files)\n\n"
        result += "\n".join(page_results)

        if page < total_pages:
            result += f"\n\nTo see more results, use page {page + 1}"

        return result

    except Exception as e:
        return f"Error in paginated search: {str(e)}"

@mcp.tool(name='smart-search-js', description='Search for JavaScript/React files in Justice Companion')
def smart_search_js(
    subdirectory: str = "src",
    file_types: str = ".js,.jsx,.json",
    page: int = 1
) -> str:
    """Optimized search for JS/JSX/JSON files in specific subdirectories"""
    try:
        base_dir = "C:\\Users\\sava6\\Desktop\\Justice Companion\\justice-companion-app"
        search_dir = os.path.join(base_dir, subdirectory) if subdirectory != "." else base_dir

        return paginated_search(
            pattern="**/*",
            directory=search_dir,
            page=page,
            page_size=30,
            include_extensions=file_types,
            exclude_dirs="node_modules,dist,build,tests,__tests__"
        )
    except Exception as e:
        return f"Error in smart JS search: {str(e)}"

@mcp.tool(name='search-by-type', description='Search files by specific type with optimization')
def search_by_type(
    file_type: Literal["js", "jsx", "json", "py", "md", "txt", "config"],
    directory: str = ".",
    page: int = 1
) -> str:
    """Search for specific file types with built-in optimization"""
    try:
        type_patterns = {
            "js": ".js",
            "jsx": ".jsx",
            "json": ".json",
            "py": ".py",
            "md": ".md",
            "txt": ".txt",
            "config": ".config,.env,.gitignore"
        }

        extensions = type_patterns.get(file_type, f".{file_type}")

        return paginated_search(
            pattern="**/*",
            directory=directory,
            page=page,
            page_size=40,
            include_extensions=extensions,
            exclude_dirs="node_modules,.git,dist,build,coverage"
        )
    except Exception as e:
        return f"Error in type search: {str(e)}"

@mcp.tool(name='directory-overview', description='Get overview of directory structure without deep traversal')
def directory_overview(directory: str = ".", max_depth: int = 2) -> str:
    """Get a quick overview of directory structure with limited depth"""
    try:
        structure = []

        def build_tree(path, prefix="", depth=0):
            if depth >= max_depth:
                return

            try:
                items = sorted(os.listdir(path))
            except PermissionError:
                return

            # Count files and directories
            dirs = [item for item in items if os.path.isdir(os.path.join(path, item)) and not should_exclude_directory(item)]
            files = [item for item in items if os.path.isfile(os.path.join(path, item))]

            # Show summary for directories with many files
            if len(files) > 20:
                structure.append(f"{prefix}📄 {len(files)} files (showing first 10)")
                files = files[:10]

            for i, item in enumerate(dirs + files):
                item_path = os.path.join(path, item)
                is_last = i == len(dirs + files) - 1
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
        return f"Error showing directory overview: {str(e)}"

@mcp.tool(name='find-content-paginated', description='Search file contents with pagination')
def find_content_paginated(
    search_text: str,
    directory: str = ".",
    file_extensions: str = ".js,.jsx,.json,.py,.md",
    page: int = 1,
    page_size: int = 20
) -> str:
    """Search for content in files with pagination"""
    try:
        extensions = {ext.strip().lower() for ext in file_extensions.split(',')}
        extensions = {f'.{ext}' if not ext.startswith('.') else ext for ext in extensions}

        matches = []
        for root, dirs, files in os.walk(directory):
            # Filter out excluded directories
            dirs[:] = [d for d in dirs if not should_exclude_directory(d)]

            for file in files:
                file_ext = os.path.splitext(file)[1].lower()
                if file_ext not in extensions:
                    continue

                file_path = os.path.join(root, file)
                try:
                    with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                        content = f.read()
                        if search_text.lower() in content.lower():
                            # Find line number of first match
                            lines = content.split('\n')
                            line_num = next((i+1 for i, line in enumerate(lines)
                                           if search_text.lower() in line.lower()), 0)
                            matches.append(f"{file_path} (line {line_num})")
                except:
                    continue

        # Pagination
        total_results = len(matches)
        start_idx = (page - 1) * page_size
        end_idx = start_idx + page_size
        page_results = matches[start_idx:end_idx]

        total_pages = (total_results + page_size - 1) // page_size

        result = f"Found '{search_text}' in {total_results} files (Page {page} of {total_pages})\n\n"
        result += "\n".join(page_results)

        if page < total_pages:
            result += f"\n\nTo see more results, use page {page + 1}"

        return result

    except Exception as e:
        return f"Error in content search: {str(e)}"

@mcp.tool(name='justice-companion-quick-search', description='Quick search optimized for Justice Companion project')
def justice_companion_quick_search(
    search_type: Literal["components", "api", "main", "renderer", "all-js"],
    pattern: str = "*",
    page: int = 1
) -> str:
    """Optimized search patterns for Justice Companion project structure"""
    try:
        base_dir = "C:\\Users\\sava6\\Desktop\\Justice Companion\\justice-companion-app\\src"

        search_configs = {
            "components": {
                "directory": os.path.join(base_dir, "renderer", "components"),
                "extensions": ".jsx,.js",
                "description": "React components"
            },
            "api": {
                "directory": os.path.join(base_dir, "main", "api"),
                "extensions": ".js",
                "description": "API and backend services"
            },
            "main": {
                "directory": os.path.join(base_dir, "main"),
                "extensions": ".js",
                "description": "Electron main process files"
            },
            "renderer": {
                "directory": os.path.join(base_dir, "renderer"),
                "extensions": ".jsx,.js",
                "description": "Renderer process files"
            },
            "all-js": {
                "directory": base_dir,
                "extensions": ".js,.jsx,.json",
                "description": "All JavaScript files"
            }
        }

        config = search_configs.get(search_type)
        if not config:
            return f"Invalid search type. Available: {', '.join(search_configs.keys())}"

        result = f"Searching {config['description']} in {config['directory']}\n\n"

        search_result = paginated_search(
            pattern=f"*{pattern}*" if pattern != "*" else "**/*",
            directory=config["directory"],
            page=page,
            page_size=25,
            include_extensions=config["extensions"],
            exclude_dirs="node_modules,dist,build,__tests__,tests"
        )

        return result + search_result

    except Exception as e:
        return f"Error in Justice Companion search: {str(e)}"

# Keep original tools for backward compatibility
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
        os.makedirs(os.path.dirname(file_path), exist_ok=True)
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        return f"Successfully wrote to {file_path}"
    except Exception as e:
        return f"Error writing to file {file_path}: {str(e)}"

@mcp.tool(name='list-directory', description='List contents of a directory with smart pagination')
def list_directory(dir_path: str = ".", show_hidden: bool = False, max_items: int = 50) -> str:
    """List directory contents with pagination for large directories"""
    try:
        items = []
        all_items = os.listdir(dir_path)

        if not show_hidden:
            all_items = [item for item in all_items if not item.startswith('.')]

        # If too many items, show summary and first N items
        if len(all_items) > max_items:
            items.append(f"Directory contains {len(all_items)} items (showing first {max_items})")
            items.append("-" * 50)
            all_items = all_items[:max_items]

        for item in all_items:
            item_path = os.path.join(dir_path, item)
            if os.path.isdir(item_path):
                # Count files in subdirectory
                try:
                    subdir_count = len(os.listdir(item_path))
                    items.append(f"📁 {item}/ ({subdir_count} items)")
                except:
                    items.append(f"📁 {item}/")
            else:
                try:
                    size = os.path.getsize(item_path)
                    if size > 1024 * 1024:
                        size_str = f"{size / (1024 * 1024):.1f} MB"
                    elif size > 1024:
                        size_str = f"{size / 1024:.1f} KB"
                    else:
                        size_str = f"{size} bytes"
                    items.append(f"📄 {item} ({size_str})")
                except:
                    items.append(f"📄 {item}")

        return f"Directory: {dir_path}\n\n" + "\n".join(items)
    except Exception as e:
        return f"Error listing directory {dir_path}: {str(e)}"

if __name__ == "__main__":
    mcp.run()