import { issueDescriptionToTaskDetails } from '../abstracts/helpers';
import { Task, Milestone } from 'ganttlab-entities';
import { GitLabIssue } from './types/GitLabIssue';
import { AxiosHeaders } from '../abstracts/AxiosHeaders';
import { GitLabMilestone } from './types/GitLabMilestone';

export function getTaskFromGitLabIssue(gitlabIssue: GitLabIssue): Task {
  const {
    startDate: descriptionStartDate,
    dueDate,
  } = issueDescriptionToTaskDetails(gitlabIssue.description);
  // Priority: 1. GraphQL startDate, 2. GanttStart from description, 3. Milestone start_date, 4. Creation date
  let startDateSource = 'created_at';
  let taskStartDate: Date;

  if (gitlabIssue.startDate) {
    taskStartDate = new Date(gitlabIssue.startDate);
    startDateSource = 'GraphQL startDate';
  } else if (descriptionStartDate) {
    taskStartDate = descriptionStartDate;
    startDateSource = 'GanttStart from description';
  } else if (gitlabIssue.milestone && gitlabIssue.milestone.start_date) {
    taskStartDate = new Date(gitlabIssue.milestone.start_date);
    startDateSource = 'Milestone start_date';
  } else {
    taskStartDate = new Date(gitlabIssue.created_at);
    startDateSource = 'created_at (fallback)';
  }

  console.log(
    `📅 Issue #${gitlabIssue.iid} "${gitlabIssue.title}": startDate=${
      taskStartDate.toISOString().split('T')[0]
    } (source: ${startDateSource})`,
  );

  const task = new Task(
    gitlabIssue.title,
    gitlabIssue.web_url,
    taskStartDate,
    dueDate
      ? dueDate
      : gitlabIssue.due_date
      ? new Date(gitlabIssue.due_date)
      : gitlabIssue.milestone && gitlabIssue.milestone.due_date
      ? new Date(gitlabIssue.milestone.due_date)
      : undefined,
  );

  // Add hierarchy information
  if (gitlabIssue.iid) {
    task.iid = String(gitlabIssue.iid);
  }

  // Set issue type from GitLab API
  // issue_type can be: 'issue', 'incident', 'test_case', or 'task'
  const issueType = gitlabIssue.issue_type || gitlabIssue.type;
  if (issueType === 'task') {
    task.isGitLabTask = true;
    task.isGitLabIssue = false;
  } else {
    task.isGitLabIssue = true;
    task.isGitLabTask = false;
  }

  // If has_tasks is true, it has children (subtasks)
  if (gitlabIssue.has_tasks) {
    task.hasChildren = true;
  }

  // Set closed state
  if (gitlabIssue.state === 'closed') {
    task.isClosed = true;
  }

  return task;
}

export function getPaginationFromGitLabHeaders(
  headers: AxiosHeaders,
): {
  previousPage: number | undefined;
  nextPage: number | undefined;
  lastPage: number | undefined;
  total: number | undefined;
} {
  return {
    previousPage: headers['x-prev-page']
      ? parseInt(headers['x-prev-page'])
      : undefined,
    nextPage: headers['x-next-page']
      ? parseInt(headers['x-next-page'])
      : undefined,
    lastPage: headers['x-total-pages']
      ? parseInt(headers['x-total-pages'])
      : undefined,
    total: headers['x-total'] ? parseInt(headers['x-total']) : undefined,
  };
}

export function getMilestoneFromGitLabMilestone(
  gitlabMilestone: GitLabMilestone,
): Milestone {
  return new Milestone(
    gitlabMilestone.title,
    undefined,
    gitlabMilestone.description,
    gitlabMilestone.start_date
      ? new Date(gitlabMilestone.start_date)
      : undefined,
    gitlabMilestone.due_date ? new Date(gitlabMilestone.due_date) : undefined,
  );
}

/**
 * Extract project path from GitLab issue web URL
 * Example: https://gitlab.com/group/project/-/issues/123 -> group/project
 */
export function extractProjectPathFromWebUrl(webUrl: string): string | null {
  try {
    const url = new URL(webUrl);
    const pathParts = url.pathname.split('/-/');
    if (pathParts.length > 0) {
      // Remove leading slash
      return pathParts[0].substring(1);
    }
  } catch (error) {
    console.warn('Failed to extract project path from URL:', webUrl);
  }
  return null;
}
