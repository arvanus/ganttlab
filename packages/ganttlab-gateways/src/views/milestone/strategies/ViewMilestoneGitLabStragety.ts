import {
  ViewSourceStrategy,
  Configuration,
  PaginatedListOfTasks,
  Task,
  Milestone,
  PaginatedListOfMilestones,
} from 'ganttlab-entities';
import { GitLabGateway } from '../../../sources/gitlab/GitLabGateway';
import { GitLabMilestone } from '../../../sources/gitlab/types/GitLabMilestone';
import { GitLabIssue } from '../../../sources/gitlab/types/GitLabIssue';
import {
  getTaskFromGitLabIssue,
  getPaginationFromGitLabHeaders,
  getMilestoneFromGitLabMilestone,
} from '../../../sources/gitlab/helpers';
import { enrichTasksWithHierarchy } from '../../../sources/gitlab/helpers-hierarchy';
import { TasksAndMilestones } from 'ganttlab-use-cases';
import { gitLabStartDateService } from '../../../sources/gitlab/GitLabStartDateService';

export class ViewMilestoneGitLabStrategy
  implements ViewSourceStrategy<TasksAndMilestones> {
  async execute(
    source: GitLabGateway,
    configuration: Configuration,
  ): Promise<TasksAndMilestones> {
    const encodedProject = encodeURIComponent(
      configuration.project.path as string,
    );
    const milestonesResponse = await source.safeAxiosRequest<
      Array<GitLabMilestone>
    >({
      method: 'GET',
      url: `/projects/${encodedProject}/milestones`,
      params: {
        page: configuration.milestones.page,
        // eslint-disable-next-line @typescript-eslint/camelcase
        per_page: configuration.milestones.pageSize,
        state: 'active',
      },
    });
    const milestonesList: Array<Milestone> = [];
    let tasksForActiveMilestone: PaginatedListOfTasks | null = null;
    for (
      let milestoneIndex = 0;
      milestoneIndex < milestonesResponse.data.length;
      milestoneIndex++
    ) {
      const gitlabMilestone = milestonesResponse.data[milestoneIndex];
      const milestone = getMilestoneFromGitLabMilestone(gitlabMilestone);

      // loading tasks for the active milestone
      if (milestoneIndex === configuration.activeMilestone) {
        const { data, headers } = await source.safeAxiosRequest<
          Array<GitLabIssue>
        >({
          method: 'GET',
          url: `/projects/${encodedProject}/issues`,
          params: {
            page: configuration.tasks.page,
            // eslint-disable-next-line @typescript-eslint/camelcase
            per_page: configuration.tasks.pageSize,
            state: 'opened',
            milestone: milestone.name,
          },
        });

        // Fetch start dates via GraphQL
        const projectPath = configuration.project.path as string;
        const iids = data
          .filter((issue) => issue.iid !== undefined)
          .map((issue) => String(issue.iid));
        const startDatesMap = await gitLabStartDateService.batchFetchStartDates(
          source,
          projectPath,
          iids,
        );

        // Map start dates back to issues
        for (const gitlabIssue of data) {
          if (gitlabIssue.iid) {
            const iid = String(gitlabIssue.iid);
            const startDate = startDatesMap.get(iid);
            if (startDate) {
              gitlabIssue.startDate = startDate;
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
        const pagination = getPaginationFromGitLabHeaders(headers);
        tasksForActiveMilestone = new PaginatedListOfTasks(
          tasksList,
          configuration.tasks.page as number,
          configuration.tasks.pageSize as number,
          pagination.previousPage,
          pagination.nextPage,
          pagination.lastPage,
          pagination.total,
        );
      }

      milestonesList.push(milestone);
    }

    const gitlabPagination = getPaginationFromGitLabHeaders(
      milestonesResponse.headers,
    );

    return new TasksAndMilestones(
      new PaginatedListOfMilestones(
        milestonesList,
        configuration.milestones.page as number,
        configuration.milestones.pageSize as number,
        gitlabPagination.previousPage,
        gitlabPagination.nextPage,
        gitlabPagination.lastPage,
      ),
      tasksForActiveMilestone,
    );
  }
}
