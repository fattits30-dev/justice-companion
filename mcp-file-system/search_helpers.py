#!/usr/bin/env python3
"""
Search Helper Functions and Patterns for Justice Companion Development
Provides optimized search patterns and utilities for efficient filesystem operations.
"""

import os
import json
from pathlib import Path
from typing import List, Dict, Any

class JusticeCompanionSearchHelper:
    """Helper class for optimized search operations in Justice Companion project"""

    def __init__(self, base_path: str = "C:\\Users\\sava6\\Desktop\\Justice Companion"):
        self.base_path = base_path
        self.app_path = os.path.join(base_path, "justice-companion-app")
        self.src_path = os.path.join(self.app_path, "src")

    def get_search_patterns(self) -> Dict[str, Dict[str, Any]]:
        """Return predefined search patterns for common development tasks"""
        return {
            "react_components": {
                "description": "Find React components (.jsx files)",
                "directory": os.path.join(self.src_path, "renderer", "components"),
                "extensions": [".jsx"],
                "exclude_dirs": ["__tests__", "node_modules"]
            },
            "api_services": {
                "description": "Find API and backend services",
                "directory": os.path.join(self.src_path, "main", "api"),
                "extensions": [".js"],
                "exclude_dirs": ["node_modules", "dist"]
            },
            "main_process": {
                "description": "Electron main process files",
                "directory": os.path.join(self.src_path, "main"),
                "extensions": [".js"],
                "exclude_dirs": ["node_modules", "dist"]
            },
            "renderer_process": {
                "description": "Electron renderer process files",
                "directory": os.path.join(self.src_path, "renderer"),
                "extensions": [".js", ".jsx"],
                "exclude_dirs": ["node_modules", "dist", "__tests__"]
            },
            "config_files": {
                "description": "Configuration files",
                "directory": self.app_path,
                "extensions": [".json", ".config.js", ".env"],
                "exclude_dirs": ["node_modules", "dist"]
            },
            "security_files": {
                "description": "Security-related files",
                "directory": os.path.join(self.src_path, "main", "security"),
                "extensions": [".js"],
                "exclude_dirs": ["node_modules"]
            },
            "test_files": {
                "description": "Test files",
                "directory": self.app_path,
                "extensions": [".test.js", ".spec.js", ".test.jsx"],
                "exclude_dirs": ["node_modules", "dist"]
            }
        }

    def get_file_count_estimate(self, pattern_name: str) -> int:
        """Estimate file count for a given pattern"""
        patterns = self.get_search_patterns()
        if pattern_name not in patterns:
            return 0

        pattern = patterns[pattern_name]
        directory = pattern["directory"]
        extensions = pattern["extensions"]

        if not os.path.exists(directory):
            return 0

        count = 0
        for root, dirs, files in os.walk(directory):
            # Filter out excluded directories
            dirs[:] = [d for d in dirs if d not in pattern.get("exclude_dirs", [])]

            for file in files:
                file_ext = os.path.splitext(file)[1]
                if file_ext in extensions:
                    count += 1

        return count

    def generate_mcp_commands(self) -> List[str]:
        """Generate example MCP commands for common search patterns"""
        commands = []
        patterns = self.get_search_patterns()

        for pattern_name, pattern in patterns.items():
            # Paginated search command
            cmd = f"""paginated-search:
  pattern: "**/*"
  directory: "{pattern['directory']}"
  page: 1
  page_size: 30
  include_extensions: "{','.join(pattern['extensions'])}"
  exclude_dirs: "{','.join(pattern.get('exclude_dirs', []))}"
  # {pattern['description']}"""
            commands.append(cmd)

        return commands

    def get_directory_sizes(self) -> Dict[str, int]:
        """Get file counts for major directories"""
        directories = {
            "Total Project": self.base_path,
            "Justice Companion App": self.app_path,
            "Source Code": self.src_path,
            "Node Modules": os.path.join(self.app_path, "node_modules"),
            "Components": os.path.join(self.src_path, "renderer", "components"),
            "API Services": os.path.join(self.src_path, "main", "api"),
            "Main Process": os.path.join(self.src_path, "main"),
            "Renderer Process": os.path.join(self.src_path, "renderer")
        }

        sizes = {}
        for name, path in directories.items():
            if os.path.exists(path):
                try:
                    count = sum(1 for _ in Path(path).rglob('*') if _.is_file())
                    sizes[name] = count
                except:
                    sizes[name] = 0
            else:
                sizes[name] = 0

        return sizes

    def suggest_search_strategy(self, target_files: int = 50) -> List[str]:
        """Suggest search strategies based on target file count"""
        suggestions = []
        sizes = self.get_directory_sizes()

        if sizes.get("Node Modules", 0) > 10000:
            suggestions.append("CRITICAL: Exclude node_modules directory (contains " +
                             f"{sizes['Node Modules']} files)")

        if sizes.get("Total Project", 0) > 1000:
            suggestions.append("Use subdirectory-specific searches instead of full project search")

        suggestions.extend([
            "Use 'smart-search-js' for JavaScript files only",
            "Use 'justice-companion-quick-search' for project-specific patterns",
            "Use 'search-by-type' for specific file types",
            "Set page_size to 20-50 for manageable results",
            "Use 'directory-overview' for high-level structure"
        ])

        return suggestions

