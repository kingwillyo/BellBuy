import Avatar from "@/components/Avatar";
import Header from "@/components/Header";
import { ThemedText } from "@/components/ThemedText";
import { useAuth } from "@/hooks/useAuth";
import { useColors, useThemeColor } from "@/hooks/useThemeColor";
import { logger } from "@/lib/logger";
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
  Image,
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
import { SafeAreaView } from "react-native-safe-area-context";

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

interface Product {
  id: string;
  name: string;
  price: number;
  main_image?: string;
  image_urls?: string[];
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
  const [senderProfile, setSenderProfile] = useState<{
    full_name: string;
    avatar_url?: string;
  } | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [productLoading, setProductLoading] = useState(false);
  const textInputRef = useRef<TextInput>(null);

  // Theme colors for ProductListing
  const cardBackground = useThemeColor({}, "cardBackground");
  const inputBackground = useThemeColor({}, "inputBackground");
  const borderColor = useThemeColor({}, "borderColor");

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
                  logger.error("Error marking message as read", error, {
                    component: "ChatScreen",
                  });
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

  useEffect(() => {
    if (!user?.id) return;
    const fetchSenderProfile = async () => {
      const { data: profileData, error } = await supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("id", user.id)
        .maybeSingle();
      if (!error && profileData) {
        setSenderProfile(profileData);
      }
    };
    fetchSenderProfile();
  }, [user?.id]);

  useEffect(() => {
    if (!conversationId) return;
    const fetchProduct = async () => {
      setProductLoading(true);
      try {
        // First get the conversation to find the product_id
        const { data: conversationData, error: conversationError } =
          await supabase
            .from("conversations")
            .select("product_id")
            .eq("id", conversationId)
            .maybeSingle();

        if (conversationError) {
          console.error("Error fetching conversation:", conversationError);
          return;
        }

        if (!conversationData?.product_id) {
          console.log("No product associated with this conversation");
          return;
        }

        // Fetch the product details
        const { data: productData, error: productError } = await supabase
          .from("products")
          .select("id, name, price, main_image, image_urls")
          .eq("id", conversationData.product_id)
          .maybeSingle();

        if (productError) {
          console.error("Error fetching product:", productError);
          setProduct(null);
          return;
        }

        if (productData) {
          setProduct(productData);
        } else {
          setProduct(null);
        }
      } catch (error) {
        console.error("Error in fetchProduct:", error);
      } finally {
        setProductLoading(false);
      }
    };

    fetchProduct();
  }, [conversationId]);

