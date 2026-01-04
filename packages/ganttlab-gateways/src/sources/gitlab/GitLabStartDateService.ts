import { GitLabGateway } from './GitLabGateway';

/**
 * WorkItem start and due date widget response from GitLab GraphQL
 * Note: The widgets array contains many empty objects {}, only one will have startDate
 */
interface WorkItemStartAndDueDateWidget {
  startDate?: string;
  dueDate?: string;
}

interface WorkItemsResponse {
  project: {
    workItems: {
      nodes: Array<{
        iid: string;
        widgets: WorkItemStartAndDueDateWidget[];
      }>;
    };
  };
}

/**
 * Service for fetching start dates from GitLab GraphQL API
 */
export class GitLabStartDateService {
  /**
   * Batch fetch start dates for multiple work items
   * Fetches up to 50 issues per request using workItems query
   */
  async batchFetchStartDates(
    gateway: GitLabGateway,
    projectPath: string,
    iids: string[],
  ): Promise<Map<string, string | null>> {
    const result = new Map<string, string | null>();

    if (iids.length === 0) {
      console.log(
        '📅 GitLabStartDateService: No IIDs to fetch start dates for',
      );
      return result;
    }

    console.log(`\n📅 GitLabStartDateService.batchFetchStartDates`);
    console.log(`   Project: ${projectPath}`);
    console.log(`   IIDs to fetch: [${iids.join(', ')}]`);

    const batchSize = 50;

    // Process in batches of 50
    for (let i = 0; i < iids.length; i += batchSize) {
      const batch = iids.slice(i, i + batchSize);
      const batchResult = await this.fetchStartDatesBatch(
        gateway,
        projectPath,
        batch,
      );
      batchResult.forEach((value, key) => result.set(key, value));
    }

    console.log(`   📅 Total start dates fetched: ${result.size}`);
    result.forEach((startDate, iid) => {
      console.log(`      #${iid}: ${startDate || '(no start date)'}`);
    });

    return result;
  }

  /**
   * Fetch start dates for a batch of issues using workItems query
   */
  private async fetchStartDatesBatch(
    gateway: GitLabGateway,
    projectPath: string,
    iids: string[],
  ): Promise<Map<string, string | null>> {
    const result = new Map<string, string | null>();

    try {
      const query = `
        query batchGetWorkItemStartDate($fullPath: ID!, $iids: [String!]!) {
          project(fullPath: $fullPath) {
            workItems(iids: $iids) {
              nodes {
                iid
                widgets {
                  ... on WorkItemWidgetStartAndDueDate {
                    startDate
                  }
                }
              }
            }
          }
        }
      `;

      const baseUrl = gateway.getUrl();
      if (!baseUrl) {
        console.warn('📅 GitLabStartDateService: Gateway URL not available');
        return result;
      }

      console.log(`   📅 GraphQL endpoint: ${baseUrl}/api/graphql`);
      console.log(`   📅 Fetching batch of ${iids.length} IIDs...`);

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

      console.log(`   📅 GraphQL response received`);
      console.log(`   📅 Raw response:`, JSON.stringify(data, null, 2));

      if (data.data?.project?.workItems?.nodes) {
        console.log(
          `   📅 Found ${data.data.project.workItems.nodes.length} work items`,
        );

        // Process each work item in the response
        for (const workItem of data.data.project.workItems.nodes) {
          let startDate: string | null = null;

          if (workItem.widgets) {
            // Find the start and due date widget (it's the one with startDate property)
            for (const widget of workItem.widgets) {
              // Check if this widget has startDate (even if it's null/empty string)
              if ('startDate' in widget) {
                startDate = widget.startDate || null;
                console.log(
                  `      WorkItem #${workItem.iid}: Found startDate widget with value "${startDate}"`,
                );
                break;
              }
            }
          }

          result.set(workItem.iid, startDate);
        }
      } else {
        console.warn(`   📅 No work items in response or unexpected structure`);
        console.warn(`   📅 data.data:`, data.data);
      }
    } catch (error) {
      console.error('📅 Failed to batch fetch start dates:', error);
      if (error instanceof Error) {
        console.error('   Error message:', error.message);
      }
      // Return empty map on error - fallback to other methods
    }

    return result;
  }
}

export const gitLabStartDateService = new GitLabStartDateService();
