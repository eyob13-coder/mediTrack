import prisma from '../config/database.js'
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

export const listOrders = async (req, res) => {
  try {
    // Ensure page and limit are numbers, with fallbacks to schema defaults if validation somehow fails to propagate
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const { status, pharmacyId, userId, startDate, endDate } = req.query;

    const where = {
      tenantId: req.user.tenantId,
      ...(status && { status }),
      ...(pharmacyId && { pharmacyId }),
      // Users can only see their own orders unless they are ADMIN or PHARMACIST
      ...(req.user.role === 'CUSTOMER' && { userId: req.user.id }),
      // Admins/Pharmacists can filter by any user or see all orders
      ...(req.user.role !== 'CUSTOMER' && userId && { userId }),
      ...(startDate || endDate) && {
        createdAt: {
          ...(startDate && { gte: new Date(startDate) }),
          ...(endDate && { lte: new Date(endDate) })
        }
      }
    };

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, email: true } },
          pharmacy: { select: { id: true, name: true } }
        }
      }),
      prisma.order.count({ where })
    ]);

    res.json({
      success: true,
      orders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('List orders error:', error);
    res.status(500).json({ error: 'Failed to list orders', details: error.message });
  }
}

export const createOrder = async (req, res) => {
  try {
    const { pharmacyId, items, address, latitude, longitude, phone, notes, paymentMethodId } = req.body;
    const userId = req.user.id;
    const tenantId = req.user.tenantId;

    // Fetch pharmacy to get delivery fee and tenantId validation
    const pharmacy = await prisma.pharmacy.findUnique({
      where: { id: pharmacyId, tenantId },
      select: { id: true, name: true, deliveryFee: true, deliveryRange: true }
    });

    if (!pharmacy) {
      return res.status(404).json({ success: false, error: 'Pharmacy not found or not in your tenant.' });
    }

    let totalAmount = 0;
    const orderItemsData = await Promise.all(
      items.map(async (item) => {
        const inventoryItem = await prisma.inventory.findUnique({
          where: { id: item.inventoryId, pharmacyId },
          select: { id: true, price: true, quantity: true, isAvailable: true }
        });

        if (!inventoryItem || !inventoryItem.isAvailable || inventoryItem.quantity < item.quantity) {
          throw new Error(`Item ${item.inventoryId} is not available or insufficient stock.`);
        }
        const itemPrice = inventoryItem.price * item.quantity;
        totalAmount += itemPrice;
        return {
          inventoryId: item.inventoryId,
          quantity: item.quantity,
          price: inventoryItem.price,
        };
      })
    );

    // Calculate final total including delivery fee (and potentially tax)
    totalAmount += pharmacy.deliveryFee; // Add delivery fee
    // Add tax calculation here if applicable

    const order = await prisma.order.create({
      data: {
        tenantId,
        pharmacyId,
        userId,
        totalAmount,
        deliveryFee: pharmacy.deliveryFee,
        address,
        latitude,
        longitude,
        phone,
        notes,
        paymentIntentId: paymentMethodId, // This might be a placeholder, actual payment integration would vary
        items: {
          create: orderItemsData,
        },
        statusHistory: {
          create: { status: 'PENDING', changedBy: userId, notes: 'Order created' }
        }
      },
      include: {
        items: { include: { inventory: true } },
        user: { select: { id: true, name: true, email: true } },
        pharmacy: { select: { id: true, name: true } }
      }
    });

    // Decrease inventory quantities (assuming success)
    await Promise.all(items.map(item => 
      prisma.inventory.update({
        where: { id: item.inventoryId },
        data: { quantity: { decrement: item.quantity } }
      })
    ));

    res.status(201).json({ success: true, message: 'Order created successfully', order });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ success: false, error: 'Failed to create order', details: error.message });
  }
}