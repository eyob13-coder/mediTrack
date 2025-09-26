// import prisma from '../config/database.js'
// import { geolocationService } from '../services/geolocation.service.js'
// import { getUserLanguage } from '../i18n.js'

// export const Pharmacy = {
//   // Create a new pharmacy
//   async create(pharmacyData, req) {
//     try {
//       // Geocode address if provided
//       let coordinates = {}
//       if (pharmacyData.address) {
//         const geocodeResult = await geolocationService.geocodeAddress(pharmacyData.address)
//         if (geocodeResult) {
//           coordinates = {
//             latitude: geocodeResult.latitude,
//             longitude: geocodeResult.longitude
//           }
//         }
//       }
      
//       const pharmacy = await prisma.pharmacy.create({
//         data: {
//           ...pharmacyData,
//           ...coordinates,
//           amharicName: pharmacyData.amharicName || null,
//           oromoName: pharmacyData.oromoName || null,
//           language: getUserLanguage(req.user)
//         },
//         include: {
//           tenant: { select: { id: true, name: true } },
//           _count: {
//             select: {
//               inventory: true,
//               orders: true,
//               users: true,
//               language: true
//             }
//           }
//         }
//       })
      
//       return { success: true, pharmacy }
//     } catch (error) {
//       return { success: false, error: error.message }
//     }
//   },

//   // Find pharmacy by ID
//   async findById(id, includeRelations = false, req) {
//     try {
//       const pharmacy = await prisma.pharmacy.findUnique({
//         where: { id },
//         include: includeRelations ? {
//           tenant: true,
//           inventory: { 
//             where: { isAvailable: true },
//             take: 10,
//             orderBy: { name: 'asc' } 
//           },
//           orders: { 
//             take: 5,
//             orderBy: { createdAt: 'desc' },
//             include: { user: { select: { name: true } } }
//           },
//           users: { 
//             select: { 
//               id: true, 
//               name: true, 
//               role: true,
//               email: true,
//               language: true
//             } 
//           }
//         } : undefined,
//         language: getUserLanguage(req.user)
//       })
      
//       return { success: true, pharmacy }
//     } catch (error) {
//       return { success: false, error: error.message }
//     }
//   },

//   // Find pharmacies by tenant with pagination and filters
//   async findByTenant(tenantId, page = 1, limit = 20, filters = {}, req) {
//     try {
//       const skip = (page - 1) * limit
//       const where = { tenantId, ...filters, language: getUserLanguage(req.user) }
      
//       const [pharmacies, total] = await Promise.all([
//         prisma.pharmacy.findMany({
//           where,
//           skip,
//           take: limit,
//           include: {
//             _count: {
//               select: {
//                 inventory: { where: { isAvailable: true } },
//                 orders: { 
//                   where: { 
//                     createdAt: { 
//                       gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) 
//                     } 
//                   } 
//                 },
//                 language: true
//               }
//             }
//           },
//           orderBy: { createdAt: 'desc' }
//         }),
//         prisma.pharmacy.count({ where })
//       ])
      
//       return {
//         success: true,
//         pharmacies,
//         pagination: {
//           page,
//           limit,
//           total,
//           pages: Math.ceil(total / limit)
//         }
//       }
//     } catch (error) {
//       return { success: false, error: error.message }
//     }
//   },

//   // Find nearby pharmacies
//   async findNearby(latitude, longitude, radius = 10, filters = {}, req) {
//     try {
//       const pharmacies = await prisma.pharmacy.findMany({
//         where: {
//           ...filters,
//           latitude: { not: null },
//           longitude: { not: null },
//           isActive: true,
//           verified: true,
//           language: getUserLanguage(req.user)
//         },
//         include: {
//           _count: {
//             select: {
//               inventory: { 
//                 where: { 
//                   isAvailable: true,
//                   quantity: { gt: 0 }
//                 } 
//               },
//               language: true
//             }
//           }
//         }
//       })
      
//       // Calculate distances and filter by radius
//       const nearbyPharmacies = pharmacies
//         .map(pharmacy => {
//           const distance = geolocationService.calculateDistance(
//             latitude, longitude,
//             pharmacy.latitude, pharmacy.longitude
//           )
//           return { ...pharmacy, distance }
//         })
//         .filter(pharmacy => pharmacy.distance <= radius)
//         .sort((a, b) => a.distance - b.distance)
      
