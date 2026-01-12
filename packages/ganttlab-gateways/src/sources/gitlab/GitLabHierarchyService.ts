import { GitLabGateway } from './GitLabGateway';

/**
 * WorkItem hierarchy widget response from GitLab GraphQL
 */
interface WorkItemHierarchyWidget {
  hasParent?: boolean;
  parent?: {
    iid: string;
    title: string;
    webUrl: string;
  };
  hasChildren?: boolean;
  children?: {
    nodes: Array<{
      iid: string;
      title: string;
      webUrl: string;
    }>;
    pageInfo: {
      endCursor: string;
      hasNextPage: boolean;
    };
  };
}

interface WorkItemsResponse {
  project: {
    workItems: {
      nodes: Array<{
        iid: string;
        title: string;
        widgets: WorkItemHierarchyWidget[];
      }>;
    };
  };
}

/**
 * Service for fetching issue hierarchy from GitLab GraphQL API
 */
export class GitLabHierarchyService {
  /**
   * Fetch hierarchy information for a work item
   */
  async fetchHierarchy(
    gateway: GitLabGateway,
    projectPath: string,
    iid: string,
  ): Promise<WorkItemHierarchyWidget | null> {
    try {
      const query = `
        query getWorkItemHierarchy($fullPath: ID!, $iids: [String!]!) {
          project(fullPath: $fullPath) {
            workItems(iids: $iids) {
              nodes {
                iid
                title
                widgets {
                  ... on WorkItemWidgetHierarchy {
                    hasParent
                    parent { iid title webUrl }
                    hasChildren
                  }
                }
              }
            }
          }
        }
      `;

      const baseUrl = gateway.getUrl();
      const { data } = await gateway.safeAxiosRequest<{
        data: WorkItemsResponse;
      }>({
        method: 'POST',
        url: `${baseUrl}/api/graphql`,
        data: {
          query,
          variables: {
            fullPath: projectPath,
            iids: [iid],
          },
        },
      });

      if (data.data?.project?.workItems?.nodes?.[0]?.widgets) {
        // Find the hierarchy widget from the first node
        for (const widget of data.data.project.workItems.nodes[0].widgets) {
          if (
            widget.hasParent !== undefined ||
            widget.hasChildren !== undefined
          ) {
            return widget;
          }
        }
      }

      return null;
    } catch (error) {
      console.warn(`Failed to fetch hierarchy for issue ${iid}:`, error);
      return null;
    }
  }

  /**
   * Fetch children for a work item
   */
  async fetchChildren(
    gateway: GitLabGateway,
    projectPath: string,
    iid: string,
    first = 100,
    after?: string,
  ): Promise<{
    children: Array<{ iid: string; title: string; webUrl: string }>;
    hasMore: boolean;
    endCursor?: string;
  }> {
    try {
      const query = `
        query getWorkItemChildren($fullPath: ID!, $iids: [String!]!, $first: Int!, $after: String) {
          project(fullPath: $fullPath) {
            workItems(iids: $iids) {
              nodes {
                iid
                title
                widgets {
                  ... on WorkItemWidgetHierarchy {
                    children(first: $first, after: $after) {
                      nodes { iid title webUrl }
                      pageInfo { endCursor hasNextPage }
                    }
                  }
                }
              }
            }
          }
        }
      `;

      const baseUrl = gateway.getUrl();
      const { data } = await gateway.safeAxiosRequest<{
        data: WorkItemsResponse;
      }>({
        method: 'POST',
        url: `${baseUrl}/api/graphql`,
        data: {
          query,
          variables: {
            fullPath: projectPath,
            iids: [iid],
            first,
            after,
          },
        },
      });

      if (data.data?.project?.workItems?.nodes?.[0]?.widgets) {
        for (const widget of data.data.project.workItems.nodes[0].widgets) {
          if (widget.children) {
            return {
              children: widget.children.nodes,
              hasMore: widget.children.pageInfo.hasNextPage,
              endCursor: widget.children.pageInfo.endCursor,
            };
          }
        }
      }

      return { children: [], hasMore: false };
    } catch (error) {
      console.warn(`Failed to fetch children for issue ${iid}:`, error);
      return { children: [], hasMore: false };
    }
  }

