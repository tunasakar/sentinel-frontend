export interface User {
  id: string;
  email: string;
  role: 'admin' | 'user';
}

export interface FactoryLocation {
  id: string;
  name: string;
  address: string;
  created_at: string;
}

export interface EnergyConsumption {
  id: string;
  factory_id: string;
  utility_type: 'electricity' | 'water' | 'gas';
  consumption: number;
  timestamp: string;
  cost: number;
}

export interface UtilityRate {
  id: string;
  utility_type: 'electricity' | 'water' | 'gas';
  rate: number;
  effective_from: string;
  effective_to: string | null;
}

export interface SustainabilityGoal {
  id: string;
  factory_id: string;
  utility_type: 'electricity' | 'water' | 'gas';
  target_consumption: number;
  target_date: string;
  created_at: string;
}
