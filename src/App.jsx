import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Onboarding } from './onboarding/Onboarding';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/onboarding" element={<Onboarding />} />
        {/* ... other routes ... */}
      </Routes>
    </BrowserRouter>
  );
} 