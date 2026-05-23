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
          comprovei_external_id: string | null
          cost: number
          created_at: string
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
          status: string
          total_deliveries: number
          trip_type: string
          updated_at: string
        }
        Insert: {
          client_company_id?: string | null
          code: string
          company_id: string
          comprovei_external_id?: string | null
          cost?: number
          created_at?: string
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
          status?: string
          total_deliveries?: number
          trip_type?: string
          updated_at?: string
        }
        Update: {
          client_company_id?: string | null
          code?: string
          company_id?: string
          comprovei_external_id?: string | null
          cost?: number
          created_at?: string
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
      comprovei_config: {
        Row: {
          base_api_url: string
          base_events_url: string
          created_at: string
          enabled: boolean
          id: string
          password: string | null
          sync_interval_minutes: number
          updated_at: string
          username: string | null
        }
        Insert: {
          base_api_url?: string
          base_events_url?: string
          created_at?: string
          enabled?: boolean
          id?: string
          password?: string | null
          sync_interval_minutes?: number
          updated_at?: string
          username?: string | null
        }
        Update: {
          base_api_url?: string
          base_events_url?: string
          created_at?: string
          enabled?: boolean
          id?: string
          password?: string | null
          sync_interval_minutes?: number
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      comprovei_events: {
        Row: {
          driver_id: string | null
          event_type: string
          id: string
          ingested_at: string
          occurred_at: string | null
          payload: Json
          route_external_id: string | null
          stop_external_id: string | null
        }
        Insert: {
          driver_id?: string | null
          event_type: string
          id: string
          ingested_at?: string
          occurred_at?: string | null
          payload?: Json
          route_external_id?: string | null
          stop_external_id?: string | null
        }
        Update: {
          driver_id?: string | null
          event_type?: string
          id?: string
          ingested_at?: string
          occurred_at?: string | null
          payload?: Json
          route_external_id?: string | null
          stop_external_id?: string | null
        }
        Relationships: []
      }
      comprovei_process_times: {
        Row: {
          distance_estimated_km: number | null
          distance_traveled_km: number | null
          driver_name: string | null
          id: string
          imported_at: string
          permanence_minutes: number | null
          raw: Json
          route_external_id: string | null
          route_finished_at: string | null
          route_started_at: string | null
          sequence_executed: number | null
          sequence_original: number | null
          travel_minutes: number | null
          unload_minutes: number | null
          wait_minutes: number | null
        }
        Insert: {
          distance_estimated_km?: number | null
          distance_traveled_km?: number | null
          driver_name?: string | null
          id?: string
          imported_at?: string
          permanence_minutes?: number | null
          raw?: Json
          route_external_id?: string | null
          route_finished_at?: string | null
          route_started_at?: string | null
          sequence_executed?: number | null
          sequence_original?: number | null
          travel_minutes?: number | null
          unload_minutes?: number | null
          wait_minutes?: number | null
        }
        Update: {
          distance_estimated_km?: number | null
          distance_traveled_km?: number | null
          driver_name?: string | null
          id?: string
          imported_at?: string
          permanence_minutes?: number | null
          raw?: Json
          route_external_id?: string | null
          route_finished_at?: string | null
          route_started_at?: string | null
          sequence_executed?: number | null
          sequence_original?: number | null
          travel_minutes?: number | null
          unload_minutes?: number | null
          wait_minutes?: number | null
        }
        Relationships: []
      }
      comprovei_route_avg: {
        Row: {
          avg_arrival_base: string | null
          avg_in_transit: string | null
          driver_name: string | null
          goal_departure: string | null
          id: string
          imported_at: string
          planned_end: string | null
          route_external_id: string | null
          route_type: string | null
        }
        Insert: {
          avg_arrival_base?: string | null
          avg_in_transit?: string | null
          driver_name?: string | null
          goal_departure?: string | null
          id?: string
          imported_at?: string
          planned_end?: string | null
          route_external_id?: string | null
          route_type?: string | null
        }
        Update: {
          avg_arrival_base?: string | null
          avg_in_transit?: string | null
          driver_name?: string | null
          goal_departure?: string | null
          id?: string
          imported_at?: string
          planned_end?: string | null
          route_external_id?: string | null
          route_type?: string | null
        }
        Relationships: []
      }
      comprovei_route_window: {
        Row: {
          carrier: string | null
          driver_name: string | null
          id: string
          imported_at: string
          route_external_id: string | null
          windows: Json
        }
        Insert: {
          carrier?: string | null
          driver_name?: string | null
          id?: string
          imported_at?: string
          route_external_id?: string | null
          windows?: Json
        }
        Update: {
          carrier?: string | null
          driver_name?: string | null
          id?: string
          imported_at?: string
          route_external_id?: string | null
          windows?: Json
        }
        Relationships: []
      }
      comprovei_routes: {
        Row: {
          arrived_base_at: string | null
          delivery_count: number | null
          destination: string | null
          distance_estimated_km: number | null
          distance_traveled_km: number | null
          driver_id: string | null
          driver_name: string | null
          external_id: string
          imported_at: string
          in_transit_at: string | null
          origin: string | null
          planned_end: string | null
          planned_start: string | null
          plate: string | null
          raw: Json
          status: string | null
          updated_at: string
          vehicle: string | null
        }
        Insert: {
          arrived_base_at?: string | null
          delivery_count?: number | null
          destination?: string | null
          distance_estimated_km?: number | null
          distance_traveled_km?: number | null
          driver_id?: string | null
          driver_name?: string | null
          external_id: string
          imported_at?: string
          in_transit_at?: string | null
          origin?: string | null
          planned_end?: string | null
          planned_start?: string | null
          plate?: string | null
          raw?: Json
          status?: string | null
          updated_at?: string
          vehicle?: string | null
        }
        Update: {
          arrived_base_at?: string | null
          delivery_count?: number | null
          destination?: string | null
          distance_estimated_km?: number | null
          distance_traveled_km?: number | null
          driver_id?: string | null
          driver_name?: string | null
          external_id?: string
          imported_at?: string
          in_transit_at?: string | null
          origin?: string | null
          planned_end?: string | null
          planned_start?: string | null
          plate?: string | null
          raw?: Json
          status?: string | null
          updated_at?: string
          vehicle?: string | null
        }
        Relationships: []
      }
      comprovei_stops: {
        Row: {
          address: string | null
          distance_traveled_km: number | null
          done_at: string | null
          driver_id: string | null
          external_id: string
          imported_at: string
          occurrence: string | null
          photo_url: string | null
          raw: Json
          recipient: string | null
          route_external_id: string | null
          scheduled_at: string | null
          sequence_executed: number | null
          sequence_planned: number | null
          signature_url: string | null
          status: string | null
          tracking_url: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          distance_traveled_km?: number | null
          done_at?: string | null
          driver_id?: string | null
          external_id: string
          imported_at?: string
          occurrence?: string | null
          photo_url?: string | null
          raw?: Json
          recipient?: string | null
          route_external_id?: string | null
          scheduled_at?: string | null
          sequence_executed?: number | null
          sequence_planned?: number | null
          signature_url?: string | null
          status?: string | null
          tracking_url?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          distance_traveled_km?: number | null
          done_at?: string | null
          driver_id?: string | null
          external_id?: string
          imported_at?: string
          occurrence?: string | null
          photo_url?: string | null
          raw?: Json
          recipient?: string | null
          route_external_id?: string | null
          scheduled_at?: string | null
          sequence_executed?: number | null
          sequence_planned?: number | null
          signature_url?: string | null
          status?: string | null
          tracking_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "comprovei_stops_route_external_id_fkey"
            columns: ["route_external_id"]
            isOneToOne: false
            referencedRelation: "comprovei_routes"
            referencedColumns: ["external_id"]
          },
        ]
      }
      comprovei_sync_log: {
        Row: {
          events_count: number
          finished_at: string | null
          id: string
          message: string | null
          routes_count: number
          started_at: string
          status: string
          stops_count: number
          trigger: string
        }
        Insert: {
          events_count?: number
          finished_at?: string | null
          id?: string
          message?: string | null
          routes_count?: number
          started_at?: string
          status: string
          stops_count?: number
          trigger?: string
        }
        Update: {
          events_count?: number
          finished_at?: string | null
          id?: string
          message?: string | null
          routes_count?: number
          started_at?: string
          status?: string
          stops_count?: number
          trigger?: string
        }
        Relationships: []
      }
      comprovei_sync_state: {
        Row: {
          events_synced: number
          id: string
          last_event_id: string | null
          last_message: string | null
          last_status: string
          last_sync_at: string | null
          routes_synced: number
          stops_synced: number
          updated_at: string
        }
        Insert: {
          events_synced?: number
          id?: string
          last_event_id?: string | null
          last_message?: string | null
          last_status?: string
          last_sync_at?: string | null
          routes_synced?: number
          stops_synced?: number
          updated_at?: string
        }
        Update: {
          events_synced?: number
          id?: string
          last_event_id?: string | null
          last_message?: string | null
          last_status?: string
          last_sync_at?: string | null
          routes_synced?: number
          stops_synced?: number
          updated_at?: string
        }
        Relationships: []
      }
      driver_comprovei_credentials: {
        Row: {
          comprovei_user: string
          created_at: string
          driver_id: string
          events_synced: number
          id: string
          last_event_id: string | null
          last_message: string | null
          last_status: string
          last_sync_at: string | null
          password_encrypted: string
          routes_synced: number
          stops_synced: number
          sync_active: boolean
          updated_at: string
        }
        Insert: {
          comprovei_user: string
          created_at?: string
          driver_id: string
          events_synced?: number
          id?: string
          last_event_id?: string | null
          last_message?: string | null
          last_status?: string
          last_sync_at?: string | null
          password_encrypted: string
          routes_synced?: number
          stops_synced?: number
          sync_active?: boolean
          updated_at?: string
        }
        Update: {
          comprovei_user?: string
          created_at?: string
          driver_id?: string
          events_synced?: number
          id?: string
          last_event_id?: string | null
          last_message?: string | null
          last_status?: string
          last_sync_at?: string | null
          password_encrypted?: string
          routes_synced?: number
          stops_synced?: number
          sync_active?: boolean
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
