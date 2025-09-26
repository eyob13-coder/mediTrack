import {Router} from 'express';
import {
  getNotifications,
  getStats,
  getById,
  markRead,
  markAllRead,
  deleteById,
  clearAll,
  getUnread,
  updatePreferences,
  getPreferences,
  getTypes
} from '../controllers/notification.controller.js'
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/auth.js';
import { validate, notificationValidation } from '../utils/validation.js';

const notifRoute = Router();

// All routes require authentication
notifRoute.use(authenticate);

// GET routes
notifRoute.get('/', validate(notificationValidation.getNotifications, 'query'), getNotifications); 
notifRoute.get('/stats', requireRole('admin'), getStats);

notifRoute.get('/unread', getUnread);
notifRoute.get('/preferences', getPreferences); // Get user preferences
notifRoute.get('/types', getTypes); 
notifRoute.get('/:id', validate(notificationValidation.getById, 'params'), getById);

// PATCH routes (updates)
notifRoute.patch('/:id/read', validate(notificationValidation.markRead, 'params'), markRead); // Mark as read
notifRoute.patch('/read-all', validate(notificationValidation.clearAll, 'body'), markAllRead); // Mark all as read
notifRoute.patch('/preferences', validate(notificationValidation.updatePreferences, 'body'), updatePreferences); // Update preferences

// POST routes


// DELETE routes
notifRoute.delete('/:id', validate(notificationValidation.deleteById, 'params'), deleteById); // Delete specific notification
notifRoute.delete('/', validate(notificationValidation.clearAll, 'body'), clearAll); // Clear all notifications

export default notifRoute;