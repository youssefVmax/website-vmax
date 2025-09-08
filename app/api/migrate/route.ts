import { NextResponse } from 'next/server';
import { migrateDataToFirebase } from '../../../scripts/migrate-to-firebase';

export async function POST() {
  try {
    await migrateDataToFirebase();
    return NextResponse.json({ 
      success: true, 
      message: 'Data migration to Firebase completed successfully' 
    });
  } catch (error) {
    console.error('Migration API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Migration failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
