# NotificationControl Component - Documentation Brief

**Audience**: Documentation writers adding notifications component to existing docs
**Purpose**: Complete reference for the new NotificationControl component
**Integration**: Add this to existing Replyke CLI documentation

---

## Component Overview

**NotificationControl** is a dropdown notification control component for displaying real-time application notifications. Think of it like the notification bell you see in apps like GitHub, LinkedIn, or Facebook - a bell icon that shows unread count, and when clicked, displays a dropdown list of notifications.

### What It Does

- Displays a dropdown of user notifications when triggered
- Shows unread notification count badge
- Supports infinite scroll (load more)
- Mark as read / Mark all as read functionality
- Smart viewport positioning (doesn't overflow screen edges)
- Loading states and empty states
- Supports light/dark themes
- Animated with framer-motion

### What It's NOT

This is NOT a full-page notifications center or inbox. It's a dropdown control component that users can integrate into their navigation bar or header.

---

## Installation

### Add to Your Project

```bash
# After running `npx @replyke/cli init`
npx @replyke/cli add notifications-control
```

### What Gets Installed

```
src/components/notifications-control/
├── index.ts                              # Barrel export (entry point)
├── components/                           # All UI components
│   ├── notification-control.tsx          # Main dropdown control
│   ├── notification-list.tsx             # List with infinite scroll
│   ├── notification-item.tsx             # Individual notification
│   └── notification-icon.tsx             # Type-based icon display
└── utils/                                # Utilities
    └── notification-utils.ts             # Time formatting, text truncation
```

**Total: 5 files** - Much simpler than comment components!

---

## Available Variants

Like all Replyke CLI components, NotificationControl comes in **two styling variants**:

### 1. Inline Styles (`styled`)

```bash
# During init, select "Inline Styles"
npx @replyke/cli add notifications-control
```

**Characteristics:**
- All styles as inline `style={{}}` objects
- Uses OKLCH color space for better color accuracy
- Theme controlled via `theme` prop (`"auto" | "light" | "dark"`)
- No CSS dependencies
- Works everywhere

**Colors used:**
```tsx
// Light theme
background: "#ffffff"
text: "#0f172a"
border: "#e5e7eb"
muted: "#64748b"

// Dark theme
background: "oklch(0.205 0 0)"
text: "oklch(0.985 0 0)"
border: "oklch(1 0 0 / 10%)"
muted: "oklch(0.708 0 0)"
```

### 2. Tailwind CSS (`tailwind`)

```bash
# During init, select "Tailwind CSS"
npx @replyke/cli add notifications-control
```

**Characteristics:**
- Uses Tailwind utility classes
- Dark mode via `dark:` prefix
- Requires `darkMode: 'class'` in tailwind.config.js
- Parent element needs `dark` class for dark mode
- Standard Tailwind color palette

**Classes used:**
```tsx
bg-white dark:bg-gray-900
text-gray-900 dark:text-gray-100
border-gray-200 dark:border-gray-700
```

---

## Component Props & API

### NotificationControl Props

```tsx
interface NotificationControlProps {
  // Required: Custom trigger component
  triggerComponent: React.ComponentType<{ unreadCount: number }>;

  // Required: What happens when notification is clicked
  onNotificationClick: (
    notification: AppNotification.PotentiallyPopulatedUnifiedAppNotification
  ) => void;

  // Optional: Notification templates (filtering)
  notificationTemplates?: AppNotification.NotificationTemplates;

  // Optional: Callback for "View All" footer button
  onViewAllNotifications?: () => void;

  // Optional: Theme (styled variant only)
  theme?: "auto" | "light" | "dark";
}
```

### Minimal Usage

```tsx
import NotificationControl from './components/notifications-control';

function Header() {
  return (
    <NotificationControl
      triggerComponent={({ unreadCount }) => (
        <button>
          🔔 {unreadCount > 0 && `(${unreadCount})`}
        </button>
      )}
      onNotificationClick={(notification) => {
        console.log('Clicked:', notification);
        // Navigate to the notification's target
      }}
    />
  );
}
```

### Complete Example with All Features

```tsx
import NotificationControl from './components/notifications-control';
import { useNavigate } from 'react-router-dom';

function Header() {
  const navigate = useNavigate();

  return (
    <NotificationControl
      // Custom bell icon with badge
      triggerComponent={({ unreadCount }) => (
        <div className="relative">
          <BellIcon className="w-6 h-6" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </div>
      )}

      // Handle notification clicks
      onNotificationClick={(notification) => {
        if (notification.type === 'comment-reply') {
          navigate(`/posts/${notification.metadata.entityId}#comment-${notification.metadata.commentId}`);
        } else if (notification.type === 'new-follow') {
          navigate(`/users/${notification.metadata.followerId}`);
        }
        // Notification is automatically marked as read on click
      }}

      // Optional: Filter to only show certain notification types
      notificationTemplates={{
        'comment-reply': true,
        'entity-mention': true,
        'new-follow': true,
      }}

      // Optional: "View All" button in footer
      onViewAllNotifications={() => navigate('/notifications')}

      // Optional: Theme (styled variant only)
      theme="auto"  // or "light" | "dark"
    />
  );
}
```

---

## Notification Types & Icons

The component supports various notification types with appropriate icons:

| Type | Icon | Color | Use Case |
|------|------|-------|----------|
| `system` | Wrench | Blue | System announcements |
| `entity-comment` | MessageCircle | Blue | New comment on entity |
| `comment-reply` | MessageSquare | Blue | Reply to your comment |
| `entity-mention` | @ (AtSign) | Purple | Mentioned in entity |
| `comment-mention` | @ (AtSign) | Purple | Mentioned in comment |
| `entity-upvote` | Heart | Red | Upvote on entity |
| `comment-upvote` | Heart | Red | Upvote on comment |
| `new-follow` | UserPlus | Green | New follower |
| `connection-accepted` | UserPlus | Green | Connection accepted |
| `connection-request` | UserPlus | Green | Connection request |

Icons are from **lucide-react** (dependency).

---

## Features in Detail

### 1. Smart Dropdown Positioning

The dropdown automatically positions itself to stay within viewport:

- **Desktop**: Aligns to right edge of trigger by default
- **Mobile**: Uses fixed positioning, centers if needed
- **Overflow detection**: Switches to left alignment or fixed positioning if right side would overflow
- **Responsive width**: 400px on desktop, adapts on mobile (with 32px padding)

### 2. Infinite Scroll

```tsx
// Loads 10 notifications initially
// "Load more" button at bottom loads next batch
// Powered by useAppNotifications hook from @replyke/react-js
```

### 3. Mark as Read

- **Single**: Click any notification → automatically marked as read
- **Bulk**: "Mark all read" button in header (only shows when there are unread notifications)

### 4. Empty State

Beautiful empty state when no notifications:
- Bell icon
- "No notifications yet" message
- Helpful subtitle

### 5. Loading States

- Initial load: 3 skeleton placeholders
- Load more: Spinner with "Loading more..." text

### 6. System Notifications with Buttons

Special `system` type notifications can include action buttons:

```tsx
// Example system notification (from backend)
{
  type: "system",
  title: "New feature available!",
  content: "Check out our new dark mode",
  metadata: {
    buttonData: {
      text: "Try it now",
      url: "https://yourapp.com/settings"
    }
  }
}
```

The component renders this with a clickable button that opens the URL.

---

## Theme Handling

### Styled Variant

Uses the `theme` prop:

```tsx
<NotificationControl
  theme="auto"  // Uses prefers-color-scheme media query
  // OR
  theme="light"
  // OR
  theme="dark"
  {...otherProps}
