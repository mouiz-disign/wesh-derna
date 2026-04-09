import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

@Injectable()
export class ProjectsService {
  constructor(private prisma: PrismaService) {}

  async create(workspaceId: string, dto: CreateProjectDto) {
    const project = await this.prisma.project.create({
      data: {
        name: dto.name,
        description: dto.description,
        color: dto.color || '#6366f1',
        workspaceId,
        columns: {
          createMany: {
            data: [
              { name: 'To Do', order: 0, color: '#94a3b8' },
              { name: 'In Progress', order: 1, color: '#3b82f6' },
              { name: 'In Review', order: 2, color: '#f59e0b' },
              { name: 'Done', order: 3, color: '#22c55e' },
            ],
          },
        },
      },
      include: { columns: { orderBy: { order: 'asc' } } },
    });
    return project;
  }

  async findByWorkspace(workspaceId: string) {
    return this.prisma.project.findMany({
      where: { workspaceId },
      include: { _count: { select: { tasks: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: {
        columns: {
          orderBy: { order: 'asc' },
          include: {
            tasks: {
              orderBy: { order: 'asc' },
              include: {
                assignee: { select: { id: true, name: true, avatar: true } },
                tags: true,
                _count: { select: { comments: true } },
              },
            },
          },
        },
      },
    });
    if (!project) throw new NotFoundException('Projet non trouvé');
    return project;
  }

  async update(id: string, dto: UpdateProjectDto) {
    return this.prisma.project.update({
      where: { id },
      data: dto,
    });
  }

  async delete(id: string) {
    return this.prisma.project.delete({ where: { id } });
  }

  async getStats(workspaceId: string) {
    const projects = await this.prisma.project.findMany({
      where: { workspaceId },
      include: {
        columns: {
          include: {
            tasks: {
              include: {
                assignee: { select: { id: true, name: true, avatar: true } },
              },
            },
          },
          orderBy: { order: 'asc' },
        },
      },
    });

    const totalTasks = projects.reduce(
      (sum, p) => sum + p.columns.reduce((s, c) => s + c.tasks.length, 0),
      0,
    );

    // Tasks by status (column name)
    const tasksByStatus: Record<string, number> = {};
    for (const project of projects) {
      for (const col of project.columns) {
        tasksByStatus[col.name] = (tasksByStatus[col.name] || 0) + col.tasks.length;
      }
    }

    // Tasks by priority
    const tasksByPriority: Record<string, number> = { LOW: 0, MEDIUM: 0, HIGH: 0, URGENT: 0 };
    for (const project of projects) {
      for (const col of project.columns) {
        for (const task of col.tasks) {
          tasksByPriority[task.priority] = (tasksByPriority[task.priority] || 0) + 1;
        }
      }
    }

    // Tasks by assignee
    const assigneeMap: Record<string, { name: string; count: number }> = {};
    for (const project of projects) {
      for (const col of project.columns) {
        for (const task of col.tasks) {
          if (task.assignee) {
            if (!assigneeMap[task.assignee.id]) {
              assigneeMap[task.assignee.id] = { name: task.assignee.name, count: 0 };
            }
            assigneeMap[task.assignee.id]!.count++;
          }
        }
      }
    }
    const tasksByAssignee = Object.values(assigneeMap).sort((a, b) => b.count - a.count);

    // Overdue tasks
    const now = new Date();
    let overdueTasks = 0;
    const doneColumns = new Set<string>();
    for (const project of projects) {
      for (const col of project.columns) {
        if (col.name.toLowerCase().includes('done') || col.name.toLowerCase().includes('termine')) {
          doneColumns.add(col.id);
        }
      }
    }
    for (const project of projects) {
      for (const col of project.columns) {
        if (doneColumns.has(col.id)) continue;
        for (const task of col.tasks) {
          if (task.deadline && new Date(task.deadline) < now) {
            overdueTasks++;
          }
        }
      }
    }

    // Per-project breakdown
    const projectStats = projects.map((p) => {
      const cols: Record<string, number> = {};
      let total = 0;
      for (const col of p.columns) {
        cols[col.name] = col.tasks.length;
        total += col.tasks.length;
      }
      return { id: p.id, name: p.name, color: p.color, total, columns: cols };
    });

    return {
      totalProjects: projects.length,
      totalTasks,
      overdueTasks,
      tasksByStatus,
      tasksByPriority,
      tasksByAssignee,
      projectStats,
    };
  }
}
