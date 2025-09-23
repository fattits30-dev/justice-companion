# Install AMD Ollama - Step by Step Guide

## Files You Have Downloaded:
✅ `ollam-windows-amd64.7z` - AMD-optimized Ollama
✅ `rocm.gfx1032.for.hip.6.4.2.7z` - ROCm libraries for your RX 6600XT

---

## Step 1: Extract the Files

### Option A: Using 7-Zip (if installed)
1. Right-click on `ollam-windows-amd64.7z` in Downloads
2. Select "7-Zip" → "Extract to ollam-windows-amd64\"
3. Right-click on `rocm.gfx1032.for.hip.6.4.2.7z`
4. Select "7-Zip" → "Extract to rocm.gfx1032.for.hip.6.4.2\"

### Option B: Using WinRAR (if installed)
1. Right-click on each .7z file
2. Select "Extract Here" or "Extract to folder"

### Option C: Download 7-Zip (if needed)
- Download from: https://www.7-zip.org/download.html
- Install and then follow Option A

---

## Step 2: Stop and Uninstall Current Ollama

Run in Command Prompt as Administrator:
```cmd
# Stop Ollama
taskkill /F /IM ollama.exe

# Uninstall current Ollama
winget uninstall Ollama.Ollama
```

Or manually:
1. Open Control Panel → Programs → Uninstall a program
2. Find "Ollama" and uninstall it

---

## Step 3: Install AMD Ollama

After extracting `ollam-windows-amd64.7z`:

1. Navigate to the extracted folder
2. You should see `ollama.exe` and other files
3. Copy the entire extracted folder to: `C:\Program Files\Ollama-AMD`
4. Add `C:\Program Files\Ollama-AMD` to your system PATH:
   - Right-click "This PC" → Properties → Advanced system settings
   - Click "Environment Variables"
   - Under System variables, find "Path" and click Edit
   - Add new entry: `C:\Program Files\Ollama-AMD`
   - Click OK

---

## Step 4: Replace ROCm Libraries

After extracting `rocm.gfx1032.for.hip.6.4.2.7z`:

1. Navigate to the extracted ROCm folder
2. You should see files like `rocblas.dll` and possibly a `library` folder
3. Copy ALL .dll files from the ROCm folder
4. Paste them into: `C:\Program Files\Ollama-AMD`
5. Replace files when prompted

---

## Step 5: Start AMD Ollama

Open Command Prompt and run:
```cmd
# Start Ollama service
ollama serve
```

Open another Command Prompt and run:
```cmd
# Pull a fast model
ollama pull phi3:mini

# Test it
ollama run phi3:mini "Hello, test GPU"

# Check if using GPU
ollama ps
```

---

## Step 6: Verify GPU Usage

When you run `ollama ps`, you should see something like:
```
NAME           SIZE    PROCESSOR
phi3:mini      2.3GB   GPU
```

Instead of:
```
NAME           SIZE    PROCESSOR
llama3.1:8b    5.6GB   100% CPU
```

---

## Step 7: Update Justice Companion to Use Fast Model

Edit the file: `justice-companion-app\src\renderer\lib\OllamaClient.js`

Find this line (around line 16):
```javascript
this.defaultModel = 'llama3.1:8b';
```

Change it to:
```javascript
this.defaultModel = 'phi3:mini';
```

Or for better quality:
```javascript
this.defaultModel = 'mistral:7b-instruct-q4_0';
```

---

## Troubleshooting

### If Ollama still shows CPU usage:
1. Make sure you copied ALL the ROCm .dll files
2. Restart your computer
3. Make sure PATH is set correctly
4. Try running as Administrator

### If "ollama" command not found:
1. Make sure you added the folder to PATH
2. Restart Command Prompt after adding to PATH
3. Use full path: `C:\Program Files\Ollama-AMD\ollama.exe serve`

### Best models for your 8GB VRAM:
- `phi3:mini` - Fastest (2.3GB)
- `gemma2:2b` - Very fast (1.6GB)
- `mistral:7b-instruct-q4_0` - Best quality that fits (4.1GB)
- `llama3.2:3b` - Good balance (2GB)

---

## Success Indicators

✅ `ollama ps` shows GPU instead of CPU
✅ Responses in 2-5 seconds instead of 30+ seconds
✅ Justice Companion chat responds quickly
✅ No more "Processing..." for ages

---

## Important!

⚠️ NEVER update Ollama through the app
⚠️ This is a community fork specifically for AMD GPUs
⚠️ Official Ollama doesn't support your GPU properly yet

Your RX 6600XT will now give you 10-20x speed improvement!