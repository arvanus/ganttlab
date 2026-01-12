<template>
  <div class="w-full">
    <div class="mb-12 p-4 bg-gray-200">
      <div class="flex items-center text-gray-600">
        <a
          class="w-64 flex justify-start items-center"
          href="https://www.ganttlab.com/"
          target="_blank"
          rel="noopener"
          @click="goToWebsite"
        >
          <Icon class="text-gray-400" size="30" name="logo-ganttlab" />
          <h1 class="text-gray-800 text-2xl leading-none font-lead ml-2">
            GanttLab
          </h1>
        </a>

        <div class="flex-grow flex items-center justify-center">
          <a
            class="flex items-center truncate"
            :href="sourceUrl"
            target="_blank"
            rel="noopener noreferrer"
            @click="goToSource"
          >
            <div class="mr-2 flex-shrink-0">
              <Icon size="24" :name="sourceLogoIcon" />
            </div>
            <p class="truncate">{{ sourceUrl }}</p>
          </a>
          <a
            v-if="project"
            :href="project.url"
            target="_blank"
            rel="noopener noreferrer"
            class="flex items-center flex-shrink-0 ml-12 max-w-xs img-reset-opacity"
            @click="goToProject"
          >
            <img
              v-if="project.avatarUrl"
              :src="project.avatarUrl"
              v-fallback-src="'project'"
              :alt="project.path"
              class="flex-shrink-0 w-6 h-6 mr-2 rounded bg-white shadow"
            />
            <div
              v-else
              class="flex-shrink-0 w-6 h-6 px-1 mr-2 rounded bg-gray-300 text-gray-500"
            >
              <Icon size="16" name="cube-outline" />
            </div>
            <p class="truncate">{{ project.path }}</p>
          </a>
          <a
            v-else-if="group"
            :href="group.url"
            target="_blank"
            rel="noopener noreferrer"
            class="flex items-center flex-shrink-0 ml-12 max-w-xs img-reset-opacity"
            @click="goToGroup"
          >
            <img
              v-if="group.avatarUrl"
              :src="group.avatarUrl"
              v-fallback-src="'project'"
              :alt="group.path"
              class="flex-shrink-0 w-6 h-6 mr-2 rounded bg-white shadow"
            />
            <div
              v-else
              class="flex-shrink-0 w-6 h-6 px-1 mr-2 rounded bg-gray-300 text-gray-500"
            >
              <Icon size="16" name="folder-outline" />
            </div>
            <p class="truncate">{{ group.path }}</p>
          </a>
        </div>
        <div class="w-64 flex items-center justify-end">
          <ShareDropdown
            class="mr-4"
            @copy-as-url="handleCopyAsUrl"
            @copy-as-png="handleCopyAsPng"
          />
          <a
            class="mr-12 flex items-center img-reset-opacity"
            :href="user.url"
            target="_blank"
            rel="noopener noreferrer"
            @click="goToUser"
          >
            <p>{{ user.username }}</p>
            <img
              :src="user.avatarUrl"
              v-fallback-src="'person'"
              :alt="user.username"
              class="w-6 ml-2 inline-block rounded-full shadow-inner"
            />
          </a>
          <div
            class="cursor-pointer transition duration-200 ease-in hover:text-yellow-700"
            @click="refresh"
          >
            <Icon size="24" name="refresh-circle-outline" />
          </div>
          <a
            href="https://gitlab.com/ganttlab/ganttlab/-/blob/master/README.md#how-it-works"
            target="_blank"
            rel="noopener noreferrer"
            class="ml-4 transition duration-200 ease-in hover:text-lead-700"
            @click="goToHelp"
          >
            <Icon size="24" name="help-circle-outline" />
          </a>
          <div
            class="cursor-pointer ml-4 transition duration-200 ease-in hover:text-red-700"
            @click="logout"
          >
            <Icon size="24" name="close-circle-outline" />
          </div>
        </div>
      </div>
      <div class="flex justify-center">
        <div
          class="cursor-default flex items-center content-center justify-center mt-6 -mb-10 h-20 bg-lead-600 rounded-lg shadow-md"
        >
          <div class="h-full w-48 p-3">
            <p class="pb-2 text-xs tracking-wider text-lead-300">VIEW</p>
            <ViewSelector
              :sourceGateway="sourceGateway"
              @set-view="setView($event)"
            />
          </div>
          <div class="h-full w-48 p-3 border-l border-lead-500">
            <p class="pb-2 text-xs tracking-wider text-lead-300">SORT</p>
            <div class="flex items-center px-2 text-lead-100">
              <p class="flex-grow text-lg text-lead-300">By due date</p>
            </div>
          </div>
          <div class="h-full w-48 p-3 border-l border-lead-500">
            <p class="pb-2 text-xs tracking-wider text-lead-300">FILTER</p>
            <div class="flex items-center px-2 text-lead-100">
              <p class="flex-grow text-lg text-lead-300">Opened issues</p>
            </div>
          </div>
          <IssueFilter
            :totalCount="originalTasksCount"
            :visibleCount="filteredTasksCount"
          />
          <div class="h-full w-48 p-3 border-l border-lead-500">
            <p class="pb-2 text-xs tracking-wider text-lead-300">CHART</p>
            <div class="flex items-center px-2 text-lead-100">
              <p class="flex-grow text-lg text-lead-300">GanttLab Legacy</p>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="p-2">
      <transition name="component-fade" mode="out-in">
        <div
          v-if="paginatedTasks === null && paginatedMilestones === null"
          key="spinner"
          class="w-full h-64 mb-12 flex items-center justify-center text-lead-600"
        >
          <Spinner size="64" />
        </div>
        <div v-else-if="paginatedMilestones && paginatedMilestones.list.length">
          <MilestonesDisplay
            :activeMilestone="activeMilestone"
            :paginatedMilestones="paginatedMilestones"
            :paginatedTasks="paginatedTasks"
            :project="project"
            :sourceUrl="sourceUrl"
            :viewGateway="viewGateway"
            @set-active-milestone="setActiveMilestone($event)"
            @set-milestones-page="setMilestonesPage($event)"
            @set-tasks-page="setTasksPage($event)"
          />
        </div>
        <div v-else-if="paginatedTasks">
          <TasksDisplay
            :key="`tasks-${issueFilterTerm}-${issueFilterMode}-${filteredTasksCount}`"
            :paginatedTasks="paginatedTasks"
            :metadata="chartMetadata"
            @set-tasks-page="setTasksPage($event)"
          />
          <!-- Show message when filter results in no matches -->
          <div
            v-if="
              paginatedTasks.list.length === 0 && issueFilterTerm.length > 0
            "
            class="w-full p-8 text-center"
          >
            <p class="text-gray-600">
              No issues match your search filter: "<strong>{{
                issueFilterTerm
              }}</strong
              >"
            </p>
            <p class="text-sm text-gray-500 mt-2">
              Try adjusting your search term or clearing the filter.
            </p>
          </div>
        </div>
        <div v-else class="w-full p-16">
          <NoData
            :project="project"
            :sourceUrl="sourceUrl"
            :viewGateway="viewGateway"
          />
        </div>
      </transition>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Vue, Watch } from 'vue-property-decorator';
