import { env } from 'cloudflare:workers';
import {
  getChatGPTUser,
  requireChatGPTUser,
  type ChatGPTUser,
} from '@/app/chatgpt-auth';

export function isOwner(user: ChatGPTUser | null) {
  const configuredEmail = env.BLOG_OWNER_EMAIL?.trim().toLowerCase();
  if (!user || !configuredEmail) return false;
  return user.email.toLowerCase() === configuredEmail;
}

export async function getOptionalOwner() {
  const user = await getChatGPTUser();
  return isOwner(user) ? user : null;
}

export async function requireOwner(returnTo: string) {
  const user = await requireChatGPTUser(returnTo);
  if (!isOwner(user)) {
    throw new OwnerAccessError();
  }
  return user;
}

export async function requireApiOwner() {
  const user = await getChatGPTUser();
  if (!isOwner(user)) throw new OwnerAccessError();
  return user;
}

export class OwnerAccessError extends Error {
  constructor() {
    super('이 블로그의 관리자만 접근할 수 있습니다.');
    this.name = 'OwnerAccessError';
  }
}
