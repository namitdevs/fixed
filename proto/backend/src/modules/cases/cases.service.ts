import { prisma } from '../../utils/prisma';

export interface CreateCaseDto {
  caseNumber: string;
  title: string;
  description?: string;
  status?: string;
  priority?: string;
  createdByUserId: string;
}

export interface UpdateCaseDto {
  title?: string;
  description?: string;
  status?: string;
  priority?: string;
}

export class CaseService {
  static async createCase(data: CreateCaseDto) {
    const existing = await prisma.case.findUnique({
      where: { caseNumber: data.caseNumber },
    });

    if (existing) {
      const err: any = new Error(`Case with number ${data.caseNumber} already exists`);
      err.statusCode = 400;
      err.errorCode = 'CASE_NUMBER_EXISTS';
      throw err;
    }

    return await prisma.case.create({
      data: {
        caseNumber: data.caseNumber,
        title: data.title,
        description: data.description || null,
        status: data.status?.toUpperCase() || 'ACTIVE',
        priority: data.priority?.toUpperCase() || 'MEDIUM',
        createdByUserId: data.createdByUserId,
      },
      include: {
        createdByUser: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  static async listCases(filter?: {
    search?: string;
    status?: string;
    priority?: string;
  }) {
    const where: any = {};

    if (filter?.status) {
      where.status = filter.status.toUpperCase();
    }

    if (filter?.priority) {
      where.priority = filter.priority.toUpperCase();
    }

    if (filter?.search) {
      where.OR = [
        { caseNumber: { contains: filter.search } },
        { title: { contains: filter.search } },
        { description: { contains: filter.search } },
      ];
    }

    const cases = await prisma.case.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: {
        createdByUser: {
          select: { id: true, name: true, email: true },
        },
        _count: {
          select: {
            documents: true,
            dataSources: true,
            graphNodes: true,
            graphEdges: true,
            alerts: true,
          },
        },
      },
    });

    return cases;
  }

  static async getCaseById(id: string) {
    const caseData = await prisma.case.findUnique({
      where: { id },
      include: {
        createdByUser: {
          select: { id: true, name: true, email: true },
        },
        _count: {
          select: {
            documents: true,
            dataSources: true,
            evidenceRecords: true,
            persons: true,
            phones: true,
            vehicles: true,
            locations: true,
            organizations: true,
            accounts: true,
            calls: true,
            transactions: true,
            incidents: true,
            graphNodes: true,
            graphEdges: true,
            alerts: true,
            reports: true,
          },
        },
      },
    });

    if (!caseData) {
      const err: any = new Error(`Case with ID ${id} not found`);
      err.statusCode = 404;
      err.errorCode = 'CASE_NOT_FOUND';
      throw err;
    }

    return caseData;
  }

  static async updateCase(id: string, data: UpdateCaseDto) {
    const existing = await prisma.case.findUnique({ where: { id } });
    if (!existing) {
      const err: any = new Error(`Case with ID ${id} not found`);
      err.statusCode = 404;
      err.errorCode = 'CASE_NOT_FOUND';
      throw err;
    }

    return await prisma.case.update({
      where: { id },
      data: {
        title: data.title ?? existing.title,
        description: data.description !== undefined ? data.description : existing.description,
        status: data.status?.toUpperCase() ?? existing.status,
        priority: data.priority?.toUpperCase() ?? existing.priority,
      },
    });
  }

  static async deleteCase(id: string) {
    const existing = await prisma.case.findUnique({ where: { id } });
    if (!existing) {
      const err: any = new Error(`Case with ID ${id} not found`);
      err.statusCode = 404;
      err.errorCode = 'CASE_NOT_FOUND';
      throw err;
    }

    return await prisma.case.delete({ where: { id } });
  }
}
