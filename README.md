# BellsBuy - Campus Marketplace App

A modern, cross-platform marketplace app built for university students to buy and sell items within their campus community. Built with React Native, Expo, and Supabase.

![GitHub License](https://img.shields.io/github/license/kingwillyo/bellbuy)

## 🌟 Features

### Core Functionality

- **User Authentication** - Secure signup/signin with university verification
- **Product Listings** - Create, edit, and manage product listings with multiple images
- **Shopping Cart** - Add items to cart with persistent storage
- **Wishlist** - Save favorite products for later
- **Search & Filter** - Find products by name, category, or university
- **Real-time Chat** - Direct messaging between buyers and sellers
- **Order Management** - Track orders and manage seller orders
- **Reviews & Ratings** - Rate and review products and sellers

### Campus-Specific Features

- **University-based Filtering** - Products filtered by user's university
- **Flash Sales** - Featured listings with special promotions
- **Category Browsing** - Electronics, Fashion, Books, Food, Sports, Furniture, etc.
- **Hot at Campus** - Trending products in your university
- **Profile Management** - University, department, and level verification

### Technical Features

- **Offline Support** - Works offline with data caching and retry mechanisms
- **Image Upload** - Compress and upload multiple product images
- **Push Notifications** - Real-time updates for messages and orders
- **Dark/Light Theme** - Automatic theme switching
- **Responsive Design** - Optimized for different screen sizes
- **Security** - Row Level Security (RLS) policies and input sanitization

## 🚀 Tech Stack

### Frontend

- **React Native** - Cross-platform mobile development
- **Expo** - Development platform and tools
- **TypeScript** - Type-safe JavaScript
- **Expo Router** - File-based navigation
- **React Navigation** - Navigation components

### Backend & Database

- **Supabase** - Backend-as-a-Service
- **PostgreSQL** - Database with Row Level Security
- **Supabase Storage** - Image and file storage
- **Supabase Auth** - User authentication
- **Supabase Realtime** - Real-time subscriptions

### UI/UX

- **Custom Components** - Themed components with dark/light mode
- **Expo Vector Icons** - Icon library
- **React Native Reanimated** - Smooth animations
- **React Native Gesture Handler** - Touch interactions

## 📱 App Screenshots

<p align="center">
  
  <img src="https://github.com/user-attachments/assets/d5980826-def2-44b1-acdd-b792db26d1cb" alt="Onboarding Screen" width="30%" style="padding: 5px;">
  <img src="https://github.com/user-attachments/assets/eafe1792-6831-4611-88fa-fffb1e29dea6" alt="Main Feed Screen" width="30%" style="padding: 5px;">
  <img src="https://github.com/user-attachments/assets/cb346ac0-bc93-47e9-bedc-39168f9283f8" alt="Search/Explore Screen" width="30%" style="padding: 5px;">
</p>

<p align="center">
  
  <img src="https://github.com/user-attachments/assets/4a6390f5-e789-4fb0-b292-0efd12136c14" alt="Post Detail View" width="30%" style="padding: 5px;">
  <img src="https://github.com/user-attachments/assets/bb220564-bf5a-4546-a880-c6b71230fde6" alt="Content Creation Flow 1" width="30%" style="padding: 5px;">
  <img src="https://github.com/user-attachments/assets/55401fa9-c1ea-42be-af6c-e3e05f5e89dd" alt="Content Creation Flow 2" width="30%" style="padding: 5px;">
</p>

<p align="center">
  
  <img src="https://github.com/user-attachments/assets/8eb7ed0a-6903-42b6-99a3-69b2c452cbd4" alt="Messaging/Comment Screen" width="30%" style="padding: 5px;">
  <img src="https://github.com/user-attachments/assets/b0a850e9-bc83-4668-8b1b-72074d712227" alt="Filter/Sort Options" width="30%" style="padding: 5px;">
  <img src="https://github.com/user-attachments/assets/31cb9e3d-9341-4f9e-a43e-93fa2ee08e24" alt="Notifications Screen" width="30%" style="padding: 5px;">
</p>

<p align="center">
  
  <img src="https://github.com/user-attachments/assets/c6882fe8-c449-444b-bf3c-09fd278d0a3d" alt="User Profile View" width="30%" style="padding: 5px;">
  <img src="https://github.com/user-attachments/assets/5c3d2680-d38f-4740-9c72-933e6ed84b5e" alt="Profile Settings 1" width="30%" style="padding: 5px;">
  <img src="https://github.com/user-attachments/assets/19d840dc-8654-4b72-bcde-37336cdc6cf9" alt="Profile Settings 2" width="30%" style="padding: 5px;">
</p>

<p align="center">
  
  <img src="https://github.com/user-attachments/assets/5447d123-2ad6-4de2-b26a-7df8aac5be77" alt="App Settings" width="30%" style="padding: 5px;">
  <img src="https://github.com/user-attachments/assets/bf793d2d-335b-493c-89d4-8319ea384432" alt="Language Selection" width="30%" style="padding: 5px;">
  <img src="https://github.com/user-attachments/assets/7c6866a4-8f2f-4dff-ac3e-a8a1306b5849" alt="Help/About Screen" width="30%" style="padding: 5px;">
</p>

<p align="center">
  
  <img src="https://github.com/user-attachments/assets/39b6bf3a-a507-4dfb-acb9-6608f3ab613a" alt="Search Results Screen" width="30%" style="padding: 5px;">
  <img src="https://github.com/user-attachments/assets/f2d33e7f-9ea8-4462-9efb-c5b689beba50" alt="Detail Pop-up" width="30%" style="padding: 5px;">
  <img src="https://github.com/user-attachments/assets/038d0342-b663-44d6-a27a-55c48b51a72c" alt="Empty State View" width="30%" style="padding: 5px;">
</p>

<p align="center">
  
  <img src="https://github.com/user-attachments/assets/3d7086e3-e8a6-42a3-ab84-0323eb5bbea0" alt="Final Screen 1" width="30%" style="padding: 5px;">
  <img src="https://github.com/user-attachments/assets/3b15a465-c926-4f83-a727-34e22c078204" alt="Final Screen 2" width="30%" style="padding: 5px;">
  <img src="https://github.com/user-attachments/assets/044e784d-d6f0-4ca8-ac43-8fe7cb7b9902" alt="Final Screen 3" width="30%" style="padding: 5px;">
</p>

<p align="center">
  
  <img src="https://github.com/user-attachments/assets/1853f429-3d3c-4c0f-b357-4ba3dade2ce0" alt="Last Screen" width="30%" style="padding: 5px;">
</p>

## 🛠️ Installation & Setup

### Prerequisites

- Node.js (v18 or later)
- npm or yarn
- Expo CLI
- iOS Simulator (for iOS development)
- Android Studio (for Android development)

### Environment Setup

1. **Clone the repository**

   ```bash
   git clone https://github.com/your-username/bellsbuy.git
   cd bellsbuy/Bells
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file in the `Bells` directory:

   ```env
   EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   ```

4. **Set up Supabase**
   - Create a new Supabase project
   - Run the database migrations from the `migrations/` folder
   - Set up storage buckets for `product-images` and `profile-images`
   - Configure Row Level Security policies

### Database Setup

1. **Run migrations**

   ```bash
   # Apply the main RLS policies
   node scripts/apply-migration.js migrations/001_enable_rls_policies.sql

   # Apply any additional migrations
   node scripts/apply-migration.js migrations/002_fix_conversations_rls.sql
   ```

2. **Set up storage buckets**
   - Create `product-images` bucket in Supabase Storage
   - Create `profile-images` bucket in Supabase Storage
   - Configure public access policies for these buckets

### Development

1. **Start the development server**

   ```bash
   npm start
   ```

2. **Run on specific platforms**

   ```bash
   # iOS
   npm run ios

   # Android
   npm run android

   # Web
   npm run web
   ```

## 📁 Project Structure

```
Bells/
├── app/                    # Expo Router app directory
│   ├── (tabs)/            # Tab navigation screens
│   ├── auth/              # Authentication screens
│   ├── account/           # User account management
│   ├── chat/              # Messaging functionality
│   ├── category/          # Product categories
│   └── product/           # Product detail screens
├── components/            # Reusable UI components
│   ├── ui/               # Basic UI components
│   └── ...               # Feature-specific components
├── hooks/                # Custom React hooks
├── lib/                  # Utility libraries
│   ├── supabase.ts       # Supabase configuration
│   ├── auth-middleware.ts # Authentication utilities
│   └── networkUtils.ts   # Network handling
├── migrations/           # Database migration files
├── types/               # TypeScript type definitions
├── constants/           # App constants and themes
└── scripts/            # Build and utility scripts
```

## 🔧 Configuration

### Supabase Configuration

- **Database**: PostgreSQL with Row Level Security
- **Authentication**: Email/password with university verification
- **Storage**: Two buckets for product and profile images
- **Realtime**: Enabled for chat and notifications

### App Configuration

- **Bundle ID**: `com.kingwillyo.Marketplace`
- **Minimum iOS**: 15.5
- **Target Platforms**: iOS, Android, Web
- **Navigation**: File-based routing with Expo Router

## 🚀 Deployment

### EAS Build

```bash
# Install EAS CLI
npm install -g @expo/eas-cli

# Login to Expo
eas login

# Configure build
eas build:configure

# Build for production
eas build --platform all
```

### App Store Deployment

1. Build the app using EAS Build
2. Submit to App Store Connect (iOS) or Google Play Console (Android)
3. Configure app store metadata and screenshots

## 🔐 Security Features

- **Row Level Security (RLS)** - Database-level access control
- **Input Sanitization** - Protection against XSS and injection attacks
- **Secure Image Upload** - Validated file types and sizes
- **Authentication Middleware** - Protected routes and API calls
- **Environment Variables** - Sensitive data protection

## 📊 Database Schema

### Key Tables

- `profiles` - User profiles with university information
- `products` - Product listings with images and metadata
- `orders` - Order management and tracking
- `cart_items` - Shopping cart functionality
- `wishlist` - User wishlists
- `conversations` & `messages` - Real-time chat system
- `product_reviews` - Product and seller reviews
- `universities` - University data and verification

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow TypeScript best practices
- Use the established component patterns
- Add proper error handling and loading states
- Test on both iOS and Android
- Update documentation for new features

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Expo](https://expo.dev/)
- Powered by [Supabase](https://supabase.com/)
- UI components inspired by modern design systems
- Icons from [Expo Vector Icons](https://icons.expo.fyi/)

## 📞 Support

For support, email support@bellsbuy.com or join our Discord community.

## 🗺️ Roadmap

- [ ] Push notifications for real-time updates
- [ ] Advanced search filters and sorting
- [ ] Seller analytics dashboard
- [ ] Payment integration (Paystack)
- [ ] Multi-language support
- [ ] Admin panel for moderation
- [ ] API for third-party integrations

---

**Made with ❤️ for the campus community**
