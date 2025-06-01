import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { getUserRepositories } from '@/lib/github';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { data: connection, error: connectionError } = await supabase
      .from('github_connections')
      .select('github_token, github_username, scopes')
      .eq('user_id', user.id)
      .single();
    
    if (connectionError || !connection) {
      return NextResponse.json({ 
        error: 'GitHub not connected',
        connect_url: '/api/auth/github'
      }, { status: 404 });
    }
    
    const repositories = await getUserRepositories(connection.github_token);
    
    return NextResponse.json({
      repositories: repositories.map(repo => ({
        id: repo.id,
        name: repo.name,
        full_name: repo.full_name,
        description: repo.description,
        private: repo.private,
        html_url: repo.html_url,
        language: repo.language,
        stargazers_count: repo.stargazers_count,
        forks_count: repo.forks_count,
        open_issues_count: repo.open_issues_count,
        updated_at: repo.updated_at,
        default_branch: repo.default_branch,
        has_issues: repo.has_issues,
        has_projects: repo.has_projects,
        has_wiki: repo.has_wiki,
        has_pages: repo.has_pages,
        has_discussions: repo.has_discussions,
      })),
      github_username: connection.github_username,
    });
  } catch (error) {
    console.error('Error fetching repositories:', error);
    return NextResponse.json({ error: 'Failed to fetch repositories' }, { status: 500 });
  }
}