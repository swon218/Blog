'use client';

import { Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

export function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem('study-theme');
    const enabled = saved
      ? saved === 'dark'
      : window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.classList.toggle('dark', enabled);
    requestAnimationFrame(() => setDark(enabled));
  }, []);

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    window.localStorage.setItem('study-theme', next ? 'dark' : 'light');
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="icon-lg"
      onClick={toggleTheme}
      aria-label={dark ? '라이트 모드로 전환' : '다크 모드로 전환'}
      title={dark ? '라이트 모드' : '다크 모드'}
    >
      {dark ? <Sun /> : <Moon />}
    </Button>
  );
}
