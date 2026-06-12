import { OperationsView } from '@/features/operations';
import { SectionErrorBoundary } from '@/components/ErrorBoundaries';
import { useStudentsStore } from '@/stores';

export default function OperationsPage() {
  const students = useStudentsStore((state) => state.students);

  return (
    <SectionErrorBoundary section="OperationsPage">
      <div className="space-y-6">
        <OperationsView students={students} />
      </div>
    </SectionErrorBoundary>
  );
}
