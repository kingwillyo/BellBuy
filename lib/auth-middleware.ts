import { logger } from "./logger";
import { supabase } from "./supabase";

export interface AuthenticatedUser {
  id: string;
  email: string;
  role?: string;
  isAdmin: boolean;
}

export interface AuthContext {
  user: AuthenticatedUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

/**
 * Server-side authentication middleware
 * Validates JWT tokens and returns user context
 */
export class AuthMiddleware {
  /**
   * Validate JWT token and get user context
   */
  static async validateToken(accessToken: string): Promise<AuthContext> {
    try {
      if (!accessToken) {
        return {
          user: null,
          isAuthenticated: false,
          isLoading: false,
        };
      }

      // Verify the JWT token with Supabase
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser(accessToken);

      if (error || !user) {
        logger.warn("Invalid JWT token", { error: error?.message });
        return {
          user: null,
          isAuthenticated: false,
          isLoading: false,
        };
      }

      // Get user profile with role information
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profileError) {
        logger.warn("Failed to fetch user profile", {
          error: profileError.message,
        });
      }

      const authenticatedUser: AuthenticatedUser = {
        id: user.id,
        email: user.email || "",
        role: profile?.role || "user",
        isAdmin: profile?.role === "admin",
      };

      return {
        user: authenticatedUser,
        isAuthenticated: true,
        isLoading: false,
      };
    } catch (error) {
      logger.error("Token validation failed", error);
      return {
        user: null,
        isAuthenticated: false,
        isLoading: false,
      };
    }
  }

  /**
   * Check if user has admin privileges
   */
  static async isAdmin(accessToken: string): Promise<boolean> {
    const authContext = await this.validateToken(accessToken);
    return authContext.isAuthenticated && authContext.user?.isAdmin === true;
  }

  /**
   * Check if user owns a resource
   */
  static async ownsResource(
    accessToken: string,
    resourceUserId: string
  ): Promise<boolean> {
    const authContext = await this.validateToken(accessToken);
    return (
      authContext.isAuthenticated && authContext.user?.id === resourceUserId
    );
  }

  /**
   * Check if user can access order (as buyer or seller)
   */
  static async canAccessOrder(
    accessToken: string,
    orderUserId: string,
    orderSellerId: string
  ): Promise<boolean> {
    const authContext = await this.validateToken(accessToken);
    if (!authContext.isAuthenticated || !authContext.user) {
      return false;
    }

    return (
      authContext.user.id === orderUserId ||
      authContext.user.id === orderSellerId
    );
  }

  /**
   * Require authentication - throws error if not authenticated
   */
  static async requireAuth(accessToken: string): Promise<AuthenticatedUser> {
    const authContext = await this.validateToken(accessToken);

    if (!authContext.isAuthenticated || !authContext.user) {
      throw new Error("Authentication required");
    }

    return authContext.user;
  }

  /**
   * Require admin privileges - throws error if not admin
   */
  static async requireAdmin(accessToken: string): Promise<AuthenticatedUser> {
    const user = await this.requireAuth(accessToken);

    if (!user.isAdmin) {
      throw new Error("Admin privileges required");
    }

    return user;
  }
}

/**
 * Secure database operations with automatic user context
 */
export class SecureDatabase {
  private accessToken: string;
  private user: AuthenticatedUser | null = null;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  /**
   * Initialize user context
   */
  async initialize(): Promise<void> {
    const authContext = await AuthMiddleware.validateToken(this.accessToken);
    this.user = authContext.user;
  }

  /**
   * Get authenticated Supabase client with user context
   */
  getClient() {
    if (!this.user) {
      throw new Error(
        "Database client not initialized. Call initialize() first."
      );
    }

    return supabase;
  }

  /**
   * Secure query that automatically applies user context
   */
  async secureQuery<T>(
    operation: (client: typeof supabase) => Promise<T>
  ): Promise<T> {
    if (!this.user) {
      throw new Error("User not authenticated");
    }

    try {
      return await operation(supabase);
    } catch (error) {
      logger.error("Secure database operation failed", error);
      throw error;
    }
  }

  /**
   * Get current user ID (throws if not authenticated)
   */
  getUserId(): string {
    if (!this.user) {
      throw new Error("User not authenticated");
    }
    return this.user.id;
  }

  /**
   * Check if current user is admin
   */
  isAdmin(): boolean {
    return this.user?.isAdmin === true;
  }
}
