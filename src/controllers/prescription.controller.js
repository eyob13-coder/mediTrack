import prisma from '../config/database.js';
import notificationService from '../services/notification.service.js';

export const uploadPrescription = async (req, res) => {
  try {
    let { orderId, patientInfo, doctorInfo, items } = req.body;
    const file = req.file;

    // Parse JSON strings
    try {
      if (typeof patientInfo === 'string') patientInfo = JSON.parse(patientInfo);
      if (typeof doctorInfo === 'string') doctorInfo = JSON.parse(doctorInfo);
      if (typeof items === 'string') items = JSON.parse(items);
    } catch (err) {
      return res.status(400).json({ error: 'Invalid JSON in request body', details: err.message });
    }

    // Validation
    if (!patientInfo?.name || !doctorInfo?.name) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const prescriptionData = {
      patientName: patientInfo.name,
      patientAge: patientInfo.age ?? null,
      doctorName: doctorInfo.name,
      doctorLicense: doctorInfo.license ?? null,
      prescriptionDate: patientInfo.date ? new Date(patientInfo.date) : new Date(),
      imageUrl: file ? `/uploads/prescriptions/${file.filename}` : null,
      status: 'PENDING_REVIEW',
      tenant: { connect: { id: req.user?.tenantId } },
      user: { connect: { id: req.user?.id } },
      items: {
        create: (items || []).map(item => ({
          medicineName: item.name,
          dosage: item.dosage,
          frequency: item.frequency,
          duration: item.duration
        }))
      }
    };

    // Connect pharmacy if user has one
    if (req.user?.pharmacyId) {
      prescriptionData.pharmacy = { connect: { id: req.user.pharmacyId } };
    }

    // Connect order only if it exists
    if (orderId) {
      const order = await prisma.order.findUnique({
        where: { id: String(orderId) }
      });
      if (order) {
        prescriptionData.order = { connect: { id: String(orderId) } };
      }
    }

    const prescription = await prisma.prescription.create({
      data: prescriptionData,
      include: {
        items: true,
        order: true
      }
    });

    // Notify pharmacists (non-blocking)
    notificationService
      .notifyPharmacists(req.user?.tenantId, 'PRESCRIPTION_NEEDS_REVIEW', {
        prescriptionId: prescription.id
      })
      .catch(err => console.error('Notification error:', err));

    return res.status(201).json({
      message: 'Prescription uploaded successfully',
      data: prescription
    });

  } catch (error) {
    console.error('Prescription upload error:', error);
    return res.status(500).json({ error: 'Failed to upload prescription', details: error.message });
  }
};
