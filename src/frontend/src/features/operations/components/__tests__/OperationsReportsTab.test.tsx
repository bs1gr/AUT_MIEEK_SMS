import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import OperationsReportsTab from '../OperationsReportsTab';

// Plan todo 75 stage 6: Utils → Reports had fifteen links to three pages (twelve of them the
// template browser with a filter already chosen, which the browser offers itself).
const t = (key: string) => key;

const renderTab = (studentIdParam: string | null = null, courseIdParam: string | null = null) =>
  render(
    <MemoryRouter>
      <OperationsReportsTab t={t} studentIdParam={studentIdParam} courseIdParam={courseIdParam} />
    </MemoryRouter>
  );

describe('OperationsReportsTab', () => {
  it('offers the grade sheets and the three report pages, each once', () => {
    renderTab();

    const links = screen.getAllByRole('link').map((link) => link.getAttribute('href'));
    expect(links).toEqual([
      '/operations/reports/grade-sheets',
      '/operations/reports',
      '/operations/reports/builder',
      '/operations/reports/templates',
    ]);
    expect(screen.getByTestId('reports-card-templates')).toHaveTextContent('templatesFilterHint');
  });

  it('carries the student and the course it was opened for to the templates', () => {
    renderTab('12', '7');

    expect(screen.getByTestId('reports-card-templates').getAttribute('href')).toBe(
      '/operations/reports/templates?studentId=12&courseId=7'
    );
    expect(screen.getByTestId('reports-grade-sheets-card').getAttribute('href')).toContain('courseId=7');
  });
});
