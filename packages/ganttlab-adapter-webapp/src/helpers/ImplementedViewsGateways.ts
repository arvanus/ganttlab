import { Configuration, SourceVisitor } from 'ganttlab-entities';
import {
  ViewMine,
  ViewAssignedToMe,
  ViewProject,
  ViewGroup,
  ViewRepository,
  ViewMilestone,
} from 'ganttlab-gateways';

export interface ViewGateway {
  slug: string;
  icon: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  instance: SourceVisitor<any>;
  defaultConfiguration: Configuration;
}

export const ImplementedViewsGateways: Array<ViewGateway> = [
  {
    slug: 'mine',
    icon: 'person',
    instance: new ViewMine(),
    defaultConfiguration: {
      tasks: {
        page: 1,
        pageSize: 50,
      },
    },
  },
  {
    slug: 'assigned',
    icon: 'person-circle-outline',
    instance: new ViewAssignedToMe(),
    defaultConfiguration: {
      tasks: {
        page: 1,
        pageSize: 50,
      },
    },
  },
  {
    slug: 'project',
    icon: 'cube-outline',
    instance: new ViewProject(),
    defaultConfiguration: {},
  },
  {
    slug: 'group',
    icon: 'folder-outline',
    instance: new ViewGroup(),
    defaultConfiguration: {},
  },
  {
    slug: 'repository',
    icon: 'cube-outline',
    instance: new ViewRepository(),
    defaultConfiguration: {},
  },
  {
    slug: 'milestone',
    icon: 'file-tray-stacked-outline',
    instance: new ViewMilestone(),
    defaultConfiguration: {},
  },
];
