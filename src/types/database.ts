export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      folders: {
        Row: {
          id: string
          owner_id: string
          name: string
          parent_folder_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          name: string
          parent_folder_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          owner_id?: string
          name?: string
          parent_folder_id?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'folders_parent_folder_id_fkey'
            columns: ['parent_folder_id']
            isOneToOne: false
            referencedRelation: 'folders'
            referencedColumns: ['id']
          }
        ]
      }
      files: {
        Row: {
          id: string
          owner_id: string
          folder_id: string | null
          name: string
          storage_path: string
          mime_type: string | null
          size_bytes: number
          checksum_sha256: string | null
          is_public: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          folder_id?: string | null
          name: string
          storage_path: string
          mime_type?: string | null
          size_bytes: number
          checksum_sha256?: string | null
          is_public?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          owner_id?: string
          folder_id?: string | null
          name?: string
          storage_path?: string
          mime_type?: string | null
          size_bytes?: number
          checksum_sha256?: string | null
          is_public?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'files_folder_id_fkey'
            columns: ['folder_id']
            isOneToOne: false
            referencedRelation: 'folders'
            referencedColumns: ['id']
          }
        ]
      }
      shares: {
        Row: {
          id: string
          file_id: string
          owner_id: string
          token_hash: string
          expires_at: string
          revoked_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          file_id: string
          owner_id: string
          token_hash: string
          expires_at: string
          revoked_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          file_id?: string
          owner_id?: string
          token_hash?: string
          expires_at?: string
          revoked_at?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'shares_file_id_fkey'
            columns: ['file_id']
            isOneToOne: false
            referencedRelation: 'files'
            referencedColumns: ['id']
          }
        ]
      }
      transfer_logs: {
        Row: {
          id: string
          user_id: string | null
          request_id: string
          operation: string
          status_code: number | null
          duration_ms: number | null
          bytes_transferred: number
          error_code: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          request_id: string
          operation: string
          status_code?: number | null
          duration_ms?: number | null
          bytes_transferred?: number
          error_code?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          request_id?: string
          operation?: string
          status_code?: number | null
          duration_ms?: number | null
          bytes_transferred?: number
          error_code?: string | null
          created_at?: string
        }
        Relationships: []
      }
      experiments: {
        Row: {
          id: string
          user_id: string
          experiment_type: string
          parameters: Json
          results: Json
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          experiment_type: string
          parameters?: Json
          results?: Json
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          experiment_type?: string
          parameters?: Json
          results?: Json
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      transfer_operation: 'upload' | 'download' | 'delete' | 'rename' | 'share' | 'tcp_test'
    }
    CompositeTypes: Record<string, never>
  }
}
