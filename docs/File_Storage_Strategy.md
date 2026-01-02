# SillyTavern Extension File Storage Guide

## Detailed Report: SillyTavern Extension File Storage Patterns

### 1. Standard Directory Structure for Extension Data Storage

SillyTavern uses a hierarchical data directory structure under `/data/`:

```
/data/
├── default-user/                    # Main user data directory
│   ├── settings.json                 # Global extension settings
│   ├── chats/                       # Individual chat files
│   │   └── [CharacterName]/
│   │       └── [ChatName].jsonl   # Chat data with metadata
│   ├── QuickReplies/                # Quick Reply presets
│   │   └── [PresetName].json
│   ├── worlds/                     # World info files
│   │   └── [WorldName].json
│   ├── vectors/                    # Vector database storage
│   ├── reasoning/                  # Reasoning module files
│   ├── _storage/                   # IndexedDB file storage
│   ├── _cache/                    # Cached data
│   └── [extension-specific folders]
```

**Key directories identified:**
- `/data/default-user/` - All user data lives here
- `/data/default-user/chats/` - Chat files (JSONL format)
- `/data/default-user/QuickReplies/` - QuickReply presets as JSON files
- `/data/default-user/worlds/` - World Info databases
- `/data/default-user/vectors/` - Vector storage
- `/data/_storage/` - IndexedDB persistence files
- `/data/_cache/` - Application cache

---

### 2. Where Extensions Typically Save Configuration, Data, and Caches

#### **A. Global Settings** → `settings.json`

Extensions store **global configuration** in `/data/default-user/settings.json` under the `extension_settings` object:

```javascript
{
  "extension_settings": {
    "memory": { /* extension config */ },
    "quickReply": { /* extension config */ },
    "quickReplyV2": { /* extension config */ },
    "vectors": { /* extension config */ },
    "caption": { /* extension config */ },
    "expressions": { /* extension config */ },
    "openvault": { /* extension config */ },
    // ... other extensions
  }
}
```

**How to access:**
```javascript
import { extension_settings, saveSettingsDebounced } from '../../extensions.js';

// Read settings
const settings = extension_settings['yourExtensionName'] || defaultSettings;

// Write settings
extension_settings['yourExtensionName'] = newSettings;
saveSettingsDebounced();  // Persist to /data/default-user/settings.json
```

#### **B. Per-Chat Data** → Chat Metadata (inside `.jsonl` files)

Extensions store **chat-specific data** in the chat file's `chat_metadata` field:

```javascript
// First line of [ChatName].jsonl contains metadata:
{
  "user_name": "User",
  "character_name": "Character",
  "create_date": "2025-12-26@16h59m45s",
  "chat_metadata": {
    "integrity": "...",
    "chat_id_hash": 12345,
    "yourExtensionName": {
      // Your per-chat data here
      "memories": [],
      "summaries": [...]
    },
    "openvault": {
      "memories": [],
      "character_states": {},
      "relationships": {},
      "last_processed_message_id": -1
    },
    "variables": { /* extension variables */ }
  }
}
```

**How to access:**
```javascript
import { getContext, saveChatConditional, saveMetadataDebounced } from '../../script.js';

// Access chat metadata
const context = getContext();
const chatMetadata = context.chatMetadata;

// Initialize if needed
if (!chatMetadata['yourExtensionName']) {
  chatMetadata['yourExtensionName'] = { /* default structure */ };
}

// Modify data
chatMetadata['yourExtensionName']['summaries'] = [...];

// Save changes (persists to chat file)
await saveChatConditional();  // OR
await saveMetadataDebounced();  // Debounced version
```

#### **C. Custom File Storage** → Extension-specific directories

Some extensions create their own directories:

**QuickReply Example:**
```javascript
// Stored as: /data/default-user/QuickReplies/[PresetName].json
{
  "version": 2,
  "name": "Default",
  "qrList": [...]
}
```

Accessed via API:
```javascript
const response = await fetch('/api/settings/get', {
  method: 'POST',
  headers: getRequestHeaders(),
  body: JSON.stringify({})
});
const data = await response.json();
// Returns { quickReplyPresets: [...] }
```

#### **D. IndexedDB Storage** → `/data/_storage/`

