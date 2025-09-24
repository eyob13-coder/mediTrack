import prisma from '../config/database.js';
import { writeAudit } from '../utils/audit.js';
import { geolocationService } from '../services/gelocation.service.js';

/**
 * CREATE a pharmacy
 */
export const createPharmacy = async (req, res, next) => {
  try {
    const {
      name,
      address,
      phone,
      licenseNumber,
      licenseExpiry,
      region,
      city,
      pharmacyType = 'PRIVATE',
      deliveryFee = 0,
      deliveryRange = 10,
      emergencyService = false,
      latitude,
      longitude
    } = req.body;

    const tenantId = req.user.tenantId;

    if (!name || !address || !licenseNumber) {
      return res.status(400).json({
        error: ('errors.validation_failed'),
        details: ('pharmacy.name_address_required')
      });
    }

    const coordinates = await getCoordinates(address, latitude, longitude);

    const pharmacy = await prisma.pharmacy.create({
      data: {
        tenantId,
        name,
        address,
        phone,
        licenseNumber,
        licenseExpiry: licenseExpiry ? new Date(licenseExpiry) : null,
        region,
        city,
        pharmacyType,
        deliveryFee,
        deliveryRange,
        emergencyService,
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        verified: req.user.role === 'ADMIN'
      },
      include: {
        tenant: { select: { id: true, name: true } },
        _count: { select: { users: true, inventory: true, orders: true } }
      }
    });

    await writeAudit({
      tenantId,
      pharmacyId: pharmacy.id,
      userId: req.user.id,
      action: 'PHARMACY_CREATED',
      details: JSON.stringify({
        name: pharmacy.name,
        region: pharmacy.region,
        type: pharmacy.pharmacyType
      })
    });

    res.status(201).json({
      pharmacy,
      message: ('pharmacy.created_success'),
      verificationRequired: !pharmacy.verified
    });
  } catch (error) {
    console.error('Create pharmacy error:', error);
    next(error);
  }
};

/**
 * GET a pharmacy
 */
export const getPharmacy = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { include } = req.query;

    if (!id) return res.status(400).json({ error: 'Pharmacy ID is required' });

    const pharmacy = await prisma.pharmacy.findFirst({
      where: { id, tenantId: req.user.tenantId },
      include: getIncludeOptions(include)
    });

    if (!pharmacy) {
      return res.status(404).json({
        error: ('errors.not_found'),
        details: ('pharmacy.not_found')
      });
    }

    if (include && include.includes('stats')) {
      pharmacy.stats = await getPharmacyStats(id, '30d');
    }

    pharmacy.displayName = getTranslatedPharmacyName(pharmacy, req.language);

    res.json({
      pharmacy,
      message: ('success.operation_completed')
    });
  } catch (error) {
    console.error('Get pharmacy error:', error);
    next(error);
  }
};

/**
 * UPDATE a pharmacy
 */
export const updatePharmacy = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    if (!id) return res.status(400).json({ error: 'Pharmacy ID is required' });

    const existingPharmacy = await prisma.pharmacy.findFirst({
      where: { id, tenantId: req.user.tenantId }
    });

    if (!existingPharmacy) {
      return res.status(404).json({
        error: ('errors.not_found'),
        details: ('pharmacy.not_found')
      });
    }

    if (updates.address && (!updates.latitude || !updates.longitude)) {
      const coordinates = await geolocationService.geocodeAddress(updates.address);
      if (coordinates) {
        updates.latitude = coordinates.latitude;
        updates.longitude = coordinates.longitude;
      }
    }

    if (updates.licenseExpiry) updates.licenseExpiry = new Date(updates.licenseExpiry);

    const pharmacy = await prisma.pharmacy.update({
      where: { id },
      data: updates,
      include: { _count: { select: { users: true, inventory: true, orders: true } } }
    });

    await writeAudit({
      tenantId: req.user.tenantId,
      pharmacyId: id,
      userId: req.user.id,
      action: 'PHARMACY_UPDATED',
      details: JSON.stringify({
        updatedFields: Object.keys(updates),
        previousValues: existingPharmacy
      })
    });

    res.json({ pharmacy, message: ('pharmacy.updated_success') });
  } catch (error) {
    console.error('Update pharmacy error:', error);
    next(error);
  }
};

