#!/usr/bin/env node

/**
 * Justice Companion File Watcher
 * Comprehensive project monitoring for David vs Goliath development
 * Tracks all file changes, Git operations, and development activities
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

class JusticeCompanionWatcher {
  constructor(projectRoot = process.cwd()) {
    this.projectRoot = projectRoot;
    this.watchers = new Map();
    this.activityLog = [];
    this.isActive = false;
    
    console.log('⚖️ Justice Companion File Watcher - Initializing...');
    console.log(`📁 Project Root: ${this.projectRoot}`);
  }

  async start() {
    if (this.isActive) {
      console.log('📋 Watcher already active');
      return;
    }

    this.isActive = true;
    console.log('🚀 Starting comprehensive file monitoring...');
    
    // Watch key directories
    const watchPaths = [
      'src',
      'public', 
      'package.json',
      'vite.config.js',
      'README.md',
      '.env*',
      '*.js',
      '*.jsx',
      '*.css',
      '*.md'
    ];

    for (const watchPath of watchPaths) {
      this.watchPath(watchPath);
    }

    // Monitor Git operations
    this.watchGitOperations();
    
    // Start activity logger
    this.startActivityLogger();
    
    console.log('✅ Justice Companion File Watcher - ACTIVE');
    console.log('📊 Monitoring for David vs Goliath development activities...');
  }

  watchPath(relativePath) {
    const fullPath = path.join(this.projectRoot, relativePath);
    
    try {
      if (fs.existsSync(fullPath)) {
        const watcher = fs.watch(fullPath, { recursive: true }, (eventType, filename) => {
          this.handleFileChange(eventType, filename, relativePath);
        });
        
        this.watchers.set(relativePath, watcher);
        console.log(`👁️ Watching: ${relativePath}`);
      }
    } catch (error) {
      console.error(`❌ Error watching ${relativePath}:`, error.message);
    }
  }

  handleFileChange(eventType, filename, basePath) {
    const timestamp = new Date().toISOString();
    const fullPath = path.join(basePath, filename || '');
    
    const activity = {
      timestamp,
      eventType,
      file: fullPath,
      action: eventType === 'rename' ? 'FILE_RENAMED' : 'FILE_MODIFIED'
    };

    this.logActivity(activity);
    
    // Legal component monitoring
    if (filename?.includes('Legal') || filename?.includes('Justice')) {
      console.log(`⚖️ LEGAL COMPONENT CHANGE: ${fullPath}`);
    }
    
    // Critical file monitoring
    if (filename?.includes('package.json') || filename?.includes('vite.config')) {
      console.log(`🔧 CRITICAL CONFIG CHANGE: ${fullPath}`);
    }
    
    // React component monitoring
    if (filename?.endsWith('.jsx') || filename?.endsWith('.js')) {
      console.log(`⚛️ COMPONENT CHANGE: ${fullPath}`);
    }
    
    // CSS styling monitoring
    if (filename?.endsWith('.css')) {
      console.log(`🎨 STYLE CHANGE: ${fullPath}`);
    }
  }

  watchGitOperations() {
    const gitDir = path.join(this.projectRoot, '.git');
    
    if (fs.existsSync(gitDir)) {
      const gitWatcher = fs.watch(gitDir, { recursive: true }, (eventType, filename) => {
        if (filename?.includes('HEAD') || filename?.includes('index')) {
          const activity = {
            timestamp: new Date().toISOString(),
            eventType: 'git',
            file: filename,
            action: 'GIT_OPERATION'
          };
          
          this.logActivity(activity);
          console.log(`📝 GIT OPERATION DETECTED: ${filename}`);
          
          // Get current git status
          this.getGitStatus();
        }
      });
      
      this.watchers.set('.git', gitWatcher);
      console.log('📝 Git operations monitoring active');
    }
  }

  getGitStatus() {
    const git = spawn('git', ['status', '--porcelain'], { cwd: this.projectRoot });
    
    git.stdout.on('data', (data) => {
      const status = data.toString().trim();
      if (status) {
        console.log('📋 Git Status Changes:');
        console.log(status);
        
        this.logActivity({
          timestamp: new Date().toISOString(),
          eventType: 'git-status',
          action: 'GIT_STATUS_UPDATE',
          details: status
        });
      }
    });
  }

  logActivity(activity) {
    this.activityLog.push(activity);
    
    // Keep only last 1000 activities
    if (this.activityLog.length > 1000) {
      this.activityLog = this.activityLog.slice(-1000);
    }
    
    // Save to activity log file
    this.saveActivityLog();
  }

  saveActivityLog() {
    const logFile = path.join(this.projectRoot, 'justice-companion-activity.log');
    const logData = this.activityLog
      .slice(-10) // Last 10 activities
      .map(activity => `[${activity.timestamp}] ${activity.action}: ${activity.file || activity.details || 'N/A'}`)
      .join('\n');
    
    fs.writeFileSync(logFile, logData + '\n', { flag: 'w' });
  }

  startActivityLogger() {
    setInterval(() => {
      if (this.activityLog.length > 0) {
        const recentActivity = this.activityLog.slice(-5);
        console.log(`📊 Justice Companion Activity (${recentActivity.length} recent):`);
        recentActivity.forEach(activity => {
          console.log(`   ${activity.timestamp.slice(11, 19)} - ${activity.action}: ${activity.file || 'N/A'}`);
        });
      }
    }, 30000); // Every 30 seconds
  }

  getActivitySummary() {
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);
    
    const recentActivities = this.activityLog.filter(
      activity => new Date(activity.timestamp).getTime() > oneHourAgo
    );

    return {
      totalActivities: this.activityLog.length,
      recentActivities: recentActivities.length,
      fileChanges: recentActivities.filter(a => a.action.includes('FILE')).length,
      gitOperations: recentActivities.filter(a => a.action.includes('GIT')).length
    };
  }

  stop() {
    console.log('🛑 Stopping Justice Companion File Watcher...');
    
    for (const [path, watcher] of this.watchers) {
      watcher.close();
      console.log(`❌ Stopped watching: ${path}`);
    }
    
    this.watchers.clear();
    this.isActive = false;
    
    console.log('✅ Justice Companion File Watcher - STOPPED');
  }
}

// CLI Usage
if (require.main === module) {
  const watcher = new JusticeCompanionWatcher();
  
  watcher.start().catch(console.error);
  
  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Received shutdown signal...');
    watcher.stop();
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    watcher.stop();
    process.exit(0);
  });
}

module.exports = JusticeCompanionWatcher;