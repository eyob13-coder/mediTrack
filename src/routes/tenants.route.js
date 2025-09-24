import { Router } from 'express';
import { 
  getTenantInfo, 
  getAudits, 
  updateTenant 
} from '../controllers/tenant.controller.js';
import { authenticate } from '../middleware/auth.js';

const tenantRoutes = Router();


tenantRoutes.get('/tenant', authenticate, getTenantInfo);
tenantRoutes.get('/tenant/audits', authenticate, getAudits);
tenantRoutes.put('/tenant', authenticate, updateTenant);

export default tenantRoutes;
