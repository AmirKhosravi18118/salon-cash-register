import { LockKeyhole, Sparkles, UserRound } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { authenticate, createUser, saveAuthSession } from '../auth'
import type { User } from '../types'

export function AuthPage({
  needsSetup, onAuthenticated,
}: { needsSetup: boolean; onAuthenticated: (user: User) => void }) {
  const [displayName, setDisplayName] = useState('فیروزه')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const user = needsSetup
        ? await createUser({ displayName, username, password, role: 'manager' })
        : await authenticate(username, password)
      saveAuthSession(user)
      onAuthenticated(user)
    } catch {
      setError(needsSetup
        ? 'اطلاعات را کامل کن؛ رمز باید حداقل ۶ کاراکتر باشد.'
        : 'نام کاربری یا رمز عبور درست نیست.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-orb one" /><div className="auth-orb two" />
      <form className="auth-card" onSubmit={submit}>
        <div className="auth-logo">FH</div>
        <div className="auth-title">
          <Sparkles size={18} />
          <div>
            <h1>{needsSetup ? 'ایجاد حساب مدیر' : 'ورود به پنل'}</h1>
            <p>{needsSetup ? 'مدیر اصلی را برای اولین ورود تعریف کن.' : 'اطلاعات حساب خود را وارد کن.'}</p>
          </div>
        </div>
        {needsSetup && (
          <label><span>نام نمایشی</span><div className="input-wrap"><UserRound size={18} /><input value={displayName} onChange={(e) => setDisplayName(e.target.value)} required /></div></label>
        )}
        <label><span>نام کاربری</span><div className="input-wrap"><UserRound size={18} /><input dir="ltr" value={username} onChange={(e) => setUsername(e.target.value)} required /></div></label>
        <label><span>رمز عبور</span><div className="input-wrap"><LockKeyhole size={18} /><input dir="ltr" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} /></div></label>
        {error && <p className="form-error">{error}</p>}
        <button className="primary-button full" disabled={busy} type="submit">
          {busy ? 'در حال بررسی…' : needsSetup ? 'ساخت حساب مدیر' : 'ورود'}
        </button>
      </form>
    </div>
  )
}
