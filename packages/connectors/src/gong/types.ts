// Gong API Types - based on Gong API v2

export interface GongCall {
  id: string;
  title?: string;
  scheduled?: string;
  started?: string;
  duration?: number; // in seconds
  primaryUserId?: string;
  direction?: "Inbound" | "Outbound" | "Conference" | "Unknown";
  scope?: "Internal" | "External" | "Unknown";
  media?: "Video" | "Audio" | "Chat" | "Unknown";
  language?: string;
  workspaceId?: string;
  url?: string;
  parties?: GongParty[];
  dealIds?: string[];
  accountId?: string;
}

export interface GongParty {
  id: string;
  emailAddress?: string;
  name?: string;
  title?: string;
  userId?: string;
  speakerId?: string;
  affiliation?: "Internal" | "External" | "Unknown";
}

export interface GongDeal {
  id: string;
  name?: string;
  accountId?: string;
  amount?: number;
  closeDate?: string;
  stage?: string;
  status?: "Open" | "Won" | "Lost";
  probability?: number;
  ownerId?: string;
  createdDate?: string;
  lastModifiedDate?: string;
  customFields?: Record<string, unknown>;
  // Computed activity metrics
  callCount?: number;
  lastCallDate?: string;
  engagementScore?: number;
}

export interface GongAccount {
  id: string;
  name?: string;
  domain?: string;
  industry?: string;
  employeeCount?: number;
  annualRevenue?: number;
}

export interface GongUser {
  id: string;
  emailAddress?: string;
  firstName?: string;
  lastName?: string;
  title?: string;
  managerId?: string;
  isActive?: boolean;
  created?: string;
}

export interface GongCallStats {
  callId: string;
  talkRatio?: {
    internal?: number;
    external?: number;
  };
  longestMonologue?: {
    duration?: number;
    speakerId?: string;
  };
  interactivity?: number;
  questionCount?: {
    internal?: number;
    external?: number;
  };
  patience?: number;
}

export interface GongDealActivity {
  dealId: string;
  dealName?: string;
  accountName?: string;
  stage?: string;
  amount?: number;
  closeDate?: string;
  ownerId?: string;
  ownerName?: string;
  recentCalls: {
    count: number;
    lastCallDate?: string;
    totalDuration?: number;
  };
  engagement: {
    score: number;
    trend: "increasing" | "decreasing" | "stable";
    riskLevel: "low" | "medium" | "high";
  };
  nextSteps?: string[];
}

export interface PaginatedResponse<T> {
  requestId?: string;
  records?: {
    totalRecords?: number;
    currentPageSize?: number;
    currentPageNumber?: number;
    cursor?: string;
  };
  data: T[];
}

export interface CallFilters {
  fromDateTime?: string;
  toDateTime?: string;
  workspaceId?: string;
  primaryUserIds?: string[];
}

export interface DealFilters {
  status?: ("Open" | "Won" | "Lost")[];
  ownerId?: string;
  minAmount?: number;
  closeDateFrom?: string;
  closeDateTo?: string;
}
