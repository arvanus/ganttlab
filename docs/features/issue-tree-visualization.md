# Issue Hierarchy & Link Visualization PRD

## Purpose
Provide a clear, interactive representation of issue relationships (parent ↔ child and generic links) directly within GanttLab’s issue list and Gantt chart. Users gain rapid insight into task breakdowns, dependencies, and grouping without leaving the timeline view.

## Problem Statement
Today GanttLab renders issues as a flat list. Projects that break work into epics → stories → sub-tasks—or that rely on cross-issue links—lose that context in the chart. Users waste time jumping between tools or manually inferring relationships, leading to planning errors and reduced situational awareness.

## Goals & Success Criteria
1. Visually connect linked issues with a thin vertical line; child issues appear indented under their parent (tree view).
2. Render **only top-level (root) issues** by default to keep the view concise.
3. Display an expandable **“+” toggle** beside a parent when it has children; clicking expands to show immediate children, turning the toggle into “–”.
4. Persist expanded / collapsed state for the browser session (refresh keeps state until tab closed).
5. Lazy-load children on first expansion (≤ 200 ms perceived latency) and cache results to avoid repeated API calls.
6. Sorting (by start date, status, etc.) applies at **root level** only; children retain their original order beneath each parent.
7. Safeguard against circular references and infinite loops—every issue appears once in the tree.

## Non-Goals (Phase-1)
- Visualisation of cross-project links.
- Rendering more than two relationship types (only *parent/child* and *generic links* are in scope).
- Persisting tree expansion across different devices or long-term sessions.

## Personas
For this phase we assume a single authenticated user (anyone providing a valid personal access token). The feature set and behaviour are identical for all users; no role-specific logic or permissions are required.

## User Stories
1. *As a user* I can immediately see a vertical line connecting issues that are linked, so relationships are visually obvious.
2. *As a user* child issues appear indented under their parent with their own guideline, giving me a clear tree structure.
3. *As a user* I can click a “+” toggle to lazily load and reveal hidden child issues, and click again to collapse them.
4. *As a user* my expanded or collapsed state persists when I refresh the page within the same browser tab.
5. *As a user* I can sort the list, and only the top-level issues reorder while children stay grouped with their parent.
6. *As a user* I never encounter infinite loops, even if two issues are mistakenly linked in a cycle.

## UX Requirements
- Tree toggles use the same icon language as existing list (+ / – signs, 16 px).
- Indentation is a 1 em left margin per hierarchy level.
- Vertical guideline is a subtle 1 px line "border-color: var(--color-border-muted)".
- For linked but non-hierarchical issues, show a dotted line variant.
- Hover on the toggle shows *“Expand children”* / *“Collapse children”* tooltip.
- Expanded state badge: *“15 / 43 issues visible”* updates dynamically.
- When a title filter is active, each occurrence of the matched keyword in issue titles is highlighted with a subtle gray background (`bg-gray-200` in Tailwind). This disappears when the filter is cleared.

## Functional Requirements
| ID | Requirement |
|----|-------------|
| FR-1 | Render only root issues upon initial load or after applying a filter. |
| FR-2 | For every candidate issue (returned after filter), fetch "hasParent", "parent { iid title }", "hasChildren" in **batched GraphQL** calls (≤ 50 aliases per request) using "WorkItemWidgetHierarchy". Issues with "hasParent = false" are considered roots. |
| FR-3 | When the user expands a parent, call the same widget with "children(first: N)" to retrieve immediate children. Combine with cache from FR-5 to avoid duplicate requests. |
| FR-4 | If GraphQL hierarchy widget is unavailable (self-hosted ≤16.0 or disabled), fallback to "/issues/:id/links" + heuristic (blocks → blocked_by) to infer hierarchy. |
| FR-5 | After discovering children (via GraphQL or fallback), cache them in memory ("Map<issueId, Issue[]>") for the session. |
| FR-6 | Collapsing marks descendants as hidden but keeps them in cache. |
| FR-7 | Avoid circular traversal by maintaining a "Set<issueId>" of ancestors; if a potential child already exists upstream, skip and log warning. |
| FR-8 | Sorting triggers **only** on the currently visible roots; children maintain insert order. |
| FR-9 | Session persistence uses "sessionStorage.issueTreeState = { expandedIds: [] }". |
| FR-10 | API pagination: when "children.pageInfo.hasNextPage" is true, repeat the GraphQL request with "after:" cursor until all nodes fetched **or** depth/display limit reached. |

