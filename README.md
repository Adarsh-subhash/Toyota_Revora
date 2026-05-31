# Toyota Revora - Performance in Motion
**SDE Internship - Round 2 Submission | Task 2**

A production-ready full-stack web app for managing and calculating tiered sales incentives for Toyota Sales Officers. Built with React, Vite, and PostgreSQL (via Supabase).

## 🔗 Live Demo
→ []

## 🔐 Test Credentials
| Role | Passcode |
| :--- | :--- |
| **Admin** | `akira.tanaka@toyota.in` | 'admin123' |
| **Sales Officer** | 'rohan.sharma@toyota.in' | `sales123` |

*(Note: Select your role/profile from the Login Portal. No email is required.)*

## 🧠 How It Works
The Admin sets up tiered incentive slabs and manages the car model inventory (including individual variants and photos).
The Sales Officer logs their monthly sales per car model and sees their payout update in real time based on progressive tier calculations.

**Progressive Slab Calculation Example:**
| Cars Sold | Rate | Payout |
| :--- | :--- | :--- |
| 1 - 3 | ₹1,000/car | ₹3,000 max |
| 4 - 7 | ₹2,000/car | ₹8,000 max |
| 8+ | ₹3,500/car | Unlimited |

*(Example: If a rep sells 5 cars, the first 3 are paid at ₹1,000, and the next 2 at ₹2,000 for a total of ₹7,000).*

Admins can change the full slab structure dynamically whenever they need to.

## ⚙️ Tech Stack
| Layer | Technology |
| :--- | :--- |
| **Frontend** | React 18, Vite, Vanilla CSS |
| **Backend / Database** | PostgreSQL via Supabase |
| **Storage** | Supabase Storage (Public Buckets) |
| **Auth** | Passcode / Role-Based Simulation |
| **Hosting** | (Designed for Vercel/Netlify) |

## 🏗️ Architecture
```text
src/
├── components/          # UI widgets & views
│   ├── AdminConsole.jsx # Admin dashboard & DB controls
│   ├── OfficerConsole.jsx# Sales input & payout tracking
│   ├── Header.jsx       # App navigation & branding
│   └── LoginPortal.jsx  # Role selection portal
├── assets/              # Default UI graphics
├── App.jsx              # Core logic, DB syncing, & Routing
├── index.css            # Custom styling & animations
└── main.jsx             # React DOM entry
```
**Database Schema (Supabase)**: `toyota_slabs`, `toyota_inventory`, `toyota_activities`. (Synced directly via Supabase JS Client).

## 🚀 Local Setup

**Prerequisites**
- Node.js 18+
- Supabase account (free tier works)

### 1. Clone
```bash
git clone <https://github.com/Adarsh-subhash/Toyota_Revora>
cd <your-repo-folder>
```

### 2. Database & Storage Setup (Supabase)
1. Create a new project at supabase.com
2. Open the **SQL Editor** in your Supabase dashboard.
3. Run the provided `schema.sql` to generate the necessary tables.
4. Run the provided `migration_fix_inventory_id.sql` to initialize the `car-images` storage bucket and set policies.

### 3. Environment Variables
Create a `.env` file in the root directory:
```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Run Locally
```bash
npm install
npm run dev
# App runs at http://localhost:5173
```

## ✅ Features Implemented

**Admin Portal**
- Car model management (Add / Delete / Edit Models & Variants)
- Image uploads directly to Supabase Storage Bucket
- Dynamic progressive incentive slab configuration (Slab Engine)
- View global sales metrics, region data, and recent activities
- "Impersonate" mode to view live performance charts of specific officers

**Sales Officer Portal**
- Monthly sales entry per car model with persistent backend storage
- Real-time progressive incentive tracker
- Live tier highlight for the current slab
- Visual dashboard showing rank, speed, and history

**System**
- Built without bulky UI libraries (Pure CSS for maximum performance)
- Real-time fallback image loading
- Responsive design
- Global Toast Notifications

## 👨‍💻 Submitted by
**Adarsh Subhash**

