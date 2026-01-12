import { TimeEstimate } from './TimeEstimate';

/**
 * The main unit of a Gantt chart
 */
export class Task {
  /**
   * The TimeEstimate (in days) attached to this task
   */
  public daysEstimate: TimeEstimate | undefined;

  /**
   * Issue IID (Internal ID) from GitLab/GitHub
   */
  public iid?: string;

  /**
   * Parent issue IID if this task has a parent
   */
  public parentIid?: string;

  /**
   * Whether this task has children
   */
  public hasChildren?: boolean;

  /**
   * Cached children tasks (lazy-loaded)
   */
  public children?: Task[];

  /**
   * Depth level in the tree hierarchy (0 = root)
   */
  public depth?: number;

  /**
   * Whether this task is currently expanded (showing children)
   */
  public isExpanded?: boolean;

  /**
   * Whether this task is visible in the current tree state
   */
  public isVisible?: boolean;

  /**
   * Whether this task matches the current filter
   */
  public matchesFilter?: boolean;

  /**
   * Whether this task is dimmed (doesn't match filter but has matching descendants)
   */
  public isDimmed?: boolean;

  /**
   * Whether this is a GitLab Issue (parent/root level)
   */
  public isGitLabIssue?: boolean;

  /**
   * Whether this is a GitLab Task (child/subtask)
   */
  public isGitLabTask?: boolean;

  /**
   * Whether this issue/task is closed (for visual indicator)
   */
  public isClosed?: boolean;

  /**
   * @param title - The title of this task
   * @param url - The URL to this task (directly usable in an `<a>` href)
   * @param start - A start date, which is mandatory without a predecessor
   * @param due - A due date (if start set, defaults to start + 1 day)
   * @param predecessor - The parent of this task, which might be used to override the start date
   */
  constructor(
    public title: string,
    public url: string,
    public start?: Date,
    public due?: Date,
    public predecessor?: Task,
  ) {
    if (!predecessor && !start) {
      throw new Error('A Task with no predecessor must have a start date');
    }

    if (!due && start) {
      const calculatedDue = new Date(start);
      calculatedDue.setDate(calculatedDue.getDate() + 1);
      this.due = calculatedDue;
    }

    // Initialize hierarchy fields
    this.depth = 0;
    this.isExpanded = false;
    this.isVisible = true;
    this.matchesFilter = true;
    this.isDimmed = false;
  }
}
