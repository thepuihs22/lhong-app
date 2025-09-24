# Supabase Setup Guide

## 1. Create Supabase Account
- Go to [https://supabase.com/dashboard/signup](https://supabase.com/dashboard/signup)
- Sign up with GitHub or email
- Verify your account

## 2. Create New Project
- Click "New Project" in dashboard
- Project name: `restaurant-management-app`
- Choose region closest to your users
- Create strong database password (save it!)

## 3. Get Project Credentials
- Go to Settings → API
- Copy Project URL and Anon Key

## 4. Create Environment File
Create `.env.local` in your project root with:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

## 5. Database Schema
Run the SQL commands in the Supabase SQL Editor to create the required tables for the restaurant management app.
