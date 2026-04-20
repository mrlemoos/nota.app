export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      notes: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          content: Json;
          created_at: string;
          updated_at: string;
          due_at: string | null;
          is_deadline: boolean;
          editor_settings: Json;
          banner_attachment_id: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          title?: string;
          content?: Json;
          created_at?: string;
          updated_at?: string;
          due_at?: string | null;
          is_deadline?: boolean;
          editor_settings?: Json;
          banner_attachment_id?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          content?: Json;
          created_at?: string;
          updated_at?: string;
          due_at?: string | null;
          is_deadline?: boolean;
          editor_settings?: Json;
          banner_attachment_id?: string | null;
        };
        Relationships: [];
      };
      note_attachments: {
        Row: {
          id: string;
          note_id: string;
          user_id: string;
          storage_path: string;
          filename: string;
          content_type: string;
          size_bytes: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          note_id: string;
          user_id: string;
          storage_path: string;
          filename: string;
          content_type: string;
          size_bytes?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          note_id?: string;
          user_id?: string;
          storage_path?: string;
          filename?: string;
          content_type?: string;
          size_bytes?: number | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'note_attachments_note_id_fkey';
            columns: ['note_id'];
            referencedRelation: 'notes';
            referencedColumns: ['id'];
          },
        ];
      };
      supabase_clerk_account_link: {
        Row: {
          legacy_supabase_user_id: string;
          clerk_user_id: string;
        };
        Insert: {
          legacy_supabase_user_id: string;
          clerk_user_id: string;
        };
        Update: {
          legacy_supabase_user_id?: string;
          clerk_user_id?: string;
        };
        Relationships: [];
      };
      user_preferences: {
        Row: {
          user_id: string;
          open_todays_note_shortcut: boolean;
          show_note_backlinks: boolean;
          updated_at: string;
          welcome_seeded: boolean;
        };
        Insert: {
          user_id: string;
          open_todays_note_shortcut?: boolean;
          show_note_backlinks?: boolean;
          updated_at?: string;
          welcome_seeded?: boolean;
        };
        Update: {
          user_id?: string;
          open_todays_note_shortcut?: boolean;
          show_note_backlinks?: boolean;
          updated_at?: string;
          welcome_seeded?: boolean;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];
export type Insertable<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];
export type Updatable<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];

export type Note = Tables<'notes'>;
export type NoteInsert = Insertable<'notes'>;
export type NoteUpdate = Updatable<'notes'>;

export type NoteAttachment = Tables<'note_attachments'>;
export type NoteAttachmentInsert = Insertable<'note_attachments'>;

export type UserPreferences = Tables<'user_preferences'>;
export type UserPreferencesInsert = Insertable<'user_preferences'>;
export type UserPreferencesUpdate = Updatable<'user_preferences'>;
