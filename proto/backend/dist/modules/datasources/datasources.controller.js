"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataSourceController = void 0;
const zod_1 = require("zod");
const datasources_service_1 = require("./datasources.service");
const createDataSourceSchema = zod_1.z.object({
    name: zod_1.z.string().min(2, 'Name is required'),
    type: zod_1.z.enum(['CDR', 'TRANSACTION', 'FIR', 'SURVEILLANCE', 'VEHICLE', 'SUSPECT', 'SOCIAL_MEDIA']),
    description: zod_1.z.string().optional(),
});
class DataSourceController {
    static async create(req, res, next) {
        try {
            const data = createDataSourceSchema.parse(req.body);
            const ds = await datasources_service_1.DataSourceService.create({
                caseId: req.params.caseId,
                name: data.name,
                type: data.type,
                description: data.description,
                uploadedByUserId: req.user?.id,
            });
            res.status(201).json({
                success: true,
                message: 'DataSource created successfully',
                data: { dataSource: ds },
            });
        }
        catch (err) {
            next(err);
        }
    }
    static async listByCase(req, res, next) {
        try {
            const dataSources = await datasources_service_1.DataSourceService.listByCase(req.params.caseId);
            res.status(200).json({
                success: true,
                data: { dataSources, count: dataSources.length },
            });
        }
        catch (err) {
            next(err);
        }
    }
    static async getById(req, res, next) {
        try {
            const ds = await datasources_service_1.DataSourceService.getById(req.params.id);
            res.status(200).json({
                success: true,
                data: { dataSource: ds },
            });
        }
        catch (err) {
            next(err);
        }
    }
}
exports.DataSourceController = DataSourceController;
