import prisma from '../config/database.js'
import { notifyInventoryUpdate, notifyUserEditing } from '../services/socket.service.js'

export const updateInventoryWithCollaboration = async (req, res) => {
  try {
    const { id } = req.params
    const updates = req.body
    const userId = req.user.id

    // Notify others that user is editing
    notifyUserEditing(updates.pharmacyId, id, {
      id: userId,
      name: req.user.name
    }, true)

    const inventory = await prisma.inventory.update({
      where: { id },
      data: updates
    })

    // Notify all connected users about the update
    notifyInventoryUpdate(inventory.pharmacyId, {
      type: 'INVENTORY_UPDATED',
      itemId: inventory.id,
      field: Object.keys(updates)[0],
      newValue: updates[Object.keys(updates)[0]],
      oldValue: inventory[Object.keys(updates)[0]],
      updatedBy: userId,
      userName: req.user.name,
      timestamp: new Date()
    })

    // Notify editing is complete
    setTimeout(() => {
      notifyUserEditing(updates.pharmacyId, id, {
        id: userId,
        name: req.user.name
      }, false)
    }, 2000)

    res.json(inventory)
  } catch (error) {
    console.error('Inventory update error:', error)
    res.status(500).json({ error: 'Failed to update inventory' })
  }
}

export const bulkUpdateInventory = async (req, res) => {
  try {
    const { updates } = req.body
    const userId = req.user.id

    const results = await Promise.all(
      updates.map(async (update) => {
        const item = await prisma.inventory.update({
          where: { id: update.id },
          data: update.changes
        })

        // Real-time notification for each update
        notifyInventoryUpdate(item.pharmacyId, {
          type: 'BULK_INVENTORY_UPDATE',
          itemId: item.id,
          changes: update.changes,
          updatedBy: userId,
          userName: req.user.name,
          timestamp: new Date()
        })

        return item
      })
    )

    res.json({ updated: results.length, items: results })
  } catch (error) {
    console.error('Bulk update error:', error)
    res.status(500).json({ error: 'Failed to bulk update inventory' })
  }
}

export const listPharmacyInventory = async (req, res) => {
  try {
    const { pharmacyId } = req.params;
    const { page = 1, limit = 20, search, category, isAvailable } = req.query;

    const where = {
      pharmacyId,
      tenantId: req.user.tenantId, // Ensure inventory belongs to user's tenant
      ...(category && { category }),
      ...(isAvailable !== undefined && { isAvailable: isAvailable === 'true' }),
      ...(search && { OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } }
      ]})
    };

    const [inventoryItems, total] = await Promise.all([
      prisma.inventory.findMany({
        where,
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
        orderBy: { name: 'asc' }
      }),
      prisma.inventory.count({ where })
    ]);

    res.json({
      success: true,
      items: inventoryItems,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('List pharmacy inventory error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve pharmacy inventory', details: error.message });
  }
}