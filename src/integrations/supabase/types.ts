export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      message_queue: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          language: string
          message_content: string
          process_id: string
          recipient_phone: string
          scheduled_for: string | null
          sent_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          language?: string
          message_content: string
          process_id: string
          recipient_phone: string
          scheduled_for?: string | null
          sent_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          language?: string
          message_content?: string
          process_id?: string
          recipient_phone?: string
          scheduled_for?: string | null
          sent_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_queue_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "processes"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          created_at: string
          id: string
          message_content: string | null
          process_id: string
          recipient_phone: string | null
          sent_at: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message_content?: string | null
          process_id: string
          recipient_phone?: string | null
          sent_at?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message_content?: string | null
          process_id?: string
          recipient_phone?: string | null
          sent_at?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_process_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "processes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_user_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      processes: {
        Row: {
          client_name: string | null
          client_subdomain: string | null
          color: string | null
          contact_type: string | null
          country_code: string | null
          created_at: string
          id: string
          imei: string | null
          iphone_model: string | null
          lost_mode: boolean | null
          owner_name: string | null
          phone_number: string | null
          serial_number: string | null
          status: string | null
          storage: string | null
          updated_at: string
          url: string | null
          user_id: string
        }
        Insert: {
          client_name?: string | null
          client_subdomain?: string | null
          color?: string | null
          contact_type?: string | null
          country_code?: string | null
          created_at?: string
          id?: string
          imei?: string | null
          iphone_model?: string | null
          lost_mode?: boolean | null
          owner_name?: string | null
          phone_number?: string | null
          serial_number?: string | null
          status?: string | null
          storage?: string | null
          updated_at?: string
          url?: string | null
          user_id: string
        }
        Update: {
          client_name?: string | null
          client_subdomain?: string | null
          color?: string | null
          contact_type?: string | null
          country_code?: string | null
          created_at?: string
          id?: string
          imei?: string | null
          iphone_model?: string | null
          lost_mode?: boolean | null
          owner_name?: string | null
          phone_number?: string | null
          serial_number?: string | null
          status?: string | null
          storage?: string | null
          updated_at?: string
          url?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "processes_user_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          credits: number
          email: string
          expiration_date: string | null
          id: string
          telegram_bot_token: string | null
          telegram_chat_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          credits?: number
          email: string
          expiration_date?: string | null
          id?: string
          telegram_bot_token?: string | null
          telegram_chat_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          credits?: number
          email?: string
          expiration_date?: string | null
          id?: string
          telegram_bot_token?: string | null
          telegram_chat_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          created_at: string
          id: string
          setting_key: string
          setting_value: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          setting_key: string
          setting_value?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          setting_key?: string
          setting_value?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      whatsapp_telegram_log: {
        Row: {
          forwarded_at: string
          id: number
          sender_phone: string | null
          telegram_message_id: number | null
          whatsapp_payload: Json
        }
        Insert: {
          forwarded_at?: string
          id?: never
          sender_phone?: string | null
          telegram_message_id?: number | null
          whatsapp_payload: Json
        }
        Update: {
          forwarded_at?: string
          id?: never
          sender_phone?: string | null
          telegram_message_id?: number | null
          whatsapp_payload?: Json
        }
        Relationships: []
      }
      whatsapp_telegram_map: {
        Row: {
          created_at: string | null
          telegram_user_id: number
          whatsapp_phone: string
        }
        Insert: {
          created_at?: string | null
          telegram_user_id: number
          whatsapp_phone: string
        }
        Update: {
          created_at?: string | null
          telegram_user_id?: number
          whatsapp_phone?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin_user: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
