import { Task } from 'ganttlab-entities';
import { treeHierarchyService } from './TreeHierarchyService';

/**
 * Utility for building and managing tree structures from tasks
 */
export class TreeBuilder {
  /**
   * Build a tree structure from a flat list of tasks
   * Links children to their parents and returns only root tasks
   */
  static buildTree(tasks: Task[]): Task[] {
    console.log('=== TreeBuilder.buildTree START ===');
    console.log('Input tasks:', tasks.length);

    // Create a map for quick lookup
    const taskMap = new Map<string, Task>();
    tasks.forEach((task) => {
      if (task.iid) {
        taskMap.set(task.iid, task);
        // Reset children array
        task.children = [];
        task.hasChildren = undefined;
      }
    });

    // First pass: Link children to their parents
    for (const task of tasks) {
      if (!task.iid) continue;

      if (task.parentIid && taskMap.has(task.parentIid)) {
        const parent = taskMap.get(task.parentIid);
        if (parent) {
          if (!parent.children) {
            parent.children = [];
          }
          // Add this task as a child of its parent
          parent.children.push(task);
          parent.hasChildren = true;
          task.depth = (parent.depth || 0) + 1;
        }

        if (parent) {
          console.log(
            `Linked child "${task.title}" (${task.iid}) to parent "${parent.title}" (${parent.iid})`,
          );
        }
      }
    }

    // Second pass: Identify root tasks (those without parents or with parents not in our list)
    const rootTasks: Task[] = [];
    const processedIds = new Set<string>();

    for (const task of tasks) {
      if (!task.iid) continue;

      // Skip if already processed (circular reference protection)
      if (processedIds.has(task.iid)) continue;

      // Check for circular references
      const ancestors = treeHierarchyService.buildAncestorSet(task, tasks);
      if (ancestors.has(task.iid)) {
        console.warn(
          `Circular reference detected for task ${task.iid}, skipping`,
        );
        continue;
      }

      // If task has no parent or parent doesn't exist in our list, it's a root
      if (!task.parentIid || !taskMap.has(task.parentIid)) {
        // IMPORTANT: GitLab Tasks (issue_type='task') should NEVER be root-level items
        // They are always children of Issues, even if parent info is missing
        if (task.isGitLabTask) {
          console.warn(
            `Task "${task.title}" (${task.iid}) has no parent - hiding from root list`,
          );
          continue;
        }

        task.depth = 0;
        task.isVisible = true;
        rootTasks.push(task);
        processedIds.add(task.iid);
      }
    }

    console.log('Root tasks:', rootTasks.length);
    console.log(
      'Root task titles:',
      rootTasks.map((t) => t.title),
    );
    console.log('=== TreeBuilder.buildTree END ===');

    return rootTasks;
  }

  /**
   * Get all visible tasks in tree order (depth-first)
   * Respects expansion state and returns tasks in display order
   *
   * @param rootTasks - Root tasks (from buildTree)
   * @returns Array of visible tasks in display order
   */
  static getVisibleTasks(rootTasks: Task[]): Task[] {
    const visibleTasks: Task[] = [];

    const traverse = (task: Task, depth: number) => {
      task.depth = depth;
      task.isVisible = true;
      visibleTasks.push(task);

      // If task is expanded and has children, traverse them
      if (
        task.isExpanded &&
        task.hasChildren &&
        task.children &&
        task.children.length > 0
      ) {
        for (const child of task.children) {
          traverse(child, depth + 1);
        }
      }
    };

    // Traverse each root task
    for (const rootTask of rootTasks) {
      traverse(rootTask, 0);
    }

    console.log(
      'getVisibleTasks: returning',
      visibleTasks.length,
      'visible tasks',
    );
    return visibleTasks;
  }

  /**
   * Apply expansion state to tasks based on tree hierarchy service
   */
  static applyExpansionState(tasks: Task[]): void {
    for (const task of tasks) {
      if (task.iid) {
        task.isExpanded = treeHierarchyService.isExpanded(task.iid);
      }
    }
  }

  /**
   * Load children for a task from cache
   */
  static loadCachedChildren(task: Task): boolean {
    if (!task.iid) return false;

    const cached = treeHierarchyService.getCachedChildren(task.iid);
    if (cached) {
      task.children = cached;
      return true;
    }
    return false;
  }

