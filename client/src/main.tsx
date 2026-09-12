import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthProvider } from './store/auth';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <AuthProvider>
    <App />
  </AuthProvider>
);
