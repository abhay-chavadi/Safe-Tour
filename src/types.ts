export interface Tourist {
  id: string; // Blockchain Digital ID (hex hash starting with 0x)
  name: string;
  phone: string;
  facePhoto: string; // Base64 image
  lat: number;
  lng: number;
  lastActive: number;
  sosActive: boolean;
  sosTime: number | null;
  offlineMode: boolean;
  registrationTimestamp: number;
  blockchainBlockIndex: number;
  blockHash: string;
  nationality?: string;
  passportId?: string;
  stayDuration?: string;
}

export interface IncidentReport {
  id: string;
  touristId: string;
  touristName: string;
  message: string;
  lat: number;
  lng: number;
  timestamp: number;
  status: 'pending' | 'resolved';
}

export interface GeoFence {
  id: string;
  name: string;
  type: 'safe' | 'danger';
  shape: 'circle';
  lat: number;
  lng: number;
  radius: number; // in meters
}

export interface BlockchainBlock {
  index: number;
  timestamp: number;
  touristId: string;
  previousHash: string;
  hash: string;
  nonce: number;
  data: string;
}

export interface EmergencyContact {
  name: string;
  number: string;
  role: string;
}

export interface BroadcastAlert {
  id: string;
  message: string;
  severity: 'warning' | 'info' | 'critical';
  timestamp: number;
}

export interface DisasterNews {
  id: string;
  title: string;
  category: string;
  message: string;
  timestamp: number;
  severity: 'info' | 'warning' | 'critical';
}

