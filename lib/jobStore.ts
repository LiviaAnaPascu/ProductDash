import { JobStatus, JobType } from './queue';

// Global job store that survives hot reloads in Next.js
// Use a global variable to persist across module reloads
const globalForJobStore = globalThis as unknown as {
  jobStore: JobStore | undefined;
};

class JobStore {
  private jobs: Map<string, JobStatus> = new Map();

  createJob(
    id: string,
    type: JobType,
    data?: any
  ): JobStatus {
    const job: JobStatus = {
      id,
      type,
      status: 'pending',
      data,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.jobs.set(id, job);
    console.log(`[JobStore] ✅ Created job ${id} (total jobs: ${this.jobs.size})`);
    return job;
  }

  getJob(id: string): JobStatus | undefined {
    const job = this.jobs.get(id);
    if (!job) {
      console.log(`[JobStore] ❌ Job ${id} not found (total jobs: ${this.jobs.size})`);
    }
    return job;
  }

  updateJob(
    id: string,
    updates: Partial<Pick<JobStatus, 'status' | 'progress' | 'error' | 'data'>>
  ): JobStatus | undefined {
    const job = this.jobs.get(id);
    if (!job) {
      console.log(`[JobStore] ❌ Cannot update job ${id} - not found (total jobs: ${this.jobs.size})`);
      return undefined;
    }

    const updated: JobStatus = {
      ...job,
      ...updates,
      updatedAt: new Date(),
      completedAt: updates.status === 'completed' || updates.status === 'failed' 
        ? new Date() 
        : job.completedAt,
    };
    this.jobs.set(id, updated);
    console.log(`[JobStore] ✅ Updated job ${id}: ${job.status} → ${updated.status}`);
    return updated;
  }

  getAllJobs(type?: JobType): JobStatus[] {
    const allJobs = Array.from(this.jobs.values());
    if (type) {
      return allJobs.filter(job => job.type === type);
    }
    return allJobs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  deleteJob(id: string): boolean {
    return this.jobs.delete(id);
  }

  clear(): void {
    this.jobs.clear();
  }
}

// Export singleton instance that survives Next.js hot reloads
// Use global variable to persist across module reloads in development
if (!globalForJobStore.jobStore) {
  globalForJobStore.jobStore = new JobStore();
  console.log('[JobStore] 🆕 Created new JobStore instance');
} else {
  console.log('[JobStore] ♻️ Reusing existing JobStore instance (survived hot reload)');
}

export const jobStore = globalForJobStore.jobStore;
