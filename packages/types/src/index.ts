// ==========================================
// Wesh Derna — Shared Types
// ==========================================

// Enums
export type Role = 'ADMIN' | 'MEMBER' | 'VIEWER';
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

// User
export interface User {
  id: string;
  email: string;
  name: string;
  avatar: string | null;
  createdAt: string;
}

export interface UserPreview {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
}

// Auth
export interface AuthResponse {
  user: Pick<User, 'id' | 'email' | 'name'>;
  token: string;
}

export interface RegisterPayload {
  email: string;
  name: string;
  password: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

// Workspace
export interface Workspace {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  createdAt: string;
  members: WorkspaceMember[];
}

export interface WorkspaceMember {
  id: string;
  role: Role;
  userId: string;
  workspaceId: string;
  user: UserPreview;
}

// Project
export interface Project {
  id: string;
  name: string;
  description: string | null;
  color: string;
  workspaceId: string;
  createdAt: string;
  columns: Column[];
}

export interface ProjectPreview {
  id: string;
  name: string;
  color: string;
  _count: { tasks: number };
}

export interface ProjectMember {
  id: string;
  role: Role;
  userId: string;
  projectId: string;
  user: UserPreview;
}

// Column
export interface Column {
  id: string;
  name: string;
  order: number;
  color: string | null;
  projectId: string;
  tasks: Task[];
}

// Task
export interface Task {
  id: string;
  title: string;
  description: string | null;
  voiceNoteUrl: string | null;
  priority: Priority;
  deadline: string | null;
  order: number;
  columnId: string;
  projectId: string;
  assigneeId: string | null;
  assignee: UserPreview | null;
  tags: Tag[];
  createdAt: string;
  subtasks?: { done: boolean }[];
  attachments?: Attachment[];
  _count?: { comments: number; subtasks?: number; attachments?: number };
}

export interface CreateTaskPayload {
  title: string;
  description?: string;
  priority?: Priority;
  deadline?: string;
  columnId: string;
  projectId: string;
  assigneeId?: string;
}

export interface MoveTaskPayload {
  columnId: string;
  order: number;
}

// Tag
export interface Tag {
  id: string;
  name: string;
  color: string;
}

// Attachment
export interface Attachment {
  id: string;
  filename: string;
  url: string;
  mimeType: string;
  size: number;
  taskId: string;
  createdAt: string;
}

// Comment
export interface Comment {
  id: string;
  content: string;
  taskId: string;
  authorId: string;
  author: UserPreview;
  createdAt: string;
}

// Channel
export interface Channel {
  id: string;
  name: string;
  isPrivate: boolean;
  workspaceId: string;
}

// Message
export interface Message {
  id: string;
  content: string;
  channelId: string | null;
  dmTo: string | null;
  authorId: string;
  author: UserPreview;
  reactions: Reaction[];
  fileUrl: string | null;
  fileName: string | null;
  fileMimeType: string | null;
  createdAt: string;
}

export interface Reaction {
  emoji: string;
  userIds: string[];
}

// DM Conversation (sidebar)
export interface DMConversation {
  user: UserPreview;
  lastMessage: {
    content: string;
    createdAt: string;
    authorId: string;
  } | null;
  unreadCount: number;
}

// Unread counts
export interface UnreadCounts {
  channels: Record<string, number>;
  dms: Record<string, number>;
}

// Notification
export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  read: boolean;
  userId: string;
  createdAt: string;
}

// WebSocket Events
export interface WsEvents {
  'join:workspace': { workspaceId: string };
  'join:channel': { channelId: string };
  'message:send': { content: string; channelId: string };
  'message:new': { message: Message };
  'message:typing': { channelId: string; userId: string; userName: string };
  'task:updated': { task: Task };
  'presence:update': { userId: string; online: boolean };
  'notification:new': { notification: Notification };
}
