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
import { gitLabHierarchyService } from '../../../sources/gitlab/GitLabHierarchyService';
import { gitLabStartDateService } from '../../../sources/gitlab/GitLabStartDateService';

export class ViewAssignedToGitLabStrategy
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
          // eslint-disable-next-line @typescript-eslint/camelcase
          assignee_username: configuration.assigneeUsername,
          scope: 'all',
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
    const tasksWithProjectInfo: Array<{
      task: Task;
      gitlabIssue: GitLabIssue;
    }> = [];

    console.log('=== ViewAssignedTo: Processing API response ===');
    console.log(`Total items returned by API: ${data.length}`);

    for (const gitlabIssue of data) {
      const task = getTaskFromGitLabIssue(gitlabIssue);
      tasksList.push(task);
      tasksWithProjectInfo.push({ task, gitlabIssue });

      console.log(
        `  ${task.isGitLabTask ? 'TASK' : 'ISSUE'} #${task.iid}: "${
          task.title
        }" (dimmed: ${task.isDimmed || false})`,
      );
      if (task.isGitLabTask) {
        console.log(`    → web_url: ${gitlabIssue.web_url}`);
      }
    }

    console.log(`\nBefore fetching parents: ${tasksList.length} items`);
    console.log(
      `  - Issues: ${tasksList.filter((t) => t.isGitLabIssue).length}`,
    );
    console.log(`  - Tasks: ${tasksList.filter((t) => t.isGitLabTask).length}`);

    // Find tasks that need parent fetching (issue_type='task')
    await this.fetchMissingParents(source, tasksList, tasksWithProjectInfo);

    console.log(`\n=== FINAL TASK LIST ===`);
    console.log(`After fetching parents: ${tasksList.length} items`);
    console.log(
      `  - Issues: ${tasksList.filter((t) => t.isGitLabIssue).length}`,
    );
    console.log(`  - Tasks: ${tasksList.filter((t) => t.isGitLabTask).length}`);
    console.log(
      `  - Dimmed items: ${tasksList.filter((t) => t.isDimmed).length}`,
    );
    console.log(
      `  - Non-dimmed items: ${tasksList.filter((t) => !t.isDimmed).length}`,
    );

    console.log(`\nFinal state of all tasks:`);
    tasksList.forEach((t) => {
      const type = t.isGitLabTask ? 'TASK' : 'ISSUE';
      const dimmed = t.isDimmed ? '(DIMMED)' : '';
      const parent = t.parentIid ? `parent:#${t.parentIid}` : 'NO PARENT';
      console.log(`  ${type} #${t.iid}: "${t.title}" ${dimmed} [${parent}]`);
    });

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

  /**
   * Fetch parent issues for tasks that don't have their parents in the result set
   */
  private async fetchMissingParents(
    source: GitLabGateway,
    tasksList: Task[],
    tasksWithProjectInfo: Array<{ task: Task; gitlabIssue: GitLabIssue }>,
  ): Promise<void> {
    console.log('=== fetchMissingParents START ===');

    // Group tasks by project to batch fetch hierarchy info
    const projectTasksMap = new Map<
      string,
      Array<{ task: Task; gitlabIssue: GitLabIssue }>
    >();

    for (const item of tasksWithProjectInfo) {
      if (item.task.isGitLabTask && item.task.iid) {
        // Extract project path from web_url
        // Format: https://gitlab.com/group/project/-/issues/123
        const projectPath = this.extractProjectPath(item.gitlabIssue.web_url);
        console.log(`\n  Task #${item.task.iid}: "${item.task.title}"`);
        console.log(`    web_url: ${item.gitlabIssue.web_url}`);
        console.log(
          `    extracted project path: ${projectPath || 'FAILED TO EXTRACT'}`,
        );

        if (projectPath) {
          if (!projectTasksMap.has(projectPath)) {
            projectTasksMap.set(projectPath, []);
          }
          projectTasksMap.get(projectPath)!.push(item);
        } else {
          console.error(
            `    ❌ Failed to extract project path - task will have no parent info!`,
          );
        }
      }
    }

    console.log(`Found ${projectTasksMap.size} projects with tasks`);

    // For each project, fetch hierarchy info and parent issues
    for (const [projectPath, items] of Array.from(projectTasksMap.entries())) {
      console.log(
        `Processing project: ${projectPath} with ${items.length} tasks`,
      );

      const iids = items.map(
        (item: { task: Task; gitlabIssue: GitLabIssue }) => item.task.iid!,
      );

      try {
        console.log(
          `\n  📡 Fetching hierarchy for ${iids.length} tasks in project: ${projectPath}`,
        );
        console.log(`  Task IIDs: ${iids.join(', ')}`);

        // Fetch hierarchy info using GraphQL
        const hierarchyMap = await gitLabHierarchyService.batchFetchHierarchy(
          source,
          projectPath,
          iids,
        );

        console.log(
          `  📥 GraphQL returned hierarchy info for ${hierarchyMap.size} tasks`,
        );

        // Collect parent IIDs that need to be fetched
        const parentIidsToFetch = new Set<string>();
        const taskIidSet = new Set(tasksList.map((t) => t.iid));

        for (const item of items) {
          const hierarchyInfo = hierarchyMap.get(item.task.iid!);

          console.log(
            `\n    Processing Task #${item.task.iid}: "${item.task.title}"`,
          );
          console.log(
            `      hierarchyMap has entry: ${hierarchyMap.has(item.task.iid!)}`,
          );

          if (hierarchyInfo) {
            console.log(
              `      hierarchyInfo.hasParent: ${hierarchyInfo.hasParent}`,
            );
            console.log(
              `      hierarchyInfo.parent: ${
                hierarchyInfo.parent
                  ? JSON.stringify(hierarchyInfo.parent)
                  : 'null'
              }`,
            );
          }

          if (hierarchyInfo?.hasParent && hierarchyInfo.parent) {
            const parentIid = hierarchyInfo.parent.iid;
            item.task.parentIid = parentIid;

            console.log(`      ✓ SET item.task.parentIid = "${parentIid}"`);
            console.log(`      ✓ Task object in memory:`, item.task);

            // Only fetch parent if it's not already in our task list
            if (!taskIidSet.has(parentIid)) {
              parentIidsToFetch.add(parentIid);
              console.log(
                `      → Parent #${parentIid} needs to be fetched (not in task list)`,
              );
            } else {
              console.log(`      → Parent #${parentIid} already in task list`);
            }
          } else {
            console.log(
              `      ❌ Task #${item.task.iid} has NO parent info from GraphQL or parent is null`,
            );
          }
        }

        console.log(
          `Need to fetch ${parentIidsToFetch.size} parent issues for project ${projectPath}`,
        );

        // Fetch missing parent issues
        if (parentIidsToFetch.size > 0) {
          const encodedProject = encodeURIComponent(projectPath);
          const parentIidsArray = Array.from(parentIidsToFetch);

          console.log(
            `\n  📡 Fetching ${
              parentIidsArray.length
            } parent issues: [${parentIidsArray.join(', ')}]`,
          );

          // Fetch parent issues in batches
          for (let i = 0; i < parentIidsArray.length; i += 20) {
            const batch = parentIidsArray.slice(i, i + 20);
            const iidsParam = batch.join(',');

            console.log(
              `\n  Batch ${Math.floor(i / 20) + 1}: Fetching IIDs [${batch.join(
                ', ',
              )}]`,
            );
            console.log(
              `  API URL: /projects/${encodedProject}/issues?iids=${iidsParam}&state=opened`,
            );

            try {
              const { data: parentIssues } = await source.safeAxiosRequest<
                Array<GitLabIssue>
              >({
                method: 'GET',
                url: `/projects/${encodedProject}/issues`,
                params: {
                  iids: iidsParam,
                  state: 'all', // Fetch parent issues regardless of state (opened/closed)
                },
              });

              console.log(
                `  📥 API returned ${parentIssues.length} parent issues`,
              );
              parentIssues.forEach((pi) => {
                console.log(`    - Issue #${pi.iid}: "${pi.title}"`);
              });

              // Check for missing parents
              const returnedIids = new Set(
                parentIssues.map((pi) => String(pi.iid)),
              );
              const missingIids = batch.filter((iid) => !returnedIids.has(iid));
              if (missingIids.length > 0) {
                console.warn(
                  `  ⚠️ API did NOT return these parent issues: [${missingIids.join(
                    ', ',
                  )}]`,
                );
                console.warn(
                  `     Possible reasons: closed, deleted, or access denied`,
                );
              }

              // Fetch start dates for parent issues
              const parentIids = parentIssues
                .filter((issue) => issue.iid !== undefined)
                .map((issue) => String(issue.iid));
              if (parentIids.length > 0) {
                const parentStartDatesMap = await gitLabStartDateService.batchFetchStartDates(
                  source,
                  projectPath,
                  parentIids,
                );
                // Map start dates back to parent issues
                for (const parentIssue of parentIssues) {
                  if (parentIssue.iid) {
                    const iid = String(parentIssue.iid);
                    const startDate = parentStartDatesMap.get(iid);
                    if (startDate) {
                      parentIssue.startDate = startDate;
                    }
                  }
                }
              }

              // Add parent issues to task list with isDimmed flag
              for (const parentIssue of parentIssues) {
                const parentTask = getTaskFromGitLabIssue(parentIssue);
                parentTask.isDimmed = true;
                parentTask.matchesFilter = false;
                tasksList.push(parentTask);

                const closedStatus = parentTask.isClosed ? ' [CLOSED]' : '';
                console.log(
                  `  ✓ Added parent issue "${parentTask.title}" (iid:${parentTask.iid}) as dimmed${closedStatus}`,
                );
              }
            } catch (error) {
              console.error(
                `  ❌ Failed to fetch parent issues batch for ${projectPath}:`,
                error,
              );
            }
          }
        }
      } catch (error) {
        console.warn(
          `Failed to fetch hierarchy for project ${projectPath}:`,
          error,
        );
      }
    }

    console.log('=== fetchMissingParents END ===');
  }

  /**
   * Extract project path from GitLab issue web URL
   * Example: https://gitlab.com/group/project/-/issues/123 -> group/project
   */
  private extractProjectPath(webUrl: string): string | null {
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
}
