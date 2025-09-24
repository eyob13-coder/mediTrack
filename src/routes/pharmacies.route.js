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

const pharmacyRoutes = Router();

// Require authentication
pharmacyRoutes.use(authenticate);

// Pharmacy routes
pharmacyRoutes.post('/', createPharmacy);
pharmacyRoutes.get('/', listPharmacies);
pharmacyRoutes.get('/:id', getPharmacy);
pharmacyRoutes.put('/:id', updatePharmacy);
pharmacyRoutes.delete('/:id', deletePharmacy);

// Special routes
pharmacyRoutes.post('/:id/verify', verifyPharmacy);
pharmacyRoutes.post('/:pharmacyId/staff', addStaffToPharmacy);

export default pharmacyRoutes;
