# Automatic Deployment Guide

This project is set up to automatically deploy to GitHub Pages whenever code is pushed. Follow these steps to enable automatic deployment.

## Prerequisites

✅ Already configured:
- GitHub Actions workflow (`.github/workflows/deploy.yml`)
- Repository remote set to GitHub

## Setup Instructions

### 1. Enable GitHub Pages

1. Go to your repository: https://github.com/nuts-and-bytes/daily-tree
2. Click **Settings** → **Pages**
3. Under "Build and deployment":
   - **Source**: Select "GitHub Actions"
   - Click **Save**

GitHub Actions will now automatically build and deploy your site.

### 2. Verify Workflow Configuration

The deployment workflow is already configured in `.github/workflows/deploy.yml` and will:

- Trigger on every push to `main` or `feature/**` branches
- Run syntax validation (HTML/CSS/JS)
- Check project file structure
- Upload artifact to GitHub Pages
- Deploy within 1-2 minutes

### 3. Monitor Deployment Status

After pushing code:

1. Go to your repository
2. Click **Actions** tab
3. See "Deploy to GitHub Pages" workflow running
4. Once green ✅, your changes are live at:
   - App: https://nuts-and-bytes.github.io/daily-tree/app/
   - Landing: https://nuts-and-bytes.github.io/daily-tree/

## Development Workflow

### Making Changes

```bash
# Create feature branch
git checkout -b feature/your-feature

# Make changes...
git add .
git commit -m "feat: your feature description"

# Push to GitHub
git push origin feature/your-feature
```

The workflow will:
- Automatically run validation
- Deploy a preview of your branch
- Show status in pull request

### Merging to Main

```bash
# Create pull request on GitHub
# Once approved, merge to main

git checkout main
git pull origin main

# Changes automatically deploy to production
```

## Troubleshooting

### Workflow Not Running?

1. Check **Settings** → **Actions** → General
   - Ensure "All actions and reusable workflows" is selected
   - Click **Save**

2. Go to **Actions** tab and check for errors

### Deploy Failed?

Common issues and fixes:

**Issue**: "File not found" error
- Ensure all files are committed: `git status`
- Check file paths match (case-sensitive on GitHub)

**Issue**: "Invalid HTML/CSS syntax"
- Run locally: `node -c app/app.js`
- Fix syntax errors before pushing

**Issue**: Page not updating after push
- Wait 2-3 minutes for deployment
- Hard refresh browser (Ctrl+Shift+R or Cmd+Shift+R)
- Clear browser cache if needed

### Manual Deployment (Backup)

If auto-deployment fails, you can manually deploy:

```bash
# Push to GitHub (triggers workflow)
git push origin feature/redesign-phase1

# Or if using GitHub CLI:
gh workflow run deploy.yml --ref feature/redesign-phase1
```

## Environment Secrets (Optional)

Currently, no secrets are required. If you add features requiring API keys:

1. Go to **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Add secret name and value
4. Reference in workflow: `${{ secrets.SECRET_NAME }}`

Example:
```yaml
- name: Deploy with API key
  env:
    API_KEY: ${{ secrets.API_KEY }}
  run: ./deploy.sh
```

## Deployment Architecture

```
┌─ You push to GitHub
│
├─ GitHub Actions triggers workflow
│  ├─ Checkout code
│  ├─ Validate syntax
│  ├─ Check structure
│  ├─ Build artifact
│  └─ Deploy to Pages
│
└─ Live at GitHub Pages CDN
```

## Branch Deployment Strategy

| Branch | Deploy To | Purpose |
|--------|-----------|---------|
| `main` | Production | Stable releases |
| `feature/**` | Preview | Work in progress |
| Any other | None | Feature branches |

## Performance

- **Deployment time**: 1-2 minutes
- **Updates**: Real-time (no caching on main page)
- **Cache busting**: Automatic via GitHub Pages headers
- **Uptime**: 99.9% (GitHub infrastructure)

## Monitoring

### Check Deployment Status

```bash
# View recent deployments
gh deployment list --repo=nuts-and-bytes/daily-tree

# View workflow runs
gh run list --repo=nuts-and-bytes/daily-tree
```

### Receive Notifications

1. GitHub Settings → Notifications
2. Enable "Actions": "All notifications"
3. Get alerts on deployment success/failure

## Best Practices

✅ **Do:**
- Commit and push frequently
- Use descriptive commit messages
- Create feature branches for new work
- Test locally before pushing
- Use pull requests for code review

❌ **Don't:**
- Force push to main: `git push --force origin main`
- Commit large binary files (images, videos)
- Commit secrets or API keys
- Deploy directly without testing

## Security Considerations

- No build secrets exposed in logs
- API keys use GitHub Secrets (not in repo)
- Static site (no backend vulnerabilities)
- Content Security Policy enabled
- All traffic via HTTPS

## Rollback Instructions

If deployment breaks production:

```bash
# Find the last good commit
git log --oneline

# Revert to last working version
git revert HEAD
git push origin main

# Or reset to previous commit (force)
git reset --hard <commit-hash>
git push origin main --force
```

## Future Improvements

Potential enhancements:
- [ ] Slack notifications on deployment
- [ ] Staging environment (separate branch)
- [ ] Performance monitoring
- [ ] Build optimization (minification)
- [ ] Automatic testing on push
- [ ] Deployment status badge in README

---

**Questions?** Check GitHub Actions logs or create an issue.

**Last updated**: 2026-05-17