  /**
   * Batch fetch hierarchy information for multiple issues
   * Fetches up to 50 issues per request using workItems query
   */
  async batchFetchHierarchy(
    gateway: GitLabGateway,
    projectPath: string,
    iids: string[],
  ): Promise<Map<string, WorkItemHierarchyWidget>> {
    const result = new Map<string, WorkItemHierarchyWidget>();
    const batchSize = 50;

    // Process in batches of 50
    for (let i = 0; i < iids.length; i += batchSize) {
      const batch = iids.slice(i, i + batchSize);
      const batchResult = await this.fetchHierarchyBatch(
        gateway,
        projectPath,
        batch,
      );
      batchResult.forEach((value, key) => result.set(key, value));
    }

    return result;
  }

  /**
   * Fetch hierarchy for a batch of issues using workItems query
   */
  private async fetchHierarchyBatch(
    gateway: GitLabGateway,
    projectPath: string,
    iids: string[],
  ): Promise<Map<string, WorkItemHierarchyWidget>> {
    const result = new Map<string, WorkItemHierarchyWidget>();

    console.log(`\n🔍 GitLabHierarchyService.fetchHierarchyBatch`);
    console.log(`   Project: ${projectPath}`);
    console.log(`   IIDs to fetch: ${iids.join(', ')}`);

    try {
      const query = `
        query batchGetWorkItemHierarchy($fullPath: ID!, $iids: [String!]!) {
          project(fullPath: $fullPath) {
            workItems(iids: $iids) {
              nodes {
                iid
                title
                widgets {
                  ... on WorkItemWidgetHierarchy {
                    hasParent
                    parent { iid title webUrl }
                    hasChildren
                  }
                }
              }
            }
          }
        }
      `;

      const baseUrl = gateway.getUrl();
      console.log(`   GraphQL endpoint: ${baseUrl}/api/graphql`);

      const { data } = await gateway.safeAxiosRequest<{
        data: WorkItemsResponse;
      }>({
        method: 'POST',
        url: `${baseUrl}/api/graphql`,
        data: {
          query,
          variables: {
            fullPath: projectPath,
            iids,
          },
        },
      });

      console.log(`   ✅ GraphQL response received`);
      console.log(`   Raw response:`, JSON.stringify(data, null, 2));

      if (data.data?.project?.workItems?.nodes) {
        console.log(
          `   Found ${data.data.project.workItems.nodes.length} work items in response`,
        );

        // Process each work item in the response
        for (const workItem of data.data.project.workItems.nodes) {
          console.log(`\n   WorkItem #${workItem.iid}: "${workItem.title}"`);

          if (workItem.widgets) {
            console.log(`     Widgets count: ${workItem.widgets.length}`);
            for (const widget of workItem.widgets) {
              if (
                widget.hasParent !== undefined ||
                widget.hasChildren !== undefined
              ) {
                console.log(`     ✓ Found hierarchy widget:`);
                console.log(`       hasParent: ${widget.hasParent}`);
                if (widget.parent) {
                  console.log(`       parent.iid: ${widget.parent.iid}`);
                  console.log(`       parent.title: ${widget.parent.title}`);
                }
                console.log(`       hasChildren: ${widget.hasChildren}`);

                result.set(workItem.iid, widget);
                break;
              }
            }
          } else {
            console.log(`     ⚠️ No widgets found for this work item`);
          }
        }
      } else {
        console.log(`   ⚠️ No work items in response or unexpected structure`);
        console.log(`   data.data:`, data.data);
      }
    } catch (error) {
      console.error('❌ Failed to batch fetch hierarchy:', error);
      if (error instanceof Error) {
        console.error('   Error message:', error.message);
        console.error('   Error stack:', error.stack);
      }
    }

    return result;
  }
}

export const gitLabHierarchyService = new GitLabHierarchyService();
