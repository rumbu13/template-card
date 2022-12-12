import { LovelaceCardConfig } from "custom-card-helpers";

// TODO Add your configuration elements here for type-checking
export interface TemplateCardConfig {
  entity?: string;
  triggers?: string[] | string;
  variables?: VariablesConfig
  templates?: string[] | string;  
  card?: LovelaceCardConfig
}

export interface VariablesConfig {
  [key: string]: string;
}


