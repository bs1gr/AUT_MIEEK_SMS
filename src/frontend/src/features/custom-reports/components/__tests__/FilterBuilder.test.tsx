import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import FilterBuilder from '../FilterBuilder';

// Plan todo 75 stage 5: a course is chosen by name (its number was typed by hand), a category is
// suggested, and a range or a list says how to type it.
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'en' } }),
}));

const courses = [
  { id: 7, label: 'MATH — Μαθηματικά' },
  { id: 9, label: 'PHYS — Φυσική' },
];

describe('FilterBuilder', () => {
  it('offers the courses for a course filter and adds the chosen one by its number', () => {
    const onChange = vi.fn();
    render(<FilterBuilder fields={['course_id', 'category']} filters={[]} onChange={onChange} courses={courses} />);

    const picker = screen.getByTestId('filter-value-new');
    expect(picker.tagName).toBe('SELECT');
    expect(within(picker).getAllByRole('option').map((o) => o.textContent)).toEqual([
      'filterPickCourse',
      'MATH — Μαθηματικά',
      'PHYS — Φυσική',
    ]);
    fireEvent.change(picker, { target: { value: '9' } });
    fireEvent.click(screen.getByRole('button', { name: /addFilter/ }));

    expect(onChange).toHaveBeenCalledWith([{ field: 'course_id', operator: 'equals', value: '9' }]);
  });

  it('suggests the categories and says how to type a range', () => {
    render(
      <FilterBuilder
        fields={['category']}
        filters={[{ field: 'category', operator: 'between', value: '' }]}
        onChange={vi.fn()}
        categories={['Final Exam', 'Τελική Εξέταση']}
      />
    );

    const existing = screen.getByTestId('filter-value-0');
    expect(existing.getAttribute('placeholder')).toBe('filterValueBetween');
    expect(existing.getAttribute('list')).toBe('report-filter-categories');
    const options = document.querySelectorAll('#report-filter-categories option');
    expect(Array.from(options).map((o) => o.getAttribute('value'))).toEqual(['Final Exam', 'Τελική Εξέταση']);
  });

  it('keeps a text box for a list of courses', () => {
    render(
      <FilterBuilder
        fields={['course_id']}
        filters={[{ field: 'course_id', operator: 'in', value: '7, 9' }]}
        onChange={vi.fn()}
        courses={courses}
      />
    );

    const box = screen.getByTestId('filter-value-0');
    expect(box.tagName).toBe('INPUT');
    expect(box.getAttribute('placeholder')).toBe('filterValueIn');
  });
});
