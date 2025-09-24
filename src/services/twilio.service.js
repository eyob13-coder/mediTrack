import twilio from 'twilio'
import { TWILIO_PHONE_NUMBER, TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN } from '../config/env.js';

const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)

// ✅ Core SMS sender
export const sendSMS = async (to, message) => {
  try {
    const result = await client.messages.create({
      body: message,
      from: TWILIO_PHONE_NUMBER,
      to
    })

    return { success: true, sid: result.sid }
  } catch (error) {
    console.error('❌ Twilio SMS error:', error)
    return { success: false, error: error.message }
  }
}

// ✅ Template-driven SMS (English only)
export const sendTemplateSMS = async (phone, templateKey, amount, variables = {}) => {
  const templates = {
    order_confirmation: `Order confirmed! ID: {{orderId}}. Total: ${{amount}}. We'll notify you when ready.`,
    delivery_update: `Your order #{{orderId}} is out for delivery. ETA: {{eta}}.`,
    inventory_low: `Inventory alert! Item "{{itemName}}" is running low. Remaining: {{quantity}} units.`,
    prescription_ready: `Your prescription #{{prescriptionId}} is ready for pickup.`,
    delivery_completed: `Your order #{{orderId}} has been delivered successfully.`
  }

  const template = templates[templateKey]
  if (!template) {
    throw new Error(`❌ Template "${templateKey}" not found.`)
  }

  let message = template
  for (const [key, value] of Object.entries(variables)) {
    message = message.replace(new RegExp(`{{${key}}}`, 'g'), value)
  }

  return sendSMS(phone, message)
}

// ✅ Keep this export so other files work without error
export const sendTranslatedSMS = async (phone, templateKey, variables = {}) => {
  return sendTemplateSMS(phone, templateKey, variables)
}
