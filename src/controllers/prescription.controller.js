import prisma from '../config/database.js'
import notificationService from '../services/notification.service.js'

export const uploadPrescription = async (req, res) => {
  try {
    const { orderId, patientInfo = {}, doctorInfo = {}, items = [] } = req.body
    const file = req.file 

    
    if (!orderId || !patientInfo.name || !doctorInfo.name) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    const prescription = await prisma.prescription.create({
      data: {
        tenantId: req.user?.tenantId,
        orderId,
        patientName: patientInfo.name,
        patientAge: patientInfo.age ?? null,
        doctorName: doctorInfo.name,
        doctorLicense: doctorInfo.license ?? null,
        prescriptionDate: patientInfo.date ? new Date(patientInfo.date) : new Date(),
        imageUrl: file ? `/uploads/prescriptions/${file.filename}` : null,
        status: 'PENDING_REVIEW',
        items: {
          create: items.map(item => ({
            medicineName: item.name,
            dosage: item.dosage,
            frequency: item.frequency,
            duration: item.duration
          }))
        }
      },
      include: {
        items: true,
        order: true
      }
    })

    // Notify pharmacists for review (non-blocking)
    notificationService
      .notifyPharmacists(req.user?.tenantId, 'PRESCRIPTION_NEEDS_REVIEW', {
        prescriptionId: prescription.id
      })
      .catch(err => console.error('Notification error:', err))

    return res.status(201).json({
      message: 'Prescription uploaded successfully',
      data: prescription
    })
  } catch (error) {
    console.error('Prescription upload error:', error)
    return res.status(500).json({ error: 'Failed to upload prescription' })
  }
}
