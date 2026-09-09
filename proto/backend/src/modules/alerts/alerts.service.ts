import { prisma } from '../../utils/prisma';

export class AlertService {
  static async listAlerts(caseId: string, filter?: { severity?: string; status?: string }) {
    const where: any = { caseId };
    if (filter?.severity) where.severity = filter.severity.toUpperCase();
    if (filter?.status) where.status = filter.status.toUpperCase();

    const alerts = await prisma.alert.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return alerts.map((a) => ({
      ...a,
      involvedNodeIds: a.involvedNodeIds ? JSON.parse(a.involvedNodeIds) : [],
      evidenceRecordIds: a.evidenceRecordIds ? JSON.parse(a.evidenceRecordIds) : [],
    }));
  }

  static async updateAlertStatus(alertId: string, status: 'ACKNOWLEDGED' | 'DISMISSED' | 'ACTIVE') {
    const alert = await prisma.alert.findUnique({ where: { id: alertId } });
    if (!alert) {
      const err: any = new Error(`Alert ${alertId} not found`);
      err.statusCode = 404;
      err.errorCode = 'ALERT_NOT_FOUND';
      throw err;
    }

    return await prisma.alert.update({
      where: { id: alertId },
      data: { status },
    });
  }
}
