# GKT ERP System

A comprehensive Enterprise Resource Planning (ERP) system built with the MERN stack (MongoDB, Express.js, React, Node.js) designed to streamline Opportunity Management, Sales, Delivery tracking, and Financial reporting.

## 🔗 Repository
[https://github.com/akshayaav246-collab/gkterp](https://github.com/akshayaav246-collab/gkterp)

## 🛠️ Tech Stack

- **Frontend:** React (Vite), Tailwind CSS, Lucide React, Recharts
- **Backend:** Node.js, Express.js
- **Database:** MongoDB (Mongoose)
- **Authentication:** JWT (JSON Web Tokens)

## 🚀 Getting Started

### Prerequisites

- Node.js (v14 or higher)
- MongoDB (Local or Atlas connection string)
- Git

### 1. Clone the Repository

```bash
git clone https://github.com/akshayaav246-collab/gkterp.git
cd gkterp
```

### 2. Backend Setup (Server)

Navigate to the server directory and install dependencies:

```bash
cd server
npm install
```

Create a `.env` file in the `server` directory with the following variables:

```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
```

Start the backend server:

```bash
# Development (using nodemon)
npx nodemon index.js

# Production
node index.js
```

The server will run on `http://localhost:5000`.

### 3. Frontend Setup (Client)

Navigate to the client directory and install dependencies:

```bash
cd ../client
npm install
```

Start the development server:

```bash
npm run dev
```

The application will be accessible at `http://localhost:5173`.

## 📂 Project Structure

- **`/client`**: React frontend application.
  - `src/pages`: Main application pages (Dashboard, Opportunities, etc.)
  - `src/components`: Reusable UI components.
- **`/server`**: Express backend API.
  - `models`: Mongoose database schemas.
  - `routes`: API route definitions.
  - `controllers`: Business logic (if separated).

## ✨ Key Features

- **Role-Based Access Control:** Distinct views and permissions for Sales, Delivery, Finance, and Directors.
- **Opportunity Management:** End-to-end tracking from Creation -> Proposal -> PO -> Delivery -> Invoicing.
- **Financial Dashboard:** Real-time revenue analytics, GP analysis, and expense breakdown.
- **Visual Analytics:** Interactive charts for revenue by technology, type, and client.
