import {
  SourceVisitor,
  PaginatedListOfTasks,
  Configuration,
  Sort,
  Filter,
} from 'ganttlab-entities';
import { ViewAssignedToMeGitHubStrategy } from './strategies/ViewAssignedToMeGitHubStrategy';
import { ViewAssignedToMeGitLabStrategy } from './strategies/ViewAssignedToMeGitLabStrategy';

export class ViewAssignedToMe extends SourceVisitor<PaginatedListOfTasks> {
  public slug = 'assigned';
  public name = 'Assigned to me';
  public shortDescription = 'All of the issues assigned to you';
  public slugStrategies = {
    github: new ViewAssignedToMeGitHubStrategy(),
    gitlab: new ViewAssignedToMeGitLabStrategy(),
  };

  public configuration: Configuration = {
    username: '',
    tasks: {
      page: 1,
      pageSize: 50,
    },
  };

  setSort(sort: Sort): void {
    throw new Error('Method not implemented.');
  }

  reverseSort(): void {
    throw new Error('Method not implemented.');
  }

  setFilter(filter: Filter): void {
    throw new Error('Method not implemented.');
  }
}
