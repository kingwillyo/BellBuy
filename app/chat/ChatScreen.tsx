import Avatar from "@/components/Avatar";
import Header from "@/components/Header";
import { ThemedText } from "@/components/ThemedText";
import { useAuth } from "@/hooks/useAuth";
import { useColors, useThemeColor } from "@/hooks/useThemeColor";
import {
  callEdgeFunctionWithRetry,
  handleNetworkError,
} from "@/lib/networkUtils";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface Message {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
  sender_profile?: {
    full_name: string;
    avatar_url?: string;
  };
}

const ChatScreen: React.FC = () => {
  const { conversationId, receiver_id } = useLocalSearchParams<{
    conversationId: string;
    receiver_id: string;
  }>();
  const { user } = useAuth();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const colors = useColors();
  const [receiverProfile, setReceiverProfile] = useState<{
    full_name: string;
    avatar_url?: string;
  } | null>(null);
  const insets = useSafeAreaInsets();
  const textInputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (!user || !conversationId) return;
    setLoading(true);
    const fetchMessages = async () => {
      // Fetch messages for the conversation (newest first for inverted FlatList)
      const { data, error } = await supabase
        .from("messages")
        .select("id, sender_id, receiver_id, content, created_at, read_at")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: false });
      if (error) {
        setMessages([]);
        setLoading(false);
        return;
      }
      // Mark all messages addressed to this user as read
      const unreadMsgIds = (data || [])
        .filter((msg: any) => msg.receiver_id === user.id && !msg.read_at)
        .map((msg: any) => msg.id);
      if (unreadMsgIds.length > 0) {
        await supabase
          .from("messages")
          .update({ read_at: new Date().toISOString() })
          .in("id", unreadMsgIds);
        // Reset unread_count for this user in this conversation
        await supabase.rpc("mark_conversation_as_read", {
          p_conversation_id: conversationId,
        });
      }
      // Fetch sender profiles for each message
      const transformed = await Promise.all(
        (data || []).map(async (msg: any) => {
          let sender_profile = {
            full_name: "Unknown User",
            avatar_url: undefined,
          };
          const { data: profileData } = await supabase
            .from("profiles")
            .select("full_name, avatar_url")
            .eq("id", msg.sender_id)
            .maybeSingle();
          sender_profile = profileData || {
            full_name: "Unknown User",
            avatar_url: undefined,
          };
          return {
            id: msg.id,
            sender_id: msg.sender_id,
            receiver_id: msg.receiver_id,
            content: msg.content,
            created_at: msg.created_at,
            read_at: msg.read_at,
            sender_profile,
          };
        })
      );
      // Keep messages in descending order for inverted FlatList (newest first)
      setMessages(transformed);
      setLoading(false);
    };
    fetchMessages();
    // Subscribe to real-time updates by conversation_id
    const channel = supabase
      .channel("messages")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const msg = payload.new;
          // Fetch sender profile for new message
          supabase
            .from("profiles")
            .select("full_name, avatar_url")
            .eq("id", msg.sender_id)
            .maybeSingle()
            .then(async ({ data: profileData }) => {
              const newMessage = {
                id: msg.id,
                sender_id: msg.sender_id,
                content: msg.content,
                created_at: msg.created_at,
                sender_profile: profileData || {
                  full_name: "Unknown User",
                  avatar_url: undefined,
                },
              };

              setMessages((prev) => {
                // Add new message at the beginning for inverted FlatList
                return [newMessage, ...prev];
              });

              // Mark message as read if it's addressed to current user and we're on chat screen
              if (msg.receiver_id === user?.id && !msg.read_at) {
                try {
                  await supabase
                    .from("messages")
                    .update({ read_at: new Date().toISOString() })
                    .eq("id", msg.id);

                  // Update unread count for this conversation
                  await supabase.rpc("mark_conversation_as_read", {
                    p_conversation_id: conversationId,
                  });
                } catch (error) {
                  console.error("Error marking message as read:", error);
                }
              }
            });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, conversationId]);

  useEffect(() => {
    if (!receiver_id) return;
    const fetchReceiverProfile = async () => {
      const { data: profileData, error } = await supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("id", receiver_id)
        .maybeSingle();
      if (!error && profileData) {
        setReceiverProfile(profileData);
      }
    };
    fetchReceiverProfile();
  }, [receiver_id]);

  const sendMessage = async () => {
    if (!input.trim() || !user || !conversationId || !receiver_id) {
      console.error(
        "Send button blocked: missing input, user, conversationId, or receiver_id",
        { input, user, conversationId, receiver_id }
      );
      return;
    }
    // Prevent sending messages to self
    if (receiver_id === user.id) {
      console.warn("Blocked sending message to self");
      return;
    }
    setSending(true);
    try {
      console.log("Sending message:", {
        conversation_id: conversationId,
        sender_id: user.id,
        receiver_id,
        content: input,
      });

      const { data, error } = await supabase
        .from("messages")
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          receiver_id,
          content: input,
          created_at: new Date().toISOString(),
        })
        .select();

      if (error) {
        console.error("Error sending message:", error);
        throw error;
      }

      console.log("Message sent successfully:", data);

      // Send push notification via Edge Function with retry logic
      if (data && data[0]) {
        try {
          const { data: sessionData } = await supabase.auth.getSession();
          const accessToken = sessionData.session?.access_token;

          const { data: notificationData, error: notificationError } =
            await callEdgeFunctionWithRetry(
              supabase,
              "send_message_notification",
              {
                message_id: data[0].id,
                conversation_id: conversationId,
                sender_id: user.id,
                receiver_id,
                content: input,
              },
              {
                maxRetries: 2,
                timeout: 8000,
                context: "sending message notification",
              }
            );

          if (notificationError) {
            console.error(
              "Error sending push notification after retries:",
              notificationError
            );
            // Don't show alert for notification failures - message was sent successfully
          } else {
            console.log("Push notification sent successfully");
          }
        } catch (notificationErr) {
          console.error(
            "Error calling notification function:",
            notificationErr
          );
          // Don't show alert for notification failures - message was sent successfully
        }
      }

      setInput("");
      // Refocus the text input to keep keyboard open
      setTimeout(() => {
        textInputRef.current?.focus();
      }, 100);
    } catch (err) {
      console.error("Error sending message:", err);
      handleNetworkError(err, {
        context: "sending message",
        onRetry: () => {
          // Don't auto-retry message sending to avoid duplicates
          console.log("User can retry sending message manually");
        },
      });
    } finally {
      setSending(false);
    }
  };

  const renderItem = ({ item }: { item: Message }) => {
    const isSent = item.sender_id === user?.id;
    return (
      <View
        style={[
          styles.messageRow,
          { justifyContent: isSent ? "flex-end" : "flex-start" },
        ]}
      >
        {!isSent && (
          <Avatar
            uri={item.sender_profile?.avatar_url}
            size={32}
            style={{ marginRight: 8 }}
          />
        )}
        <View
          style={[
            styles.bubble,
            isSent ? styles.sentBubble : styles.receivedBubble,
          ]}
        >
          <ThemedText style={isSent ? styles.sentText : styles.receivedText}>
            {item.content}
          </ThemedText>
          <ThemedText style={styles.timeText}>
            {formatTimestamp(item.created_at)}
          </ThemedText>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: useThemeColor({}, "background") }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={0}
    >
      <Header
        title={receiverProfile?.full_name || "Chat"}
        showBackButton={true}
        style={{
          backgroundColor: useThemeColor({}, "background"),
          borderBottomWidth: 0,
        }}
      >
        <TouchableOpacity
          style={{ flexDirection: "row", alignItems: "center" }}
          onPress={() => router.push(`/seller/${receiver_id}`)}
          activeOpacity={0.7}
        >
          <Avatar
            uri={receiverProfile?.avatar_url}
            size={32}
            style={{ marginRight: 8 }}
          />
          <ThemedText
            style={{
              fontSize: 18,
              fontWeight: "bold",
              color: useThemeColor({}, "text"),
            }}
          >
            {receiverProfile?.full_name}
          </ThemedText>
        </TouchableOpacity>
      </Header>
      <View style={{ flex: 1 }}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ThemedText>Loading messages...</ThemedText>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
            inverted={true}
          />
        )}
      </View>
      <View>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            padding: 8,
            backgroundColor: colors.inputBackground,
            borderTopWidth: 1,
            borderColor: colors.borderColor,
            paddingBottom: Math.max(insets.bottom - 10, 0),
          }}
        >
          <TextInput
            ref={textInputRef}
            style={{
              flex: 1,
              borderWidth: 1,
              borderColor: colors.borderColor,
              borderRadius: 20,
              paddingHorizontal: 12,
              paddingVertical: 8,
              marginRight: 8,
              backgroundColor: colors.inputBackground,
              color: colors.text,
            }}
            placeholder="Type a message"
            placeholderTextColor={colors.textSecondary}
            value={input}
            onChangeText={setInput}
            onSubmitEditing={sendMessage}
            editable={!sending}
            returnKeyType="send"
            blurOnSubmit={false}
          />
          <TouchableOpacity
            onPress={sendMessage}
            disabled={sending || input.trim() === ""}
            style={{
              backgroundColor:
                sending || input.trim() === ""
                  ? colors.borderColor
                  : colors.tint,
              borderRadius: 20,
              paddingHorizontal: 16,
              paddingVertical: 10,
            }}
          >
            <Text style={{ color: colors.text, fontWeight: "bold" }}>Send</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

function formatTimestamp(ts: string) {
  const date = new Date(ts);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

const styles = StyleSheet.create({
  messageRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginBottom: 10,
  },
  bubble: {
    maxWidth: "75%",
    borderRadius: 18,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 2,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  sentBubble: {
    backgroundColor: "#3D5AFE",
    alignSelf: "flex-end",
  },
  receivedBubble: {
    backgroundColor: "#F1F1F1",
    alignSelf: "flex-start",
  },
  sentText: {
    color: "#fff",
    fontSize: 16,
  },
  receivedText: {
    color: "#222",
    fontSize: 16,
  },
  timeText: {
    color: "#aaa",
    fontSize: 11,
    marginTop: 4,
    alignSelf: "flex-end",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: 12,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderColor: "#eee",
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    borderRadius: 20,
    backgroundColor: "#F5F5F5",
    paddingHorizontal: 16,
    fontSize: 16,
    color: "#222",
    marginRight: 8,
  },
  sendButton: {
    backgroundColor: "#3D5AFE",
    borderRadius: 20,
    padding: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
});

export default ChatScreen;
