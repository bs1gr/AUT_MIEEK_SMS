/**
 * English Translations
 * Student Management System
 */

export const en = {
  // ------------------------------------
  // System & General UI (Common)
  // ------------------------------------
  systemTitle: 'MIEEK Student Management System - AUT Automotive Engineering',
  systemSubtitle: 'Comprehensive Academic Management Platform',

  // Localization & Utilities
  locale: 'en-US',
  dayNames: 'Sun,Mon,Tue,Wed,Thu,Fri,Sat',
  language: 'en',

  // Navigation
  dashboard: 'Dashboard',
  students: 'Students',
  courses: 'Courses',
  attendance: 'Attendance',
  grades: 'Grades',
  calendar: 'Calendar',
  searchTab: 'Search',
  utilsTab: 'Utils',

  // Common Actions
  save: 'Save',
  cancel: 'Cancel',
  close: 'Close',
  done: 'Done',
  confirm: 'Confirm',
  edit: 'Edit',
  delete: 'Delete',
  remove: 'Remove',
  preview: 'Preview',
  clearAll: 'Clear All',
  actions: 'Actions',
  description: 'Description',
  optional: 'Optional',
  search: 'Search',
  view: 'View',
  noData: 'No data available',

  // Server Control
  serverControl: 'Control Panel',
  backendStatus: 'Server Status',
  backendOnline: 'Server Online',
  backendOffline: 'Server Offline',
  checking: 'Checking...',
  uptime: 'Uptime',
  restart: 'Restart',
  exit: 'Exit',
  confirmExit: 'Confirm Exit?',
  yesExit: 'Yes, Exit',
  exiting: 'Shutting down...',
  serverStopped: 'Server Stopped Successfully',
  canCloseWindow: 'You can now close this window',

  // Common States & Messages
  loading: 'Loading...',
  saving: 'Saving...',
  downloading: 'Downloading...',
  dataLoadedSuccessfully: 'Data loaded successfully',
  failedToLoadData: 'Failed to load data',
  failedToSaveData: 'Failed to save data',
  fillRequiredFields: 'Please fill in all required fields',
  pleaseSelect: 'Please select a student and course',

  // Date/Time/Weight
  date: 'Date',
  selectedDate: 'Selected Date',
  weight: 'Weight',
  weightHelp: 'Higher weight = more important (1.0 is normal)',

  // Grade Scales
  percentage: 'Percentage',
  gpa: 'GPA',
  letterGrade: 'Letter Grade',
  greekGrade: 'Greek Grade (0-20)',

  // Tabs
  powerTab: 'System',

  // Search & Filtering (Phase 4)
  searchPlaceholder: 'Search...',
  searchType: 'Search Type',
  noResults: 'No results found',
  results: 'Results',
  clear: 'Clear',

  // Saved Searches
  favoriteSearches: 'Favorite Searches',
  viewAllSavedSearches: 'View All Saved Searches',
  noSavedSearches: 'No saved searches',
  saveSearch: 'Save This Search',
  saveSearchAs: 'Save search as...',
  savedSearchName: 'Search Name',
  savedSearchDescription: 'Description (optional)',
  searchSaved: 'Search saved successfully',
  failedToSaveSearch: 'Failed to save search',
  failedToDeleteSearch: 'Failed to delete search',
  failedToToggleFavorite: 'Failed to toggle favorite',
  searchDeleted: 'Search deleted successfully',

  // Advanced Filters
  advancedFilters: 'Advanced Filters',
  addFilter: 'Add Filter',
  removeFilter: 'Remove Filter',
  filterField: 'Field',
  filterOperator: 'Operator',
  filterValue: 'Value',
  equals: 'Equals',
  contains: 'Contains',
  startsWith: 'Starts with',
  greaterThan: 'Greater than',
  lessThan: 'Less than',
  between: 'Between',
  applyFilters: 'Apply Filters',
  resetFilters: 'Reset Filters',
  noFiltersApplied: 'No filters applied',

  // Saved Searches Management
  savedSearches: 'Saved Searches',
  savedSearchesDescription: 'Manage and organize your saved searches',
  filterByType: 'Filter by Type',
  favoritesOnly: 'Favorites Only',
  noFavoriteSearches: 'No favorite searches found',
  createFirstSearch: 'Create your first search to get started',
  toggleFavorite: 'Toggle Favorite',
  loadSearch: 'Load Search',
  confirmDeleteSearch: 'Are you sure you want to delete this search?',
  showingSearches: 'Showing {{count}} of {{total}} searches',
  filters: 'filters',
  all: 'All',

  // Pagination & Search UI
  previous: 'Previous',
  next: 'Next',
  page: 'Page',
  sortBy: 'Sort by',
  query: 'Query',

  // Import/Export
  importExport: {
    openExportDialog: 'Export Data',
    exportData: 'Export Data',
    exportType: 'Export Type',
    students: 'Students',
    courses: 'Courses',
    grades: 'Grades',
    startExport: 'Start Export',
    download: 'Download',
    cancel: 'Cancel',
    status: {
      pending: 'Pending...',
      processing: 'Processing...',
      completed: 'Completed',
      failed: 'Export failed',
    },
    jobId: 'Job ID',
    pollingStatus: 'Polling for updates...',
  },

  // Custom Reports (Phase 6)
  customReports: {
    title: 'Custom Reports',
    createNew: 'Create New Report',
    edit: 'Edit Report',
    delete: 'Delete',
    bulkDelete: 'Delete Selected',
    confirmDelete: 'Are you sure you want to delete this report?',
    report: 'Report',
    reports: 'Reports',
    template: 'Template',
    templates: 'Templates',
    builder: 'Report Builder',
    templateBrowser: 'Template Browser',
    configuration: 'Configuration',
    fields: 'Fields',
    filters: 'Filters',
    sorting: 'Sorting',
    preview: 'Preview',
    next: 'Next',
    previous: 'Previous',
    back: 'Back',
    save: 'Save Report',
    generate: 'Generate',
    download: 'Download',
    downloadTooltip: 'Download generated report file',
    delete: 'Delete',
    deleteGeneratedTooltip: 'Delete generated report',
    generatedReportsTitle: 'Generated Reports:',
    generatedLabel: 'Generated',
    generatedNow: 'Generated just now',
    status: 'Status',
    statusProcessing: 'Processing...',
    statusCompleted: 'Completed',
    statusFailed: 'Failed',
    statusPending: 'Pending',
    processing: 'Processing...',
    completed: 'Completed',
    failed: 'Failed',
    error: 'Error',
    loading: 'Loading...',
    noReports: 'No reports created yet',
    noGeneratedReports: 'No generated reports yet',
    noTemplates: 'No templates available',
    selectEntityType: 'Select Entity Type',
    selectFields: 'Select Fields',
    addFilter: 'Add Filter',
    addSort: 'Add Sort Rule',
    entity: 'Entity',
    entityType: 'Entity Type',
    exportFormat: 'Export Format',
    pdf: 'PDF',
    excel: 'Excel',
    csv: 'CSV',
    operator: 'Operator',
    value: 'Value',
    field: 'Field',
    order: 'Order',
    ascending: 'Ascending',
    descending: 'Descending',
    favorite: 'Favorite',
    useTemplate: 'Use Template',
    standardTemplates: 'Standard Templates',
    userTemplates: 'My Templates',
    sharedTemplates: 'Shared Templates',
  },

  // Continue with rest of translations...
  // (This is just the structure - would include all translations)
};

export default en;
