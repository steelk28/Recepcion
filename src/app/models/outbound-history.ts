export interface HistoryRow {
  label: string;
  before: string;
  after: string;
  changed: boolean;
}

export interface HistoryEvent {
  id: number;
  at: string;
  by: string | null;
  type: 'edicion' | 'uso' | 'liberacion';
  title: string;
  rows: HistoryRow[];
}

export interface HistoryCreation {
  at: string | null;
  by: string | null;
  rows: { label: string; value: string }[];
}

export interface OutboundHistory {
  creation: HistoryCreation;
  events: HistoryEvent[];
}