"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const graph_controller_1 = require("./graph.controller");
const auth_1 = require("../../middleware/auth");
const router = (0, express_1.Router)({ mergeParams: true });
router.use(auth_1.authenticateToken);
// Graph projection & traversal
router.post('/build', graph_controller_1.GraphController.buildGraph);
router.get('/', graph_controller_1.GraphController.getGraph);
router.get('/nodes/:nodeId', graph_controller_1.GraphController.getNode);
router.get('/edges/:edgeId', graph_controller_1.GraphController.getEdge);
router.get('/neighborhood/:nodeId', graph_controller_1.GraphController.getNeighborhood);
// Entity resolution
router.get('/resolution-candidates', graph_controller_1.GraphController.listResolutionCandidates);
router.post('/resolution/:candidateId', graph_controller_1.GraphController.resolveCandidate);
exports.default = router;