/>
```

Wire it to your app's theme state:

```tsx
const [isDark, setIsDark] = useState(false);

<NotificationControl
  theme={isDark ? 'dark' : 'light'}
  {...otherProps}
/>
```

### Tailwind Variant

No `theme` prop. Uses Tailwind's dark mode system:

```tsx
// In your root layout/app component
<html className={isDark ? 'dark' : ''}>
  <body>
    <Header>
      <NotificationControl {...props} />
    </Header>
  </body>
</html>
```

Requires `tailwind.config.js`:
```js
module.exports = {
  darkMode: 'class',  // Important!
  // ... other config
}
```

---

## Customization Guide

### 1. Change Colors

**Styled variant:**

Open `notification-control.tsx` and find the `colors` object:

```tsx
const colors = {
  background: isDarkTheme ? "oklch(0.205 0 0)" : "#ffffff",
  border: isDarkTheme ? "oklch(1 0 0 / 10%)" : "#e5e7eb",
  text: isDarkTheme ? "oklch(0.985 0 0)" : "#0f172a",
  textMuted: isDarkTheme ? "oklch(0.708 0 0)" : "#64748b",
  separator: isDarkTheme ? "oklch(1 0 0 / 10%)" : "#f1f5f9",
};
```

Replace with your brand colors.

**Tailwind variant:**

Edit `tailwind.config.js` or change classes directly:

```tsx
// Change from:
<div className="bg-white dark:bg-gray-900">

