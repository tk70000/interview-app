import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'Test route is working!',
    timestamp: new Date().toISOString(),
    method: request.method,
    url: request.url,
  });
}