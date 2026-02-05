export type NodeStatus = 'Operational' | 'Critical' | 'Stable' | 'Inaccessible' | 'CRITICAL (Isolated)' | 'Recovering';
export type EdgeStatus = 'Clear' | 'Congested' | 'Damaged' | 'Destroyed';
export type NodeType = 'Warehouse' | 'Demand';

export interface Node {
  id: string;
  type: NodeType;
  supplies?: number;
  needs?: number;
  status: NodeStatus;
}

export interface Edge {
  source: string;
  target: string;
  status: EdgeStatus;
  risk: 'Low' | 'Medium' | 'High';
}

export interface WorldState {
  nodes: Node[];
  edges: Edge[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: number;
}

export type DisasterType = 'Earthquake' | 'Flood' | 'Pandemic' | 'Conflict Displacement';