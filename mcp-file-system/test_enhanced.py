#!/usr/bin/env python3
"""
Test script for enhanced filesystem search functions
"""

import sys
import os

# Add the current directory to the path to import the enhanced functions
sys.path.insert(0, os.path.dirname(__file__))

# Import the enhanced functions directly for testing
def test_paginated_search():
    """Test the paginated search function"""
    import enhanced_main

    print("Testing paginated search...")

    # Test 1: Search for React components
    result = enhanced_main.paginated_search(
        pattern="**/*",
        directory="C:\\Users\\sava6\\Desktop\\Justice Companion\\justice-companion-app\\src\\renderer\\components",
        page=1,
        page_size=10,
        include_extensions=".jsx,.js",
        exclude_dirs="node_modules,__tests__"
    )
    print("React Components Search:")
    print(result[:500] + "..." if len(result) > 500 else result)
    print("\n" + "="*50 + "\n")

    # Test 2: Search for API files
    result = enhanced_main.smart_search_js(
        subdirectory="src/main/api",
        file_types=".js",
        page=1
    )
    print("API Files Search:")
    print(result[:500] + "..." if len(result) > 500 else result)
    print("\n" + "="*50 + "\n")

    # Test 3: Directory overview
    result = enhanced_main.directory_overview(
        directory="C:\\Users\\sava6\\Desktop\\Justice Companion\\justice-companion-app\\src",
        max_depth=2
    )
    print("Directory Overview:")
    print(result[:500] + "..." if len(result) > 500 else result)
    print("\n" + "="*50 + "\n")

def test_justice_companion_search():
    """Test Justice Companion specific search"""
    import enhanced_main

    print("Testing Justice Companion quick search...")

    result = enhanced_main.justice_companion_quick_search(
        search_type="components",
        pattern="*",
        page=1
    )
    print("Components Quick Search:")
    print(result[:500] + "..." if len(result) > 500 else result)
    print("\n" + "="*50 + "\n")

def test_directory_listing():
    """Test enhanced directory listing"""
    import enhanced_main

    print("Testing enhanced directory listing...")

    result = enhanced_main.list_directory(
        dir_path="C:\\Users\\sava6\\Desktop\\Justice Companion\\justice-companion-app\\src",
        show_hidden=False,
        max_items=20
    )
    print("Enhanced Directory Listing:")
    print(result)
    print("\n" + "="*50 + "\n")

if __name__ == "__main__":
    print("=== Testing Enhanced MCP Filesystem Functions ===\n")

    try:
        test_paginated_search()
        test_justice_companion_search()
        test_directory_listing()
        print("All tests completed successfully!")
    except Exception as e:
        print(f"Error during testing: {str(e)}")
        import traceback
        traceback.print_exc()