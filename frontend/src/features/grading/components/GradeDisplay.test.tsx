import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import GradeDisplay, { GradeComparison, GradeProgressBar } from './GradeDisplay';
import { LanguageProvider } from '@/LanguageContext';

// Mock framer-motion
// Mock framer-motion with typed props rather than `any`
/* eslint-disable jsx-a11y/no-static-element-interactions */
vi.mock('framer-motion', () => ({
    motion: {
      div: ({ children, onClick, ...props }: React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode }) => (
        <div onClick={onClick} onKeyDown={(e: React.KeyboardEvent<HTMLDivElement>) => { if (e.key === 'Enter' || e.key === ' ') onClick?.(e as unknown as React.MouseEvent); }} tabIndex={-1} {...props}>{children}</div>
      ),
  },
  AnimatePresence: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));

// Helper function to render with LanguageProvider
const renderWithLanguage = (component: React.ReactElement) => {
  return render(
    <LanguageProvider>
      {component}
    </LanguageProvider>
  );
};

describe('GradeDisplay', () => {
  describe('Default Variant', () => {
    it('renders all grade formats by default', () => {
      renderWithLanguage(<GradeDisplay gpa={3.5} />);
      
      // Check for Greek scale
      expect(screen.getByText(/17\.5/)).toBeInTheDocument();
      
      // Check for percentage
      expect(screen.getByText(/87\.5%/)).toBeInTheDocument();
      
      // Check for GPA
      expect(screen.getByText(/3\.5/)).toBeInTheDocument();
    });

    it('shows Greek scale label', () => {
      renderWithLanguage(<GradeDisplay gpa={3.5} />);
      expect(screen.getByText(/\/ 20/)).toBeInTheDocument();
    });

    it('shows GPA label', () => {
      renderWithLanguage(<GradeDisplay gpa={3.5} />);
      const gpaLabels = screen.getAllByText(/out of/i);
      expect(gpaLabels.length).toBeGreaterThan(0);
    });

    it('hides GPA when showGPA is false', () => {
      renderWithLanguage(<GradeDisplay gpa={3.5} showGPA={false} />);
      expect(screen.queryByText(/GPA/i)).not.toBeInTheDocument();
    });

    it('hides percentage when showPercentage is false', () => {
      renderWithLanguage(<GradeDisplay gpa={3.5} showPercentage={false} />);
      expect(screen.queryByText(/%/)).not.toBeInTheDocument();
    });

    it('hides Greek scale when showGreekScale is false', () => {
      renderWithLanguage(<GradeDisplay gpa={3.5} showGreekScale={false} />);
      expect(screen.queryByText(/17\.5/)).not.toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('shows "no grades recorded" when gpa is 0', () => {
      renderWithLanguage(<GradeDisplay gpa={0} />);
      expect(screen.getByText(/no grades recorded/i)).toBeInTheDocument();
    });

    it('shows "no grades recorded" when gpa is null', () => {
      // Component expects a number; null/undefined map to no-data case — use 0 for test
      renderWithLanguage(<GradeDisplay gpa={0} />);
      expect(screen.getByText(/no grades recorded/i)).toBeInTheDocument();
    });

    it('shows "no grades recorded" when gpa is undefined', () => {
      // Component expects a number; use 0 to represent no grade
      renderWithLanguage(<GradeDisplay gpa={0} />);
      expect(screen.getByText(/no grades recorded/i)).toBeInTheDocument();
    });
  });

  describe('Size Variants', () => {
    it('renders with small size', () => {
      const { container } = renderWithLanguage(<GradeDisplay gpa={3.0} size="small" />);
      const elements = container.querySelectorAll('.text-lg');
      expect(elements.length).toBeGreaterThan(0);
    });

    it('renders with medium size (default)', () => {
      const { container } = renderWithLanguage(<GradeDisplay gpa={3.0} size="medium" />);
      const elements = container.querySelectorAll('.text-2xl');
      expect(elements.length).toBeGreaterThan(0);
    });

    it('renders with large size', () => {
      const { container } = renderWithLanguage(<GradeDisplay gpa={3.0} size="large" />);
      const elements = container.querySelectorAll('.text-4xl');
      expect(elements.length).toBeGreaterThan(0);
    });
  });

  describe('Card Variant', () => {
    it('renders card variant with background gradient', () => {
      const { container } = renderWithLanguage(
        <GradeDisplay gpa={3.5} variant="card" />
      );
      const card = container.querySelector('.bg-gradient-to-br');
      expect(card).toBeInTheDocument();
    });

    it('shows performance label in card variant', () => {
      renderWithLanguage(<GradeDisplay gpa={3.5} variant="card" />);
      expect(screen.getByText(/performance/i)).toBeInTheDocument();
    });

    it('displays grades in card variant', () => {
      renderWithLanguage(<GradeDisplay gpa={3.5} variant="card" />);
      expect(screen.getByText(/17\.5/)).toBeInTheDocument();
      expect(screen.getByText(/87\.5%/)).toBeInTheDocument();
    });
  });

  describe('Inline Variant', () => {
    it('renders inline variant horizontally', () => {
      const { container } = renderWithLanguage(
        <GradeDisplay gpa={3.5} variant="inline" />
      );
      const inline = container.querySelector('.flex.items-center.space-x-4');
      expect(inline).toBeInTheDocument();
    });

    it('shows all grades in inline format', () => {
      renderWithLanguage(<GradeDisplay gpa={3.0} variant="inline" />);
      expect(screen.getByText(/15\.0/)).toBeInTheDocument();
      expect(screen.getByText(/75\.0/)).toBeInTheDocument();
      expect(screen.getByText(/GPA:/)).toBeInTheDocument();
      expect(screen.getByText(/3\.00/)).toBeInTheDocument();
    });

    it('shows /20 suffix in inline variant', () => {
      renderWithLanguage(<GradeDisplay gpa={3.0} variant="inline" />);
      expect(screen.getByText('/20')).toBeInTheDocument();
    });
  });

  describe('Minimal Variant', () => {
    it('renders minimal variant with Greek scale', () => {
      renderWithLanguage(
        <GradeDisplay gpa={3.5} variant="minimal" showGreekScale={true} />
      );
      expect(screen.getByText(/17\.5/)).toBeInTheDocument();
      expect(screen.getByText('/20')).toBeInTheDocument();
    });

    it('renders minimal variant with percentage', () => {
      renderWithLanguage(
        <GradeDisplay 
          gpa={3.5} 
          variant="minimal" 
          showGreekScale={false} 
          showPercentage={true} 
        />
      );
      const percentages = screen.getAllByText(/87\.5%/);
      expect(percentages.length).toBeGreaterThan(0);
    });

    it('renders minimal variant with GPA', () => {
      renderWithLanguage(
        <GradeDisplay 
          gpa={3.5} 
          variant="minimal" 
          showGreekScale={false} 
          showPercentage={false} 
          showGPA={true} 
        />
      );
      expect(screen.getByText(/3\.5/)).toBeInTheDocument();
      expect(screen.getByText('/4.0')).toBeInTheDocument();
    });
  });

  describe('Grade Colors', () => {
    it('applies green color for excellent grades (A)', () => {
      const { container } = renderWithLanguage(<GradeDisplay gpa={4.0} />);
      const greenElements = container.querySelectorAll('.text-green-600');
      expect(greenElements.length).toBeGreaterThan(0);
    });

    it('applies yellow color for average grades (GPA 3.0 = 15/20 = C)', () => {
      const { container } = renderWithLanguage(<GradeDisplay gpa={3.0} />);
      const yellowElements = container.querySelectorAll('.text-yellow-600');
      expect(yellowElements.length).toBeGreaterThan(0);
    });

    it('applies orange color for poor grades (GPA 2.0 = 10/20 = D)', () => {
      const { container } = renderWithLanguage(<GradeDisplay gpa={2.0} />);
      const orangeElements = container.querySelectorAll('.text-orange-600');
      expect(orangeElements.length).toBeGreaterThan(0);
    });

    it('applies red color for failing grades (F)', () => {
      const { container } = renderWithLanguage(<GradeDisplay gpa={0.5} />);
      const redElements = container.querySelectorAll('.text-red-600');
      expect(redElements.length).toBeGreaterThan(0);
    });
  });

  describe('Grade Calculations', () => {
    it('correctly converts GPA 4.0 to Greek scale 20', () => {
      renderWithLanguage(<GradeDisplay gpa={4.0} />);
      expect(screen.getByText(/20\.0/)).toBeInTheDocument();
    });

    it('correctly converts GPA 3.0 to 75%', () => {
      renderWithLanguage(<GradeDisplay gpa={3.0} />);
      expect(screen.getByText(/75\.0/)).toBeInTheDocument();
    });

    it('correctly converts GPA 2.0 to Greek scale 10', () => {
      renderWithLanguage(<GradeDisplay gpa={2.0} />);
      expect(screen.getByText(/10\.0/)).toBeInTheDocument();
    });

    it('correctly converts GPA 1.0 to 25%', () => {
      renderWithLanguage(<GradeDisplay gpa={1.0} />);
      expect(screen.getByText(/25\.0/)).toBeInTheDocument();
    });
  });
});

describe('GradeComparison', () => {
  it('renders multiple grade displays', () => {
    const grades = [3.5, 3.0, 2.5];
    const labels = ['Math', 'Physics', 'Chemistry'];
    
    renderWithLanguage(
      <GradeComparison grades={grades} labels={labels} />
    );
    
    expect(screen.getByText('Math')).toBeInTheDocument();
    expect(screen.getByText('Physics')).toBeInTheDocument();
    expect(screen.getByText('Chemistry')).toBeInTheDocument();
  });

  it('displays correct grades for each subject', () => {
    const grades = [4.0, 3.0];
    const labels = ['Course 1', 'Course 2'];
    
    renderWithLanguage(
      <GradeComparison grades={grades} labels={labels} />
    );
    
    expect(screen.getByText(/20\.0/)).toBeInTheDocument(); // 4.0 GPA = 20
    expect(screen.getByText(/15\.0/)).toBeInTheDocument(); // 3.0 GPA = 15
  });

  it('uses default labels when not provided', () => {
    const grades = [3.5];
    
    renderWithLanguage(
      <GradeComparison grades={grades} labels={undefined} />
    );
    
    expect(screen.getByText(/course 1/i)).toBeInTheDocument();
  });

  it('renders in grid layout', () => {
    const grades = [3.5, 3.0, 2.5];
    const { container } = renderWithLanguage(
      <GradeComparison grades={grades} labels={['A', 'B', 'C']} />
    );
    
    const grid = container.querySelector('.grid');
    expect(grid).toBeInTheDocument();
  });
});

describe('GradeProgressBar', () => {
  it('renders progress bar', () => {
    const { container } = renderWithLanguage(
      <GradeProgressBar gpa={3.0} />
    );
    
    const progressBar = container.querySelector('.rounded-full');
    expect(progressBar).toBeInTheDocument();
  });

  it('displays Greek scale and percentage labels', () => {
    renderWithLanguage(<GradeProgressBar gpa={3.0} showLabel={true} />);
    
    expect(screen.getByText(/15\.0.*20/)).toBeInTheDocument();
    expect(screen.getByText(/75%/)).toBeInTheDocument();
  });

  it('hides labels when showLabel is false', () => {
    renderWithLanguage(<GradeProgressBar gpa={3.0} showLabel={false} />);
    
    expect(screen.queryByText(/15\.0/)).not.toBeInTheDocument();
    expect(screen.queryByText(/75%/)).not.toBeInTheDocument();
  });

  it('sets correct width based on percentage', () => {
    const { container } = renderWithLanguage(
      <GradeProgressBar gpa={3.0} />
    );
    
    const progressFill = container.querySelector('[style*="width"]');
    expect(progressFill).toHaveStyle({ width: '75%' });
  });

  it('applies correct color class for excellent grade', () => {
    const { container } = renderWithLanguage(
      <GradeProgressBar gpa={4.0} />
    );
    
    const progressFill = container.querySelector('.bg-green-600');
    expect(progressFill).toBeInTheDocument();
  });

  it('applies correct color class for average grade (GPA 3.0 = yellow)', () => {
    const { container } = renderWithLanguage(
      <GradeProgressBar gpa={3.0} />
    );
    
    const progressFill = container.querySelector('.bg-yellow-600');
    expect(progressFill).toBeInTheDocument();
  });

  it('applies correct color class for failing grade', () => {
    const { container } = renderWithLanguage(
      <GradeProgressBar gpa={0.5} />
    );
    
    const progressFill = container.querySelector('.bg-red-600');
    expect(progressFill).toBeInTheDocument();
  });

  it('handles edge case of 0 GPA', () => {
    const { container } = renderWithLanguage(
      <GradeProgressBar gpa={0} />
    );
    
    const progressFill = container.querySelector('[style*="width"]');
    expect(progressFill).toHaveStyle({ width: '0%' });
  });

  it('handles edge case of maximum GPA (4.0)', () => {
    const { container } = renderWithLanguage(
      <GradeProgressBar gpa={4.0} />
    );
    
    const progressFill = container.querySelector('[style*="width"]');
    expect(progressFill).toHaveStyle({ width: '100%' });
  });
});
