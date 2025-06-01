import { NextRequest, NextResponse } from 'next/server';
import { createClient, getServiceSupabase } from '@/lib/supabase-server';
import { getWorkflowRuns, triggerWorkflow } from '@/lib/github';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const owner = searchParams.get('owner');
    const repo = searchParams.get('repo');
    const workflowId = searchParams.get('workflow_id');
    
    if (!owner || !repo) {
      return NextResponse.json({ error: 'Missing owner or repo parameter' }, { status: 400 });
    }
    
    const isTestMode = process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_DISABLE_AUTH === 'true';
    
    let userId: string;
    let supabase: any;
    
    if (!isTestMode) {
      supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      userId = user.id;
    } else {
      supabase = getServiceSupabase();
      userId = '00000000-0000-0000-0000-000000000000';
    }
    
    const { data: connection, error: connectionError } = await supabase
      .from('github_connections')
      .select('github_token')
      .eq('user_id', userId)
      .single();
    
    if (connectionError || !connection) {
      return NextResponse.json({ error: 'GitHub not connected' }, { status: 404 });
    }
    
    const workflowRuns = await getWorkflowRuns(
      connection.github_token,
      owner,
      repo,
      workflowId || undefined
    );
    
    return NextResponse.json({
      workflow_runs: workflowRuns.workflow_runs.map(run => ({
        id: run.id,
        name: run.name,
        status: run.status,
        conclusion: run.conclusion,
        workflow_id: run.workflow_id,
        head_branch: run.head_branch,
        head_sha: run.head_sha,
        run_number: run.run_number,
        event: run.event,
        created_at: run.created_at,
        updated_at: run.updated_at,
        html_url: run.html_url,
      })),
      total_count: workflowRuns.total_count,
    });
  } catch (error) {
    console.error('Error fetching workflow runs:', error);
    return NextResponse.json({ error: 'Failed to fetch workflow runs' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { owner, repo, workflow_id, ref, inputs } = body;
    
    if (!owner || !repo || !workflow_id || !ref) {
      return NextResponse.json({ 
        error: 'Missing required parameters: owner, repo, workflow_id, ref' 
      }, { status: 400 });
    }
    
    const isTestMode = process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_DISABLE_AUTH === 'true';
    
    let userId: string;
    let supabase: any;
    
    if (!isTestMode) {
      supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      userId = user.id;
    } else {
      supabase = getServiceSupabase();
      userId = '00000000-0000-0000-0000-000000000000';
    }
    
    const { data: connection, error: connectionError } = await supabase
      .from('github_connections')
      .select('github_token')
      .eq('user_id', userId)
      .single();
    
    if (connectionError || !connection) {
      return NextResponse.json({ error: 'GitHub not connected' }, { status: 404 });
    }
    
    const result = await triggerWorkflow(
      connection.github_token,
      owner,
      repo,
      workflow_id,
      ref,
      inputs
    );
    
    return NextResponse.json({ 
      success: true,
      message: 'Workflow triggered successfully'
    });
  } catch (error) {
    console.error('Error triggering workflow:', error);
    return NextResponse.json({ error: 'Failed to trigger workflow' }, { status: 500 });
  }
}