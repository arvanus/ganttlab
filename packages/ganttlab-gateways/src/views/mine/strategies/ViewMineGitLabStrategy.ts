import { GitLabGateway } from '../../../sources/gitlab/GitLabGateway';
import {
  ViewSourceStrategy,
  Configuration,
  PaginatedListOfTasks,
  Task,
} from 'ganttlab-entities';
import { GitLabIssue } from '../../../sources/gitlab/types/GitLabIssue';
import {
  getTaskFromGitLabIssue,
  getPaginationFromGitLabHeaders,
  extractProjectPathFromWebUrl,
} from '../../../sources/gitlab/helpers';
import { gitLabStartDateService } from '../../../sources/gitlab/GitLabStartDateService';

export class ViewMineGitLabStrategy
  implements ViewSourceStrategy<PaginatedListOfTasks> {
  async execute(
    source: GitLabGateway,
    configuration: Configuration,
  ): Promise<PaginatedListOfTasks> {
    const { data, headers } = await source.safeAxiosRequest<Array<GitLabIssue>>(
      {
        method: 'GET',
        url: '/issues',
        params: {
          page: configuration.tasks.page,
          // eslint-disable-next-line @typescript-eslint/camelcase
          per_page: configuration.tasks.pageSize,
          state: 'opened',
        },
      },
    );

    // Group issues by project path and fetch start dates
    const issuesByProject = new Map<string, GitLabIssue[]>();
    for (const gitlabIssue of data) {
      const projectPath = extractProjectPathFromWebUrl(gitlabIssue.web_url);
      if (projectPath && gitlabIssue.iid) {
        if (!issuesByProject.has(projectPath)) {
          issuesByProject.set(projectPath, []);
        }
        issuesByProject.get(projectPath)!.push(gitlabIssue);
      }
    }

    // Fetch start dates for each project
    const projectPaths = Array.from(issuesByProject.keys());
    for (const projectPath of projectPaths) {
      const issues = issuesByProject.get(projectPath) || [];
      const iids = issues
        .filter((issue: GitLabIssue) => issue.iid !== undefined)
        .map((issue: GitLabIssue) => String(issue.iid));
      if (iids.length > 0) {
        const startDatesMap = await gitLabStartDateService.batchFetchStartDates(
          source,
          projectPath,
          iids,
        );
        // Map start dates back to issues
        for (const gitlabIssue of issues) {
          if (gitlabIssue.iid) {
            const iid = String(gitlabIssue.iid);
            const startDate = startDatesMap.get(iid);
            if (startDate) {
              gitlabIssue.startDate = startDate;
            }
          }
        }
      }
    }

    const tasksList: Array<Task> = [];
    for (const gitlabIssue of data) {
      const task = getTaskFromGitLabIssue(gitlabIssue);
      tasksList.push(task);
    }
    tasksList.sort((a: Task, b: Task) => {
      if (a.due && b.due) {
        return a.due.getTime() - b.due.getTime();
      }
      return 0;
    });
    const gitlabPagination = getPaginationFromGitLabHeaders(headers);
    return new PaginatedListOfTasks(
      tasksList,
      configuration.tasks.page as number,
      configuration.tasks.pageSize as number,
      gitlabPagination.previousPage,
      gitlabPagination.nextPage,
      gitlabPagination.lastPage,
      gitlabPagination.total,
    );
  }
}
