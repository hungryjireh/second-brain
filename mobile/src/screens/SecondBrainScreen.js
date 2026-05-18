import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, View, Text, TextInput, Pressable, FlatList, ScrollView, Modal, Platform, Switch, Linking, Keyboard, useWindowDimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioRecorder, useAudioRecorderState } from 'expo-audio';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { File, Paths } from 'expo-file-system';
import * as Clipboard from 'expo-clipboard';
import * as Sharing from 'expo-sharing';
import { apiRequest, buildApiUrl, createAuthHeaders } from '../api';
import { CACHE_TTL_MS } from '../constants/cache';
import { theme } from '../theme';
import SecondBrainEntryCard from '../components/SecondBrainEntryCard';
import SwipeToDeleteRow from '../components/SwipeToDeleteRow';
import TimezoneDropdown from '../components/TimezoneDropdown';
import {
  CATEGORIES,
  GLOBALLY_PERMISSIVE_TAGS_NORMALIZED,
  MAX_ENTRY_TAGS,
  MAX_USER_TAGS,
} from '../constants/tags';
import styles, { SWIPE_ACTION_WIDTH } from './SecondBrainScreen.styles';

const PRIORITY_LEVELS = [
  { key: 'high', label: 'High (8-10)' },
  { key: 'medium', label: 'Medium (4-7)' },
  { key: 'low', label: 'Low (0-3)' },
];

const STATS = [
  { key: 'reminder', label: 'Reminders', color: theme.colors.brand, dimColor: theme.colors.brandDim },
  { key: 'todo', label: 'TODOs', color: theme.colors.todo, dimColor: theme.colors.todoDim },
  { key: 'thought', label: 'Thoughts', color: theme.colors.thought, dimColor: theme.colors.thoughtDim },
  { key: 'note', label: 'Notes', color: theme.colors.note, dimColor: theme.colors.noteDim },
];

const TYPEBAR_MIN_HEIGHT = 38;
const SMALL_SCREEN_FILTER_BREAKPOINT = 640;

function formatElapsedTime(elapsedMs) {
  const totalSeconds = Math.max(0, Math.floor(elapsedMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const paddedSeconds = String(seconds).padStart(2, '0');
  return `${minutes}:${paddedSeconds}`;
}

function tagsToInput(tags) {
  if (!Array.isArray(tags)) return '';
  return tags.map(tag => String(tag).trim()).filter(Boolean).join(',');
}

function parseTagInput(input) {
  const seen = new Set();
  return String(input || '')
    .split(',')
    .map(part => normalizeTagValue(part))
    .filter(tag => {
      if (!tag || seen.has(tag)) return false;
      seen.add(tag);
      return true;
    })
    .slice(0, MAX_ENTRY_TAGS);
}

function normalizeTagValue(input) {
  return String(input || '')
    .trim()
    .replace(/^#+/, '')
    .toLowerCase()
    .replace(/[\s_-]+/g, '')
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 32);
}

function sortTagsByUsage(tags, usageCounts) {
  return [...tags].sort((a, b) => {
    const aHasEntries = usageCounts.has(a);
    const bHasEntries = usageCounts.has(b);
    if (aHasEntries !== bHasEntries) return aHasEntries ? -1 : 1;
    return a.localeCompare(b, 'en', { sensitivity: 'base' });
  });
}

function countBillableGlobalTags(tags) {
  return new Set(
    tags
      .map(tag => normalizeTagValue(tag))
      .filter(tag => tag && !GLOBALLY_PERMISSIVE_TAGS_NORMALIZED.has(tag))
  ).size;
}

function getPriorityLevel(priority) {
  if (priority >= 8) return 'high';
  if (priority >= 4) return 'medium';
  return 'low';
}

function createDateFormatters(timezone) {
  return {
    dayKeyFormatter: new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }),
    timeFormatter: new Intl.DateTimeFormat('en-SG', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
    }),
    shortDateFormatter: new Intl.DateTimeFormat('en-SG', {
      timeZone: timezone,
      month: 'short',
      day: 'numeric',
    }),
    remindDateFormatter: new Intl.DateTimeFormat('en-SG', {
      timeZone: timezone,
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    }),
  };
}

function formatDateWithFormatters(unixTs, formatters) {
  if (!unixTs) return null;
  const d = new Date(unixTs * 1000);
  const now = new Date();
  const yesterday = new Date(now.getTime() - 86400000);
  const dayKey = formatters.dayKeyFormatter.format(d);
  const todayKey = formatters.dayKeyFormatter.format(now);
  const yesterdayKey = formatters.dayKeyFormatter.format(yesterday);
  const time = formatters.timeFormatter.format(d);

  if (dayKey === todayKey) return `Today · ${time}`;
  if (dayKey === yesterdayKey) return `Yesterday · ${time}`;
  return `${formatters.shortDateFormatter.format(d)} · ${time}`;
}

function formatRemindAtWithFormatters(unixTs, formatters) {
  if (!unixTs) return null;
  const d = new Date(unixTs * 1000);
  const now = new Date();
  const dayKey = formatters.dayKeyFormatter.format(d);
  const todayKey = formatters.dayKeyFormatter.format(now);
  const time = formatters.timeFormatter.format(d);

  if (dayKey === todayKey) return `${time} tonight`;
  return `${formatters.remindDateFormatter.format(d)} · ${time}`;
}

function unixToDatetimeLocal(unixTs) {
  if (!unixTs) return '';
  const date = new Date(unixTs * 1000);
  const pad = value => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function datetimeLocalToUnix(value) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return Math.floor(parsed.getTime() / 1000);
}