import { getModule } from 'vuex-module-decorators';
import MainModule from '../store/modules/MainModule';
import Icon from './generic/Icon.vue';
import ViewSelector from './gateways/views/ViewSelector.vue';
import Spinner from './generic/Spinner.vue';
import TasksDisplay from './displays/TasksDisplay.vue';
import MilestonesDisplay from './displays/MilestonesDisplay.vue';
import NoData from './gateways/views/NoData.vue';
import IssueFilter from './generic/IssueFilter.vue';
import ShareDropdown from './generic/ShareDropdown.vue';
import {
  User,
  Source,
  AuthenticatableSource,
  SourceVisitor,
  PaginatedListOfTasks,
  PaginatedListOfMilestones,
  Project,
  Task,
  Group,
} from 'ganttlab-entities';
import { ImplementedSourcesGateways } from '../helpers/ImplementedSourcesGateways';
import { DisplayableError } from '../helpers/DisplayableError';
import { addDisplaybleError } from '../helpers';
import { TasksAndMilestones } from 'ganttlab-use-cases';
import LocalForage, {
  getRememberedViews,
  getRememberedIssueFilter,
  setRememberedIssueFilter,
} from '../helpers/LocalForage';
import { trackVirtualpageView, trackInteractionEvent } from '../helpers/GTM';
import { FilterResult } from '../helpers/IssueFilterHelper';
import { TreeBuilder } from '../helpers/TreeBuilder';
import { treeHierarchyService } from '../helpers/TreeHierarchyService';

