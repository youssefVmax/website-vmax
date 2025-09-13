import { NextRequest, NextResponse } from 'next/server';
import { collection, addDoc, getDocs, updateDoc, doc, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const CALLBACKS_COLLECTION = 'callbacks';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userRole = searchParams.get('userRole');
    const userId = searchParams.get('userId');
    const userName = searchParams.get('userName');

    let q = query(
      collection(db, CALLBACKS_COLLECTION),
      orderBy('created_at', 'desc')
    );
    
    if (userRole === 'manager') {
      // Managers see all callbacks - use default query
    } else if (userRole === 'salesman' && (userId || userName)) {
      // Salesmen see only their callbacks
      if (userName) {
        q = query(
          collection(db, CALLBACKS_COLLECTION),
          where('sales_agent', '==', userName),
          orderBy('created_at', 'desc')
        );
      } else if (userId) {
        q = query(
          collection(db, CALLBACKS_COLLECTION),
          where('SalesAgentID', '==', userId),
          orderBy('created_at', 'desc')
        );
      }
    }

    const snapshot = await getDocs(q);
    const callbacks = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      created_at: doc.data().created_at || new Date().toISOString(),
    }));

    return NextResponse.json(callbacks);
  } catch (error) {
    console.error('Error fetching callbacks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch callbacks' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.customer_name || !body.phone_number || !body.email) {
      return NextResponse.json(
        { error: 'Missing required fields: customer_name, phone_number, email' },
        { status: 400 }
      );
    }

    // Prepare callback data
    const callbackData = {
      customer_name: body.customer_name,
      phone_number: body.phone_number,
      email: body.email,
      sales_agent: body.sales_agent || '',
      sales_team: body.sales_team || '',
      first_call_date: body.first_call_date || new Date().toISOString().split('T')[0],
      first_call_time: body.first_call_time || '09:00',
      callback_notes: body.callback_notes || '',
      callback_reason: body.callback_reason || '',
      status: body.status || 'pending',
      created_by: body.created_by || 'Unknown',
      created_by_id: body.created_by_id || '',
      SalesAgentID: body.SalesAgentID || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const docRef = await addDoc(collection(db, CALLBACKS_COLLECTION), callbackData);
    
    return NextResponse.json(
      { success: true, id: docRef.id, callback: callbackData },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating callback:', error);
    return NextResponse.json(
      { error: 'Failed to create callback' },
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
        { error: 'Callback ID is required' },
        { status: 400 }
      );
    }

    const callbackRef = doc(db, CALLBACKS_COLLECTION, id);
    await updateDoc(callbackRef, {
      ...updates,
      updated_at: new Date().toISOString()
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating callback:', error);
    return NextResponse.json(
      { error: 'Failed to update callback' },
      { status: 500 }
    );
  }
}
