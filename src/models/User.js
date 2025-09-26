// import prisma from '../config/database.js'
// import bcrypt from 'bcrypt'
// import { getUserLanguage } from '../i18n.js'

// export const User = {
//   // Create a new user
//   async create(userData, req) {
//     try {
//       const hashedPassword = await bcrypt.hash(userData.password, 12)
      
//       const user = await prisma.user.create({
//         data: {
//           ...userData,
//           password: hashedPassword,
//           language: userData.language || getUserLanguage(req.user)
//         },
//         select: {
//           id: true,
//           email: true,
//           name: true,
//           role: true,
//           phone: true,
//           language: true,
//           emailVerified: true,
//           phoneVerified: true,
//           isActive: true,
//           tenantId: true,
//           createdAt: true,
//           updatedAt: true
//         }
//       })
      
//       return { success: true, user }
//     } catch (error) {
//       return { success: false, error: error.message }
//     }
//   },

//   // Find user by ID
//   async findById(id, includeRelations = false) {
//     try {
//       const user = await prisma.user.findUnique({
//         where: { id },
//         include: includeRelations ? {
//           tenant: true,
//           pharmacies: true,
//           orders: true
//         } : undefined,
//         select: {
//           id: true,
//           email: true,
//           name: true,
//           role: true,
//           phone: true,
//           language: true,
//           emailVerified: true,
//           phoneVerified: true,
//           isActive: true,
//           tenantId: true,
//           createdAt: true,
//           updatedAt: true,
//           ...(includeRelations && {
//             tenant: { select: { id: true, name: true, plan: true } },
//             pharmacies: { select: { id: true, name: true } },
//             orders: { take: 5, orderBy: { createdAt: 'desc' } }
//           })
//         }
//       })
      
//       return { success: true, user }
//     } catch (error) {
//       return { success: false, error: error.message }
//     }
//   },

//   // Find user by email
//   async findByEmail(email) {
//     try {
//       const user = await prisma.user.findUnique({
//         where: { email },
//         select: {
//           id: true,
//           email: true,
//           password: true,
//           name: true,
//           role: true,
//           isActive: true,
//           tenantId: true,
//           language: true
//         }
//       })
      
//       return { success: true, user }
//     } catch (error) {
//       return { success: false, error: error.message }
//     }
//   },

//   // Update user profile
//   async update(id, updateData, req) {
//     try {
//       // Remove sensitive fields that shouldn't be updated directly
//       const { password, ...safeUpdateData } = updateData
      
//       if (password) {
//         safeUpdateData.password = await bcrypt.hash(password, 12)
//       }
      
//       const user = await prisma.user.update({
//         where: { id },
//         data: { ...safeUpdateData, language: getUserLanguage(req.user) },
//         select: {
//           id: true,
//           email: true,
//           name: true,
//           role: true,
//           phone: true,
//           emailVerified: true,
//           phoneVerified: true,
//           isActive: true,
//           tenantId: true,
//           updatedAt: true,
//           language: true
//         }
//       })
      
//       return { success: true, user }
//     } catch (error) {
//       return { success: false, error: error.message }
//     }
//   },

//   // Verify user email
//   async verifyEmail(id) {
//     try {
//       const user = await prisma.user.update({
//         where: { id },
//         data: { emailVerified: true, verificationToken: null }
//       })
      
//       return { success: true, user }
//     } catch (error) {
//       return { success: false, error: error.message }
//     }
//   },

//   // Change user password
//   async changePassword(id, currentPassword, newPassword, req) {
//     try {
//       const user = await prisma.user.findUnique({ where: { id } })
      
//       if (!user) {
//         return { success: false, error: 'User not found' }
//       }
      
//       const validPassword = await bcrypt.compare(currentPassword, user.password)
//       if (!validPassword) {
//         return { success: false, error: 'Current password is incorrect' }
//       }
      
