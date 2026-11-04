import { useFonts } from 'expo-font';
import { Poppins_400Regular } from '@expo-google-fonts/poppins/400Regular';
import { Poppins_500Medium } from '@expo-google-fonts/poppins/500Medium';
import { Poppins_600SemiBold } from '@expo-google-fonts/poppins/600SemiBold';
import { Poppins_700Bold } from '@expo-google-fonts/poppins/700Bold';

export function useAppFonts(): { fontsLoaded: boolean; fontError: Error | null } {
  const [fontsLoaded, fontError] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
    Aktura_400Regular: require('../../assets/fonts/Aktura-Regular.otf'),
    Rajdhani_500Medium: require('../../assets/fonts/Rajdhani-Medium.ttf'),
    Rajdhani_600SemiBold: require('../../assets/fonts/Rajdhani-SemiBold.ttf'),
    Rajdhani_700Bold: require('../../assets/fonts/Rajdhani-Bold.ttf'),
  });

  return { fontsLoaded, fontError };
}
