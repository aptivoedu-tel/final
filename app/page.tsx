'use client';

import React from 'react';
import Link from 'next/link';
import { BookOpen, CheckCircle, ArrowRight, Brain, Calculator, MessageSquare, Share2 } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white font-sans text-slate-900">
      {/* Navigation */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-teal-700 rounded-lg flex items-center justify-center text-white font-bold">
              <BookOpen className="w-5 h-5" />
            </div>
            <span className="text-xl font-bold text-slate-900">Aptivo</span>
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <Link href="/courses" className="hover:text-teal-600 transition-colors">Courses</Link>
            <Link href="#" className="hover:text-teal-600 transition-colors">Materials</Link>
            <Link href="/practice" className="hover:text-teal-600 transition-colors">Practice</Link>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
            >
              Log In
            </Link>
            <Link
              href="/register"
              className="px-4 py-2 bg-teal-700 text-white text-sm font-semibold rounded-lg hover:bg-teal-800 transition-colors shadow-sm"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-slate-50 to-white">
        <div className="max-w-4xl mx-auto text-center space-y-8 animate-fade-in">
          <h1 className="text-5xl md:text-6xl font-extrabold text-slate-900 tracking-tight leading-tight">
            Master your future <br />
            with <span className="text-teal-700">Aptivo</span>
          </h1>

          <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
            The simple, focused aptitude preparation platform designed to help students excel in competitive exams through structured learning.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link
              href="/dashboard"
              className="px-8 py-3.5 bg-teal-700 text-white font-semibold rounded-lg hover:bg-teal-800 transition-all shadow-lg hover:shadow-teal-700/20 transform hover:-translate-y-0.5"
            >
              Start Learning
            </Link>
            <Link
              href="/courses"
              className="flex items-center gap-2 px-8 py-3.5 bg-white text-slate-700 font-medium rounded-lg border border-gray-200 hover:border-teal-200 hover:bg-teal-50 transition-all"
            >
              View curriculum
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Tracks Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Preparation Tracks</h2>
            <p className="text-slate-600">Focused modules built for modern exam formats.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: Calculator,
                title: 'Quantitative',
                desc: 'Systematic approach to numbers, algebra, and logic-based math.'
              },
              {
                icon: Share2,
                title: 'Verbal Ability',
                desc: 'Master comprehension and advanced vocabulary for standardized tests.'
              },
              {
                icon: Brain,
                title: 'Logical Reasoning',
                desc: 'Develop analytical thinking through pattern recognition and problem sets.'
              }
            ].map((track, i) => (
              <div key={i} className="p-8 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-xl hover:border-teal-100 transition-all group">
                <div className="w-12 h-12 bg-teal-50 rounded-xl flex items-center justify-center text-teal-700 mb-6 group-hover:scale-110 transition-transform">
                  <track.icon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">{track.title}</h3>
                <p className="text-slate-600 leading-relaxed text-sm">{track.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto bg-teal-800 rounded-3xl p-12 md:p-20 text-center text-white relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
          <div className="relative z-10 space-y-8">
            <h2 className="text-3xl md:text-4xl font-bold">Ready to start your journey?</h2>
            <p className="text-teal-100 max-w-xl mx-auto text-lg">
              Join Aptivo today and get access to the most structured aptitude prep platform available.
            </p>
            <Link
              href="/register"
              className="inline-block px-8 py-4 bg-white text-teal-900 font-bold rounded-xl hover:bg-teal-50 transition-colors shadow-lg"
            >
              Create Free Account
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-50 py-12 border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-teal-700 rounded flex items-center justify-center text-white">
              <BookOpen className="w-3 h-3" />
            </div>
            <span className="font-bold text-slate-900">Aptivo</span>
          </div>
          <p className="text-slate-500 text-sm">© 2026 Aptivo. All rights reserved.</p>
          <div className="flex gap-6 text-sm text-slate-500">
            <Link href="#" className="hover:text-teal-700">Privacy Policy</Link>
            <Link href="#" className="hover:text-teal-700">Terms of Service</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
