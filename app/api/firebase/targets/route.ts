import { NextRequest, NextResponse } from 'next/server';
import { targetService } from '@/lib/firebase-services';
import { Target } from '@/types/firebase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const targets = await targetService.getTargets(userId);
    return NextResponse.json(targets);
  } catch (error) {
    console.error('Error fetching targets:', error);
    return NextResponse.json(
      { error: 'Failed to fetch targets' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (!body.userId || !body.targetAmount || !body.period) {
      return NextResponse.json(
        { error: 'userId, targetAmount, and period are required' },
        { status: 400 }
      );
    }

    const targetData: Omit<Target, 'id' | 'created_at' | 'updated_at'> = {
      userId: body.userId,
      userRole: body.userRole || 'salesman',
      targetAmount: parseFloat(body.targetAmount),
      currentAmount: body.currentAmount || 0,
      period: body.period,
      startDate: body.startDate || new Date().toISOString().split('T')[0],
      endDate: body.endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    };

    const targetId = await targetService.addTarget(targetData);
    
    return NextResponse.json(
      { success: true, id: targetId },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating target:', error);
    return NextResponse.json(
      { error: 'Failed to create target' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Target ID is required' },
        { status: 400 }
      );
    }

    await targetService.updateTarget(id, updates);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating target:', error);
    return NextResponse.json(
      { error: 'Failed to update target' },
      { status: 500 }
    );
  }
}
