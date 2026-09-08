export type UserRole = 'FOUNDER' | 'OPS_MANAGER' | 'TEAM_LEADER' | 'AGENT' | 'AUDITOR';

export interface User {
  agent_id: string;
  name: string;
  email: string;
  role: UserRole;
  team_leader_id?: string;
  client_ids_assigned: string[];
  doj: string;
  active_flag: boolean;
  first_login?: boolean;
  is_locked?: boolean;
  failed_logins?: number;
  totp_enabled?: boolean;
  totp_secret?: string;
}

export interface Client {
  client_id: string;
  client_name: string;
  contract_start: string;
  contract_end: string;
  commission_structure: string; // e.g. "8.5%"
  data_retention_days: number;
  active_flag: boolean;
  header_template: string[]; // required CSV headers
}

export interface AllocationBatch {
  batch_id: string;
  client_id: string;
  uploaded_by: string; // agent_id/user_id
  uploaded_at: string;
  file_name: string;
  record_count: number;
  month_tag: string; // e.g. "2026-09"
}

export type DpdBucket = '1-30 DPD' | '31-60 DPD' | '61-90 DPD' | '90+ DPD';

export type AllocationStatus = 
  | 'Unassigned' 
  | 'Assigned' 
  | 'In Progress' 
  | 'PTP Taken' 
  | 'Paid' 
  | 'Partially Paid' 
  | 'Disputed' 
  | 'Closed';

export interface Allocation {
  allocation_id: string;
  batch_id: string;
  client_id: string;
  loan_id: string;
  borrower_name: string;
  borrower_phone: string;
  borrower_city: string;
  dpd: number;
  dpd_bucket: DpdBucket;
  pos_amount: number; // Principal Outstanding
  emi_due_amount: number;
  total_due: number;
  assigned_agent_id?: string;
  assigned_at?: string;
  current_status: AllocationStatus;
  last_action_at?: string;
  closure_reason?: string;
}

export type ContactMode = 'Call' | 'SMS' | 'WhatsApp' | 'Email' | 'In-Person';

export type DispositionCode =
  // Contactable
  | 'PTP Taken'
  | 'Already Paid'
  | 'Partial Payment Promised'
  | 'Dispute Raised'
  | 'Refuses To Pay'
  | 'Requests Settlement'
  | 'Requests Callback'
  // Non contactable
  | 'Ringing No Answer'
  | 'Switched Off'
  | 'Number Invalid'
  | 'Number Busy'
  | 'Wrong Number'
  | 'Not Reachable'
  // Other
  | 'Third Party Contact'
  | 'Deceased'
  | 'Hospitalised'
  | 'Relocated'
  | 'Legal Notice Requested';

export interface ActivityLog {
  activity_id: string;
  allocation_id: string;
  agent_id: string;
  timestamp: string;
  contact_mode: ContactMode;
  disposition_code: DispositionCode;
  sub_disposition?: string;
  remarks: string;
  next_action_date?: string;
}

export type PtpStatus = 'Open' | 'Kept' | 'Broken' | 'Partially Kept';

export interface PTPRecord {
  ptp_id: string;
  allocation_id: string;
  agent_id: string;
  created_at: string;
  promised_amount: number;
  promised_date: string;
  ptp_status: PtpStatus;
  broken_reason?: string;
}

export interface PaymentRecord {
  payment_id: string;
  client_id: string;
  loan_id: string;
  payment_date: string;
  payment_amount: number;
  payment_mode: string;
  source_file_id: string;
  ingested_at: string;
}

export interface AuditLogEntry {
  log_id: string;
  user_id: string;
  action_type: 
    | 'LOGIN' 
    | 'LOGOUT' 
    | 'DISABLE_USER' 
    | 'UNLOCK_USER'
    | 'REASSIGN_ACCOUNT' 
    | 'REVEAL_PHONE' 
    | 'DISPOSITION_CAPTURED' 
    | 'PTP_CREATED' 
    | 'PAYMENT_INGESTED'
    | 'CLIENT_CREATED'
    | 'BATCH_UPLOADED';
  entity: string;
  entity_id: string;
  old_value?: string;
  new_value?: string;
  timestamp: string;
  ip_address: string;
}

export interface ExceptionPayment {
  exception_id: string;
  client_id: string;
  loan_id: string;
  payment_date: string;
  payment_amount: number;
  payment_mode: string;
  reason: string;
  status: 'PENDING' | 'RESOLVED' | 'REJECTED';
}
