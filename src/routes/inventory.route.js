import {Router} from 'express';
import {
  updateInventoryWithCollaboration,
  bulkUpdateInventory
} from '../controllers/inventory.controller.js'
import { authenticate, requireRole } from '../middleware/auth.js';
import { validate, inventoryValidation } from '../utils/validation.js';

const inventoryRoute = Router();

// All routes require authentication
inventoryRoute.use(authenticate);

// PATCH routes
inventoryRoute.patch(
  '/:id',
  validate(inventoryValidation.updateInventoryParams, 'params'), // Validate id from params
  validate(inventoryValidation.updateInventoryWithCollaboration, 'body'), // Validate updates from body
  requireRole('PHARMACIST', 'ADMIN', 'SUPER_ADMIN'), // Assuming these roles can update inventory
  updateInventoryWithCollaboration
);

inventoryRoute.patch(
  '/bulk',
  validate(inventoryValidation.bulkUpdateInventory, 'body'),
  requireRole('PHARMACIST', 'ADMIN', 'SUPER_ADMIN'), // Assuming these roles can bulk update inventory
  bulkUpdateInventory
);

export default inventoryRoute;
