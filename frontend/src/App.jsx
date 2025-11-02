import React, { Suspense, lazy } from 'react';
import { LanguageProvider } from './LanguageContext';
import { ThemeProvider } from './ThemeContext';
import ErrorBoundary from './ErrorBoundary';

const StudentManagementApp = lazy(() => import('./StudentManagementApp'));


const App = () => (
  <LanguageProvider>
    <ThemeProvider>
      <ErrorBoundary>
        <Suspense fallback={<div>Loading...</div>}>
          <StudentManagementApp />
        </Suspense>
      </ErrorBoundary>
    </ThemeProvider>
  </LanguageProvider>
);


export default App;
