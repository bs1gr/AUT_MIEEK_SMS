import { StudentProfile } from '@/features/students';
import { useParams, useNavigate } from 'react-router-dom';

interface StudentProfileParams {
  id: string;
}

export default function StudentProfilePage() {
  const { id } = useParams<StudentProfileParams>();
  const navigate = useNavigate();

  if (!id) {
    navigate('/students');
    return null;
  }

  return (
    <StudentProfile
      studentId={parseInt(id, 10)}
      onBack={() => navigate('/students')}
    />
  );
}