/**
 * DELETE a pharmacy
 */
export const deletePharmacy = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: 'Pharmacy ID is required' });

    const pharmacy = await prisma.pharmacy.findFirst({
      where: { id, tenantId: req.user.tenantId },
      include: { _count: { select: { users: true, inventory: true, orders: true } } }
    });

    if (!pharmacy) return res.status(404).json({ error: ('pharmacy.not_found') });

    if (pharmacy._count.inventory > 0 || pharmacy._count.orders > 0) {
      return res.status(400).json({
        error: ('errors.validation_failed'),
        details: ('pharmacy.cannot_delete_with_data'),
        counts: { inventory: pharmacy._count.inventory, orders: pharmacy._count.orders }
      });
    }

    await prisma.pharmacy.update({
      where: { id },
      data: { isActive: false, verified: false }
    });

    await writeAudit({
      tenantId: req.user.tenantId,
      pharmacyId: id,
      userId: req.user.id,
      action: 'PHARMACY_DELETED',
      details: JSON.stringify({ name: pharmacy.name, reason: 'Manual deletion by admin' })
    });

    res.json({
      message: ('Pharmacy deleted successfully'),
      pharmacy: { id: pharmacy.id, name: pharmacy.name, status: 'deactivated' }
    });
  } catch (error) {
    console.error('Delete pharmacy error:', error);
    next(error);
  }
};

/**
 * LIST pharmacies
 */
export const listPharmacies = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, region, city, verified, active = true, emergency, type, search } = req.query;

    const skip = (page - 1) * limit;
    const where = { tenantId: req.user.tenantId, isActive: active === 'true' };

    if (region) where.region = region;
    if (city) where.city = city;
    if (verified !== undefined) where.verified = verified === 'true';
    if (emergency !== undefined) where.emergencyService = emergency === 'true';
    if (type) where.pharmacyType = type;
    // if (search) where.OR = buildSearchQuery(search);

    const [pharmacies, total] = await Promise.all([
      prisma.pharmacy.findMany({
        where, skip: parseInt(skip), take: parseInt(limit),
        include: { _count: { select: { users: true, inventory: { where: { isAvailable: true } }, orders: { where: { createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } } } } },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.pharmacy.count({ where })
    ]);

    const enhancedPharmacies = pharmacies.map(p => ({
      ...p,
      displayName: getTranslatedPharmacyName(p, req.language),
      stats: { activeStaff: p._count.users, availableItems: p._count.inventory, recentOrders: p._count.orders }
    }));

    res.json({
      pharmacies: enhancedPharmacies,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) },
      filters: { region, city, verified, active, emergency, type, search }
    });
  } catch (error) {
    console.error('List pharmacies error:', error);
    next(error);
  }
};

/**
 * VERIFY a pharmacy
 */
export const verifyPharmacy = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    if (!id) return res.status(400).json({ error: 'Pharmacy ID is required' });

    const pharmacy = await prisma.pharmacy.findFirst({ where: { id, tenantId: req.user.tenantId } });
    if (!pharmacy) return res.status(404).json({ error: ('pharmacy.not_found') });
    if (pharmacy.verified) return res.status(400).json({ error: ('pharmacy.already_verified') });

    const updatedPharmacy = await prisma.pharmacy.update({
      where: { id },
      data: { verified: true, verifiedAt: new Date(), verifiedBy: req.user.id },
      include: { tenant: { select: { name: true } } }
    });

    await writeAudit({
      tenantId: req.user.tenantId,
      pharmacyId: id,
      userId: req.user.id,
      action: 'PHARMACY_VERIFIED',
      details: JSON.stringify({ verifiedBy: req.user.name, notes, verificationDate: new Date().toISOString() })
    });

    res.json({ pharmacy: updatedPharmacy, message: ('pharmacy.verified_success') });
  } catch (error) {
    console.error('Verify pharmacy error:', error);
    next(error);
  }
};

/**
 * ADD STAFF to pharmacy
 */
