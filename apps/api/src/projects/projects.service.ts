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

  // ── Column management ──

  async addColumn(projectId: string, name: string, color?: string) {
    const maxOrder = await this.prisma.column.aggregate({
      where: { projectId },
      _max: { order: true },
    });
    return this.prisma.column.create({
      data: {
        name,
        color: color || '#94a3b8',
        order: (maxOrder._max.order ?? -1) + 1,
        projectId,
      },
    });
  }

  async updateColumn(columnId: string, data: { name?: string; color?: string }) {
    return this.prisma.column.update({
      where: { id: columnId },
      data,
    });
  }

  async deleteColumn(columnId: string) {
    // Move tasks to first column of the project before deleting
    const column = await this.prisma.column.findUnique({
      where: { id: columnId },
      include: { tasks: true },
    });
    if (!column) return;

    if (column.tasks.length > 0) {
      const firstColumn = await this.prisma.column.findFirst({
        where: { projectId: column.projectId, id: { not: columnId } },
        orderBy: { order: 'asc' },
      });
      if (firstColumn) {
        await this.prisma.task.updateMany({
          where: { columnId },
          data: { columnId: firstColumn.id },
        });
      }
    }

    return this.prisma.column.delete({ where: { id: columnId } });
  }

  async reorderColumns(projectId: string, columnIds: string[]) {
    const updates = columnIds.map((id, index) =>
      this.prisma.column.update({ where: { id }, data: { order: index } }),
    );
    await this.prisma.$transaction(updates);
    return this.prisma.column.findMany({
      where: { projectId },
      orderBy: { order: 'asc' },
    });
  }

  // ── Templates ──

  getTemplates() {
    return [
      {
        id: 'kanban',
        name: 'Kanban Simple',
        description: 'Pour les equipes agiles',
        columns: [
          { name: 'To Do', color: '#94a3b8' },
          { name: 'In Progress', color: '#3b82f6' },
          { name: 'In Review', color: '#f59e0b' },
          { name: 'Done', color: '#22c55e' },
        ],
      },
      {
        id: 'scrum',
        name: 'Scrum / Sprint',
        description: 'Workflow complet de sprint',
        columns: [
          { name: 'Backlog', color: '#94a3b8' },
          { name: 'Sprint Ready', color: '#8b5cf6' },
          { name: 'In Progress', color: '#3b82f6' },
          { name: 'In Review', color: '#f59e0b' },
          { name: 'Testing', color: '#06b6d4' },
          { name: 'Done', color: '#22c55e' },
        ],
      },
      {
        id: 'development',
        name: 'Developpement Logiciel',
        description: 'Du backlog au deploiement',
        columns: [
          { name: 'Backlog', color: '#94a3b8' },
          { name: 'Scoping', color: '#a78bfa' },
          { name: 'In Design', color: '#ec4899' },
          { name: 'Ready to Dev', color: '#8b5cf6' },
          { name: 'In Development', color: '#3b82f6' },
          { name: 'In Review', color: '#f59e0b' },
          { name: 'Testing', color: '#06b6d4' },
          { name: 'Shipped', color: '#22c55e' },
          { name: 'Cancelled', color: '#ef4444' },
        ],
      },
      {
        id: 'marketing',
        name: 'Marketing & Campagnes',
        description: 'Gestion de campagnes',
        columns: [
          { name: 'Ideas', color: '#f59e0b' },
          { name: 'Planning', color: '#8b5cf6' },
          { name: 'In Production', color: '#3b82f6' },
          { name: 'Review', color: '#06b6d4' },
          { name: 'Published', color: '#22c55e' },
          { name: 'Archived', color: '#94a3b8' },
        ],
      },
      {
        id: 'support',
        name: 'Support Client',
        description: 'Gestion des tickets',
        columns: [
          { name: 'New', color: '#ef4444' },
          { name: 'Triaged', color: '#f59e0b' },
          { name: 'In Progress', color: '#3b82f6' },
          { name: 'Waiting', color: '#94a3b8' },
          { name: 'Resolved', color: '#22c55e' },
          { name: 'Closed', color: '#6b7280' },
        ],
      },
    ];
  }

  async applyTemplate(projectId: string, templateId: string) {
    const templates = this.getTemplates();
    const template = templates.find((t) => t.id === templateId);
    if (!template) return { error: 'Template not found' };

    // Delete existing columns (and their tasks cascade)
    await this.prisma.column.deleteMany({ where: { projectId } });

    // Create new columns
    await this.prisma.column.createMany({
      data: template.columns.map((col, i) => ({
        name: col.name,
        color: col.color,
        order: i,
        projectId,
      })),
    });

    return this.findById(projectId);
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
