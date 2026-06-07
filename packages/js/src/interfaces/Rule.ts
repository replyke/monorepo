export interface Rule {
  id: string;
  projectId: string;
  spaceId: string;
  title: string;
  description: string | null;
  order: number;
  lastApprovedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface FetchManyRulesResponse {
  data: Rule[];
  count: number;
}

export interface DeleteRuleResponse {
  message: string;
  deletedRule: {
    id: string;
    title: string;
  };
}
