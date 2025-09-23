import fs from 'fs'
import path from 'path'

// African Languages Support
export const SUPPORTED_LANGUAGES = {
  // East Africa (Ethiopia focus)
  am: 'አማርኛ (Amharic)',
  om: 'Afaan Oromoo (Oromo)',
  ti: 'ትግርኛ (Tigrinya)',
  so: 'Soomaali (Somali)',
  
  // West Africa
  ha: 'Hausa (Hausa)',
  yo: 'Yorùbá (Yoruba)',
  ig: 'Igbo (Igbo)',
  ff: 'Fulfulde (Fula)',
  
  // Southern Africa
  sw: 'Kiswahili (Swahili)',
  zu: 'isiZulu (Zulu)',
  xh: 'isiXhosa (Xhosa)',
  st: 'Sesotho (Sotho)',
  
  // North Africa
  ar: 'العربية (Arabic)',
  fr: 'Français (French)',
  en: 'English (English)',
  pt: 'Português (Portuguese)'
}

// RTL (Right-to-Left) languages
export const RTL_LANGUAGES = new Set(['ar', 'he', 'fa', 'ur'])

// Ethiopian specific language mappings
export const ETHIOPIAN_LANGUAGES = {
  am: 'Amharic',
  om: 'Oromo',
  ti: 'Tigrinya', 
  so: 'Somali',
  sid: 'Sidamo',
  wal: 'Wolaytta',
  har: 'Hadiyya'
}

export const DEFAULT_LANGUAGE = 'en'

const loadTranslations = () => {
  const translations = {}
  const langDir = path.join(process.cwd(), 'src', 'locales')
  
  Object.keys(SUPPORTED_LANGUAGES).forEach(lang => {
    try {
      const filePath = path.join(langDir, `${lang}.json`)
      if (fs.existsSync(filePath)) {
        translations[lang] = JSON.parse(fs.readFileSync(filePath, 'utf8'))
      }
    } catch (error) {
      console.error(`Error loading ${lang} translations:`, error)
    }
  })
  
  return translations
}

const translations = loadTranslations()

export const t = (key, lang = DEFAULT_LANGUAGE, variables = {}) => {
  let translation = translations[lang]?.[key] || 
                   translations[DEFAULT_LANGUAGE]?.[key] || 
                   key

  // Replace variables
  if (variables && typeof variables === 'object') {
    Object.keys(variables).forEach(variable => {
      translation = translation.replace(`{{${variable}}}`, variables[variable])
    })
  }

  return translation
}

export const isRTL = (lang) => RTL_LANGUAGES.has(lang)

export const getLanguageDirection = (lang) => isRTL(lang) ? 'rtl' : 'ltr'

export const getUserLanguage = (req) => {
  return req.query.lang || 
         req.headers['accept-language']?.split(',')[0]?.split('-')[0] || 
         req.user?.language || 
         DEFAULT_LANGUAGE
}

export const validateLanguage = (lang) => {
  return SUPPORTED_LANGUAGES[lang] ? lang : DEFAULT_LANGUAGE
}