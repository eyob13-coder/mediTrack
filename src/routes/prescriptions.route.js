import { Router } from 'express';
import upload from '../middleware/upload.js';
import { uploadPrescription } from '../controllers/prescription.controller.js';
import { authenticate } from '../middleware/auth.js';
import { validate, prescriptionValidation } from '../utils/validation.js';

const presRoute = Router()


presRoute.post('/upload', authenticate ,upload.single('file'), validate(prescriptionValidation.uploadPrescription, 'body'), uploadPrescription)

export default presRoute
