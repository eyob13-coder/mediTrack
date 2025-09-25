import { sendTranslatedNotification } from './socket.service.js'
import { sendTranslatedSMS } from './twilio.service.js'
import { sendEmail } from './email.service.js'
import prisma from '../config/database.js'

export const notificationService = {
  // ===== Base Notification =====
  async sendNotification({
    userId,
    pharmacyId,
    tenantId,
    type,
    title,
    message,
    data = {},
    channels = ['socket'],
    priority = 'normal'
  }) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, phone: true, name: true }
      })
      if (!user) throw new Error('User not found')

      const results = []

      // Socket
      if (channels.includes('socket')) {
        sendTranslatedNotification(userId, type, { message, ...data })
        results.push({ channel: 'socket', success: true })
      }

      // SMS
      if (channels.includes('sms') && user.phone) {
        const result = await sendTranslatedSMS(user.phone, type, { message, ...data })
        results.push({ channel: 'sms', success: result.success })
      }

      // Email
      if (channels.includes('email') && user.email) {
        const result = await sendEmail(
          user.email,
          type,
          { ...data, userName: user.name }
        )
        results.push({ channel: 'email', success: result.success })
      }

      // Save notification
      await prisma.notification.create({
        data: {
          userId,
          pharmacyId,
          tenantId,
          type,
          title,
          message,
          data,
          channels,
          priority,
          language: 'en',
          status: 'SENT'
        }
      })

      return { success: true, channels: results, timestamp: new Date().toISOString() }
    } catch (error) {
      console.error('Notification error:', error)
      if (userId) {
        await prisma.notification.create({
          data: {
            userId,
            pharmacyId,
            tenantId,
            type,
            title,
            message,
            data,
            channels,
            priority,
            language: 'en',
            status: 'FAILED',
            error: error.message
          }
        })
      }
      return { success: false, error: error.message }
    }
  },

  // ===== Notify Pharmacists =====
  async notifyPharmacists(tenantId, pharmacyId, type, title, message, data = {}) {
    const pharmacists = await prisma.user.findMany({
      where: {
        tenantId,
        pharmacyId,
        role: { in: ['ADMIN', 'PHARMACIST'] },
        isActive: true
      }
    });

    const results = await Promise.all(
      pharmacists.map(user =>
        this.sendNotification({
          userId: user.id,
          pharmacyId,
          tenantId,
          type,
          title,
          message,
          data,
          channels: ['socket', user.email ? 'email' : null].filter(Boolean)
        })
      )
    );

    return { success: true, results };
  },

  // ===== ORDER =====
  async sendOrderNotification(orderId, notificationType, extra = {}) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: true,
        pharmacy: true,
        items: { include: { inventory: true } }
      }
    })
    if (!order) throw new Error('Order not found')

    const orderData = {
      orderId: order.id,
      total: order.totalAmount,
      customer: order.user.name,
      pharmacy: order.pharmacy.name,
      items: order.items.length,
      ...extra
    }

    const customer = await this.sendNotification({
      userId: order.user.id,
      pharmacyId: order.pharmacyId,
      tenantId: order.tenantId,
      type: `ORDER_${notificationType}`,
      title: `Order ${notificationType}`,
      message: `Your order is ${notificationType.toLowerCase()}`,
      data: orderData,
      channels: ['socket', 'sms', 'email']
    })

    return { success: true, orderId, notifications: [customer] }
  },

  // ===== INVENTORY =====
  async sendInventoryNotification(pharmacyId, notificationType, item) {
    const pharmacy = await prisma.pharmacy.findUnique({
      where: { id: pharmacyId },
      include: { tenant: true }
    })
    if (!pharmacy) throw new Error('Pharmacy not found')

    const staff = await prisma.user.findMany({
      where: { pharmacyId, role: { in: ['ADMIN', 'PHARMACIST', 'WORKER'] }, isActive: true }
    })

    const results = await Promise.all(
      staff.map(user =>
        this.sendNotification({
          userId: user.id,
          pharmacyId,
          tenantId: pharmacy.tenantId,
          type: `INVENTORY_${notificationType}`,
          title: `Inventory ${notificationType}`,
          message: `Item ${item.itemName} is ${notificationType.toLowerCase()}`,
          data: item,
          channels: ['socket', user.email ? 'email' : null].filter(Boolean)
        })
      )
    )

    return { success: true, results }
  },

  // ===== PRESCRIPTION =====
  async sendPrescriptionNotification(prescriptionId, notificationType) {
    const prescription = await prisma.prescription.findUnique({
      where: { id: prescriptionId },
      include: { user: true, pharmacy: true, items: true }
    })
    if (!prescription) throw new Error('Prescription not found')

    const notification = await this.sendNotification({
      userId: prescription.userId,
      pharmacyId: prescription.pharmacyId,
      tenantId: prescription.tenantId,
      type: `PRESCRIPTION_${notificationType}`,
      title: `Prescription ${notificationType}`,
      message: `Your prescription is ${notificationType.toLowerCase()}`,
      data: {
        prescriptionId,
        patient: prescription.patientName,
        doctor: prescription.doctorName,
        items: prescription.items.length,
        status: prescription.status
      },
      channels: ['socket', 'sms', 'email']
    })

    return { success: true, prescriptionId, notification }
  },

  // ===== DELIVERY =====
  async sendDeliveryNotification(orderId, status, deliveryData = {}) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { user: true, pharmacy: true, deliveryUser: true }
    })
    if (!order) throw new Error('Order not found')

    const customer = await this.sendNotification({
      userId: order.userId,
      pharmacyId: order.pharmacyId,
      tenantId: order.tenantId,
      type: `DELIVERY_${status}`,
      title: `Delivery ${status}`,
      message: `Your order is ${status.toLowerCase()}`,
      data: { orderId, ...deliveryData },
      channels: ['socket', 'sms']
    })

    if (order.deliveryUserId) {
      await this.sendNotification({
        userId: order.deliveryUserId,
        pharmacyId: order.pharmacyId,
        tenantId: order.tenantId,
        type: `DELIVERY_${status}_DRIVER`,
        title: `Delivery ${status}`,
        message: `You have a delivery update`,
        data: { orderId, ...deliveryData },
        channels: ['socket']
      })
    }

    return { success: true, orderId, customer }
  },

  // ===== USER NOTIFICATIONS =====
  async getUserNotifications(userId, page = 1, limit = 20) {
    const skip = (page - 1) * limit
    const [notifications, total, unread] = await Promise.all([
      prisma.notification.findMany({ where: { userId }, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      prisma.notification.count({ where: { userId } }),
      prisma.notification.count({ where: { userId, read: false } })
    ])
    return { success: true, notifications, pagination: { page, limit, total, pages: Math.ceil(total / limit), unread } }
  },

  async markAsRead(notificationId) {

    const notification = await prisma.notification.update({
      where: { id: notificationId },
      data: { read: true, readAt: new Date() }
    })
    return { success: true, notification }
  },

  async markAllAsRead(userId) {
    await prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true, readAt: new Date() }
    })
    return { success: true, message: 'All notifications marked as read' }
  }
}

export default notificationService
