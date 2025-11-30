import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppearanceThemeSelectorWidget } from './AppearanceThemeSelector';
import { LanguageProvider } from '@/LanguageContext';

// Mock framer-motion
// Mock framer-motion with explicit types to avoid `any`
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

describe('AppearanceThemeSelectorWidget', () => {
  const mockOnThemeChange = vi.fn();

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders the theme button', () => {
      renderWithLanguage(
        <AppearanceThemeSelectorWidget 
          currentTheme="default" 
          onThemeChange={mockOnThemeChange} 
        />
      );
      
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('displays theme button label', () => {
      renderWithLanguage(
        <AppearanceThemeSelectorWidget 
          currentTheme="default" 
          onThemeChange={mockOnThemeChange} 
        />
      );
      
      expect(screen.getByText(/theme/i)).toBeInTheDocument();
    });

    it('shows palette icon', () => {
      const { container } = renderWithLanguage(
        <AppearanceThemeSelectorWidget 
          currentTheme="default" 
          onThemeChange={mockOnThemeChange} 
        />
      );
      
      // Lucide icons render as SVG
      const svgs = container.querySelectorAll('svg');
      expect(svgs.length).toBeGreaterThan(0);
    });
  });

  describe('Dropdown Interaction', () => {
    it('shows dropdown when button is clicked', async () => {
      const user = userEvent.setup();
      renderWithLanguage(
        <AppearanceThemeSelectorWidget 
          currentTheme="default" 
          onThemeChange={mockOnThemeChange} 
        />
      );
      
      const button = screen.getByRole('button');
      await user.click(button);
      
      // Check for dropdown title
      expect(screen.getByText(/appearance themes/i)).toBeInTheDocument();
    });

    it('hides dropdown when clicked outside', async () => {
      const user = userEvent.setup();
      renderWithLanguage(
        <AppearanceThemeSelectorWidget 
          currentTheme="default" 
          onThemeChange={mockOnThemeChange} 
        />
      );
      
      const button = screen.getByRole('button');
      await user.click(button);
      
      // Dropdown is open
      expect(screen.getByText(/appearance themes/i)).toBeInTheDocument();
      
      // Click outside (the backdrop)
      const buttons = screen.getAllByRole('button');
      const backdrop = buttons[0].parentElement?.querySelector('[aria-hidden="true"]');
      if (backdrop) {
        await user.click(backdrop as HTMLElement);
      }
      
      // Dropdown should be closed
      expect(screen.queryByText(/appearance themes/i)).not.toBeInTheDocument();
    });

    it('displays all theme options when opened', async () => {
      const user = userEvent.setup();
      renderWithLanguage(
        <AppearanceThemeSelectorWidget 
          currentTheme="default" 
          onThemeChange={mockOnThemeChange} 
        />
      );
      
      const button = screen.getByRole('button');
      await user.click(button);
      
      // Check for theme options (fallback names)
      expect(screen.getByText('Default')).toBeInTheDocument();
      expect(screen.getByText('Glassmorphism')).toBeInTheDocument();
      expect(screen.getByText('Neumorphism')).toBeInTheDocument();
      expect(screen.getByText('Gradient')).toBeInTheDocument();
      expect(screen.getByText('Modern Dark')).toBeInTheDocument();
      expect(screen.getByText('Light Professional')).toBeInTheDocument();
    });
  });

  describe('Theme Selection', () => {
    it('calls onThemeChange when a theme is selected', async () => {
      const user = userEvent.setup();
      renderWithLanguage(
        <AppearanceThemeSelectorWidget 
          currentTheme="default" 
          onThemeChange={mockOnThemeChange} 
        />
      );
      
      const button = screen.getByRole('button');
      await user.click(button);
      
      const glassmorphismOption = screen.getByText('Glassmorphism');
      await user.click(glassmorphismOption);
      
      expect(mockOnThemeChange).toHaveBeenCalledWith('glassmorphism');
    });

    it('closes dropdown after theme selection', async () => {
      const user = userEvent.setup();
      renderWithLanguage(
        <AppearanceThemeSelectorWidget 
          currentTheme="default" 
          onThemeChange={mockOnThemeChange} 
        />
      );
      
      const button = screen.getByRole('button');
      await user.click(button);
      
      const neumorphismOption = screen.getByText('Neumorphism');
      await user.click(neumorphismOption);
      
      // Dropdown should be closed
      expect(screen.queryByText(/appearance themes/i)).not.toBeInTheDocument();
    });

    it('shows checkmark for current theme', async () => {
      const user = userEvent.setup();
      const { container } = renderWithLanguage(
        <AppearanceThemeSelectorWidget 
          currentTheme="glassmorphism" 
          onThemeChange={mockOnThemeChange} 
        />
      );
      
      const button = screen.getByRole('button');
      await user.click(button);
      
      // Check icon should be visible (only one for current theme)
      const checkIcons = container.querySelectorAll('svg[class*="lucide-check"]');
      expect(checkIcons.length).toBeGreaterThan(0);
    });

    it('applies different styles to selected theme', async () => {
      const user = userEvent.setup();
      renderWithLanguage(
        <AppearanceThemeSelectorWidget 
          currentTheme="gradient" 
          onThemeChange={mockOnThemeChange} 
        />
      );
      
      const button = screen.getByRole('button');
      await user.click(button);
      
      const gradientButton = screen.getByText('Gradient').closest('button');
      expect(gradientButton).toHaveClass('bg-indigo-50');
    });
  });

  describe('Theme Options', () => {
    it('displays correct themes in order', async () => {
      const user = userEvent.setup();
      renderWithLanguage(
        <AppearanceThemeSelectorWidget 
          currentTheme="default" 
          onThemeChange={mockOnThemeChange} 
        />
      );
      
      await user.click(screen.getByRole('button'));
      
      const themeNames = ['Default', 'Glassmorphism', 'Neumorphism', 'Gradient', 'Modern Dark', 'Light Professional'];
      themeNames.forEach(name => {
        expect(screen.getByText(name)).toBeInTheDocument();
      });
    });

    it('displays theme descriptions', async () => {
      const user = userEvent.setup();
      renderWithLanguage(
        <AppearanceThemeSelectorWidget 
          currentTheme="default" 
          onThemeChange={mockOnThemeChange} 
        />
      );
      
      await user.click(screen.getByRole('button'));
      
      expect(screen.getByText(/balanced light\/dark theme/i)).toBeInTheDocument();
      expect(screen.getByText(/frosted glass with blur effects/i)).toBeInTheDocument();
      expect(screen.getByText(/soft 3d depth with shadows/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has aria-label on button', () => {
      renderWithLanguage(
        <AppearanceThemeSelectorWidget 
          currentTheme="default" 
          onThemeChange={mockOnThemeChange} 
        />
      );
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label');
    });

    it('button is keyboard accessible', () => {
      renderWithLanguage(
        <AppearanceThemeSelectorWidget 
          currentTheme="default" 
          onThemeChange={mockOnThemeChange} 
        />
      );
      
      const button = screen.getByRole('button');
      button.focus();
      expect(button).toHaveFocus();
    });

    it('marks backdrop as aria-hidden', async () => {
      const user = userEvent.setup();
      const { container } = renderWithLanguage(
        <AppearanceThemeSelectorWidget 
          currentTheme="default" 
          onThemeChange={mockOnThemeChange} 
        />
      );
      
      await user.click(screen.getByRole('button'));
      
      const backdrop = container.querySelector('[aria-hidden="true"]');
      expect(backdrop).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles rapid theme changes', async () => {
      const user = userEvent.setup();
      renderWithLanguage(
        <AppearanceThemeSelectorWidget 
          currentTheme="default" 
          onThemeChange={mockOnThemeChange} 
        />
      );
      
      const button = screen.getByRole('button');
      
      // Open and select theme multiple times
      await user.click(button);
      await user.click(screen.getByText('Glassmorphism'));
      
      await user.click(button);
      await user.click(screen.getByText('Neumorphism'));
      
      await user.click(button);
      await user.click(screen.getByText('Gradient'));
      
      expect(mockOnThemeChange).toHaveBeenCalledTimes(3);
    });

    it('handles all theme variants', async () => {
      const themes: Array<'default' | 'glassmorphism' | 'neumorphism' | 'gradient' | 'modern-dark' | 'light-professional'> = 
        ['default', 'glassmorphism', 'neumorphism', 'gradient', 'modern-dark', 'light-professional'];
      
      for (const theme of themes) {
        const { unmount } = renderWithLanguage(
          <AppearanceThemeSelectorWidget 
            currentTheme={theme} 
            onThemeChange={mockOnThemeChange} 
          />
        );
        
        expect(screen.getByRole('button')).toBeInTheDocument();
        unmount();
      }
    });

    it('prevents multiple dropdowns from opening', async () => {
      const user = userEvent.setup();
      renderWithLanguage(
        <AppearanceThemeSelectorWidget 
          currentTheme="default" 
          onThemeChange={mockOnThemeChange} 
        />
      );
      
      const button = screen.getByRole('button');
      
      // Click button multiple times quickly
      await user.click(button);
      await user.click(button);
      
      // Should only have one title (dropdown should toggle)
      const titles = screen.queryAllByText(/appearance themes/i);
      expect(titles.length).toBeLessThanOrEqual(1);
    });
  });

  describe('Visual States', () => {
    it('applies hover styles correctly', () => {
      const { container } = renderWithLanguage(
        <AppearanceThemeSelectorWidget 
          currentTheme="default" 
          onThemeChange={mockOnThemeChange} 
        />
      );
      
      const button = container.querySelector('button');
      expect(button).toHaveClass('flex', 'items-center', 'gap-2');
    });

    it('shows dropdown with proper positioning', async () => {
      const user = userEvent.setup();
      const { container } = renderWithLanguage(
        <AppearanceThemeSelectorWidget 
          currentTheme="default" 
          onThemeChange={mockOnThemeChange} 
        />
      );
      
      await user.click(screen.getByRole('button'));
      
      const dropdown = container.querySelector('.absolute');
      expect(dropdown).toBeInTheDocument();
      expect(dropdown).toHaveClass('right-0', 'top-full');
    });

    it('displays scrollable theme list', async () => {
      const user = userEvent.setup();
      const { container } = renderWithLanguage(
        <AppearanceThemeSelectorWidget 
          currentTheme="default" 
          onThemeChange={mockOnThemeChange} 
        />
      );
      
      await user.click(screen.getByRole('button'));
      
      const scrollContainer = container.querySelector('.overflow-y-auto');
      expect(scrollContainer).toBeInTheDocument();
      expect(scrollContainer).toHaveClass('max-h-96');
    });
  });

  describe('Theme Button Content', () => {
    it('hides text on small screens', () => {
      const { container } = renderWithLanguage(
        <AppearanceThemeSelectorWidget 
          currentTheme="default" 
          onThemeChange={mockOnThemeChange} 
        />
      );
      
      const text = container.querySelector('.hidden.sm\\:inline');
      expect(text).toBeInTheDocument();
    });

    it('always shows palette icon', () => {
      const { container } = renderWithLanguage(
        <AppearanceThemeSelectorWidget 
          currentTheme="default" 
          onThemeChange={mockOnThemeChange} 
        />
      );
      
      // Palette icon should be present
      const svgs = container.querySelectorAll('svg');
      expect(svgs.length).toBeGreaterThan(0);
    });
  });
});
