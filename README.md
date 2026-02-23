#  BroCode Spot - Real-Time Party & Event Management

   ### STAR THIS REPO THEN START CONTRIBUTE WITH ❤️ FOR APERTRE3.0
<div align="center">

![BroCode Spot](https://img.shields.io/badge/BroCode-Spot-orange?style=for-the-badge&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![Apertre3.0](https://img.shields.io/badge/Apertre3.0-orange?style=for-the-badge)

**A modern, real-time collaborative ordering and bill management system for parties and events.**

[Features](#-features) • [Getting Started](#-getting-started) • [Tech Stack](#-tech-stack) • [Contributing](#-contributing) • [License](#-license)

</div>

---

## 📖 About

BroCode Spot is a full-stack web application designed to streamline group ordering at parties, events, and social gatherings. It enables users to collaboratively order drinks, food, and cigarettes while tracking individual bills and managing payments in real-time.

### 🎯 Problem It Solves

- **No more confusion** about who ordered what at a party
- **Real-time bill tracking** for each participant
- **Easy payment management** for hosts and organizers
- **Collaborative ordering** without the chaos

---

## ✨ Features

### 👥 For Users
- **📱 Mobile-First Design** - Beautiful, responsive UI optimized for mobile devices
- **🍹 Browse & Order** - Explore drinks, food, and cigarettes with an intuitive catalog
- **💰 Personal Bill Tracking** - View your individual bill with itemized breakdown
- **🔔 Real-Time Updates** - See orders and bills update instantly via Supabase subscriptions
- **🔐 Secure Authentication** - Google OAuth and email-based authentication

### 👨‍💼 For Admins/Hosts
- **📊 Master Bill View** - See all orders across all participants
- **📤 Excel Export** - Download complete order data for accounting
- **🏪 Spot Management** - Create and manage event locations
- **👥 User Management** - Track who's at your spot and their orders
- **💳 Payment Status** - Mark payments as pending, paid, or partially paid

### 🛠️ Technical Features
- **Real-time Sync** - Powered by Supabase real-time subscriptions
- **Offline Support** - Service worker for PWA capabilities
- **Type Safety** - Full TypeScript implementation
- **Modern Build** - Vite for lightning-fast development

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** >= 18.0.0
- **npm** >= 9.0.0
- **Supabase Account** (free tier works)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/brocode-spot.git
   cd brocode-spot
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env` file in the root directory:
   ```env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```
   ### Environment Validation
   The backend validates environment variables at startup.
   If required variables are missing or invalid, the server will stop immediately with a clear error message.

4. **Set up Supabase**
   
   Run the SQL migrations in your Supabase SQL editor. The schema includes:
   - `profiles` - User profiles and authentication
   - `spots` - Event/party locations
   - `drinks`, `food`, `cigarettes` - Product catalogs
   - `payments` - Order and payment tracking
   - `drink_brands` - Brand management

5. **Start the development server**
   ```bash
   npm run dev
   ```

### Optional: Run the local backend API

This project now includes a lightweight Node.js backend in `backend/server.js` that provides starter APIs for:
- health check
- login (mock)
- catalog retrieval
- spot listing
- order creation/listing
- bill summary

Start it with:

```bash
npm run backend
```

Run frontend + backend together:

```bash
npm run dev:all
```

By default, the backend runs on `http://localhost:4000`.

6. **Open in browser**
   ```
   http://localhost:5173
   ```

### Building for Production

```bash
npm run build
npm run preview  # Preview the production build
```

---

## 🛠️ Tech Stack

| Category | Technology |
|----------|------------|
| **Frontend** | React 18, TypeScript, Vite |
| **Styling** | Tailwind CSS |
| **Backend** | Supabase (PostgreSQL + Auth + Realtime) |
| **State Management** | React Hooks, Context API |
| **Authentication** | Supabase Auth (Google OAuth, Email) |
| **Data Export** | XLSX.js |
| **Icons** | Lucide React |
| **Routing** | React Router v6 |

---

## 📁 Project Structure

```
brocode-spot/
├── components/          # Reusable UI components
│   ├── common/          # Button, Card, Modal, Input
│   └── ...
├── contexts/            # React Context providers
├── hooks/               # Custom React hooks
│   ├── useAuth.tsx      # Authentication hook
│   └── useSpot.tsx      # Spot management hook
├── pages/               # Page components
│   ├── AuthPage.tsx     # Login/signup
│   ├── DashboardPage.tsx # Main dashboard
│   ├── DrinksPage.tsx   # Order management
│   ├── SpotPage.tsx     # Spot details
│   └── BrowsePage.tsx   # Browse spots
├── services/            # API and database services
│   └── database.ts      # Supabase service layer
├── types/               # TypeScript type definitions
├── utils/               # Utility functions
└── lib/                 # Library configurations
    └── supabase.ts      # Supabase client setup
```

---

## 🔑 Key Concepts

### Spots
A "Spot" represents a party, event, or gathering location. Users can:
- Create spots (become admin)
- Join existing spots via code
- Browse and order items within a spot

### Ordering Flow
1. User joins/creates a spot
2. Browse available drinks, food, cigarettes
3. Add items to order
4. View personal bill
5. Admin can see master bill with all orders
6. Mark payments as complete

### User Roles
- **Admin** - Spot creator with full management access
- **User** - Regular participant who can order and view their bill

---

## 🤝 Contributing

We welcome contributions! This project is participating in **Apertre'26**, a month-long open-source contribution event.

Please read our [Contributing Guidelines](CONTRIBUTING.md) before submitting a Pull Request.

### Quick Start for Contributors

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Good First Issues

Look for issues labeled `good-first-issue` or `apertre3.0` to get started!

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- Built with ❤️ by the BroCode team
- Thanks to all Apertre'26 contributors
- Powered by [Supabase](https://supabase.com)

---

<div align="center">

**⭐ Star this repo if you find it helpful!**

Made with ❤️ by BroCode

</div>
