import { GitLabMilestone } from './GitLabMilestone';

export interface GitLabIssue {
  iid?: number;
  title: string;
  web_url: string;
  created_at: string;
  description: string;
  due_date: string;
  milestone: GitLabMilestone | null;
  state?: string; // 'opened' or 'closed'
  // Issue type: 'issue', 'incident', 'test_case', or 'task'
  issue_type?: 'issue' | 'incident' | 'test_case' | 'task';
  // Type field (alternative name in some API versions)
  type?: string;
  // Hierarchy fields (when fetched with includes)
  has_tasks?: boolean;
  task_completion_status?: {
    count: number;
    completed_count: number;
  };
  // Project references (used to identify parent projects for tasks)
  references?: {
    full: string; // e.g., "group/project#123"
  };
  project_id?: number;
  // Start date from GraphQL WorkItemWidgetStartAndDueDate (fetched separately)
  startDate?: string;
}
