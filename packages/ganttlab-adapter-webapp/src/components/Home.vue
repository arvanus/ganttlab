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
import { filterTasks, FilterResult } from '../helpers/IssueFilterHelper';

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
    return this.originalPaginatedTasks?.list.length || 0;
  }

  get filteredTasksCount(): number {
    return this.paginatedTasks?.list.length || 0;
  }

  get issueFilterTerm(): string {
    return mainState.issueFilterTerm || '';
  }

  get issueFilterMode(): 'simple' | 'regex' {
    return mainState.issueFilterMode || 'simple';
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

    const filterResult = filterTasks(
      this.originalPaginatedTasks.list,
      this.issueFilterTerm,
      this.issueFilterMode,
    );

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

  async mounted() {
    // Restore filter state from session storage
    const rememberedFilter = await getRememberedIssueFilter();
    if (rememberedFilter) {
      mainState.setIssueFilterTerm(rememberedFilter.term);
      mainState.setIssueFilterMode(rememberedFilter.mode);
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
