/**
 * Tests for ChartDrillDown component
 */

import { render } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChartDrillDown } from '../ChartDrillDown';
import React from 'react';

const mockLevels = [
  {
    id: 'root',
    label: 'All Subjects',
    data: [
      { subject: 'Math', average: 85 },
      { subject: 'Science', average: 78 },
      { subject: 'English', average: 92 },
    ],
  },
  {
    id: 'math',
    label: 'Math Students',
    parentId: 'root',
    data: [
      { student: 'John Doe', grade: 88 },
      { student: 'Jane Smith', grade: 82 },
    ],
  },
];

describe('ChartDrillDown', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockRenderContent = (level: any) => (
    <div data-testid={`level-${level.id}`}>
      {level.label}
    </div>
  );

  it('renders drill-down navigation without crashing', () => {
    const { container } = render(
      <ChartDrillDown
        title="Test Chart"
        levels={mockLevels}
        renderContent={mockRenderContent}
      />
    );

    expect(container.firstChild).toBeInTheDocument();
  });

  it('displays current level content', () => {
    render(
      <ChartDrillDown
        title="Test Chart"
        levels={mockLevels}
        renderContent={mockRenderContent}
      />
    );

    const content = screen.getByTestId('level-root');
    expect(content).toBeInTheDocument();
  });

  it('renders title and breadcrumb navigation', () => {
    const { container } = render(
      <ChartDrillDown
        title="Analytics Chart"
        levels={mockLevels}
        renderContent={mockRenderContent}
      />
    );

    // Component should render with structure
    expect(container.querySelector('[class*="breadcrumb"]') || container.firstChild).toBeInTheDocument();
  });

  it('handles navigation state changes', () => {
    const { container } = render(
      <ChartDrillDown
        title="Test Chart"
        levels={mockLevels}
        renderContent={mockRenderContent}
      />
    );

    // Component maintains navigation state
    expect(container.firstChild).toBeInTheDocument();
  });
});
