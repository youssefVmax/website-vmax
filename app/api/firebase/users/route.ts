import { NextRequest, NextResponse } from 'next/server';
import { userService } from '@/lib/firebase-services';
import { User } from '@/types/firebase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const email = searchParams.get('email');

    if (id) {
      const user = await userService.getUser(id);
      return NextResponse.json(user);
    } else if (email) {
      const user = await userService.getUserByEmail(email);
      return NextResponse.json(user);
    } else {
      return NextResponse.json(
        { error: 'User ID or email is required' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (!body.name || !body.email || !body.role) {
      return NextResponse.json(
        { error: 'Name, email, and role are required' },
        { status: 400 }
      );
    }

    const userData: Omit<User, 'id' | 'created_at' | 'updated_at'> = {
      name: body.name,
      email: body.email,
      role: body.role,
      team: body.team || '',
      SalesAgentID: body.SalesAgentID || '',
      ClosingAgentID: body.ClosingAgentID || '',
      isActive: body.isActive !== false
    };

    const userId = await userService.addUser(userData);
    
    return NextResponse.json(
      { success: true, id: userId },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: 'Failed to create user' },
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
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    await userService.updateUser(id, updates);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
}