def generate_usage_examples():
    """Generate usage examples for the enhanced MCP server"""
    helper = JusticeCompanionSearchHelper()

    examples = {
        "Basic Pagination": """
# Search with pagination
paginated-search:
  pattern: "**/*"
  directory: "C:\\Users\\sava6\\Desktop\\Justice Companion\\justice-companion-app\\src"
  page: 1
  page_size: 30
  include_extensions: ".js,.jsx,.json"
  exclude_dirs: "node_modules,dist,build"
        """,

        "React Components": """
# Find React components
smart-search-js:
  subdirectory: "src/renderer/components"
  file_types: ".jsx"
  page: 1
        """,

        "API Services": """
# Find API services
justice-companion-quick-search:
  search_type: "api"
  pattern: "*"
  page: 1
        """,

        "Content Search": """
# Search for content in files
find-content-paginated:
  search_text: "OllamaClient"
  directory: "C:\\Users\\sava6\\Desktop\\Justice Companion\\justice-companion-app\\src"
  file_extensions: ".js,.jsx"
  page: 1
  page_size: 20
        """,

        "Directory Overview": """
# Get project structure overview
directory-overview:
  directory: "C:\\Users\\sava6\\Desktop\\Justice Companion\\justice-companion-app\\src"
  max_depth: 3
        """,

        "File Type Search": """
# Search by file type
search-by-type:
  file_type: "jsx"
  directory: "C:\\Users\\sava6\\Desktop\\Justice Companion\\justice-companion-app\\src"
  page: 1
        """
    }

    return examples

def main():
    """Generate and display search optimization report"""
    helper = JusticeCompanionSearchHelper()

    print("=== Justice Companion Filesystem Search Optimization Report ===\n")

    # Directory sizes
    print("Directory File Counts:")
    sizes = helper.get_directory_sizes()
    for name, count in sizes.items():
        print(f"  {name}: {count:,} files")

    print(f"\nTotal estimated tokens for full search: {sizes.get('Total Project', 0) * 3:,}")
    print("Token limit: 25,000")
    print("Recommended approach: Use paginated and filtered searches\n")

    # Search suggestions
    print("Recommended Search Strategies:")
    suggestions = helper.suggest_search_strategy()
    for i, suggestion in enumerate(suggestions, 1):
        print(f"  {i}. {suggestion}")

    print("\n" + "="*60)
    print("Use enhanced_main.py for optimized filesystem operations")
    print("All search functions include automatic pagination and filtering")

if __name__ == "__main__":
    main()