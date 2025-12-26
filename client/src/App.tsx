import { Toaster } from 'react-hot-toast';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Collection from './pages/Collection';
import Login from './pages/Login';
import Register from './pages/Register';
import { AuthProvider } from './context/AuthContext';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: 'rgba(20, 20, 30, 0.8)',
              backdropFilter: 'blur(10px)',
              color: '#fff',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            },
            success: {
              iconTheme: {
                primary: '#22d3ee',
                secondary: '#fff',
              },
            },
          }}
        />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/collections/:id" element={<Collection />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
