import { z, ZodError } from 'zod'

/**
 * Middleware to validate request bodies using a Zod schema
 */
export function validate(schema) {
  return (req, res, next) => {
    try {
      schema.parse(req.body)
      next()
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          error: 'Validation failed',
          details: error.errors
        })
      }
      next(error)
    }
  }
}

/**
 * Auth-related validations
 */
export const authValidation = {
  register: z.object({
    tenantName: z.string().min(1),
    email: z.email(),
    password: z.string().min(6),
    name: z.string().min(1),
    role: z.string().optional(),
    language: z.string().optional()
  }),

  login: z.object({
    email: z.email(),
    password: z.string().min(6)
  }),

  invite: z.object({
    email: z.email(),
    role: z.string().min(1)
  })
}

/**
 * Order-related validations
 */
export const orderValidation = {
  create: z.object({
    pharmacyId: z.uuid(),
    items: z.array(z.object({
      inventoryId: z.uuid(),
      quantity: z.number().int().min(1).max(1000)
    })).min(1).max(50),
    address: z.string().min(5).max(500),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    phone: z.string().min(10).max(20),
    notes: z.string().max(1000).optional(),
    paymentMethodId: z.string().min(1)
  }),

  updateStatus: z.object({
    status: z.enum([
      'PENDING',
      'CONFIRMED',
      'PREPARING',
      'READY_FOR_PICKUP',
      'OUT_FOR_DELIVERY',
      'DELIVERED',
      'CANCELLED'
    ]),
    deliveryUserId: z.uuid().optional(),
    estimatedDelivery: z.iso.datetime().optional()
  }),

  assignDelivery: z.object({
    deliveryUserId: z.string().uuid()
  }),

  cancel: z.object({
    reason: z.string().min(1).max(500).optional()
  })
}

/**
 * Payment-related validations
 */
export const paymentValidation = {
  createPayment: z.object({
    orderId: z.uuid(),
    paymentMethodId: z.string(),
    saveCard: z.boolean().optional()
  }),

  refund: z.object({
    orderId: z.uuid(),
    amount: z.number().positive().optional(),
    reason: z.enum(['duplicate', 'fraudulent', 'requested_by_customer']).optional()
  })
}
