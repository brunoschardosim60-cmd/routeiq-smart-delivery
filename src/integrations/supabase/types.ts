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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      assigned_routes: {
        Row: {
          client_company_id: string | null
          code: string
          company_id: string
          cost: number
          created_at: string
          current_lat: number | null
          current_lon: number | null
          date_iso: string
          departure: string | null
          destination: string | null
          destination_lat: number | null
          destination_lon: number | null
          done: number
          driver_id: string
          driver_name: string
          driver_pay: number
          expected_return: string | null
          finished_at: string | null
          id: string
          km: number
          km_end: number | null
          km_start: number | null
          notes: string | null
          origin: string
          origin_lat: number | null
          origin_lon: number | null
          proof_photo_url: string | null
          revenue: number
          started_at: string | null
          status: string
          total_deliveries: number
          trip_type: string
          updated_at: string
        }
        Insert: {
          client_company_id?: string | null
          code: string
          company_id: string
          cost?: number
          created_at?: string
          current_lat?: number | null
          current_lon?: number | null
          date_iso: string
          departure?: string | null
          destination?: string | null
          destination_lat?: number | null
          destination_lon?: number | null
          done?: number
          driver_id: string
          driver_name: string
          driver_pay?: number
          expected_return?: string | null
          finished_at?: string | null
          id?: string
          km?: number
          km_end?: number | null
          km_start?: number | null
          notes?: string | null
          origin: string
          origin_lat?: number | null
          origin_lon?: number | null
          proof_photo_url?: string | null
          revenue?: number
          started_at?: string | null
          status?: string
          total_deliveries?: number
          trip_type?: string
          updated_at?: string
        }
        Update: {
          client_company_id?: string | null
          code?: string
          company_id?: string
          cost?: number
          created_at?: string
          current_lat?: number | null
          current_lon?: number | null
          date_iso?: string
          departure?: string | null
          destination?: string | null
          destination_lat?: number | null
          destination_lon?: number | null
          done?: number
          driver_id?: string
          driver_name?: string
          driver_pay?: number
          expected_return?: string | null
          finished_at?: string | null
          id?: string
          km?: number
          km_end?: number | null
          km_start?: number | null
          notes?: string | null
          origin?: string
          origin_lat?: number | null
          origin_lon?: number | null
          proof_photo_url?: string | null
          revenue?: number
          started_at?: string | null
          status?: string
          total_deliveries?: number
          trip_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      client_companies: {
        Row: {
          active: boolean
          company_id: string
          created_at: string
          daily_admin_rate: number
          daily_driver_rate: number
          id: string
          name: string
          second_admin_rate: number
          second_driver_rate: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          company_id: string
          created_at?: string
          daily_admin_rate?: number
          daily_driver_rate?: number
          id?: string
          name: string
          second_admin_rate?: number
          second_driver_rate?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          company_id?: string
          created_at?: string
          daily_admin_rate?: number
          daily_driver_rate?: number
          id?: string
          name?: string
          second_admin_rate?: number
          second_driver_rate?: number
          updated_at?: string
        }
        Relationships: []
      }
      companies: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_id: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner_id: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      driver_locations: {
        Row: {
          accuracy: number | null
          assigned_route_id: string
          company_id: string
          created_at: string
          driver_id: string
          heading: number | null
          id: string
          lat: number
          lon: number
          recorded_at: string
          speed: number | null
        }
        Insert: {
          accuracy?: number | null
          assigned_route_id: string
          company_id: string
          created_at?: string
          driver_id: string
          heading?: number | null
          id?: string
          lat: number
          lon: number
          recorded_at?: string
          speed?: number | null
        }
        Update: {
          accuracy?: number | null
          assigned_route_id?: string
          company_id?: string
          created_at?: string
          driver_id?: string
          heading?: number | null
          id?: string
          lat?: number
          lon?: number
          recorded_at?: string
          speed?: number | null
        }
        Relationships: []
      }
      driver_profiles: {
        Row: {
          cnh: string | null
          company_id: string
          cpf: string | null
          created_at: string
          daily_rate: number
          monthly_target: number
          phone: string | null
          plate: string | null
          second_trip_rate: number
          updated_at: string
          user_id: string
          vehicle: string | null
        }
        Insert: {
          cnh?: string | null
          company_id: string
          cpf?: string | null
          created_at?: string
          daily_rate?: number
          monthly_target?: number
          phone?: string | null
          plate?: string | null
          second_trip_rate?: number
          updated_at?: string
          user_id: string
          vehicle?: string | null
        }
        Update: {
          cnh?: string | null
          company_id?: string
          cpf?: string | null
          created_at?: string
          daily_rate?: number
          monthly_target?: number
          phone?: string | null
          plate?: string | null
          second_trip_rate?: number
          updated_at?: string
          user_id?: string
          vehicle?: string | null
        }
        Relationships: []
      }
      fuel_entries: {
        Row: {
          assigned_route_id: string | null
          company_id: string
          created_at: string
          date_iso: string
          driver_id: string
          driver_name: string
          id: string
          liters: number
          notes: string | null
          odometer: number | null
          plate: string | null
          price_per_l: number
          station: string | null
          total: number
          updated_at: string
          vehicle: string | null
        }
        Insert: {
          assigned_route_id?: string | null
          company_id: string
          created_at?: string
          date_iso: string
          driver_id: string
          driver_name: string
          id?: string
          liters: number
          notes?: string | null
          odometer?: number | null
          plate?: string | null
          price_per_l: number
          station?: string | null
          total: number
          updated_at?: string
          vehicle?: string | null
        }
        Update: {
          assigned_route_id?: string | null
          company_id?: string
          created_at?: string
          date_iso?: string
          driver_id?: string
          driver_name?: string
          id?: string
          liters?: number
          notes?: string | null
          odometer?: number | null
          plate?: string | null
          price_per_l?: number
          station?: string | null
          total?: number
          updated_at?: string
          vehicle?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          company_id: string | null
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      route_stops: {
        Row: {
          address: string
          client_name: string | null
          company_id: string
          completed_at: string | null
          created_at: string
          id: string
          lat: number | null
          lon: number | null
          note: string | null
          route_id: string
          seq: number
          status: string
          updated_at: string
        }
        Insert: {
          address: string
          client_name?: string | null
          company_id: string
          completed_at?: string | null
          created_at?: string
          id?: string
          lat?: number | null
          lon?: number | null
          note?: string | null
          route_id: string
          seq?: number
          status?: string
          updated_at?: string
        }
        Update: {
          address?: string
          client_name?: string | null
          company_id?: string
          completed_at?: string | null
          created_at?: string
          id?: string
          lat?: number | null
          lon?: number | null
          note?: string | null
          route_id?: string
          seq?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "route_stops_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "assigned_routes"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          company_id: string
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_get_schema_sql: { Args: never; Returns: string }
      current_company_id: { Args: never; Returns: string }
      get_driver_comprovei_credentials_decrypted: {
        Args: { p_driver_id: string; p_key: string }
        Returns: {
          comprovei_user: string
          driver_id: string
          last_event_id: string
          password: string
          sync_active: boolean
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_any_admin: { Args: never; Returns: boolean }
      is_company_admin: { Args: { _company_id: string }; Returns: boolean }
      list_active_driver_comprovei_credentials_decrypted: {
        Args: { p_key: string }
        Returns: {
          comprovei_user: string
          driver_id: string
          last_event_id: string
          password: string
        }[]
      }
      set_driver_comprovei_credentials: {
        Args: {
          p_driver_id: string
          p_key: string
          p_password: string
          p_user: string
        }
        Returns: string
      }
    }
    Enums: {
      app_role: "owner" | "admin" | "motorista"
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
    Enums: {
      app_role: ["owner", "admin", "motorista"],
    },
  },
} as const
