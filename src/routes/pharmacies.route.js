import {Router} from 'express';
import {
  createPharmacy,
  getPharmacy,
  updatePharmacy,
  deletePharmacy,
  listPharmacies,
  verifyPharmacy,
  addStaffToPharmacy
} from '../controllers/pharmacy.controller.js';
import { authenticate } from '../middleware/auth.js';
import { validate, pharmacyValidation, inventoryValidation } from '../utils/validation.js';
import { listPharmacyInventory } from '../controllers/inventory.controller.js';

const pharmacyRoutes = Router();

// Require authentication
pharmacyRoutes.use(authenticate);

// Pharmacy routes
pharmacyRoutes.post('/', validate(pharmacyValidation.createPharmacy, 'body'), createPharmacy);
pharmacyRoutes.get('/', validate(pharmacyValidation.listPharmacies, 'query'), listPharmacies);
pharmacyRoutes.get('/:id', validate(pharmacyValidation.getPharmacyParams, 'params'), getPharmacy);
pharmacyRoutes.put('/:id', validate(pharmacyValidation.getPharmacyParams, 'params'), validate(pharmacyValidation.updatePharmacyBody, 'body'), updatePharmacy);
pharmacyRoutes.delete('/:id', validate(pharmacyValidation.deletePharmacyParams, 'params'), deletePharmacy);

// Special routes
pharmacyRoutes.post('/:id/verify', validate(pharmacyValidation.verifyPharmacyParams, 'params'), validate(pharmacyValidation.verifyPharmacyBody, 'body'), verifyPharmacy);
pharmacyRoutes.post('/:pharmacyId/staff', validate(pharmacyValidation.addStaffToPharmacyParams, 'params'), validate(pharmacyValidation.addStaffToPharmacyBody, 'body'), addStaffToPharmacy);

// Inventory routes for a specific pharmacy
pharmacyRoutes.get('/:pharmacyId/inventory',
  validate(inventoryValidation.listPharmacyInventoryParams, 'params'),
  validate(inventoryValidation.listPharmacyInventoryQuery, 'query'),
  listPharmacyInventory
);

export default pharmacyRoutes;
