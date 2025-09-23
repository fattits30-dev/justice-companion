# LM Studio Setup for RX 6600XT

## Quick Setup Guide

### 1. Download LM Studio
- Go to: https://lmstudio.ai/
- Download the Windows installer
- Install it (very straightforward)

### 2. Configure for AMD GPU
When you first launch LM Studio:
1. It will auto-detect your RX 6600XT
2. Go to Settings (gear icon)
3. Under "Inference Settings":
   - Select "Vulkan" as the backend (best for AMD)
   - GPU Layers: Set to "Max" or 35
   - Your RX 6600XT will be automatically selected

### 3. Download Models
In LM Studio's model browser:
- Search for "Mistral 7B Instruct Q4"
- Or "Llama 3.2 3B" (very fast)
- Click download - it handles everything

### 4. Enable API Server
1. Go to "Local Server" tab
2. Start the server
3. It runs on `http://localhost:1234` by default
4. Has Ollama-compatible endpoints!

### 5. Update Justice Companion
Change the Ollama base URL in your app:

```javascript
// In OllamaClient.js
this.baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:1234/v1';
```

---

## Why LM Studio is Better than Ollama for AMD:

✅ **Vulkan Support** - Works on ALL AMD GPUs
✅ **No ROCm needed** - Uses standard AMD drivers
✅ **Faster inference** - Better optimized for consumer GPUs
✅ **Model management** - Download/delete models with one click
✅ **Real GPU usage** - You'll see actual GPU utilization
✅ **Better UI** - See tokens/second, GPU usage, etc.

---

## Alternative: KoboldCpp (Maximum Performance)

If you want the absolute fastest speeds:

```bash
# Download latest KoboldCpp
# Run with:
koboldcpp.exe --model mistral-7b-q4.gguf --useclblast 0 0 --gpulayers 35

# Or with Vulkan:
koboldcpp.exe --model mistral-7b-q4.gguf --usevulkan --gpulayers 35
```

KoboldCpp with CLBlast/Vulkan gives the best performance on AMD cards.

---

## Performance You Can Expect:

With LM Studio or KoboldCpp on your RX 6600XT:
- **Mistral 7B Q4**: 30-40 tokens/second
- **Llama 3.2 3B**: 60-80 tokens/second
- **Phi-3 Mini**: 80-100 tokens/second

Compare to Ollama on CPU: 2-5 tokens/second 😱

---

## Which One to Choose?

### For Justice Companion:
**LM Studio** - Easy setup, API compatible, just works

### For maximum speed:
**KoboldCpp** - Fastest inference on AMD

### For experimentation:
**Text-generation-webui** - Most features and model support

All of these actually USE your GPU, unlike Ollama which is struggling with AMD support!