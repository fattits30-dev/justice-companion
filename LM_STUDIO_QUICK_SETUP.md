# LM Studio Quick Setup for RX 6600XT

## Step 1: Download a Model
1. In LM Studio, go to "Search" tab
2. Search for "mistral 7b instruct"
3. Download "mistral-7b-instruct-v0.1.Q4_0.gguf" (about 4GB)
   - Perfect size for your 8GB VRAM
   - High quality with Q4 quantization

## Step 2: Configure GPU Settings
1. Go to Settings (gear icon)
2. Under "Inference":
   - GPU Acceleration: ON
   - GPU Layers: Max (or 35)
   - Backend: Vulkan (best for AMD)
3. Your RX 6600XT should be automatically detected

## Step 3: Start Local Server
1. Go to "Local Server" tab
2. Load the downloaded Mistral model
3. Click "Start Server"
4. Should show: "Server running on http://localhost:1234"

## Step 4: Test Performance
Once server is running, test Justice Companion:
- Responses should be 2-5 seconds instead of 30+ seconds
- GPU usage should be visible in Task Manager
- Much better than Ollama CPU mode!

## Expected Performance on RX 6600XT:
- **Mistral 7B Q4**: 25-35 tokens/second
- **GPU Memory**: ~4GB usage
- **Response Time**: 2-5 seconds for typical legal queries

---

**Justice Companion is already configured to use LM Studio API on port 1234!**