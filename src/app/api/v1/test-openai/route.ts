import { NextRequest, NextResponse } from 'next/server'
import { generateCVSummary } from '@/lib/openai'

export async function GET(request: NextRequest) {
  try {
    const testCV = `
      John Doe
      Software Engineer
      
      Experience:
      - Senior Developer at Tech Corp (2020-2023)
      - Developed web applications using React and Node.js
      
      Skills:
      - JavaScript, TypeScript, Python
      - React, Next.js, Express
      - AWS, Docker, Kubernetes
      
      Education:
      - BS Computer Science, MIT (2016)
    `;
    
    console.log('Testing OpenAI API...');
    const summary = await generateCVSummary(testCV);
    
    return NextResponse.json({
      success: true,
      summary,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Test OpenAI error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      details: {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
      }
    }, { status: 500 });
  }
}