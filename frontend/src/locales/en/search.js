/**
 * English translations for Search and Filters
 */

export default {
  placeholder: {
    students: 'Search students...',
    courses: 'Search courses...',
    grades: 'Search grades...'
  },
  ariaLabel: 'Search',
  search: 'Search',
  noSuggestions: 'No suggestions found',
  unknown: 'Unknown',
  type: {
    student: 'Student',
    course: 'Course',
    grade: 'Grade'
  },
  stats: {
    students: 'Students',
    courses: 'Courses',
    grades: 'Grades'
  },
  presets: {
    title: 'Filter Presets',
    activeStudents: 'Active Students',
    currentYear: 'Current Year',
    recentEnrollments: 'Recent Enrollments',
    highCredit: 'High Credit Courses',
    coreCourses: 'Core Courses',
    threeCredits: '3-Credit Courses',
    highGrades: 'High Grades',
    passingOnly: 'Passing Grades',
    failing: 'Failing Grades',
  },
  saved: {
    title: 'Saved Searches',
    save: 'Save Search',
    load: 'Load',
    delete: 'Delete',
    enterName: 'Enter search name',
    nameRequired: 'Search name is required',
    success: 'Search saved successfully',
    limit: 'Maximum 10 saved searches per type',
  },
  advanced: {
    title: 'Advanced Filters',
    apply: 'Apply Filters',
    reset: 'Reset Filters',
    collapse: 'Collapse Filters',
    expand: 'Expand Filters',
  },
  fields: {
    firstName: 'First Name',
    lastName: 'Last Name',
    email: 'Email',
    status: 'Status',
    academicYear: 'Academic Year',
    courseName: 'Course Name',
    courseCode: 'Course Code',
    credits: 'Credits',
    gradeMin: 'Min Grade',
    gradeMax: 'Max Grade',
    passed: 'Passed',
    studentId: 'Student ID',
    courseId: 'Course ID',
    enterValue: 'Enter value'
  },
  filters: {
    title: 'Filters',
    custom: 'Custom Filters'
  },
  sort: {
    label: 'Sort by',
    directionLabel: 'Sort direction',
    relevance: 'Relevance',
    name: 'Name',
    email: 'Email',
    created: 'Created',
    updated: 'Updated',
    asc: 'Ascending',
    desc: 'Descending'
  },
  pagination: {
    range: '{{start}}-{{end}} of {{total}} results'
  },
  pageLabel: 'Page {{page}}',
  limitLabel: 'Results per page',
  limitOption: '{{count}} per page',
  typeLabel: 'Type',
  queryLabel: 'Query',
  resultsTitle: 'Results',
  resultsSummary: '{{count}} total results',
  noResults: 'No results found',
  facets: {
    title: 'Refine results',
    subtitle: 'Use facets to narrow the search',
    total: '{{total}} matches',
    status: 'Status',
    enrollment_type: 'Enrollment type',
    months: 'Months',
    loading: 'Loading facets...',
    values: {
      active: 'Active',
      inactive: 'Inactive',
      suspended: 'Suspended',
      'full-time': 'Full-time',
      'part-time': 'Part-time'
    }
  },
  advancedFilters: {
    title: 'Advanced Filters',
    addFilter: 'Add Filter',
    clearAll: 'Clear All',
    removeFilter: 'Remove this filter',
    empty: 'No filters added yet',
    min: 'Minimum value',
    max: 'Maximum value',
    condition: {
      field: 'Field',
      operator: 'Operator',
      value: 'Value',
      selectField: 'Select field...',
      selectOperator: 'Select operator...'
    },
    operators: {
      equals: 'Equals',
      contains: 'Contains',
      startsWith: 'Starts with',
      greaterThan: 'Greater than',
      lessThan: 'Less than',
      between: 'Between',
      isEmpty: 'Is empty',
      isNotEmpty: 'Is not empty'
    }
  }
};