//       return { success: true, pharmacies: nearbyPharmacies }
//     } catch (error) {
//       return { success: false, error: error.message }
//     }
//   },

//   // Update pharmacy
//   async update(id, updateData, req) {
//     try {
//       // Geocode address if it's being updated
//       let coordinates = {}
//       if (updateData.address) {
//         const geocodeResult = await geolocationService.geocodeAddress(updateData.address)
//         if (geocodeResult) {
//           coordinates = {
//             latitude: geocodeResult.latitude,
//             longitude: geocodeResult.longitude
//           }
//         }
//       }
      
//       const pharmacy = await prisma.pharmacy.update({
//         where: { id },
//         data: {
//           ...updateData,
//           ...coordinates,
//           language: getUserLanguage(req.user)
//         },
//         include: {
//           _count: {
//             select: { inventory: true, orders: true, users: true, language: true },
//             language: true
//           }
//         }
//       })
      
//       return { success: true, pharmacy }
//     } catch (error) {
//       return { success: false, error: error.message }
//     }
//   },

//   // Verify pharmacy
//   async verify(id, verifiedBy, req) {
//     try {
//       const pharmacy = await prisma.pharmacy.update({
//         where: { id },
//         data: { 
//           verified: true,
//           verifiedAt: new Date(),
//           verifiedBy,
//           language: getUserLanguage(req.user)
//         }
//       })
      
//       return { success: true, pharmacy }
//     } catch (error) {
//       return { success: false, error: error.message }
//     }
//   },

//   // Get pharmacy statistics
//   async getStatistics(pharmacyId, period = '30d', req) {
//     try {
//       const dateRange = getDateRange(period)
      
//       const [orderStats, inventoryStats, revenueStats] = await Promise.all([
//         // Order statistics
//         prisma.order.groupBy({
//           by: ['status'],
//           where: {
//             pharmacyId,
//             createdAt: { gte: dateRange.start }
//           },
//           _count: { id: true },
//           language: getUserLanguage(req.user)
//         }),
        
//         // Inventory statistics
//         prisma.inventory.aggregate({
//           where: { pharmacyId },
//           _count: { id: true },
//           _sum: { quantity: true },
//           language: getUserLanguage(req.user)
//         }),
        
//         // Revenue statistics
//         prisma.order.aggregate({
//           where: {
//             pharmacyId,
//             status: 'DELIVERED',
//             createdAt: { gte: dateRange.start }
//           },
//           _sum: { totalAmount: true },
//             _count: { id: true },
//           language: getUserLanguage(req.user)
//         })
//       ])
      
//       return {
//         success: true,
//         statistics: {
//           orders: orderStats.reduce((acc, stat) => {
//             acc[stat.status] = stat._count.id
//             return acc
//           }, {}),
//           inventory: {
//             totalItems: inventoryStats._count.id,
//             totalQuantity: inventoryStats._sum.quantity
//           },
//           revenue: {
//             total: revenueStats._sum.totalAmount,
//             orders: revenueStats._count.id,
//             average: revenueStats._count.id > 0 ? revenueStats._sum.totalAmount / revenueStats._count.id : 0
//           }
//         }
//       }
//     } catch (error) {
//       return { success: false, error: error.message }
//     }
//   },

//   // Add staff to pharmacy
//   async addStaff(pharmacyId, userId, req) {
//     try {
//       // Check if user is already assigned to this pharmacy
//       const existing = await prisma.user.findFirst({
//         where: { id: userId, pharmacyId, language: getUserLanguage(req.user) }
//       })
      
//       if (existing) {
//         return { success: false, error: 'User already assigned to this pharmacy' }
//       }
      
//       await prisma.user.update({
//         where: { id: userId },
//         data: { pharmacyId, language: getUserLanguage(req.user) }
//       })
      
//       return { success: true, message: 'Staff added successfully' }
//     } catch (error) {
//       return { success: false, error: error.message }
//     }
//   }
// }

// // Helper function
// const getDateRange = (period) => {
//   const now = new Date()
//   switch (period) {
//     case '24h':
//       return { start: new Date(now - 24 * 60 * 60 * 1000), end: now }
//     case '7d':
//       return { start: new Date(now - 7 * 24 * 60 * 60 * 1000), end: now }
//     case '30d':
//       return { start: new Date(now - 30 * 24 * 60 * 60 * 1000), end: now }
//     default:
//       return { start: new Date(now - 30 * 24 * 60 * 60 * 1000), end: now }
//   }
// }