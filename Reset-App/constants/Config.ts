import { Platform } from 'react-native';

// O link oficial que aparece no teu log do Render
const PUBLIC_URL = 'https://reset-app-7vn7.onrender.com';

export const BASE_URL = Platform.OS === 'web'
  ? 'http://localhost:3000'
  : PUBLIC_URL;