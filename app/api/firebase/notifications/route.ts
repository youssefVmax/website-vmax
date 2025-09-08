import { NextRequest, NextResponse } from 'next/server';
import { notificationService } from '@/lib/firebase-services';
import { Notification } from '@/types/firebase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const userRole = searchParams.get('userRole');

    const notifications = await notificationService.getNotifications(
      userId || undefined,
      userRole || undefined
    );

    return NextResponse.json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (!body.title || !body.message) {
      return NextResponse.json(
        { error: 'Title and message are required' },
        { status: 400 }
      );
    }

    const notificationData: Omit<Notification, 'id' | 'created_at'> = {
      title: body.title,
      message: body.message,
      type: body.type || 'info',
      userId: body.userId || null,
      userRole: body.userRole || null,
      isRead: false,
      expires_at: body.expires_at ? new Date(body.expires_at) : undefined
    };

    const notificationId = await notificationService.addNotification(notificationData);
    
    return NextResponse.json(
      { success: true, id: notificationId },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating notification:', error);
    return NextResponse.json(
      { error: 'Failed to create notification' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Notification ID is required' },
        { status: 400 }
      );
    }

    await notificationService.markAsRead(id);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return NextResponse.json(
      { error: 'Failed to update notification' },
      { status: 500 }
    );
  }
}
