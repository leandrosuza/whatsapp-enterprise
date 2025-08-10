import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ contactId: string }> }
) {
  try {
    const { searchParams } = new URL(request.url);
    const profileId = searchParams.get('profileId');
    
    if (!profileId) {
      return NextResponse.json({ error: 'Profile ID is required' }, { status: 400 });
    }

    const resolvedParams = await params;
    const contactId = resolvedParams.contactId;
    
    // Call backend API to get contact photo
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const response = await fetch(`${backendUrl}/api/whatsapp/profiles/${profileId}/contacts/${contactId}/photo`);
    
    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to get contact photo' }, { status: response.status });
    }

    const data = await response.json();
    
    if (!data.success || !data.photoUrl) {
      return NextResponse.json({ error: 'No photo available' }, { status: 404 });
    }

    // Return the photo URL
    return NextResponse.json({
      success: true,
      photoUrl: data.photoUrl,
      contactId: data.contactId
    });

  } catch (error) {
    console.error('Error in contact photo route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 