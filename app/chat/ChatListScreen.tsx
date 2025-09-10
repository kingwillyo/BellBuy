import Avatar from "@/components/Avatar";
import Header from "@/components/Header";
import { LoadingScreen } from "@/components/LoadingScreen";
import { ThemedText } from "@/components/ThemedText";
import { useAuth } from "@/hooks/useAuth";
import { useThemeColor } from "@/hooks/useThemeColor";
import { supabase } from "@/lib/supabase";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
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

  useEffect(() => {
    if (!user) return;

    const fetchConversations = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("conversation_participants")
        .select(
          `
          conversation_id,
          role,
          conversation:conversations(
            id,
            product_id,
            created_at,
            unread_count,
            participants:conversation_participants(user_id, role, joined_at, user_id),
            messages(content, created_at, sender_id)
          )
        `
        )
        .eq("user_id", user.id)
        .order("joined_at", { ascending: false });
      console.log("Supabase conversations data:", data, "error:", error);
      if (error || !data) {
        setConversations([]);
        setLoading(false);
        return;
      }
      // Transform data for UI
      const transformed = await Promise.all(
        data.map(async (row: any) => {
          const convo = row.conversation;
          const otherParticipant = convo.participants.find(
            (p: any) => p.user_id !== user.id
          );
          let receiver_profile = {
            full_name: "Unknown User",
            avatar_url: undefined,
          };
          if (otherParticipant) {
            const { data: profileData } = await supabase
              .from("profiles")
              .select("full_name, avatar_url")
              .eq("id", otherParticipant.user_id)
              .maybeSingle();
            receiver_profile = profileData || {
              full_name: "Unknown User",
              avatar_url: undefined,
            };
          }
          const lastMsg =
            convo.messages?.length > 0
              ? convo.messages[convo.messages.length - 1]
              : null;

          // Fetch unread_count from user_conversation_unread table
          const { data: unreadData } = await supabase
            .from("user_conversation_unread")
            .select("unread_count")
            .eq("conversation_id", convo.id)
            .eq("user_id", user.id)
            .maybeSingle();

          return {
            id: convo.id,
            receiver_id: otherParticipant?.user_id,
            receiver_profile,
            last_message: lastMsg ? lastMsg.content : "No messages yet.",
            last_message_time: lastMsg ? lastMsg.created_at : "",
            unread_count: unreadData?.unread_count || 0,
          };
        })
      );
      setConversations(transformed);
      setLoading(false);
    };

    // Initial fetch
    fetchConversations();

    // Subscribe to real-time updates
    const unreadChannel = supabase
      .channel("user-unread-list")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_conversation_unread",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          // Refetch conversations when user's unread counts change
          fetchConversations();
        }
      )
      .subscribe();

    const messagesChannel = supabase
      .channel("messages-list")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        () => {
          // Refetch conversations when new messages arrive
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(unreadChannel);
      supabase.removeChannel(messagesChannel);
    };
  }, [user]);

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
      <SafeAreaView style={{ flex: 1, backgroundColor }}>
        <Header
          title="Chats"
          showBackButton
          style={{ marginTop: 0, paddingTop: 0 }}
        />
        <LoadingScreen />
      </SafeAreaView>
    );
  }

  if (conversations.length === 0) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor }}>
        <Header
          title="Chats"
          showBackButton
          style={{ marginTop: 0, paddingTop: 0 }}
        />
        <View style={styles.emptyContainer}>
          <ThemedText style={{ textAlign: "center" }}>
            No conversations yet.
          </ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor }}>
      <Header
        title="Chats"
        showBackButton
        style={{ marginTop: 0, paddingTop: 0 }}
      />
      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 16 }}
      />
    </SafeAreaView>
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