// Type declarations for Clipboard API
declare global {
  interface Clipboard {
    write(items: ClipboardItem[]): Promise<void>;
  }
  interface ClipboardItem {
    readonly types: string[];
    getType(type: string): Promise<Blob>;
  }
  interface ClipboardItemConstructor {
    new (items: Record<string, Blob | Promise<Blob>>): ClipboardItem;
  }
  const ClipboardItem: ClipboardItemConstructor;
}

// Interface for URL state encoding
interface ShareState {
  v: number;
  source?: string;
  sourceUrl?: string;
  view?: string;
  projectId?: string;
  projectPath?: string;
  activeMilestone?: number;
  tasksPage?: number;
  milestonesPage?: number;
  filterTerm?: string;
  filterMode?: 'simple' | 'regex';
  expanded?: string;
}

const mainState = getModule(MainModule);

@Component({
  components: {
    Icon,
    ViewSelector,
    Spinner,
    TasksDisplay,
    MilestonesDisplay,
    NoData,
    IssueFilter,
    ShareDropdown,
  },
})
export default class Home extends Vue {
  public paginatedTasks: PaginatedListOfTasks | null = null;
  public paginatedMilestones: PaginatedListOfMilestones | null = null;
  private originalPaginatedTasks: PaginatedListOfTasks | null = null;

  setTasksPage(page: number) {
    mainState.setViewGatewayTasksPage(page);
    this.refresh(false);
    trackInteractionEvent(
      'View',
      'Changed tasks page',
      this.viewGateway ? this.viewGateway.slug : undefined,
    );
  }

  setMilestonesPage(page: number) {
    mainState.setViewGatewayMilestonesPage(page);
    this.refresh(false);

    trackInteractionEvent(
      'View',
      'Changed milestones page',
      this.viewGateway ? this.viewGateway.slug : undefined,
    );
  }

  setActiveMilestone(index: number) {
    mainState.setViewGatewayActiveMilestone(index);
    // reset task page to avoid weird behaviors, that one will also refresh
    this.setTasksPage(1);
    trackInteractionEvent(
      'View',
      'Changed active milestone',
      this.viewGateway ? this.viewGateway.slug : undefined,
    );
  }

  get user(): User | null {
    return mainState.user;
  }

  get originalTasksCount(): number {
    // Exclude dimmed items (parent issues not matching the criteria but shown for context)
    return this.originalPaginatedTasks?.list.filter(t => !t.isDimmed).length || 0;
  }

  get filteredTasksCount(): number {
    // Exclude dimmed items from filtered count as well
    return this.paginatedTasks?.list.filter(t => !t.isDimmed).length || 0;
  }

  get issueFilterTerm(): string {
    return mainState.issueFilterTerm || '';
  }

  get issueFilterMode(): 'simple' | 'regex' {
    return mainState.issueFilterMode || 'simple';
  }