function groupByDate(entries) {
  const groups = {};
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const weekStart = todayStart - 6 * 86400000;

  for (const entry of entries) {
    const ts = (entry.created_at ?? 0) * 1000;
    let group;
    if (ts >= todayStart) group = 'Today';
    else if (ts >= todayStart - 86400000) group = 'Yesterday';
    else if (ts >= weekStart) group = 'Earlier this week';
    else group = 'Older';

    if (!groups[group]) groups[group] = [];
    groups[group].push(entry);
  }

  return groups;
}

export default function SecondBrainScreen({ token, navigation }) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isSmallScreen = width <= SMALL_SCREEN_FILTER_BREAKPOINT;
  const [entries, setEntries] = useState([]);
  const [userTags, setUserTags] = useState([]);
  const [userTagsLoaded, setUserTagsLoaded] = useState(false);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [editingEntry, setEditingEntry] = useState(null);
  const [openActionDrawerId, setOpenActionDrawerId] = useState(null);
  const [editCategory, setEditCategory] = useState('note');
  const [editTitle, setEditTitle] = useState('');
  const [editSummary, setEditSummary] = useState('');
  const [editText, setEditText] = useState('');
  const [editRemindAt, setEditRemindAt] = useState('');
  const [editPriority, setEditPriority] = useState('0');
  const [editTags, setEditTags] = useState('');
  const [editTagDraft, setEditTagDraft] = useState('');
  const [editTagError, setEditTagError] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState('');
  const [activePriorityLevel, setActivePriorityLevel] = useState('');
  const [activeTag, setActiveTag] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [typebarInputHeight, setTypebarInputHeight] = useState(TYPEBAR_MIN_HEIGHT);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [openSwipeId, setOpenSwipeId] = useState(null);
  const [importingConversations, setImportingConversations] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Singapore');
  const [timezoneDraft, setTimezoneDraft] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Singapore');
  const [timezoneError, setTimezoneError] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);
  const [telegramLinkKey, setTelegramLinkKey] = useState('');
  const [loadingTelegramLinkKey, setLoadingTelegramLinkKey] = useState(false);
  const [telegramLinkError, setTelegramLinkError] = useState('');
  const [telegramCopyStatus, setTelegramCopyStatus] = useState('');
  const [actionTooltip, setActionTooltip] = useState('');
  const [typebarFocused, setTypebarFocused] = useState(false);
  const [voiceBusy, setVoiceBusy] = useState(false);
  const [voiceCaptureStartedAtMs, setVoiceCaptureStartedAtMs] = useState(null);
  const [voiceElapsedMs, setVoiceElapsedMs] = useState(0);
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(audioRecorder);
  const recording = recorderState?.isRecording;
  const [keyboardOffset, setKeyboardOffset] = useState(0);
  const confirmDeleteTimeoutRef = useRef(null);
  const openActionDrawerIdRef = useRef(null);
  const typebarBottom = 10 + Math.max(insets.bottom, 0) + keyboardOffset;
  const listBottomPadding = typebarBottom + typebarInputHeight + 20;
  const isWeb = Platform.OS === 'web';
  const typebarPlaceholder = isSmallScreen ? 'Type here' : 'Type a note, reminder or thought...';
  const voiceElapsedLabel = useMemo(() => formatElapsedTime(voiceElapsedMs), [voiceElapsedMs]);
  const hideTypebarSideActions = typebarFocused && !recording;

  const loadEntries = useCallback(async () => {
    try {
      setError('');
      const [data, tagsData] = await Promise.all([
        apiRequest('/entries?limit=60', { token, cache: { ttlMs: CACHE_TTL_MS.FEED } }),
        apiRequest('/tags', { token, cache: { ttlMs: CACHE_TTL_MS.SETTINGS } }),
      ]);
      const list = Array.isArray(data.entries) ? data.entries : Array.isArray(data) ? data : [];
      setEntries(list);

      const normalizedUserTags = (Array.isArray(tagsData?.tags) ? tagsData.tags : [])
        .map(tag => normalizeTagValue(tag))
        .filter(Boolean);
      setUserTags(Array.from(new Set(normalizedUserTags)).sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' })));
      setUserTagsLoaded(true);
    } catch (err) {
      setError(err.message);
    }
  }, [token]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  useEffect(() => {
    async function loadSettings() {
      try {
        const data = await apiRequest('/settings', { token, cache: { ttlMs: CACHE_TTL_MS.SETTINGS } });
        if (data?.timezone) {
          setTimezone(data.timezone);
          setTimezoneDraft(data.timezone);
        }
      } catch (err) {
        setTimezoneError(err.message);
      }
    }
    loadSettings();
  }, [token]);

  useEffect(() => () => {
    if (confirmDeleteTimeoutRef.current) {
      clearTimeout(confirmDeleteTimeoutRef.current);
      confirmDeleteTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    openActionDrawerIdRef.current = openActionDrawerId;
  }, [openActionDrawerId]);

  useEffect(() => {
    if (isSmallScreen) {
      setIsFilterDropdownOpen(false);
      return;
    }
    setIsFilterDropdownOpen(true);
  }, [isSmallScreen]);

  useEffect(() => {
    if (!recording) {
      setVoiceCaptureStartedAtMs(null);
      setVoiceElapsedMs(0);
      return undefined;
    }

    if (voiceCaptureStartedAtMs === null) {
      const now = Date.now();
      setVoiceCaptureStartedAtMs(now);
      setVoiceElapsedMs(0);
      return undefined;
    }

    const updateElapsed = () => {
      setVoiceElapsedMs(Date.now() - voiceCaptureStartedAtMs);
    };
    updateElapsed();
    const intervalId = setInterval(updateElapsed, 1000);

    return () => {
      clearInterval(intervalId);
    };
  }, [recording, voiceCaptureStartedAtMs]);

  useEffect(() => {
    if (isWeb) return undefined;

    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const handleKeyboardShow = event => {
      const keyboardHeight = event?.endCoordinates?.height ?? 0;
      const nextOffset = Math.max(0, keyboardHeight - Math.max(insets.bottom, 0));
      setKeyboardOffset(nextOffset);
    };
    const handleKeyboardHide = () => {
      setKeyboardOffset(0);
    };
    const showSub = Keyboard.addListener(showEvent, handleKeyboardShow);
    const hideSub = Keyboard.addListener(hideEvent, handleKeyboardHide);

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [insets.bottom, isWeb]);

  async function createEntry() {
    if (!draft.trim()) return;
    try {
      await apiRequest('/entries', { method: 'POST', token, body: { description: draft.trim() } });
      setDraft('');
      setTypebarInputHeight(TYPEBAR_MIN_HEIGHT);
      await loadEntries();
    } catch (err) {
      setError(err.message);
    }
  }

  async function startVoiceCapture() {
    if (voiceBusy || recording) return;
    if (Platform.OS === 'web') {
      setError('Voice capture is available on native app only.');
      return;
    }
    try {
      setError('');
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        setError('Microphone permission is required.');
        return;
      }
      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });
      await audioRecorder.prepareToRecordAsync(RecordingPresets.HIGH_QUALITY);
      audioRecorder.record();
    } catch (err) {
      setError(err.message);
    }
  }

  async function stopVoiceCaptureAndSubmit() {
    if (!recording || voiceBusy) return;
    setVoiceBusy(true);
    try {
      await audioRecorder.stop();
      const uri = audioRecorder.uri;
      if (!uri) throw new Error('Failed to read recording');

      const recordedAudio = new File(uri);
      const audioBase64 = await recordedAudio.base64();
      if (!audioBase64) {
        throw new Error('Failed to encode recording');
      }

      const response = await apiRequest('/voice', {
        method: 'POST',
        token,
        body: {
          audio_base64: audioBase64,
          extension: 'm4a',
        },
      });
      if (response?.entry) {
        setEntries(prev => [response.entry, ...prev]);
      } else {
        await loadEntries();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setVoiceBusy(false);
      try {
        await setAudioModeAsync({ allowsRecording: false });
      } catch {
        // Ignore audio mode reset failures.
      }
    }
  }

  async function cancelVoiceCapture() {
    if (!recording || voiceBusy) return;
    setVoiceBusy(true);
    try {
      await audioRecorder.stop();
    } catch (err) {
      setError(err.message);
    } finally {
      setVoiceBusy(false);
      try {
        await setAudioModeAsync({ allowsRecording: false });
      } catch {
        // Ignore audio mode reset failures.
      }
    }
  }

  async function handleImportConversationFile(file) {
    if (!file || importingConversations) return;

    setImportingConversations(true);
    try {
      const raw = await file.text();
      const parsed = JSON.parse(raw);
      const conversations = Array.isArray(parsed) ? parsed : [parsed];
      const response = await apiRequest('/entries', {
        method: 'POST',
        token,
        body: {
          import_format: 'llm_conversations',
          conversations,
        },
      });

      const created = Array.isArray(response?.created) ? response.created : [];
      if (created.length === 0) {
        Alert.alert('Import LLM conversations', 'No valid conversations were found in the uploaded JSON.');
        return;
      }

      setEntries(prev => [...created, ...prev]);
      Alert.alert('Import LLM conversations', `Imported ${created.length} conversation${created.length === 1 ? '' : 's'}.`);
    } catch (err) {
      Alert.alert('Import LLM conversations', `Failed to import JSON: ${err.message}`);
    } finally {
      setImportingConversations(false);
    }
  }

  function handleOpenImportDialog() {
    if (importingConversations) return;

    if (Platform.OS !== 'web') {
      Alert.alert('Import LLM conversations', 'Uploading JSON is currently available on web.');
      return;
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = async event => {
      const file = event?.target?.files?.[0];
      if (!file) return;
      await handleImportConversationFile(file);
      input.value = '';
    };
    input.click();
  }

  const toggleArchive = useCallback(async entry => {
    setBusyId(entry.id);
    try {
      const updated = await apiRequest(`/entries?id=${entry.id}`, {
        method: 'PATCH',
        token,
        body: { is_archived: !entry.is_archived },
      });
      setEntries(prev => prev.map(item => (item.id === entry.id ? updated : item)));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }, [token]);

  const deleteEntry = useCallback(async entryId => {
    setBusyId(entryId);
    try {
      await apiRequest(`/entries?id=${entryId}`, { method: 'DELETE', token });
      setEntries(prev => prev.filter(item => item.id !== entryId));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }, [token]);

  const requestDelete = useCallback(entryId => {
    setOpenSwipeId(entryId);
    if (confirmDeleteId !== entryId) {
      setConfirmDeleteId(entryId);
      if (confirmDeleteTimeoutRef.current) clearTimeout(confirmDeleteTimeoutRef.current);
      confirmDeleteTimeoutRef.current = setTimeout(() => {
        setConfirmDeleteId(null);
        confirmDeleteTimeoutRef.current = null;
      }, 2500);
      return;
    }

    if (confirmDeleteTimeoutRef.current) {
      clearTimeout(confirmDeleteTimeoutRef.current);
      confirmDeleteTimeoutRef.current = null;
    }
    setConfirmDeleteId(null);
    deleteEntry(entryId);
  }, [confirmDeleteId, deleteEntry]);

  const downloadIcs = useCallback(async entryId => {
    try {
      const response = await fetch(`${buildApiUrl('/ics')}?id=${encodeURIComponent(entryId)}`, {
        headers: createAuthHeaders(token),
      });
      if (!response.ok) {
        let serverMessage = '';
        try {
          const raw = await response.text();
          if (raw) {
            try {
              const parsed = JSON.parse(raw);
              serverMessage = String(parsed?.error || parsed?.message || '').trim();
            } catch {
              serverMessage = raw.trim();
            }
          }
        } catch {
          // Ignore response body parsing errors and fall back to status code.
        }
        const normalizedMessage = serverMessage || `Request failed (${response.status})`;
        throw new Error(normalizedMessage);
      }

      const fileName = `second-brain-reminder-${entryId}.ics`;
      if (Platform.OS === 'web') {
        const blob = await response.blob();
        const isMobileBrowser = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || '');
        const shareFn = navigator.share?.bind(navigator);
        const canShareFn = navigator.canShare?.bind(navigator);

        if (isMobileBrowser && shareFn && typeof File !== 'undefined') {
          const file = new File([blob], fileName, { type: 'text/calendar;charset=utf-8' });
          if (!canShareFn || canShareFn({ files: [file] })) {
            await shareFn({
              title: 'Reminder',
              files: [file],
            });
            return;
          }
        }

        const downloadUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
        return;
      }

      const icsContent = await response.text();
      const file = new File(Paths.cache, fileName);
      file.write(icsContent);
      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        throw new Error('Sharing is not available on this device');
      }
      await Sharing.shareAsync(file.uri, {
        mimeType: 'text/calendar',
        dialogTitle: 'Share reminder',
        UTI: 'public.calendar-event',
      });
    } catch (err) {
      setError(err.message);
    }
  }, [token]);

  const startEdit = useCallback(entry => {
    navigation.navigate('SecondBrainEditEntry', {
      entry,
      token,
    });
  }, [navigation, token]);

  const closeEdit = useCallback(() => {
    setEditingEntry(null);
    setEditCategory('note');
    setEditTitle('');
    setEditSummary('');
    setEditText('');
    setEditRemindAt('');
    setEditPriority('0');
    setEditTags('');
    setEditTagDraft('');
    setEditTagError('');
  }, []);

  const openEntry = useCallback(entry => {
    navigation.navigate('SecondBrainEntryDetails', { entry, token });
  }, [navigation, token]);

  const closeSwipe = useCallback(() => setOpenSwipeId(null), []);
  const handleActionDrawerChange = useCallback((entryId, isOpen) => {
    setOpenActionDrawerId(current => {
      if (isOpen) return entryId;
      if (current === entryId) return null;
      return current;
    });
  }, []);
  const keyExtractor = useCallback(item => item.key, []);
  const renderCell = useCallback(({ item, children, style, ...rest }) => {
    const isRaised = item?.entry?.id === openActionDrawerIdRef.current;
    return (
      <View
        {...rest}
        style={[style, styles.listCell, isRaised ? styles.listCellRaised : null]}
      >
        {children}
      </View>
    );
  }, []);
  const renderListItem = useCallback(({ item }) => {
    if (item.type === 'header') {
      return <Text style={styles.sectionHeaderText}>{`${item.group} · ${item.count}`}</Text>;
    }

    const entry = item.entry;
    if (!entry) return null;
    const isBusy = busyId === entry.id;
    const isWeb = Platform.OS === 'web';
    const cardContent = (
      <SecondBrainEntryCard
        entry={entry}
        styles={styles}
        theme={theme}
        isBusy={isBusy}
        isSwipeOpen={openSwipeId === entry.id}
        isDeleteConfirm={confirmDeleteId === entry.id}
        displayDate={item.displayDate}
        displayRemindAt={item.displayRemindAt}
        onOpenEntry={openEntry}
        onCloseSwipe={closeSwipe}
        onStartEdit={startEdit}
        onToggleArchive={toggleArchive}
        onDownloadIcs={downloadIcs}
        onRequestDelete={requestDelete}
        onActionDrawerChange={handleActionDrawerChange}
      />
    );
    if (isWeb) return <View style={styles.webEntryRow}>{cardContent}</View>;
    return (
      <SwipeToDeleteRow
        id={entry.id}
        isOpen={openSwipeId === entry.id}
        isRaised={openActionDrawerId === entry.id}
        onOpen={setOpenSwipeId}
        actionLabel={isBusy ? '...' : (confirmDeleteId === entry.id ? 'Confirm' : 'Delete')}
        onActionPress={() => requestDelete(entry.id)}
        actionWidth={SWIPE_ACTION_WIDTH}
        styles={styles}
      >
        {cardContent}
      </SwipeToDeleteRow>
    );
  }, [busyId, closeSwipe, confirmDeleteId, downloadIcs, handleActionDrawerChange, openActionDrawerId, openEntry, openSwipeId, requestDelete, startEdit, toggleArchive]);

  function openSettings() {
    setTimezoneDraft(timezone);
    setTimezoneError('');
    setTelegramLinkKey('');
    setTelegramLinkError('');
    setTelegramCopyStatus('');
    setSettingsOpen(true);
  }

  function closeSettings() {
    if (savingSettings) return;
    setSettingsOpen(false);
  }

  async function saveSettings() {
    if (savingSettings) return;
    const timezoneToSave = String(timezoneDraft || '').trim();
    if (!timezoneToSave) {
      setTimezoneError('Timezone is required.');
      return;
    }
    setSavingSettings(true);
    setTimezoneError('');
    try {
      const updated = await apiRequest('/settings', {
        method: 'PATCH',
        token,
        body: { timezone: timezoneToSave },
      });
      if (updated?.timezone) {
        setTimezone(updated.timezone);
        setTimezoneDraft(updated.timezone);
      }
      setSettingsOpen(false);
    } catch (err) {
      setTimezoneError(err.message);
    } finally {
      setSavingSettings(false);
    }
  }

  async function generateTelegramLinkKey() {
    if (loadingTelegramLinkKey) return;
    setLoadingTelegramLinkKey(true);
    setTelegramLinkError('');
    setTelegramCopyStatus('');
    try {
      const data = await apiRequest('/telegram/link-key', { token });
      setTelegramLinkKey(data?.key || '');
    } catch (err) {
      setTelegramLinkError(err.message);
    } finally {
      setLoadingTelegramLinkKey(false);
    }
  }

  async function copyTelegramLinkKey() {
    if (!telegramLinkKey) return;
    try {
      await Clipboard.setStringAsync(telegramLinkKey);
      setTelegramCopyStatus('Copied');
    } catch {
      setTelegramCopyStatus('Copy failed');
    }
  }

  const preparedEntries = useMemo(() => (
    entries.map(entry => {
      const normalizedTags = Array.isArray(entry.tags)
        ? entry.tags.map(tag => String(tag).trim()).filter(Boolean)
        : [];
      const searchBlob = [
        entry.title,
        entry.summary,
        entry.raw_text,
        entry.content,
        normalizedTags.join(' '),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return {
        entry,
        normalizedTags,
        normalizedTagsLower: normalizedTags.map(tag => tag.toLowerCase()),
        searchBlob,
      };
    })
  ), [entries]);

  const derivedData = useMemo(() => {
    const categoryCounts = { reminder: 0, todo: 0, thought: 0, note: 0 };
    const usageCounts = new Map();
    const filteredEntries = [];
    const selectedTag = activeTag.toLowerCase();
    const normalizedSearchQuery = searchQuery.trim().toLowerCase();

    for (const { entry, normalizedTags, normalizedTagsLower, searchBlob } of preparedEntries) {
      const isArchived = Boolean(entry.is_archived);

      if (!isArchived) {
        const key = entry.category;
        if (Object.prototype.hasOwnProperty.call(categoryCounts, key)) categoryCounts[key] += 1;
      }

      for (const tag of normalizedTags) {
        usageCounts.set(tag, (usageCounts.get(tag) ?? 0) + 1);
      }

      if (showArchived ? !isArchived : isArchived) continue;
      if (activeCategory && entry.category !== activeCategory) continue;
      if (activePriorityLevel && getPriorityLevel(entry.priority ?? 0) !== activePriorityLevel) continue;
      if (selectedTag && !normalizedTagsLower.includes(selectedTag)) continue;
      if (normalizedSearchQuery) {
        if (!searchBlob.includes(normalizedSearchQuery)) continue;
      }

      filteredEntries.push(entry);
    }

    return {
      counts: categoryCounts,
      visibleEntries: filteredEntries,
      tagUsageCounts: usageCounts,
    };
  }, [preparedEntries, showArchived, activeCategory, activePriorityLevel, activeTag, searchQuery]);

  const { counts, visibleEntries, tagUsageCounts } = derivedData;

  const availableTags = useMemo(() => {
    return Array.from(tagUsageCounts.keys()).sort((a, b) => a.localeCompare(b));
  }, [tagUsageCounts]);
  const globalTags = useMemo(() => {
    if (!userTagsLoaded) return availableTags;
    const sortedUserTags = sortTagsByUsage(userTags, tagUsageCounts);
    return sortedUserTags.length > 0 ? sortedUserTags : availableTags;
  }, [userTagsLoaded, userTags, availableTags, tagUsageCounts]);

  const parsedEditTags = useMemo(() => parseTagInput(editTags), [editTags]);

  const addEditTag = useCallback(() => {
    const nextTag = normalizeTagValue(editTagDraft);
    if (!nextTag) return;
    setEditTagError('');
    const existingGlobalTags = new Set(globalTags.map(tag => normalizeTagValue(tag)));
    const isNewGlobalTag = !existingGlobalTags.has(nextTag);
    const isNewBillableTag = isNewGlobalTag && !GLOBALLY_PERMISSIVE_TAGS_NORMALIZED.has(nextTag);
    if (isNewBillableTag && countBillableGlobalTags(globalTags) >= MAX_USER_TAGS) {
      setEditTagError(`A maximum of ${MAX_USER_TAGS} tags is allowed per user.`);
      return;
    }
    const merged = parseTagInput([...parsedEditTags, nextTag].join(','));
    setEditTags(merged.join(','));
    setEditTagDraft('');
  }, [editTagDraft, globalTags, parsedEditTags]);

  const removeEditTag = useCallback(tagToRemove => {
    setEditTags(parsedEditTags.filter(tag => tag !== tagToRemove).join(','));
    setEditTagError('');
  }, [parsedEditTags]);

  function validateGlobalTagLimit(nextTags) {
    const existingGlobalTags = new Set(globalTags.map(tag => normalizeTagValue(tag)));
    const newBillableGlobalTags = nextTags.filter(tag => (
      !existingGlobalTags.has(tag) && !GLOBALLY_PERMISSIVE_TAGS_NORMALIZED.has(tag)
    ));
    if (newBillableGlobalTags.length === 0) return true;
    if (countBillableGlobalTags(globalTags) + newBillableGlobalTags.length > MAX_USER_TAGS) {
      setEditTagError(`A maximum of ${MAX_USER_TAGS} tags is allowed per user.`);
      return false;
    }
    return true;
  }

  async function saveEdit() {
    if (!editingEntry || !editText.trim()) return;
    const priority = Number(editPriority);
    const tags = parseTagInput(editTags);
    if (!Number.isInteger(priority) || priority < 0 || priority > 10) {
      setError('Priority must be an integer from 0 to 10.');
      return;
    }
    if (!validateGlobalTagLimit(tags)) return;
    setBusyId(editingEntry.id);
    try {
      const updated = await apiRequest(`/entries?id=${editingEntry.id}`, {
        method: 'PATCH',
        token,
        body: {
          category: editCategory,
          title: editTitle.trim(),
          summary: editSummary.trim(),
          description: editText.trim(),
          remind_at: editCategory === 'reminder' ? datetimeLocalToUnix(editRemindAt) : null,
          priority,
          tags,
        },
      });
      setEntries(prev => prev.map(item => (item.id === editingEntry.id ? updated : item)));
      closeEdit();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  const groupedEntries = useMemo(() => groupByDate(visibleEntries), [visibleEntries]);
  const dateFormatters = useMemo(() => createDateFormatters(timezone), [timezone]);
  const groupedRows = useMemo(() => {
    const groupOrder = ['Today', 'Yesterday', 'Earlier this week', 'Older'];
    const rows = [];
    for (const group of groupOrder) {
      const items = groupedEntries[group];
      if (!items || items.length === 0) continue;
      rows.push({ type: 'header', key: `header-${group}`, group, count: items.length });
      for (const entry of items) {
        rows.push({
          type: 'entry',
          key: `entry-${entry.id}`,
          entry,
          displayDate: formatDateWithFormatters(entry.created_at, dateFormatters),
          displayRemindAt: formatRemindAtWithFormatters(entry.remind_at, dateFormatters),
        });
      }
    }
    return rows;
  }, [dateFormatters, groupedEntries]);
  const hasActiveFilters = useMemo(() => (
    Boolean(activeCategory || activePriorityLevel || activeTag || searchQuery.trim() || showArchived)
  ), [activeCategory, activePriorityLevel, activeTag, searchQuery, showArchived]);
  const clearFilters = useCallback(() => {
    setActiveCategory('');
    setActivePriorityLevel('');
    setActiveTag('');
    setSearchQuery('');
    setShowArchived(false);
  }, []);

  return (
    <View style={styles.container}>
      <View testID="stats-grid" style={[styles.statsGrid, isSmallScreen && styles.statsGridSmall]}>
        {STATS.map(stat => {
          const isActive = activeCategory === stat.key;
          return (
            <Pressable
              key={stat.key}
              testID={`stat-card-${stat.key}`}
              style={[styles.statCard, isSmallScreen && styles.statCardSmall, isActive && styles.statCardActive]}
              onPress={() => setActiveCategory(prev => (prev === stat.key ? '' : stat.key))}
            >
              <View style={[styles.statGlow, { backgroundColor: theme.colors.bgBase }]} />
              <Text style={[styles.statCount, { color: isActive ? theme.colors.brandText : stat.color }]}>
                {counts[stat.key] ?? 0}
              </Text>
              <Text
                style={[styles.statLabel, isSmallScreen && styles.statLabelSmall, isActive && styles.statLabelActive]}
                numberOfLines={1}
              >
                {stat.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.filterSection}>
        <View style={[styles.filterHeaderRow, !isSmallScreen && styles.filterHeaderRowWithSpacing]}>
          {isSmallScreen ? (
            <Pressable
              testID="filter-dropdown-toggle"
              style={[styles.filterDropdownToggle, isFilterDropdownOpen && styles.filterDropdownToggleOpen]}
              onPress={() => setIsFilterDropdownOpen(prev => !prev)}
            >
              <Text style={styles.filterLabel}>FILTER</Text>
              <Feather
                name={isFilterDropdownOpen ? 'chevron-up' : 'chevron-down'}
                size={12}
                style={styles.filterDropdownChevronIcon}
              />
            </Pressable>
          ) : (
            <>
              <Text style={styles.filterLabel}>FILTER</Text>
              <View style={styles.archivedToggle}>
                <Text style={styles.archivedToggleText}>Show Archived/Done</Text>
                <Switch
                  value={showArchived}
                  onValueChange={setShowArchived}
                  trackColor={{ false: theme.colors.border, true: theme.colors.brand }}
                  thumbColor={theme.colors.bg}
                  ios_backgroundColor={theme.colors.border}
                />
              </View>
            </>
          )}
        </View>

        {isFilterDropdownOpen ? (
          <View style={[styles.filterDropdownContent, styles.filterDropdownContentOpen]}>
            <Pressable
              style={[styles.clearFiltersButton, !hasActiveFilters && styles.clearFiltersButtonDisabled]}
              onPress={clearFilters}
              disabled={!hasActiveFilters}
            >
              <Text style={[styles.clearFiltersButtonText, !hasActiveFilters && styles.clearFiltersButtonTextDisabled]}>
                Clear filters
              </Text>
            </Pressable>
            {isSmallScreen ? (
              <View style={[styles.archivedToggle, styles.archivedToggleDropdown]}>
                <Text style={styles.archivedToggleText}>Show Archived/Done</Text>
                <Switch
                  value={showArchived}
                  onValueChange={setShowArchived}
                  trackColor={{ false: theme.colors.border, true: theme.colors.brand }}
                  thumbColor={theme.colors.bg}
                  ios_backgroundColor={theme.colors.border}
                />
              </View>
            ) : null}
            <View style={styles.filterRow}>
              <Text style={styles.filterRowLabel}>PRIORITY</Text>
              {PRIORITY_LEVELS.map(level => {
                const isActive = activePriorityLevel === level.key;
                return (
                  <Pressable
                    key={level.key}
                    style={[styles.pill, isActive && styles.pillActive]}
                    onPress={() => setActivePriorityLevel(prev => (prev === level.key ? '' : level.key))}
                  >
                    <Text style={[styles.pillText, isActive && styles.pillTextActive]}>{level.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.filterRow}>
              <Text style={styles.filterRowLabel}>{`TAGS (${countBillableGlobalTags(globalTags)}/${MAX_USER_TAGS})`}</Text>
              {globalTags.map(tag => {
                const isActive = activeTag.toLowerCase() === tag.toLowerCase();
                const isDisabled = !tagUsageCounts.has(tag);
                return (
                  <Pressable
                    key={tag}
                    testID={`tag-filter-${tag.toLowerCase()}`}
                    style={[styles.pill, isActive && styles.pillActive, isDisabled && styles.pillDisabled]}
                    disabled={isDisabled}
                    onPress={() => setActiveTag(prev => (prev.toLowerCase() === tag.toLowerCase() ? '' : tag))}
                  >
                    <Text style={[styles.pillText, isActive && styles.pillTextActive, isDisabled && styles.pillTextDisabled]}>{`#${tag}`}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search entries..."
          placeholderTextColor={theme.colors.textMuted}
          style={styles.filterSearchInput}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
      </View>

      {!!error && <Text style={styles.error}>{error}</Text>}

      <Modal
        visible={settingsOpen}
        transparent
        animationType="fade"
        onRequestClose={closeSettings}
      >
        <Pressable style={styles.editOverlay} onPress={closeSettings}>
          <Pressable style={styles.settingsPanel} onPress={event => event.stopPropagation()}>
            <ScrollView style={styles.settingsScroll} contentContainerStyle={styles.settingsScrollContent}>
              <Text style={styles.settingsTitle}>Settings</Text>
              <Text style={styles.settingsLabel}>Timezone</Text>
              <View style={styles.settingsDropdownWrapper}>
                <TimezoneDropdown
                  value={timezoneDraft}
                  onChange={option => {
                    setTimezoneDraft(option);
                    setTimezoneError('');
                  }}
                  placeholderTextColor={theme.colors.textMuted}
                  styles={{
                    dropdown: styles.settingsDropdown,
                    dropdownText: styles.settingsDropdownText,
                    dropdownChevronIcon: styles.settingsDropdownChevronIcon,
                    dropdownList: styles.settingsDropdownList,
                    dropdownListContent: styles.settingsDropdownListContent,
                    searchInput: styles.settingsDropdownSearchInput,
                    dropdownOption: styles.settingsDropdownOption,
                    dropdownOptionSelected: styles.settingsDropdownOptionSelected,
                    dropdownOptionText: styles.settingsDropdownOptionText,
                    dropdownOptionTextSelected: styles.settingsDropdownOptionTextSelected,
                    noResults: styles.settingsNoResults,
                  }}
                />
              </View>
              {!!timezoneError && <Text style={styles.error}>{timezoneError}</Text>}
              <View style={styles.settingsCard}>
                <Text style={styles.settingsCardLabel}>Telegram account linking</Text>
                <Pressable
                  style={[styles.settingsActionButton, loadingTelegramLinkKey && styles.typebarButtonDisabled]}
                  onPress={generateTelegramLinkKey}
                  disabled={loadingTelegramLinkKey}
                >
                  <Text style={styles.settingsActionButtonText}>
                    {loadingTelegramLinkKey ? 'Generating…' : 'Generate Telegram link key'}
                  </Text>
                </Pressable>
                {!!telegramLinkKey && (
                  <>
                    <Text style={styles.settingsKeyText} selectable>{telegramLinkKey}</Text>
                    <Pressable style={styles.settingsCopyButton} onPress={copyTelegramLinkKey}>
                      <Text style={styles.settingsCopyButtonText}>
                        {telegramCopyStatus === 'Copied' ? '✓ Copied' : (telegramCopyStatus || 'Copy key')}
                      </Text>
                    </Pressable>
                    <Text style={styles.settingsHintText}>
                      Send this in{' '}
                      <Text
                        style={styles.settingsHintLink}
                        onPress={() => Linking.openURL('https://t.me/AccessiBrainBot')}
                      >
                        Telegram
                      </Text>
                      : /link &lt;your-key&gt;. This key expires in 10 minutes.
                    </Text>
                  </>
                )}
                {!!telegramLinkError && <Text style={styles.error}>{telegramLinkError}</Text>}
              </View>
              <View style={styles.settingsCard}>
                <Text style={styles.settingsCardLabel}>Imports</Text>
                <Pressable
                  style={[styles.settingsActionButton, importingConversations && styles.typebarButtonDisabled]}
                  onPress={handleOpenImportDialog}
                  disabled={importingConversations}
                >
                  <Text style={styles.settingsActionButtonText}>
                    {importingConversations ? 'Importing…' : 'Import LLM conversations'}
                  </Text>
                </Pressable>
              </View>
              <View style={styles.settingsActionsRow}>
                <Pressable style={styles.settingsSecondaryButton} onPress={closeSettings} disabled={savingSettings}>
                  <Text style={styles.settingsSecondaryButtonText}>Cancel</Text>
                </Pressable>
                <Pressable style={[styles.editSaveButton, savingSettings && styles.typebarButtonDisabled]} onPress={saveSettings} disabled={savingSettings}>
                  <Text style={styles.buttonText}>{savingSettings ? 'Saving…' : 'Save'}</Text>
                </Pressable>
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      <FlatList
        data={groupedRows}
        style={styles.list}
        contentContainerStyle={[styles.listContent, { paddingBottom: listBottomPadding }]}
        keyExtractor={keyExtractor}
        CellRendererComponent={renderCell}
        renderItem={renderListItem}
        ListEmptyComponent={hasActiveFilters ? <Text style={styles.listEmptyText}>No matching entries</Text> : null}
        initialNumToRender={10}
        maxToRenderPerBatch={8}
        updateCellsBatchingPeriod={50}
        windowSize={9}
        removeClippedSubviews={false}
      />

      <View style={[styles.typebarRow, { bottom: typebarBottom }]}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={createEntry}
          onFocus={() => setTypebarFocused(true)}
          onBlur={() => setTypebarFocused(false)}
          placeholder={typebarPlaceholder}
          placeholderTextColor={theme.colors.textSecondary}
          style={[styles.typebarInput, isSmallScreen && styles.typebarInputSmall, { height: typebarInputHeight }]}
          multiline
          returnKeyType="send"
          enablesReturnKeyAutomatically
          scrollEnabled={false}
          textAlignVertical="top"
          onContentSizeChange={event => {
            const contentHeight = event?.nativeEvent?.contentSize?.height ?? TYPEBAR_MIN_HEIGHT;
            const nextHeight = Math.max(TYPEBAR_MIN_HEIGHT, Math.ceil(contentHeight));
            setTypebarInputHeight(prev => (prev === nextHeight ? prev : nextHeight));
          }}
        />
        {!hideTypebarSideActions ? (
          <View style={styles.typebarActionWrap}>
            {actionTooltip === 'mic' ? (
              <View style={styles.typebarTooltip}>
                <Text style={styles.typebarTooltipText}>{recording ? 'Stop & submit voice note' : 'Record voice note'}</Text>
              </View>
            ) : null}
            {recording ? (
              <View style={styles.typebarRecordingMeta}>
                <Text style={styles.typebarRecordingTimer} accessibilityLabel={`Voice memo running time ${voiceElapsedLabel}`}>
                  {voiceElapsedLabel}
                </Text>
                <Pressable
                  style={[styles.typebarCancelRecordingButton, voiceBusy && styles.typebarButtonDisabled]}
                  onPress={cancelVoiceCapture}
                  disabled={voiceBusy}
                  accessibilityRole="button"
                  accessibilityLabel="Cancel voice note recording"
                >
                  <Feather
                    name="trash-2"
                    size={13}
                    style={[styles.typebarCancelRecordingIcon, voiceBusy && styles.typebarButtonIconDisabled]}
                  />
                </Pressable>
              </View>
            ) : null}
            <Pressable
              style={[styles.typebarButton, (voiceBusy || loadingTelegramLinkKey) && styles.typebarButtonDisabled]}
              onPress={recording ? stopVoiceCaptureAndSubmit : startVoiceCapture}
              disabled={voiceBusy}
              accessibilityRole="button"
              accessibilityLabel={recording ? 'Stop and submit voice note' : 'Record voice note'}
              onHoverIn={() => setActionTooltip('mic')}
              onHoverOut={() => setActionTooltip('')}
              onLongPress={() => setActionTooltip('mic')}
              onPressOut={() => {
                if (!isWeb) setActionTooltip('');
              }}
            >
              <Feather
                name={recording ? 'square' : 'mic'}
                size={15}
                style={[styles.typebarButtonIcon, voiceBusy && styles.typebarButtonIconDisabled]}
              />
            </Pressable>
          </View>
        ) : null}
        <View style={styles.typebarActionWrap}>
          {actionTooltip === 'enter' ? (
            <View style={styles.typebarTooltip}>
              <Text style={styles.typebarTooltipText}>Enter note</Text>
            </View>
          ) : null}
          <Pressable
            style={[styles.typebarButton, !draft.trim() && styles.typebarButtonDisabled]}
            onPress={createEntry}
            disabled={!draft.trim()}
            accessibilityRole="button"
            accessibilityLabel="Enter note"
            onHoverIn={() => setActionTooltip('enter')}
            onHoverOut={() => setActionTooltip('')}
            onLongPress={() => setActionTooltip('enter')}
            onPressOut={() => {
              if (!isWeb) setActionTooltip('');
            }}
          >
            <Feather
              name="arrow-up-right"
              size={15}
              style={[styles.typebarButtonIcon, !draft.trim() && styles.typebarButtonIconDisabled]}
            />
          </Pressable>
        </View>
        {!hideTypebarSideActions ? (
          <View style={styles.typebarActionWrap}>
            {actionTooltip === 'settings' ? (
              <View style={styles.typebarTooltip}>
                <Text style={styles.typebarTooltipText}>Open settings</Text>
              </View>
            ) : null}
            <Pressable
              style={[styles.typebarButton, styles.typebarUploadButton]}
              onPress={openSettings}
              accessibilityRole="button"
              accessibilityLabel="Open settings"
              onHoverIn={() => setActionTooltip('settings')}
              onHoverOut={() => setActionTooltip('')}
              onLongPress={() => setActionTooltip('settings')}
              onPressOut={() => {
                if (!isWeb) setActionTooltip('');
              }}
            >
              <Feather name="settings" style={styles.typebarUploadButtonIcon} size={15} />
            </Pressable>
          </View>
        ) : null}
      </View>
    </View>
  );
}
