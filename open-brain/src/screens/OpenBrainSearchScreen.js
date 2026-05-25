import { memo, useCallback, useEffect, useMemo } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import OpenBrainTopMenu from "../components/OpenBrainTopMenu";
import { apiRequest } from "../api";
import { CACHE_TTL_MS } from "../constants/cache";
import { useOpenBrainSearch } from "../hooks/useOpenBrainSearch";
import {
  buildOpenBrainSearchRows,
  normalizeOpenBrainSearchInput,
} from "../utils/openBrainSearch";
import { isRequiredFieldPresent } from "../utils/formFields";
import { sortUsersByQuery } from "../utils/searchRanking";
import styles from "./OpenBrainSearchScreen.styles";

const SearchSectionRow = memo(function SearchSectionRow({ label }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{label}</Text>
    </View>
  );
});

const SearchUserRow = memo(function SearchUserRow({ user, openProfile }) {
  return (
    <Pressable
      style={styles.resultRow}
      onPress={() => openProfile(user.username)}
    >
      <Text style={styles.resultPrimary}>@{user.username}</Text>
      <Text style={styles.resultSecondary}>
        {Number.isInteger(user.streak_count)
          ? `${user.streak_count} day streak`
          : "open profile"}
      </Text>
    </Pressable>
  );
});

const SearchThoughtRow = memo(function SearchThoughtRow({
  thought,
  openProfile,
}) {
  return (
    <Pressable
      style={styles.resultRow}
      onPress={() => openProfile(thought?.profile?.username)}
    >
      <Text style={styles.resultPrimary}>
        {(thought?.text || "").replace(/\s+/g, " ").slice(0, 160) ||
          "View thought"}
      </Text>
      <Text style={styles.resultSecondary}>
        {thought?.profile?.username
          ? `by @${thought.profile.username}`
          : "open profile"}
      </Text>
    </Pressable>
  );
});

export default function OpenBrainSearchScreen({ token, navigation, route }) {
  const initialQuery = useMemo(
    () => String(route?.params?.query || ""),
    [route?.params?.query],
  );
  const { query, setQuery, loading, error, didSearch, results, runSearch } =
    useOpenBrainSearch({
      token,
      apiRequest,
      cacheTtlMs: CACHE_TTL_MS.SEARCH,
      sortUsersByQuery,
      initialQuery,
      fallbackErrorMessage: "Search failed.",
    });
  const canSearch = isRequiredFieldPresent(query);

  useEffect(() => {
    if (normalizeOpenBrainSearchInput(initialQuery)) runSearch(initialQuery);
  }, [initialQuery]);

  const openProfile = useCallback(
    (username) => {
      if (!username) return;
      navigation.navigate("OpenBrainProfile", { username });
    },
    [navigation],
  );

  const hasResults = results.users.length > 0 || results.thoughts.length > 0;
  const searchRows = useMemo(
    () => buildOpenBrainSearchRows(results),
    [results],
  );
  const keyExtractor = useCallback((item) => item.key, []);
  const renderResultItem = useCallback(
    ({ item }) => {
      if (item.type === "section") {
        return <SearchSectionRow label={item.label} />;
      }
      if (item.type === "user") {
        return <SearchUserRow user={item.user} openProfile={openProfile} />;
      }
      return (
        <SearchThoughtRow thought={item.thought} openProfile={openProfile} />
      );
    },
    [openProfile],
  );

  return (
    <View style={styles.screen}>
      <OpenBrainTopMenu navigation={navigation} token={token} />
      <View style={styles.content}>
        <Text style={styles.title}>Search</Text>
        <View style={styles.searchRow}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            style={styles.searchInput}
            placeholder="Search users or thoughts"
            placeholderTextColor="#9097a3"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            onSubmitEditing={() => runSearch(query)}
          />
          <Pressable
            style={[
              styles.submitButton,
              (loading || !canSearch) && styles.submitButtonDisabled,
            ]}
            onPress={() => runSearch(query)}
            disabled={loading || !canSearch}
          >
            <Text style={styles.submitLabel}>{loading ? "..." : "Search"}</Text>
          </Pressable>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        {!error && didSearch && !hasResults && !loading ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No matching users or thoughts.</Text>
          </View>
        ) : null}

        {loading ? <ActivityIndicator style={styles.loading} /> : null}

        {!didSearch || hasResults || loading ? (
          <FlatList
            data={searchRows}
            style={styles.resultsWrap}
            keyExtractor={keyExtractor}
            renderItem={renderResultItem}
            keyboardShouldPersistTaps="handled"
            initialNumToRender={12}
            maxToRenderPerBatch={8}
            updateCellsBatchingPeriod={50}
            windowSize={7}
            removeClippedSubviews
          />
        ) : null}
      </View>
    </View>
  );
}
