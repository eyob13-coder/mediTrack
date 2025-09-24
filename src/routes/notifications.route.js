import {Router} from 'express';
import notificationService from '../services/notification.service.js';
import { authenticate } from '../middleware/auth.js';

const notifRoute = Router();

notifRoute.use(authenticate);

// Get user notifications
notifRoute.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, read, type } = req.query;
    const filters = { read: read ? read === 'true' : undefined, type };
    
    const result = await notificationService.getUserNotifications(
      req.user.id, 
      parseInt(page), 
      parseInt(limit), 
      filters
    );
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch notifications' }, error);
  }
});

// Mark as read
notifRoute.patch('/:id/read', async (req, res) => {
  try {
    const result = await notificationService.markAsRead(req.params.id, req.user.id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to mark notification as read' }, error);
  }
});

// Mark all as read
notifRoute.patch('/read-all', async (req, res) => {
  try {
    const result = await notificationService.markAllAsRead(req.user.id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to mark all as read' }, error);
  }
});

// Get notification statistics
notifRoute.get('/stats', async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const stats = await notificationService.getNotificationStats(req.user.id, parseInt(days));
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get notification stats' }, error);
  }
});

export default notifRoute;