Used for client-side persistence (e.g., token cache, prompts cache):

```javascript
// Found in script.js line 8751-8753
saveTokenCache();
saveItemizedPrompts(getCurrentChatId());
```

---

### 3. How SillyTavern Handles File I/O for Extensions

#### **A. No Direct File System Access**

Extensions **cannot** directly use `fs.readFile` or `fs.writeFile` because they run in the browser, not Node.js.

#### **B. API-Based File Operations**

All file operations go through SillyTavern's REST API:

| API Endpoint | Purpose | Example Usage |
|-------------|-----------|---------------|
| `/api/settings/get` | Read global settings | `await fetch('/api/settings/get')` |
| `/api/settings/save` | Save global settings | `await fetch('/api/settings/save', {method:'POST', body:JSON.stringify(payload)})` |
| `/api/chats/save` | Save chat data | `await context.saveChat()` (wrapper) |
| `/api/assets/download` | Download assets | `await fetch('/api/assets/download')` |
| `/api/assets/delete` | Delete assets | `await fetch('/api/assets/delete')` |
| `/api/assets/get` | Get installed assets | `await fetch('/api/assets/get')` |

#### **C. Helper Functions**

**Save Operations:**
```javascript
// From script.js
import { 
  saveSettings,           // Save global settings
  saveSettingsDebounced,  // Debounced version
  saveChatConditional,     // Save chat if not saving
  saveMetadata,           // Save chat metadata
  saveMetadataDebounced   // Debounced metadata save
} from '../script.js';

// Use cases
await saveSettings();           // Saves to /data/default-user/settings.json
await saveChatConditional();   // Saves current chat file
await saveMetadata();          // Wrapper for chat/group metadata
```

**Context Access:**
```javascript
import { getContext } from '../../extensions.js';

const context = getContext();
// Provides:
// - context.chatId
// - context.chatMetadata  // Access to chat_metadata object
// - context.characterId
// - context.groupId
// - context.saveChat()      // Save current chat
// - context.saveMetadata()   // Save metadata
```

**Extension Settings:**
```javascript
import { extension_settings, saveMetadataDebounced } from '../../extensions.js';

// Global object containing all extension settings
// Automatically persisted when saveSettingsDebounced() is called
```

---

### 4. Examples of Extensions Using File-Based Storage

#### **A. OpenVault (Third-Party Extension)**

**Location:** `/public/scripts/extensions/third-party/openvault/`

**Storage Pattern:**
- **Global settings** in `extension_settings.openvault` (via `settings.json`)
- **Per-chat data** in `chat_metadata.openvault` (via chat file)

**Code Examples:**
```javascript
// src/utils.js
export function getOpenVaultData() {
    const context = getContext();
    if (!context.chatMetadata[METADATA_KEY]) {
        context.chatMetadata[METADATA_KEY] = {
            memories: [],
            character_states: {},
            relationships: {},
            last_processed_message_id: -1,
            extracted_batches: []
        };
    }
    return context.chatMetadata[METADATA_KEY];
}

export async function saveOpenVaultData() {
    await saveChatConditional();
}
```

**Key Features:**
- Uses `chat_metadata` for per-chat memory storage
- Persists with chat branches (metadata follows chat state)
- Uses `saveChatConditional()` to prevent concurrent save conflicts

#### **B. QuickReply Extension**

**Location:** `/public/scripts/extensions/quick-reply/`

**Storage Pattern:**
- **Global settings** in `extension_settings.quickReplyV2`
- **Presets** as separate JSON files in `/data/default-user/QuickReplies/`

**Code Examples:**
```javascript
// index.js lines 59-108
const loadSets = async () => {
    const response = await fetch('/api/settings/get', {
        method: 'POST',
        headers: getRequestHeaders(),
        body: JSON.stringify({}),
    });
    const setList = (await response.json()).quickReplyPresets ?? [];
    // Load presets from server
};
```

#### **C. MessageSummarize Extension (Qvink Memory)**

**Location:** `/public/scripts/extensions/third-party/SillyTavern-MessageSummarize/`

**Storage Pattern:**
- **Global settings** in `extension_settings.qvink_memory`
- **Per-chat settings** in `chat_metadata.qvink_memory`

