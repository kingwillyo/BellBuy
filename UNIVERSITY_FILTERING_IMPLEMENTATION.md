# University-Based Filtering Implementation

This document outlines the implementation of university-based filtering in the marketplace app.

## Overview

The implementation adds university-based filtering to ensure users only see products from their own university. This includes:

1. **Database Schema Changes**: Added university table and university_id columns
2. **Signup Form Updates**: Replaced hostel field with university dropdown
3. **Product Filtering**: All product queries now filter by university at the database level
4. **Seller Profile**: Displays university information on seller pages

## Database Changes

### 1. New Tables

- `universities` table with id, name, and created_at fields
- Bells University is pre-populated as the default university

### 2. Schema Updates

- Added `university_id` column to `profiles` table
- Added `university_id` column to `products` table
- Created indexes for better query performance

### 3. Functions and Triggers

- Updated `handle_new_user()` function to include university_id
- Updated `create_profile_if_not_exists()` function to include university_id
- Created `set_product_university()` trigger to automatically set university_id for new products

## Code Changes

### 1. Type Definitions (`types/profile.ts`)

- Added `university_id` to Profile, CreateProfileData, and UpdateProfileData interfaces
- Added University interface

### 2. Custom Hook (`hooks/useUserUniversity.ts`)

- New hook to fetch and manage user's university information
- Provides universityId, loading state, and error handling

### 3. Signup Form (`app/auth/signup.tsx`)

- Replaced hostel input with university dropdown
- Added university selection with Bells University as default
- Updated form validation and submission logic
- Added dropdown UI components and styles

### 4. Product Queries (Multiple Files)

Updated all product fetching to filter by university:

- `app/(tabs)/index.tsx` - Home screen
- `app/flash-sale.tsx` - Flash sale page
- `app/(tabs)/search.tsx` - Search screen
- `app/category/[name].tsx` - Category pages
- `hooks/useSuperFlashSaleProducts.tsx` - Super flash sale hook

### 5. Seller Profile (`app/seller/[id].tsx`)

- Updated seller profile query to include university information
- Added university display in seller profile UI
- Updated SellerProfile interface to include university data

## Key Features

### 1. Efficient Database Filtering

- All product queries use `.eq("university_id", universityId)` at the database level
- No frontend filtering required, ensuring fast performance
- Proper indexing for optimal query performance

### 2. Automatic Product Association

- New products automatically inherit the seller's university via database trigger
- No manual university selection needed during product creation

### 3. User Experience

- University selection during signup with dropdown interface
- University information displayed on seller profiles
- Seamless filtering without user intervention

### 4. Backward Compatibility

- Hostel field kept as optional for existing users
- Existing products and profiles updated with Bells University as default
- Gradual migration approach

## Database Migration

To apply these changes, run the SQL script in your Supabase SQL Editor:

```sql
-- Run the contents of add-university-filtering.sql
```

## Testing Checklist

- [ ] Run database migration
- [ ] Test new user signup with university selection
- [ ] Verify products are filtered by university on all screens
- [ ] Check seller profile displays university information
- [ ] Ensure product creation automatically sets university
- [ ] Test search and category filtering
- [ ] Verify flash sale and super flash sale filtering

## Future Enhancements

1. **Multiple Universities**: Easy to add more universities to the universities table
2. **University Management**: Admin interface to manage universities
3. **Cross-University Features**: Optional features to allow cross-university browsing
4. **University-Specific Settings**: Custom settings per university

## Performance Considerations

- Database indexes on university_id columns for fast filtering
- Efficient queries that filter at database level
- Minimal frontend processing required
- Proper error handling for missing university data

## Security

- Row Level Security (RLS) policies maintained
- University filtering prevents cross-university data access
- Proper validation of university_id in all queries
