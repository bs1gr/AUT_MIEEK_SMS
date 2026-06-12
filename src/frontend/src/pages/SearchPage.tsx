import { SectionErrorBoundary } from '@/components/ErrorBoundaries';
import SearchView from '@/features/search/SearchView';

export default function SearchPage() {
  return (
    <SectionErrorBoundary section="SearchPage">
      <SearchView />
    </SectionErrorBoundary>
  );
}
