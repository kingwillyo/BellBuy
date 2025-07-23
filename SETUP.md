# Supabase Setup Instructions

## 1. Database Setup

### Create the Profiles Table

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Run the SQL script from `supabase-setup.sql` to create the profiles table and set up Row Level Security (RLS)

### What the script does:

- Creates a `profiles` table with all required fields
- Sets up Row Level Security policies
- Creates indexes for better performance
- Adds automatic timestamp updates

## 2. Environment Configuration

Your Supabase credentials are already configured in `lib/supabase.ts`:

- URL: `https://pdehjhhuceqmltpvosfh.supabase.co`
- Anon Key: Already set

## 3. Features Implemented

### Authentication Flow

- ✅ Sign up with email/password
- ✅ Sign in with email/password
- ✅ Automatic redirect to signin for unauthenticated users
- ✅ Protected routes: `/sell`, `/account/*`, `/checkout`

### Profile Management

- ✅ Complete signup form with all required fields:
  - Full Name
  - Email
  - Password
  - Gender (Male/Female/Other)
  - Hostel
  - Phone Number
- ✅ Automatic profile creation in `profiles` table
- ✅ Form validation
- ✅ Error handling

### Route Protection

- ✅ `useAuth` hook that checks authentication status
- ✅ Loading screens while checking auth
- ✅ Automatic redirects to `/auth/signin`
- ✅ Protected routes return `null` if not authenticated

## 4. Testing the Implementation

1. **Test Sign Up:**

   - Navigate to `/auth/signup`
   - Fill out all fields
   - Submit the form
   - Check that user is created in Supabase Auth
   - Check that profile data is saved in `profiles` table

2. **Test Sign In:**

   - Navigate to `/auth/signin`
   - Use the credentials from signup
   - Should redirect to home page on success

3. **Test Protected Routes:**
   - Try accessing `/sell`, `/account`, or `/checkout` without signing in
   - Should redirect to `/auth/signin`
   - After signing in, should be able to access these routes

## 5. Database Schema

```sql
profiles table:
- id (UUID, references auth.users.id)
- full_name (TEXT, NOT NULL)
- email (TEXT, NOT NULL)
- gender (TEXT, CHECK constraint)
- hostel (TEXT, NOT NULL)
- phone (TEXT, NOT NULL)
- avatar_url (TEXT, optional)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

## 6. Security Features

- Row Level Security (RLS) enabled
- Users can only access their own profile data
- Automatic timestamp updates
- Input validation and sanitization
- Error handling for all database operations

## 7. Next Steps

You can now:

1. Test the complete authentication flow
2. Add profile editing functionality
3. Implement password reset
4. Add email verification handling
5. Create admin panels for user management

## Setting up Supabase Edge Functions for Secure Order Flow

1. At your project root, create a `supabase/functions` directory if it does not exist:
   ```sh
   mkdir -p supabase/functions/create_order
   ```
2. Place your Edge Function code in `supabase/functions/create_order/index.ts`.
3. Set your environment variables in the Supabase dashboard or `.env` file:
   - `PAYSTACK_SECRET_KEY`
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
4. Deploy the function using the Supabase CLI:
   ```sh
   supabase functions deploy create_order
   ```