  /**
   * Cache children for a task
   */
  static cacheChildren(task: Task): void {
    if (task.iid && task.children) {
      treeHierarchyService.cacheChildren(task.iid, task.children);
    }
  }

  /**
   * Filter tree based on search term
   * Returns tasks that match or have matching descendants
   * @param tasks - Root tasks to filter
   * @param searchTerm - Search term to match
   * @param mode - Filter mode (simple or regex)
   */
  static filterTree(
    tasks: Task[],
    searchTerm: string,
    mode: 'simple' | 'regex',
  ): Task[] {
    if (!searchTerm.trim()) {
      // No filter, return all and mark all as matching
      TreeBuilder.markAllMatching(tasks);
      return tasks;
    }

    const filteredRoots: Task[] = [];

    for (const task of tasks) {
      const filteredTask = TreeBuilder.filterTaskAndDescendants(
        task,
        searchTerm,
        mode,
      );
      if (filteredTask) {
        filteredRoots.push(filteredTask);
      }
    }

    return filteredRoots;
  }

  /**
   * Recursively filter a task and its descendants
   * Returns the task if it or any descendant matches
   */
  private static filterTaskAndDescendants(
    task: Task,
    searchTerm: string,
    mode: 'simple' | 'regex',
  ): Task | null {
    const taskMatches = TreeBuilder.taskMatchesFilter(task, searchTerm, mode);

    // Check descendants
    let hasMatchingDescendant = false;
    const filteredChildren: Task[] = [];

    if (task.children) {
      for (const child of task.children) {
        const filteredChild = TreeBuilder.filterTaskAndDescendants(
          child,
          searchTerm,
          mode,
        );
        if (filteredChild) {
          hasMatchingDescendant = true;
          filteredChildren.push(filteredChild);
        }
      }
    }

    // Include task if it matches OR has matching descendants
    if (taskMatches || hasMatchingDescendant) {
      const filteredTask = { ...task };
      filteredTask.matchesFilter = taskMatches;
      filteredTask.isDimmed = !taskMatches && hasMatchingDescendant;

      // Set children based on whether we have filtered children
      if (filteredChildren.length > 0) {
        // Has matching children - use filtered children list
        filteredTask.children = filteredChildren;
        filteredTask.hasChildren = true;
      } else {
        // No children matched filter, but preserve original hasChildren status
        // This ensures expand/collapse button appears correctly during filtering
        filteredTask.children = task.children || [];
        filteredTask.hasChildren = task.hasChildren || false;
      }

      return filteredTask;
    }

    return null;
  }

  /**
   * Check if a task matches the filter
   */
  private static taskMatchesFilter(
    task: Task,
    searchTerm: string,
    mode: 'simple' | 'regex',
  ): boolean {
    if (mode === 'simple') {
      return task.title.toLowerCase().includes(searchTerm.toLowerCase());
    } else {
      try {
        const regex = new RegExp(searchTerm, 'i');
        return regex.test(task.title);
      } catch {
        return false;
      }
    }
  }

  /**
   * Mark all tasks as matching (used when no filter is active)
   */
  private static markAllMatching(tasks: Task[]): void {
    for (const task of tasks) {
      task.matchesFilter = true;
      task.isDimmed = false;
      if (task.children) {
        TreeBuilder.markAllMatching(task.children);
      }
    }
  }

  /**
   * Highlight matching keywords in task title
   * Returns the title with <mark> tags around matches
   */
  static highlightMatches(
    title: string,
    searchTerm: string,
    mode: 'simple' | 'regex',
  ): string {
    if (!searchTerm.trim()) return title;

    try {
      if (mode === 'simple') {
        const escapedTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(${escapedTerm})`, 'gi');
        return title.replace(regex, '<mark class="bg-gray-200">$1</mark>');
      } else {
        const regex = new RegExp(`(${searchTerm})`, 'gi');
        return title.replace(regex, '<mark class="bg-gray-200">$1</mark>');
      }
    } catch {
      return title;
    }
  }

  /**
   * Flatten tree into a list maintaining hierarchy information
   */
  static flattenTree(tasks: Task[]): Task[] {
    const flattened: Task[] = [];

    const traverse = (task: Task) => {
      flattened.push(task);
      if (task.children) {
        for (const child of task.children) {
          traverse(child);
        }
      }
    };

    for (const task of tasks) {
      traverse(task);
    }

    return flattened;
  }
}
