import { promises as fs } from 'fs';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';

const dataFilePath = path.join(process.cwd(), 'public', 'data', 'targets.json');

async function readTargets() {
  try {
    const fileContent = await fs.readFile(dataFilePath, 'utf-8');
    try {
      const parsed = JSON.parse(fileContent);
      // Ensure array
      return Array.isArray(parsed) ? parsed : [];
    } catch (parseErr) {
      // If JSON is invalid, reset file to empty array to recover
      await fs.writeFile(dataFilePath, '[]', 'utf-8');
      return [];
    }
  } catch (error: any) {
    if (error && (error.code === 'ENOENT' || error?.message?.includes('no such file'))) {
      // If the file doesn't exist, create it with an empty array and return it.
      await fs.writeFile(dataFilePath, '[]', 'utf-8');
      return [];
    }
    throw error;
  }
}

async function writeTargets(data: any[]) {
  await fs.writeFile(dataFilePath, JSON.stringify(data, null, 2), 'utf-8');
}

export async function GET() {
  try {
    const targets = await readTargets();
    return NextResponse.json(targets, { status: 200 });
  } catch (error: any) {
    console.error('GET /api/targets failed:', error);
    return NextResponse.json({ message: 'Error reading targets' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const newTarget = await req.json();
    const targets = await readTargets();
    
    // Simple validation
    if (!newTarget.agentId || !newTarget.monthlyTarget || !newTarget.dealsTarget) {
        return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    newTarget.id = newTarget.id || Date.now().toString();
    targets.push(newTarget);
    await writeTargets(targets);
    
    return NextResponse.json(newTarget, { status: 201 });
  } catch (error: any) {
    console.error('POST /api/targets failed:', error);
    return NextResponse.json({ message: 'Error creating target' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
    try {
      const updatedTarget = await req.json();
      let targets = await readTargets();
      
      if (!updatedTarget.id) {
          return NextResponse.json({ message: 'Target ID is required for an update' }, { status: 400 });
      }

      const targetIndex = targets.findIndex(t => t.id === updatedTarget.id);

      if (targetIndex === -1) {
        return NextResponse.json({ message: 'Target not found' }, { status: 404 });
      }

      targets[targetIndex] = { ...targets[targetIndex], ...updatedTarget };
      await writeTargets(targets);
      
      return NextResponse.json(targets[targetIndex], { status: 200 });

    } catch (error: any) {
      console.error('PUT /api/targets failed:', error);
      return NextResponse.json({ message: 'Error updating target' }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
  try {
    const { agentId, dealAmount } = await req.json();
    
    if (!agentId || !dealAmount) {
      return NextResponse.json({ message: 'agentId and dealAmount are required' }, { status: 400 });
    }

    let targets = await readTargets();
    
    // Find target for this agent
    const targetIndex = targets.findIndex(t => t.agentId === agentId);
    
    if (targetIndex === -1) {
      return NextResponse.json({ message: 'No target found for this agent' }, { status: 404 });
    }

    // Update current sales (subtract from remaining target)
    const target = targets[targetIndex];
    target.currentSales = (target.currentSales || 0) + parseFloat(dealAmount);
    target.currentDeals = (target.currentDeals || 0) + 1;
    
    // Update status based on progress
    const salesProgress = target.monthlyTarget > 0 ? (target.currentSales / target.monthlyTarget) * 100 : 0;
    const dealsProgress = target.dealsTarget > 0 ? (target.currentDeals / target.dealsTarget) * 100 : 0;
    
    if (salesProgress >= 100 || dealsProgress >= 100) {
      target.status = 'exceeded';
    } else if (salesProgress >= 70 || dealsProgress >= 70) {
      target.status = 'on-track';
    } else {
      target.status = 'behind';
    }

    targets[targetIndex] = target;
    await writeTargets(targets);
    
    return NextResponse.json(target, { status: 200 });

  } catch (error: any) {
    console.error('PATCH /api/targets failed:', error);
    return NextResponse.json({ message: 'Error updating target progress' }, { status: 500 });
  }
}
