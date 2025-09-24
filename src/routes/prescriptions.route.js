import { Router } from 'express';
import upload from '../middleware/upload.js';
import { uploadPrescription } from '../controllers/prescription.controller.js';
import { authenticate } from '../middleware/auth.js';

const presRoute = Router()


presRoute.post('/upload', authenticate ,upload.single('file'), uploadPrescription)

export default presRoute