  // Build metadata string for chart header
  get chartMetadata(): string {
    const metadataParts: string[] = [];

    console.log('🔍 Building chartMetadata...');
    console.log('  viewGateway:', this.viewGateway?.name);
    console.log('  project:', this.project?.path);

    // View information
    if (this.viewGateway) {
      metadataParts.push(`View: ${this.viewGateway.name}`);
    }

    // Project
    if (this.project) {
      metadataParts.push(`Project: ${this.project.path}`);
    }

    // Active milestone
    if (this.activeMilestone !== null && this.paginatedMilestones) {
      const milestone = this.paginatedMilestones.list[this.activeMilestone];
      if (milestone) {
        metadataParts.push(`Milestone: ${milestone.name}`);
      }
    }

    // Assignee username (for assigned-to view)
    if (this.viewGateway?.configuration?.assigneeUsername) {
      metadataParts.push(`Assigned to: ${this.viewGateway.configuration.assigneeUsername}`);
    }

    // Filter
    if (this.issueFilterTerm) {
      const filterModeLabel = this.issueFilterMode === 'regex' ? ' (regex)' : '';
      metadataParts.push(`Filter: "${this.issueFilterTerm}"${filterModeLabel}`);
    }

    // Task count
    if (this.originalTasksCount > 0) {
      if (this.issueFilterTerm) {
        metadataParts.push(`${this.filteredTasksCount}/${this.originalTasksCount} issues`);
      } else {
        metadataParts.push(`${this.originalTasksCount} issues`);
      }
    }

    const result = metadataParts.join(' • ');
    console.log('✅ chartMetadata result:', result);
    console.log('   length:', result.length);
    return result;
  }

  // source gateway is stored in vuex store
  get sourceGateway(): Source | AuthenticatableSource | null {
    if (mainState.sourceGateway) {
      return mainState.sourceGateway;
    }
    return null;
  }

  get sourceUrl(): string | null {
    if (
      mainState.sourceGateway &&
      mainState.sourceGateway instanceof AuthenticatableSource
    ) {
      return mainState.sourceGateway.getUrl();
    }
    return null;
  }

  get sourceLogoIcon(): string | null {
    if (mainState.sourceGateway) {
      const gatewayDetails = ImplementedSourcesGateways.find((gateway) => {
        if (mainState.sourceGateway) {
          return gateway.slug === mainState.sourceGateway.slug;
        }
      });
      if (gatewayDetails) {
        return gatewayDetails.icon;
      }
    }
    return null;
  }

  // view gateway is stored in vuex store
  get viewGateway(): SourceVisitor<unknown> | null {
    if (mainState.viewGateway) {
      return mainState.viewGateway;
    }
    return null;
  }

  // there might be a project in the view gateway configuration
  get project(): Project | null {
    if (this.viewGateway && this.viewGateway.configuration.project) {
      return this.viewGateway.configuration.project;
    }
    return null;
  }

  // there might be a group in the view gateway configuration
  get group(): Group | null {
    if (this.viewGateway && this.viewGateway.configuration.group) {
      return this.viewGateway.configuration.group;
    }
    return null;
  }

  // there might be an active milestone in the view gateway configuration
  get activeMilestone(): number | null {
    if (
      this.viewGateway &&
      this.viewGateway.configuration.activeMilestone !== undefined
    ) {
      return this.viewGateway.configuration.activeMilestone;
    }
    return null;
  }

