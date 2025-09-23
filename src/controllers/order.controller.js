import prisma from '../prisma.js'
import { notifyOrderUpdate, notifyDeliveryLocation } from '../services/socket.service.js'

export const updateOrderStatusRealtime = async (req, res) => {
  try {
    const { orderId } = req.params
    const { status, deliveryPersonId, estimatedDelivery } = req.body

    const order = await prisma.order.update({
      where: { id: orderId },
      data: {
        status,
        deliveryUserId: deliveryPersonId,
        estimatedDelivery: estimatedDelivery ? new Date(estimatedDelivery) : undefined
      },
      include: {
        user: true,
        pharmacy: true,
        deliveryUser: true
      }
    })

    // Real-time notification to customer and pharmacy
    notifyOrderUpdate(orderId, {
      status: order.status,
      deliveryPerson: order.deliveryUser ? {
        name: order.deliveryUser.name,
        phone: order.deliveryUser.phone
      } : null,
      estimatedDelivery: order.estimatedDelivery,
      timestamp: new Date()
    })

    res.json(order)
  } catch (error) {
    console.error('Order status update error:', error)
    res.status(500).json({ error: 'Failed to update order status' })
  }
}

export const updateDeliveryLocation = async (req, res) => {
  try {
    const { orderId } = req.params
    const { latitude, longitude, accuracy } = req.body

    // Store location history
    await prisma.deliveryLocation.create({
      data: {
        orderId,
        latitude,
        longitude,
        accuracy,
        recordedAt: new Date()
      }
    })

    // Real-time location update to customer
    notifyDeliveryLocation(orderId, {
      latitude,
      longitude,
      accuracy,
      timestamp: new Date()
    })

    res.json({ success: true })
  } catch (error) {
    console.error('Delivery location error:', error)
    res.status(500).json({ error: 'Failed to update location' })
  }
}

export const getOrderTracking = async (req, res) => {
  try {
    const { orderId } = req.params

    const [order, locations, statusHistory] = await Promise.all([
      prisma.order.findUnique({
        where: { id: orderId },
        include: {
          user: { select: { name: true, phone: true } },
          pharmacy: { select: { name: true, address: true } },
          deliveryUser: { select: { name: true, phone: true } }
        }
      }),

      prisma.deliveryLocation.findMany({
        where: { orderId },
        orderBy: { recordedAt: 'desc' },
        take: 50
      }),

      prisma.orderStatusHistory.findMany({
        where: { orderId },
        orderBy: { createdAt: 'desc' }
      })
    ])

    res.json({
      order,
      locations: locations.reverse(), // Oldest first
      statusHistory
    })
  } catch (error) {
    console.error('Order tracking error:', error)
    res.status(500).json({ error: 'Failed to fetch tracking data' })
  }
}