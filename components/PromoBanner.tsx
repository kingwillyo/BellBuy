import { Dimensions, Image, StyleSheet, View } from "react-native";
import { ThemedText } from "./ThemedText";
import { ThemedView } from "./ThemedView";

const screenWidth = Dimensions.get("window").width;

export function PromoBanner() {
  // Using a different, generally reliable placeholder image for testing.
  // This should display a random image of 400x180 pixels.
  const bannerImageSource = { uri: "https://picsum.photos/400/180" };

  return (
    <ThemedView style={styles.container}>
      {/* Background Image */}
      <Image
        source={bannerImageSource}
        style={styles.backgroundImage}
        resizeMode="cover"
        onError={(e) => console.log("Banner Image Error:", e.nativeEvent.error)} // Keep this for crucial debugging!
      />

      {/* Content Overlay (text and timer) */}
      <View style={styles.contentOverlay}>
        <View style={styles.textContainer}>
          <ThemedText type="title" style={styles.title}>
            Super Flash Sale
          </ThemedText>
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 12,
    overflow: "hidden",
    height: 180,
  },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 12,
  },
  contentOverlay: {
    ...StyleSheet.absoluteFillObject,
    padding: 16,
    justifyContent: "space-between",
    backgroundColor: "rgba(0,0,0,0.2)", // Semi-transparent overlay for text readability
  },
  textContainer: {
    // No specific changes needed here
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 4,
    color: "#FFF", // Set to white for better contrast on a dark image
  },
  subtitle: {
    fontSize: 18,
    color: "#0A84FF", // Your accent color
    fontWeight: "bold",
  },
  timerContainer: {
    alignItems: "flex-start",
  },
  timerLabel: {
    fontSize: 14,
    color: "#FFF",
    marginBottom: 8,
  },
  timer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  timerBox: {
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  timerNumber: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  timerSeparator: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#FFF",
  },
});
