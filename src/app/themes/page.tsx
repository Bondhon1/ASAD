import { redirect } from 'next/navigation';

export default function ThemesIndex() {
  // Navy theme was chosen as the final theme
  redirect('/themes/navy');
}