  async setView(view: SourceVisitor<unknown>) {
    if (!this.sourceGateway) {
      return;
    }
    // clear data so we get the spinner back while loading the new ones
    this.paginatedTasks = null;
    this.paginatedMilestones = null;
    this.originalPaginatedTasks = null;
    // get the view data
    try {
      const data = await this.sourceGateway.getDataFor(view);
      if (data instanceof PaginatedListOfTasks) {
        this.originalPaginatedTasks = data;
        this.applyIssueFilter();
      }
      if (data instanceof PaginatedListOfMilestones) {
        this.paginatedMilestones = data;
      }
      if (data instanceof TasksAndMilestones) {
        this.originalPaginatedTasks = data.tasks;
        this.applyIssueFilter();
        this.paginatedMilestones = data.milestones;
      }
      trackVirtualpageView(
        `${this.sourceGateway.name} - ${view.name}`,
        `/${this.sourceGateway.slug}/${view.slug}`,
      );
    } catch (error) {
      addDisplaybleError(
        new DisplayableError(error, 'Unable to get view data'),
      );
      trackInteractionEvent('View', 'Error', view.slug);
      this.originalPaginatedTasks = new PaginatedListOfTasks([], 1, 0);
      this.applyIssueFilter();
    }

    // user okay to remember? let's do it!
    const remember = await LocalForage.getItem('remember');
    let viewsBySource = await getRememberedViews();
    if (remember) {
      if (!viewsBySource) viewsBySource = {};
      viewsBySource[this.sourceGateway.slug] = {
        slug: view.slug,
        configuration: view.configuration,
      };
      LocalForage.setItem('viewsBySource', viewsBySource);
    }
  }

  async refresh(manual = true) {
    if (this.viewGateway) {
      this.setView(this.viewGateway);
      if (manual) {
        trackInteractionEvent('View', 'Refreshed', this.viewGateway.slug);
      }
    }
  }

  logout() {
    mainState.logout();
    trackInteractionEvent(
      'Authentication',
      'Logged out',
      this.sourceGateway ? this.sourceGateway.slug : undefined,
    );
  }

  @Watch('issueFilterTerm')
  @Watch('issueFilterMode')
  onFilterChange() {
    this.applyIssueFilter();
    // Persist filter state in session (FR-6: session persistence)
    setRememberedIssueFilter(this.issueFilterTerm, this.issueFilterMode);
  }

  applyIssueFilter() {
    if (!this.originalPaginatedTasks) {
      this.paginatedTasks = null;
      return;
    }

    console.log('=== applyIssueFilter START ===');
    console.log(
      'Original tasks count:',
      this.originalPaginatedTasks.list.length,
    );

    // Work with a shallow copy of tasks to avoid mutation issues
    // This ensures we don't accidentally modify the original task objects
    const tasksCopy = this.originalPaginatedTasks.list.map((t) => ({ ...t }));

    console.log('\n📋 All tasks before tree building:');
    tasksCopy.forEach((t) => {
      const type = t.isGitLabTask ? 'TASK' : 'ISSUE';
      const dimmed = t.isDimmed ? '(DIMMED)' : '';
      const parent = t.parentIid ? `parent:#${t.parentIid}` : 'no-parent';
      console.log(`  ${type} #${t.iid}: "${t.title}" ${dimmed} [${parent}]`);
    });

    // Apply expansion state to tasks
    TreeBuilder.applyExpansionState(tasksCopy);

    // Build tree structure - links children to parents and returns only roots
    const rootTasks = TreeBuilder.buildTree(tasksCopy);
    console.log('\n🌳 Root tasks after buildTree:', rootTasks.length);
    rootTasks.forEach((t) => {
      const type = t.isGitLabTask ? 'TASK' : 'ISSUE';
      const dimmed = t.isDimmed ? '(DIMMED)' : '';
      const hasKids = t.hasChildren ? `[${t.children?.length || 0} children]` : '[no children]';
      const expanded = t.isExpanded ? 'EXPANDED' : 'collapsed';
      console.log(`  ${type} #${t.iid}: "${t.title}" ${dimmed} ${hasKids} ${expanded}`);
      if (t.children) {
        t.children.forEach((c) => {
          console.log(`    └─ CHILD #${c.iid}: "${c.title}"`);
        });
      }
    });

    // Use tree-aware filtering if feature is enabled
    const useTreeFiltering = mainState.issueHierarchyEnabled !== false; // default to true

    let filteredRootTasks: Task[];
    if (useTreeFiltering && this.issueFilterTerm) {
      // Tree-aware filtering on root tasks (BEFORE determining visibility)
      // This ensures we can find children that match even if parent is collapsed
      filteredRootTasks = TreeBuilder.filterTree(
        rootTasks,
        this.issueFilterTerm,
        this.issueFilterMode,
      );
      console.log('Filtered root tasks:', filteredRootTasks.length);
    } else {
      // No filter - use all root tasks
      filteredRootTasks = rootTasks;
    }

    // Get visible tasks based on expansion state (includes expanded children)
    const visibleTasks = TreeBuilder.getVisibleTasks(filteredRootTasks);
    console.log('\n👁️ Visible tasks (what you see):', visibleTasks.length);
    visibleTasks.forEach((t) => {
      const type = t.isGitLabTask ? 'TASK' : 'ISSUE';
      const dimmed = t.isDimmed ? '(DIMMED)' : '';
      const depth = '  '.repeat(t.depth || 0);
      console.log(`  ${depth}${type} #${t.iid}: "${t.title}" ${dimmed}`);
    });

    const filterResult: FilterResult = {
      filteredTasks: visibleTasks,
      totalCount: visibleTasks.length,
      visibleCount: visibleTasks.length,
    };

    console.log('Filtered tasks:', filterResult.filteredTasks.length);
    console.log('=== applyIssueFilter END ===');

    // Create new PaginatedListOfTasks with filtered results
    // Preserve the original pagination metadata but update the list
    this.paginatedTasks = new PaginatedListOfTasks(
      filterResult.filteredTasks,
      this.originalPaginatedTasks.page,
      this.originalPaginatedTasks.pageSize,
      this.originalPaginatedTasks.previousPage,
      this.originalPaginatedTasks.nextPage,
      this.originalPaginatedTasks.lastPage,
      this.originalPaginatedTasks.total,
    );
  }

