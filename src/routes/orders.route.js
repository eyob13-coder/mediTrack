import {Router} from 'express';
import {
  updateOrderStatusRealtime,
  updateDeliveryLocation,
  getOrderTracking,
  listOrders,
  createOrder
} from '../controllers/order.controller.js'
import { authenticate, requireRole } from '../middleware/auth.js';
import { validate, orderValidation } from '../utils/validation.js';

const orderRoute = Router();

// All routes require authentication
orderRoute.use(authenticate);

// POST routes
orderRoute.post('/', validate(orderValidation.createOrder, 'body'), createOrder);

// PATCH routes
orderRoute.patch(
  '/:orderId/status',
  validate(orderValidation.updateStatusRealtime, 'body'),
  requireRole('PHARMACIST', 'DELIVERY', 'ADMIN', 'SUPER_ADMIN'), // Assuming these roles can update order status
  updateOrderStatusRealtime
);
orderRoute.patch(
  '/:orderId/location',
  validate(orderValidation.updateDeliveryLocation, 'body'),
  requireRole('DELIVERY', 'ADMIN', 'SUPER_ADMIN'), // Assuming only delivery users and admins can update location
  updateDeliveryLocation
);

// GET routes
orderRoute.get('/', validate(orderValidation.listOrders, 'query'), listOrders);
orderRoute.get(
  '/:orderId/tracking',
  validate(orderValidation.getOrderTracking, 'params'),
  getOrderTracking
);

export default orderRoute;
