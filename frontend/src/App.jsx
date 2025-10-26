import React, { Suspense, lazy } from 'react';
import { LanguageProvider } from './LanguageContext';
import ErrorBoundary from './ErrorBoundary';

const StudentManagementApp = lazy(() => import('./StudentManagementApp'));


const App = () => (
  <LanguageProvider>
    <ErrorBoundary>
      <Suspense fallback={<div>Loading...</div>}>
        <StudentManagementApp />
      </Suspense>
    </ErrorBoundary>
  </LanguageProvider>
);


export default App;