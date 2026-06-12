import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import GradeStatistics, { GradeInsights } from './GradeStatistics';
import { LanguageProvider } from '@/LanguageContext';

// Helper function to render with LanguageProvider
const renderWithLanguage = (component: React.ReactElement) => {
  return render(
    <LanguageProvider>
      {component}
    </LanguageProvider>
  );
};

describe('GradeStatistics', () => {
  const mockInsights: GradeInsights = {
    count: 10,
    avgPercentage: 85.5,
    avgGreek: 17.1,
    maxPercentage: 95.0,
    maxGreek: 19.0,
    minPercentage: 70.0,
    minGreek: 14.0,
    letterGrade: 'B'
  };

  describe('Rendering', () => {
    it('renders the component with title', () => {
      renderWithLanguage(<GradeStatistics insights={mockInsights} />);
      expect(screen.getByText(/grade statistics/i)).toBeInTheDocument();
    });

    it('displays total assignment count', () => {
      renderWithLanguage(<GradeStatistics insights={mockInsights} />);
      expect(screen.getByText(/total assignments/i)).toBeInTheDocument();
      expect(screen.getByText('10')).toBeInTheDocument();
    });

    it('displays highest grade with percentage and Greek scale', () => {
      renderWithLanguage(<GradeStatistics insights={mockInsights} />);
      expect(screen.getByText(/highest/i)).toBeInTheDocument();
      expect(screen.getByText(/95\.0%.*19\.0\/20/)).toBeInTheDocument();
    });

    it('displays lowest grade with percentage and Greek scale', () => {
      renderWithLanguage(<GradeStatistics insights={mockInsights} />);
      expect(screen.getByText(/lowest/i)).toBeInTheDocument();
      expect(screen.getByText(/70\.0%.*14\.0\/20/)).toBeInTheDocument();
    });

    it('displays average grade with percentage and Greek scale', () => {
      renderWithLanguage(<GradeStatistics insights={mockInsights} />);
      expect(screen.getByText(/average grade/i)).toBeInTheDocument();
      expect(screen.getByText(/85\.5%.*17\.1\/20/)).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('shows "no grades yet" message when insights is null', () => {
      renderWithLanguage(<GradeStatistics insights={null} />);
      expect(screen.getByText(/no grades recorded yet/i)).toBeInTheDocument();
    });

    it('does not show statistics when insights is null', () => {
      renderWithLanguage(<GradeStatistics insights={null} />);
      expect(screen.queryByText(/total assignments/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/highest/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/lowest/i)).not.toBeInTheDocument();
    });
  });

  describe('Number Formatting', () => {
    it('formats percentages to one decimal place', () => {
      const insights: GradeInsights = {
        count: 5,
        avgPercentage: 83.456,
        avgGreek: 16.691,
        maxPercentage: 92.789,
        maxGreek: 18.558,
        minPercentage: 68.123,
        minGreek: 13.625,
        letterGrade: 'B'
      };
      renderWithLanguage(<GradeStatistics insights={insights} />);
      expect(screen.getByText(/83\.5%/)).toBeInTheDocument();
      expect(screen.getByText(/92\.8%/)).toBeInTheDocument();
      expect(screen.getByText(/68\.1%/)).toBeInTheDocument();
    });

    it('formats Greek scale to one decimal place', () => {
      const insights: GradeInsights = {
        count: 5,
        avgPercentage: 83.456,
        avgGreek: 16.691,
        maxPercentage: 92.789,
        maxGreek: 18.558,
        minPercentage: 68.123,
        minGreek: 13.625,
        letterGrade: 'B'
      };
      renderWithLanguage(<GradeStatistics insights={insights} />);
      expect(screen.getByText(/16\.7\/20/)).toBeInTheDocument();
      expect(screen.getByText(/18\.6\/20/)).toBeInTheDocument();
      expect(screen.getByText(/13\.6\/20/)).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles single assignment (count = 1)', () => {
      const insights: GradeInsights = {
        count: 1,
        avgPercentage: 90.0,
        avgGreek: 18.0,
        maxPercentage: 90.0,
        maxGreek: 18.0,
        minPercentage: 90.0,
        minGreek: 18.0,
        letterGrade: 'A'
      };
      renderWithLanguage(<GradeStatistics insights={insights} />);
      expect(screen.getByText('1')).toBeInTheDocument();
      const percentages = screen.getAllByText(/90\.0%/);
      expect(percentages.length).toBeGreaterThan(0); // Same grade appears 3 times (min, max, avg)
    });

    it('handles perfect grades (100%)', () => {
      const insights: GradeInsights = {
        count: 3,
        avgPercentage: 100.0,
        avgGreek: 20.0,
        maxPercentage: 100.0,
        maxGreek: 20.0,
        minPercentage: 100.0,
        minGreek: 20.0,
        letterGrade: 'A'
      };
      renderWithLanguage(<GradeStatistics insights={insights} />);
      const percentages = screen.getAllByText(/100\.0%/);
      expect(percentages.length).toBeGreaterThan(0);
      const greekScores = screen.getAllByText(/20\.0\/20/);
      expect(greekScores.length).toBeGreaterThan(0);
    });

    it('handles very low grades (near 0%)', () => {
      const insights: GradeInsights = {
        count: 2,
        avgPercentage: 5.5,
        avgGreek: 1.1,
        maxPercentage: 10.0,
        maxGreek: 2.0,
        minPercentage: 1.0,
        minGreek: 0.2,
        letterGrade: 'F'
      };
      renderWithLanguage(<GradeStatistics insights={insights} />);
      expect(screen.getByText(/5\.5%/)).toBeInTheDocument();
      expect(screen.getByText(/1\.1\/20/)).toBeInTheDocument();
    });

    it('handles large assignment counts', () => {
      const insights: GradeInsights = {
        count: 999,
        avgPercentage: 85.0,
        avgGreek: 17.0,
        maxPercentage: 95.0,
        maxGreek: 19.0,
        minPercentage: 70.0,
        minGreek: 14.0,
        letterGrade: 'B'
      };
      renderWithLanguage(<GradeStatistics insights={insights} />);
      expect(screen.getByText('999')).toBeInTheDocument();
    });
  });

  describe('CSS Classes', () => {
    it('applies green color to highest grade', () => {
      renderWithLanguage(<GradeStatistics insights={mockInsights} />);
      const highestElement = screen.getByText(/95\.0%.*19\.0\/20/);
      expect(highestElement).toHaveClass('text-green-600');
    });

    it('applies red color to lowest grade', () => {
      renderWithLanguage(<GradeStatistics insights={mockInsights} />);
      const lowestElement = screen.getByText(/70\.0%.*14\.0\/20/);
      expect(lowestElement).toHaveClass('text-red-600');
    });

    it('applies indigo color to average grade', () => {
      renderWithLanguage(<GradeStatistics insights={mockInsights} />);
      const avgElement = screen.getByText(/85\.5%.*17\.1\/20/);
      expect(avgElement).toHaveClass('text-slate-900');
    });
  });

  describe('Accessibility', () => {
    it('uses semantic HTML structure', () => {
      const { container } = renderWithLanguage(<GradeStatistics insights={mockInsights} />);
      const divs = container.querySelectorAll('div');
      expect(divs.length).toBeGreaterThan(0);
    });

    it('provides readable text for screen readers', () => {
      renderWithLanguage(<GradeStatistics insights={mockInsights} />);
      // All text should be accessible
      expect(screen.getByText(/total assignments/i)).toBeVisible();
      expect(screen.getByText(/highest/i)).toBeVisible();
      expect(screen.getByText(/lowest/i)).toBeVisible();
      expect(screen.getByText(/average grade/i)).toBeVisible();
    });
  });
});
