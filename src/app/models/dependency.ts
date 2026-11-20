import { Subarea } from "./subarea";

export interface Dependency {
  id: number;
  name: string;
  number: number;
  active: boolean;
  subareas: Subarea[];
  
}
