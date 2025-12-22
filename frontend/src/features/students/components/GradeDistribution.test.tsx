import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import GradeDistribution, { GradeDistributionData } from './GradeDistribution';
import { LanguageProvider } from '@/LanguageContext';

// Helper function to render with LanguageProvider
const renderWithLanguage = (component: React.ReactElement) => {
  return render(
    <LanguageProvider>
      {component}
    </LanguageProvider>
  );
};

describe('GradeDistribution', () => {
  const mockData: GradeDistributionData = {
    distribution: {
      A: 5,
      B: 8,
      C: 4,
      D: 2,
      F: 1
    },
    total: 20
  };

  describe('Rendering', () => {
    it('renders the component with title', () => {
      renderWithLanguage(<GradeDistribution data={mockData} />);
      expect(screen.getByText(/grade distribution/i)).toBeInTheDocument();
    });

    it('displays all grade categories', () => {
      renderWithLanguage(<GradeDistribution data={mockData} />);
      const grades = screen.getAllByText(/grade/i);
      expect(grades.length).toBeGreaterThanOrEqual(5); // At least 5 grade labels
    });

    it('displays count for each grade', () => {
      renderWithLanguage(<GradeDistribution data={mockData} />);
      expect(screen.getByText(/5.*assignments/i)).toBeInTheDocument();
      expect(screen.getByText(/8.*assignments/i)).toBeInTheDocument();
      expect(screen.getByText(/4.*assignments/i)).toBeInTheDocument();
      expect(screen.getByText(/2.*assignments/i)).toBeInTheDocument();
      expect(screen.getByText(/1.*assignments/i)).toBeInTheDocument();
    });

    it('displays percentage for each grade', () => {
      renderWithLanguage(<GradeDistribution data={mockData} />);
      expect(screen.getByText(/5.*assignments.*25%/)).toBeInTheDocument(); // A: 5/20 = 25%
      expect(screen.getByText(/8.*assignments.*40%/)).toBeInTheDocument(); // B: 8/20 = 40%
      expect(screen.getByText(/4.*assignments.*20%/)).toBeInTheDocument(); // C: 4/20 = 20%
      expect(screen.getByText(/2.*assignments.*10%/)).toBeInTheDocument(); // D: 2/20 = 10%
      expect(screen.getByText(/1.*assignments.*5%/)).toBeInTheDocument();  // F: 1/20 = 5%
    });

    it('renders progress bars for each grade', () => {
      renderWithLanguage(<GradeDistribution data={mockData} />);
      const progressBars = screen.getAllByRole('presentation');
      expect(progressBars).toHaveLength(5); // One track per grade
    });
  });

  describe('Progress Bar Values', () => {
    it('sets correct percentage values on progress elements', () => {
      const { container } = renderWithLanguage(<GradeDistribution data={mockData} />);
      const progressElements = container.querySelectorAll('progress');

      expect(progressElements).toHaveLength(5);
      expect(progressElements[0]).toHaveAttribute('value', '25'); // A: 25%
      expect(progressElements[1]).toHaveAttribute('value', '40'); // B: 40%
      expect(progressElements[2]).toHaveAttribute('value', '20'); // C: 20%
      expect(progressElements[3]).toHaveAttribute('value', '10'); // D: 10%
      expect(progressElements[4]).toHaveAttribute('value', '5');  // F: 5%
    });

    it('sets max attribute to 100 for all progress bars', () => {
      const { container } = renderWithLanguage(<GradeDistribution data={mockData} />);
      const progressElements = container.querySelectorAll('progress');

      progressElements.forEach(progress => {
        expect(progress).toHaveAttribute('max', '100');
      });
    });
  });

  describe('CSS Classes', () => {
    it('applies correct color class to A grade progress bar', () => {
      const { container } = renderWithLanguage(<GradeDistribution data={mockData} />);
      const progressElements = container.querySelectorAll('progress');
      expect(progressElements[0]).toHaveClass('grade-progress--a');
    });

    it('applies correct color class to B grade progress bar', () => {
      const { container } = renderWithLanguage(<GradeDistribution data={mockData} />);
      const progressElements = container.querySelectorAll('progress');
      expect(progressElements[1]).toHaveClass('grade-progress--b');
    });

    it('applies correct color class to C grade progress bar', () => {
      const { container } = renderWithLanguage(<GradeDistribution data={mockData} />);
      const progressElements = container.querySelectorAll('progress');
      expect(progressElements[2]).toHaveClass('grade-progress--c');
    });

    it('applies correct color class to D grade progress bar', () => {
      const { container } = renderWithLanguage(<GradeDistribution data={mockData} />);
      const progressElements = container.querySelectorAll('progress');
      expect(progressElements[3]).toHaveClass('grade-progress--d');
    });

    it('applies correct color class to F grade progress bar', () => {
      const { container } = renderWithLanguage(<GradeDistribution data={mockData} />);
      const progressElements = container.querySelectorAll('progress');
      expect(progressElements[4]).toHaveClass('grade-progress--f');
    });
  });

  describe('Empty State', () => {
    it('renders nothing when total is 0', () => {
      const emptyData: GradeDistributionData = {
        distribution: { A: 0, B: 0, C: 0, D: 0, F: 0 },
        total: 0
      };
      const { container } = renderWithLanguage(<GradeDistribution data={emptyData} />);
      expect(container.firstChild).toBeNull();
    });

    it('does not render when total is undefined', () => {
      const emptyData = {
        distribution: { A: 0, B: 0, C: 0, D: 0, F: 0 },
        total: 0
      } as GradeDistributionData;
      const { container } = renderWithLanguage(<GradeDistribution data={emptyData} />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe('Edge Cases', () => {
    it('handles all grades in one category (100% A)', () => {
      const allAData: GradeDistributionData = {
        distribution: { A: 10, B: 0, C: 0, D: 0, F: 0 },
        total: 10
      };
      renderWithLanguage(<GradeDistribution data={allAData} />);
      expect(screen.getByText(/10.*assignments.*100%/)).toBeInTheDocument();
      const zeroPercents = screen.getAllByText(/0.*assignments/);
      expect(zeroPercents.length).toBeGreaterThan(0); // B, C, D, F all at 0%
    });

    it('handles single assignment', () => {
      const singleData: GradeDistributionData = {
        distribution: { A: 1, B: 0, C: 0, D: 0, F: 0 },
        total: 1
      };
      renderWithLanguage(<GradeDistribution data={singleData} />);
      expect(screen.getByText(/1.*assignments.*100%/i)).toBeInTheDocument();
    });

    it('handles large numbers', () => {
      const largeData: GradeDistributionData = {
        distribution: { A: 150, B: 200, C: 100, D: 50, F: 0 },
        total: 500
      };
      renderWithLanguage(<GradeDistribution data={largeData} />);
      expect(screen.getByText(/150.*assignments.*30%/i)).toBeInTheDocument();
      expect(screen.getByText(/200.*assignments.*40%/i)).toBeInTheDocument();
    });

    it('rounds percentages to nearest integer', () => {
      const unevenData: GradeDistributionData = {
        distribution: { A: 1, B: 2, C: 3, D: 1, F: 0 },
        total: 7
      };
      renderWithLanguage(<GradeDistribution data={unevenData} />);
      // 1/7 = 14.28% -> 14%
      // 2/7 = 28.57% -> 29%
      // 3/7 = 42.86% -> 43%
      const fourteenPercents = screen.getAllByText(/14%\)/);
      expect(fourteenPercents.length).toBeGreaterThan(0); // A and D both 14%
      expect(screen.getByText(/29%\)/)).toBeInTheDocument();
      expect(screen.getByText(/43%\)/)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('provides aria-label for each progress bar', () => {
      const { container } = renderWithLanguage(<GradeDistribution data={mockData} />);
      const progressElements = container.querySelectorAll('progress');

      progressElements.forEach((progress) => {
        const ariaLabel = progress.getAttribute('aria-label');
        expect(ariaLabel).toBeTruthy();
        expect(ariaLabel).toMatch(/grade [A-F]/i);
      });
    });

    it('uses role="presentation" for progress bar containers', () => {
      renderWithLanguage(<GradeDistribution data={mockData} />);
      const containers = screen.getAllByRole('presentation');
      expect(containers).toHaveLength(5);
    });

    it('provides readable text for grade counts', () => {
      renderWithLanguage(<GradeDistribution data={mockData} />);
      // All counts should be visible and readable
      expect(screen.getByText(/5.*assignments/i)).toBeVisible();
      expect(screen.getByText(/8.*assignments/i)).toBeVisible();
    });
  });

  describe('Percentage Calculation', () => {
    it('calculates percentages correctly for uneven distribution', () => {
      const unevenData: GradeDistributionData = {
        distribution: { A: 3, B: 7, C: 5, D: 4, F: 1 },
        total: 20
      };
      renderWithLanguage(<GradeDistribution data={unevenData} />);

      expect(screen.getByText(/3.*assignments.*15%/)).toBeInTheDocument(); // A: 3/20 = 15%
      expect(screen.getByText(/7.*assignments.*35%/)).toBeInTheDocument(); // B: 7/20 = 35%
      expect(screen.getByText(/5.*assignments.*25%/)).toBeInTheDocument(); // C: 5/20 = 25%
      expect(screen.getByText(/4.*assignments.*20%/)).toBeInTheDocument(); // D: 4/20 = 20%
      expect(screen.getByText(/1.*assignments.*5%/)).toBeInTheDocument();  // F: 1/20 = 5%
    });
  });
});
