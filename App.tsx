import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { GameScreen } from './src/components/GameScreen';

export default function App() {
  return (
    <SafeAreaProvider>
      <GameScreen />
      <StatusBar style="dark" />
    </SafeAreaProvider>
  );
}
