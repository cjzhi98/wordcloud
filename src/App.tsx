import { HashRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import CreateSession from './pages/CreateSession';
import JoinSession from './pages/JoinSession';
import BigScreen from './pages/BigScreen';
import Dashboard from './pages/Dashboard';

function App() {

  return (
    <HashRouter>
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 dark:from-gray-900 dark:via-purple-900 dark:to-gray-900">

        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/create" element={<CreateSession />} />
          <Route path="/join/:sessionId/:slug?" element={<JoinSession />} />
          <Route path="/screen/:sessionId" element={<BigScreen />} />
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      </div>
    </HashRouter>
  );
}

export default App;
