# Lhong Restaurant Management App

A comprehensive restaurant management system built with Next.js, React, and Supabase. This app provides a complete solution for restaurant operations including public menu display, staff order management, and admin dashboard for tracking orders and expenses.

## Features

### Public Features
- **Beautiful Menu Display**: Responsive, category-filtered menu with prices and descriptions
- **Restaurant Information**: Contact details, hours, and location
- **Modern UI**: Clean, professional design with orange/amber color scheme

### Staff Features
- **Order Management**: Create new orders (dine-in or delivery)
- **Order Tracking**: View and update order status (pending → preparing → ready → completed)
- **Customer Information**: Capture customer name and phone number
- **Menu Integration**: Select items from available menu with quantity controls

### Admin Features
- **Dashboard**: Overview of daily orders with statistics
- **Order Management**: View all orders with status updates
- **Expense Tracking**: Add and manage restaurant expenses by category
- **Purchase Management**: Track supplier purchases and inventory
- **Date Filtering**: View data by specific dates

## Technology Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Authentication, Real-time)
- **UI Components**: Custom components with responsive design
- **Notifications**: React Hot Toast

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm, yarn, or pnpm
- Supabase account

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd lhong-app
npm install
# or
yarn install
# or
pnpm install
```

### 2. Set Up Supabase

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Copy your project URL and anon key
3. Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Set Up Database

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy and run the contents of `database-schema.sql` to create all necessary tables, policies, and sample data

### 4. Create Admin User

1. Sign up for a new account through the login page
2. Go to your Supabase dashboard → Authentication → Users
3. Find your user and note the ID
4. Run this SQL to make yourself an admin:

```sql
UPDATE profiles SET role = 'admin' WHERE email = 'your-email@example.com';
```

### 5. Run the Development Server

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to see the restaurant homepage.

## Usage

### Public Access
- Visit the homepage to see the restaurant menu
- Browse menu items by category
- View restaurant information and contact details

### Staff Login
- Click "Staff Login" on the homepage
- Sign in with staff credentials
- Access order management dashboard
- Create new orders and update order status

### Admin Login
- Sign in with admin credentials
- Access admin dashboard to view order statistics
- Navigate to expenses page to manage costs and purchases
- Update order statuses and view detailed reports

## Database Schema

The app uses the following main tables:

- **profiles**: User accounts with role-based access (staff/admin)
- **menu_items**: Restaurant menu with categories and pricing
- **orders**: Customer orders with status tracking
- **order_items**: Individual items within each order
- **expenses**: Restaurant expenses by category
- **purchases**: Supplier purchases and inventory

## Security

- Row Level Security (RLS) enabled on all tables
- Role-based access control (staff vs admin permissions)
- Secure authentication through Supabase Auth
- Protected routes with automatic redirects

## Customization

### Menu Items
- Add/edit menu items through Supabase dashboard
- Update categories, prices, and availability
- Add images by updating the `image_url` field

### Restaurant Information
- Update restaurant name, address, and contact info in the homepage component
- Modify hours and location details
- Customize the color scheme in Tailwind classes

### User Roles
- Staff: Can create and manage orders
- Admin: Full access to dashboard, orders, expenses, and purchases

## Deployment

### Vercel (Recommended)
1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy automatically

### Other Platforms
The app can be deployed to any platform that supports Next.js:
- Netlify
- Railway
- DigitalOcean App Platform
- AWS Amplify

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support or questions, please open an issue in the GitHub repository.