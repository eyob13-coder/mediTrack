import { z, ZodError } from 'zod'

/**
 * Middleware to validate request bodies using a Zod schema
 */
export function validate(schema, source = 'body') {
  return (req, res, next) => {
    try {
      let validatedData;
      if (source === 'body') {
        validatedData = schema.parse(req.body);
        Object.assign(req.body, validatedData); // Merge validated data into req.body
      } else if (source === 'query') {
        validatedData = schema.parse(req.query);
        Object.assign(req.query, validatedData); // Merge validated data into req.query
      } else if (source === 'params') {
        validatedData = schema.parse(req.params);
        Object.assign(req.params, validatedData); // Merge validated data into req.params
      }
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          error: 'Validation failed',
          details: error.errors
        });
      }
      next(error);
    }
  };
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
  }),
  patientRegister: z.object({
    email: z.string().email(),
    password: z.string().min(6, "Password must be at least 6 characters long"),
    name: z.string().min(1, "Name is required"),
    phone: z.string().optional(),
    language: z.string().optional().default('en')
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
  }),

  updateStatusRealtime: z.object({
    orderId: z.string().uuid(),
    status: z.enum([
      'PENDING',
      'CONFIRMED',
      'PREPARING',
      'READY_FOR_PICKUP',
      'OUT_FOR_DELIVERY',
      'DELIVERED',
      'CANCELLED',
      'REFUNDED'
    ]),
    deliveryPersonId: z.string().uuid().optional(),
    estimatedDelivery: z.string().datetime().optional()
  }),

  updateDeliveryLocation: z.object({
    orderId: z.string().uuid(),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    accuracy: z.number().positive().optional()
  }),

  getOrderTracking: z.object({
    orderId: z.string().uuid()
  }),

  listOrders: z.object({
    page: z.string().optional().default('1').transform(Number).refine(val => val > 0, { message: "Page must be positive" }),
    limit: z.string().optional().default('20').transform(Number).refine(val => val > 0, { message: "Limit must be positive" }),
    status: z.enum(['PENDING', 'CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'REFUNDED']).optional(),
    pharmacyId: z.string().uuid().optional(),
    userId: z.string().uuid().optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional()
  }),

  createOrder: z.object({
    pharmacyId: z.string().uuid(),
    items: z.array(z.object({
      inventoryId: z.string().uuid(),
      quantity: z.number().int().min(1)
    })).min(1),
    address: z.string().min(5),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    phone: z.string().min(10).max(20),
    notes: z.string().optional(),
    paymentMethodId: z.string() // Assuming this is required for order creation
  })
}

/**
 * Inventory-related validations
 */
export const inventoryValidation = {
  updateInventoryWithCollaboration: z.object({
    // Assuming 'updates' comes from req.body and can contain any updatable inventory fields
    updates: z.object({
      sku: z.string().optional(),
      name: z.string().optional(),
      description: z.string().optional(),
      category: z.string().optional(),
      batchNumber: z.string().optional(),
      quantity: z.number().int().min(0).optional(),
      price: z.number().min(0).optional(),
      cost: z.number().min(0).optional(),
      expiryAt: z.string().datetime().optional(),
      isAvailable: z.boolean().optional(),
      requiresPrescription: z.boolean().optional(),
      images: z.array(z.string().url()).optional(),
      // pharmacyId should not be updated directly by the user through this route in most cases.
      // If it is, it needs strict validation and authorization.
      pharmacyId: z.string().uuid().optional(),
    }).partial()
  }),

  updateInventoryParams: z.object({
    id: z.string().uuid()
  }),

  bulkUpdateInventory: z.object({
    updates: z.array(z.object({
      id: z.string().uuid(),
      changes: z.object({
        sku: z.string().optional(),
        name: z.string().optional(),
        description: z.string().optional(),
        category: z.string().optional(),
        batchNumber: z.string().optional(),
        quantity: z.number().int().min(0).optional(),
        price: z.number().min(0).optional(),
        cost: z.number().min(0).optional(),
        expiryAt: z.string().datetime().optional(),
        isAvailable: z.boolean().optional(),
        requiresPrescription: z.boolean().optional(),
        images: z.array(z.string().url()).optional(),
        pharmacyId: z.string().uuid().optional(),
      }).partial()
    })).min(1)
  }),

  listPharmacyInventoryParams: z.object({
    pharmacyId: z.string().uuid()
  }),
  listPharmacyInventoryQuery: z.object({
    page: z.string().optional().default('1').transform(Number).refine(val => val > 0, { message: "Page must be positive" }),
    limit: z.string().optional().default('20').transform(Number).refine(val => val > 0, { message: "Limit must be positive" }),
    search: z.string().optional(),
    category: z.string().optional(),
    isAvailable: z.string().optional().transform(val => val === 'true' ? true : val === 'false' ? false : undefined),
  })
}

/**
 * Notification-related validations
 */
export const notificationValidation = {
  getNotifications: z.object({
    page: z.string().optional().default('1').transform(Number).refine(val => val > 0, { message: "Page must be positive" }),
    limit: z.string().optional().default('20').transform(Number).refine(val => val > 0, { message: "Limit must be positive" }),
    read: z.string().optional().transform(val => val === 'true' ? true : val === 'false' ? false : undefined),
    type: z.string().optional(),
    priority: z.enum(["low", "normal", "high", "urgent"]).optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    pharmacyId: z.string().uuid().optional()
  }),

  updatePreferences: z.object({
    email: z.boolean().optional(),
    sms: z.boolean().optional(),
    push: z.boolean().optional(),
    // Add other notification preference fields as needed, e.g., for specific types of notifications
    // general: z.boolean().optional(),
    // marketing: z.boolean().optional(),
  }).partial().passthrough(), // .partial() allows for partial updates, .passthrough() allows unknown keys for flexibility

  getById: z.object({
    id: z.string().uuid()
  }),

  markRead: z.object({
    id: z.string().uuid()
  }),

  clearAll: z.object({
    pharmacyId: z.string().uuid().optional(),
    type: z.string().optional(),
    read: z.string().optional().transform(val => val === 'true' ? true : val === 'false' ? false : undefined)
  }),

  deleteById: z.object({
    id: z.string().uuid()
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

/**
 * Pharmacy-related validations
 */
export const pharmacyValidation = {
  createPharmacy: z.object({
    name: z.string().min(1),
    address: z.string().min(5).max(500),
    phone: z.string().optional(),
    licenseNumber: z.string().min(1),
    licenseExpiry: z.string().datetime().optional(),
    region: z.string().optional(),
    city: z.string().optional(),
    pharmacyType: z.enum(['PRIVATE', 'GOVERNMENT', 'NGO', 'HOSPITAL', 'CLINIC']).optional().default('PRIVATE'),
    deliveryFee: z.number().min(0).optional().default(0),
    deliveryRange: z.number().int().min(0).optional().default(10),
    emergencyService: z.boolean().optional().default(false),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
  }),

  listPharmacies: z.object({
    page: z.string().optional().default('1').transform(Number).refine(val => val > 0, { message: "Page must be positive" }),
    limit: z.string().optional().default('20').transform(Number).refine(val => val > 0, { message: "Limit must be positive" }),
    region: z.string().optional(),
    city: z.string().optional(),
    verified: z.string().optional().transform(val => val === 'true' ? true : val === 'false' ? false : undefined),
    active: z.string().optional().transform(val => val === 'true' ? true : val === 'false' ? false : undefined).default('true'),
    emergency: z.string().optional().transform(val => val === 'true' ? true : val === 'false' ? false : undefined),
    type: z.enum(['PRIVATE', 'GOVERNMENT', 'NGO', 'HOSPITAL', 'CLINIC']).optional(),
    search: z.string().optional()
  }),

  getPharmacyParams: z.object({
    id: z.string().uuid()
  }),

  updatePharmacyBody: z.object({
    name: z.string().min(1).optional(),
    address: z.string().min(5).max(500).optional(),
    phone: z.string().optional(),
    licenseNumber: z.string().min(1).optional(),
    licenseExpiry: z.string().datetime().optional(),
    region: z.string().optional(),
    city: z.string().optional(),
    pharmacyType: z.enum(['PRIVATE', 'GOVERNMENT', 'NGO', 'HOSPITAL', 'CLINIC']).optional(),
    deliveryFee: z.number().min(0).optional(),
    deliveryRange: z.number().int().min(0).optional(),
    emergencyService: z.boolean().optional(),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    verified: z.boolean().optional(),
    isActive: z.boolean().optional()
  }).partial(),

  deletePharmacyParams: z.object({
    id: z.string().uuid()
  }),

  verifyPharmacyBody: z.object({
    notes: z.string().max(500).optional()
  }),
  verifyPharmacyParams: z.object({
    id: z.string().uuid()
  }),

  addStaffToPharmacyBody: z.object({
    userId: z.string().uuid(),
    role: z.enum(['WORKER', 'PHARMACIST', 'DELIVERY', 'ADMIN']).optional().default('WORKER')
  }),
  addStaffToPharmacyParams: z.object({
    pharmacyId: z.string().uuid()
  })
}

/**
 * Prescription-related validations
 */
export const prescriptionValidation = {
  uploadPrescription: z.object({
    orderId: z.string().uuid().optional().nullable(),
    patientInfo: z.string().transform((str, ctx) => {
      try {
        const parsed = JSON.parse(str);
        return z.object({
          name: z.string().min(1),
          age: z.number().int().min(0).optional().nullable(),
          date: z.string().datetime().optional()
        }).parse(parsed);
      } catch (e) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Invalid patientInfo JSON or schema" });
        return z.NEVER;
      }
    }),
    doctorInfo: z.string().transform((str, ctx) => {
      try {
        const parsed = JSON.parse(str);
        return z.object({
          name: z.string().min(1),
          license: z.string().optional().nullable()
        }).parse(parsed);
      } catch (e) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Invalid doctorInfo JSON or schema" });
        return z.NEVER;
      }
    }),
    items: z.string().transform((str, ctx) => {
      try {
        const parsed = JSON.parse(str);
        return z.array(z.object({
          medicineName: z.string().min(1),
          dosage: z.string().min(1),
          frequency: z.string().min(1),
          duration: z.string().min(1)
        })).parse(parsed);
      } catch (e) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Invalid items JSON or schema" });
        return z.NEVER;
      }
    }).optional().default('[]').transform(val => JSON.parse(val))
  })
}

/**
 * Tenant-related validations
 */
export const tenantValidation = {
  getAudits: z.object({
    page: z.string().optional().default('1').transform(Number).refine(val => val > 0, { message: "Page must be positive" }),
    limit: z.string().optional().default('50').transform(Number).refine(val => val > 0, { message: "Limit must be positive" }),
  }),

  updateTenant: z.object({
    name: z.string().min(1).optional(),
    plan: z.enum(['FREE', 'BASIC', 'PRO', 'ENTERPRISE']).optional()
  }).refine(data => data.name !== undefined || data.plan !== undefined, {
    message: "At least one field (name or plan) is required to update",
    path: ['name', 'plan'], // Set error on these fields
  })
}
