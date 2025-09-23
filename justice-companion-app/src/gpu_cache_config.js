// =====================
// GPU CACHE FIX CONFIGURATION  
// =====================

// Configure Electron app for optimal cache management and GPU stability
app.commandLine.appendSwitch('--disable-gpu-sandbox');
app.commandLine.appendSwitch('--disable-software-rasterizer'); 
app.commandLine.appendSwitch('--disable-gpu-process-crash-limit');
app.commandLine.appendSwitch('--disable-background-timer-throttling');
app.commandLine.appendSwitch('--disable-backgrounding-occluded-windows');
app.commandLine.appendSwitch('--disable-renderer-backgrounding');

// Fix cache directory permission issues
const userDataPath = app.getPath('userData');
const cacheDirectory = path.join(userDataPath, 'Cache');
const gpuCacheDirectory = path.join(userDataPath, 'GPUCache');

// Ensure cache directories exist with proper permissions
function initializeCacheDirectories() {
  try {
    if (!fs.existsSync(cacheDirectory)) {
      fs.mkdirSync(cacheDirectory, { recursive: true, mode: 0o755 });
      console.log('✅ Cache directory created:', cacheDirectory);
    }
    
    if (!fs.existsSync(gpuCacheDirectory)) {
      fs.mkdirSync(gpuCacheDirectory, { recursive: true, mode: 0o755 });
      console.log('✅ GPU cache directory created:', gpuCacheDirectory);
    }

    if (process.platform === 'win32') {
      try {
        const stats = fs.statSync(cacheDirectory);
        console.log('📁 Cache directory permissions verified');
      } catch (permError) {
        console.warn('⚠️ Cache permission check failed:', permError.message);
      }
    }
  } catch (error) {
    console.error('❌ Cache directory initialization error:', error.message);
  }
}

