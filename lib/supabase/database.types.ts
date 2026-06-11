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
      attendance_logs: {
        Row: {
          attendance_date: string
          check_in_accuracy_m: number | null
          check_in_address: string | null
          check_in_lat: number | null
          check_in_lng: number | null
          check_in_time: string | null
          check_out_address: string | null
          check_out_lat: number | null
          check_out_lng: number | null
          check_out_time: string | null
          created_at: string | null
          id: string
          is_manually_created: boolean | null
          leave_type: string | null
          overridden_by: string | null
          override_reason: string | null
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          attendance_date: string
          check_in_accuracy_m?: number | null
          check_in_address?: string | null
          check_in_lat?: number | null
          check_in_lng?: number | null
          check_in_time?: string | null
          check_out_address?: string | null
          check_out_lat?: number | null
          check_out_lng?: number | null
          check_out_time?: string | null
          created_at?: string | null
          id?: string
          is_manually_created?: boolean | null
          leave_type?: string | null
          overridden_by?: string | null
          override_reason?: string | null
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          attendance_date?: string
          check_in_accuracy_m?: number | null
          check_in_address?: string | null
          check_in_lat?: number | null
          check_in_lng?: number | null
          check_in_time?: string | null
          check_out_address?: string | null
          check_out_lat?: number | null
          check_out_lng?: number | null
          check_out_time?: string | null
          created_at?: string | null
          id?: string
          is_manually_created?: boolean | null
          leave_type?: string | null
          overridden_by?: string | null
          override_reason?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_logs_overridden_by_fkey"
            columns: ["overridden_by"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
        ]
      }
      benchmarks: {
        Row: {
          created_at: string | null
          id: string
          industry: string
          metric_name: string
          metric_value: number | null
          period_year: number | null
          sample_size: number | null
          source: string | null
          sub_industry: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          industry: string
          metric_name: string
          metric_value?: number | null
          period_year?: number | null
          sample_size?: number | null
          source?: string | null
          sub_industry?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          industry?: string
          metric_name?: string
          metric_value?: number | null
          period_year?: number | null
          sample_size?: number | null
          source?: string | null
          sub_industry?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      billing_entities: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          bank_account_name: string | null
          bank_account_number: string | null
          bank_ifsc: string | null
          bank_name: string | null
          city: string | null
          created_at: string
          default_profit_centre_code: string | null
          gstin: string | null
          id: string
          invoice_prefix: string
          is_active: boolean
          legal_name: string | null
          name: string
          pan: string | null
          pincode: string | null
          signing_authority_designation: string | null
          signing_authority_name: string | null
          state: string | null
          updated_at: string
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_ifsc?: string | null
          bank_name?: string | null
          city?: string | null
          created_at?: string
          default_profit_centre_code?: string | null
          gstin?: string | null
          id?: string
          invoice_prefix: string
          is_active?: boolean
          legal_name?: string | null
          name: string
          pan?: string | null
          pincode?: string | null
          signing_authority_designation?: string | null
          signing_authority_name?: string | null
          state?: string | null
          updated_at?: string
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_ifsc?: string | null
          bank_name?: string | null
          city?: string | null
          created_at?: string
          default_profit_centre_code?: string | null
          gstin?: string | null
          id?: string
          invoice_prefix?: string
          is_active?: boolean
          legal_name?: string | null
          name?: string
          pan?: string | null
          pincode?: string | null
          signing_authority_designation?: string | null
          signing_authority_name?: string | null
          state?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_entities_default_profit_centre_code_fkey"
            columns: ["default_profit_centre_code"]
            isOneToOne: false
            referencedRelation: "profit_centres"
            referencedColumns: ["code"]
          },
        ]
      }
      bizlens_data: {
        Row: {
          admin_general: number | null
          ap_0_30: number | null
          ap_31_60: number | null
          ap_61_90: number | null
          ap_90_plus: number | null
          ap_ageing_available: boolean | null
          ap_strategic: boolean | null
          ar_0_30: number | null
          ar_31_60: number | null
          ar_61_90: number | null
          ar_90_plus: number | null
          ar_ageing_available: boolean | null
          bs_accounts_payable: number | null
          bs_accounts_receivable: number | null
          bs_cash: number | null
          bs_current_liabilities_other: number | null
          bs_equity: number | null
          bs_inventory: number | null
          bs_loans_advances: number | null
          bs_long_term_borrowings: number | null
          bs_other_current_assets: number | null
          bs_other_liabilities: number | null
          bs_short_term_borrowings: number | null
          client_id: string
          created_at: string | null
          created_by: string | null
          customer_credit_policy: string | null
          direct_labor: number | null
          direct_materials: number | null
          fc_includes_interest: boolean | null
          fixed_costs: number
          id: string
          interest_expense: number | null
          inventory_change: number | null
          is_current: boolean | null
          marketing: number | null
          months_covered: number
          non_cash_expenses: number | null
          other_income: number | null
          other_variable: number | null
          packaging_logistics: number | null
          period_month: number | null
          period_year: number
          purchases: number | null
          realisable_fixed_assets: number | null
          rent_lease: number | null
          salaries_fixed: number | null
          sales_revenue: number
          status: string | null
          superseded_by: string | null
          supplier_credit_policy: string | null
          target_profit: number | null
          top_customer_pct: number | null
          top_supplier_pct: number | null
          updated_at: string | null
          utilities: number | null
          variable_costs: number
          wc_intentional: boolean | null
        }
        Insert: {
          admin_general?: number | null
          ap_0_30?: number | null
          ap_31_60?: number | null
          ap_61_90?: number | null
          ap_90_plus?: number | null
          ap_ageing_available?: boolean | null
          ap_strategic?: boolean | null
          ar_0_30?: number | null
          ar_31_60?: number | null
          ar_61_90?: number | null
          ar_90_plus?: number | null
          ar_ageing_available?: boolean | null
          bs_accounts_payable?: number | null
          bs_accounts_receivable?: number | null
          bs_cash?: number | null
          bs_current_liabilities_other?: number | null
          bs_equity?: number | null
          bs_inventory?: number | null
          bs_loans_advances?: number | null
          bs_long_term_borrowings?: number | null
          bs_other_current_assets?: number | null
          bs_other_liabilities?: number | null
          bs_short_term_borrowings?: number | null
          client_id: string
          created_at?: string | null
          created_by?: string | null
          customer_credit_policy?: string | null
          direct_labor?: number | null
          direct_materials?: number | null
          fc_includes_interest?: boolean | null
          fixed_costs?: number
          id?: string
          interest_expense?: number | null
          inventory_change?: number | null
          is_current?: boolean | null
          marketing?: number | null
          months_covered?: number
          non_cash_expenses?: number | null
          other_income?: number | null
          other_variable?: number | null
          packaging_logistics?: number | null
          period_month?: number | null
          period_year: number
          purchases?: number | null
          realisable_fixed_assets?: number | null
          rent_lease?: number | null
          salaries_fixed?: number | null
          sales_revenue?: number
          status?: string | null
          superseded_by?: string | null
          supplier_credit_policy?: string | null
          target_profit?: number | null
          top_customer_pct?: number | null
          top_supplier_pct?: number | null
          updated_at?: string | null
          utilities?: number | null
          variable_costs?: number
          wc_intentional?: boolean | null
        }
        Update: {
          admin_general?: number | null
          ap_0_30?: number | null
          ap_31_60?: number | null
          ap_61_90?: number | null
          ap_90_plus?: number | null
          ap_ageing_available?: boolean | null
          ap_strategic?: boolean | null
          ar_0_30?: number | null
          ar_31_60?: number | null
          ar_61_90?: number | null
          ar_90_plus?: number | null
          ar_ageing_available?: boolean | null
          bs_accounts_payable?: number | null
          bs_accounts_receivable?: number | null
          bs_cash?: number | null
          bs_current_liabilities_other?: number | null
          bs_equity?: number | null
          bs_inventory?: number | null
          bs_loans_advances?: number | null
          bs_long_term_borrowings?: number | null
          bs_other_current_assets?: number | null
          bs_other_liabilities?: number | null
          bs_short_term_borrowings?: number | null
          client_id?: string
          created_at?: string | null
          created_by?: string | null
          customer_credit_policy?: string | null
          direct_labor?: number | null
          direct_materials?: number | null
          fc_includes_interest?: boolean | null
          fixed_costs?: number
          id?: string
          interest_expense?: number | null
          inventory_change?: number | null
          is_current?: boolean | null
          marketing?: number | null
          months_covered?: number
          non_cash_expenses?: number | null
          other_income?: number | null
          other_variable?: number | null
          packaging_logistics?: number | null
          period_month?: number | null
          period_year?: number
          purchases?: number | null
          realisable_fixed_assets?: number | null
          rent_lease?: number | null
          salaries_fixed?: number | null
          sales_revenue?: number
          status?: string | null
          superseded_by?: string | null
          supplier_credit_policy?: string | null
          target_profit?: number | null
          top_customer_pct?: number | null
          top_supplier_pct?: number | null
          updated_at?: string | null
          utilities?: number | null
          variable_costs?: number
          wc_intentional?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "bizlens_data_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bizlens_data_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bizlens_data_superseded_by_fkey"
            columns: ["superseded_by"]
            isOneToOne: false
            referencedRelation: "bizlens_data"
            referencedColumns: ["id"]
          },
        ]
      }
      bizlens_period_snapshots: {
        Row: {
          client_id: string
          created_at: string
          created_by: string | null
          data: Json
          id: string
          months_covered: number
          period_month: number
          period_year: number
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          created_by?: string | null
          data?: Json
          id?: string
          months_covered?: number
          period_month: number
          period_year: number
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          created_by?: string | null
          data?: Json
          id?: string
          months_covered?: number
          period_month?: number
          period_year?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bizlens_period_snapshots_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bizlens_period_snapshots_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
        ]
      }
      client_communication_log: {
        Row: {
          attachments: string[] | null
          client_id: string
          communication_date: string
          communication_type: string
          created_at: string | null
          created_by: string
          follow_up_date: string | null
          follow_up_details: string | null
          follow_up_needed: boolean | null
          from_user_id: string | null
          id: string
          subject: string | null
          summary: string | null
          to_contact_person: string | null
        }
        Insert: {
          attachments?: string[] | null
          client_id: string
          communication_date: string
          communication_type: string
          created_at?: string | null
          created_by: string
          follow_up_date?: string | null
          follow_up_details?: string | null
          follow_up_needed?: boolean | null
          from_user_id?: string | null
          id?: string
          subject?: string | null
          summary?: string | null
          to_contact_person?: string | null
        }
        Update: {
          attachments?: string[] | null
          client_id?: string
          communication_date?: string
          communication_type?: string
          created_at?: string | null
          created_by?: string
          follow_up_date?: string | null
          follow_up_details?: string | null
          follow_up_needed?: boolean | null
          from_user_id?: string | null
          id?: string
          subject?: string | null
          summary?: string | null
          to_contact_person?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_communication_log_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_communication_log_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_communication_log_from_user_id_fkey"
            columns: ["from_user_id"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
        ]
      }
      client_compliance_profiles: {
        Row: {
          agm_date: string | null
          annual_turnover_estimate: number | null
          client_id: string
          entity_type: string | null
          fy_start_month: number
          gst_filing_frequency: string | null
          is_advance_tax_applicable: boolean
          is_audit_applicable: boolean
          is_esi_applicable: boolean
          is_pf_applicable: boolean
          is_pt_applicable: boolean
          is_roc_applicable: boolean
          is_tcs_collector: boolean
          is_tds_deductor: boolean
          is_transfer_pricing: boolean
          notes: string | null
          pt_state: string | null
          state_group: string | null
          updated_at: string
        }
        Insert: {
          agm_date?: string | null
          annual_turnover_estimate?: number | null
          client_id: string
          entity_type?: string | null
          fy_start_month?: number
          gst_filing_frequency?: string | null
          is_advance_tax_applicable?: boolean
          is_audit_applicable?: boolean
          is_esi_applicable?: boolean
          is_pf_applicable?: boolean
          is_pt_applicable?: boolean
          is_roc_applicable?: boolean
          is_tcs_collector?: boolean
          is_tds_deductor?: boolean
          is_transfer_pricing?: boolean
          notes?: string | null
          pt_state?: string | null
          state_group?: string | null
          updated_at?: string
        }
        Update: {
          agm_date?: string | null
          annual_turnover_estimate?: number | null
          client_id?: string
          entity_type?: string | null
          fy_start_month?: number
          gst_filing_frequency?: string | null
          is_advance_tax_applicable?: boolean
          is_audit_applicable?: boolean
          is_esi_applicable?: boolean
          is_pf_applicable?: boolean
          is_pt_applicable?: boolean
          is_roc_applicable?: boolean
          is_tcs_collector?: boolean
          is_tds_deductor?: boolean
          is_transfer_pricing?: boolean
          notes?: string | null
          pt_state?: string | null
          state_group?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_compliance_profiles_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_feature_flags: {
        Row: {
          client_id: string
          created_at: string | null
          feature_enabled: boolean | null
          feature_key: string
          id: string
          sub_service_id: string | null
          updated_at: string | null
        }
        Insert: {
          client_id: string
          created_at?: string | null
          feature_enabled?: boolean | null
          feature_key: string
          id?: string
          sub_service_id?: string | null
          updated_at?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string | null
          feature_enabled?: boolean | null
          feature_key?: string
          id?: string
          sub_service_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_feature_flags_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_feature_flags_sub_service_id_fkey"
            columns: ["sub_service_id"]
            isOneToOne: false
            referencedRelation: "sub_services"
            referencedColumns: ["id"]
          },
        ]
      }
      client_groups: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_deleted: boolean | null
          name: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_deleted?: boolean | null
          name: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_deleted?: boolean | null
          name?: string
        }
        Relationships: []
      }
      client_import_batches: {
        Row: {
          error_rows: number
          errors: Json | null
          id: string
          skipped_rows: number
          source_filename: string | null
          status: string
          successful_rows: number
          total_rows: number
          uploaded_at: string | null
          uploaded_by: string
        }
        Insert: {
          error_rows?: number
          errors?: Json | null
          id?: string
          skipped_rows?: number
          source_filename?: string | null
          status?: string
          successful_rows?: number
          total_rows: number
          uploaded_at?: string | null
          uploaded_by: string
        }
        Update: {
          error_rows?: number
          errors?: Json | null
          id?: string
          skipped_rows?: number
          source_filename?: string | null
          status?: string
          successful_rows?: number
          total_rows?: number
          uploaded_at?: string | null
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_import_batches_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
        ]
      }
      client_lifecycle_stage: {
        Row: {
          bizlens_date: string | null
          caas_date: string | null
          client_id: string
          current_stage: string
          id: string
          lead_date: string | null
          updated_at: string | null
          vcfo_date: string | null
        }
        Insert: {
          bizlens_date?: string | null
          caas_date?: string | null
          client_id: string
          current_stage: string
          id?: string
          lead_date?: string | null
          updated_at?: string | null
          vcfo_date?: string | null
        }
        Update: {
          bizlens_date?: string | null
          caas_date?: string | null
          client_id?: string
          current_stage?: string
          id?: string
          lead_date?: string | null
          updated_at?: string | null
          vcfo_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_lifecycle_stage_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_portal_visibility: {
        Row: {
          client_id: string
          id: string
          is_enabled: boolean | null
          module_key: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          client_id: string
          id?: string
          is_enabled?: boolean | null
          module_key: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          client_id?: string
          id?: string
          is_enabled?: boolean | null
          module_key?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_portal_visibility_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_portal_visibility_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
        ]
      }
      client_services: {
        Row: {
          access_level: string | null
          client_id: string
          created_at: string | null
          end_date: string | null
          fee_amount: number | null
          id: string
          is_active: boolean | null
          service_head_id: string | null
          service_id: string
          start_date: string
          updated_at: string | null
        }
        Insert: {
          access_level?: string | null
          client_id: string
          created_at?: string | null
          end_date?: string | null
          fee_amount?: number | null
          id?: string
          is_active?: boolean | null
          service_head_id?: string | null
          service_id: string
          start_date: string
          updated_at?: string | null
        }
        Update: {
          access_level?: string | null
          client_id?: string
          created_at?: string | null
          end_date?: string | null
          fee_amount?: number | null
          id?: string
          is_active?: boolean | null
          service_head_id?: string | null
          service_id?: string
          start_date?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_services_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_services_service_head_id_fkey"
            columns: ["service_head_id"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_services_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      client_sub_services: {
        Row: {
          access_level: string | null
          client_id: string
          created_at: string | null
          fee_amount: number | null
          id: string
          is_active: boolean | null
          sub_service_id: string
          updated_at: string | null
        }
        Insert: {
          access_level?: string | null
          client_id: string
          created_at?: string | null
          fee_amount?: number | null
          id?: string
          is_active?: boolean | null
          sub_service_id: string
          updated_at?: string | null
        }
        Update: {
          access_level?: string | null
          client_id?: string
          created_at?: string | null
          fee_amount?: number | null
          id?: string
          is_active?: boolean | null
          sub_service_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_sub_services_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_sub_services_sub_service_id_fkey"
            columns: ["sub_service_id"]
            isOneToOne: false
            referencedRelation: "sub_services"
            referencedColumns: ["id"]
          },
        ]
      }
      client_users: {
        Row: {
          client_id: string
          created_at: string | null
          id: string
          is_active: boolean | null
          is_deleted: boolean | null
          role_in_client: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          client_id: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_deleted?: boolean | null
          role_in_client?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          client_id?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_deleted?: boolean | null
          role_in_client?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_users_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_users_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address_line_1: string | null
          address_line_2: string | null
          business_name: string
          business_registration_number: string | null
          category: string | null
          city: string | null
          contract_renewal_date: string | null
          contract_value_annual: number | null
          created_at: string | null
          default_billing_entity_id: string | null
          default_cost_centre_code: string | null
          default_profit_centre_code: string | null
          deleted_at: string | null
          deleted_by: string | null
          group_id: string | null
          gstin: string | null
          id: string
          industry: string | null
          is_deleted: boolean | null
          lifecycle_stage: string | null
          notes: string | null
          pan: string | null
          pincode: string | null
          plan_tier: string | null
          portal_access_level: string | null
          portal_enabled: boolean | null
          portal_modules: Json | null
          primary_contact_email: string | null
          primary_contact_person: string | null
          primary_contact_phone: string | null
          primary_owner_id: string | null
          priority_tier: string | null
          residential_status: string | null
          start_date: string | null
          state: string | null
          updated_at: string | null
        }
        Insert: {
          address_line_1?: string | null
          address_line_2?: string | null
          business_name: string
          business_registration_number?: string | null
          category?: string | null
          city?: string | null
          contract_renewal_date?: string | null
          contract_value_annual?: number | null
          created_at?: string | null
          default_billing_entity_id?: string | null
          default_cost_centre_code?: string | null
          default_profit_centre_code?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          group_id?: string | null
          gstin?: string | null
          id?: string
          industry?: string | null
          is_deleted?: boolean | null
          lifecycle_stage?: string | null
          notes?: string | null
          pan?: string | null
          pincode?: string | null
          plan_tier?: string | null
          portal_access_level?: string | null
          portal_enabled?: boolean | null
          portal_modules?: Json | null
          primary_contact_email?: string | null
          primary_contact_person?: string | null
          primary_contact_phone?: string | null
          primary_owner_id?: string | null
          priority_tier?: string | null
          residential_status?: string | null
          start_date?: string | null
          state?: string | null
          updated_at?: string | null
        }
        Update: {
          address_line_1?: string | null
          address_line_2?: string | null
          business_name?: string
          business_registration_number?: string | null
          category?: string | null
          city?: string | null
          contract_renewal_date?: string | null
          contract_value_annual?: number | null
          created_at?: string | null
          default_billing_entity_id?: string | null
          default_cost_centre_code?: string | null
          default_profit_centre_code?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          group_id?: string | null
          gstin?: string | null
          id?: string
          industry?: string | null
          is_deleted?: boolean | null
          lifecycle_stage?: string | null
          notes?: string | null
          pan?: string | null
          pincode?: string | null
          plan_tier?: string | null
          portal_access_level?: string | null
          portal_enabled?: boolean | null
          portal_modules?: Json | null
          primary_contact_email?: string | null
          primary_contact_person?: string | null
          primary_contact_phone?: string | null
          primary_owner_id?: string | null
          priority_tier?: string | null
          residential_status?: string | null
          start_date?: string | null
          state?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_default_billing_entity_id_fkey"
            columns: ["default_billing_entity_id"]
            isOneToOne: false
            referencedRelation: "billing_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_default_cost_centre_code_fkey"
            columns: ["default_cost_centre_code"]
            isOneToOne: false
            referencedRelation: "cost_centres"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "clients_default_profit_centre_code_fkey"
            columns: ["default_profit_centre_code"]
            isOneToOne: false
            referencedRelation: "profit_centres"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "clients_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "client_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_primary_owner_id_fkey"
            columns: ["primary_owner_id"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_calendar_events: {
        Row: {
          client_id: string
          deleted_at: string | null
          deleted_by: string | null
          due_date: string
          generated_at: string
          id: string
          is_deleted: boolean
          period_label: string
          rule_code: string
          rule_id: string | null
          status: string
          sub_service_id: string | null
          task_id: string | null
        }
        Insert: {
          client_id: string
          deleted_at?: string | null
          deleted_by?: string | null
          due_date: string
          generated_at?: string
          id?: string
          is_deleted?: boolean
          period_label: string
          rule_code: string
          rule_id?: string | null
          status?: string
          sub_service_id?: string | null
          task_id?: string | null
        }
        Update: {
          client_id?: string
          deleted_at?: string | null
          deleted_by?: string | null
          due_date?: string
          generated_at?: string
          id?: string
          is_deleted?: boolean
          period_label?: string
          rule_code?: string
          rule_id?: string | null
          status?: string
          sub_service_id?: string | null
          task_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "compliance_calendar_events_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_calendar_events_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_calendar_events_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "compliance_calendar_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_calendar_events_sub_service_id_fkey"
            columns: ["sub_service_id"]
            isOneToOne: false
            referencedRelation: "sub_services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_calendar_events_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_calendar_rules: {
        Row: {
          applies_when: Json
          created_at: string
          description: string | null
          display_name: string
          due_date_formula: string | null
          due_day: number | null
          due_month_offset: number
          id: string
          is_active: boolean
          periodicity: string
          reminder_days: number[]
          rule_code: string
          service_kind: string
          sub_service_id: string | null
          updated_at: string
        }
        Insert: {
          applies_when?: Json
          created_at?: string
          description?: string | null
          display_name: string
          due_date_formula?: string | null
          due_day?: number | null
          due_month_offset?: number
          id?: string
          is_active?: boolean
          periodicity: string
          reminder_days?: number[]
          rule_code: string
          service_kind: string
          sub_service_id?: string | null
          updated_at?: string
        }
        Update: {
          applies_when?: Json
          created_at?: string
          description?: string | null
          display_name?: string
          due_date_formula?: string | null
          due_day?: number | null
          due_month_offset?: number
          id?: string
          is_active?: boolean
          periodicity?: string
          reminder_days?: number[]
          rule_code?: string
          service_kind?: string
          sub_service_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "compliance_calendar_rules_sub_service_id_fkey"
            columns: ["sub_service_id"]
            isOneToOne: false
            referencedRelation: "sub_services"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_insights: {
        Row: {
          benchmark_value: number | null
          client_id: string
          created_at: string | null
          headline: string
          id: string
          insight_type: string
          narrative: string
          period_month: number | null
          period_year: number | null
          raw_value: number | null
          recommended_action: string | null
          severity: string | null
          variance: number | null
        }
        Insert: {
          benchmark_value?: number | null
          client_id: string
          created_at?: string | null
          headline: string
          id?: string
          insight_type: string
          narrative: string
          period_month?: number | null
          period_year?: number | null
          raw_value?: number | null
          recommended_action?: string | null
          severity?: string | null
          variance?: number | null
        }
        Update: {
          benchmark_value?: number | null
          client_id?: string
          created_at?: string | null
          headline?: string
          id?: string
          insight_type?: string
          narrative?: string
          period_month?: number | null
          period_year?: number | null
          raw_value?: number | null
          recommended_action?: string | null
          severity?: string | null
          variance?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "compliance_insights_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_status: {
        Row: {
          ack_number: string | null
          client_id: string
          days_to_deadline: number | null
          due_date: string | null
          filed_date: string | null
          filing_type: string
          id: string
          is_deleted: boolean
          is_overdue: boolean | null
          period_identifier: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          ack_number?: string | null
          client_id: string
          days_to_deadline?: number | null
          due_date?: string | null
          filed_date?: string | null
          filing_type: string
          id?: string
          is_deleted?: boolean
          is_overdue?: boolean | null
          period_identifier?: string | null
          status: string
          updated_at?: string | null
        }
        Update: {
          ack_number?: string | null
          client_id?: string
          days_to_deadline?: number | null
          due_date?: string | null
          filed_date?: string | null
          filing_type?: string
          id?: string
          is_deleted?: boolean
          is_overdue?: boolean | null
          period_identifier?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "compliance_status_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      cost_centres: {
        Row: {
          code: string
          created_at: string
          description: string | null
          is_active: boolean
          name: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          is_active?: boolean
          name: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
      credentials: {
        Row: {
          client_id: string
          created_at: string | null
          encrypted_password: string | null
          encrypted_security_answer: string | null
          id: string
          is_active: boolean | null
          is_deleted: boolean | null
          last_used_date: string | null
          portal_name: string
          portal_url: string | null
          security_question: string | null
          updated_at: string | null
          username: string | null
        }
        Insert: {
          client_id: string
          created_at?: string | null
          encrypted_password?: string | null
          encrypted_security_answer?: string | null
          id?: string
          is_active?: boolean | null
          is_deleted?: boolean | null
          last_used_date?: string | null
          portal_name: string
          portal_url?: string | null
          security_question?: string | null
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string | null
          encrypted_password?: string | null
          encrypted_security_answer?: string | null
          id?: string
          is_active?: boolean | null
          is_deleted?: boolean | null
          last_used_date?: string | null
          portal_name?: string
          portal_url?: string | null
          security_question?: string | null
          updated_at?: string | null
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "credentials_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      document_requests: {
        Row: {
          client_id: string
          created_at: string
          created_by: string
          description: string | null
          document_name: string
          due_date: string | null
          fulfilled_at: string | null
          fulfilled_by_document_id: string | null
          fulfilled_by_user_id: string | null
          id: string
          is_required: boolean
          task_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          created_by: string
          description?: string | null
          document_name: string
          due_date?: string | null
          fulfilled_at?: string | null
          fulfilled_by_document_id?: string | null
          fulfilled_by_user_id?: string | null
          id?: string
          is_required?: boolean
          task_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          document_name?: string
          due_date?: string | null
          fulfilled_at?: string | null
          fulfilled_by_document_id?: string | null
          fulfilled_by_user_id?: string | null
          id?: string
          is_required?: boolean
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_requests_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_requests_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_requests_fulfilled_by_document_id_fkey"
            columns: ["fulfilled_by_document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_requests_fulfilled_by_user_id_fkey"
            columns: ["fulfilled_by_user_id"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_requests_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          client_id: string
          created_at: string | null
          deleted_at: string | null
          deleted_by: string | null
          description: string | null
          document_category: string | null
          document_period_month: number | null
          document_period_year: number | null
          file_name: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          is_deleted: boolean | null
          tags: string[] | null
          updated_at: string | null
          uploaded_by: string
          visible_to_client: boolean | null
          visible_to_team: boolean | null
        }
        Insert: {
          client_id: string
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          document_category?: string | null
          document_period_month?: number | null
          document_period_year?: number | null
          file_name: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          is_deleted?: boolean | null
          tags?: string[] | null
          updated_at?: string | null
          uploaded_by: string
          visible_to_client?: boolean | null
          visible_to_team?: boolean | null
        }
        Update: {
          client_id?: string
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          document_category?: string | null
          document_period_month?: number | null
          document_period_year?: number | null
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          is_deleted?: boolean | null
          tags?: string[] | null
          updated_at?: string | null
          uploaded_by?: string
          visible_to_client?: boolean | null
          visible_to_team?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
        ]
      }
      dsc_records: {
        Row: {
          certificate_issuer: string | null
          certificate_serial: string | null
          client_id: string
          created_at: string | null
          created_by: string | null
          custodian_name: string | null
          custodian_phone: string | null
          dsc_class: string
          dsc_type: string
          encrypted_key_file: string | null
          encrypted_password: string | null
          encrypted_pin: string | null
          expiry_alert_sent: boolean | null
          expiry_alert_sent_date: string | null
          expiry_date: string
          holder_contact_email: string | null
          holder_name: string
          holder_phone: string | null
          id: string
          is_deleted: boolean | null
          issued_date: string | null
          physical_location: string | null
          registered_portals: string[] | null
          status: string
          status_updated_at: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          certificate_issuer?: string | null
          certificate_serial?: string | null
          client_id: string
          created_at?: string | null
          created_by?: string | null
          custodian_name?: string | null
          custodian_phone?: string | null
          dsc_class: string
          dsc_type: string
          encrypted_key_file?: string | null
          encrypted_password?: string | null
          encrypted_pin?: string | null
          expiry_alert_sent?: boolean | null
          expiry_alert_sent_date?: string | null
          expiry_date: string
          holder_contact_email?: string | null
          holder_name: string
          holder_phone?: string | null
          id?: string
          is_deleted?: boolean | null
          issued_date?: string | null
          physical_location?: string | null
          registered_portals?: string[] | null
          status?: string
          status_updated_at?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          certificate_issuer?: string | null
          certificate_serial?: string | null
          client_id?: string
          created_at?: string | null
          created_by?: string | null
          custodian_name?: string | null
          custodian_phone?: string | null
          dsc_class?: string
          dsc_type?: string
          encrypted_key_file?: string | null
          encrypted_password?: string | null
          encrypted_pin?: string | null
          expiry_alert_sent?: boolean | null
          expiry_alert_sent_date?: string | null
          expiry_date?: string
          holder_contact_email?: string | null
          holder_name?: string
          holder_phone?: string | null
          id?: string
          is_deleted?: boolean | null
          issued_date?: string | null
          physical_location?: string | null
          registered_portals?: string[] | null
          status?: string
          status_updated_at?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dsc_records_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dsc_records_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dsc_records_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
        ]
      }
      engagement_letters: {
        Row: {
          client_id: string
          created_at: string | null
          deliverables: string | null
          document_id: string
          effective_from: string | null
          effective_to: string | null
          fees: number | null
          id: string
          scope_of_work: string | null
          service_id: string
          signed_date: string | null
          timeline: string | null
        }
        Insert: {
          client_id: string
          created_at?: string | null
          deliverables?: string | null
          document_id: string
          effective_from?: string | null
          effective_to?: string | null
          fees?: number | null
          id?: string
          scope_of_work?: string | null
          service_id: string
          signed_date?: string | null
          timeline?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string | null
          deliverables?: string | null
          document_id?: string
          effective_from?: string | null
          effective_to?: string | null
          fees?: number | null
          id?: string
          scope_of_work?: string | null
          service_id?: string
          signed_date?: string | null
          timeline?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "engagement_letters_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "engagement_letters_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_data: {
        Row: {
          client_id: string
          created_at: string | null
          data_json: Json
          data_type: string
          entered_at: string | null
          entered_by: string | null
          entry_source: string | null
          id: string
          is_current: boolean | null
          period_month: number | null
          period_year: number
          superseded_by: string | null
        }
        Insert: {
          client_id: string
          created_at?: string | null
          data_json: Json
          data_type: string
          entered_at?: string | null
          entered_by?: string | null
          entry_source?: string | null
          id?: string
          is_current?: boolean | null
          period_month?: number | null
          period_year: number
          superseded_by?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string | null
          data_json?: Json
          data_type?: string
          entered_at?: string | null
          entered_by?: string | null
          entry_source?: string | null
          id?: string
          is_current?: boolean | null
          period_month?: number | null
          period_year?: number
          superseded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "financial_data_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_data_entered_by_fkey"
            columns: ["entered_by"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_data_superseded_by_fkey"
            columns: ["superseded_by"]
            isOneToOne: false
            referencedRelation: "financial_data"
            referencedColumns: ["id"]
          },
        ]
      }
      firm_profile: {
        Row: {
          address: string | null
          city: string | null
          created_at: string
          email: string | null
          firm_name: string
          gstin: string | null
          id: string
          logo_url: string | null
          pan: string | null
          phone: string | null
          pincode: string | null
          state: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          firm_name: string
          gstin?: string | null
          id?: string
          logo_url?: string | null
          pan?: string | null
          phone?: string | null
          pincode?: string | null
          state?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          firm_name?: string
          gstin?: string | null
          id?: string
          logo_url?: string | null
          pan?: string | null
          phone?: string | null
          pincode?: string | null
          state?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      global_audit_log: {
        Row: {
          action: string
          details: Json | null
          entity_id: string | null
          entity_type: string | null
          id: string
          ip_address: string | null
          performed_at: string | null
          performed_by: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          performed_at?: string | null
          performed_by?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          performed_at?: string | null
          performed_by?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "global_audit_log_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
        ]
      }
      gst_data_entries: {
        Row: {
          cash_paid: number | null
          change_reason: string | null
          client_id: string
          created_at: string | null
          entered_at: string | null
          entered_by: string
          entry_notes: string | null
          entry_source: string | null
          id: string
          input_tax_2b: number | null
          is_current: boolean | null
          itc_books: number | null
          output_tax_cgst: number | null
          output_tax_igst: number | null
          output_tax_sgst: number | null
          period_month: number
          period_year: number
          superseded_by: string | null
          turnover: number | null
          turnover_confidence: string | null
          turnover_source: string | null
        }
        Insert: {
          cash_paid?: number | null
          change_reason?: string | null
          client_id: string
          created_at?: string | null
          entered_at?: string | null
          entered_by: string
          entry_notes?: string | null
          entry_source?: string | null
          id?: string
          input_tax_2b?: number | null
          is_current?: boolean | null
          itc_books?: number | null
          output_tax_cgst?: number | null
          output_tax_igst?: number | null
          output_tax_sgst?: number | null
          period_month: number
          period_year: number
          superseded_by?: string | null
          turnover?: number | null
          turnover_confidence?: string | null
          turnover_source?: string | null
        }
        Update: {
          cash_paid?: number | null
          change_reason?: string | null
          client_id?: string
          created_at?: string | null
          entered_at?: string | null
          entered_by?: string
          entry_notes?: string | null
          entry_source?: string | null
          id?: string
          input_tax_2b?: number | null
          is_current?: boolean | null
          itc_books?: number | null
          output_tax_cgst?: number | null
          output_tax_igst?: number | null
          output_tax_sgst?: number | null
          period_month?: number
          period_year?: number
          superseded_by?: string | null
          turnover?: number | null
          turnover_confidence?: string | null
          turnover_source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gst_data_entries_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gst_data_entries_entered_by_fkey"
            columns: ["entered_by"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gst_data_entries_superseded_by_fkey"
            columns: ["superseded_by"]
            isOneToOne: false
            referencedRelation: "gst_data_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      gst_filings: {
        Row: {
          ack_number: string | null
          change_reason: string | null
          client_id: string
          created_at: string | null
          data_entered_by: string | null
          data_entered_date: string | null
          deleted_at: string | null
          deleted_by: string | null
          filed_by: string | null
          filed_date: string | null
          id: string
          interest_amount: number | null
          is_current: boolean | null
          is_deleted: boolean
          itc_available_2b: number | null
          itc_claimed: number | null
          itc_reversed: number | null
          late_fee: number | null
          net_tax_payable: number | null
          output_cess: number | null
          output_cgst: number | null
          output_igst: number | null
          output_sgst: number | null
          output_tax_total: number | null
          period_month: number
          period_year: number
          return_type: string
          status: string
          superseded_by: string | null
          taxable_turnover: number | null
          updated_at: string | null
        }
        Insert: {
          ack_number?: string | null
          change_reason?: string | null
          client_id: string
          created_at?: string | null
          data_entered_by?: string | null
          data_entered_date?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          filed_by?: string | null
          filed_date?: string | null
          id?: string
          interest_amount?: number | null
          is_current?: boolean | null
          is_deleted?: boolean
          itc_available_2b?: number | null
          itc_claimed?: number | null
          itc_reversed?: number | null
          late_fee?: number | null
          net_tax_payable?: number | null
          output_cess?: number | null
          output_cgst?: number | null
          output_igst?: number | null
          output_sgst?: number | null
          output_tax_total?: number | null
          period_month: number
          period_year: number
          return_type: string
          status?: string
          superseded_by?: string | null
          taxable_turnover?: number | null
          updated_at?: string | null
        }
        Update: {
          ack_number?: string | null
          change_reason?: string | null
          client_id?: string
          created_at?: string | null
          data_entered_by?: string | null
          data_entered_date?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          filed_by?: string | null
          filed_date?: string | null
          id?: string
          interest_amount?: number | null
          is_current?: boolean | null
          is_deleted?: boolean
          itc_available_2b?: number | null
          itc_claimed?: number | null
          itc_reversed?: number | null
          late_fee?: number | null
          net_tax_payable?: number | null
          output_cess?: number | null
          output_cgst?: number | null
          output_igst?: number | null
          output_sgst?: number | null
          output_tax_total?: number | null
          period_month?: number
          period_year?: number
          return_type?: string
          status?: string
          superseded_by?: string | null
          taxable_turnover?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gst_filings_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gst_filings_data_entered_by_fkey"
            columns: ["data_entered_by"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gst_filings_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gst_filings_filed_by_fkey"
            columns: ["filed_by"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gst_filings_superseded_by_fkey"
            columns: ["superseded_by"]
            isOneToOne: false
            referencedRelation: "gst_filings"
            referencedColumns: ["id"]
          },
        ]
      }
      gst_monthly_data: {
        Row: {
          carry_forward_itc: number | null
          client_id: string
          created_at: string
          created_by: string | null
          id: string
          input_2b_cess: number | null
          input_2b_cgst: number | null
          input_2b_igst: number | null
          input_2b_sgst: number | null
          input_books_cess: number | null
          input_books_cgst: number | null
          input_books_igst: number | null
          input_books_sgst: number | null
          notes: string | null
          output_cess: number | null
          output_cgst: number | null
          output_igst: number | null
          output_sgst: number | null
          period_month: number
          period_year: number
          tax_paid_cash_cess: number | null
          tax_paid_cash_cgst: number | null
          tax_paid_cash_igst: number | null
          tax_paid_cash_sgst: number | null
          turnover_exempt: number | null
          turnover_nil_rated: number | null
          turnover_taxable: number | null
          turnover_zero_rated: number | null
          updated_at: string
          vendor_filing_percent: number | null
        }
        Insert: {
          carry_forward_itc?: number | null
          client_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          input_2b_cess?: number | null
          input_2b_cgst?: number | null
          input_2b_igst?: number | null
          input_2b_sgst?: number | null
          input_books_cess?: number | null
          input_books_cgst?: number | null
          input_books_igst?: number | null
          input_books_sgst?: number | null
          notes?: string | null
          output_cess?: number | null
          output_cgst?: number | null
          output_igst?: number | null
          output_sgst?: number | null
          period_month: number
          period_year: number
          tax_paid_cash_cess?: number | null
          tax_paid_cash_cgst?: number | null
          tax_paid_cash_igst?: number | null
          tax_paid_cash_sgst?: number | null
          turnover_exempt?: number | null
          turnover_nil_rated?: number | null
          turnover_taxable?: number | null
          turnover_zero_rated?: number | null
          updated_at?: string
          vendor_filing_percent?: number | null
        }
        Update: {
          carry_forward_itc?: number | null
          client_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          input_2b_cess?: number | null
          input_2b_cgst?: number | null
          input_2b_igst?: number | null
          input_2b_sgst?: number | null
          input_books_cess?: number | null
          input_books_cgst?: number | null
          input_books_igst?: number | null
          input_books_sgst?: number | null
          notes?: string | null
          output_cess?: number | null
          output_cgst?: number | null
          output_igst?: number | null
          output_sgst?: number | null
          period_month?: number
          period_year?: number
          tax_paid_cash_cess?: number | null
          tax_paid_cash_cgst?: number | null
          tax_paid_cash_igst?: number | null
          tax_paid_cash_sgst?: number | null
          turnover_exempt?: number | null
          turnover_nil_rated?: number | null
          turnover_taxable?: number | null
          turnover_zero_rated?: number | null
          updated_at?: string
          vendor_filing_percent?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "gst_monthly_data_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gst_monthly_data_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
        ]
      }
      hearings: {
        Row: {
          assigned_to: string | null
          client_id: string
          created_at: string | null
          deleted_at: string | null
          deleted_by: string | null
          hearing_held_date: string | null
          hearing_scheduled_date: string | null
          hearing_type: string | null
          id: string
          is_deleted: boolean
          next_hearing_date: string | null
          notice_id: string | null
          officer_name: string | null
          order_amount: number | null
          order_date: string | null
          order_document_id: string | null
          order_notes: string | null
          status: string
          subject: string | null
          updated_at: string | null
          venue: string | null
        }
        Insert: {
          assigned_to?: string | null
          client_id: string
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          hearing_held_date?: string | null
          hearing_scheduled_date?: string | null
          hearing_type?: string | null
          id?: string
          is_deleted?: boolean
          next_hearing_date?: string | null
          notice_id?: string | null
          officer_name?: string | null
          order_amount?: number | null
          order_date?: string | null
          order_document_id?: string | null
          order_notes?: string | null
          status?: string
          subject?: string | null
          updated_at?: string | null
          venue?: string | null
        }
        Update: {
          assigned_to?: string | null
          client_id?: string
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          hearing_held_date?: string | null
          hearing_scheduled_date?: string | null
          hearing_type?: string | null
          id?: string
          is_deleted?: boolean
          next_hearing_date?: string | null
          notice_id?: string | null
          officer_name?: string | null
          order_amount?: number | null
          order_date?: string | null
          order_document_id?: string | null
          order_notes?: string | null
          status?: string
          subject?: string | null
          updated_at?: string | null
          venue?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hearings_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hearings_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hearings_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hearings_notice_id_fkey"
            columns: ["notice_id"]
            isOneToOne: false
            referencedRelation: "notices"
            referencedColumns: ["id"]
          },
        ]
      }
      holidays: {
        Row: {
          created_at: string | null
          description: string | null
          holiday_date: string
          id: string
          is_optional: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          holiday_date: string
          id?: string
          is_optional?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          holiday_date?: string
          id?: string
          is_optional?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      income_tax_slabs: {
        Row: {
          assessment_year: string
          category: string
          cess_percent: number
          created_at: string
          created_by: string | null
          id: string
          max_income: number | null
          min_income: number
          rate_percent: number
          surcharge_percent: number
          updated_at: string
        }
        Insert: {
          assessment_year: string
          category: string
          cess_percent?: number
          created_at?: string
          created_by?: string | null
          id?: string
          max_income?: number | null
          min_income?: number
          rate_percent?: number
          surcharge_percent?: number
          updated_at?: string
        }
        Update: {
          assessment_year?: string
          category?: string
          cess_percent?: number
          created_at?: string
          created_by?: string | null
          id?: string
          max_income?: number | null
          min_income?: number
          rate_percent?: number
          surcharge_percent?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "income_tax_slabs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
        ]
      }
      it_filings: {
        Row: {
          ack_number: string | null
          change_reason: string | null
          client_id: string
          created_at: string | null
          data_entered_by: string | null
          data_entered_date: string | null
          deductions_claimed: number | null
          deleted_at: string | null
          deleted_by: string | null
          filed_by: string | null
          filed_date: string | null
          fy_ending_year: number
          gross_income: number | null
          id: string
          is_current: boolean | null
          is_deleted: boolean
          refund_amount: number | null
          status: string
          superseded_by: string | null
          tax_liability: number | null
          taxable_income: number | null
          updated_at: string | null
        }
        Insert: {
          ack_number?: string | null
          change_reason?: string | null
          client_id: string
          created_at?: string | null
          data_entered_by?: string | null
          data_entered_date?: string | null
          deductions_claimed?: number | null
          deleted_at?: string | null
          deleted_by?: string | null
          filed_by?: string | null
          filed_date?: string | null
          fy_ending_year: number
          gross_income?: number | null
          id?: string
          is_current?: boolean | null
          is_deleted?: boolean
          refund_amount?: number | null
          status?: string
          superseded_by?: string | null
          tax_liability?: number | null
          taxable_income?: number | null
          updated_at?: string | null
        }
        Update: {
          ack_number?: string | null
          change_reason?: string | null
          client_id?: string
          created_at?: string | null
          data_entered_by?: string | null
          data_entered_date?: string | null
          deductions_claimed?: number | null
          deleted_at?: string | null
          deleted_by?: string | null
          filed_by?: string | null
          filed_date?: string | null
          fy_ending_year?: number
          gross_income?: number | null
          id?: string
          is_current?: boolean | null
          is_deleted?: boolean
          refund_amount?: number | null
          status?: string
          superseded_by?: string | null
          tax_liability?: number | null
          taxable_income?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "it_filings_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "it_filings_data_entered_by_fkey"
            columns: ["data_entered_by"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "it_filings_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "it_filings_filed_by_fkey"
            columns: ["filed_by"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "it_filings_superseded_by_fkey"
            columns: ["superseded_by"]
            isOneToOne: false
            referencedRelation: "it_filings"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_balances: {
        Row: {
          accrued_paid_leaves: number | null
          id: string
          remaining_paid_leaves: number | null
          taken_paid_leaves: number | null
          user_id: string
          year: number
        }
        Insert: {
          accrued_paid_leaves?: number | null
          id?: string
          remaining_paid_leaves?: number | null
          taken_paid_leaves?: number | null
          user_id: string
          year: number
        }
        Update: {
          accrued_paid_leaves?: number | null
          id?: string
          remaining_paid_leaves?: number | null
          taken_paid_leaves?: number | null
          user_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "leave_balances_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_requests: {
        Row: {
          created_at: string | null
          from_date: string
          id: string
          leave_type: string
          number_of_days: number
          reason: string | null
          review_remarks: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          to_date: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          from_date: string
          id?: string
          leave_type: string
          number_of_days: number
          reason?: string | null
          review_remarks?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          to_date: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          from_date?: string
          id?: string
          leave_type?: string
          number_of_days?: number
          reason?: string | null
          review_remarks?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          to_date?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
        ]
      }
      notices: {
        Row: {
          amount_involved: number | null
          assigned_to: string | null
          client_id: string
          created_at: string | null
          description: string | null
          due_date: string | null
          id: string
          is_deleted: boolean | null
          issuing_authority: string | null
          notice_date: string | null
          notice_document_id: string | null
          notice_number: string | null
          notice_received_date: string | null
          notice_type: string
          order_document_id: string | null
          reply_document_id: string | null
          status: string
          subject: string | null
          updated_at: string | null
        }
        Insert: {
          amount_involved?: number | null
          assigned_to?: string | null
          client_id: string
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          is_deleted?: boolean | null
          issuing_authority?: string | null
          notice_date?: string | null
          notice_document_id?: string | null
          notice_number?: string | null
          notice_received_date?: string | null
          notice_type: string
          order_document_id?: string | null
          reply_document_id?: string | null
          status?: string
          subject?: string | null
          updated_at?: string | null
        }
        Update: {
          amount_involved?: number | null
          assigned_to?: string | null
          client_id?: string
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          is_deleted?: boolean | null
          issuing_authority?: string | null
          notice_date?: string | null
          notice_document_id?: string | null
          notice_number?: string | null
          notice_received_date?: string | null
          notice_type?: string
          order_document_id?: string | null
          reply_document_id?: string | null
          status?: string
          subject?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notices_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          email_frequency: string
          id: string
          in_app_enabled: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          email_frequency?: string
          id?: string
          in_app_enabled?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          email_frequency?: string
          id?: string
          in_app_enabled?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          email_sent: boolean | null
          id: string
          is_read: boolean | null
          message: string
          notification_type: string
          read_at: string | null
          related_entity_id: string | null
          related_entity_type: string | null
          send_via_email: boolean | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email_sent?: boolean | null
          id?: string
          is_read?: boolean | null
          message: string
          notification_type: string
          read_at?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          send_via_email?: boolean | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          email_sent?: boolean | null
          id?: string
          is_read?: boolean | null
          message?: string
          notification_type?: string
          read_at?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          send_via_email?: boolean | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_adjustments: {
        Row: {
          adjustment_type: string
          amount: number
          approved_at: string | null
          approved_by: string
          created_at: string | null
          id: string
          payroll_id: string
          reason: string
        }
        Insert: {
          adjustment_type: string
          amount: number
          approved_at?: string | null
          approved_by: string
          created_at?: string | null
          id?: string
          payroll_id: string
          reason: string
        }
        Update: {
          adjustment_type?: string
          amount?: number
          approved_at?: string | null
          approved_by?: string
          created_at?: string | null
          id?: string
          payroll_id?: string
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_adjustments_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_adjustments_payroll_id_fkey"
            columns: ["payroll_id"]
            isOneToOne: false
            referencedRelation: "payroll_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_runs: {
        Row: {
          actual_leave_days: number | null
          actual_present_days: number | null
          base_salary: number | null
          created_at: string | null
          created_by: string | null
          daily_rate: number | null
          deduction_for_excess_leaves: number | null
          final_salary: number | null
          gross_salary: number | null
          id: string
          month: number
          paid_leave_days: number | null
          salary_for_present_days: number | null
          status: string
          total_deductions: number | null
          total_working_days: number | null
          unpaid_leave_days: number | null
          updated_at: string | null
          user_id: string
          year: number
        }
        Insert: {
          actual_leave_days?: number | null
          actual_present_days?: number | null
          base_salary?: number | null
          created_at?: string | null
          created_by?: string | null
          daily_rate?: number | null
          deduction_for_excess_leaves?: number | null
          final_salary?: number | null
          gross_salary?: number | null
          id?: string
          month: number
          paid_leave_days?: number | null
          salary_for_present_days?: number | null
          status?: string
          total_deductions?: number | null
          total_working_days?: number | null
          unpaid_leave_days?: number | null
          updated_at?: string | null
          user_id: string
          year: number
        }
        Update: {
          actual_leave_days?: number | null
          actual_present_days?: number | null
          base_salary?: number | null
          created_at?: string | null
          created_by?: string | null
          daily_rate?: number | null
          deduction_for_excess_leaves?: number | null
          final_salary?: number | null
          gross_salary?: number | null
          id?: string
          month?: number
          paid_leave_days?: number | null
          salary_for_present_days?: number | null
          status?: string
          total_deductions?: number | null
          total_working_days?: number | null
          unpaid_leave_days?: number | null
          updated_at?: string | null
          user_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "payroll_runs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_runs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
        ]
      }
      permission_requests: {
        Row: {
          created_at: string | null
          from_time: string | null
          id: string
          reason: string | null
          request_date: string
          review_remarks: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
          to_time: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          from_time?: string | null
          id?: string
          reason?: string | null
          request_date: string
          review_remarks?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          to_time?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          from_time?: string | null
          id?: string
          reason?: string | null
          request_date?: string
          review_remarks?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          to_time?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "permission_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
        ]
      }
      profit_centres: {
        Row: {
          code: string
          created_at: string
          description: string | null
          is_active: boolean
          name: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          is_active?: boolean
          name: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
      queries: {
        Row: {
          assigned_to: string | null
          client_id: string
          created_at: string | null
          created_by: string
          deleted_at: string | null
          deleted_by: string | null
          description: string
          id: string
          is_deleted: boolean
          priority: string | null
          resolution_notes: string | null
          resolved_date: string | null
          status: string
          subject: string
          task_id: string | null
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          client_id: string
          created_at?: string | null
          created_by: string
          deleted_at?: string | null
          deleted_by?: string | null
          description: string
          id?: string
          is_deleted?: boolean
          priority?: string | null
          resolution_notes?: string | null
          resolved_date?: string | null
          status?: string
          subject: string
          task_id?: string | null
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          client_id?: string
          created_at?: string | null
          created_by?: string
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string
          id?: string
          is_deleted?: boolean
          priority?: string | null
          resolution_notes?: string | null
          resolved_date?: string | null
          status?: string
          subject?: string
          task_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "queries_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "queries_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "queries_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "queries_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "queries_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      query_messages: {
        Row: {
          created_at: string | null
          id: string
          is_deleted: boolean | null
          message_text: string
          query_id: string
          sender_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_deleted?: boolean | null
          message_text: string
          query_id: string
          sender_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_deleted?: boolean | null
          message_text?: string
          query_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "query_messages_query_id_fkey"
            columns: ["query_id"]
            isOneToOne: false
            referencedRelation: "queries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "query_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_views: {
        Row: {
          created_at: string | null
          filters: Json
          id: string
          is_default: boolean | null
          name: string
          scope: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          filters?: Json
          id?: string
          is_default?: boolean | null
          name: string
          scope: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          filters?: Json
          id?: string
          is_default?: boolean | null
          name?: string
          scope?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_views_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
        ]
      }
      service_categories: {
        Row: {
          created_at: string | null
          description: string | null
          display_order: number | null
          id: string
          is_deleted: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_deleted?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_deleted?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      services: {
        Row: {
          category_id: string | null
          code: string | null
          created_at: string | null
          description: string | null
          display_order: number | null
          icon_url: string | null
          id: string
          is_deleted: boolean | null
          name: string
          service_kind: string | null
          updated_at: string | null
        }
        Insert: {
          category_id?: string | null
          code?: string | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          icon_url?: string | null
          id?: string
          is_deleted?: boolean | null
          name: string
          service_kind?: string | null
          updated_at?: string | null
        }
        Update: {
          category_id?: string | null
          code?: string | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          icon_url?: string | null
          id?: string
          is_deleted?: boolean | null
          name?: string
          service_kind?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "services_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "service_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      solution_log: {
        Row: {
          actual_financial_impact: number | null
          actual_outcome: string | null
          client_id: string
          created_at: string | null
          financial_impact_estimate: number | null
          id: string
          identified_by: string | null
          implementation_date: string | null
          implemented_by: string | null
          issue_category: string | null
          issue_description: string
          issue_identified_date: string
          recommended_solution: string
          root_cause: string | null
          solution_status: string
          updated_at: string | null
        }
        Insert: {
          actual_financial_impact?: number | null
          actual_outcome?: string | null
          client_id: string
          created_at?: string | null
          financial_impact_estimate?: number | null
          id?: string
          identified_by?: string | null
          implementation_date?: string | null
          implemented_by?: string | null
          issue_category?: string | null
          issue_description: string
          issue_identified_date: string
          recommended_solution: string
          root_cause?: string | null
          solution_status?: string
          updated_at?: string | null
        }
        Update: {
          actual_financial_impact?: number | null
          actual_outcome?: string | null
          client_id?: string
          created_at?: string | null
          financial_impact_estimate?: number | null
          id?: string
          identified_by?: string | null
          implementation_date?: string | null
          implemented_by?: string | null
          issue_category?: string | null
          issue_description?: string
          issue_identified_date?: string
          recommended_solution?: string
          root_cause?: string | null
          solution_status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "solution_log_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solution_log_identified_by_fkey"
            columns: ["identified_by"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solution_log_implemented_by_fkey"
            columns: ["implemented_by"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_capabilities: {
        Row: {
          capability: string
          granted_at: string | null
          granted_by: string
          id: string
          revoked_at: string | null
          revoked_by: string | null
          user_id: string
        }
        Insert: {
          capability: string
          granted_at?: string | null
          granted_by: string
          id?: string
          revoked_at?: string | null
          revoked_by?: string | null
          user_id: string
        }
        Update: {
          capability?: string
          granted_at?: string | null
          granted_by?: string
          id?: string
          revoked_at?: string | null
          revoked_by?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_capabilities_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_capabilities_revoked_by_fkey"
            columns: ["revoked_by"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_capabilities_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_payroll_settings: {
        Row: {
          created_at: string | null
          deduction_applicable: boolean | null
          effective_from: string
          effective_to: string | null
          id: string
          leave_carry_forward_allowed: boolean | null
          max_carry_forward_days: number | null
          monthly_salary: number
          paid_leaves_per_month: number | null
          salary_adjustment_for_leaves: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          deduction_applicable?: boolean | null
          effective_from: string
          effective_to?: string | null
          id?: string
          leave_carry_forward_allowed?: boolean | null
          max_carry_forward_days?: number | null
          monthly_salary: number
          paid_leaves_per_month?: number | null
          salary_adjustment_for_leaves?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          deduction_applicable?: boolean | null
          effective_from?: string
          effective_to?: string | null
          id?: string
          leave_carry_forward_allowed?: boolean | null
          max_carry_forward_days?: number | null
          monthly_salary?: number
          paid_leaves_per_month?: number | null
          salary_adjustment_for_leaves?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_payroll_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_role_template_capabilities: {
        Row: {
          capability: string
          id: string
          template_id: string
        }
        Insert: {
          capability: string
          id?: string
          template_id: string
        }
        Update: {
          capability?: string
          id?: string
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_role_template_capabilities_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "staff_role_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_role_templates: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_deleted: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_deleted?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_deleted?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_role_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
        ]
      }
      sub_service_document_request_templates: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          document_name: string
          id: string
          is_required: boolean
          sub_service_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          document_name: string
          id?: string
          is_required?: boolean
          sub_service_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          document_name?: string
          id?: string
          is_required?: boolean
          sub_service_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sub_service_document_request_templates_sub_service_id_fkey"
            columns: ["sub_service_id"]
            isOneToOne: false
            referencedRelation: "sub_services"
            referencedColumns: ["id"]
          },
        ]
      }
      sub_service_sop_steps: {
        Row: {
          created_at: string | null
          description: string | null
          guidance_notes: string | null
          id: string
          is_deleted: boolean | null
          is_required: boolean | null
          step_order: number
          sub_service_id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          guidance_notes?: string | null
          id?: string
          is_deleted?: boolean | null
          is_required?: boolean | null
          step_order: number
          sub_service_id: string
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          guidance_notes?: string | null
          id?: string
          is_deleted?: boolean | null
          is_required?: boolean | null
          step_order?: number
          sub_service_id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sub_service_sop_steps_sub_service_id_fkey"
            columns: ["sub_service_id"]
            isOneToOne: false
            referencedRelation: "sub_services"
            referencedColumns: ["id"]
          },
        ]
      }
      sub_services: {
        Row: {
          code: string | null
          created_at: string | null
          description: string | null
          due_day_of_month: number | null
          due_day_of_quarter: number | null
          due_month: number | null
          frequency: string | null
          id: string
          is_active: boolean | null
          is_billable: boolean | null
          is_deleted: boolean | null
          is_recurring: boolean | null
          name: string
          requires_client_input: boolean | null
          requires_verification: boolean
          service_id: string
          updated_at: string | null
        }
        Insert: {
          code?: string | null
          created_at?: string | null
          description?: string | null
          due_day_of_month?: number | null
          due_day_of_quarter?: number | null
          due_month?: number | null
          frequency?: string | null
          id?: string
          is_active?: boolean | null
          is_billable?: boolean | null
          is_deleted?: boolean | null
          is_recurring?: boolean | null
          name: string
          requires_client_input?: boolean | null
          requires_verification?: boolean
          service_id: string
          updated_at?: string | null
        }
        Update: {
          code?: string | null
          created_at?: string | null
          description?: string | null
          due_day_of_month?: number | null
          due_day_of_quarter?: number | null
          due_month?: number | null
          frequency?: string | null
          id?: string
          is_active?: boolean | null
          is_billable?: boolean | null
          is_deleted?: boolean | null
          is_recurring?: boolean | null
          name?: string
          requires_client_input?: boolean | null
          requires_verification?: boolean
          service_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sub_services_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      task_activity: {
        Row: {
          action: string
          changed_by: string | null
          created_at: string | null
          field_name: string | null
          id: string
          new_value: string | null
          old_value: string | null
          task_id: string
        }
        Insert: {
          action: string
          changed_by?: string | null
          created_at?: string | null
          field_name?: string | null
          id?: string
          new_value?: string | null
          old_value?: string | null
          task_id: string
        }
        Update: {
          action?: string
          changed_by?: string | null
          created_at?: string | null
          field_name?: string | null
          id?: string
          new_value?: string | null
          old_value?: string | null
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_activity_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_activity_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_custom_field_definitions: {
        Row: {
          created_at: string
          display_label: string
          display_order: number
          field_key: string
          field_type: string
          id: string
          is_required: boolean
          options_json: Json | null
          service_id: string | null
          sub_service_id: string | null
        }
        Insert: {
          created_at?: string
          display_label: string
          display_order?: number
          field_key: string
          field_type: string
          id?: string
          is_required?: boolean
          options_json?: Json | null
          service_id?: string | null
          sub_service_id?: string | null
        }
        Update: {
          created_at?: string
          display_label?: string
          display_order?: number
          field_key?: string
          field_type?: string
          id?: string
          is_required?: boolean
          options_json?: Json | null
          service_id?: string | null
          sub_service_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_custom_field_definitions_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_custom_field_definitions_sub_service_id_fkey"
            columns: ["sub_service_id"]
            isOneToOne: false
            referencedRelation: "sub_services"
            referencedColumns: ["id"]
          },
        ]
      }
      task_custom_field_values: {
        Row: {
          definition_id: string
          id: string
          task_id: string
          updated_at: string
          value_bool: boolean | null
          value_date: string | null
          value_number: number | null
          value_text: string | null
        }
        Insert: {
          definition_id: string
          id?: string
          task_id: string
          updated_at?: string
          value_bool?: boolean | null
          value_date?: string | null
          value_number?: number | null
          value_text?: string | null
        }
        Update: {
          definition_id?: string
          id?: string
          task_id?: string
          updated_at?: string
          value_bool?: boolean | null
          value_date?: string | null
          value_number?: number | null
          value_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_custom_field_values_definition_id_fkey"
            columns: ["definition_id"]
            isOneToOne: false
            referencedRelation: "task_custom_field_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_custom_field_values_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_document_requests: {
        Row: {
          created_at: string | null
          date_requested: string | null
          description: string | null
          document_type: string
          id: string
          is_received: boolean | null
          last_reminder_date: string | null
          received_date: string | null
          received_from: string | null
          related_document_id: string | null
          reminder_count: number | null
          task_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          date_requested?: string | null
          description?: string | null
          document_type: string
          id?: string
          is_received?: boolean | null
          last_reminder_date?: string | null
          received_date?: string | null
          received_from?: string | null
          related_document_id?: string | null
          reminder_count?: number | null
          task_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          date_requested?: string | null
          description?: string | null
          document_type?: string
          id?: string
          is_received?: boolean | null
          last_reminder_date?: string | null
          received_date?: string | null
          received_from?: string | null
          related_document_id?: string | null
          reminder_count?: number | null
          task_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_document_requests_received_from_fkey"
            columns: ["received_from"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_document_requests_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_label_assignments: {
        Row: {
          assigned_at: string
          label_code: string
          task_id: string
        }
        Insert: {
          assigned_at?: string
          label_code: string
          task_id: string
        }
        Update: {
          assigned_at?: string
          label_code?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_label_assignments_label_code_fkey"
            columns: ["label_code"]
            isOneToOne: false
            referencedRelation: "task_labels"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "task_label_assignments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_labels: {
        Row: {
          code: string
          color_hex: string | null
          created_at: string
          display_name: string
          is_active: boolean
        }
        Insert: {
          code: string
          color_hex?: string | null
          created_at?: string
          display_name: string
          is_active?: boolean
        }
        Update: {
          code?: string
          color_hex?: string | null
          created_at?: string
          display_name?: string
          is_active?: boolean
        }
        Relationships: []
      }
      task_notes: {
        Row: {
          created_at: string | null
          created_by: string
          id: string
          is_deleted: boolean | null
          note_text: string
          task_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          id?: string
          is_deleted?: boolean | null
          note_text: string
          task_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          id?: string
          is_deleted?: boolean | null
          note_text?: string
          task_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_notes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_notes_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_steps: {
        Row: {
          completed_at: string | null
          completed_by: string | null
          completion_note: string | null
          created_at: string | null
          description: string | null
          guidance_notes: string | null
          id: string
          is_required: boolean | null
          source_sop_step_id: string | null
          source_template_step_id: string | null
          step_order: number
          task_id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          completed_at?: string | null
          completed_by?: string | null
          completion_note?: string | null
          created_at?: string | null
          description?: string | null
          guidance_notes?: string | null
          id?: string
          is_required?: boolean | null
          source_sop_step_id?: string | null
          source_template_step_id?: string | null
          step_order: number
          task_id: string
          title: string
          updated_at?: string | null
        }
        Update: {
          completed_at?: string | null
          completed_by?: string | null
          completion_note?: string | null
          created_at?: string | null
          description?: string | null
          guidance_notes?: string | null
          id?: string
          is_required?: boolean | null
          source_sop_step_id?: string | null
          source_template_step_id?: string | null
          step_order?: number
          task_id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_steps_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_steps_source_sop_step_id_fkey"
            columns: ["source_sop_step_id"]
            isOneToOne: false
            referencedRelation: "sub_service_sop_steps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_steps_source_template_step_id_fkey"
            columns: ["source_template_step_id"]
            isOneToOne: false
            referencedRelation: "task_template_steps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_steps_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_template_steps: {
        Row: {
          created_at: string | null
          description: string | null
          guidance_notes: string | null
          id: string
          is_deleted: boolean | null
          is_required: boolean | null
          step_order: number
          task_template_id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          guidance_notes?: string | null
          id?: string
          is_deleted?: boolean | null
          is_required?: boolean | null
          step_order: number
          task_template_id: string
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          guidance_notes?: string | null
          id?: string
          is_deleted?: boolean | null
          is_required?: boolean | null
          step_order?: number
          task_template_id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_template_steps_task_template_id_fkey"
            columns: ["task_template_id"]
            isOneToOne: false
            referencedRelation: "task_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      task_templates: {
        Row: {
          created_at: string | null
          default_assignee_id: string | null
          default_reviewer_id: string | null
          description: string | null
          due_day_of_month: number | null
          due_day_of_quarter: number | null
          due_month: number | null
          estimated_days: number | null
          frequency: string
          id: string
          is_active: boolean | null
          is_deleted: boolean | null
          sop_steps: Json | null
          sub_service_id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          default_assignee_id?: string | null
          default_reviewer_id?: string | null
          description?: string | null
          due_day_of_month?: number | null
          due_day_of_quarter?: number | null
          due_month?: number | null
          estimated_days?: number | null
          frequency: string
          id?: string
          is_active?: boolean | null
          is_deleted?: boolean | null
          sop_steps?: Json | null
          sub_service_id: string
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          default_assignee_id?: string | null
          default_reviewer_id?: string | null
          description?: string | null
          due_day_of_month?: number | null
          due_day_of_quarter?: number | null
          due_month?: number | null
          estimated_days?: number | null
          frequency?: string
          id?: string
          is_active?: boolean | null
          is_deleted?: boolean | null
          sop_steps?: Json | null
          sub_service_id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_templates_default_assignee_id_fkey"
            columns: ["default_assignee_id"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_templates_default_reviewer_id_fkey"
            columns: ["default_reviewer_id"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_templates_sub_service_id_fkey"
            columns: ["sub_service_id"]
            isOneToOne: false
            referencedRelation: "sub_services"
            referencedColumns: ["id"]
          },
        ]
      }
      task_workdone: {
        Row: {
          client_id: string | null
          created_at: string
          duration_minutes: number
          ended_at: string | null
          entry_method: string
          id: string
          note: string | null
          started_at: string | null
          task_id: string | null
          updated_at: string | null
          user_id: string
          work_date: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          duration_minutes: number
          ended_at?: string | null
          entry_method: string
          id?: string
          note?: string | null
          started_at?: string | null
          task_id?: string | null
          updated_at?: string | null
          user_id: string
          work_date: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          duration_minutes?: number
          ended_at?: string | null
          entry_method?: string
          id?: string
          note?: string | null
          started_at?: string | null
          task_id?: string | null
          updated_at?: string | null
          user_id?: string
          work_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_workdone_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_workdone_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_workdone_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          arn_reference: string | null
          assigned_to: string | null
          bill_amount: number | null
          bill_reference: string | null
          billed: boolean | null
          billed_date: string | null
          billing_entity_id: string | null
          client_approval_required: boolean
          client_id: string
          completed_date: string | null
          cost_centre_code: string | null
          created_at: string | null
          created_date: string | null
          custom_fields: Json | null
          deleted_at: string | null
          deleted_by: string | null
          description: string | null
          due_date: string
          estimated_hours: number | null
          id: string
          is_arn_client_visible: boolean | null
          is_billable: boolean | null
          is_blocked_on_client: boolean
          is_deleted: boolean | null
          is_recurring: boolean | null
          is_stuck: boolean
          is_verified: boolean | null
          labels: string[] | null
          period_month: number | null
          period_quarter: number | null
          period_year: number | null
          priority: string | null
          profit_centre_code: string | null
          reviewer_id: string | null
          service_head_id: string | null
          started_date: string | null
          status: string
          stuck_reason_code: string | null
          stuck_reason_note: string | null
          sub_service_id: string | null
          task_number: string | null
          task_template_id: string | null
          title: string
          updated_at: string | null
          verification_note: string | null
          verification_status: string
          verified_at: string | null
          verified_by_user_id: string | null
        }
        Insert: {
          arn_reference?: string | null
          assigned_to?: string | null
          bill_amount?: number | null
          bill_reference?: string | null
          billed?: boolean | null
          billed_date?: string | null
          billing_entity_id?: string | null
          client_approval_required?: boolean
          client_id: string
          completed_date?: string | null
          cost_centre_code?: string | null
          created_at?: string | null
          created_date?: string | null
          custom_fields?: Json | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          due_date: string
          estimated_hours?: number | null
          id?: string
          is_arn_client_visible?: boolean | null
          is_billable?: boolean | null
          is_blocked_on_client?: boolean
          is_deleted?: boolean | null
          is_recurring?: boolean | null
          is_stuck?: boolean
          is_verified?: boolean | null
          labels?: string[] | null
          period_month?: number | null
          period_quarter?: number | null
          period_year?: number | null
          priority?: string | null
          profit_centre_code?: string | null
          reviewer_id?: string | null
          service_head_id?: string | null
          started_date?: string | null
          status?: string
          stuck_reason_code?: string | null
          stuck_reason_note?: string | null
          sub_service_id?: string | null
          task_number?: string | null
          task_template_id?: string | null
          title: string
          updated_at?: string | null
          verification_note?: string | null
          verification_status?: string
          verified_at?: string | null
          verified_by_user_id?: string | null
        }
        Update: {
          arn_reference?: string | null
          assigned_to?: string | null
          bill_amount?: number | null
          bill_reference?: string | null
          billed?: boolean | null
          billed_date?: string | null
          billing_entity_id?: string | null
          client_approval_required?: boolean
          client_id?: string
          completed_date?: string | null
          cost_centre_code?: string | null
          created_at?: string | null
          created_date?: string | null
          custom_fields?: Json | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          due_date?: string
          estimated_hours?: number | null
          id?: string
          is_arn_client_visible?: boolean | null
          is_billable?: boolean | null
          is_blocked_on_client?: boolean
          is_deleted?: boolean | null
          is_recurring?: boolean | null
          is_stuck?: boolean
          is_verified?: boolean | null
          labels?: string[] | null
          period_month?: number | null
          period_quarter?: number | null
          period_year?: number | null
          priority?: string | null
          profit_centre_code?: string | null
          reviewer_id?: string | null
          service_head_id?: string | null
          started_date?: string | null
          status?: string
          stuck_reason_code?: string | null
          stuck_reason_note?: string | null
          sub_service_id?: string | null
          task_number?: string | null
          task_template_id?: string | null
          title?: string
          updated_at?: string | null
          verification_note?: string | null
          verification_status?: string
          verified_at?: string | null
          verified_by_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_billing_entity_fk"
            columns: ["billing_entity_id"]
            isOneToOne: false
            referencedRelation: "billing_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_service_head_id_fkey"
            columns: ["service_head_id"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_sub_service_id_fkey"
            columns: ["sub_service_id"]
            isOneToOne: false
            referencedRelation: "sub_services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_task_template_id_fkey"
            columns: ["task_template_id"]
            isOneToOne: false
            referencedRelation: "task_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_verified_by_user_id_fkey"
            columns: ["verified_by_user_id"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
        ]
      }
      tds_filings: {
        Row: {
          ack_number: string | null
          change_reason: string | null
          client_id: string
          created_at: string | null
          data_entered_by: string | null
          data_entered_date: string | null
          deductee_count: number | null
          deleted_at: string | null
          deleted_by: string | null
          filed_by: string | null
          filed_date: string | null
          id: string
          is_current: boolean | null
          is_deleted: boolean
          other_sections: Json | null
          period_quarter: number
          period_year: number
          section_194j: number | null
          section_194la: number | null
          section_194o: number | null
          status: string
          superseded_by: string | null
          tax_deposited: number | null
          total_deductions: number | null
          updated_at: string | null
        }
        Insert: {
          ack_number?: string | null
          change_reason?: string | null
          client_id: string
          created_at?: string | null
          data_entered_by?: string | null
          data_entered_date?: string | null
          deductee_count?: number | null
          deleted_at?: string | null
          deleted_by?: string | null
          filed_by?: string | null
          filed_date?: string | null
          id?: string
          is_current?: boolean | null
          is_deleted?: boolean
          other_sections?: Json | null
          period_quarter: number
          period_year: number
          section_194j?: number | null
          section_194la?: number | null
          section_194o?: number | null
          status?: string
          superseded_by?: string | null
          tax_deposited?: number | null
          total_deductions?: number | null
          updated_at?: string | null
        }
        Update: {
          ack_number?: string | null
          change_reason?: string | null
          client_id?: string
          created_at?: string | null
          data_entered_by?: string | null
          data_entered_date?: string | null
          deductee_count?: number | null
          deleted_at?: string | null
          deleted_by?: string | null
          filed_by?: string | null
          filed_date?: string | null
          id?: string
          is_current?: boolean | null
          is_deleted?: boolean
          other_sections?: Json | null
          period_quarter?: number
          period_year?: number
          section_194j?: number | null
          section_194la?: number | null
          section_194o?: number | null
          status?: string
          superseded_by?: string | null
          tax_deposited?: number | null
          total_deductions?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tds_filings_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tds_filings_data_entered_by_fkey"
            columns: ["data_entered_by"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tds_filings_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tds_filings_filed_by_fkey"
            columns: ["filed_by"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tds_filings_superseded_by_fkey"
            columns: ["superseded_by"]
            isOneToOne: false
            referencedRelation: "tds_filings"
            referencedColumns: ["id"]
          },
        ]
      }
      team_client_assignment: {
        Row: {
          assigned_from: string
          assigned_to: string | null
          client_id: string
          created_at: string | null
          id: string
          role: string | null
          team_user_id: string
          updated_at: string | null
        }
        Insert: {
          assigned_from: string
          assigned_to?: string | null
          client_id: string
          created_at?: string | null
          id?: string
          role?: string | null
          team_user_id: string
          updated_at?: string | null
        }
        Update: {
          assigned_from?: string
          assigned_to?: string | null
          client_id?: string
          created_at?: string | null
          id?: string
          role?: string | null
          team_user_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_client_assignment_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_client_assignment_team_user_id_fkey"
            columns: ["team_user_id"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
        ]
      }
      user_billing_entity_access: {
        Row: {
          billing_entity_id: string
          granted_at: string
          user_id: string
        }
        Insert: {
          billing_entity_id: string
          granted_at?: string
          user_id: string
        }
        Update: {
          billing_entity_id?: string
          granted_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_billing_entity_access_billing_entity_id_fkey"
            columns: ["billing_entity_id"]
            isOneToOne: false
            referencedRelation: "billing_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_billing_entity_access_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
        ]
      }
      users_profile: {
        Row: {
          active_role_template_id: string | null
          created_at: string | null
          deleted_at: string | null
          deleted_by: string | null
          department: string | null
          email: string
          full_name: string
          geo_check_in_required: boolean
          id: string
          is_active: boolean | null
          is_deleted: boolean | null
          is_prime_admin: boolean | null
          is_verified: boolean | null
          job_title: string | null
          last_login: string | null
          manager_id: string | null
          monthly_salary: number | null
          paid_leaves_per_month: number | null
          phone_number: string | null
          reports_to: string | null
          role: string
          updated_at: string | null
        }
        Insert: {
          active_role_template_id?: string | null
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          department?: string | null
          email: string
          full_name: string
          geo_check_in_required?: boolean
          id: string
          is_active?: boolean | null
          is_deleted?: boolean | null
          is_prime_admin?: boolean | null
          is_verified?: boolean | null
          job_title?: string | null
          last_login?: string | null
          manager_id?: string | null
          monthly_salary?: number | null
          paid_leaves_per_month?: number | null
          phone_number?: string | null
          reports_to?: string | null
          role: string
          updated_at?: string | null
        }
        Update: {
          active_role_template_id?: string | null
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          department?: string | null
          email?: string
          full_name?: string
          geo_check_in_required?: boolean
          id?: string
          is_active?: boolean | null
          is_deleted?: boolean | null
          is_prime_admin?: boolean | null
          is_verified?: boolean | null
          job_title?: string | null
          last_login?: string | null
          manager_id?: string | null
          monthly_salary?: number | null
          paid_leaves_per_month?: number | null
          phone_number?: string | null
          reports_to?: string | null
          role?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_profile_active_role_template_id_fkey"
            columns: ["active_role_template_id"]
            isOneToOne: false
            referencedRelation: "staff_role_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_profile_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_profile_reports_to_fkey"
            columns: ["reports_to"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
        ]
      }
      vcfo_snapshots: {
        Row: {
          actual_expenses: number | null
          actual_revenue: number | null
          advisor_notes: string | null
          budgeted_expenses: number | null
          budgeted_revenue: number | null
          cash_in_bank: number | null
          client_id: string
          created_at: string | null
          data_entered_by: string | null
          id: string
          key_expenses: Json | null
          month: number
          monthly_burn: number | null
          revenue: number | null
          updated_at: string | null
          year: number
        }
        Insert: {
          actual_expenses?: number | null
          actual_revenue?: number | null
          advisor_notes?: string | null
          budgeted_expenses?: number | null
          budgeted_revenue?: number | null
          cash_in_bank?: number | null
          client_id: string
          created_at?: string | null
          data_entered_by?: string | null
          id?: string
          key_expenses?: Json | null
          month: number
          monthly_burn?: number | null
          revenue?: number | null
          updated_at?: string | null
          year: number
        }
        Update: {
          actual_expenses?: number | null
          actual_revenue?: number | null
          advisor_notes?: string | null
          budgeted_expenses?: number | null
          budgeted_revenue?: number | null
          cash_in_bank?: number | null
          client_id?: string
          created_at?: string | null
          data_entered_by?: string | null
          id?: string
          key_expenses?: Json | null
          month?: number
          monthly_burn?: number | null
          revenue?: number | null
          updated_at?: string | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "vcfo_snapshots_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vcfo_snapshots_data_entered_by_fkey"
            columns: ["data_entered_by"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_gst_filings: {
        Row: {
          client_id: string
          created_at: string | null
          expected_filing_date: string | null
          filed: boolean | null
          filing_date: string | null
          gst_amount_involved: number | null
          id: string
          period_month: number
          period_year: number
          updated_at: string | null
          vendor_id: string
        }
        Insert: {
          client_id: string
          created_at?: string | null
          expected_filing_date?: string | null
          filed?: boolean | null
          filing_date?: string | null
          gst_amount_involved?: number | null
          id?: string
          period_month: number
          period_year: number
          updated_at?: string | null
          vendor_id: string
        }
        Update: {
          client_id?: string
          created_at?: string | null
          expected_filing_date?: string | null
          filed?: boolean | null
          filing_date?: string | null
          gst_amount_involved?: number | null
          id?: string
          period_month?: number
          period_year?: number
          updated_at?: string | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_gst_filings_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_gst_filings_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendors: {
        Row: {
          address: string | null
          city: string | null
          client_id: string
          contact_email: string | null
          contact_person: string | null
          contact_phone: string | null
          created_at: string | null
          id: string
          is_deleted: boolean | null
          state: string | null
          vendor_category: string | null
          vendor_gstin: string | null
          vendor_name: string
          vendor_pan: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          client_id: string
          contact_email?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          created_at?: string | null
          id?: string
          is_deleted?: boolean | null
          state?: string | null
          vendor_category?: string | null
          vendor_gstin?: string | null
          vendor_name: string
          vendor_pan?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          client_id?: string
          contact_email?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          created_at?: string | null
          id?: string
          is_deleted?: boolean | null
          state?: string | null
          vendor_category?: string | null
          vendor_gstin?: string | null
          vendor_name?: string
          vendor_pan?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendors_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_timesheet_submissions: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          half_days: number | null
          id: string
          leave_days: number | null
          manager_id: string | null
          permission_hours: number | null
          present_days: number | null
          review_remarks: string | null
          status: string
          submitted_at: string | null
          updated_at: string | null
          user_id: string
          week_end: string
          week_start: string
          wfh_days: number | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          half_days?: number | null
          id?: string
          leave_days?: number | null
          manager_id?: string | null
          permission_hours?: number | null
          present_days?: number | null
          review_remarks?: string | null
          status?: string
          submitted_at?: string | null
          updated_at?: string | null
          user_id: string
          week_end: string
          week_start: string
          wfh_days?: number | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          half_days?: number | null
          id?: string
          leave_days?: number | null
          manager_id?: string | null
          permission_hours?: number | null
          present_days?: number | null
          review_remarks?: string | null
          status?: string
          submitted_at?: string | null
          updated_at?: string | null
          user_id?: string
          week_end?: string
          week_start?: string
          wfh_days?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "weekly_timesheet_submissions_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weekly_timesheet_submissions_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weekly_timesheet_submissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
        ]
      }
      work_done: {
        Row: {
          client_id: string | null
          created_at: string | null
          date: string
          description: string
          ended_at: string | null
          id: string
          minutes: number
          started_at: string | null
          task_id: string | null
          user_id: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string | null
          date?: string
          description: string
          ended_at?: string | null
          id?: string
          minutes: number
          started_at?: string | null
          task_id?: string | null
          user_id: string
        }
        Update: {
          client_id?: string | null
          created_at?: string | null
          date?: string
          description?: string
          ended_at?: string | null
          id?: string
          minutes?: number
          started_at?: string | null
          task_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_done_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_done_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_done_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      v_unified_inbox: {
        Row: {
          actor_id: string | null
          client_id: string | null
          client_name: string | null
          due_date: string | null
          id: string | null
          item_type: string | null
          meta: Json | null
          occurred_at: string | null
          priority: string | null
          related_entity_id: string | null
          related_entity_type: string | null
          status: string | null
          title: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      current_user_role: { Args: never; Returns: string }
      user_has_capability: { Args: { cap: string }; Returns: boolean }
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
