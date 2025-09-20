# GitHub Setup Guide for Justice Companion

## Prerequisites
- GitHub account (create one at https://github.com if needed)
- Git installed on your system (already confirmed)

## Step 1: Create GitHub Repository

1. Go to https://github.com/new
2. Fill in the following:
   - **Repository name:** `justice-companion`
   - **Description:** `Free legal aid assistant - ChatGPT-style interface for those who can't afford justice`
   - **Visibility:** Select **Public** (for open source benefits)
   - **DO NOT** initialize with README, .gitignore, or license (we already have them)
3. Click **Create repository**

## Step 2: Configure Git (if needed)

Set your Git identity (replace with your info):
```bash
git config --global user.name "Your Name"
git config --global user.email "your-email@example.com"
```

## Step 3: Connect and Push to GitHub

After creating the repository on GitHub, run these commands:

```bash
cd "C:\Users\sava6\Desktop\Justice Companion"

# Add GitHub as remote origin (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/justice-companion.git

# Rename branch from master to main (GitHub default)
git branch -M main

# Push all commits to GitHub
git push -u origin main
```

If prompted for authentication, you'll need to use a Personal Access Token (PAT) instead of your password:
1. Go to GitHub Settings → Developer settings → Personal access tokens
2. Generate new token (classic) with `repo` permissions
3. Use this token as your password when pushing

## Step 4: Enable GitHub Pages (Optional - for documentation)

1. Go to your repository on GitHub
2. Click **Settings** → **Pages**
3. Under **Source**, select **Deploy from a branch**
4. Select **main** branch and **/ (root)** folder
5. Click **Save**

## Step 5: Configure Repository Settings

After pushing, configure these settings on GitHub:

### Add Topics
Go to repository main page → Click gear icon next to "About" → Add topics:
- `legal-tech`
- `electron`
- `react`
- `justice`
- `open-source`
- `legal-aid`
- `chatgpt-ui`

### Enable Features
In Settings:
- ✅ Issues
- ✅ Discussions
- ✅ Projects
- ✅ Wiki

### Create Issue Templates
1. Go to **Settings** → **General** → **Features** → **Issues** → **Set up templates**
2. Add templates for:
   - Bug Report
   - Feature Request
   - Legal Content Contribution

## Step 6: Verify CI/CD Pipeline

After pushing:
1. Go to **Actions** tab in your repository
2. You should see the CI/CD workflow running
3. It will test, build, and prepare releases automatically

## Step 7: Create First Release (Optional)

1. Go to **Releases** → **Create a new release**
2. Choose a tag: `v1.0.0`
3. Release title: `Justice Companion v1.0.0 - Initial Release`
4. Describe the release features
5. Click **Publish release**

## Alternative: Using GitHub Desktop

If you prefer a GUI:
1. Download GitHub Desktop: https://desktop.github.com/
2. Sign in with your GitHub account
3. Click **Add** → **Add Existing Repository**
4. Browse to `C:\Users\sava6\Desktop\Justice Companion`
5. Click **Publish repository**
6. Uncheck "Keep this code private"
7. Click **Publish Repository**

## Deployment Options

### Deploy to Vercel (Recommended for web version)
1. Go to https://vercel.com
2. Sign in with GitHub
3. Import your `justice-companion` repository
4. Configure build settings:
   - Build Command: `cd justice-companion-app && npm run build`
   - Output Directory: `justice-companion-app/dist`
5. Deploy

### Deploy to Netlify (Alternative)
1. Go to https://netlify.com
2. Sign in with GitHub
3. New site from Git → Select repository
4. Build settings:
   - Build command: `cd justice-companion-app && npm run build`
   - Publish directory: `justice-companion-app/dist`
5. Deploy

## Troubleshooting

### Authentication Failed
- Make sure you're using a Personal Access Token, not your password
- Ensure the token has `repo` permissions

### Push Rejected
- Pull first: `git pull origin main --rebase`
- Then push: `git push origin main`

### Large File Errors
- Ensure OllamaSetup.exe is not being tracked
- Check .gitignore is working: `git status`

## Next Steps

Once pushed to GitHub:
- ⭐ Star your repository
- 📢 Share with the community
- 🤝 Invite collaborators
- 📚 Add more documentation to Wiki
- 🎯 Create project milestones

## Support

If you encounter issues:
1. Check existing issues on GitHub
2. Create a new issue with details
3. Join the discussions section

---

*Remember: This tool helps provide justice for those who cannot afford it. Every successful setup helps someone in need.*