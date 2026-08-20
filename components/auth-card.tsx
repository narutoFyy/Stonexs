'use client';

import { FormEvent, useState } from 'react';
import { ArrowRight, LoaderCircle } from 'lucide-react';
import Link from 'next/link';
import { parseAsString, useQueryState } from 'nuqs';

interface AuthCardProps {
  title: string;
  description: string;
  mode?: 'sign-in' | 'sign-up';
}

function safeRedirect(value: string) {
  return value.startsWith('/') && !value.startsWith('//') ? value : '/';
}

export default function AuthCard({ title, description, mode = 'sign-in' }: AuthCardProps) {
  const [redirect] = useQueryState('redirect', parseAsString.withDefault('/'));
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [tempToken, setTempToken] = useState<string | null>(null);
  const [maskedEmail, setMaskedEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const isTwoFactor = Boolean(tempToken);
      const response = await fetch(isTwoFactor ? '/api/auth/login/2fa' : '/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(
          isTwoFactor ? { temp_token: tempToken, totp_code: totpCode } : { email: email.trim(), password },
        ),
      });
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error('登录服务响应异常，请稍后重试');
      }
      const payload = (await response.json()) as {
        error?: string;
        requires_2fa?: boolean;
        temp_token?: string;
        user_email_masked?: string;
      };

      if (!response.ok) throw new Error(payload.error || '登录失败，请稍后重试');
      if (payload.requires_2fa && payload.temp_token) {
        setTempToken(payload.temp_token);
        setMaskedEmail(payload.user_email_masked || email);
        return;
      }

      window.location.assign(safeRedirect(redirect));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '登录失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  }

  if (mode === 'sign-up') {
    return (
      <section className="mx-auto w-full max-w-md rounded-lg border border-[#b89a5d]/45 bg-[#f8f3e6] p-8 shadow-[0_24px_70px_rgba(20,32,36,0.12)]">
        <div className="mb-10 border-b border-[#b89a5d]/30 pb-8">
          <p className="mb-3 text-sm font-medium text-[#1f6f78]">石头学术</p>
          <h1 className="font-serif text-4xl font-normal text-[#17242a]">{title}</h1>
          <p className="mt-4 text-sm leading-6 text-[#68777b]">{description}</p>
        </div>
        <a
          href="https://yf-mail.com/register"
          className="flex h-12 w-full items-center justify-between rounded-md bg-[#1f6f78] px-4 text-sm font-semibold text-white hover:bg-[#185b63]"
        >
          前往注册
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </a>
        <p className="mt-6 text-sm text-[#68777b]">
          已有账号？{' '}
          <Link className="font-medium text-[#17242a] underline underline-offset-4" href="/sign-in">
            登录
          </Link>
        </p>
      </section>
    );
  }

  return (
    <section className="mx-auto w-full max-w-md rounded-lg border border-[#b89a5d]/45 bg-[#f8f3e6] p-8 shadow-[0_24px_70px_rgba(20,32,36,0.12)]">
      <div className="mb-8 border-b border-[#b89a5d]/30 pb-8">
        <p className="mb-3 text-sm font-medium text-[#1f6f78]">石头学术</p>
        <h1 className="font-serif text-4xl font-normal text-[#17242a]">{title}</h1>
        <p className="mt-4 text-sm leading-6 text-[#68777b]">{description}</p>
      </div>

      <form className="space-y-5" onSubmit={submit}>
        {tempToken ? (
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-[#17242a]">两步验证码</span>
            <span className="block">
              <input
                autoComplete="one-time-code"
                autoFocus
                className="h-11 w-full rounded-md border border-[#aa9f82] bg-[#fffaf0] px-4 text-base text-[#17242a] outline-none focus:border-[#1f6f78] focus:ring-1 focus:ring-[#1f6f78]"
                inputMode="numeric"
                maxLength={6}
                onChange={(event) => setTotpCode(event.target.value.replace(/\D/g, ''))}
                placeholder="6 位验证码"
                required
                value={totpCode}
              />
            </span>
            {maskedEmail && <span className="mt-2 block text-xs text-neutral-500">账号：{maskedEmail}</span>}
          </label>
        ) : (
          <>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-[#17242a]">邮箱</span>
              <span className="block">
                <input
                  autoComplete="email"
                  className="h-11 w-full rounded-md border border-[#aa9f82] bg-[#fffaf0] px-4 text-sm text-[#17242a] outline-none focus:border-[#1f6f78] focus:ring-1 focus:ring-[#1f6f78]"
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="name@example.com"
                  required
                  type="email"
                  value={email}
                />
              </span>
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-[#17242a]">密码</span>
              <span className="block">
                <input
                  autoComplete="current-password"
                  className="h-11 w-full rounded-md border border-[#aa9f82] bg-[#fffaf0] px-4 text-sm text-[#17242a] outline-none focus:border-[#1f6f78] focus:ring-1 focus:ring-[#1f6f78]"
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  type="password"
                  value={password}
                />
              </span>
            </label>
          </>
        )}

        {error && <p className="border-l-2 border-red-600 pl-3 text-sm text-red-700">{error}</p>}

        <button
          className="flex h-12 w-full items-center justify-center gap-2 rounded-md bg-[#1f6f78] px-4 text-sm font-semibold text-white hover:bg-[#185b63] disabled:opacity-50"
          disabled={loading}
          type="submit"
        >
          {loading ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
          {tempToken ? '验证并登录' : '登录'}
        </button>
      </form>

      <p className="mt-6 text-sm text-[#68777b]">
        没有账号？{' '}
        <Link className="font-medium text-[#17242a] underline underline-offset-4" href="/sign-up">
          注册
        </Link>
      </p>
    </section>
  );
}