// To:
<div className="bg-slate-50 dark:bg-slate-950">
```

### 2. Customize Notification Item Layout

Open `notification-item.tsx`:

```tsx
// Add a timestamp badge
<div className="absolute top-2 right-2">
  <span className="text-xs text-gray-500">
    {new Date(notification.createdAt).toLocaleDateString()}
  </span>
</div>

// Remove the unread indicator dot
// Just delete or comment out the dot rendering code

// Change avatar size
<div className="w-12 h-12"> {/* was w-8 h-8 */}
```

### 3. Modify Dropdown Size

In `notification-control.tsx`:

```tsx
// Change width
width: "500px",  // was 400px

// Change max height of scrollable area
<div style={{ maxHeight: "600px" }}>  {/* was 500px */}
```

### 4. Add Custom Footer

In `notification-control.tsx`, find the footer section:

```tsx
{/* Add your custom footer before the existing one */}
<div style={{ padding: "12px", borderTop: `1px solid ${colors.separator}` }}>
  <button onClick={handleCustomAction}>
    Custom Action
  </button>
</div>

{/* Existing "View all" footer */}
{onViewAllNotifications && (
  // ... existing code
)}
```

### 5. Change Icon Colors

Open `notification-icon.tsx` and modify the `getIconConfig` function:

```tsx
"comment-reply": {
  Icon: MessageSquare,
  colorClass: "text-purple-600 dark:text-purple-400",  // was blue
  bgClass: "bg-purple-100 dark:bg-purple-500/15",
},
```

### 6. Customize Time Format

Open `utils/notification-utils.ts`:

```tsx
export function formatRelativeTime(dateInput: string | Date): string {
  // Modify the logic here
  // For example, show exact time for recent notifications:
  if (diffInSeconds < 60) {
    return new Date(dateInput).toLocaleTimeString();  // "2:34 PM" instead of "Just now"
  }
  // ... rest of function
}
```

---

## Required Dependencies

NotificationControl depends on:

```json
{
  "dependencies": {
    "@replyke/react-js": "^6.0.0",
    "framer-motion": "^11.0.0",
    "lucide-react": "^0.400.0"
  }
}
```

**Tailwind variant additionally requires:**
```json
{
  "dependencies": {
    "clsx": "^2.0.0",
    "tailwind-merge": "^2.0.0"
  }
}
```

The CLI will prompt you to install missing dependencies during `init`.

---

## Integration Examples

### With Next.js App Router

```tsx
// app/components/Header.tsx
'use client';

import NotificationControl from '@/components/notifications-control';
import { useRouter } from 'next/navigation';

export default function Header() {
  const router = useRouter();

  return (
    <header>
      <nav>
        {/* ... other nav items */}
        <NotificationControl
          triggerComponent={BellIcon}
          onNotificationClick={(notif) => {
            router.push(`/notifications/${notif.id}`);
          }}
        />
      </nav>
    </header>
  );
}
```

### With React Router

```tsx
// components/Navigation.tsx
import NotificationControl from './components/notifications-control';
import { useNavigate } from 'react-router-dom';

export default function Navigation() {
  const navigate = useNavigate();

  return (
    <nav>
      <NotificationControl
        triggerComponent={BellIcon}
        onNotificationClick={(notif) => {
          // Navigate based on notification type
          if (notif.metadata.entityId) {
            navigate(`/entity/${notif.metadata.entityId}`);
          }
        }}
        onViewAllNotifications={() => navigate('/notifications')}
      />
    </nav>
  );
}
```

### Mobile-Friendly Trigger

```tsx
const MobileBellTrigger = ({ unreadCount }: { unreadCount: number }) => (
  <button className="relative p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
    <Bell className="w-6 h-6" />
    {unreadCount > 0 && (
      <span className="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
        {unreadCount > 9 ? '9+' : unreadCount}
      </span>
    )}
  </button>
);

<NotificationControl
  triggerComponent={MobileBellTrigger}
  onNotificationClick={handleClick}
