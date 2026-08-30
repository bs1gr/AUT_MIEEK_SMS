import { useEffect } from 'react';
import { StudentProfile } from '@/features/students';
import { useParams, useNavigate } from 'react-router-dom';

export default function StudentProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    if (!id) {
      navigate('/students');
    }
  }, [id, navigate]);

  if (!id) {
    return null;
  }

  return (
    <StudentProfile
      studentId={parseInt(id, 10)}
      onBack={() => navigate('/students')}
    />
  );
}
