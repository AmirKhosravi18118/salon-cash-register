import { db } from './db'
import type { Role, User } from './types'

const encoder = new TextEncoder()
const uid = () => crypto.randomUUID()

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value)
  return Uint8Array.from(binary, (character) => character.charCodeAt(0))
}

async function derivePassword(password: string, salt: Uint8Array): Promise<string> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits'],
  )
  const bits = await crypto.subtle.deriveBits({
    name: 'PBKDF2',
    salt: salt.buffer as ArrayBuffer,
    iterations: 210_000,
    hash: 'SHA-256',
  }, keyMaterial, 256)
  return bytesToBase64(new Uint8Array(bits))
}

export async function createUser(input: {
  displayName: string
  username: string
  password: string
  role: Role
}): Promise<User> {
  const normalized = input.username.trim().toLowerCase()
  if (!normalized || input.password.length < 6) throw new Error('INVALID_USER')
  if (await db.users.where('username').equals(normalized).first()) {
    throw new Error('USERNAME_EXISTS')
  }
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const user: User = {
    id: uid(),
    displayName: input.displayName.trim(),
    username: normalized,
    passwordHash: await derivePassword(input.password, salt),
    salt: bytesToBase64(salt),
    role: input.role,
    active: true,
    createdAt: new Date().toISOString(),
  }
  await db.users.add(user)
  return user
}

export async function updateUserPassword(userId: string, password: string): Promise<void> {
  if (password.length < 6) throw new Error('INVALID_PASSWORD')
  const user = await db.users.get(userId)
  if (!user) throw new Error('USER_NOT_FOUND')
  const salt = crypto.getRandomValues(new Uint8Array(16))
  await db.users.put({
    ...user,
    salt: bytesToBase64(salt),
    passwordHash: await derivePassword(password, salt),
  })
}

export async function authenticate(username: string, password: string): Promise<User> {
  const user = await db.users.where('username').equals(username.trim().toLowerCase()).first()
  if (!user || !user.active) throw new Error('LOGIN_FAILED')
  const candidate = await derivePassword(password, base64ToBytes(user.salt))
  if (candidate !== user.passwordHash) throw new Error('LOGIN_FAILED')
  return user
}

const SESSION_KEY = 'firouzeh-current-user-v080'

export function saveAuthSession(user: User): void {
  sessionStorage.setItem(SESSION_KEY, user.id)
}

export async function restoreAuthSession(): Promise<User | undefined> {
  const id = sessionStorage.getItem(SESSION_KEY)
  if (!id) return undefined
  const user = await db.users.get(id)
  return user?.active ? user : undefined
}

export function clearAuthSession(): void {
  sessionStorage.removeItem(SESSION_KEY)
}
