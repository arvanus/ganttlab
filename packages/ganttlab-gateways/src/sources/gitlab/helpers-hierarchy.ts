import { Task } from 'ganttlab-entities';
import { GitLabGateway } from './GitLabGateway';
import { gitLabHierarchyService } from './GitLabHierarchyService';

/**
 * Build parent-child hierarchy using GitLab's issue_type and has_tasks fields
 *
 * In GitLab:
 * - issue_type='issue' with has_tasks=true = PARENT (has children)
 * - issue_type='issue' with has_tasks=false = ISSUE without children (not a parent)
 * - issue_type='task' = CHILD (belongs under an issue, should not be in root list)
 *
 * This fallback uses title matching to infer parent-child relationships when
 * GraphQL hierarchy info is unavailable. It's not perfect but better than nothing.
 *
 * @param tasks - Array of tasks to analyze and update
 */
function internalBuildHierarchyFromIssueType(tasks: Task[]): void {
  console.log('=== buildHierarchyFromIssueType START ===');
  console.log('Total tasks:', tasks.length);

  // Separate Issues and Tasks based on issue_type
  const issues: Task[] = [];
  const gitlabTasks: Task[] = [];

  for (const task of tasks) {
    if (task.isGitLabTask) {
      // issue_type='task' - these are children
      gitlabTasks.push(task);
      console.log(`  Task (iid:${task.iid}): "${task.title}"`);
    } else if (task.isGitLabIssue) {
      // issue_type='issue' - potential parents
      issues.push(task);
      if (task.hasChildren) {
        // has_tasks=true means it has children
        console.log(
          `  Issue with children (iid:${task.iid}, has_tasks=true): "${task.title}"`,
        );
      }
    }
  }

  console.log(`Found ${issues.length} Issues, ${gitlabTasks.length} Tasks`);

  // For each Task (issue_type='task'), try to find its parent Issue
  // Since GraphQL is unavailable, we use title matching as a heuristic
  // This is a best-effort approach - parent info should ideally come from GraphQL

  for (const gitlabTask of gitlabTasks) {
    if (!gitlabTask.iid) continue;

    const taskTitle = gitlabTask.title.trim().toLowerCase();

    // Find the Issue that this Task belongs to
    // Strategy: Find an Issue whose title is a prefix of this Task's title
    // This works when tasks are named like "Parent Issue - Subtask 1"

    let bestMatch: Task | null = null;
    let bestMatchLength = 0;

    for (const issue of issues) {
      if (!issue.iid) continue;

      // Skip issues that don't have has_tasks=true
      // (they shouldn't have children)
      if (!issue.hasChildren) continue;

      const issueTitle = issue.title.trim().toLowerCase();

      // Check if task title starts with issue title (task is a subtask of this issue)
      if (
        taskTitle.startsWith(issueTitle) &&
        issueTitle.length > bestMatchLength
      ) {
        // Make sure there's a separator after the issue title
        if (taskTitle.length > issueTitle.length) {
          const suffix = taskTitle.slice(issueTitle.length);
          if (/^[\s\-_:&]+/.test(suffix)) {
            bestMatch = issue;
            bestMatchLength = issueTitle.length;
          }
        }
      }
    }

    if (bestMatch) {
      // Link Task to its parent Issue
      gitlabTask.parentIid = bestMatch.iid;

      console.log(
        `✓ Linked Task "${gitlabTask.title}" (iid:${gitlabTask.iid}) → Issue "${bestMatch.title}" (iid:${bestMatch.iid})`,
      );
    } else {
      console.log(
        `⚠ No parent found for Task "${gitlabTask.title}" (iid:${gitlabTask.iid}) - needs GraphQL`,
      );
    }
  }

  console.log('=== buildHierarchyFromIssueType END ===');

  // Final summary
  const childTasks = tasks.filter((t) => t.parentIid);
  const rootTasks = tasks.filter((t) => !t.parentIid);
  console.log(
    `Root tasks (${rootTasks.length}):`,
    rootTasks
      .map((t) => `${t.isGitLabTask ? 'Task' : 'Issue'}: ${t.title}`)
      .slice(0, 5),
  );
  console.log(
    `Child tasks (${childTasks.length}):`,
    childTasks.map((t) => t.title).slice(0, 5),
  );
}

/**
 * Enrich tasks with hierarchy information using GitLab GraphQL WorkItemWidgetHierarchy
 *
 * This function uses the correct GitLab API approach to fetch parent/child relationships:
 * 1. Primary: GraphQL WorkItemWidgetHierarchy - provides accurate parent/child data
 * 2. Fallback: issue_type and has_tasks fields with title matching heuristics
 *
 * GitLab hierarchy rules:
 * - issue_type='issue' with has_tasks=true → parent issue (has children)
 * - issue_type='issue' with has_tasks=false → standalone issue (no children)
 * - issue_type='task' → child task (belongs to a parent issue, should not be in root list)
 *
 * @param gateway - GitLab gateway instance
 * @param projectPath - Full project path (e.g., "group/project")
 * @param tasks - Array of tasks to enrich
 * @returns Promise that resolves when enrichment is complete
 */
