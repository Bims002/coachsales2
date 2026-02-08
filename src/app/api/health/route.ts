import { NextResponse } from 'next/server';

export async function GET() {
    return NextResponse.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        env: {
            supabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
            supabaseAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
            supabaseServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
            googleCreds: !!process.env.GOOGLE_APPLICATION_CREDENTIALS,
            geminiKey: !!process.env.GEMINI_API_KEY,
        },
        message: 'API is working! Check env values above (true = configured, false = missing)'
    });
}
