export interface Outbound {
    id:number;
    num_area:number;
    consecutive:number;
    date:string;
    addressee:string;
    description:string;
    area:string;
    status:string;
    year:number;
    created_by?: string | null;
    state: 'pendiente' | 'utilizado';
    edit_count: number;
    last_edited_by?: string | null;
    last_edited_at?: string | null;
    subarea?: string | null;
}