  const sendMessage = async () => {
    if (!input.trim() || !user || !conversationId || !receiver_id) {
      logger.error(
        "Send button blocked: missing required data",
        {
          hasInput: !!input.trim(),
          hasUser: !!user,
          hasConversationId: !!conversationId,
          hasReceiverId: !!receiver_id,
        },
        { component: "ChatScreen" }
      );
      return;
    }
    // Prevent sending messages to self
    if (receiver_id === user.id) {
      logger.warn("Blocked sending message to self", undefined, {
        component: "ChatScreen",
      });
      return;
    }
    setSending(true);
    try {
      logger.debug(
        "Sending message",
        { conversationId, hasContent: !!input },
        { component: "ChatScreen" }
      );

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
        logger.error("Error sending message", error, {
          component: "ChatScreen",
        });
        throw error;
      }

      logger.debug(
        "Message sent successfully",
        { messageId: data?.[0]?.id },
        { component: "ChatScreen" }
      );

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
            logger.error(
              "Error sending push notification after retries",
              notificationError,
              { component: "ChatScreen" }
            );
            // Don't show alert for notification failures - message was sent successfully
          } else {
            logger.debug("Push notification sent successfully", undefined, {
              component: "ChatScreen",
            });
          }
        } catch (notificationErr) {
          logger.error("Error calling notification function", notificationErr, {
            component: "ChatScreen",
          });
          // Don't show alert for notification failures - message was sent successfully
        }
      }

      setInput("");
      // Refocus the text input to keep keyboard open
      setTimeout(() => {
        textInputRef.current?.focus();
      }, 100);
    } catch (err) {
      logger.error("Error sending message", err, { component: "ChatScreen" });
      handleNetworkError(err, {
        context: "sending message",
        onRetry: () => {
          // Don't auto-retry message sending to avoid duplicates
          logger.debug("User can retry sending message manually", undefined, {
            component: "ChatScreen",
          });
        },
      });
    } finally {
      setSending(false);
    }
  };

  const renderProductListing = () => {
    if (productLoading) {
      return (
        <View
          style={[
            styles.productListing,
            {
              backgroundColor: cardBackground,
              borderColor: borderColor,
            },
          ]}
        >
          <View
            style={[
              styles.productImageContainer,
              { backgroundColor: inputBackground },
            ]}
          >
            <View style={styles.productImagePlaceholder} />
          </View>
          <View style={styles.productInfo}>
            <View
              style={[
                styles.productNamePlaceholder,
                { backgroundColor: inputBackground },
              ]}
            />
            <View
              style={[
                styles.productPricePlaceholder,
                { backgroundColor: inputBackground },
              ]}
            />
          </View>
        </View>
      );
    }

    if (!product) return null;

    const displayPrice = product.price;

    return (
      <TouchableOpacity
        style={[
          styles.productListing,
          {
            backgroundColor: cardBackground,
            borderColor: borderColor,
          },
        ]}
        onPress={() => router.push(`/(product)/${product.id}`)}
        activeOpacity={0.7}
      >
        <View
          style={[
            styles.productImageContainer,
            { backgroundColor: inputBackground },
          ]}
        >
          <Image
            source={{
              uri:
                product.main_image ||
                product.image_urls?.[0] ||
                "https://via.placeholder.com/80x80",
            }}
            style={styles.productImage}
            resizeMode="cover"
          />
        </View>
        <View style={styles.productInfo}>
          <ThemedText style={styles.productName} numberOfLines={2}>
            {product.name}
          </ThemedText>
          <ThemedText style={[styles.productPrice, { color: colors.tint }]}>
            ₦{Math.round(displayPrice).toLocaleString()}
          </ThemedText>
        </View>
      </TouchableOpacity>
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return "Today";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    } else {
      return date.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    }
  };

  const renderDateSeparator = (date: string) => (
    <View style={styles.dateSeparator}>
      <ThemedText
        style={[
          styles.dateText,
          {
            color: colors.textSecondary,
            backgroundColor: colors.inputBackground,
          },
        ]}
      >
        {formatDate(date)}
      </ThemedText>
    </View>
  );

  const renderItem = ({ item, index }: { item: Message; index: number }) => {
    const isSent = item.sender_id === user?.id;
    const currentDate = new Date(item.created_at).toDateString();
    const prevMessage =
      index < messages.length - 1 ? messages[index + 1] : null;
    const nextMessage = index > 0 ? messages[index - 1] : null;
    const prevDate = prevMessage
      ? new Date(prevMessage.created_at).toDateString()
      : null;
    const nextDate = nextMessage
      ? new Date(nextMessage.created_at).toDateString()
      : null;
    const showDateSeparator = prevDate !== currentDate;

    // Check if this message should be grouped with the next one
    const isGrouped =
      nextMessage &&
      nextMessage.sender_id === item.sender_id &&
      nextDate === currentDate &&
      new Date(item.created_at).getTime() -
        new Date(nextMessage.created_at).getTime() <
        300000; // 5 minutes

    return (
      <View>
        {showDateSeparator && renderDateSeparator(item.created_at)}
        <View
          style={[
            styles.messageRow,
            {
              justifyContent: isSent ? "flex-end" : "flex-start",
              marginBottom: isGrouped ? 4 : 16,
            },
          ]}
        >
          {!isSent && (
            <Avatar
              uri={item.sender_profile?.avatar_url}
              size={32}
              style={{
                marginRight: 8,
                opacity: isGrouped ? 0 : 1,
              }}
            />
          )}
          <View
            style={[
              styles.bubble,
              isSent
                ? styles.sentBubble
                : [
                    styles.receivedBubble,
                    { backgroundColor: colors.inputBackground },
                  ],
              isGrouped &&
                (isSent
                  ? styles.sentBubbleGrouped
                  : styles.receivedBubbleGrouped),
            ]}
          >
            <ThemedText
              style={
                isSent
                  ? styles.sentText
                  : [styles.receivedText, { color: colors.text }]
              }
            >
              {item.content}
            </ThemedText>
            <ThemedText
              style={[
                styles.timeText,
                isSent ? styles.sentTimeText : styles.receivedTimeText,
                !isSent && { color: colors.textSecondary },
              ]}
            >
              {formatTimestamp(item.created_at)}
            </ThemedText>
          </View>
          {isSent && (
            <Avatar
              uri={senderProfile?.avatar_url}
              size={32}
              style={{
                marginLeft: 8,
                opacity: isGrouped ? 0 : 1,
              }}
            />
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: useThemeColor({}, "background") }}
      edges={["bottom"]}
    >
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: useThemeColor({}, "background") }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
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
        {renderProductListing()}
        <View
          style={{
            flex: 1,
            ...(Platform.OS === "android" && {
              paddingBottom: 80,
            }),
          }}
        >
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
              contentContainerStyle={{
                paddingHorizontal: 16,
                paddingTop: 16,
                paddingBottom: Platform.OS === "android" ? 20 : 80,
              }}
              inverted={true}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
        <View
          style={
            Platform.OS === "android"
              ? {
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  right: 0,
                  backgroundColor: useThemeColor({}, "background"),
                  borderTopWidth: 1,
                  borderColor: colors.borderColor,
                }
              : {}
          }
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 16,
              paddingVertical: 12,
              backgroundColor: useThemeColor({}, "background"),
              borderTopWidth: Platform.OS === "ios" ? 1 : 0,
              borderColor: colors.borderColor,
              paddingBottom: 12,
            }}
          >
            <TextInput
              ref={textInputRef}
              style={{
                flex: 1,
                borderWidth: 1,
                borderColor: colors.borderColor,
                borderRadius: 24,
                paddingHorizontal: 16,
                paddingVertical: 12,
                marginRight: 12,
                backgroundColor: colors.inputBackground,
                color: colors.text,
                fontSize: 16,
                maxHeight: 100,
              }}
              placeholder="Send a message"
              placeholderTextColor={colors.textSecondary}
              value={input}
              onChangeText={setInput}
              onSubmitEditing={sendMessage}
              editable={!sending}
              returnKeyType="send"
              blurOnSubmit={false}
              multiline
            />
            <TouchableOpacity
              onPress={sendMessage}
              disabled={sending || input.trim() === ""}
              style={{
                backgroundColor:
                  sending || input.trim() === ""
                    ? colors.borderColor
                    : colors.tint,
                borderRadius: 24,
                width: 48,
                height: 48,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons
                name="send"
                size={20}
                color={
                  sending || input.trim() === ""
                    ? colors.textSecondary
                    : "#FFFFFF"
                }
              />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
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
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  bubble: {
    maxWidth: "75%",
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 2,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    elevation: 2,
  },
  sentBubble: {
    backgroundColor: "#007AFF",
    alignSelf: "flex-end",
    borderBottomRightRadius: 6,
  },
  receivedBubble: {
    alignSelf: "flex-start",
    borderBottomLeftRadius: 6,
  },
  sentBubbleGrouped: {
    borderBottomRightRadius: 20,
  },
  receivedBubbleGrouped: {
    borderBottomLeftRadius: 20,
  },
  sentText: {
    color: "#FFFFFF",
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "400",
  },
  receivedText: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "400",
  },
  timeText: {
    fontSize: 12,
    marginTop: 6,
    fontWeight: "400",
  },
  sentTimeText: {
    color: "rgba(255, 255, 255, 0.7)",
    alignSelf: "flex-end",
  },
  receivedTimeText: {
    alignSelf: "flex-start",
  },
  dateSeparator: {
    alignItems: "center",
    marginVertical: 16,
  },
  dateText: {
    fontSize: 13,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    overflow: "hidden",
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
  productListing: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    elevation: 3,
  },
  productImageContainer: {
    width: 80,
    height: 80,
    borderRadius: 12,
    overflow: "hidden",
    marginRight: 16,
  },
  productImage: {
    width: "100%",
    height: "100%",
  },
  productInfo: {
    flex: 1,
    justifyContent: "center",
  },
  productName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 6,
    lineHeight: 22,
  },
  productPrice: {
    fontSize: 20,
    fontWeight: "700",
  },
  productImagePlaceholder: {
    width: "100%",
    height: "100%",
    borderRadius: 8,
  },
  productNamePlaceholder: {
    height: 20,
    borderRadius: 4,
    marginBottom: 6,
    width: "80%",
  },
  productPricePlaceholder: {
    height: 24,
    borderRadius: 4,
    width: "60%",
  },
});

export default ChatScreen;
