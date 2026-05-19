import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput } from 'react-native';
import { Feather } from '@expo/vector-icons';

const FALLBACK_TIMEZONES = [
  'Asia/Singapore',
  'UTC',
  'Asia/Manila',
  'Asia/Jakarta',
  'Asia/Bangkok',
  'Asia/Tokyo',
  'America/Los_Angeles',
  'America/New_York',
  'Europe/London',
];

function getTimezoneOptions() {
  if (typeof Intl.supportedValuesOf === 'function') {
    return Intl.supportedValuesOf('timeZone');
  }
  return FALLBACK_TIMEZONES;
}

export default function TimezoneDropdown({
  value,
  onChange,
  placeholder = 'Select timezone',
  searchPlaceholder = 'Search timezone',
  noResultsText = 'No timezones found.',
  placeholderTextColor,
  styles,
  onOpenChange,
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const timezoneOptions = useMemo(() => {
    const options = getTimezoneOptions();
    return options.includes(value) ? options : [value, ...options];
  }, [value]);

  const filteredTimezoneOptions = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return timezoneOptions;
    return timezoneOptions.filter(option => option.toLowerCase().includes(query));
  }, [timezoneOptions, search]);

  function setOpenState(nextOpen) {
    setOpen(nextOpen);
    onOpenChange?.(nextOpen);
    if (!nextOpen) setSearch('');
  }

  return (
    <>
      <Pressable
        style={styles.dropdown}
        onPress={() => setOpenState(!open)}
      >
        <Text style={styles.dropdownText}>{value || placeholder}</Text>
        <Feather
          name={open ? 'chevron-up' : 'chevron-down'}
          size={13}
          style={styles.dropdownChevronIcon}
        />
      </Pressable>
      {open ? (
        <ScrollView
          style={styles.dropdownList}
          showsVerticalScrollIndicator
          contentContainerStyle={styles.dropdownListContent}
        >
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={searchPlaceholder}
            placeholderTextColor={placeholderTextColor}
            style={styles.searchInput}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {filteredTimezoneOptions.map(option => {
            const isSelected = option === value;
            return (
              <Pressable
                key={option}
                style={[styles.dropdownOption, isSelected && styles.dropdownOptionSelected]}
                onPress={() => {
                  onChange(option);
                  setOpenState(false);
                }}
              >
                <Text style={[styles.dropdownOptionText, isSelected && styles.dropdownOptionTextSelected]}>
                  {option}
                </Text>
              </Pressable>
            );
          })}
          {filteredTimezoneOptions.length === 0 ? (
            <Text style={styles.noResults}>{noResultsText}</Text>
          ) : null}
        </ScrollView>
      ) : null}
    </>
  );
}
