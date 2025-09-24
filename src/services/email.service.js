import nodemailer from 'nodemailer';
import { SMTP_USER, SMTP_PASS } from '../config/env.js'

const transporter = nodemailer.createTransport({

  secure: false, // true for 465, false for other ports
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS
  }
})

export const sendEmail = async (email, templateKey, variables = {}) => {
  const templates = {
    welcome: {
      subject: 'Welcome to MedicTrack',
      html: (vars) => `
        <h2>Welcome to MedicTrack, ${vars.name}!</h2>
        <p>Your account has been created successfully.</p>
      `
    },
    order_confirmation: {
      subject: `Order Confirmation - #{{orderId}}`,
      html: (vars) => `
        <h2>Order Confirmed!</h2>
        <p>Your order <strong>#${vars.orderId}</strong> has been confirmed.</p>
        <p>Total Amount: $${vars.amount}</p>
      `
    },
    delivery_update: {
      subject: `Delivery Update - Order #{{orderId}}`,
      html: (vars) => `
        <h2>Delivery Update</h2>
        <p>Your order <strong>#${vars.orderId}</strong> is out for delivery.</p>
        <p>ETA: ${vars.eta}</p>
      `
    },
    prescription_ready: {
      subject: `Prescription Ready - #{{prescriptionId}}`,
      html: (vars) => `
        <h2>Prescription Ready</h2>
        <p>Your prescription <strong>#${vars.prescriptionId}</strong> is ready for pickup.</p>
      `
    },
    inventory_low: {
      subject: (vars) =>`Inventory Alert - ${vars.itemName}`,
      html: (vars) => `
        <h2>Inventory Low Alert</h2>
        <p>Item <strong>${vars.itemName}</strong> is running low.</p>
        <p>Remaining stock: ${vars.quantity} units</p>
      `
    }
  }

  const template = templates[templateKey]
  if (!template) {
    throw new Error(`Template "${templateKey}" not found`)
  }

  // Replace variables in subject
  let finalSubject = template.subject
  Object.keys(variables).forEach(key => {
    finalSubject = finalSubject.replace(`{{${key}}}`, variables[key])
  })

  const mailOptions = {
    from: process.env.FROM_EMAIL,
    to: email,
    subject: finalSubject,
    html: template.html(variables)
  }

  try {
    await transporter.sendMail(mailOptions)
    return { success: true }
  } catch (error) {
    console.error('❌ Email send error:', error)
    return { success: false, error: error.message }
  }
}