export async function enrichTasksWithHierarchy(
  gateway: GitLabGateway,
  projectPath: string,
  tasks: Task[],
): Promise<void> {
  console.log('=== enrichTasksWithHierarchy START ===');
  console.log('Project path:', projectPath);
  console.log('Number of tasks:', tasks.length);

  // Extract IIDs from tasks
  const iids = tasks
    .filter((task) => task.iid)
    .map((task) => task.iid as string);

  console.log('Task IIDs:', iids);

  if (iids.length === 0) {
    console.log('No tasks with IIDs found, skipping hierarchy enrichment');
    return;
  }

  // Create a set of IIDs for quick lookup (to check if linked issues are in our list)
  const iidSet = new Set(iids);

  // Track parent-child relationships
  const parentMap = new Map<string, string>(); // childIid -> parentIid
  const childrenMap = new Map<string, Set<string>>(); // parentIid -> Set of childIids

  try {
    // Use GraphQL to fetch hierarchy via WorkItemWidgetHierarchy
    // This is the correct way to get parent-child relationships in GitLab
    const hierarchyMap = await gitLabHierarchyService.batchFetchHierarchy(
      gateway,
      projectPath,
      iids,
    );

    // Build parent and children maps from GraphQL results
    hierarchyMap.forEach((hierarchyInfo, iid) => {
      // Set parent relationship
      if (hierarchyInfo.hasParent && hierarchyInfo.parent) {
        const parentIid = hierarchyInfo.parent.iid;
        parentMap.set(iid, parentIid);

        // Add to parent's children set
        if (!childrenMap.has(parentIid)) {
          childrenMap.set(parentIid, new Set());
        }
        childrenMap.get(parentIid)?.add(iid);
      }

      // Track children
      if (hierarchyInfo.hasChildren) {
        if (!childrenMap.has(iid)) {
          childrenMap.set(iid, new Set());
        }
      }
    });

    // Apply hierarchy information to tasks
    for (const task of tasks) {
      if (!task.iid) continue;

      // Set parent information
      const parentIid = parentMap.get(task.iid);
      if (parentIid) {
        task.parentIid = parentIid;
      }

      // Set children flag from GraphQL data
      // NOTE: Don't overwrite existing hasChildren - it may already be set from has_tasks field
      const children = childrenMap.get(task.iid);
      if (children && children.size > 0) {
        task.hasChildren = true;
      }
      // If GraphQL didn't provide child info, preserve existing hasChildren from has_tasks
    }

    // Count tasks that actually have children (from GraphQL or has_tasks field)
    const tasksWithChildrenCount = tasks.filter((t) => t.hasChildren).length;

    console.log('Hierarchy enrichment complete:', {
      totalTasks: tasks.length,
      tasksWithParent: Array.from(parentMap.keys()).length,
      tasksWithChildren: tasksWithChildrenCount,
      tasksWithChildrenFromGraphQL: Array.from(childrenMap.keys()).filter(
        (k) => (childrenMap.get(k)?.size ?? 0) > 0,
      ).length,
      parentChildRelations: Array.from(parentMap.entries()).map(
        ([child, parent]) => `${child} -> ${parent}`,
      ),
    });

    // If no relationships found via GraphQL, use issue_type and has_tasks as fallback
    // Issues (issue_type='issue' with has_tasks=true) are parents
    // Tasks (issue_type='task') are children
    if (parentMap.size === 0) {
      console.log(
        'No hierarchy found via GraphQL, using issue_type and has_tasks...',
      );
      internalBuildHierarchyFromIssueType(tasks);
    }
  } catch (error) {
    console.warn('Failed to enrich tasks with hierarchy via GraphQL:', error);

    // Fallback to issue_type and has_tasks approach
    console.log('Using issue_type and has_tasks as fallback...');
    internalBuildHierarchyFromIssueType(tasks);
  }
}

/**
 * Fetch children for a specific task
 * This is called lazily when a task is expanded
 *
 * @param gateway - GitLab gateway instance
 * @param projectPath - Full project path
 * @param parentTask - Parent task to fetch children for
 * @returns Array of child tasks
 */
export async function fetchChildrenForTask(
  gateway: GitLabGateway,
  projectPath: string,
  parentTask: Task,
): Promise<Task[]> {
  if (!parentTask.iid) return [];

  try {
    const result = await gitLabHierarchyService.fetchChildren(
      gateway,
      projectPath,
      parentTask.iid as string,
    );

    const children: Task[] = [];

    for (const childInfo of result.children) {
      // Create a basic task for the child
      // In a real scenario, we'd need to fetch full issue details
      const childTask = new Task(
        childInfo.title,
        childInfo.webUrl,
        parentTask.start, // Inherit parent's start for now
        parentTask.due, // Inherit parent's due for now
      );

      childTask.iid = childInfo.iid;
      childTask.parentIid = parentTask.iid;
      childTask.depth = (parentTask.depth || 0) + 1;

      children.push(childTask);
    }

    // Handle pagination if needed
    if (result.hasMore && result.endCursor) {
      let cursor = result.endCursor;
      while (cursor) {
        const nextResult = await gitLabHierarchyService.fetchChildren(
          gateway,
          projectPath,
          parentTask.iid as string,
          100,
          cursor,
        );

        for (const childInfo of nextResult.children) {
          const childTask = new Task(
            childInfo.title,
            childInfo.webUrl,
            parentTask.start,
            parentTask.due,
          );
          childTask.iid = childInfo.iid;
          childTask.parentIid = parentTask.iid;
          childTask.depth = (parentTask.depth || 0) + 1;
          children.push(childTask);
        }

        if (!nextResult.hasMore || !nextResult.endCursor) break;
        cursor = nextResult.endCursor;
      }
    }

    return children;
  } catch (error) {
    console.warn(`Failed to fetch children for task ${parentTask.iid}:`, error);
    return [];
  }
}
