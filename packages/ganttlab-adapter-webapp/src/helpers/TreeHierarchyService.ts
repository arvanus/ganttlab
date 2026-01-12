import { Task } from 'ganttlab-entities';

/**
 * Tree expansion state stored in session storage
 */
interface TreeState {
  expandedIds: string[];
}

/**
 * Service for managing issue tree hierarchy state
 */
export class TreeHierarchyService {
  private static readonly STORAGE_KEY = 'issueTreeState';
  private expandedIds: Set<string> = new Set();
  private childrenCache: Map<string, Task[]> = new Map();
  private ancestorSet: Set<string> = new Set();

  constructor() {
    this.loadStateFromSession();
  }

  /**
   * Load expansion state from sessionStorage
   */
  private loadStateFromSession(): void {
    try {
      const stored = sessionStorage.getItem(TreeHierarchyService.STORAGE_KEY);
      if (stored) {
        const state: TreeState = JSON.parse(stored);
        this.expandedIds = new Set(state.expandedIds || []);
      }
    } catch (error) {
      console.warn('Failed to load tree state from session:', error);
    }
  }

  /**
   * Save expansion state to sessionStorage
   */
  private saveStateToSession(): void {
    try {
      const state: TreeState = {
        expandedIds: Array.from(this.expandedIds),
      };
      sessionStorage.setItem(
        TreeHierarchyService.STORAGE_KEY,
        JSON.stringify(state),
      );
    } catch (error) {
      console.warn('Failed to save tree state to session:', error);
    }
  }

  /**
   * Check if a task is expanded
   */
  isExpanded(taskIid: string): boolean {
    return this.expandedIds.has(taskIid);
  }

  /**
   * Toggle expansion state of a task
   */
  toggleExpansion(taskIid: string): boolean {
    if (this.expandedIds.has(taskIid)) {
      this.expandedIds.delete(taskIid);
      this.saveStateToSession();
      return false;
    } else {
      this.expandedIds.add(taskIid);
      this.saveStateToSession();
      return true;
    }
  }

  /**
   * Expand a task
   */
  expand(taskIid: string): void {
    this.expandedIds.add(taskIid);
    this.saveStateToSession();
  }

  /**
   * Collapse a task
   */
  collapse(taskIid: string): void {
    this.expandedIds.delete(taskIid);
    this.saveStateToSession();
  }

  /**
   * Get cached children for a task
   */
  getCachedChildren(taskIid: string): Task[] | undefined {
    return this.childrenCache.get(taskIid);
  }

  /**
   * Cache children for a task
   */
  cacheChildren(taskIid: string, children: Task[]): void {
    this.childrenCache.set(taskIid, children);
  }

  /**
   * Clear the children cache
   */
  clearCache(): void {
    this.childrenCache.clear();
  }

  /**
   * Clear expansion state
   */
  clearExpansionState(): void {
    this.expandedIds.clear();
    this.saveStateToSession();
  }

  /**
   * Check if adding a task as a child would create a circular reference
   * @param parentIid - The parent task IID
   * @param childIid - The child task IID to check
   * @param ancestors - Set of ancestor IIDs
   */
  wouldCreateCircularReference(
    parentIid: string,
    childIid: string,
    ancestors: Set<string>,
  ): boolean {
    return ancestors.has(childIid);
  }

  /**
   * Build ancestor set for circular reference detection
   */
  buildAncestorSet(task: Task, tasks: Task[]): Set<string> {
    const ancestors = new Set<string>();
    let currentTask: Task | undefined = task;

    while (currentTask && currentTask.parentIid) {
      if (ancestors.has(currentTask.parentIid)) {
        // Circular reference detected
        console.warn(
          `Circular reference detected: ${currentTask.iid} -> ${currentTask.parentIid}`,
        );
        break;
      }
      ancestors.add(currentTask.parentIid);
      currentTask = tasks.find((t) => t.iid === currentTask?.parentIid);
    }

    return ancestors;
  }

  /**
   * Get all expanded task IIDs
   */
  getExpandedIds(): string[] {
    return Array.from(this.expandedIds);
  }

  /**
   * Expand all tasks that have children
   * @param tasks - Array of all tasks to expand
   */
  expandAll(tasks: Task[]): void {
    tasks.forEach((task) => {
      if (task.hasChildren && task.iid) {
        this.expandedIds.add(task.iid);
      }
    });
    this.saveStateToSession();
  }

  /**
   * Collapse all tasks
   * @param tasks - Array of all tasks to collapse
   */
  collapseAll(tasks: Task[]): void {
    tasks.forEach((task) => {
      if (task.iid) {
        this.expandedIds.delete(task.iid);
      }
    });
    this.saveStateToSession();
  }
}

/**
 * Global instance of tree hierarchy service
 */
export const treeHierarchyService = new TreeHierarchyService();