**Code Examples:**
```javascript
// MODULE_NAME = 'qvink_memory'
const set_chat_metadata = (key, value, copy=false) => {
    if (copy) value = structuredClone(value);
    if (!chat_metadata[MODULE_NAME]) chat_metadata[MODULE_NAME] = {};
    chat_metadata[MODULE_NAME][key] = value;
    saveMetadataDebounced();
};

const get_chat_metadata = (key, copy=false) => {
    let value = chat_metadata[MODULE_NAME]?.[key];
    if (copy) return structuredClone(value);
    return value;
};
```

**Usage:**
```javascript
set_chat_metadata('enabled', true);
set_chat_metadata('profile', 'default');
const isEnabled = get_chat_metadata('enabled');
```

#### **D. Assets Extension**

**Location:** `/public/scripts/extensions/assets/`

**Storage Pattern:**
- Stores downloaded assets in appropriate directories
- Uses API endpoints for file operations

**Code Examples:**
```javascript
// Download asset
await fetch('/api/assets/download', {
    method: 'POST',
    headers: getRequestHeaders(),
    body: JSON.stringify({ url, category, filename }),
});

// Get installed assets
const result = await fetch('/api/assets/get', {
    method: 'POST',
    headers: getRequestHeaders(),
});
const currentAssets = result.ok ? (await result.json()) : {};
```

#### **E. Vectors Extension**

**Location:** `/public/scripts/extensions/vectors/`

**Storage Pattern:**
- **Global settings** in `extension_settings.vectors`
- **Vector data** stored via API (not direct file access)

**Code Examples:**
```javascript
// Vector operations via API
const response = await fetch('/api/vector/list', { ... });
const insert = await fetch('/api/vector/insert', { ... });
const query = await fetch('/api/vector/query', { ... });
```

---

### 5. Best Practices for Storing Per-Chat vs Global Data

#### **A. Global Data** → Use `extension_settings`

**Appropriate for:**
- Extension configuration (enabled/disabled, API keys, thresholds)
- User preferences across all chats
- Presets and templates
- Global settings like API endpoints, model selections

**Implementation:**
```javascript
// 1. Define default settings
const defaultSettings = {
    enabled: true,
    compactThreshold: 120,
    contextThreshold: 75,
    compressionModel: 'gpt-4',
    // ... other global settings
};

// 2. Initialize on load
import { extension_settings } from '../../extensions.js';
extension_settings['cacheFriendlyMemory'] = extension_settings['cacheFriendlyMemory'] || defaultSettings;

// 3. Save when modified
import { saveSettingsDebounced } from '../../script.js';
function updateSetting(key, value) {
    extension_settings['cacheFriendlyMemory'][key] = value;
    saveSettingsDebounced();
}
```

**Storage Location:** `/data/default-user/settings.json` → `extension_settings.cacheFriendlyMemory`

---

#### **B. Per-Chat Data** → Use `chat_metadata`

**Appropriate for:**
- Chat-specific memory and summaries
- Chat-specific configuration overrides
- Message indexes and state tracking
- Character-specific relationship data
- Anything that should persist with the chat (including branches)

**Implementation:**
```javascript
// 1. Define metadata key
const METADATA_KEY = 'cacheFriendlyMemory';

// 2. Access helper functions
export function getChatData() {
    const context = getContext();
    if (!context?.chatMetadata) return null;
    
    if (!context.chatMetadata[METADATA_KEY]) {
        // Initialize with default structure
        context.chatMetadata[METADATA_KEY] = {
            summaries: [],
            level0Messages: [],  // Raw messages
            level1Summaries: [], // Short-term
            level2Summaries: [], // Long-term
            level3Summaries: [], // Ultra-compressed
            compressionStats: {}
        };
    }
    return context.chatMetadata[METADATA_KEY];
}

// 3. Save helper
export async function saveChatData() {
    await saveChatConditional();
}

// 4. Usage
const chatData = getChatData();
chatData.summaries.push(newSummary);
await saveChatData();
```

**Storage Location:** First line of `/data/default-user/chats/[Character]/[Chat].jsonl` → `chat_metadata.cacheFriendlyMemory`

