import { prisma } from '../../utils/prisma';

export interface CreateDataSourceDto {
  caseId: string;
  name: string;
  type: string;
  description?: string;
  uploadedByUserId?: string;
}

export class DataSourceService {
  static async create(data: CreateDataSourceDto) {
    const caseItem = await prisma.case.findUnique({ where: { id: data.caseId } });
    if (!caseItem) {
      const err: any = new Error(`Case with ID ${data.caseId} not found`);
      err.statusCode = 404;
      err.errorCode = 'CASE_NOT_FOUND';
      throw err;
    }

    return await prisma.dataSource.create({
      data: {
        caseId: data.caseId,
        name: data.name,
        type: data.type.toUpperCase(),
        description: data.description || null,
        uploadedByUserId: data.uploadedByUserId || null,
      },
    });
  }

  static async listByCase(caseId: string) {
    return await prisma.dataSource.findMany({
      where: { caseId },
      orderBy: { createdAt: 'desc' },
      include: {
        documents: {
          select: {
            id: true,
            filename: true,
            fileType: true,
            fileSize: true,
            processingStatus: true,
            recordCount: true,
            createdAt: true,
          },
        },
      },
    });
  }

  static async getById(id: string) {
    const ds = await prisma.dataSource.findUnique({
      where: { id },
      include: {
        documents: true,
      },
    });

    if (!ds) {
      const err: any = new Error(`DataSource with ID ${id} not found`);
      err.statusCode = 404;
      err.errorCode = 'DATA_SOURCE_NOT_FOUND';
      throw err;
    }

    return ds;
  }
}
