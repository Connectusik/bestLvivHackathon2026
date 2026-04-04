# Warehouse Logistics

A logistics management system for warehouses and deliveries — hackathon MVP skeleton.

## Tech Stack

- React + TypeScript
- Vite
- Tailwind CSS
- React Router
- React-Leaflet (OpenStreetMap)

## Quick Start

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Project Structure

```
src/
├── types/           # TypeScript interfaces (Warehouse, Truck, Supply, etc.)
├── data/            # Mock data with Ukrainian cities
├── hooks/           # useLocalStorage hook
├── components/
│   ├── layout/      # AdminLayout, Header, Sidebar
│   ├── map/         # MapPointDetails popup content
│   ├── trucks/      # TruckForm
│   ├── supplies/    # SupplyForm
│   ├── client/      # RequestForm
│   ├── worker/      # (extensible)
│   └── shared/      # DataTable, Modal, StatusBadge, EmptyState
└── pages/
    ├── RoleSelectionPage.tsx
    ├── admin/       # Map, Statistics, Trucks, Supplies pages
    ├── WorkerDashboard.tsx
    └── ClientDashboard.tsx
```

## Roles

| Role             | Path      | Features                                      |
|------------------|-----------|-----------------------------------------------|
| Admin            | /admin/*  | Map, Statistics (placeholder), Trucks CRUD, Supplies |
| Warehouse Worker | /worker   | Warehouse info, supplies/shipments, trucks    |
| Client           | /client   | Create delivery requests, view request list   |

## Data Persistence

Mock data is stored in localStorage — changes to trucks, supplies, and delivery requests persist across page reloads. Clear localStorage to reset to defaults.