//       const hashedNewPassword = await bcrypt.hash(newPassword, 12)
//       await prisma.user.update({
//         where: { id },
//         data: { password: hashedNewPassword, language: getUserLanguage(req.user) }
//       })
      
//       return { success: true, message: 'Password updated successfully' }
//     } catch (error) {
//       return { success: false, error: error.message }
//     }
//   },

//   // Get users by tenant with pagination
//   async findByTenant(tenantId, page = 1, limit = 20, filters = {}, req) {
//     try {
//       const skip = (page - 1) * limit
//       const where = { tenantId, ...filters, language: getUserLanguage(req.user) }
      
//       const [users, total] = await Promise.all([
//         prisma.user.findMany({
//           where,
//           skip,
//           take: limit,
//           select: {
//             id: true,
//             email: true,
//             name: true,
//             role: true,
//             phone: true,
//             language: true,
//             emailVerified: true,
//             phoneVerified: true,
//             isActive: true,
//             createdAt: true,
//             lastLoginAt: true,
            
//           },
//           orderBy: { createdAt: 'desc' }
//         }),
//         prisma.user.count({ where })
//       ])
      
//       return {
//         success: true,
//         users,
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

//   // Deactivate user (soft delete)
//   async deactivate(id, deactivatedBy, req) {
//     try {
//       const user = await prisma.user.update({
//         where: { id },
//         data: { 
//           isActive: false,
//           deactivatedAt: new Date(),
//           deactivatedBy,
//           language: getUserLanguage(req.user)
//         }
//       })
      
//       return { success: true, user }
//     } catch (error) {
//       return { success: false, error: error.message }
//     }
//   },

//   // Reactivate user
//   async reactivate(id, req) {
//     try {
//       const user = await prisma.user.update({
//         where: { id },
//         data: { 
//           isActive: true,
//           deactivatedAt: null,
//           deactivatedBy: null,
//           language: getUserLanguage(req.user)
//         }
//       })
      
//       return { success: true, user }
//     } catch (error) {
//       return { success: false, error: error.message }
//     }
//   },

//   // Get user statistics
//   async getStatistics(tenantId, req) {
//     try {
//       const stats = await prisma.user.groupBy({
//         by: ['role', 'isActive'],
//         where: { tenantId },
//         _count: { id: true },
//         language: getUserLanguage(req.user)
//       })
      
//       const totalUsers = await prisma.user.count({ where: { tenantId } })
//       const activeUsers = await prisma.user.count({ 
//         where: { tenantId, isActive: true, language: getUserLanguage(req.user) } 
//       })
      
//       return {
//         success: true,
//         statistics: {
//           totalUsers,
//           activeUsers,
//           inactiveUsers: totalUsers - activeUsers,
//           byRole: stats.reduce((acc, stat) => {
//             acc[stat.role] = (acc[stat.role] || 0) + stat._count.id
//             return acc
//           }, {})
//         }
//       }
//     } catch (error) {
//       return { success: false, error: error.message }
//     }
//   },

//   // Validate user permissions
//   async hasPermission(userId, requiredPermission, req) {
//     try {
//       const user = await prisma.user.findUnique({
//         where: { id: userId },
//         select: { role: true, language: true }
//       })
      
//       if (!user) return false
      
//       const permissions = {
//         SUPER_ADMIN: ['all'],
//         ADMIN: ['manage_users', 'manage_pharmacies', 'view_reports'],
//         PHARMACIST: ['manage_inventory', 'process_orders', 'view_pharmacy_reports'],
//         WORKER: ['view_inventory', 'assist_orders'],
//         DELIVERY: ['view_assigned_orders', 'update_delivery_status'],
//         CUSTOMER: ['place_orders', 'view_own_orders']
//       }
      
//       const userPermissions = permissions[user.role] || []
//       return userPermissions.includes('all') || userPermissions.includes(requiredPermission)
//     } catch (error) {
//       console.error('Error checking user permissions:', error)
//       return false
//     } finally {
//       User.language = getUserLanguage(req.user)
//     }
//   }
// }