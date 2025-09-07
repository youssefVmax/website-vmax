import { promises as fs } from 'fs';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';

const dataFilePath = path.join(process.cwd(), 'public', 'data', 'targets.json');

async function readTargets() {
  try {
    const fileContent = await fs.readFile(dataFilePath, 'utf-8');
    return JSON.parse(fileContent);
  } catch (error) {
    if (error.code === 'ENOENT') {
      // If the file doesn't exist, create it with an empty array and return it.
      await fs.writeFile(dataFilePath, '[]', 'utf-8');
      return [];
    }
    throw error;
  }
}

async function writeTargets(data) {
  await fs.writeFile(dataFilePath, JSON.stringify(data, null, 2));
}

export async function GET() {
  try {
    const targets = await readTargets();
    return NextResponse.json(targets, { status: 200 });
  } catch (error) {
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
  } catch (error) {
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

    } catch (error) {
      return NextResponse.json({ message: 'Error updating target' }, { status: 500 });
    }
}
