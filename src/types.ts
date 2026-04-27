export interface Location {
  lat: number;
  lng: number;
}

export interface HistoryEvent {
  time: string;
  event: string;
}

export interface Shipment {
  id: string;
  containerId: string;
  carrier: string;
  vessel: string;
  cargoType: string;
  origin: string;
  destination: string;
  currentLocation: Location;
  eta: string;
  status: 'In Transit' | 'Delayed' | 'Optimizing' | 'Rerouted' | 'Arrived' | 'At Risk';
  route: Location[];
  progress: number;
  history?: HistoryEvent[];
  risk?: number;
  timeToReach?: string;
  newRoute?: Location[];
  disruption?: {
    type: string;
    description: string;
    severity: 'critical' | 'warning';
  };
}

export interface Scenario {
  id: string;
  name: string;
  description: string;
  timeDelta: string;
  efficiency: string;
  riskLevel: 'Low' | 'Medium' | 'High';
}

export interface Prediction {
  shipmentId: string;
  probability: number;
  reason: string;
  estimatedDelayHours?: number;
  etaForecast?: {
    min: string;
    max: string;
    expected: string;
    factors: {
      type: 'weather' | 'traffic' | 'port_congestion' | 'other';
      impact: string;
      description: string;
    }[];
  };
}

export interface Optimization {
  shipmentId: string;
  optimizedRoute: Location[];
  impact: {
    timeDelta: string;
    efficiency: string;
    description: string;
  };
}

export interface Weather {
  lat: number;
  lng: number;
  condition: string;
  temperature: number;
  windSpeed: number;
  severity: 'low' | 'moderate' | 'high' | 'extreme';
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}
