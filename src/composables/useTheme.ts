import { ref, computed, watchEffect } from 'vue'

export type ThemePreference = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'theme-preference'

const preference = ref<ThemePreference>(readPreference())
const systemDark = ref(window.matchMedia('(prefers-color-scheme: dark)').matches)

const mql = window.matchMedia('(prefers-color-scheme: dark)')
function onSystemChange(e: MediaQueryListEvent) {
  systemDark.value = e.matches
}
mql.addEventListener('change', onSystemChange)

const resolvedTheme = computed<'light' | 'dark'>(() => {
  if (preference.value === 'system') return systemDark.value ? 'dark' : 'light'
  return preference.value
})

const isDark = computed(() => resolvedTheme.value === 'dark')

watchEffect(() => {
  document.documentElement.classList.toggle('light', resolvedTheme.value === 'light')
})

function readPreference(): ThemePreference {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored === 'light' || stored === 'dark' || stored === 'system') return stored
  return 'system'
}

function setTheme(pref: ThemePreference) {
  preference.value = pref
  localStorage.setItem(STORAGE_KEY, pref)
}

export function useTheme() {
  return { preference, resolvedTheme, isDark, setTheme }
}
