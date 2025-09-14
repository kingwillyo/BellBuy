import { AuthMiddleware, AuthenticatedUser } from "./auth-middleware";
import { logger } from "./logger";

export interface ApiRequest {
  method: string;
  headers: Record<string, string>;
  body?: any;
  query?: Record<string, string>;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  statusCode: number;
}

export class ApiHandler {
  /**
   * Handle API requests with authentication
   */
  static async handleRequest<T>(
    request: ApiRequest,
    handler: (user: AuthenticatedUser, request: ApiRequest) => Promise<T>
  ): Promise<ApiResponse<T>> {
    try {
      // Extract access token from Authorization header
      const authHeader =
        request.headers.authorization || request.headers.Authorization;
      const accessToken =
        authHeader?.replace("Bearer ", "") ||
        authHeader?.replace("bearer ", "");

      if (!accessToken) {
        return {
          success: false,
          error: "Authentication required",
          statusCode: 401,
        };
      }

      // Validate token and get user context
      const authContext = await AuthMiddleware.validateToken(accessToken);

      if (!authContext.isAuthenticated || !authContext.user) {
        return {
          success: false,
          error: "Invalid or expired token",
          statusCode: 401,
        };
      }

      // Execute the handler with authenticated user context
      const data = await handler(authContext.user, request);

      return {
        success: true,
        data,
        statusCode: 200,
      };
    } catch (error) {
      logger.error("API request failed", error, { component: "ApiHandler" });

      return {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
        statusCode: 500,
      };
    }
  }

  /**
   * Handle API requests requiring admin privileges
   */
  static async handleAdminRequest<T>(
    request: ApiRequest,
    handler: (user: AuthenticatedUser, request: ApiRequest) => Promise<T>
  ): Promise<ApiResponse<T>> {
    try {
      const authHeader =
        request.headers.authorization || request.headers.Authorization;
      const accessToken =
        authHeader?.replace("Bearer ", "") ||
        authHeader?.replace("bearer ", "");

      if (!accessToken) {
        return {
          success: false,
          error: "Authentication required",
          statusCode: 401,
        };
      }

      // Require admin privileges
      const user = await AuthMiddleware.requireAdmin(accessToken);

      // Execute the handler with admin user context
      const data = await handler(user, request);

      return {
        success: true,
        data,
        statusCode: 200,
      };
    } catch (error) {
      logger.error("Admin API request failed", error, {
        component: "ApiHandler",
      });

      if (
        error instanceof Error &&
        error.message === "Admin privileges required"
      ) {
        return {
          success: false,
          error: "Admin privileges required",
          statusCode: 403,
        };
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
        statusCode: 500,
      };
    }
  }

  /**
   * Handle API requests with resource ownership validation
   */
  static async handleResourceRequest<T>(
    request: ApiRequest,
    resourceUserId: string,
    handler: (user: AuthenticatedUser, request: ApiRequest) => Promise<T>
  ): Promise<ApiResponse<T>> {
    try {
      const authHeader =
        request.headers.authorization || request.headers.Authorization;
      const accessToken =
        authHeader?.replace("Bearer ", "") ||
        authHeader?.replace("bearer ", "");

      if (!accessToken) {
        return {
          success: false,
          error: "Authentication required",
          statusCode: 401,
        };
      }

      // Validate token and check resource ownership
      const user = await AuthMiddleware.requireAuth(accessToken);

      // Check if user owns the resource or is admin
      if (user.id !== resourceUserId && !user.isAdmin) {
        return {
          success: false,
          error: "Access denied - insufficient permissions",
          statusCode: 403,
        };
      }

      // Execute the handler with validated user context
      const data = await handler(user, request);

      return {
        success: true,
        data,
        statusCode: 200,
      };
    } catch (error) {
      logger.error("Resource API request failed", error, {
        component: "ApiHandler",
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
        statusCode: 500,
      };
    }
  }

  /**
   * Create CORS headers for API responses
   */
  static getCorsHeaders(): Record<string, string> {
    return {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Max-Age": "86400",
    };
  }

  /**
   * Handle preflight OPTIONS requests
   */
  static handleOptionsRequest(): ApiResponse {
    return {
      success: true,
      statusCode: 200,
    };
  }
}
