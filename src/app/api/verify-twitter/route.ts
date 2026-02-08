import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface TwitterVerifyRequest {
  handle: string;
}

interface TwitterUserInfo {
  handle: string;
  exists: boolean;
  followers?: number;
  verified?: boolean;
}

async function verifyTwitterHandle(handle: string): Promise<TwitterUserInfo> {
  // Clean handle (remove @ if present)
  const cleanHandle = handle.replace(/^@/, '');
  
  try {
    // Use bird CLI to check if user exists and get basic info
    const { stdout } = await execAsync(`bird user-tweets @${cleanHandle} -n 1 --json 2>/dev/null`);
    const data = JSON.parse(stdout);
    
    if (data && data.length > 0) {
      // User exists
      return {
        handle: cleanHandle,
        exists: true,
        // We could extract more info from the response if needed
      };
    }
    
    return { handle: cleanHandle, exists: false };
  } catch (error) {
    // Try about command for more info
    try {
      const { stdout } = await execAsync(`bird about @${cleanHandle} --plain 2>/dev/null`);
      if (stdout && stdout.includes('Account based in')) {
        return { handle: cleanHandle, exists: true };
      }
    } catch {
      // Account doesn't exist or is private
    }
    
    return { handle: cleanHandle, exists: false };
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: TwitterVerifyRequest = await request.json();
    const { handle } = body;

    if (!handle) {
      return NextResponse.json(
        { error: 'Twitter handle is required' },
        { status: 400 }
      );
    }

    const result = await verifyTwitterHandle(handle);

    if (!result.exists) {
      return NextResponse.json(
        { error: 'Twitter account not found', verified: false },
        { status: 404 }
      );
    }

    return NextResponse.json({
      verified: true,
      handle: result.handle,
      message: 'Twitter account verified'
    });
  } catch (error) {
    console.error('Twitter verification error:', error);
    return NextResponse.json(
      { error: 'Verification failed', verified: false },
      { status: 500 }
    );
  }
}
