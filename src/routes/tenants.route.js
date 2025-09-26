import { Router } from 'express';
import { 
  getTenantInfo, 
  getAudits, 
  updateTenant 
} from '../controllers/tenant.controller.js';
import { authenticate } from '../middleware/auth.js';
import { validate, tenantValidation } from '../utils/validation.js';

const tenantRoutes = Router();


tenantRoutes.get('/tenant', authenticate, getTenantInfo);
tenantRoutes.get('/tenant/audits', authenticate, validate(tenantValidation.getAudits, 'query'), getAudits);
tenantRoutes.put('/tenant', authenticate, validate(tenantValidation.updateTenant, 'body'), updateTenant);

export default tenantRoutes;
