import { Provider } from 'react-redux';
import store from './store';
import { useAppSelector } from './store/hooks';
import SettingsScreen from './screens/SettingsScreen';
import PracticeScreen from './screens/PracticeScreen';
import SummaryScreen from './screens/SummaryScreen';
import './App.css';

function AppContent() {
  const currentScreen = useAppSelector((state) => state.session.currentScreen);

  return (
    <div className="app" dir="rtl">
      {currentScreen === 'settings' && <SettingsScreen />}
      {currentScreen === 'practice' && <PracticeScreen />}
      {currentScreen === 'summary' && <SummaryScreen />}
    </div>
  );
}

function App() {
  return (
    <Provider store={store}>
      <AppContent />
    </Provider>
  );
}

export default App;
