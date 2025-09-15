import Avatar from "@/components/Avatar";
import Header from "@/components/Header";
import { LoadingScreen } from "@/components/LoadingScreen";
import { ThemedText } from "@/components/ThemedText";
import { useAuth } from "@/hooks/useAuth";
import { useThemeColor } from "@/hooks/useThemeColor";
import { logger } from "@/lib/logger";
import { supabase } from "@/lib/supabase";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  View,
} from "react-native";

interface Conversation {
  id: string;
  receiver_id: string;
  receiver_profile: {
    full_name: string;
    avatar_url?: string;
  };
  last_message: string;
  last_message_time: string;
  unread_count?: number;
}

const ChatListScreen: React.FC = () => {
  const router = useRouter();
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const backgroundColor = useThemeColor(
    { light: "#fff", dark: "#000" },
    "background"
  );
  const cardBackground = useThemeColor(
    { light: "#fff", dark: "#1C1C1E" },
    "cardBackground"
  );

  const fetchConversations = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    // Query conversations and filter by messages where user is sender or receiver
    const { data, error } = await supabase
      .from("conversations")
      .select(
        `
          id,
          product_id,
          created_at,
          messages(content, created_at, sender_id, receiver_id, read_at)
        `
      )
      .order("created_at", { ascending: false });

    logger.debug(
      "Supabase conversations data fetched",
      { hasData: !!data, hasError: !!error, count: data?.length },
      { component: "ChatListScreen" }
    );

    if (error) {
      logger.error("Error fetching conversations", error, {
        component: "ChatListScreen",
      });
      setConversations([]);
      setLoading(false);
      return;
    }

    if (!data || data.length === 0) {
      setConversations([]);
      setLoading(false);
      return;
    }

    // Filter conversations that have messages with the current user
    const userConversations = data.filter(
      (convo: any) =>
        convo.messages &&
        convo.messages.some(
          (msg: any) => msg.sender_id === user.id || msg.receiver_id === user.id
        )
    );

    // Transform data for UI
    const transformed = await Promise.all(
      userConversations.map(async (convo: any) => {
        // Find the other participant from messages
        const userMessages = convo.messages.filter(
          (msg: any) => msg.sender_id === user.id || msg.receiver_id === user.id
        );

        // Get the other participant ID from the first message
        const firstMessage = userMessages[0];
        const receiverId =
          firstMessage?.sender_id === user.id
            ? firstMessage?.receiver_id
            : firstMessage?.sender_id;

        // Fetch receiver profile
        let receiver_profile = {
          full_name: "Unknown User",
          avatar_url: undefined,
        };

        if (receiverId) {
          const { data: profileData } = await supabase
            .from("profiles")
            .select("full_name, avatar_url")
            .eq("id", receiverId)
            .maybeSingle();
          receiver_profile = profileData || {
            full_name: "Unknown User",
            avatar_url: undefined,
          };
        }

        // Sort messages by created_at in descending order to get the newest first
        const sortedMessages = userMessages.sort(
          (a: any, b: any) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

        const lastMsg = sortedMessages.length > 0 ? sortedMessages[0] : null;

        // Calculate unread count for this conversation
        const unreadCount = userMessages.filter(
          (msg: any) => msg.sender_id !== user.id && !msg.read_at
        ).length;

        return {
          id: convo.id,
          receiver_id: receiverId,
          receiver_profile,
          last_message: lastMsg ? lastMsg.content : "No messages yet.",
          last_message_time: lastMsg ? lastMsg.created_at : "",
          conversation_created_at: convo.created_at,
          unread_count: unreadCount,
        };
      })
    );

    // Sort conversations by most recent message activity
    const sortedConversations = transformed.sort((a, b) => {
      // Use last message time if available, otherwise use conversation creation time
      const aTime = a.last_message_time
        ? new Date(a.last_message_time).getTime()
        : new Date(a.conversation_created_at || 0).getTime();
      const bTime = b.last_message_time
        ? new Date(b.last_message_time).getTime()
        : new Date(b.conversation_created_at || 0).getTime();
      return bTime - aTime; // Most recent first
    });

    setConversations(sortedConversations);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (!user) return;

    // Initial fetch
    fetchConversations();

    // Subscribe to real-time updates

    const messagesChannel = supabase
      .channel("messages-list")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          // Update last message and timestamp for the specific conversation
          const { conversation_id, content, created_at, sender_id } =
            payload.new;
          logger.debug(
            "New message received",
            { conversation_id, hasSender: !!sender_id },
            { component: "ChatListScreen" }
          );
          if (conversation_id) {
            setConversations((prev) => {
              // Find the conversation and move it to the top
              const updatedConversations = prev.map((conv) =>
                conv.id === conversation_id
                  ? {
                      ...conv,
                      last_message: content,
                      last_message_time: created_at,
                      // Increment unread count if message is not from current user
                      unread_count:
                        sender_id !== user.id
                          ? (conv.unread_count || 0) + 1
                          : conv.unread_count,
                    }
                  : conv
              );

              // Move the updated conversation to the top
              const updatedConv = updatedConversations.find(
                (conv) => conv.id === conversation_id
              );
              const otherConvs = updatedConversations.filter(
                (conv) => conv.id !== conversation_id
              );

              return updatedConv
                ? [updatedConv, ...otherConvs]
                : updatedConversations;
            });
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          // Update last message if it was edited
          const { conversation_id, content, created_at } = payload.new;
          if (conversation_id) {
            setConversations((prev) =>
              prev.map((conv) =>
                conv.id === conversation_id
                  ? {
                      ...conv,
                      last_message: content,
                      last_message_time: created_at,
                    }
                  : conv
              )
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messagesChannel);
    };
  }, [user, fetchConversations]);

  // Refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchConversations();
    }, [fetchConversations])
  );

  const renderItem = ({ item }: { item: any }) => {
    const otherUser = item.receiver_profile;
    return (
      <Pressable
        style={[styles.itemContainer, { backgroundColor: cardBackground }]}
        onPress={() =>
          router.push({
            pathname: "/chat/ChatScreen",
            params: { conversationId: item.id, receiver_id: item.receiver_id },
          })
        }
      >
        <Avatar
          uri={otherUser?.avatar_url}
          size={48}
          style={{ marginRight: 12 }}
        />
        <View style={{ flex: 1 }}>
          <ThemedText style={styles.name}>{otherUser?.full_name}</ThemedText>
          <ThemedText
            style={styles.lastMessage}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {item.last_message}
          </ThemedText>
        </View>
        {item.unread_count > 0 && (
          <View
            style={{
              backgroundColor: "#FF3B30",
              borderRadius: 12,
              paddingHorizontal: 8,
              paddingVertical: 2,
              marginLeft: 8,
              minWidth: 24,
              alignItems: "center",
            }}
          >
            <ThemedText
              style={{ color: "#fff", fontWeight: "bold", fontSize: 12 }}
            >
              {item.unread_count}
            </ThemedText>
          </View>
        )}
        <ThemedText style={styles.timestamp}>
          {item.last_message_time
            ? formatTimestamp(item.last_message_time)
            : ""}
        </ThemedText>
      </Pressable>
    );
  };

  // Remove the default navigation header if using expo-router
  React.useLayoutEffect(() => {
    // This is handled by the Stack.Screen options in _layout.tsx
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor }}>
        <Header title="Chats" showBackButton />
        <LoadingScreen />
      </View>
    );
  }

  if (conversations.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor }}>
        <Header title="Chats" showBackButton />
        <View style={styles.emptyContainer}>
          <ThemedText style={{ textAlign: "center" }}>
            No conversations yet.
          </ThemedText>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor }}>
      <Header title="Chats" showBackButton />
      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 16 }}
      />
    </View>
  );
};

function formatTimestamp(ts: string) {
  const date = new Date(ts);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

const styles = StyleSheet.create({
  itemContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 14,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  name: {
    fontWeight: "600",
    fontSize: 16,
    marginBottom: 2,
  },
  lastMessage: {
    color: "#888",
    fontSize: 14,
  },
  timestamp: {
    color: "#aaa",
    fontSize: 12,
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
});

export default ChatListScreen;
