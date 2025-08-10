import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    
    console.log('🔍 Fetching shared profile for token:', token);
    
    // Fazer requisição para o backend
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001';
    const response = await fetch(`${backendUrl}/api/whatsapp/shared/${token}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('❌ Backend error:', response.status, response.statusText);
      return NextResponse.json(
        { 
          success: false, 
          error: `Backend error: ${response.status}` 
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('✅ Shared profile data:', data);
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ Error in shared API route:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 