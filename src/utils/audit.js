import prisma from '../config/database.js';

export async function writeAudit({ tenantId, pharmacyId = null, inventoryId = null, userId = null, action, details = null }) {
  try {
    await prisma.audit.create({
      data: {
        tenantId,
        pharmacyId,
        inventoryId,
        userId,
        action,
        details
      }
    });
  } catch (err) {
    console.error('Audit write failed', err);
  }
}
