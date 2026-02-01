// HubSpot API Types

export interface HubSpotContact {
  id: string;
  properties: {
    email?: string;
    firstname?: string;
    lastname?: string;
    phone?: string;
    company?: string;
    jobtitle?: string;
    lifecyclestage?: string;
    hs_lead_status?: string;
    createdate?: string;
    lastmodifieddate?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface HubSpotCompany {
  id: string;
  properties: {
    name?: string;
    domain?: string;
    industry?: string;
    phone?: string;
    city?: string;
    state?: string;
    country?: string;
    numberofemployees?: string;
    annualrevenue?: string;
    lifecyclestage?: string;
    hs_lead_status?: string;
    createdate?: string;
    lastmodifieddate?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface HubSpotDeal {
  id: string;
  properties: {
    dealname?: string;
    amount?: string;
    dealstage?: string;
    pipeline?: string;
    closedate?: string;
    createdate?: string;
    hs_lastmodifieddate?: string;
    hubspot_owner_id?: string;
    solutions_engineer?: string;
    hs_deal_stage_probability?: string;
    product?: string;
    hs_next_step?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface HubSpotOwner {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  userId?: number;
  createdAt: string;
  updatedAt: string;
  archived: boolean;
}

export interface EnrichedHubSpotDeal extends HubSpotDeal {
  ownerName?: string;
  ownerEmail?: string;
  solutionsEngineerName?: string;
  solutionsEngineerEmail?: string;
}

export interface HubSpotEngagement {
  id: string;
  properties: {
    hs_timestamp?: string;
    hs_activity_type?: string;
    hs_engagement_type?: string;
    hs_body_preview?: string;
    hubspot_owner_id?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface HubSpotPipeline {
  id: string;
  label: string;
  displayOrder: number;
  stages: HubSpotPipelineStage[];
}

export interface HubSpotPipelineStage {
  id: string;
  label: string;
  displayOrder: number;
  metadata: {
    probability?: string;
    isClosed?: string;
  };
}

export interface HubSpotSearchResponse<T> {
  total: number;
  results: T[];
  paging?: {
    next?: {
      after: string;
    };
  };
}

export interface PipelineSummary {
  pipeline: string;
  stages: { name: string; count: number; totalValue: number }[];
  totalDeals: number;
  totalValue: number;
}

export interface CRMMetrics {
  contacts: { total: number; recentlyCreated: number };
  companies: { total: number };
  deals: { open: number; closingSoon: number; totalPipelineValue: number };
}