**Key Benefits:**
- Automatically persists with chat file
- Follows chat through branches and edits
- No need for separate file management
- Backed up automatically when chat is backed up

---

#### **C. Mixed Strategy** → Both `extension_settings` AND `chat_metadata`

**Most extensions use this hybrid approach:**

```javascript
// Global: User preferences and defaults
extension_settings.cacheFriendlyMemory = {
    defaultEnabled: true,
    compressionModel: 'gpt-4',
    chunkSize: 10,
    ...global settings
};

// Per-Chat: Actual data and overrides
chat_metadata.cacheFriendlyMemory = {
    enabled: true,  // Can override global default
    summaries: [...],
    ...chat-specific data
};
```

**Implementation pattern:**
```javascript
function getEffectiveSetting(key) {
    const globalValue = extension_settings.cacheFriendlyMemory[key];
    const chatOverride = chat_metadata.cacheFriendlyMemory?.[key];
    return chatOverride !== undefined ? chatOverride : globalValue;
}
```

---

#### **D. When to Use Custom Files**

**Consider custom JSON files when:**
- You have multiple independent datasets (like QuickReply presets)
- Data is shared across multiple chats
- User wants to export/import data separately
- Data is too large for chat metadata (performance concern)

**Example:**
```javascript
// Save to custom file
const data = { myData: [...] };
const filename = 'CacheFriendlyMemory_Export.json';

// Use SillyTavern's download utility (from utils.js)
download(JSON.stringify(data, null, 2), filename, 'application/json');
```

**Custom file locations:**
- `/data/default-user/CacheFriendlyMemory/` (recommended convention)
- `/data/default-user/reasoning/` (example from existing extension)

---

### Recommendations for CacheFriendlyMemory Extension

Based on the compression strategy document and SillyTavern patterns, here are the recommendations:

#### **1. Storage Architecture**

```javascript
// manifest.json
{
    "display_name": "CacheFriendlyMemory",
    "loading_order": 100,
    "requires": [],
    "js": "index.js",
    "author": "YourName",
    "version": "1.0.0"
}
```

#### **2. Recommended Data Structure**

**Global Settings (`extension_settings.cacheFriendlyMemory`):**
```javascript
{
    enabled: true,
    autoCompact: true,
    compactThreshold: 120,        // Message count trigger
    contextThreshold: 75,         // Percentage trigger
    
    // Compression settings
    level1ChunkSize: 10,         // Messages per L1 summary
    level2ChunkSize: 5,          // L1 summaries per L2 summary
    targetCompression: 55,         // Target percentage
    
    // Model settings
    compressionModel: '',          // Connection profile to use
    compressionPreset: '',         // Or preset to use
    
    // UI settings
    debugMode: false,
    showProgressBar: true
}
```

**Per-Chat Data (`chat_metadata.cacheFriendlyMemory`):**
```javascript
{
    enabled: true,                      // Can override global default
    
    // Hierarchical storage
    level0: {                         // Raw messages (frozen zone)
        startIndex: 0,
        messages: []                   // Message IDs/indices
    },
    level1: {                         // Short-term summaries
        summaries: [
            {
                id: "1",
                startMessageIndex: 0,
                endMessageIndex: 10,
                text: "[Chapter 1] Summary text...",
                timestamp: 1234567890,
                tokenCount: 150
            },
            // ... more summaries
        ]
    },
    level2: {                         // Long-term summaries
        summaries: [...]
    },
    level3: {                         // Ultra-compressed
        summary: "[Story So Far] ..."
    },
    
    // Metadata
    stats: {
        totalMessages: 120,
        summarizedMessages: 120,
        currentCompressionRatio: 0.55,
        lastCompactTime: 1234567890
    }
}
```

#### **3. Implementation Pattern**

