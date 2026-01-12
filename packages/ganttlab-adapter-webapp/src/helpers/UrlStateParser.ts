/**
 * URL State Parser
 * Handles parsing and validation of URL parameters for state restoration
 */

import { Configuration, Project } from 'ganttlab-entities';

export interface UrlState {
  // Source parameters
  source?: string;
  sourceUrl?: string;

  // View parameters
  view?: string;
  projectId?: string;
  projectPath?: string;
  assigneeUsername?: string;

  // Pagination
  tasksPage?: number;
  milestonesPage?: number;
  activeMilestone?: number;

  // Filter parameters
  filter?: string;
  filterMode?: 'simple' | 'regex';

  // Tree expansion state
  expanded?: string[];
}

/**
 * Parse URL parameters and extract application state
 */
export function parseUrlState(): UrlState | null {
  const urlParams = new URLSearchParams(window.location.search);

  // Check if we have any state-related parameters
  const hasStateParams =
    urlParams.has('source') ||
    urlParams.has('view') ||
    urlParams.has('projectId') ||
    urlParams.has('project') ||
    urlParams.has('assigneeUsername') ||
    urlParams.has('filter') ||
    urlParams.has('expanded');

  if (!hasStateParams) {
    return null;
  }

  const state: UrlState = {};

  // Source parameters
  if (urlParams.has('source')) {
    state.source = urlParams.get('source') || undefined;
  }
  if (urlParams.has('sourceUrl')) {
    state.sourceUrl = urlParams.get('sourceUrl') || undefined;
  }

  // View parameters
  if (urlParams.has('view')) {
    state.view = urlParams.get('view') || undefined;
  }
  if (urlParams.has('projectId')) {
    state.projectId = urlParams.get('projectId') || undefined;
  }
  if (urlParams.has('project')) {
    state.projectPath = urlParams.get('project') || undefined;
  }
  if (urlParams.has('assigneeUsername')) {
    state.assigneeUsername = urlParams.get('assigneeUsername') || undefined;
  }

  // Pagination
  if (urlParams.has('tasksPage')) {
    const page = parseInt(urlParams.get('tasksPage') || '1', 10);
    if (!isNaN(page) && page > 0) {
      state.tasksPage = page;
    }
  }
  if (urlParams.has('milestonesPage')) {
    const page = parseInt(urlParams.get('milestonesPage') || '1', 10);
    if (!isNaN(page) && page > 0) {
      state.milestonesPage = page;
    }
  }
  if (urlParams.has('milestone')) {
    const milestone = parseInt(urlParams.get('milestone') || '0', 10);
    if (!isNaN(milestone)) {
      state.activeMilestone = milestone;
    }
  }

  // Filter parameters
  if (urlParams.has('filter')) {
    state.filter = urlParams.get('filter') || undefined;
  }
  if (urlParams.has('filterMode')) {
    const mode = urlParams.get('filterMode');
    if (mode === 'regex' || mode === 'simple') {
      state.filterMode = mode;
    }
  }

  // Tree expansion state
  if (urlParams.has('expanded')) {
    const expanded = urlParams.get('expanded');
    if (expanded) {
      state.expanded = expanded
        .split(',')
        .map((id) => id.trim())
        .filter((id) => id);
    }
  }

  console.log('📋 Parsed URL state:', state);
  return state;
}

/**
 * Build a Configuration object from URL state for a specific view
 */
export function buildConfigurationFromUrlState(
  urlState: UrlState,
  defaultConfig: Configuration = {},
): Configuration {
  const config: Configuration = { ...defaultConfig };

  // Tasks pagination
  if (urlState.tasksPage) {
    config.tasks = config.tasks || { page: 1, pageSize: 50 };
    config.tasks.page = urlState.tasksPage;
  }

  // Milestones pagination
  if (urlState.milestonesPage) {
    config.milestones = config.milestones || { page: 1, pageSize: 20 };
    config.milestones.page = urlState.milestonesPage;
  }

  // Active milestone
  if (urlState.activeMilestone !== undefined) {
    config.activeMilestone = urlState.activeMilestone;
  }

  // Project information (for project view)
  if (urlState.projectId || urlState.projectPath) {
    // Create a minimal Project object from URL parameters
    // The project path is the most important - it's used for API calls
    const projectPath = urlState.projectPath || urlState.projectId || '';
    const projectName = projectPath.split('/').pop() || projectPath;

    // Build project URL based on sourceUrl if available, otherwise use generic placeholder
    const baseUrl = urlState.sourceUrl || 'https://gitlab.com';
    const projectUrl = `${baseUrl}/${projectPath}`;

    config.project = new Project(
      projectName, // name: extract from path
      projectPath, // path: full path with namespace
      projectUrl, // url: construct from sourceUrl and path
      '', // shortDescription: not available from URL
      '', // avatarUrl: not available from URL
    );

    // Keep the raw values for backward compatibility
    config.projectId = urlState.projectId;
    config.projectPath = urlState.projectPath;
  }

  // Assignee username (for assigned-to view)
  if (urlState.assigneeUsername) {
    config.assigneeUsername = urlState.assigneeUsername;
  }

  console.log('⚙️ Built configuration from URL state:', config);
  return config;
}

/**
 * Check if URL state matches the given source and view
 */
export function urlStateMatchesContext(
  urlState: UrlState | null,
  sourceSlug: string,
  viewSlug?: string,
): boolean {
  if (!urlState) return false;
  if (urlState.source && urlState.source !== sourceSlug) return false;
  if (viewSlug && urlState.view && urlState.view !== viewSlug) return false;
  return true;
}
