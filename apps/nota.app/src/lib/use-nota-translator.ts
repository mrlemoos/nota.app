import { useMemo } from 'react';
import {
  createTranslator,
  type SupportedLocale,
} from '@nota.app/i18n';
import { useNotaPreferencesStore } from '@/stores/nota-preferences';

export function useNotaTranslator(): {
  locale: SupportedLocale;
  t: ReturnType<typeof createTranslator>['t'];
} {
  const preference = useNotaPreferencesStore((s) => s.locale);
  return useMemo(() => {
    const { locale, t } = createTranslator(preference);
    return { locale, t };
  }, [preference]);
}
