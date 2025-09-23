# LM Studio - Quick Steps to Get Running NOW!

## YOU NEED TO DO THESE 3 SIMPLE STEPS IN LM STUDIO:

### Step 1: Download Model (2 minutes)
1. Click the **"Search"** tab on the left (magnifying glass icon)
2. Search for: **"mistral instruct"**
3. Look for: **"TheBloke/Mistral-7B-Instruct-v0.1-GGUF"**
4. Click the green **Download** button next to: **"mistral-7b-instruct-v0.1.Q4_K_M.gguf"** (4.37 GB)
   - This is the best model for your RX 6600XT
   - It will download quickly (2-3 minutes)

### Step 2: Load the Model (10 seconds)
1. Once download completes, go to **"Local Server"** tab (server icon on left)
2. At the top, you'll see a dropdown that says "Select a model"
3. Select the model you just downloaded: **"mistral-7b-instruct-v0.1.Q4_K_M.gguf"**
4. The model will load automatically

### Step 3: Start the Server (1 click)
1. Still in the "Local Server" tab
2. Click the big green **"Start Server"** button
3. You should see: **"Server running on http://localhost:1234"**

## THAT'S IT!

### Test it works:
Once server is running, refresh your Justice Companion app page and try the chat.
- Responses should be 2-5 seconds instead of 30+ seconds
- Your GPU is finally being used!

## Settings to Check (already optimal for AMD):
- **GPU Acceleration:** ON
- **GPU Layers:** Max (or 35)
- **Backend:** Vulkan (best for AMD RX 6600XT)

---

**Justice Companion is already configured to use port 1234!**
Just need to start the LM Studio server and you're done!