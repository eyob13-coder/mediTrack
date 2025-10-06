# MediTrack

MediTrack is a comprehensive medical tracking and management system designed to streamline various operations within a healthcare facility or system. This full-stack application provides functionalities for managing users, tenants, pharmacies, prescriptions, inventory, orders, and more, with robust features for authentication, real-time communication, payments, and location-based services.

## Features

*   **User Authentication & Authorization:** Secure user login and access control.
*   **Tenant Management:** Support for multi-tenancy, enabling different clinics or hospitals to manage their data independently.
*   **Pharmacy Management:** Tools for managing pharmacy operations.
*   **Prescription Management:** Handle the creation, tracking, and management of prescriptions.
*   **Inventory Management:** Keep track of medical supplies, medications, and other inventory items.
*   **Order Management:** Process and manage orders for supplies and medications.
*   **Notifications:** Real-time notifications for important updates.
*   **Payment Integration:** Seamless payment processing via Stripe.
*   **Real-time Communication:** Powered by Socket.io for instant updates and interactions.
*   **Location Services:** Integration with Google Maps and Node Geocoder for location-based functionalities.
*   **Internationalization (i18n):** Designed with multi-language support, potentially focusing on African languages.
*   **File Uploads:** Handle secure file uploads for various medical documents.

## Technology Stack

### Backend

The backend is built with a robust and scalable Node.js environment.

*   **Node.js & Express:** Fast, unopinionated, minimalist web framework.
*   **Prisma:** Next-generation ORM for Node.js and TypeScript, used for database interactions.
*   **PostgreSQL (Likely):** A powerful, open-source relational database system.
*   **JSON Web Tokens (JWT):** For secure user authentication and authorization.
*   **Bcrypt:** For secure password hashing.
*   **Socket.io:** Enables real-time, bidirectional event-based communication.
*   **Stripe:** For processing payments.
*   **Twilio:** For sending SMS notifications.
*   **Nodemailer:** For sending email notifications.
*   **Multer:** Middleware for handling `multipart/form-data`, primarily used for uploading files.
*   **Google Maps & Node Geocoder:** For integrating location-based services.
*   **Winston:** A versatile logging library.
*   **CORS:** Cross-Origin Resource Sharing for secure communication between frontend and backend.
*   **Dotenv:** For managing environment variables.

### Frontend

The frontend is a modern and responsive web application built with the Next.js framework.

*   **Next.js:** A React framework for building production-ready applications.
*   **React:** A JavaScript library for building user interfaces.
*   **TypeScript:** A typed superset of JavaScript that compiles to plain JavaScript, enhancing code quality and maintainability.
*   **Tailwind CSS:** A utility-first CSS framework for rapidly building custom designs.

## Getting Started

### Prerequisites

Make sure you have the following installed:

*   Node.js (LTS version recommended)
*   npm or Yarn
*   PostgreSQL (or your preferred database, configured with Prisma)

### Installation

1.  **Clone the repository:**

    ```bash
    git clone <repository-url>
    cd mediTrack
    ```

2.  **Backend Setup:**

    ```bash
    cd backend
    npm install
    # Set up your .env file (see .env.example if available)
    npx prisma migrate dev --name init
    npm run dev
    ```

3.  **Frontend Setup:**

    ```bash
    cd ../frontend
    npm install
    # Set up your .env.local file (see .env.local.example if available)
    npm run dev
    ```

## Usage

*   Access the frontend application at `http://localhost:3000` (or as configured).
*   The backend API will be running on `http://localhost:4000` (or as configured).

## Project Structure

```
mediTrack/
├── backend/               # Node.js/Express API
│   ├── prisma/            # Prisma schema and migrations
│   ├── src/               # Backend source code (routes, controllers, services)
│   └── package.json       # Backend dependencies and scripts
├── frontend/              # Next.js/React application
│   ├── app/               # Next.js App Router pages
│   ├── components/        # Reusable React components
│   └── package.json       # Frontend dependencies and scripts
└── README.md              # Project README file
```

## Contributing

Contributions are welcome! Please follow these steps:

1.  Fork the repository.
2.  Create a new branch (`git checkout -b feature/your-feature-name`).
3.  Make your changes.
4.  Commit your changes (`git commit -m 'Add some feature'`).
5.  Push to the branch (`git push origin feature/your-feature-name`).
6.  Open a Pull Request.

## License

This project is licensed under the ISC License.