  handleToggleExpand(event: CustomEvent) {
    const { iid } = event.detail;
    if (!iid) return;

    // Toggle expansion state
    const isExpanded = treeHierarchyService.toggleExpansion(iid);

    // Find the task and update its expansion state
    if (this.originalPaginatedTasks) {
      const task = this.originalPaginatedTasks.list.find((t) => t.iid === iid);
      if (task) {
        task.isExpanded = isExpanded;

        // If expanding and children not loaded, fetch them
        if (isExpanded && !task.children) {
          this.fetchChildrenForTask(task);
        } else {
          // Just re-apply the filter to update visibility
          this.applyIssueFilter();
        }
      }
    }

    // Track analytics
    trackInteractionEvent('Tree', isExpanded ? 'Expand' : 'Collapse', iid);
  }

  handleToggleExpandAll(event: CustomEvent) {
    const { expandAll } = event.detail;

    if (!this.originalPaginatedTasks) return;

    if (expandAll) {
      // Expand all tasks that have children
      treeHierarchyService.expandAll(this.originalPaginatedTasks.list);

      // Update expansion state on all tasks
      this.originalPaginatedTasks.list.forEach((task) => {
        if (task.hasChildren) {
          task.isExpanded = true;
        }
      });
    } else {
      // Collapse all tasks
      treeHierarchyService.collapseAll(this.originalPaginatedTasks.list);

      // Update expansion state on all tasks
      this.originalPaginatedTasks.list.forEach((task) => {
        task.isExpanded = false;
      });
    }

    // Re-apply the filter to update visibility
    this.applyIssueFilter();

    // Track analytics
    trackInteractionEvent(
      'Tree',
      expandAll ? 'Expand All' : 'Collapse All',
      undefined,
    );
  }

  async fetchChildrenForTask(task: Task) {
    // TODO: Implement child fetching via GitLab API
    // For now, we'll just use cached children if available
    TreeBuilder.loadCachedChildren(task);
    this.applyIssueFilter();
  }

