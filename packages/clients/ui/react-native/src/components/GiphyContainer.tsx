import { useState, useEffect, useCallback, useRef } from "react";

import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Animated,
  LayoutChangeEvent,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import { MagnifyingGlassIcon } from "../icons";
import { getImageComponent } from "../helpers/getImageComponent";

type GifData = {
  id: string;
  url: string;
  images: {
    fixed_width: { webp: string; width: string; height: string };
    preview_gif: { webp: string };
  };
  title?: string; // for altText
};

type GiphyResponse = {
  data: GifData[];
  pagination: {
    total_count: number;
    count: number;
    offset: number;
  };
  meta: {
    status: number;
    msg: string;
    response_id: string;
  };
};

interface GiphyContainerProps {
  giphyApiKey: string;
  onClickBack: () => void;
  onSelectGif: (selectedGif: {
    id: string;
    url: string;
    gifUrl: string;
    gifPreviewUrl: string;
    altText: string | undefined;
    aspectRatio: number;
  }) => void;
  visible: boolean; // determines if this screen should be shown or hidden
}

const MAX_ITEMS = 60; // Define the maximum number of items to load
const FETCH_LIMIT = 30;

export default function GiphyContainer({
  giphyApiKey,
  onClickBack,
  onSelectGif,
  visible,
}: GiphyContainerProps) {
  // Dynamically get the correct Image component and whether it is expo-image.
  const { ImageComponent, isExpo } = getImageComponent();

  const [gifs, setGifs] = useState<GifData[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentOffset, setCurrentOffset] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  const [flatListWidth, setFlatListWidth] = useState(0); // Track the width of the FlatList

  // Search states & debouncing
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  // Refs to track fetching state and gifs length
  const isFetchingRef = useRef(false);
  const gifsLengthRef = useRef(0);

  // Debounce effect (like in the web version)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query);
    }, 500); // 500ms debounce
    return () => clearTimeout(handler);
  }, [query]);

  // Update gifsLengthRef when gifs change
  useEffect(() => {
    gifsLengthRef.current = gifs.length;
  }, [gifs]);

  // Fetch function that decides between trending or search
  const fetchGifs = useCallback(
    async (offset = 0) => {
      // Prevent multiple fetches
      if (isFetchingRef.current) {
        return;
      }

      // Check if we've reached the maximum limit
      if (Math.max(gifsLengthRef.current, offset) >= MAX_ITEMS) {
        return;
      }

      isFetchingRef.current = true;

      if (offset === 0) {
        setLoading(true);
        setLoadingMore(false);
      } else {
        setLoadingMore(true);
      }

      let url = "";
      const trimmed = debouncedQuery.trim();

      if (trimmed.length === 0) {
        // Fetch trending if no query
        url = `https://api.giphy.com/v1/gifs/trending?api_key=${giphyApiKey}&limit=${FETCH_LIMIT}&offset=${offset}`;
      } else {
        // Fetch search results
        url = `https://api.giphy.com/v1/gifs/search?api_key=${giphyApiKey}&q=${encodeURIComponent(
          trimmed
        )}&limit=${FETCH_LIMIT}&offset=${offset}`;
      }

      try {
        const res = await fetch(url);
        const json = (await res.json()) as GiphyResponse;

        if (json.meta.status !== 200) {
          console.error("API Error:", json.meta.msg);
          return;
        }

        setTotalCount(json.pagination.total_count);
        setCurrentOffset(json.pagination.offset + json.pagination.count);

        // Calculate how many items we can still fetch
        const remainingItems = MAX_ITEMS - gifsLengthRef.current;
        const fetchedItems = json.data.slice(0, remainingItems);

        if (offset === 0) {
          setGifs(fetchedItems);
        } else {
          setGifs((prevGifs) => [...prevGifs, ...fetchedItems]);
        }
      } catch (err) {
        console.error("Fetch Error:", err);
      } finally {
        if (offset === 0) {
          setLoading(false);
        } else {
          setLoadingMore(false);
        }
        isFetchingRef.current = false;
      }
    },
    [debouncedQuery, giphyApiKey]
  );

  // Fetch more GIFs when reaching the end
  const fetchMoreGifs = useCallback(() => {
    if (
      loading ||
      loadingMore ||
      gifsLengthRef.current >= totalCount ||
      gifsLengthRef.current >= MAX_ITEMS ||
      isFetchingRef.current
    ) {
      return;
    }
    fetchGifs(currentOffset);
  }, [loading, loadingMore, totalCount, currentOffset, fetchGifs]);

  // Reset search and pagination when visibility or query changes
  useEffect(() => {
    if (!visible) {
      // Reset all states when not visible
      setQuery("");
      setDebouncedQuery("");
      setGifs([]);
      setCurrentOffset(0);
      setTotalCount(0);
      setLoading(false);
      setLoadingMore(false);
      isFetchingRef.current = false;
    } else {
      // When visibility changes to true, reset offset and fetch initial gifs
      setCurrentOffset(0);
      setTotalCount(0);
      setGifs([]);
      fetchGifs(0);
    }
  }, [visible, debouncedQuery, fetchGifs]);

  // Handle ScrollView layout to dynamically calculate column width
  const handleLayout = (event: LayoutChangeEvent) => {
    const { width } = event.nativeEvent.layout;
    setFlatListWidth(width);
  };

  const renderMasonryColumns = () => {
    if (!flatListWidth) return null;

    const padding = 16; // Total horizontal padding
    const columnSpacing = 8; // Spacing between columns
    const columnWidth = (flatListWidth - padding - columnSpacing) / 2; // Two columns

    // Split data into two columns
    const columns = [[], []] as [GifData[], GifData[]];
    gifs.forEach((gif, index) => {
      columns[index % 2].push(gif); // Alternately add to each column
    });

    return (
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          paddingHorizontal: 4,
        }}
      >
        {columns.map((column, colIndex) => (
          <View key={colIndex} style={{ flex: 1, marginHorizontal: 4 }}>
            {column.map((item) => {
              const aspectRatio =
                parseInt(item.images.fixed_width.height) /
                parseInt(item.images.fixed_width.width);

              const imageStyle = {
                width: columnWidth,
                height: columnWidth * aspectRatio,
                borderRadius: 4,
              };

              // Build the props based on which Image component is being used.
              // For expo-image, we assume it accepts a string for its "source"
              // and additional props like "contentFit" and "transition".
              // For React Native's Image, we wrap the URL in an object with "uri".
              const imageProps = isExpo
                ? {
                    source: item.images.fixed_width.webp, // expo-image accepts a string
                    style: imageStyle,
                    contentFit: "cover",
                    transition: 500,
                  }
                : {
                    source: { uri: item.images.fixed_width.webp }, // React Native expects an object with a "uri" property
                    style: imageStyle,
                  };

              return (
                <TouchableOpacity
                  key={item.id}
                  style={{ marginBottom: 8 }}
                  onPress={() => {
                    Keyboard.dismiss(); // Dismiss the keyboard
                    onSelectGif({
                      id: item.id,
                      url: item.url,
                      aspectRatio,
                      gifUrl: item.images.fixed_width.webp,
                      gifPreviewUrl: item.images.preview_gif.webp,
                      altText: item.title,
                    });
                  }}
                >
                  <ImageComponent {...imageProps} />
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>
    );
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <Animated.View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "white",
          zIndex: 999,
          opacity: visible ? 1 : 0,
          pointerEvents: visible ? "auto" : "none",
        }}
      >
        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            padding: 8,
            alignItems: "stretch",
            gap: 8,
          }}
        >
          <TouchableOpacity
            style={{
              backgroundColor: "#e5e7eb",
              aspectRatio: 1, // Ensures width equals height
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 8, // Keeps it rounded
            }}
            onPress={onClickBack}
          >
            <Text style={{ color: "#888", fontSize: 22, lineHeight: 22 }}>
              ←
            </Text>
          </TouchableOpacity>
          <View
            style={{
              flex: 1,
              flexDirection: "row",
              backgroundColor: "#e5e7eb",
              borderRadius: 8,
              paddingHorizontal: 16,
              alignItems: "center",
              gap: 12,
            }}
          >
            <MagnifyingGlassIcon width={16} color="#888" />
            <TextInput
              style={{
                flex: 1,
                paddingVertical: 12,
                fontSize: 15,
              }}
              placeholder="Search GIPHY"
              onChangeText={(value) => setQuery(value)}
              value={query}
            />
          </View>
        </View>

        {/* Masonry Layout with Infinite Scroll */}
        {loading && gifs.length === 0 ? (
          <Text style={{ textAlign: "center", marginTop: 16 }}>Loading...</Text>
        ) : (
          <ScrollView
            onLayout={handleLayout}
            onScroll={({ nativeEvent }) => {
              const { layoutMeasurement, contentOffset, contentSize } =
                nativeEvent;
              const currentScroll = contentOffset.y + layoutMeasurement.height;
              const threshold = contentSize.height * 0.8; // 80% scroll

              if (currentScroll >= threshold) {
                fetchMoreGifs();
              }
            }}
            keyboardShouldPersistTaps="handled" // Important to allow tapping through the keyboard
            scrollEventThrottle={16} // Higher frequency for smoother detection
          >
            {renderMasonryColumns()}
            {loadingMore && (
              <Text style={{ textAlign: "center", marginVertical: 16 }}>
                Loading more...
              </Text>
            )}
            {/* Optional: Display a message when maximum items are loaded
          {gifs.length >= MAX_ITEMS && (
            <Text style={{ textAlign: "center", marginVertical: 16 }}>
              You've reached the maximum number of GIFs.
            </Text>
          )} */}
          </ScrollView>
        )}
      </Animated.View>
    </TouchableWithoutFeedback>
  );
}
