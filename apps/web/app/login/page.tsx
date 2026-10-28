'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  CalendarDaysIcon,
  CheckCircle2Icon,
  ChevronRightIcon,
  SparklesIcon,
  VideoIcon,
  ZapIcon,
} from 'lucide-react';
import { API_URL, AUTH_URL } from '@/lib/api/client';

export default function LoginPage() {
  const [customName, setCustomName] = useState('');
  const [customEmail, setCustomEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const googleAuthHref = `${AUTH_URL}/v1/auth/google/start`;

  const handleCustomLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customEmail.trim()) {
      setError('Please enter your email');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/v1/auth/quick-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email: customEmail.trim(),
          name: customName.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (data.ok && data.token) {
        // Redirect to callback route to set cookie on frontend domain
        window.location.href = `/api/auth/callback?token=${encodeURIComponent(data.token)}`;
      } else {
        setError('Login failed. Please try again.');
        setLoading(false);
      }
    } catch {
      setError('Could not connect to the backend server.');
      setLoading(false);
    }
  };

  const personas = [
    {
      key: 'alex',
      name: 'Alex Morgan',
      role: 'Lead Product Manager',
      desc: 'Loaded with roadmap reviews, customer interviews, and 1:1 syncs.',
      color: 'from-blue-600 to-indigo-600',
      badge: 'Product & Strategy',
    },
    {
      key: 'sarah',
      name: 'Sarah Chen',
      role: 'Staff Engineer',
      desc: 'Packed with architecture reviews, deep focus blocks, and design critiques.',
      color: 'from-purple-600 to-pink-600',
      badge: 'Engineering',
    },
    {
      key: 'marcus',
      name: 'Marcus Vance',
      role: 'Founder & CEO',
      desc: 'Pre-seeded with investor pitches, executive sprint demos, and all-hands.',
      color: 'from-amber-500 to-rose-600',
      badge: 'Executive',
    },
    {
      key: 'demo',
      name: 'Demo Account',
      role: 'Full Sample Suite',
      desc: 'Balanced calendar with personal health, tasks, and team collaborations.',
      color: 'from-emerald-500 to-teal-600',
      badge: 'Standard Demo',
    },
  ];

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#F8FAFD] via-[#EEF4FE] to-[#E5EDFC] px-4 py-12 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <div className="w-full max-w-4xl overflow-hidden rounded-3xl border border-gray-200/80 bg-white shadow-2xl backdrop-blur-xl dark:border-gray-800 dark:bg-gray-900/90">
        <div className="grid grid-cols-1 lg:grid-cols-12">
          {/* Left Hero & Feature Overview */}
          <div className="relative flex flex-col justify-between bg-gradient-to-br from-[#0B57D0] via-[#1056c7] to-[#043e9c] p-8 text-white lg:col-span-5 lg:p-10">
            <div>
              {/* App Logo */}
              <div className="inline-flex items-center gap-2.5 rounded-2xl bg-white/10 px-3.5 py-1.5 backdrop-blur-md">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-[#0B57D0] font-black text-sm">
                  {new Date().getDate()}
                </div>
                <span className="font-bold text-sm tracking-wide">Calendar Monolith Pro</span>
              </div>

              <h1 className="mt-8 text-3xl font-extrabold tracking-tight sm:text-4xl">
                Intelligent Scheduling. Effortless Focus.
              </h1>
              <p className="mt-3 text-sm leading-relaxed text-blue-100">
                A high-performance full-stack calendar platform built with Next.js 16, NestJS 11, Prisma ORM, and PostgreSQL.
              </p>

              {/* Feature Highlights List */}
              <div className="mt-8 space-y-3.5 text-xs text-blue-100">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20">
                    <CalendarDaysIcon size={13} />
                  </div>
                  <span>5 Views: Day, Week, Month, Year &amp; Schedule Agenda</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20">
                    <VideoIcon size={13} />
                  </div>
                  <span>1-Click Video Calls (Jitsi Meet auto-provisioning)</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20">
                    <CheckCircle2Icon size={13} />
                  </div>
                  <span>Built-in Tasks, Checklist &amp; Persistent Scratchpad</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20">
                    <ZapIcon size={13} />
                  </div>
                  <span>Spotlight Command Palette (⌘K) &amp; Keyboard Shortcuts</span>
                </div>
              </div>
            </div>

            <div className="mt-10 border-t border-white/15 pt-4 text-[11px] text-blue-200/80">
              Enterprise security · HttpOnly JWT Cookies · Full PostgreSQL Persistence
            </div>
          </div>

          {/* Right: Sign-in Options */}
          <div className="flex flex-col justify-between p-6 sm:p-8 lg:col-span-7">
            <div>
              <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Welcome to Calendar
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Select a pre-configured interactive persona or sign in with your email.
                </p>
              </div>

              {/* Persona Quick Selection */}
              <div className="mb-6 space-y-2.5">
                <label className="text-[11px] font-bold tracking-wider uppercase text-gray-400 dark:text-gray-500">
                  Instant 1-Click Demo Personas
                </label>
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {personas.map((p) => (
                    <a
                      key={p.key}
                      href={`${AUTH_URL}/v1/auth/demo?persona=${p.key}`}
                      className="group relative flex flex-col justify-between rounded-2xl border border-gray-200/90 bg-white p-3.5 shadow-2xs transition-all hover:-translate-y-0.5 hover:border-blue-400 hover:shadow-md dark:border-gray-800 dark:bg-gray-850 dark:hover:border-blue-600"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className={`flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br ${p.color} text-xs font-bold text-white shadow-2xs`}
                          >
                            {p.name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-gray-900 group-hover:text-blue-600 dark:text-white">
                              {p.name}
                            </p>
                            <p className="text-[10px] text-gray-500 dark:text-gray-400">{p.role}</p>
                          </div>
                        </div>
                        <ChevronRightIcon
                          size={14}
                          className="text-gray-400 transition-transform group-hover:translate-x-0.5 group-hover:text-blue-600"
                        />
                      </div>
                      <p className="mt-2 line-clamp-2 text-[11px] text-gray-400 dark:text-gray-500">
                        {p.desc}
                      </p>
                    </a>
                  ))}
                </div>
              </div>

              {/* Divider */}
              <div className="relative my-5">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200 dark:border-gray-800" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-3 text-[10px] font-semibold text-gray-400 dark:bg-gray-900">
                    Or sign in with custom account
                  </span>
                </div>
              </div>

              {/* Custom Quick Login Form */}
              <form onSubmit={handleCustomLogin} className="space-y-3">
                {error && (
                  <div className="rounded-xl bg-red-50 p-2.5 text-xs text-red-600 dark:bg-red-950/60 dark:text-red-300">
                    {error}
                  </div>
                )}
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  <input
                    type="text"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="Your Name (optional)"
                    className="w-full rounded-xl border border-gray-200 bg-gray-50/70 px-3 py-2 text-xs text-gray-800 outline-none transition focus:border-blue-500 focus:bg-white dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                  <input
                    type="email"
                    required
                    value={customEmail}
                    onChange={(e) => setCustomEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="w-full rounded-xl border border-gray-200 bg-gray-50/70 px-3 py-2 text-xs text-gray-800 outline-none transition focus:border-blue-500 focus:bg-white dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gray-900 py-2.5 text-xs font-semibold text-white shadow-xs transition hover:bg-black active:scale-98 disabled:opacity-50 dark:bg-blue-600 dark:hover:bg-blue-500"
                >
                  <SparklesIcon size={14} />
                  <span>{loading ? 'Signing in...' : 'Sign In & Launch Calendar'}</span>
                </button>
              </form>

              {/* Google OAuth Option */}
              <div className="mt-4">
                <Link
                  href={googleAuthHref}
                  className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-gray-200 bg-white py-2 text-xs font-semibold text-gray-700 shadow-2xs transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-850 dark:text-gray-200 dark:hover:bg-gray-800"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" xmlns="http://www.w3.org/2000/svg">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                  <span>Continue with Google OAuth</span>
                </Link>
              </div>
            </div>

            <p className="mt-6 text-center text-[11px] text-gray-400">
              Safe authentication. No password required for development/demo mode.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
