/** Human labels for native answer values; wire values remain unchanged. */
import type { Translate } from './locales.ts'

export const recommendationSuffix = /\s*\((?:Recommended|推荐)\)$/i

/** Localize boolean options and remove the recommendation marker from the option label. */
export function questionLabel(value: string, t: Translate): string {
  return value === '是 / Yes' ? t('yes') : value === '否 / No' ? t('no') : value.replace(recommendationSuffix, '')
}
