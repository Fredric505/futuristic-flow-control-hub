export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      imei_checks: {
        Row: {
          activation_lock: boolean | null
          blacklist_status: string | null
          carrier: string | null
          color: string | null
          created_at: string
          credits_deducted: number
          device_name: string | null
          error_message: string | null
          find_my_iphone: boolean | null
          id: string
          model: string | null
          search_type: string
          search_value: string
          serial_number: string | null
          status: string
          storage: string | null
          user_id: string
          warranty: string | null
        }
        Insert: {
          activation_lock?: boolean | null
          blacklist_status?: string | null
          carrier?: string | null
          color?: string | null
          created_at?: string
          credits_deducted?: number
          device_name?: string | null
          error_message?: string | null
          find_my_iphone?: boolean | null
          id?: string
          model?: string | null
          search_type: string
          search_value: string
          serial_number?: string | null
          status?: string
          storage?: string | null
          user_id: string
          warranty?: string | null
        }
        Update: {
          activation_lock?: boolean | null
          blacklist_status?: string | null
          carrier?: string | null
          color?: string | null
          created_at?: string
          credits_deducted?: number
          device_name?: string | null
          error_message?: string | null
          find_my_iphone?: boolean | null
          id?: string
          model?: string | null
          search_type?: string
          search_value?: string
          serial_number?: string | null
          status?: string
          storage?: string | null
          user_id?: string
          warranty?: string | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          id: string
          message_content: string
          process_id: string | null
          recipient_phone: string
          sent_at: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          id?: string
          message_content: string
          process_id?: string | null
          recipient_phone: string
          sent_at?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          id?: string
          message_content?: string
          process_id?: string | null
          recipient_phone?: string
          sent_at?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "processes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      processes: {
        Row: {
          client_name: string
          color: string
          contact_type: string
          country_code: string
          created_at: string | null
          id: string
          imei: string
          iphone_model: string
          lost_mode: boolean | null
          owner_name: string | null
          phone_number: string
          serial_number: string
          status: string | null
          storage: string
          updated_at: string | null
          url: string | null
          user_id: string
        }
        Insert: {
          client_name: string
          color: string
          contact_type: string
          country_code: string
          created_at?: string | null
          id?: string
          imei: string
          iphone_model: string
          lost_mode?: boolean | null
          owner_name?: string | null
          phone_number: string
          serial_number: string
          status?: string | null
          storage: string
          updated_at?: string | null
          url?: string | null
          user_id: string
        }
        Update: {
          client_name?: string
          color?: string
          contact_type?: string
          country_code?: string
          created_at?: string | null
          id?: string
          imei?: string
          iphone_model?: string
          lost_mode?: boolean | null
          owner_name?: string | null
          phone_number?: string
          serial_number?: string
          status?: string | null
          storage?: string
          updated_at?: string | null
          url?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "processes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          credits: number | null
          email: string
          expiration_date: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          credits?: number | null
          email: string
          expiration_date?: string | null
          id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          credits?: number | null
          email?: string
          expiration_date?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      script_captures: {
        Row: {
          captured_data: Json
          created_at: string
          id: string
          process_id: string | null
          script_type: string
          subdomain: string
          telegram_sent: boolean | null
          user_id: string
        }
        Insert: {
          captured_data: Json
          created_at?: string
          id?: string
          process_id?: string | null
          script_type: string
          subdomain: string
          telegram_sent?: boolean | null
          user_id: string
        }
        Update: {
          captured_data?: Json
          created_at?: string
          id?: string
          process_id?: string | null
          script_type?: string
          subdomain?: string
          telegram_sent?: boolean | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "script_captures_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "processes"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          created_at: string | null
          id: string
          setting_key: string
          setting_value: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          setting_key: string
          setting_value: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          setting_key?: string
          setting_value?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      telegram_bots: {
        Row: {
          bot_token: string
          chat_id: string
          created_at: string
          id: string
          is_active: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          bot_token: string
          chat_id: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          bot_token?: string
          chat_id?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_domains: {
        Row: {
          created_at: string
          domain_name: string
          id: string
          is_active: boolean | null
          subdomain_prefix: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          domain_name: string
          id?: string
          is_active?: boolean | null
          subdomain_prefix: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          domain_name?: string
          id?: string
          is_active?: boolean | null
          subdomain_prefix?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_config_by_subdomain: {
        Args: { subdomain_param: string }
        Returns: {
          user_id: string
          bot_token: string
          chat_id: string
          domain_name: string
        }[]
      }
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_user_active: {
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
