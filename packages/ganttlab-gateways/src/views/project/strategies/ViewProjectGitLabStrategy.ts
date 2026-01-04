import {
  ViewSourceStrategy,
  Configuration,
  PaginatedListOfTasks,
  Task,
} from 'ganttlab-entities';
import { GitLabGateway } from '../../../sources/gitlab/GitLabGateway';
import { GitLabIssue } from '../../../sources/gitlab/types/GitLabIssue';
import {
  getTaskFromGitLabIssue,
  getPaginationFromGitLabHeaders,
} from '../../../sources/gitlab/helpers';
import { enrichTasksWithHierarchy } from '../../../sources/gitlab/helpers-hierarchy';
import { gitLabStartDateService } from '../../../sources/gitlab/GitLabStartDateService';

export class ViewProjectGitLabStrategy
  implements ViewSourceStrategy<PaginatedListOfTasks> {
  async execute(
    source: GitLabGateway,
    configuration: Configuration,
  ): Promise<PaginatedListOfTasks> {
    const encodedProject = encodeURIComponent(
      configuration.project.path as string,
    );
    const { data, headers } = await source.safeAxiosRequest<Array<GitLabIssue>>(
      {
        method: 'GET',
        url: `/projects/${encodedProject}/issues`,
        params: {
          page: configuration.tasks.page,
          // eslint-disable-next-line @typescript-eslint/camelcase
          per_page: configuration.tasks.pageSize,
          state: 'opened',
        },
      },
    );

    // Fetch start dates via GraphQL
    const projectPath = configuration.project.path as string;
    const iids = data
      .filter((issue) => issue.iid !== undefined)
      .map((issue) => String(issue.iid));

    console.log(`\n=== ViewProjectGitLabStrategy: Fetching start dates ===`);
    console.log(`Project: ${projectPath}`);
    console.log(`Issues to fetch: ${iids.length}`);

    const startDatesMap = await gitLabStartDateService.batchFetchStartDates(
      source,
      projectPath,
      iids,
    );

    console.log(`Start dates map size: ${startDatesMap.size}`);

    // Map start dates back to issues
    for (const gitlabIssue of data) {
      if (gitlabIssue.iid) {
        const iid = String(gitlabIssue.iid);
        const startDate = startDatesMap.get(iid);
        if (startDate) {
          gitlabIssue.startDate = startDate;
          console.log(`  ✓ Assigned startDate "${startDate}" to issue #${iid}`);
        } else {
          console.log(`  ✗ No startDate found for issue #${iid}`);
        }
      }
    }

    const tasksList: Array<Task> = [];
    for (const gitlabIssue of data) {
      const task = getTaskFromGitLabIssue(gitlabIssue);
      tasksList.push(task);
    }

    // Enrich tasks with parent-child hierarchy information
    await enrichTasksWithHierarchy(
      source,
      configuration.project.path as string,
      tasksList,
    );

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
