import prisma from '../prisma.js'
import { EthiopianService } from '../services/ethiopianService.js'

export const Inventory = {
  // Create inventory item
  async create(inventoryData) {
    try {
      // Check for duplicates
      const existing = await prisma.inventory.findFirst({
        where: {
          pharmacyId: inventoryData.pharmacyId,
          OR: [
            { sku: inventoryData.sku },
            { 
              name: inventoryData.name,
              batchNumber: inventoryData.batchNumber 
            }
          ]
        }
      })
      
      if (existing) {
        return { 
          success: false, 
          error: 'Item with same SKU or name/batch already exists',
          existingItem: existing
        }
      }
      
      // Set availability based on quantity and expiry
      const isAvailable = inventoryData.quantity > 0 && 
        (!inventoryData.expiryAt || new Date(inventoryData.expiryAt) > new Date())
      
      const inventory = await prisma.inventory.create({
        data: {
          ...inventoryData,
          isAvailable,
          expiryAt: inventoryData.expiryAt ? new Date(inventoryData.expiryAt) : null
        },
        include: {
          pharmacy: { select: { id: true, name: true } }
        }
      })
      
      return { success: true, inventory }
    } catch (error) {
      return { success: false, error: error.message }
    }
  },

  // Bulk create inventory items
  async bulkCreate(items, pharmacyId, tenantId, createdBy) {
    try {
      const results = {
        successful: [],
        failed: [],
        duplicates: 0
      }
      
      for (const itemData of items) {
        try {
          // Check for duplicates
          const existing = await prisma.inventory.findFirst({
            where: {
              pharmacyId,
              OR: [
                { sku: itemData.sku },
                { 
                  name: itemData.name,
                  batchNumber: itemData.batchNumber 
                }
              ]
            }
          })
          
          if (existing) {
            // Update existing item
            const updated = await prisma.inventory.update({
              where: { id: existing.id },
              data: {
                quantity: existing.quantity + (itemData.quantity || 0),
                price: itemData.price || existing.price,
                lastUpdated: new Date()
              }
            })
            results.duplicates++
            results.successful.push({ ...itemData, action: 'updated', id: updated.id })
            continue
          }
          
          // Create new item
          const inventory = await prisma.inventory.create({
            data: {
              ...itemData,
              pharmacyId,
              tenantId,
              isAvailable: (itemData.quantity || 0) > 0,
              expiryAt: itemData.expiryAt ? new Date(itemData.expiryAt) : null
            }
          })
          
          results.successful.push({ ...itemData, action: 'created', id: inventory.id })
        } catch (error) {
          results.failed.push({ item: itemData, error: error.message })
        }
      }
      
      return { success: true, results }
    } catch (error) {
      return { success: false, error: error.message }
    }
  },

  // Find inventory by ID
  async findById(id, includeRelations = false) {
    try {
      const inventory = await prisma.inventory.findUnique({
        where: { id },
        include: includeRelations ? {
          pharmacy: true,
          auditLogs: { 
            take: 10, 
            orderBy: { createdAt: 'desc' },
            include: { user: { select: { name: true } } }
          }
        } : undefined
      })
      
      return { success: true, inventory }
    } catch (error) {
      return { success: false, error: error.message }
    }
  },

  // Find inventory by pharmacy with filters
  async findByPharmacy(pharmacyId, filters = {}, page = 1, limit = 50) {
    try {
      const skip = (page - 1) * limit
      const where = { pharmacyId, ...filters }
      
      const [inventory, total] = await Promise.all([
        prisma.inventory.findMany({
          where,
          skip,
          take: limit,
          include: {
            pharmacy: { select: { id: true, name: true } }
          },
          orderBy: { name: 'asc' }
        }),
        prisma.inventory.count({ where })
      ])
      
      return {
        success: true,
        inventory,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    } catch (error) {
      return { success: false, error: error.message }
    }
  },

  // Search inventory
  async search(query, pharmacyId, filters = {}) {
    try {
      const where = {
        pharmacyId,
        ...filters,
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { sku: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
          { category: { contains: query, mode: 'insensitive' } }
        ]
      }
      
      const inventory = await prisma.inventory.findMany({
        where,
        take: 100,
        include: {
          pharmacy: { select: { id: true, name: true, address: true } }
        },
        orderBy: { name: 'asc' }
      })
      
      return { success: true, inventory }
    } catch (error) {
      return { success: false, error: error.message }
    }
  },

  // Update inventory quantity
  async updateQuantity(id, delta, reason, userId) {
    try {
      const inventory = await prisma.inventory.findUnique({ where: { id } })
      
      if (!inventory) {
        return { success: false, error: 'Inventory item not found' }
      }
      
      const newQuantity = Math.max(0, inventory.quantity + delta)
      const isAvailable = newQuantity > 0 && 
        (!inventory.expiryAt || new Date(inventory.expiryAt) > new Date())
      
      const updated = await prisma.inventory.update({
        where: { id },
        data: { 
          quantity: newQuantity, 
          isAvailable,
          lastUpdated: new Date()
        }
      })
      
      // Log the adjustment
      await prisma.audit.create({
        data: {
          tenantId: inventory.tenantId,
          pharmacyId: inventory.pharmacyId,
          inventoryId: id,
          userId,
          action: 'INVENTORY_ADJUST',
          details: JSON.stringify({ 
            delta, 
            newQuantity, 
            reason,
            previousQuantity: inventory.quantity 
          })
        }
      })
      
      return { success: true, inventory: updated }
    } catch (error) {
      return { success: false, error: error.message }
    }
  },

  // Get low stock alerts
  async getLowStock(pharmacyId, threshold = 10) {
    try {
      const lowStock = await prisma.inventory.findMany({
        where: {
          pharmacyId,
          quantity: { lt: threshold },
          isAvailable: true
        },
        include: {
          pharmacy: { select: { id: true, name: true } }
        },
        orderBy: { quantity: 'asc' }
      })
      
      return { success: true, lowStock, threshold }
    } catch (error) {
      return { success: false, error: error.message }
    }
  },

  // Get expiring soon items
  async getExpiringSoon(pharmacyId, daysThreshold = 30) {
    try {
      const thresholdDate = new Date()
      thresholdDate.setDate(thresholdDate.getDate() + daysThreshold)
      
      const expiring = await prisma.inventory.findMany({
        where: {
          pharmacyId,
          expiryAt: {
            lte: thresholdDate,
            gte: new Date() // Not expired yet
          },
          isAvailable: true
        },
        include: {
          pharmacy: { select: { id: true, name: true } }
        },
        orderBy: { expiryAt: 'asc' }
      })
      
      return { success: true, expiring, daysThreshold }
    } catch (error) {
      return { success: false, error: error.message }
    }
  },

  // Translate medicine names for Ethiopian languages
  async getTranslatedInventory(pharmacyId, language) {
    try {
      const inventory = await prisma.inventory.findMany({
        where: { pharmacyId, isAvailable: true },
        orderBy: { name: 'asc' }
      })
      
      // Translate medicine names
      const translated = inventory.map(item => ({
        ...item,
        translatedName: EthiopianService.translateMedicineName(item.name, language),
        displayName: language !== 'en' ? 
          EthiopianService.translateMedicineName(item.name, language) || item.name : 
          item.name
      }))
      
      return { success: true, inventory: translated }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }
}