## Reference GraphQL Queries (gitlab.com Free)

> These examples illustrate the exact queries the client will issue via batched requests. Aliases will be added when querying multiple IIDs in one round-trip.

### Retrieve children for a root issue
```graphql
query getWorkItemHierarchy($fullPath: ID!, $iid: String!, $first: Int = 100) {
  workspace: namespace(fullPath: $fullPath) {
    workItem(iid: $iid) {
      iid
      title
      widgets {
        ... on WorkItemWidgetHierarchy {
          hasChildren
          children(first: $first) {
            nodes { iid title webUrl }
            pageInfo { endCursor hasNextPage }
          }
        }
      }
    }
  }
}
```

#### Sample response (abridged)
```json
{
  "data": {
    "workspace": {
      "workItem": {
        "iid": "325",
        "title": "AX-ODE-PRJ-0002-VineBlendr",
        "widgets": [
          {
            "hasChildren": true,
            "children": {
              "nodes": [
                { "iid": "330", "title": "HMI Design Work", "webUrl": "…/330" },
                { "iid": "329", "title": "IO Mapping", "webUrl": "…/329" }
              ],
              "pageInfo": { "endCursor": "Wy0xXSIsIn…", "hasNextPage": false }
            }
          }
        ]
      }
    }
  }
}
```

### Retrieve parent for a child issue
```graphql
query getWorkItemParent($fullPath: ID!, $iid: String!) {
  workspace: namespace(fullPath: $fullPath) {
    workItem(iid: $iid) {
      iid
      title
      widgets {
        ... on WorkItemWidgetHierarchy {
          hasParent
          parent { iid title webUrl }
        }
      }
    }
  }
}
```

#### Sample response (abridged)
```json
{
  "data": {
    "workspace": {
      "workItem": {
        "iid": "330",
        "title": "HMI Design Work",
        "widgets": [
          {
            "hasParent": true,
            "parent": { "iid": "325", "title": "VineBlendr", "webUrl": "…/325" }
          }
        ]
      }
    }
  }
}
```

Responses (abridged) mirror the examples provided earlier and are persisted to the in-session cache keyed by "workItemId".

## Interaction with Issue Search Filter

When the title filter (Simple or Regex) is active:

1. Evaluate the filter against **every visible node and its cached descendants** (depth-first traversal).
2. A node is kept in the tree if:
   • It matches the filter **OR**
   • Any of its descendants match (the ancestor provides context).
3. When a non-matching ancestor is retained only to provide context, it is rendered dimmed (50 % opacity) and its “+ / –” toggle stays active so the user can explore further.
4. Non-matching sub-branches under a retained parent are pruned to keep the view focused.
5. Root-level sorting continues to operate on the (possibly reduced) set of visible roots.
6. Clearing the filter restores the last expansion state preserved in sessionStorage.

This approach mirrors behaviors in popular IDE file trees and project-management tools (Jira, Azure Boards) where ancestors remain for context whenever a descendant matches.

## Performance Requirements
- Initial tree render ≤ 120 ms for 500 root issues.
- Expanding a parent with 50 children ≤ 200 ms (API + DOM update) on mid-range laptop (Chrome 2023).

## Security & Privacy
- All requests use existing authenticated API layer; no new scopes required.
- Expansion state stored only in "sessionStorage"—never sent to backend.

## Analytics / Metrics
- Track number of expand / collapse actions.
- Count average depth users expand to (e.g. 0 = never, 1 = one level, etc.).

## Roll-out Plan
1. **Feature flag**: "issueHierarchyView" (staging *on*, production *off*).
2. Internal QA → Beta testers with large datasets → GA.
3. Remove feature flag after two successful sprints with <2% error rate.

## Future Enhancements
- Persist expansion state in URL ("?expanded=123,456").
- Display dependency types (blocks, relates_to) with iconography.
- Drag-and-drop re-ordering within the tree.
- Keyboard navigation (← collapse, → expand).

## Acceptance Criteria / QA Checklist
- [ ] Indented tree renders correctly with vertical guidelines.
- [ ] Linked (non-hierarchical) issues display dotted connection.
- [ ] “+ / –” toggles correctly fetch, cache, and display children.
- [ ] Sorting only affects root issues.
- [ ] Expansion state persists on refresh within same tab.
- [ ] Circular link edge cases handled gracefully.
- [ ] Unit tests for tree building, caching, and circular detection.
- [ ] Matched keywords are highlighted in issue titles when filter is active.
- [ ] Performance benchmarks met for expansion and initial load. 