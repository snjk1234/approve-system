export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      checkout_sessions: {
        Row: {
          created: string
          id: string
          metadata: Json | null
          mode: Database["public"]["Enums"]["checkout_mode"] | null
          payment_status:
            | Database["public"]["Enums"]["checkout_payment_status"]
            | null
          price_id: string | null
          quantity: number | null
          status: Database["public"]["Enums"]["checkout_status"] | null
          user_id: string
        }
        Insert: {
          created?: string
          id: string
          metadata?: Json | null
          mode?: Database["public"]["Enums"]["checkout_mode"] | null
          payment_status?:
            | Database["public"]["Enums"]["checkout_payment_status"]
            | null
          price_id?: string | null
          quantity?: number | null
          status?: Database["public"]["Enums"]["checkout_status"] | null
          user_id: string
        }
        Update: {
          created?: string
          id?: string
          metadata?: Json | null
          mode?: Database["public"]["Enums"]["checkout_mode"] | null
          payment_status?:
            | Database["public"]["Enums"]["checkout_payment_status"]
            | null
          price_id?: string | null
          quantity?: number | null
          status?: Database["public"]["Enums"]["checkout_status"] | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "checkout_sessions_price_id_fkey"
            columns: ["price_id"]
            isOneToOne: false
            referencedRelation: "prices"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          id: string
          stripe_customer_id: string | null
        }
        Insert: {
          id: string
          stripe_customer_id?: string | null
        }
        Update: {
          id?: string
          stripe_customer_id?: string | null
        }
        Relationships: []
      }
      prices: {
        Row: {
          active: boolean | null
          currency: string | null
          description: string | null
          id: string
          interval: Database["public"]["Enums"]["pricing_plan_interval"] | null
          interval_count: number | null
          metadata: Json | null
          product_id: string | null
          trial_period_days: number | null
          type: Database["public"]["Enums"]["pricing_type"] | null
          unit_amount: number | null
        }
        Insert: {
          active?: boolean | null
          currency?: string | null
          description?: string | null
          id: string
          interval?: Database["public"]["Enums"]["pricing_plan_interval"] | null
          interval_count?: number | null
          metadata?: Json | null
          product_id?: string | null
          trial_period_days?: number | null
          type?: Database["public"]["Enums"]["pricing_type"] | null
          unit_amount?: number | null
        }
        Update: {
          active?: boolean | null
          currency?: string | null
          description?: string | null
          id?: string
          interval?: Database["public"]["Enums"]["pricing_plan_interval"] | null
          interval_count?: number | null
          metadata?: Json | null
          product_id?: string | null
          trial_period_days?: number | null
          type?: Database["public"]["Enums"]["pricing_type"] | null
          unit_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "prices_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          active: boolean | null
          description: string | null
          id: string
          image: string | null
          metadata: Json | null
          name: string | null
        }
        Insert: {
          active?: boolean | null
          description?: string | null
          id: string
          image?: string | null
          metadata?: Json | null
          name?: string | null
        }
        Update: {
          active?: boolean | null
          description?: string | null
          id?: string
          image?: string | null
          metadata?: Json | null
          name?: string | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          cancel_at: string | null
          cancel_at_period_end: boolean | null
          canceled_at: string | null
          created: string
          current_period_end: string
          current_period_start: string
          ended_at: string | null
          id: string
          metadata: Json | null
          price_id: string | null
          quantity: number | null
          status: Database["public"]["Enums"]["subscription_status"] | null
          trial_end: string | null
          trial_start: string | null
          user_id: string
        }
        Insert: {
          cancel_at?: string | null
          cancel_at_period_end?: boolean | null
          canceled_at?: string | null
          created?: string
          current_period_end?: string
          current_period_start?: string
          ended_at?: string | null
          id: string
          metadata?: Json | null
          price_id?: string | null
          quantity?: number | null
          status?: Database["public"]["Enums"]["subscription_status"] | null
          trial_end?: string | null
          trial_start?: string | null
          user_id: string
        }
        Update: {
          cancel_at?: string | null
          cancel_at_period_end?: boolean | null
          canceled_at?: string | null
          created?: string
          current_period_end?: string
          current_period_start?: string
          ended_at?: string | null
          id?: string
          metadata?: Json | null
          price_id?: string | null
          quantity?: number | null
          status?: Database["public"]["Enums"]["subscription_status"] | null
          trial_end?: string | null
          trial_start?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_price_id_fkey"
            columns: ["price_id"]
            isOneToOne: false
            referencedRelation: "prices"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          billing_address: Json | null
          full_name: string | null
          id: string
          payment_method: Json | null
          email: string | null
          phone: string | null
          department_id: string | null
          role: string | null
          is_active: boolean | null
          created_at: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          billing_address?: Json | null
          full_name?: string | null
          id: string
          payment_method?: Json | null
          email?: string | null
          phone?: string | null
          department_id?: string | null
          role?: string | null
          is_active?: boolean | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          billing_address?: Json | null
          full_name?: string | null
          id?: string
          payment_method?: Json | null
          email?: string | null
          phone?: string | null
          department_id?: string | null
          role?: string | null
          is_active?: boolean | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      departments: {
        Row: {
          id: string
          name: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          created_at?: string
        }
        Relationships: []
      }
      documents: {
        Row: {
          id: string
          request_number: number
          title: string
          description: string | null
          creator_id: string
          file_url: string | null
          file_name: string | null
          status: 'pending' | 'in_progress' | 'paused' | 'completed' | 'cancelled'
          is_archived: boolean
          archived_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          request_number?: number
          title: string
          description?: string | null
          creator_id: string
          file_url?: string | null
          file_name?: string | null
          status?: 'pending' | 'in_progress' | 'paused' | 'completed' | 'cancelled'
          is_archived?: boolean
          archived_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          request_number?: number
          title?: string
          description?: string | null
          creator_id?: string
          file_url?: string | null
          file_name?: string | null
          status?: 'pending' | 'in_progress' | 'paused' | 'completed' | 'cancelled'
          is_archived?: boolean
          archived_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      approval_steps: {
        Row: {
          id: string
          document_id: string
          approver_id: string
          sequence: number
          status: 'waiting' | 'pending' | 'approved' | 'rejected'
          comment: string | null
          acted_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          document_id: string
          approver_id: string
          sequence: number
          status?: 'waiting' | 'pending' | 'approved' | 'rejected'
          comment?: string | null
          acted_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          document_id?: string
          approver_id?: string
          sequence?: number
          status?: 'waiting' | 'pending' | 'approved' | 'rejected'
          comment?: string | null
          acted_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: 'approval_request' | 'approved' | 'rejected' | 'memo' | 'completed' | 'message'
          title: string
          body: string | null
          link: string | null
          is_read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: 'approval_request' | 'approved' | 'rejected' | 'memo' | 'completed' | 'message'
          title: string
          body?: string | null
          link?: string | null
          is_read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: 'approval_request' | 'approved' | 'rejected' | 'memo' | 'completed' | 'message'
          title?: string
          body?: string | null
          link?: string | null
          is_read?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      chats: {
        Row: {
          id: string
          created_by: string
          created_at: string
          type: "private" | "group" | null
          name: string | null
          avatar_url: string | null
          pinned_message_id: string | null
        }
        Insert: {
          id?: string
          created_by: string
          created_at?: string
          type?: "private" | "group" | null
          name?: string | null
          avatar_url?: string | null
          pinned_message_id?: string | null
        }
        Update: {
          id?: string
          created_by?: string
          created_at?: string
          type?: "private" | "group" | null
          name?: string | null
          avatar_url?: string | null
          pinned_message_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chats_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      chat_participants: {
        Row: {
          id: string
          chat_id: string
          user_id: string
          joined_at: string
          role: "admin" | "member" | null
          folder: "all" | "personal" | "work" | "unread" | "archived" | null
        }
        Insert: {
          id?: string
          chat_id: string
          user_id: string
          joined_at?: string
          role?: "admin" | "member" | null
          folder?: "all" | "personal" | "work" | "unread" | "archived" | null
        }
        Update: {
          id?: string
          chat_id?: string
          user_id?: string
          joined_at?: string
          role?: "admin" | "member" | null
          folder?: "all" | "personal" | "work" | "unread" | "archived" | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_participants_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      messages: {
        Row: {
          id: string
          chat_id: string
          sender_id: string
          content: string | null
          file_url: string | null
          file_name: string | null
          is_read: boolean
          created_at: string
          reply_to_id: string | null
          reactions: Json | null
          deleted_for_all: boolean
          voice_url: string | null
          message_type: "text" | "voice" | "image" | "file" | "link" | null
          link_preview: Json | null
          expires_at: string | null
        }
        Insert: {
          id?: string
          chat_id: string
          sender_id: string
          content?: string | null
          file_url?: string | null
          file_name?: string | null
          is_read?: boolean
          created_at?: string
          reply_to_id?: string | null
          reactions?: Json | null
          deleted_for_all?: boolean
          voice_url?: string | null
          message_type?: "text" | "voice" | "image" | "file" | "link" | null
          link_preview?: Json | null
          expires_at?: string | null
        }
        Update: {
          id?: string
          chat_id?: string
          sender_id?: string
          content?: string | null
          file_url?: string | null
          file_name?: string | null
          is_read?: boolean
          created_at?: string
          reply_to_id?: string | null
          reactions?: Json | null
          deleted_for_all?: boolean
          voice_url?: string | null
          message_type?: "text" | "voice" | "image" | "file" | "link" | null
          link_preview?: Json | null
          expires_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      discussion_memos: {
        Row: {
          id: string
          document_id: string
          objector_id: string
          creator_id: string
          status: 'open' | 'resolved' | 'cancelled'
          created_at: string
          resolved_at: string | null
        }
        Insert: {
          id?: string
          document_id: string
          objector_id: string
          creator_id: string
          status?: 'open' | 'resolved' | 'cancelled'
          created_at?: string
          resolved_at?: string | null
        }
        Update: {
          id?: string
          document_id?: string
          objector_id?: string
          creator_id?: string
          status?: 'open' | 'resolved' | 'cancelled'
          created_at?: string
          resolved_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "discussion_memos_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          }
        ]
      }
      memo_messages: {
        Row: {
          id: string
          memo_id: string
          sender_id: string
          content: string | null
          file_url: string | null
          file_name: string | null
          created_at: string
        }
        Insert: {
          id?: string
          memo_id: string
          sender_id: string
          content?: string | null
          file_url?: string | null
          file_name?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          memo_id?: string
          sender_id?: string
          content?: string | null
          file_url?: string | null
          file_name?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "memo_messages_memo_id_fkey"
            columns: ["memo_id"]
            isOneToOne: false
            referencedRelation: "discussion_memos"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      checkout_mode: "payment" | "setup" | "subscription"
      checkout_payment_status: "paid" | "unpaid" | "no_payment_required"
      checkout_status: "complete" | "expired" | "open"
      pricing_plan_interval: "day" | "week" | "month" | "year"
      pricing_type: "one_time" | "recurring"
      subscription_status:
        | "trialing"
        | "active"
        | "canceled"
        | "incomplete"
        | "incomplete_expired"
        | "past_due"
        | "unpaid"
        | "paused"
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
      checkout_mode: ["payment", "setup", "subscription"],
      checkout_payment_status: ["paid", "unpaid", "no_payment_required"],
      checkout_status: ["complete", "expired", "open"],
      pricing_plan_interval: ["day", "week", "month", "year"],
      pricing_type: ["one_time", "recurring"],
      subscription_status: [
        "trialing",
        "active",
        "canceled",
        "incomplete",
        "incomplete_expired",
        "past_due",
        "unpaid",
        "paused",
      ],
    },
  },
} as const