```javascript
// File: src/storage.js
import { getContext, saveChatConditional } from '../../../script.js';

const METADATA_KEY = 'cacheFriendlyMemory';

export function getChatStorage() {
    const context = getContext();
    if (!context?.chatMetadata) {
        console.warn('[CacheFriendlyMemory] Context not available');
        return null;
    }
    
    if (!context.chatMetadata[METADATA_KEY]) {
        initializeStorage(context.chatMetadata);
    }
    
    return context.chatMetadata[METADATA_KEY];
}

function initializeStorage(metadata) {
    metadata[METADATA_KEY] = {
        enabled: true,
        level0: { startIndex: 0, messages: [] },
        level1: { summaries: [] },
        level2: { summaries: [] },
        level3: { summary: null },
        stats: {
            totalMessages: 0,
            summarizedMessages: 0,
            currentCompressionRatio: 0,
            lastCompactTime: null
        }
    };
}

export async function saveChatStorage() {
    try {
        await saveChatConditional();
        console.debug('[CacheFriendlyMemory] Data saved to chat file');
    } catch (error) {
        console.error('[CacheFriendlyMemory] Failed to save:', error);
        throw error;
    }
}

// Global settings helpers
export function getGlobalSetting(key) {
    return extension_settings.cacheFriendlyMemory?.[key];
}

export function setGlobalSetting(key, value) {
    if (!extension_settings.cacheFriendlyMemory) {
        extension_settings.cacheFriendlyMemory = {};
    }
    extension_settings.cacheFriendlyMemory[key] = value;
    saveSettingsDebounced();
}

// Per-chat override helpers
export function getChatSetting(key) {
    const storage = getChatStorage();
    const chatValue = storage?.[key];
    if (chatValue !== undefined) {
        return chatValue;
    }
    return getGlobalSetting(key);
}

export function setChatSetting(key, value) {
    const storage = getChatStorage();
    storage[key] = value;
    await saveChatStorage();
}
```

#### **4. Event Integration**

```javascript
// File: index.js
import { eventSource, event_types } from '../../../script.js';
import { getChatStorage, saveChatStorage } from './src/storage.js';

// Listen for message events
eventSource.on(event_types.USER_MESSAGE_RENDERED, async (mesId) => {
    const storage = getChatStorage();
    storage.stats.totalMessages++;
    
    if (shouldCompact(storage)) {
        await performCompaction();
        await saveChatStorage();
    }
});

// Listen for chat changes
eventSource.on(event_types.CHAT_CHANGED, async (chatId) => {
    // Initialize storage for new chat
    getChatStorage();
});
```

#### **5. Export/Import (Optional)**

```javascript
// Export function
export function exportChatData() {
    const storage = getChatStorage();
    const data = {
        exportDate: new Date().toISOString(),
        chatId: getContext().chatId,
        ...storage
    };
    download(JSON.stringify(data, null, 2), 'CacheFriendlyMemory_Export.json');
}

// Import function
export function importChatData(jsonString) {
    try {
        const data = JSON.parse(jsonString);
        const storage = getChatStorage();
        Object.assign(storage, data);
        await saveChatStorage();
        toastr.success('Import successful', 'CacheFriendlyMemory');
    } catch (error) {
        console.error('Import failed:', error);
        toastr.error('Import failed: ' + error.message, 'CacheFriendlyMemory');
    }
}
```

---

## Summary Table

| Data Type | Storage Method | Location | When to Use |
|-----------|---------------|------------|--------------|
| Global config | `extension_settings` | `/data/default-user/settings.json` | User preferences, API settings, thresholds |
| Per-chat data | `chat_metadata` | In chat file (JSONL first line) | Chat-specific memory, state, overrides |
| Presets/Templates | Custom JSON files | `/data/default-user/[ExtensionName]/` | User wants to share/export data |
| Large datasets | API-based storage | Server-side (vectors, etc.) | Performance-critical or shared data |

## Key Takeaways for CacheFriendlyMemory

1. **Store hierarchical summaries in `chat_metadata.cacheFriendlyMemory`** to automatically persist with each chat file
2. **Use `extension_settings.cacheFriendlyMemory`** for global configuration and user preferences
3. **Leverage `saveChatConditional()`** for debounced chat saves to prevent conflicts
4. **Follow the mixed strategy pattern**: Global defaults in settings, chat-specific data and overrides in metadata
5. **Initialize storage lazily**: Create metadata structure only when needed (on chat load)
6. **Consider custom JSON files for presets** if users want to share compression templates
7. **Never use direct file system operations**: Always use SillyTavern's API and helper functions
8. **Handle context availability**: Always check if `getContext()` returns valid data before accessing metadata
