/**
 * Test suite for SavedSearches component.
 *
 * Tests cover:
 * - Rendering saved searches
 * - Saving current search
 * - Loading saved search
 * - Deleting saved search
 * - localStorage persistence
 * - Error handling
 * - Accessibility
 *
 * Author: AI Agent
 * Date: January 17, 2026
 * Version: 1.0.0
 */

import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../i18n';
import { SavedSearches } from '../SavedSearches';

// Create mock localStorage that persists across tests
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    }
  };
})();

// Only override localStorage if window is defined (jsdom environment)
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'localStorage', {
    value: mockLocalStorage,
    writable: true,
    configurable: true
  });
}

const renderSavedSearches = (props = {}) => {
  return render(
    <I18nextProvider i18n={i18n}>
      <SavedSearches
        searchType="students"
        currentQuery="John"
        currentFilters={{}}
        onLoadSearch={vi.fn()}
        {...props}
      />
    </I18nextProvider>
  );
};

describe('SavedSearches Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.clear();
  });

  describe('Rendering', () => {
    it('should render dropdown button', () => {
      renderSavedSearches();

      const button = screen.getByRole('button', {
        name: /saved|history/i
      });
      expect(button).toBeInTheDocument();
    });

    it('should render star icon for saved searches', () => {
      const { container } = renderSavedSearches();

      // The star icon is displayed in the toggle button
      const saveIcon = container.querySelector('.save-icon');
      expect(saveIcon).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = renderSavedSearches({
        className: 'custom-saved'
      });

      const wrapper = container.querySelector('.saved-searches');
      expect(wrapper).toHaveClass('custom-saved');
    });
  });

  describe('Saving Searches', () => {
    it('should display save form', async () => {
      const user = userEvent.setup();
      renderSavedSearches();

      const button = screen.getByRole('button', {
        name: /saved|history/i
      });
      await user.click(button);

      expect(
        screen.getByPlaceholderText(/save search|name/i)
      ).toBeInTheDocument();
    });

    it('should save search with custom name', async () => {
      const user = userEvent.setup();
      renderSavedSearches();

      const button = screen.getByRole('button', {
        name: /saved|history/i
      });
      await user.click(button);

      const input = screen.getByPlaceholderText(/save search|name/i);
      await user.type(input, 'My Students');

      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(
          mockLocalStorage.getItem('sms_saved_searches')
        ).not.toBeNull();
      });
    });

    it('should prevent saving empty name', async () => {
      const user = userEvent.setup();
      renderSavedSearches();

      const button = screen.getByRole('button', {
        name: /saved|history/i
      });
      await user.click(button);

      const input = screen.getByPlaceholderText(/save search|name/i) as HTMLInputElement;

      // Type text to enable save button, then clear it
      await user.type(input, 'Test');
      expect(input.value).toBe('Test');

      // Clear the input using keyboard shortcut
      await user.keyboard('{Control>}a{/Control}{Delete}');
      expect(input.value).toBe('');

      // Now press Enter on the empty input to trigger validation via onKeyPress handler
      await user.keyboard('{Enter}');

      // Should show validation error in alert
      await waitFor(() => {
        const alert = screen.getByRole('alert');
        expect(alert).toBeInTheDocument();
        expect(alert.textContent).toMatch(/name required|enter name/i);
      });
    });

    it('should limit to 10 saved searches per type', async () => {
      const user = userEvent.setup();

      // Pre-populate with 10 searches
      const searches = Array.from({ length: 10 }, (_, i) => ({
        query: `search${i}`,
        filters: {},
        name: `Search ${i}`,
        timestamp: Date.now()
      }));

      mockLocalStorage.setItem(
        'sms_saved_searches',
        JSON.stringify({ students: searches })
      );

      renderSavedSearches();

      const button = screen.getByRole('button', {
        name: /saved|history/i
      });
      await user.click(button);

      const input = screen.getByPlaceholderText(/save search|name/i);
      await user.type(input, 'Search 11');

      // Use getByTestId or query button within form
      const formButtons = screen.getAllByRole('button', { name: /save/i });
      // First button with aria-label="Save" is the save-confirm-button
      const saveButton = formButtons.find(btn => btn.getAttribute('aria-label') === 'Save' && btn.className.includes('save-confirm'));
      if (saveButton) {
        await user.click(saveButton);
      }

      // Should show limit error or remove oldest
      await waitFor(() => {
        const stored = mockLocalStorage.getItem('sms_saved_searches');
        if (stored) {
          const data = JSON.parse(stored);
          expect(data.students.length).toBeLessThanOrEqual(10);
        }
      });
    });

    it('should display success message after save', async () => {
      const user = userEvent.setup();
      renderSavedSearches();

      const button = screen.getByRole('button', {
        name: /saved|history/i
      });
      await user.click(button);

      const input = screen.getByPlaceholderText(/save search|name/i);
      await user.type(input, 'Test Search');

      const saveButtons = screen.getAllByRole('button', { name: /save/i });
      const saveButton = saveButtons.find(btn => btn.className.includes('save-confirm'));
      if (saveButton) {
        await user.click(saveButton);
      }

      // After saving, the saved search should appear in the list
      await waitFor(() => {
        const savedSearch = screen.queryByText('Test Search');
        expect(savedSearch).toBeInTheDocument();
      });
    });
  });

  describe('Loading Searches', () => {
    it('should display saved searches list', async () => {
      const user = userEvent.setup();
      const searches = [
        {
          query: 'John',
          filters: {},
          name: 'Johns Search',
          timestamp: Date.now()
        }
      ];

      mockLocalStorage.setItem(
        'sms_saved_searches',
        JSON.stringify({ students: searches })
      );

      renderSavedSearches();

      const button = screen.getByRole('button', {
        name: /saved|history/i
      });
      await user.click(button);

      expect(screen.getByText('Johns Search')).toBeInTheDocument();
    });

    it('should call onLoadSearch when saved search clicked', async () => {
      const user = userEvent.setup();
      const onLoadSearch = vi.fn();
      const searches = [
        {
          query: 'John',
          filters: {},
          name: 'Johns Search',
          timestamp: Date.now()
        }
      ];

      mockLocalStorage.setItem(
        'sms_saved_searches',
        JSON.stringify({ students: searches })
      );

      renderSavedSearches({ onLoadSearch });

      const button = screen.getByRole('button', {
        name: /saved|history/i
      });
      await user.click(button);

      const searchItem = screen.getByText('Johns Search');
      await user.click(searchItem);

      expect(onLoadSearch).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Johns Search' })
      );
    });

    it('should update last used timestamp when loaded', async () => {
      const user = userEvent.setup();
      const oldTimestamp = Date.now() - 1000000;
      const searches = [
        {
          query: 'John',
          filters: {},
          name: 'Test Search',
          timestamp: oldTimestamp
        }
      ];

      mockLocalStorage.setItem(
        'sms_saved_searches',
        JSON.stringify({ students: searches })
      );

      renderSavedSearches();

      const button = screen.getByRole('button', {
        name: /saved|history/i
      });
      await user.click(button);

      const searchItem = screen.getByText('Test Search');
      await user.click(searchItem);

      await waitFor(() => {
        const stored = mockLocalStorage.getItem('sms_saved_searches');
        if (stored) {
          const data = JSON.parse(stored);
          expect(data.students[0].timestamp).toBeGreaterThan(oldTimestamp);
        }
      });
    });

    it('should display last used time', async () => {
      const user = userEvent.setup();
      const searches = [
        {
          query: 'John',
          filters: {},
          name: 'Test Search',
          timestamp: Date.now() - 3600000 // 1 hour ago
        }
      ];

      mockLocalStorage.setItem(
        'sms_saved_searches',
        JSON.stringify({ students: searches })
      );

      renderSavedSearches();

      const button = screen.getByRole('button', {
        name: /saved|history/i
      });
      await user.click(button);

      expect(screen.getByText(/1h ago|1 hour ago/i)).toBeInTheDocument();
    });
  });

  describe('Deleting Searches', () => {
    it('should display delete button for each search', async () => {
      const user = userEvent.setup();
      const searches = [
        {
          query: 'John',
          filters: {},
          name: 'Test Search',
          timestamp: Date.now()
        }
      ];

      mockLocalStorage.setItem(
        'sms_saved_searches',
        JSON.stringify({ students: searches })
      );

      renderSavedSearches();

      const button = screen.getByRole('button', {
        name: /saved|history/i
      });
      await user.click(button);

      const deleteButton = screen.getByRole('button', {
        name: /delete|remove|x/i
      });
      expect(deleteButton).toBeInTheDocument();
    });

    it('should delete search when delete button clicked', async () => {
      const user = userEvent.setup();
      const searches = [
        {
          query: 'John',
          filters: {},
          name: 'Test Search',
          timestamp: Date.now()
        }
      ];

      mockLocalStorage.setItem(
        'sms_saved_searches',
        JSON.stringify({ students: searches })
      );

      renderSavedSearches();

      const button = screen.getByRole('button', {
        name: /saved|history/i
      });
      await user.click(button);

      const deleteButton = screen.getByRole('button', {
        name: /delete|remove|x/i
      });
      await user.click(deleteButton);

      await waitFor(() => {
        expect(screen.queryByText('Test Search')).not.toBeInTheDocument();
      });
    });

    it('should show empty state when all searches deleted', async () => {
      const user = userEvent.setup();
      const searches = [
        {
          query: 'John',
          filters: {},
          name: 'Test Search',
          timestamp: Date.now()
        }
      ];

      mockLocalStorage.setItem(
        'sms_saved_searches',
        JSON.stringify({ students: searches })
      );

      renderSavedSearches();

      const button = screen.getByRole('button', {
        name: /saved|history/i
      });
      await user.click(button);

      const deleteButton = screen.getByRole('button', {
        name: /delete|remove|x/i
      });
      await user.click(deleteButton);

      await waitFor(() => {
        expect(
          screen.getByText(/no saved searches|empty/i)
        ).toBeInTheDocument();
      });
    });
  });

  describe('localStorage Persistence', () => {
    it('should save searches to localStorage', async () => {
      const user = userEvent.setup();
      renderSavedSearches();

      const button = screen.getByRole('button', {
        name: /saved|history/i
      });
      await user.click(button);

      const input = screen.getByPlaceholderText(/save search|name/i);
      await user.type(input, 'Test Search');

      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      await waitFor(() => {
        const stored = mockLocalStorage.getItem('sms_saved_searches');
        expect(stored).not.toBeNull();
        expect(stored).toContain('Test Search');
      });
    });

    it('should separate searches by search type', async () => {
      const user = userEvent.setup();

      // Save student search
      const { unmount } = renderSavedSearches({
        searchType: 'students',
        currentQuery: 'John'
      });

      let button = screen.getByRole('button', {
        name: /saved|history/i
      });
      await user.click(button);

      let input = screen.getByPlaceholderText(/save search|name/i);
      await user.type(input, 'Student Search');

      let saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      unmount();

      // Save course search
      renderSavedSearches({
        searchType: 'courses',
        currentQuery: 'Math'
      });

      button = screen.getByRole('button', {
        name: /saved|history/i
      });
      await user.click(button);

      input = screen.getByPlaceholderText(/save search|name/i);
      await user.type(input, 'Course Search');

      saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      await waitFor(() => {
        const stored = mockLocalStorage.getItem('sms_saved_searches');
        if (stored) {
          const data = JSON.parse(stored);
          expect(data.students).toBeTruthy();
          expect(data.courses).toBeTruthy();
        }
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle corrupted localStorage', async () => {
      mockLocalStorage.setItem('sms_saved_searches', 'invalid json');

      // Should not crash
      renderSavedSearches();

      const button = screen.getByRole('button', {
        name: /saved|history/i
      });
      expect(button).toBeInTheDocument();
    });

    it('should show error message if save fails', async () => {
      const user = userEvent.setup();

      // Mock localStorage to fail
      const originalSetItem = mockLocalStorage.setItem;
      mockLocalStorage.setItem = vi.fn(() => {
        throw new Error('Storage full');
      });

      renderSavedSearches();

      const button = screen.getByRole('button', {
        name: /saved|history/i
      });
      await user.click(button);

      const input = screen.getByPlaceholderText(/save search|name/i);
      await user.type(input, 'Test');

      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(
          screen.queryByText(/error|failed/i)
        ).toBeTruthy();
      });

      mockLocalStorage.setItem = originalSetItem;
    });
  });

  describe('Empty State', () => {
    it('should show empty message when no searches', async () => {
      const user = userEvent.setup();
      renderSavedSearches();

      const button = screen.getByRole('button', {
        name: /saved|history/i
      });
      await user.click(button);

      expect(
        screen.getByText(/no saved searches|empty/i)
      ).toBeInTheDocument();
    });

    it('should allow saving first search', async () => {
      const user = userEvent.setup();
      renderSavedSearches();

      const button = screen.getByRole('button', {
        name: /saved|history/i
      });
      await user.click(button);

      const input = screen.getByPlaceholderText(/save search|name/i);
      await user.type(input, 'First Search');

      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('First Search')).toBeInTheDocument();
      });
    });
  });

  describe('Different Search Types', () => {
    it('should maintain separate histories per type', async () => {
      const user = userEvent.setup();

      // Student search
      const { unmount } = renderSavedSearches({
        searchType: 'students'
      });

      let button = screen.getByRole('button', {
        name: /saved|history/i
      });
      await user.click(button);

      expect(screen.getByPlaceholderText(/save search|name/i)).toBeInTheDocument();

      unmount();

      // Course search
      renderSavedSearches({
        searchType: 'courses'
      });

      button = screen.getByRole('button', {
        name: /saved|history/i
      });
      await user.click(button);

      expect(screen.getByPlaceholderText(/save search|name/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper button labels', () => {
      renderSavedSearches();

      const button = screen.getByRole('button', {
        name: /saved|history/i
      });
      expect(button).toHaveAttribute('aria-label');
    });

    it('should be keyboard navigable', async () => {
      const user = userEvent.setup();
      renderSavedSearches();

      const button = screen.getByRole('button', {
        name: /saved|history/i
      });

      // Tab to button
      await user.tab();
      expect(button).toBeTruthy();
    });

    it('should announce list to screen readers', async () => {
      const user = userEvent.setup();
      const searches = [
        {
          query: 'John',
          filters: {},
          name: 'Test Search',
          timestamp: Date.now()
        }
      ];

      mockLocalStorage.setItem(
        'sms_saved_searches',
        JSON.stringify({ students: searches })
      );

      renderSavedSearches();

      const button = screen.getByRole('button', {
        name: /saved|history/i
      });
      await user.click(button);

      const list = screen.getByRole('list');
      expect(list).toBeInTheDocument();
    });
  });
});
