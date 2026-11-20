export interface OutboundEdit {
  id: number;
  field: string;          // addressee, description o state
  old_value: string | null;
  new_value: string | null;
  edited_by: string | null;
  created_at: string;
}