/>
```

---

## Comparison with Comments Components

| Aspect | NotificationControl | Comment Components |
|--------|-------------------|-------------------|
| **Complexity** | Simple (5 files) | Complex (25+ files) |
| **Purpose** | Dropdown bell notification | Full comment section |
| **Main Use** | Navigation bar | Page content area |
| **Nesting** | Flat list | Deep threading |
| **User Actions** | Click, mark read | Reply, vote, edit, delete, report |
| **State Management** | Minimal | Complex (nested replies, forms) |
| **Customization** | Colors, layout | Colors, layout, behavior, features |

---

## Common Use Cases

### 1. Social Media App

```tsx
<NotificationControl
  triggerComponent={BellWithBadge}
  onNotificationClick={(notif) => {
    if (notif.type === 'new-follow') {
      navigate(`/profile/${notif.metadata.followerId}`);
    } else if (notif.type === 'comment-reply') {
      navigate(`/post/${notif.metadata.postId}`);
    }
  }}
/>
```

### 2. SaaS Dashboard

```tsx
<NotificationControl
  notificationTemplates={{
    'system': true,  // Only system notifications
  }}
  triggerComponent={SystemBell}
  onNotificationClick={(notif) => {
    if (notif.metadata.buttonData) {
      window.location.href = notif.metadata.buttonData.url;
    }
  }}
/>
```

### 3. Community Platform

```tsx
<NotificationControl
  notificationTemplates={{
    'comment-mention': true,
    'comment-reply': true,
    'entity-upvote': true,
  }}
  triggerComponent={CommunityBell}
  onNotificationClick={handleNotificationClick}
  onViewAllNotifications={() => navigate('/inbox')}
/>
```

---

## Accessibility Features

Built-in accessibility:

1. **Keyboard Navigation**: Dropdown closes on Escape key (via click-outside handler)
2. **Click Outside**: Clicking anywhere outside closes the dropdown
3. **Semantic HTML**: Uses proper button elements
4. **Visual Indicators**: Unread dot, badges for unread count
5. **Loading States**: Clear loading indicators prevent confusion

**Recommended additions:**

```tsx
// Add ARIA labels to your trigger component
const AccessibleBell = ({ unreadCount }: { unreadCount: number }) => (
  <button
    aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
    aria-expanded="false"  // Toggle based on dropdown state
  >
    <Bell />
    {unreadCount > 0 && <Badge>{unreadCount}</Badge>}
  </button>
);
```

---

## Performance Considerations

### Optimization Tips

1. **Lazy Load**: Only render when user has notifications
   ```tsx
   {hasNotifications && (
     <NotificationControl {...props} />
   )}
   ```

2. **Memoize Trigger**: If trigger re-renders frequently
   ```tsx
   const BellIcon = React.memo(({ unreadCount }) => (
     <button>🔔 {unreadCount}</button>
   ));
   ```

3. **Debounce Clicks**: Prevent rapid clicking
   ```tsx
   const handleClick = useDebouncedCallback(
     (notification) => {
       // handle click
     },
     300
   );
   ```

### Bundle Size

- **Styled variant**: ~15KB minified (with dependencies)
- **Tailwind variant**: ~12KB minified (Tailwind classes are atomic)

Much smaller than full comment components (~80KB).

---

## Troubleshooting

### Dropdown appears off-screen

Check your parent container's CSS:
```css
/* Parent must not have overflow: hidden */
.parent {
  overflow: visible;  /* Not hidden! */
}
```

Or switch to fixed positioning manually in `notification-control.tsx`.

### Unread count not updating

Ensure `@replyke/react-js` is properly configured:
```tsx
// Wrap your app with ReplykeProvider
import { ReplykeProvider } from '@replyke/react-js';

<ReplykeProvider apiKey="your-key">
  <App />
</ReplykeProvider>
```

### Dark mode not working (Tailwind)

Check `tailwind.config.js`:
```js
module.exports = {
  darkMode: 'class',  // Must be 'class' not 'media'
  // ...
}
```

And ensure `dark` class is on parent:
```tsx
<html className={isDark ? 'dark' : ''}>
```

### Icons not showing

Install `lucide-react`:
```bash
npm install lucide-react
```

---

## API Reference

### NotificationControl Component

```tsx
interface NotificationControlProps {
  triggerComponent: React.ComponentType<{ unreadCount: number }>;
  onNotificationClick: (notification: AppNotification.PotentiallyPopulatedUnifiedAppNotification) => void;
  notificationTemplates?: AppNotification.NotificationTemplates;
  onViewAllNotifications?: () => void;
  theme?: "auto" | "light" | "dark";  // Styled variant only
}
```

### Utility Functions

```tsx
// From utils/notification-utils.ts

