export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface Case {
  id: string;
  caseNumber: string;
  title: string;
  description?: string;
  status: 'ACTIVE' | 'UNDER_REVIEW' | 'ON_HOLD' | 'CLOSED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  createdAt: string;
  updatedAt: string;
  _count?: {
    documents: number;
    dataSources: number;
    evidenceRecords?: number;
    persons?: number;
    phones?: number;
    vehicles?: number;
    calls?: number;
    transactions?: number;
    graphNodes?: number;
    graphEdges?: number;
    alerts?: number;
  };
}

export interface DocumentItem {
  id: string;
  caseId: string;
  filename: string;
  originalFilename: string;
  fileType: string;
  fileSize: number;
  processingStatus: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  processingError?: string;
  recordCount: number;
  warningCount: number;
  createdAt: string;
  dataSource?: { id: string; name: string; type: string };
}

export interface GraphNodeData {
  id: string;
  label: string;
  entityType: 'PERSON' | 'PHONE' | 'VEHICLE' | 'ACCOUNT' | 'LOCATION' | 'INCIDENT';
  canonicalValue: string;
  confidence: number;
  degree?: number;
  betweenness?: number;
  relevanceScore?: number;
  communityId?: number;
  isPotentialBridge?: boolean;
}

export interface GraphEdgeData {
  id: string;
  source: string;
  target: string;
  label: string;
  relationshipType: string;
  isEvent: boolean;
  eventTimestamp?: string;
  confidence: number;
  weight: number;
  evidenceRecordId?: string;
  amount?: number;
  durationSec?: number;
  location?: string;
}

export interface AlertItem {
  id: string;
  caseId: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  alertType: string;
  title: string;
  description: string;
  status: 'ACTIVE' | 'ACKNOWLEDGED' | 'DISMISSED';
  involvedNodeIds?: string[];
  evidenceRecordIds?: string[];
  createdAt: string;
}

export interface TimelineEventItem {
  id: string;
  timestamp: string;
  eventType: 'CALL' | 'TRANSACTION' | 'MEETING' | 'INCIDENT' | 'OTHER';
  title: string;
  description: string;
  involvedEntities: string[];
  amount?: number;
  durationSec?: number;
  location?: string;
}
