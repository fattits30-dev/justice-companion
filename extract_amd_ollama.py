#!/usr/bin/env python3
"""Extract AMD Ollama .7z files"""
import py7zr
import os
import shutil
from pathlib import Path

# Define paths
downloads_dir = Path("C:/Users/sava6/Downloads")
desktop_dir = Path("C:/Users/sava6/Desktop/Justice Companion")
ollama_7z = downloads_dir / "ollam-windows-amd64.7z"
rocm_7z = downloads_dir / "rocm.gfx1032.for.hip.6.4.2.7z"

# Create extraction directories
ollama_extract_dir = desktop_dir / "amd-ollama-extracted"
rocm_extract_dir = desktop_dir / "rocm-extracted"

print("=== Extracting AMD Ollama Files ===\n")

# Extract Ollama
if ollama_7z.exists():
    print(f"Extracting {ollama_7z.name}...")
    ollama_extract_dir.mkdir(exist_ok=True)
    with py7zr.SevenZipFile(str(ollama_7z), mode='r') as z:
        z.extractall(path=str(ollama_extract_dir))
    print(f"[OK] Extracted to: {ollama_extract_dir}")
else:
    print(f"[ERROR] File not found: {ollama_7z}")

# Extract ROCm
if rocm_7z.exists():
    print(f"\nExtracting {rocm_7z.name}...")
    rocm_extract_dir.mkdir(exist_ok=True)
    with py7zr.SevenZipFile(str(rocm_7z), mode='r') as z:
        z.extractall(path=str(rocm_extract_dir))
    print(f"[OK] Extracted to: {rocm_extract_dir}")
else:
    print(f"[ERROR] File not found: {rocm_7z}")

print("\n=== Extraction Complete ===")

# List extracted contents
print("\nOllama extracted files:")
if ollama_extract_dir.exists():
    for item in list(ollama_extract_dir.iterdir())[:10]:
        print(f"  - {item.name}")
    if len(list(ollama_extract_dir.iterdir())) > 10:
        print(f"  ... and {len(list(ollama_extract_dir.iterdir())) - 10} more files")

print("\nROCm extracted files:")
if rocm_extract_dir.exists():
    for item in list(rocm_extract_dir.iterdir())[:10]:
        print(f"  - {item.name}")
    if len(list(rocm_extract_dir.iterdir())) > 10:
        print(f"  ... and {len(list(rocm_extract_dir.iterdir())) - 10} more files")