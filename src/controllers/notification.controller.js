import prisma from '../config/database.js';

// GET /notifications
export const getUserNotifications = async (req, res) => {
  try {
    const { page, limit, read, type, priority, startDate, endDate, pharmacyId } = req.query;

    const filters = {
      read,
      type,
      priority,
      pharmacyId,
      ...(startDate || endDate) && {
        createdAt: {
          ...(startDate && { gte: new Date(startDate) }),
          ...(endDate && { lte: new Date(endDate) })
        }
      }
    };

    const where = {
      userId: req.user.id,
      ...filters
    };

    const total = await prisma.notification.count({ where });
    const notifications = await prisma.notification.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      notifications
    });

  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({
      success: false,
      error: "Server error",
      details: error.message
    });
  }
};

// GET /notifications/stats
export const getNotificationStats = async (req, res) => {
  try {
    const { days = 30, pharmacyId } = req.query;

    const where = {
      userId: req.user.id,
      createdAt: {
        gte: new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000)
      }
    };

    if (pharmacyId) {
      where.pharmacyId = pharmacyId;
    }

    const [totalNotifications, unreadCount, readCount, byType, byPriority] = await Promise.all([
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { ...where, read: false } }),
      prisma.notification.count({ where: { ...where, read: true } }),
      prisma.notification.groupBy({ by: ['type'], where, _count: { id: true } }),
      prisma.notification.groupBy({ by: ['priority'], where, _count: { id: true } })
    ]);

    res.json({
      success: true,
      stats: {
        total: totalNotifications,
        unread: unreadCount,
        read: readCount,
        unreadPercentage: totalNotifications > 0 ? (unreadCount / totalNotifications) * 100 : 0,
        byType: byType.reduce((acc, item) => { acc[item.type] = item._count.id; return acc; }, {}),
        byPriority: byPriority.reduce((acc, item) => { acc[item.priority] = item._count.id; return acc; }, {})
      }
    });

  } catch (error) {
    console.error('Get notification stats error:', error);
    res.status(500).json({
      success: false,
      error: "Server error",
      details: error.message
    });
  }
};

// GET /notifications/:id
export const getNotification = async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await prisma.notification.findFirst({
      where: { id, userId: req.user.id },
      include: {
        pharmacy: { select: { id: true, name: true, amharicName: true } }
      }
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: "Notification not found"
      });
    }

    res.json({ success: true, notification });

  } catch (error) {
    console.error('Get notification error:', error);
    res.status(500).json({
      success: false,
      error: "Server error",
      details: error.message
    });
  }
};

// PATCH /notifications/:id/read
export const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await prisma.notification.updateMany({
      where: { id, userId: req.user.id },
      data: { read: true, readAt: new Date() }
    });

    if (notification.count === 0) {
      return res.status(404).json({ success: false, error: "Notification not found" });
    }

    res.json({ success: true, message: "Marked as read" });

  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({ success: false, error: "Server error", details: error.message });
  }
};

// PATCH /notifications/read-all
export const markAllAsRead = async (req, res) => {
  try {
    const { pharmacyId, type } = req.body;

    const where = { userId: req.user.id, read: false };
    if (pharmacyId) where.pharmacyId = pharmacyId;
    if (type) where.type = type;

    const result = await prisma.notification.updateMany({ where, data: { read: true, readAt: new Date() } });

    res.json({ success: true, updatedCount: result.count });

  } catch (error) {
    console.error('Mark all as read error:', error);
    res.status(500).json({ success: false, error: "Server error", details: error.message });
  }
};

// DELETE /notifications/:id
export const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await prisma.notification.findFirst({ where: { id, userId: req.user.id } });
    if (!notification) return res.status(404).json({ success: false, error: "Notification not found" });

    await prisma.notification.delete({ where: { id } });

    res.json({ success: true, message: "Notification deleted successfully" });

  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ success: false, error: "Server error", details: error.message });
  }
};

// DELETE /notifications
export const clearAllNotifications = async (req, res) => {
  try {
    const { pharmacyId, type, read } = req.body;
    const where = { userId: req.user.id };
    if (pharmacyId) where.pharmacyId = pharmacyId;
    if (type) where.type = type;
    if (read !== undefined) where.read = read === 'true';

    const result = await prisma.notification.deleteMany({ where });

    res.json({ success: true, deletedCount: result.count });

  } catch (error) {
    console.error('Clear notifications error:', error);
    res.status(500).json({ success: false, error: "Server error", details: error.message });
  }
};

// GET /notifications/unread
export const getUnreadCount = async (req, res) => {
  try {
    const { pharmacyId, type } = req.query;
    const where = { userId: req.user.id, read: false };
    if (pharmacyId) where.pharmacyId = pharmacyId;
    if (type) where.type = type;

    const unreadCount = await prisma.notification.count({ where });

    res.json({ success: true, unreadCount, hasUnread: unreadCount > 0 });

  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ success: false, error: "Server error", details: error.message });
  }
};

// PATCH /notifications/preferences
export const updateNotificationPreferences = async (req, res) => {
  try {
    const preferences = req.body;

    await prisma.user.update({
      where: { id: req.user.id },
      data: { notificationPreferences: preferences }
    });

    res.json({ success: true, preferences });

  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({ success: false, error: "Server error", details: error.message });
  }
};

// GET /notifications/preferences
export const getNotificationPreferences = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { notificationPreferences: true }
    });

    res.json({ success: true, preferences: user?.notificationPreferences || {} });

  } catch (error) {
    console.error('Get preferences error:', error);
    res.status(500).json({ success: false, error: "Server error", details: error.message });
  }
};

// GET /notifications/types
export const getNotificationTypes = async (req, res) => {
  try {
    const types = await prisma.notification.groupBy({
      by: ['type'],
      where: { userId: req.user.id },
      _count: { id: true }
    });

    res.json({ success: true, types });

  } catch (error) {
    console.error('Get notification types error:', error);
    res.status(500).json({ success: false, error: "Server error", details: error.message });
  }
};

export {
  getUserNotifications as getNotifications,
  getNotificationStats as getStats,
  getNotification as getById,
  markAsRead as markRead,
  markAllAsRead as markAllRead,
  deleteNotification as deleteById,
  clearAllNotifications as clearAll,
  getUnreadCount as getUnread,
  updateNotificationPreferences as updatePreferences,
  getNotificationPreferences as getPreferences,
  getNotificationTypes as getTypes
};
