# GanttLab - Enhanced Fork

## About the Original Project

GanttLab is a frontend-only Gantt chart application for GitLab and GitHub. Originally developed as an open-source project, it reads issues via API and displays them as an interactive Gantt chart using start/due dates from issue descriptions (`GanttStart` and `GanttDue` fields). The application runs entirely in the browser with no server-side data storage.

Original project: [gitlab.com/ganttlab/ganttlab](https://gitlab.com/ganttlab/ganttlab)

## New Features Added in This Fork

This fork extends the original GanttLab with enhanced visualization and filtering capabilities:

### Features

- **Issue Search Filter**: Real-time filtering of issues by title with simple substring and regex search modes
- **Issue Tree Visualization**: Hierarchical display of parent-child issue relationships with expandable/collapsible tree structure
- **GraphQL Hierarchy Support**: Native support for GitLab's WorkItemWidgetHierarchy API for accurate parent-child relationships
- **Smart Filtering with Context**: When filtering, ancestor issues are retained and dimmed to provide context when descendants match
- **Keyword Highlighting**: Visual highlighting of search matches in issue titles during active filtering
- **Dimmed Gantt Bars**: Gantt chart bars are automatically dimmed for greyed-out items to reduce visual clutter during filtering
- **Tree State Persistence**: Expansion/collapse state persists across page refreshes within the same browser session
- **Circular Reference Protection**: Automatic detection and prevention of infinite loops in issue hierarchies
- **GitLab Task Type Support**: Proper handling of GitLab's Task work item type, ensuring tasks only appear as children of issues
- **Lazy Loading Children**: Children are fetched on-demand when expanding parent issues with caching to minimize API calls
- **Batch GraphQL Queries**: Efficient batched API requests to retrieve hierarchy information for multiple issues simultaneously

## Running GanttLab Locally

If you want to run GanttLab on your local machine for development or testing purposes, follow these steps:

### Prerequisites

- **Node.js** (version 16 or higher recommended)
- **npm** (comes with Node.js)

### Installation and Setup

1. **Clone or download the project**:
   ```bash
   git clone <repository-url>
   cd ganttlab
   ```

2. **Install dependencies**:
   ```bash
   npm install --legacy-peer-deps
   ```
   
   > **Note**: The `--legacy-peer-deps` flag is required due to dependency compatibility issues with newer npm versions.

3. **Build internal libraries**:
   This step is automatically handled by the postinstall script, but if needed, you can run:
   ```bash
   npm run build:lib:entities
   npm run build:lib:use-cases
   npm run build:lib:gateways
   ```

### Starting the Development Server

Due to compatibility issues with newer Node.js versions (17+), you need to use the legacy OpenSSL provider:

1. **Navigate to the webapp directory**:
   ```bash
   cd packages/ganttlab-adapter-webapp
   ```

2. **Start the development server**:
   ```bash
   npx --node-options="--openssl-legacy-provider" vue-cli-service serve
   ```

3. **Access the application**:
   Open your browser and go to: **http://localhost:8080**

### Alternative Method (from root directory)

You can also run the webapp from the root directory:
```bash
npm run webapp
```

> **Important**: If you encounter OpenSSL errors with newer Node.js versions, always use the `--openssl-legacy-provider` flag.

### Troubleshooting

- **OpenSSL errors**: Use `--openssl-legacy-provider` flag with Node.js
- **Dependency conflicts**: Use `npm install --legacy-peer-deps` instead of regular `npm install`
- **Yarn issues**: This project works better with npm than yarn on newer systems
- **Port conflicts**: If port 8080 is busy, Vue CLI will automatically suggest an alternative port

### Building for Production

To build the application for production:
```bash
npm run build:webapp
```

The built files will be available in the `packages/ganttlab-adapter-webapp/dist` directory.

## Documentation

- [Issue Search Filter Feature](docs/features/issue-search-filter.md)
- [Issue Tree Visualization Feature](docs/features/issue-tree-visualization.md)
- [Download and Install Guide](docs/download-and-install.md)

## License

The GanttLab application is distributed under the [Apache License, Version 2.0](LICENSE). Please have a look at the dependencies licenses if you plan on using, building, or distributing this application.
