import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { jobStore } from '@/lib/jobStore';

export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const { jobId } = params;
    
    // Get job status
    const job = jobStore.getJob(jobId);
    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    // Check if job is completed
    if (job.status !== 'completed') {
      return NextResponse.json(
        { error: `Job is not completed. Current status: ${job.status}` },
        { status: 400 }
      );
    }

    // Get file path from job data
    const filePath = (job.data as any)?.filePath;
    if (!filePath) {
      return NextResponse.json(
        { error: 'Export file not found' },
        { status: 404 }
      );
    }

    // Read the CSV file
    const csvContent = await readFile(filePath, 'utf-8');
    const filename = (job.data as any)?.filename || `export-${jobId}.csv`;

    // Return CSV file
    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    console.error('[Export API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
