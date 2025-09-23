import twilio from 'twilio'
import {TWILIO_AUTH_TOKEN, TWILIO_ACCOUNT_SID, TWILIO_PHONE_NUMBER} from '../config/env.js'
const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)

export const sendSMS = async (to, message, language = 'en') => {
  try {
    // Handle different character encodings for African languages
    const encodedMessage = encodeAfricanText(message, language)
    
    const result = await client.messages.create({
      body: encodedMessage,
      from: TWILIO_PHONE_NUMBER,
      to: to,
      ...(language !== 'en' && { provideFeedback: true }) // Better delivery reports for non-English
    })
    
    return { success: true, sid: result.sid }
  } catch (error) {
    console.error('Twilio SMS error:', error)
    return { success: false, error: error.message }
  }
}

export const sendTranslatedSMS = async (phone, templateKey, amount, variables = {}, language = 'en') => {
  const templates = {
    order_confirmation: {
      en: `Order confirmed! ID: {{orderId}}. Total: ${{amount}}. We'll notify when ready.`,
      am: `ትዕዛዝ ተረጋግጧል! መለያ: {{orderId}}. ጠቅላላ: {{amount}} ብር. ሲዘጋጅ እንጠቁማለን.`,
      om: `Ajaja mirkaneesse! ID: {{orderId}}. Waliigala: {{amount}} Birrii. Yeroo qophaa'e nutti himna.`,
      sw: `Agizo limethibitishwa! Kitambulisho: {{orderId}}. Jumla: {{amount}}. Tutawataarifa wakati likitayarishwa.`
    },
    delivery_update: {
      en: `Your order #{{orderId}} is out for delivery. ETA: {{eta}}`,
      am: `ትዕዛዝዎ #{{orderId}} ለማስረከብ ወጥቷል. የሚጠበቀው ሰዓት: {{eta}}`,
      om: `Ajaja kee #{{orderId}} geessisuu fiige. Yeroo filannoo: {{eta}}`,
      sw: `Agizo lako #{{orderId}} limefika kwa uwasilishaji. Muda wa kufika: {{eta}}`
    }
  }
  
  const template = templates[templateKey]?.[language] || templates[templateKey]?.['en']
  if (!template) {
    throw new Error(`SMS template ${templateKey} not found for language ${language}`)
  }
  
  let message = template
  Object.keys(variables).forEach(key => {
    message = message.replace(`{{${key}}}`, variables[key])
  })
  
  return sendSMS(phone, message, language)
}

const encodeAfricanText = (text, language) => {
  // Handle special encoding for African languages if needed
  if (['am', 'ti'].includes(language)) {
    // Ethiopian languages might need special handling
    return text
  }
  return text
}