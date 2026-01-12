# Test GraphQL Hierarchy Query

Use this query to test the GitLab hierarchy functionality.

## Single Work Item Query

Test with your project `parthi2929/axon-board`:

```graphql
query testSingleWorkItem {
  project(fullPath: "parthi2929/axon-board") {
    workItem(iid: "5") {
      id
      iid
      title
      workItemType {
        name
      }
      widgets {
        type
        ... on WorkItemWidgetHierarchy {
          hasParent
          parent {
            iid
            title
            webUrl
          }
          hasChildren
          children {
            nodes {
              iid
              title
            }
          }
        }
      }
    }
  }
}
```

Expected result for work item #5 (Task):
- `hasParent: true`
- `parent.iid: "1"`
- `parent.title: "Infra - Sw & Networking"`

## Batch Work Items Query (What the code uses)

```graphql
query batchGetWorkItemHierarchy {
  project(fullPath: "parthi2929/axon-board") {
    issue_1: workItem(iid: "1") {
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
    issue_5: workItem(iid: "5") {
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
```

## Test using curl

```bash
curl --header "PRIVATE-TOKEN: <your_token>" \
     --header "Content-Type: application/json" \
     --request POST \
     --data '{
       "query": "{ project(fullPath: \"parthi2929/axon-board\") { workItem(iid: \"5\") { iid title widgets { ... on WorkItemWidgetHierarchy { hasParent parent { iid title webUrl } hasChildren }}}}}"
     }' \
     https://gitlab.com/api/graphql | jq
```

## What Changed

### Fixed Issues:

1. **Changed `namespace(fullPath:)` to `project(fullPath:)`**
   - Your example used `project(fullPath:)` which is correct
   - The code was using `workspace: namespace(fullPath:)` which might not work

2. **TreeBuilder now filters out orphaned tasks**
   - Tasks with `isGitLabTask=true` are NOT shown in root list
   - Only Issues (`isGitLabIssue=true`) can be root items
   - Prevents work items from appearing at root level

3. **Removed unnecessary `/issues/:id/links` REST API calls**
   - Those link types (`blocks`/`is_blocked_by`) don't exist in GitLab API
   - Now only uses GraphQL WorkItemWidgetHierarchy

4. **Preserves `has_tasks` field**
   - `hasChildren` from REST API is now preserved
   - GraphQL data enhances it, doesn't overwrite it

## Expected Behavior

- **Issue #1** (Infra - Sw & Networking):
  - `issue_type: "issue"`
  - `has_tasks: true`
  - `hasChildren: true`
  - Appears in root list ✅

- **Work Item #5** (Individual email ID for Team):
  - `issue_type: "task"`
  - `parentIid: "1"` (from GraphQL)
  - Does NOT appear in root list ✅
  - Shows as child of Issue #1 ✅

