import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { GET } from '../route';
import { NextResponse } from 'next/server';

jest.mock('@supabase/auth-helpers-nextjs');
jest.mock('next/headers', () => ({
  cookies: () => ({
    getAll: () => []
  })
}));

describe('GET /api/v1/chat/sessions', () => {
  const mockSupabase = {
    auth: {
      getSession: jest.fn()
    },
    from: jest.fn()
  };

  beforeEach(() => {
    (createRouteHandlerClient as jest.Mock).mockReturnValue(mockSupabase);
  });

  it('returns 401 when user is not authenticated', async () => {
    mockSupabase.auth.getSession.mockResolvedValue({ data: { session: null } });

    const response = await GET();
    expect(response).toBeInstanceOf(NextResponse);
    expect(response.status).toBe(401);
  });

  it('returns latest session data when available', async () => {
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: 'test-user' } } }
    });

    const mockLatestSession = {
      latest_session_id: 'test-session',
      sessions: {
        id: 'test-session',
        candidate_id: 'test-candidate',
        created_at: new Date().toISOString(),
        messages: { count: 10 },
        session_metadata: {
          total_messages: 10,
          last_message_at: new Date().toISOString(),
          ai_summary: 'Test summary'
        }
      }
    };

    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: mockLatestSession, error: null })
        })
      })
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual(mockLatestSession);
  });
});