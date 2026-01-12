import { Module, VuexModule, Mutation, Action } from 'vuex-module-decorators';
import Store from '../index';
import {
  User,
  Source,
  Credentials,
  AuthenticatableSource,
  SourceVisitor,
} from 'ganttlab-entities';
import { DisplayableError } from '../../helpers/DisplayableError';
import { UrlState } from '../../helpers/UrlStateParser';

@Module({
  dynamic: true,
  store: Store,
  name: 'main',
  namespaced: true,
})
export default class MainModule extends VuexModule {
  public remember = false;
  public errors: Array<DisplayableError> = [];
  public user: User | null = null;
  public credentialsBySource: {
    [key: string]: Credentials | null;
  } | null = null;
  public justLoggedOut = false;
  public sourceGateway: Source | AuthenticatableSource | null = null;
  public viewGateway: SourceVisitor<unknown> | null = null;
  public chart: string | null = null;

  // Issue Filter State
  public issueFilterTerm = '';
  public issueFilterMode: 'simple' | 'regex' = 'simple';

  // Issue Hierarchy State
  public issueHierarchyEnabled = true;

  // URL State (from URL parameters, takes precedence over localStorage)
  public urlState: UrlState | null = null;

  @Mutation
  public setRemember(remember: boolean) {
    this.remember = remember;
  }

  @Mutation
  public setUrlState(urlState: UrlState | null) {
    this.urlState = urlState;
  }

  @Mutation
  public addError(error: DisplayableError) {
    this.errors.unshift(error);
  }

  @Mutation
  public clearError(error: DisplayableError) {
    this.errors = this.errors.filter(
      (anExistingError: DisplayableError) =>
        anExistingError.hash !== error.hash,
    );
  }

  @Mutation
  public setUser(user: User) {
    this.user = user;
  }

  @Mutation
  public setSourceGateway(
    sourceGateway: Source | AuthenticatableSource | null,
  ) {
    this.sourceGateway = sourceGateway;
  }

  @Mutation
  public setCredentialsBySource(
    credentialsBySource: {
      [key: string]: Credentials | null;
    } | null,
  ) {
    this.credentialsBySource = credentialsBySource;
  }

  public get getSourceCredentials() {
    return (source: string): Credentials | null => {
      if (this.credentialsBySource && this.credentialsBySource[source]) {
        return this.credentialsBySource[source];
      }
      return null;
    };
  }

  @Mutation
  public setJustLoggedOut() {
    this.justLoggedOut = true;
  }

  @Mutation
  public setViewGateway(viewGateway: SourceVisitor<unknown> | null) {
    this.viewGateway = viewGateway;
  }

  @Mutation
  public setViewGatewayTasksPage(page: number) {
    if (
      this.viewGateway &&
      this.viewGateway.configuration &&
      this.viewGateway.configuration.tasks &&
      this.viewGateway.configuration.tasks.page !== undefined
    )
      this.viewGateway.configuration.tasks.page = page;
  }

  @Mutation
  public setViewGatewayMilestonesPage(page: number) {
    if (
      this.viewGateway &&
      this.viewGateway.configuration &&
      this.viewGateway.configuration.milestones &&
      this.viewGateway.configuration.milestones.page !== undefined
    )
      this.viewGateway.configuration.milestones.page = page;
  }

  @Mutation
  public setViewGatewayActiveMilestone(index: number) {
    if (
      this.viewGateway &&
      this.viewGateway.configuration &&
      this.viewGateway.configuration.activeMilestone !== undefined
    ) {
      this.viewGateway.configuration.activeMilestone = index;
    }
  }

  @Mutation
  public setChart(chart: string) {
    this.chart = chart;
  }

  @Mutation
  public setIssueFilterTerm(term: string) {
    this.issueFilterTerm = term;
  }

  @Mutation
  public setIssueFilterMode(mode: 'simple' | 'regex') {
    this.issueFilterMode = mode;
  }

  @Mutation
  public setIssueHierarchyEnabled(enabled: boolean) {
    this.issueHierarchyEnabled = enabled;
  }

  @Action({ commit: 'setCredentialsBySource' })
  public setCredentials(newSourcedCredential: {
    [key: string]: Credentials;
  }): {
    [key: string]: Credentials | null;
  } {
    const credentialsBySource = this.credentialsBySource;
    if (credentialsBySource) {
      for (const key in newSourcedCredential) {
        credentialsBySource[key] = newSourcedCredential[key];
      }
      return credentialsBySource;
    }

    const newOne: { [key: string]: Credentials } = {};
    for (const key in newSourcedCredential) {
      newOne[key] = newSourcedCredential[key];
    }
    return newOne;
  }

  @Action
  public logout() {
    this.context.commit('setJustLoggedOut');
    this.context.commit('setSourceGateway', null);
    this.context.commit('setViewGateway', null);
    this.context.commit('setUser', null);
  }
}