// Format timestamp as relative time
formatRelativeTime(date: string | Date): string
// Returns: "Just now", "5m ago", "2h ago", "3d ago", etc.

// Truncate long text
truncateText(text: string, maxLength: number = 60): string
// Returns: "Long text here..." (adds ellipsis)
```

### Notification Object Type

```tsx
interface UnifiedAppNotification {
  id: string;
  userId: string;
  isRead: boolean;
  createdAt: string;
  type: "system" | "entity-comment" | "comment-reply" | "entity-mention" |
        "comment-mention" | "entity-upvote" | "comment-upvote" | "new-follow" |
        "connection-accepted" | "connection-request";
  title: string;
  content: string | null;
  metadata: {
    // Varies by notification type
    entityId?: string;
    commentId?: string;
    initiatorAvatar?: string;
    buttonData?: {
      text: string;
      url: string;
    };
    // ... other fields
  };
}
```

---

## Key Messaging for Documentation

### Headline Benefits

1. **"Drop-in notification control"** - Add to any navigation bar
2. **"Real-time updates"** - Powered by Replyke's notification system
3. **"Fully customizable"** - It's your code, modify anything
4. **"Smart positioning"** - Never overflows viewport
5. **"Theme-aware"** - Light/dark mode built-in

### When to Use

**Use NotificationControl when:**
- You need a dropdown notification bell in your app
- You want real-time notification updates
- You're using Replyke's commenting/social features
- You need a lightweight, customizable solution

**Don't use when:**
- You need a full-page notifications center (build custom with the data from `useAppNotifications` hook)
- You want push notifications (this is in-app only)
- You need custom notification types (limited to Replyke's types)

---

## Migration & Updates

### Future Updates

When new versions are released with improvements:

1. **Manual approach** (current):
   ```bash
   # Rename existing
   mv src/components/notifications-control src/components/notifications-control-old

   # Install new version
   npx @replyke/cli add notifications-control

   # Copy your customizations from -old to new
   # Delete -old when done
   ```

2. **Diff command** (planned):
   ```bash
   npx @replyke/cli diff notifications-control
   # Shows what changed, helps merge updates
   ```

---

## Complete Working Example

```tsx
// app/layout.tsx (Next.js) or App.tsx (CRA)
'use client';

import { useState } from 'react';
import { ReplykeProvider } from '@replyke/react-js';
import NotificationControl from './components/notifications-control';
import { Bell } from 'lucide-react';

function App() {
  const [isDark, setIsDark] = useState(false);

  const BellTrigger = ({ unreadCount }: { unreadCount: number }) => (
    <button className="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
      <Bell className="w-6 h-6" />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
          {unreadCount}
        </span>
      )}
    </button>
  );

  return (
    <ReplykeProvider apiKey={process.env.NEXT_PUBLIC_REPLYKE_KEY}>
      <div className={isDark ? 'dark' : ''}>
        <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
          <nav className="container mx-auto px-4 py-3 flex items-center justify-between">
            <h1>My App</h1>

            <div className="flex items-center gap-4">
              <button onClick={() => setIsDark(!isDark)}>
                {isDark ? '☀️' : '🌙'}
              </button>

              <NotificationControl
                triggerComponent={BellTrigger}
                onNotificationClick={(notification) => {
                  console.log('Notification clicked:', notification);
                  // Handle navigation based on notification type
                }}
                onViewAllNotifications={() => {
                  window.location.href = '/notifications';
                }}
              />
            </div>
          </nav>
        </header>

        <main>
          {/* Your app content */}
        </main>
      </div>
    </ReplykeProvider>
  );
}

export default App;
```

---

## Documentation Integration Checklist

When adding this to existing docs:

- [ ] Add to components list (alongside comments-threaded, comments-social)
- [ ] Add installation command to CLI commands reference
- [ ] Include in "Available Components" overview
- [ ] Add notification types reference table
- [ ] Include customization examples
- [ ] Add to troubleshooting section
- [ ] Create dedicated "Notifications" page or section
- [ ] Add to quickstart/getting started guide
- [ ] Include in API reference
- [ ] Add screenshots/demos (if available)

---

## End of Document

This document provides everything needed to document the NotificationControl component without re-reading the entire component approach documentation.
