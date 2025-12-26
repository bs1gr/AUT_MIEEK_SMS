import { OperationsView } from '@/features/operations';
import { SectionErrorBoundary } from '@/components/ErrorBoundaries';
import { useStudentsStore } from '@/stores';

export default function OperationsPage() {
  const students = useStudentsStore((state) => state.students);

  return (
    <SectionErrorBoundary section="OperationsPage">
      <OperationsView students={students} />
    </SectionErrorBoundary>
  );
}
