import { OperationsView } from '@/features/operations';
import { useStudentsStore } from '@/stores';

export default function OperationsPage() {
  const students = useStudentsStore((state) => state.students);

  return <OperationsView students={students} />;
}
