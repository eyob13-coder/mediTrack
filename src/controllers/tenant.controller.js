import prisma from '../config/database.js';

export const getTenantInfo = async (req, res, next) => {
  try {
    if (!req.user || !req.user.tenantId) {
      return res.status(400).json({ error: "Tenant ID is missing from request" });
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: req.user.tenantId },
      include: { 
        pharmacies: true, 
        users: true,
        orders: true,
        inventories: true,
        audits: true,
        payouts: true,
        bulkUploads: true,
        prescriptions: true,
        _count: {
          select: {
            users: true,
            pharmacies: true,
            orders: true,
            inventories: true,
            audits: true,
            payouts: true,
            bulkUploads: true,
            prescriptions: true
          }
        }
      }
    });

    if (!tenant) {
      return res.status(404).json({ error: "Tenant not found" });
    }

    return res.json({
      tenant,
      message: "Tenant info retrieved successfully"
    });

  } catch (err) {
    console.error('Get tenant error:', err);
    return next(err);
  }
};

export const getAudits = async (req, res, next) => {
  try {
    if (!req.user || !req.user.tenantId) {
      return res.status(400).json({ error: "Tenant ID is missing from request" });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const audits = await prisma.audit.findMany({
      where: { tenantId: req.user.tenantId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        user: { select: { name: true, email: true } },
        pharmacy: { select: { name: true } }
      }
    });

    const total = await prisma.audit.count({
      where: { tenantId: req.user.tenantId }
    });

    return res.json({ 
      audits, 
      pagination: { page, limit, total, pages: Math.ceil(total / limit) } 
    });

  } catch (err) {
    console.error('Get audits error:', err);
    return next(err);
  }
};

export const updateTenant = async (req, res, next) => {
  try {
    if (!req.user || !req.user.tenantId) {
      return res.status(400).json({ error: "Tenant ID is missing from request" });
    }

    const { name, plan } = req.body;

    if (!name && !plan) {
      return res.status(400).json({ error: "At least one field (name or plan) is required to update" });
    }

    const updated = await prisma.tenant.update({
      where: { id: req.user.tenantId },
      data: {
        ...(name && { name }),
        ...(plan && { plan })
      }
    });

    return res.json({
      updated,
      message: "Tenant updated successfully"
    });

  } catch (err) {
    console.error('Update tenant error:', err);
    return next(err);
  }
};
