import { Octokit } from '@octokit/rest';
import { OAuthApp } from '@octokit/oauth-app';

let githubOAuthApp: OAuthApp | null = null;

function getGithubOAuthApp() {
  if (!githubOAuthApp) {
    const clientId = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;
    
    if (!clientId || !clientSecret) {
      // テスト環境ではダミー値を使用
      if (process.env.NODE_ENV === 'test' || process.env.CI === 'true') {
        githubOAuthApp = new OAuthApp({
          clientType: 'oauth-app',
          clientId: 'dummy-client-id',
          clientSecret: 'dummy-client-secret',
        });
        return githubOAuthApp;
      }
      throw new Error('GitHub OAuth credentials are not configured');
    }
    
    githubOAuthApp = new OAuthApp({
      clientType: 'oauth-app',
      clientId,
      clientSecret,
    });
  }
  return githubOAuthApp;
}

export async function exchangeCodeForToken(code: string) {
  try {
    const app = getGithubOAuthApp();
    const { authentication } = await app.createToken({
      code,
    });
    return authentication;
  } catch (error) {
    console.error('Error exchanging code for token:', error);
    throw error;
  }
}

export function createOctokitClient(token: string) {
  return new Octokit({
    auth: token,
  });
}

export async function getUserRepositories(token: string) {
  const octokit = createOctokitClient(token);
  
  try {
    const { data } = await octokit.repos.listForAuthenticatedUser({
      sort: 'updated',
      per_page: 100,
    });
    return data;
  } catch (error) {
    console.error('Error fetching repositories:', error);
    throw error;
  }
}

export async function getRepository(token: string, owner: string, repo: string) {
  const octokit = createOctokitClient(token);
  
  try {
    const { data } = await octokit.repos.get({
      owner,
      repo,
    });
    return data;
  } catch (error) {
    console.error('Error fetching repository:', error);
    throw error;
  }
}

export async function createIssue(
  token: string,
  owner: string,
  repo: string,
  title: string,
  body: string,
  labels?: string[]
) {
  const octokit = createOctokitClient(token);
  
  try {
    const { data } = await octokit.issues.create({
      owner,
      repo,
      title,
      body,
      labels,
    });
    return data;
  } catch (error) {
    console.error('Error creating issue:', error);
    throw error;
  }
}

export async function createPullRequest(
  token: string,
  owner: string,
  repo: string,
  title: string,
  body: string,
  head: string,
  base: string
) {
  const octokit = createOctokitClient(token);
  
  try {
    const { data } = await octokit.pulls.create({
      owner,
      repo,
      title,
      body,
      head,
      base,
    });
    return data;
  } catch (error) {
    console.error('Error creating pull request:', error);
    throw error;
  }
}

export async function getWorkflowRuns(
  token: string,
  owner: string,
  repo: string,
  workflowId?: string | number
) {
  const octokit = createOctokitClient(token);
  
  try {
    const params: any = {
      owner,
      repo,
      per_page: 30,
    };
    
    if (workflowId) {
      params.workflow_id = workflowId;
    }
    
    const { data } = await octokit.actions.listWorkflowRunsForRepo(params);
    return data;
  } catch (error) {
    console.error('Error fetching workflow runs:', error);
    throw error;
  }
}

export async function triggerWorkflow(
  token: string,
  owner: string,
  repo: string,
  workflowId: string | number,
  ref: string,
  inputs?: Record<string, any>
) {
  const octokit = createOctokitClient(token);
  
  try {
    await octokit.actions.createWorkflowDispatch({
      owner,
      repo,
      workflow_id: workflowId,
      ref,
      inputs,
    });
    return { success: true };
  } catch (error) {
    console.error('Error triggering workflow:', error);
    throw error;
  }
}