  async mounted() {
    // Check for state in URL parameters
    const urlParams = new URLSearchParams(window.location.search);

    // Check if we have any share parameters
    const hasShareParams =
      urlParams.has('filter') ||
      urlParams.has('expanded') ||
      urlParams.has('project') ||
      urlParams.has('view');

    if (hasShareParams) {
      try {
        // Restore filter state
        const filterTerm = urlParams.get('filter');
        if (filterTerm) {
          mainState.setIssueFilterTerm(filterTerm);
        }

        const filterMode = urlParams.get('filterMode');
        if (filterMode === 'regex' || filterMode === 'simple') {
          mainState.setIssueFilterMode(filterMode);
        }

        // Restore expansion state
        const expanded = urlParams.get('expanded');
        if (expanded) {
          const expandedIds = expanded.split(',');
          expandedIds.forEach((iid: string) => {
            if (iid.trim()) {
              treeHierarchyService.expand(iid.trim());
            }
          });
        }

        // Log additional parameters for debugging
        // Note: Source, view, and project need to be handled by the authentication/view selection flow
        const source = urlParams.get('source');
        const view = urlParams.get('view');
        const project = urlParams.get('project');

        if (source || view || project) {
          console.log('URL contains state:', {
            source,
            view,
            project,
            sourceUrl: urlParams.get('sourceUrl'),
            projectId: urlParams.get('projectId'),
            milestone: urlParams.get('milestone'),
            tasksPage: urlParams.get('tasksPage'),
            milestonesPage: urlParams.get('milestonesPage'),
          });
          // You could store this in vuex to be picked up by the view selector
        }
      } catch (error) {
        console.error('Failed to restore state from URL:', error);
      }
    } else {
      // No URL state, restore from session storage
      const rememberedFilter = await getRememberedIssueFilter();
      if (rememberedFilter) {
        mainState.setIssueFilterTerm(rememberedFilter.term);
        mainState.setIssueFilterMode(rememberedFilter.mode);
      }
    }

    // Listen for tree expand/collapse events
    document.addEventListener(
      'toggle-expand',
      this.handleToggleExpand as EventListener,
    );
    document.addEventListener(
      'toggle-expand-all',
      this.handleToggleExpandAll as EventListener,
    );
  }

  beforeDestroy() {
    // Clean up event listener
    document.removeEventListener(
      'toggle-expand',
      this.handleToggleExpand as EventListener,
    );
    document.removeEventListener(
      'toggle-expand-all',
      this.handleToggleExpandAll as EventListener,
    );
  }

  async handleCopyAsUrl() {
    try {
      // Build URL with readable query parameters
      const params = new URLSearchParams();

      // Source information
      if (this.sourceGateway) {
        params.set('source', this.sourceGateway.slug);
        if (this.sourceGateway instanceof AuthenticatableSource) {
          const url = this.sourceGateway.getUrl();
          if (url) {
            params.set('sourceUrl', url);
          }
        }
      }

      // View information
      if (this.viewGateway) {
        params.set('view', this.viewGateway.slug);

        // View configuration
        if (this.viewGateway.configuration) {
          const config = this.viewGateway.configuration;

          // Project
          if (config.project) {
            if (config.project.id) {
              params.set('projectId', config.project.id);
            }
            if (config.project.path) {
              params.set('project', config.project.path);
            }
          }

          // Active milestone
          if (config.activeMilestone !== undefined) {
            params.set('milestone', config.activeMilestone.toString());
          }

          // Assignee username (for assigned-to view)
          if (config.assigneeUsername) {
            params.set('assigneeUsername', config.assigneeUsername);
          }

          // Task and milestone pages
          if (config.tasks?.page) {
            params.set('tasksPage', config.tasks.page.toString());
          }
          if (config.milestones?.page) {
            params.set('milestonesPage', config.milestones.page.toString());
          }
        }
      }

      // Filter state
      if (this.issueFilterTerm) {
        params.set('filter', this.issueFilterTerm);
      }
      if (this.issueFilterMode !== 'simple') {
        params.set('filterMode', this.issueFilterMode);
      }

      // Expansion state - only include if there are expanded items
      const expandedIds = treeHierarchyService.getExpandedIds();
      if (expandedIds.length > 0) {
        params.set('expanded', expandedIds.join(','));
      }

      // Build full URL
      const baseUrl = window.location.origin + window.location.pathname;
      const shareUrl = `${baseUrl}?${params.toString()}`;

      // Copy to clipboard
      await navigator.clipboard.writeText(shareUrl);

      // Show success message (you can add a toast notification here)
      console.log('URL copied to clipboard:', shareUrl);
      alert('URL copied to clipboard! You can now share this link.');

      trackInteractionEvent('Share', 'Copy as URL');
    } catch (error) {
      console.error('Failed to copy URL:', error);
      alert('Failed to copy URL. Please try again.');
    }
  }