export const addStaffToPharmacy = async (req, res, next) => {
  try {
    const { pharmacyId } = req.params;
    const { userId, role = 'WORKER' } = req.body;

    if (!pharmacyId || !userId) return res.status(400).json({ error: 'Pharmacy ID and User ID are required' });

    const pharmacy = await prisma.pharmacy.findFirst({ where: { id: pharmacyId, tenantId: req.user.tenantId } });
    if (!pharmacy) return res.status(404).json({ error: ('pharmacy.not_found') });

    const user = await prisma.user.findFirst({ where: { id: userId, tenantId: req.user.tenantId } });
    if (!user) return res.status(404).json({ error: ('user.not_found') });
    if (user.pharmacyId && user.pharmacyId !== pharmacyId) return res.status(400).json({ error: ('pharmacy.user_already_assigned'), currentPharmacy: user.pharmacyId });

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { pharmacyId, role: role !== user.role ? role : user.role },
      select: { id: true, name: true, email: true, role: true, pharmacyId: true }
    });

    await writeAudit({
      tenantId: req.user.tenantId,
      pharmacyId,
      userId: req.user.id,
      action: 'STAFF_ADDED',
      details: JSON.stringify({ staffUserId: userId, staffName: user.name, assignedBy: req.user.name, role })
    });

    res.json({ user: updatedUser, pharmacy: { id: pharmacy.id, name: pharmacy.name }, message: ('pharmacy.staff_added_success') });
  } catch (error) {
    console.error('Add staff error:', error);
    next(error);
  }
};

/** HELPER FUNCTIONS **/

const getIncludeOptions = (include) => {
  const options = { tenant: { select: { id: true, name: true, plan: true } } };
  if (!include) return options;
  if (include.includes('stats') || include.includes('all')) options._count = { select: { users: true, inventory: true, orders: true } };
  if (include.includes('inventory') || include.includes('all')) options.inventory = { where: { isAvailable: true }, take: 10, orderBy: { name: 'asc' } };
  if (include.includes('staff') || include.includes('all')) options.users = { select: { id: true, name: true, email: true, role: true, lastLoginAt: true } };
  return options;
};

const getPharmacyStats = async (pharmacyId, period = '30d') => {
  const dateRange = getDateRange(period);
  const [orderStats, revenueStats, inventoryStats, staffStats] = await Promise.all([
    prisma.order.groupBy({ by: ['status'], where: { pharmacyId, createdAt: { gte: dateRange.start } }, _count: { id: true } }),
    prisma.order.aggregate({ where: { pharmacyId, status: 'DELIVERED', createdAt: { gte: dateRange.start } }, _sum: { totalAmount: true }, _count: { id: true }, _avg: { totalAmount: true } }),
    prisma.inventory.aggregate({ where: { pharmacyId }, _count: { id: true }, _sum: { quantity: true }, _avg: { price: true } }),
    prisma.user.groupBy({ by: ['role'], where: { pharmacyId }, _count: { id: true } })
  ]);
  return {
    orders: orderStats.reduce((acc, stat) => { acc[stat.status] = stat._count.id; return acc; }, {}),
    revenue: { total: revenueStats._sum.totalAmount || 0, orders: revenueStats._count.id, average: revenueStats._avg.totalAmount || 0 },
    inventory: { totalItems: inventoryStats._count.id, totalQuantity: inventoryStats._sum.quantity || 0, averagePrice: inventoryStats._avg.price || 0 },
    staff: staffStats.reduce((acc, stat) => { acc[stat.role] = stat._count.id; return acc; }, {}),
    period: { start: dateRange.start, end: dateRange.end, label: period }
  };
};

const getDateRange = (period) => {
  const now = new Date();
  const ranges = { '24h': 24, '7d': 7 * 24, '30d': 30 * 24, '90d': 90 * 24 };
  const hours = ranges[period] || 30 * 24;
  return { start: new Date(now.getTime() - hours * 60 * 60 * 1000), end: now };
};

const getTranslatedPharmacyName = (pharmacy, language) => {
  if (!pharmacy) return '';
  if (language === 'am') return pharmacy.amharicName || pharmacy.name;
  if (language === 'om') return pharmacy.oromoName || pharmacy.name;
  return pharmacy.name;
};



const getCoordinates = async (address, latitude, longitude) => {
  if (latitude && longitude) return { latitude, longitude };
  const geo = await geolocationService.geocodeAddress(address);
  return geo || { latitude: null, longitude: null };
};
