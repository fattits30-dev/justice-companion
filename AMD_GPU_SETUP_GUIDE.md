# AMD RX 6600XT GPU Setup for Ollama
## Quick Setup Guide

I've opened the necessary download pages in your browser. Follow these steps:

---

## ✅ Step 1: Browser Pages Opened
I've opened two browser tabs for you:
1. **AMD Ollama Fork** - Download page for GPU-optimized Ollama
2. **ROCm Libraries** - Required libraries for your RX 6600XT

---

## 📥 Step 2: Download Files

### From the AMD Ollama page:
1. Download **OllamaSetup.exe** (latest version)
2. Save it to your Desktop

### From the ROCm Libraries page:
1. Look for a file that includes **gfx1032** in the name
2. Or download: `rocblas_v6.1.2_gfx1030_1031_1032_1034_1035_1036_1100_1101_1102_1103.zip`
3. This supports your GPU architecture (gfx1032)

---

## 🔧 Step 3: Installation Process

### A. Uninstall Current Ollama:
1. Open Control Panel → Programs → Uninstall a program
2. Find "Ollama" and uninstall it
3. Or run in PowerShell: `winget uninstall Ollama.Ollama`

### B. Install AMD Ollama:
1. Run the downloaded **OllamaSetup.exe**
2. Complete the installation

### C. Replace ROCm Libraries:
1. Extract the downloaded ROCm zip file
2. Navigate to Ollama installation folder:
   - Usually: `C:\Users\[YourName]\AppData\Local\Programs\Ollama`
   - Or: `C:\Program Files\Ollama`
3. **Backup** the original `rocblas.dll` file
4. Copy all files from the extracted ROCm folder to the Ollama folder
5. Replace when prompted

---

## 🚀 Step 4: Test GPU Acceleration

Open Command Prompt or PowerShell and run:

```powershell
# Start Ollama service
ollama serve

# In a new terminal, pull a fast model
ollama pull phi3:mini

# Test it
ollama run phi3:mini "Hello, test GPU acceleration"

# Check if using GPU
ollama ps
```

You should see GPU usage instead of 100% CPU!

---

## ⚡ Step 5: Performance Models for 6600XT

Your RX 6600XT has 8GB VRAM. Best models for your GPU:

### Fast (Instant responses):
- `phi3:mini` (2.3GB) - Microsoft's fast model
- `gemma:2b` (1.4GB) - Google's efficient model
- `qwen:1.8b` (1.1GB) - Alibaba's quick model

### Balanced (Good quality, reasonable speed):
- `mistral:7b-instruct-q4_0` (4.1GB) - Great for legal text
- `llama3.2:3b` (2GB) - Latest Meta model
- `deepseek-coder:1.3b` (776MB) - For code

### To install a model:
```bash
ollama pull phi3:mini
ollama pull mistral:7b-instruct-q4_0
```

---

## 🔄 Step 6: Update Justice Companion App

Once Ollama is working with GPU, update the app to use a faster model:

1. Edit: `justice-companion-app\src\renderer\lib\OllamaClient.js`
2. Change the model from `llama3.1:8b` to `phi3:mini` or `mistral:7b-instruct-q4_0`

---

## ⚠️ Important Notes

1. **NEVER** update Ollama through the app's update button
2. Always download updates from the AMD fork GitHub page
3. Your 6600XT will give you **10-20x speed improvement** over CPU
4. Expected response time: **2-5 seconds** instead of 30+ seconds

---

## 🎯 Verification

After setup, run `ollama ps` and you should see:
```
NAME           SIZE    PROCESSOR
phi3:mini      2.3GB   AMD GPU
```

Instead of:
```
NAME           SIZE    PROCESSOR
llama3.1:8b    5.6GB   100% CPU
```

---

## Need Help?

If Ollama still shows CPU usage:
1. Make sure you replaced the rocblas.dll file
2. Restart your computer
3. Check that the ROCm libraries match gfx1032 architecture

The community fork specifically supports your RX 6600XT!