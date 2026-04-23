import { Database } from '@/types_db';

export type Profile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  email: string | null;
  phone: string | null;
  department_id: string | null;
  role: 'admin' | 'manager' | 'employee';
  is_active: boolean;
};

export type DocumentStatus = 'pending' | 'in_progress' | 'paused' | 'completed' | 'cancelled';
export type StepStatus = 'waiting' | 'pending' | 'approved' | 'rejected';
export type MemoStatus = 'open' | 'resolved' | 'cancelled';

export type Document = {
  id: string;
  request_number: number;
  title: string;
  description: string | null;
  creator_id: string;
  file_url: string | null;
  file_name: string | null;
  status: DocumentStatus;
  is_archived: boolean;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ApprovalStep = {
  id: string;
  document_id: string;
  approver_id: string;
  sequence: number;
  status: StepStatus;
  comment: string | null;
  acted_at: string | null;
  created_at: string;
};

export type ApprovalStepWithUser = ApprovalStep & {
  approver: Profile;
};

export type DocumentWithSteps = Document & {
  steps: ApprovalStepWithUser[];
};

