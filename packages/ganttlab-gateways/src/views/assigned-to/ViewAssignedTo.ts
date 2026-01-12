import {
  SourceVisitor,
  PaginatedListOfTasks,
  Configuration,
  Sort,
  Filter,
} from 'ganttlab-entities';
import { ViewAssignedToGitHubStrategy } from './strategies/ViewAssignedToGitHubStrategy';
import { ViewAssignedToGitLabStrategy } from './strategies/ViewAssignedToGitLabStrategy';

export class ViewAssignedTo extends SourceVisitor<PaginatedListOfTasks> {
  public slug = 'assigned-to';
  public name = 'Assigned to user';
  public shortDescription = 'All issues and tasks assigned to a specific user';
  public slugStrategies = {
    github: new ViewAssignedToGitHubStrategy(),
    gitlab: new ViewAssignedToGitLabStrategy(),
  };

  public configuration: Configuration = {
    assigneeUsername: '',
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
