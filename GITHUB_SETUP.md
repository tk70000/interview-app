# GitHub App Installation Guide

This guide will help you set up GitHub integration for the Interview App.

## Prerequisites

- GitHub account
- Admin access to your repository
- Local development environment set up

## Step 1: Create GitHub OAuth App

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click "New OAuth App"
3. Fill in the application details:
   - **Application name**: Interview App (or your preferred name)
   - **Homepage URL**: 
     - Development: `http://localhost:3000`
     - Production: Your deployed app URL
   - **Authorization callback URL**: 
     - Development: `http://localhost:3000/api/auth/github/callback`
     - Production: `https://your-app-domain.com/api/auth/github/callback`
   - **Description**: AI-powered career consultation platform with GitHub integration
4. Click "Register application"
5. Note down your **Client ID**
6. Generate a new **Client Secret** and save it securely

## Step 2: Configure Environment Variables

Add the following to your `.env.local` file:

```env
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

For production, update `NEXT_PUBLIC_APP_URL` to your actual domain.

## Step 3: Run Database Migrations

Execute the GitHub integration migration:

```bash
# Using Supabase CLI
supabase db push

# Or manually in Supabase SQL Editor
# Copy contents of supabase/migrations/005_add_github_integration.sql
```

## Step 4: Set Up GitHub Actions Secrets

For CI/CD to work properly, add these secrets to your GitHub repository:

1. Go to your repository's Settings → Secrets and variables → Actions
2. Add the following secrets:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `OPENAI_API_KEY`
   - `GITHUB_CLIENT_ID`
   - `GITHUB_CLIENT_SECRET`
   - `NEXT_PUBLIC_APP_URL`
   
3. For deployment (if using Vercel):
   - `VERCEL_TOKEN`
   - `VERCEL_ORG_ID`
   - `VERCEL_PROJECT_ID`
   - `SUPABASE_DB_URL`
   - `SUPABASE_ACCESS_TOKEN`
   - `SUPABASE_PROJECT_ID`

4. Optional (for notifications):
   - `SLACK_WEBHOOK`

## Step 5: Test GitHub Integration

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Navigate to `/dashboard` (you need to be logged in)

3. Look for the GitHub connection option

4. Click "Connect GitHub" to authorize the app

5. You should be redirected back with access to:
   - Your repositories
   - Ability to create issues
   - Workflow monitoring

## Available Features

### Repository Integration
- View all your GitHub repositories
- Filter by language, visibility, and activity
- Direct links to repository pages

### GitHub Actions Integration
- Monitor workflow runs
- Trigger manual workflow dispatches
- View workflow status and history

### Issue & PR Creation
- Create issues based on interview feedback
- Generate pull requests for code improvements
- Link conversations to GitHub activity

## API Endpoints

- `GET /api/auth/github` - Initiate GitHub OAuth flow
- `GET /api/auth/github/callback` - OAuth callback handler
- `GET /api/v1/github/repositories` - List user repositories
- `GET /api/v1/github/workflows?owner=x&repo=y` - Get workflow runs
- `POST /api/v1/github/workflows` - Trigger workflow

## Troubleshooting

### "GitHub not connected" error
- Ensure you've completed the OAuth flow
- Check that tokens are properly stored in the database
- Verify environment variables are set correctly

### Workflow triggers not working
- Ensure the GitHub token has `workflow` scope
- Check that workflows have `workflow_dispatch` trigger
- Verify the user has write access to the repository

### OAuth redirect issues
- Double-check callback URLs match exactly
- Ensure `NEXT_PUBLIC_APP_URL` is set correctly
- Check for any URL encoding issues

## Security Best Practices

1. **Never commit secrets** - Always use environment variables
2. **Rotate tokens regularly** - Update GitHub tokens periodically
3. **Limit scopes** - Only request necessary permissions
4. **Use HTTPS in production** - Ensure all callbacks use secure URLs
5. **Validate state parameter** - Prevent CSRF attacks in OAuth flow

## Next Steps

1. Test the integration thoroughly
2. Set up monitoring for GitHub API rate limits
3. Configure webhook handlers for real-time updates
4. Implement additional features based on your needs

For more information, refer to:
- [GitHub OAuth Apps Documentation](https://docs.github.com/en/developers/apps/building-oauth-apps)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Octokit.js Documentation](https://octokit.github.io/rest.js)