  async handleCopyAsPng() {
    try {
      // Dynamically import html2canvas
      const html2canvas = (await import('html2canvas')).default;

      const chartElement = document.getElementById('legacyChart');
      if (!chartElement) {
        alert('Chart not found. Please ensure the chart is visible.');
        return;
      }

      // Hide expand/collapse button before capturing
      const expandButtons = chartElement.querySelectorAll('.expand-all-button');
      const originalDisplay: string[] = [];
      expandButtons.forEach((button, index) => {
        const element = button as HTMLElement;
        originalDisplay[index] = element.style.display;
        element.style.display = 'none';
      });

      // Capture the chart (metadata is already visible at the top)
      const canvas = await html2canvas(chartElement, {
        backgroundColor: '#ffffff',
        scale: 2, // Higher quality
        logging: false,
      });

      // Cleanup: Restore expand/collapse button
      expandButtons.forEach((button, index) => {
        const element = button as HTMLElement;
        element.style.display = originalDisplay[index];
      });

      // Convert canvas to blob
      canvas.toBlob(async (blob) => {
        if (blob) {
          try {
            // Try to copy to clipboard using Clipboard API if available
            if (navigator.clipboard && typeof ClipboardItem !== 'undefined') {
              await navigator.clipboard.write([
                new ClipboardItem({
                  'image/png': blob,
                }),
              ]);

              console.log('Chart image copied to clipboard');
              alert('Chart copied as image to clipboard!');

              trackInteractionEvent('Share', 'Copy as PNG');
            } else {
              // Fallback: download the image
              throw new Error('Clipboard API not available');
            }
          } catch (clipboardError) {
            console.error('Failed to copy to clipboard:', clipboardError);
            // Fallback: download the image
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `ganttlab-chart-${Date.now()}.png`;
            link.click();
            URL.revokeObjectURL(url);
            alert('Unable to copy to clipboard. Image downloaded instead.');

            trackInteractionEvent('Share', 'Download PNG');
          }
        }
      }, 'image/png');
    } catch (error) {
      console.error('Failed to capture chart:', error);
      alert('Failed to capture chart. Please try again.');
    }
  }

  goToWebsite() {
    trackInteractionEvent('Click', 'Website');
  }

  goToSource() {
    trackInteractionEvent(
      'Click',
      'Source',
      this.sourceGateway ? this.sourceGateway.slug : undefined,
    );
  }

  goToProject() {
    trackInteractionEvent('Click', 'Project');
  }

  goToGroup() {
    trackInteractionEvent('Click', 'Group');
  }

  goToUser() {
    trackInteractionEvent('Click', 'User');
  }

  goToHelp() {
    const source = this.sourceGateway
      ? `Source ${this.sourceGateway.slug}`
      : undefined;
    const view = this.viewGateway ? `View ${this.viewGateway.slug}` : undefined;
    const agg = [source, view];
    trackInteractionEvent('Click', 'Help', agg.join(' - '));
  }
}
</script>

<style lang="scss" scoped>
.img-reset-opacity {
  img {
    @apply opacity-75 transition duration-200 ease-in;
  }
}
.img-reset-opacity:hover {
  img {
    @apply opacity-100;
  }
}
</style>
