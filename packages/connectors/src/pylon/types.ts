// Pylon API Types - based on https://docs.usepylon.com/pylon-docs/developer/api/api-reference

// Issue states in Pylon
export type IssueState =
  | "new"
  | "waiting_on_you"
  | "waiting_on_customer"
  | "on_hold"
  | "closed";

// Priority levels (Pylon uses numeric or string priorities)
export type IssuePriority = "low" | "normal" | "high" | "urgent";

export interface PylonIssue {
  id: string;
  title: string;
  body_html?: string;
  body_text?: string;
  state: IssueState;
  priority?: IssuePriority;
  issue_number?: number;
  account_id?: string;
  account?: PylonAccount;
  requester_id?: string;
  requester?: PylonContact;
  assignee_id?: string;
  assignee?: PylonUser;
  team_id?: string;
  tags?: string[];
  custom_fields?: Record<string, unknown>;
  snoozed_until?: string;
  created_at: string;
  updated_at: string;
  closed_at?: string;
  first_response_at?: string;
  channel?: string;
}

export interface PylonAccount {
  id: string;
  name: string;
  domains?: string[];
  primary_domain?: string;
  owner_id?: string;
  owner?: PylonUser;
  logo_url?: string;
  tags?: string[];
  custom_fields?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

export interface PylonContact {
  id: string;
  name: string;
  email?: string;
  phone_numbers?: string[];
  primary_phone_number?: string;
  avatar_url?: string;
  account_id?: string;
  account?: PylonAccount;
  portal_role?: "no_access" | "member" | "admin";
  custom_fields?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

export interface PylonUser {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination?: {
    cursor?: string;
    has_more?: boolean;
  };
  request_id?: string;
}

export interface IssueFilters {
  state?: IssueState[];
  priority?: IssuePriority[];
  assignee_id?: string;
  account_id?: string;
  requester_id?: string;
  team_id?: string;
  tags?: string[];
  issue_type?: string;
  created_at?: {
    start?: string;
    end?: string;
  };
}

export interface SearchFilter {
  field: string;
  operator: "equals" | "in" | "not_in" | "contains" | "string_contains";
  value: unknown;
}
