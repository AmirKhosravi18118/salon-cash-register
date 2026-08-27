import { db } from './db'
import type { AuthSession, Role, UserAccount } from './types'
import { uid } from './lib/format'

const SESSION_KEY = 'firouzeh-session-v090'

function normalizeUsername(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, '')
}

function bytesToHex(bytes: Uint8Array): string {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

function randomSalt(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return bytesToHex(bytes)
}

async function hashPassword(password: string, salt: string): Promise<string> {
  const content = new TextEncoder().encode(`${salt}:${password}`)
  const digest = await crypto.subtle.digest('SHA-256', content)
  return bytesToHex(new Uint8Array(digest))
}

export async function managerExists(): Promise<boolean> {
  return Boolean(await db.users.where('role').equals('manager').first())
}

export async function createManager(input: {
  name: string
  username: string
  password: string
}): Promise<UserAccount> {
  if (await managerExists()) throw new Error('MANAGER_EXISTS')
  return createUser({ ...input, role: 'manager' })
}

export async function createUser(input: {
  name: string
  username: string
  password: string
  role: Role
}): Promise<UserAccount> {
  const username = normalizeUsername(input.username)
  if (!username || input.password.length < 6 || !input.name.trim()) {
    throw new Error('INVALID_USER')
  }
  if (await db.users.where('username').equals(username).first()) {
    throw new Error('USERNAME_EXISTS')
  }

  const salt = randomSalt()
  const user: UserAccount = {
    id: uid('user'),
    name: input.name.trim(),
    username,
    passwordSalt: salt,
    passwordHash: await hashPassword(input.password, salt),
    role: input.role,
    active: true,
    createdAt: new Date().toISOString(),
  }
  await db.users.add(user)
  return user
}

export async function login(usernameInput: string, password: string): Promise<UserAccount> {
  const username = normalizeUsername(usernameInput)
  const user = await db.users.where('username').equals(username).first()
  if (!user) throw new Error('INVALID_LOGIN')
  if (!user.active) throw new Error('ACCOUNT_DISABLED')
  const passwordHash = await hashPassword(password, user.passwordSalt)
  if (passwordHash !== user.passwordHash) throw new Error('INVALID_LOGIN')

  const updated = { ...user, lastLoginAt: new Date().toISOString() }
  await db.users.put(updated)
  const session: AuthSession = { userId: user.id, createdAt: new Date().toISOString() }
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  return updated
}

export async function currentUser(): Promise<UserAccount | undefined> {
  try {
    const value = localStorage.getItem(SESSION_KEY)
    if (!value) return undefined
    const session = JSON.parse(value) as AuthSession
    const user = await db.users.get(session.userId)
    if (!user?.active) {
      logout()
      return undefined
    }
    return user
  } catch {
    logout()
    return undefined
  }
}

export function logout(): void {
  localStorage.removeItem(SESSION_KEY)
}

export async function resetPassword(userId: string, nextPassword: string): Promise<void> {
  if (nextPassword.length < 6) throw new Error('SHORT_PASSWORD')
  const user = await db.users.get(userId)
  if (!user) throw new Error('USER_NOT_FOUND')
  const salt = randomSalt()
  await db.users.put({
    ...user,
    passwordSalt: salt,
    passwordHash: await hashPassword(nextPassword, salt),
  })
}

export async function updateUser(input: {
  id: string
  name: string
  username: string
  active: boolean
}): Promise<void> {
  const user = await db.users.get(input.id)
  if (!user) throw new Error('USER_NOT_FOUND')
  const username = normalizeUsername(input.username)
  const duplicate = await db.users.where('username').equals(username).first()
  if (duplicate && duplicate.id !== input.id) throw new Error('USERNAME_EXISTS')
  await db.users.put({ ...user, name: input.name.trim(), username, active: input.active })
}

export async function deleteUser(userId: string): Promise<void> {
  const user = await db.users.get(userId)
  if (!user || user.role === 'manager') throw new Error('CANNOT_DELETE')
  await db.users.delete(userId)
}
