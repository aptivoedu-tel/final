'use client';

import React from 'react';
import Link from 'next/link';
import {
  GraduationCap,
  CheckCircle,
  ArrowRight,
  Brain,
  Calculator,
  MessageSquare,
  Share2,
  Star,
  Quote,
  User,
  BookOpen,
  Target,
  FileText,
  BarChart3,
  Building2,
  Zap,
  Users,
  Trophy,
  Activity,
  Award,
  ShieldCheck,
  ChevronRight,
  Menu,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase/client';

export default function LandingPage() {
  const [feedbacks, setFeedbacks] = React.useState<any[]>([]);
  const [universities, setUniversities] = React.useState<any[]>([]);
  const [tracks, setTracks] = React.useState<any[]>([]);
  const [studentMetrics, setStudentMetrics] = React.useState({ count: 0, avatars: [] as string[], averageRating: 5 });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  React.useEffect(() => {
    const fetchData = async () => {
      // Fetch Feedbacks & Average Rating
      const { data: feedbackData } = await supabase
        .from('feedbacks')
        .select(`
          *,
          users:user_id (full_name, avatar_url, role)
        `)
        .eq('is_published', true)
        .order('created_at', { ascending: false });

      if (feedbackData) {
        setFeedbacks(feedbackData.slice(0, 6));
        const avg = feedbackData.reduce((acc, curr) => acc + (curr.rating || 0), 0) / (feedbackData.length || 1);
        setStudentMetrics(prev => ({ ...prev, averageRating: Math.round(avg * 10) / 10 }));
      }

      // Fetch Student Count & Top Avatars
      const { count: studentCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'student');

      const avatarsSet = new Set<string>();

      // Try to get avatars from students first
      const { data: studentAvatars } = await supabase
        .from('users')
        .select('avatar_url')
        .eq('role', 'student')
        .not('avatar_url', 'is', null)
        .limit(10);

      studentAvatars?.forEach(s => { if (s.avatar_url) avatarsSet.add(s.avatar_url); });

      // If not enough, get from any user
      if (avatarsSet.size < 4) {
        const { data: anyAvatars } = await supabase
          .from('users')
          .select('avatar_url')
          .not('avatar_url', 'is', null)
          .limit(10);
        anyAvatars?.forEach(s => { if (s.avatar_url) avatarsSet.add(s.avatar_url); });
      }

      setStudentMetrics(prev => ({
        ...prev,
        count: studentCount || 0,
        avatars: Array.from(avatarsSet).slice(0, 4)
      }));

      // Fetch Universities
      const { data: uniData } = await supabase
        .from('universities')
        .select('name, logo_url')
        .order('name');
      if (uniData) setUniversities(uniData || []);

      // Fetch Courses/Tracks
      const { data: subjectData } = await supabase
        .from('subjects')
        .select('id, name')
        .limit(6);

      if (subjectData) {
        const enrichedTracks = subjectData.map((s, i) => {
          const icons = [Calculator, Share2, Brain, Activity, Award, Trophy];
          const mockTags = [['Algebra', 'Geometry'], ['Vocabulary', 'Grammar'], ['Logic', 'Patterns'], ['Mechanics', 'Optics'], ['Organic', 'Inorganic'], ['Calculus', 'Trig']];
          return {
            id: s.id,
            title: s.name,
            icon: icons[i % icons.length],
            count: 'Verified Curriculum',
            tags: mockTags[i % mockTags.length]
          };
        });
        setTracks(enrichedTracks);
      }
    };
    fetchData();
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.5,
        ease: "easeOut"
      }
    }
  };

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900 overflow-x-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 bg-teal-600 rounded-xl flex items-center justify-center text-white font-bold transition-transform group-hover:scale-105 shadow-lg shadow-teal-600/20">
              <GraduationCap className="w-6 h-6" />
            </div>
            <span className="text-2xl font-bold text-slate-900 tracking-tight">Aptivo</span>
          </Link>

          <div className="hidden md:flex items-center gap-10 text-sm font-semibold text-slate-600">
            <Link href="/courses" className="hover:text-teal-600 transition-colors uppercase tracking-wider">Courses</Link>
            <Link href="#" className="hover:text-teal-600 transition-colors uppercase tracking-wider">Materials</Link>
            <Link href="#institutions" className="hover:text-teal-600 transition-colors uppercase tracking-wider">Institutions</Link>
          </div>

          <div className="hidden md:flex items-center gap-6">
            <Link
              href="/login"
              className="text-sm font-bold text-slate-600 hover:text-slate-900 transition-colors"
            >
              Log In
            </Link>
            <Link
              href="/register"
              className="px-6 py-3 bg-teal-600 text-white text-sm font-bold rounded-xl hover:bg-teal-700 transition-all shadow-lg shadow-teal-600/20 hover:shadow-teal-600/40 active:scale-95"
            >
              Get Started
            </Link>
          </div>

          <button
            className="md:hidden p-2 text-slate-600"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden bg-white border-b border-slate-100 overflow-hidden"
            >
              <div className="px-4 py-6 space-y-4">
                <Link href="/courses" className="block text-lg font-semibold text-slate-900">Courses</Link>
                <Link href="#" className="block text-lg font-semibold text-slate-900">Materials</Link>
                <Link href="#institutions" className="block text-lg font-semibold text-slate-900">Institutions</Link>
                <div className="pt-4 flex flex-col gap-4">
                  <Link href="/login" className="w-full py-3 text-center font-bold text-slate-600 border border-slate-200 rounded-xl">Log In</Link>
                  <Link href="/register" className="w-full py-3 text-center font-bold bg-teal-600 text-white rounded-xl">Get Started</Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(20,184,166,0.08),transparent_50%)]" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 transition-all">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              className="space-y-8"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 border border-teal-100 text-teal-700 text-xs font-bold uppercase tracking-widest">
                <Zap className="w-3 h-3 fill-current" />
                The Future of Learning
              </div>
              <h1 className="text-5xl lg:text-7xl font-black text-slate-900 leading-[1.1] tracking-tight">
                Master Your Future.<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-emerald-600">Outperform the Competition.</span>
              </h1>
              <p className="text-xl text-slate-600 leading-relaxed max-w-xl">
                The intelligent aptitude platform helping <span className="text-slate-900 font-bold">50,000+ students</span> ace exams with data-driven practice and deep analytics.
              </p>
              <div className="flex flex-col sm:flex-row items-center gap-4 pt-4">
                <Link
                  href="/register"
                  className="w-full sm:w-auto px-8 py-5 bg-teal-600 text-white font-bold rounded-2xl hover:bg-teal-700 transition-all shadow-xl shadow-teal-600/25 hover:shadow-teal-600/40 transform hover:-translate-y-1 active:scale-[0.98] text-center"
                >
                  Start Practicing Free
                </Link>
                <Link
                  href="/courses"
                  className="w-full sm:w-auto px-8 py-5 bg-white text-slate-700 font-bold rounded-2xl border-2 border-slate-100 hover:border-teal-200 hover:bg-teal-50 transition-all transform hover:-translate-y-1 text-center"
                >
                  Explore Courses
                </Link>
              </div>
              <div className="flex items-center gap-6 pt-8">
                <div className="flex -space-x-3">
                  {studentMetrics.avatars.length > 0 ? (
                    studentMetrics.avatars.map((url, i) => (
                      <div key={i} className="w-10 h-10 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center overflow-hidden shadow-sm">
                        <img src={url} alt="Active Student" className="w-full h-full object-cover" />
                      </div>
                    ))
                  ) : (
                    [1, 2, 3, 4].map(i => (
                      <div key={i} className="w-10 h-10 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center overflow-hidden">
                        <img src={`https://i.pravatar.cc/100?img=${i + 10}`} alt="" className="w-full h-full object-cover" />
                      </div>
                    ))
                  )}
                  <div className="w-10 h-10 rounded-full border-2 border-white bg-teal-600 flex items-center justify-center text-[10px] font-black text-white shadow-lg shadow-teal-100">
                    +{studentMetrics.count > 1000 ? `${(studentMetrics.count / 1000).toFixed(1)}k` : studentMetrics.count}
                  </div>
                </div>
                <div className="text-sm">
                  <div className="flex text-amber-400 gap-0.5 mb-0.5">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className={`w-4 h-4 ${i < Math.floor(studentMetrics.averageRating) ? 'fill-current' : 'text-slate-200'}`} />
                    ))}
                  </div>
                  <p className="text-slate-500 font-black tracking-tight uppercase text-[10px]">Trusted by students worldwide</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.8, rotate: 5 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ duration: 1, delay: 0.2 }}
              className="relative lg:block"
            >
              <div className="relative z-10 rounded-3xl overflow-hidden shadow-[24px_24px_80px_rgba(0,0,0,0.1)] border border-slate-100">
                <div className="bg-slate-900 px-4 py-2 flex items-center justify-between">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  </div>
                  <div className="text-[10px] font-medium text-slate-400">aptivo.io/dashboard</div>
                  <div className="w-5" />
                </div>
                {/* Mock dashboard content using CSS */}
                <div className="bg-white p-6 h-[400px] flex flex-col gap-6">
                  <div className="flex justify-between items-center">
                    <div className="h-4 w-32 bg-slate-100 rounded" />
                    <div className="h-8 w-8 bg-teal-100 rounded-full" />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                        <div className="h-2 w-12 bg-slate-200 rounded mb-3" />
                        <div className="h-4 w-16 bg-teal-600/20 rounded" />
                      </div>
                    ))}
                  </div>
                  <div className="flex-1 bg-slate-50 rounded-2xl p-4 flex items-end justify-between gap-2 overflow-hidden">
                    {[40, 70, 45, 90, 65, 80, 50, 85, 95, 75, 60, 85].map((h, i) => (
                      <div key={i} className="flex-1 bg-teal-500 rounded-t-sm" style={{ height: `${h}%` }} />
                    ))}
                  </div>
                  <div className="h-12 w-full bg-teal-600 rounded-xl" />
                </div>
              </div>

              {/* Decorative elements */}
              <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-teal-500/20 rounded-full blur-3xl animate-pulse" />
              <div className="absolute -top-10 -right-10 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl animate-pulse delay-700" />
            </motion.div>
          </div>
        </div>

        {/* Partners/Trust Section - Marquee */}
        <div className="mt-24 border-t border-slate-50 pt-16 pb-8">
          <div className="max-w-7xl mx-auto px-4 mb-10 text-center">
            <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em]">
              Trusted by Students Preparing for Top Pakistani Universities
            </h3>
          </div>

          <div className="relative flex overflow-hidden py-4 group">
            {/* Gradient Overlays for smooth entry/exit */}
            <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
            <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />

            {universities.length > 0 && (
              <motion.div
                className="flex gap-12 items-center whitespace-nowrap"
                animate={{ x: [0, -2000] }}
                transition={{
                  duration: 40,
                  repeat: Infinity,
                  ease: "linear"
                }}
                style={{ width: 'fit-content' }}
                whileHover={{ animationPlayState: 'paused' } as any}
              >
                {[...universities, ...universities, ...universities].map((uni, i) => (
                  <div
                    key={i}
                    className="px-12 py-6 bg-white border border-slate-100 rounded-[2rem] hover:border-teal-200 transition-all duration-500 shadow-xl shadow-slate-200/20 flex items-center gap-8 min-w-[420px] shrink-0"
                  >
                    <div className="w-16 h-16 flex items-center justify-center shrink-0">
                      {uni.logo_url ? (
                        <img src={uni.logo_url} alt={uni.name} className="max-h-full max-w-full object-contain" />
                      ) : (
                        <div className="w-full h-full bg-teal-50 rounded-2xl flex items-center justify-center text-teal-600 text-2xl font-black">
                          {uni.name.charAt(0)}
                        </div>
                      )}
                    </div>
                    <span className="text-2xl font-black tracking-tight text-slate-800 whitespace-nowrap">{uni.name}</span>
                  </div>
                ))}
              </motion.div>
            )}
          </div>
        </div>
      </section>

      {/* Why Choose Section */}
      <section className="py-24 bg-slate-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-sm font-black text-teal-600 uppercase tracking-[0.2em]">Why Choose Aptivo</h2>
            <h3 className="text-4xl font-bold text-slate-900 tracking-tight">Built for modern exam perfection.</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                icon: Target,
                title: 'Smart Practice Tests',
                desc: 'AI-curated tests that adapt to your skill level for maximum efficiency.',
                color: 'bg-teal-50 text-teal-600'
              },
              {
                icon: FileText,
                title: 'Detailed Solutions',
                desc: 'Step-by-step explanations for every single question, including shortcuts.',
                color: 'bg-emerald-50 text-emerald-600'
              },
              {
                icon: BarChart3,
                title: 'Performance Analytics',
                desc: 'Visualize your progress with heatmaps, speed analysis, and accuracy.',
                color: 'bg-teal-50 text-teal-600'
              },
              {
                icon: Building2,
                title: 'Institutional Mock Exams',
                desc: 'Simulate high-stakes exams in a real testing environment with rank predictions.',
                color: 'bg-emerald-50 text-emerald-600'
              }
            ].map((feature, i) => (
              <motion.div
                key={i}
                whileHover={{ y: -10 }}
                className="p-8 rounded-[2rem] bg-white border border-slate-100 shadow-sm hover:shadow-2xl transition-all group"
              >
                <div className={`w-14 h-14 ${feature.color} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                  <feature.icon className="w-7 h-7" />
                </div>
                <h4 className="text-xl font-bold text-slate-900 mb-3">{feature.title}</h4>
                <p className="text-slate-500 text-sm leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-24 bg-white relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-sm font-black text-teal-600 uppercase tracking-[0.2em] mb-4">The Process</h2>
            <h3 className="text-4xl font-bold text-slate-900 tracking-tight">How it works</h3>
          </div>

          <div className="relative">
            {/* Connection Line */}
            <div className="hidden lg:block absolute top-10 left-[10%] right-[10%] h-[2px] bg-slate-100" />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12">
              {[
                { step: '01', title: 'Create Account', desc: 'Sign up in seconds and build your custom learning profile.' },
                { step: '02', title: 'Choose Track', desc: 'Select from hundreds of subjects tailored to your specific goals.' },
                { step: '03', title: 'Practice & Analyze', desc: 'Solve questions and receive instant AI-driven performance feedback.' },
                { step: '04', title: 'Improve Score', desc: 'Repeat focused modules until you achieve your target score.' }
              ].map((item, i) => (
                <div key={i} className="relative z-10 text-center space-y-4">
                  <div className="w-20 h-20 bg-white border-2 border-slate-100 rounded-full flex items-center justify-center text-2xl font-black text-teal-600 mx-auto shadow-sm group-hover:border-teal-500 transition-colors">
                    {item.step}
                  </div>
                  <h4 className="text-xl font-bold text-slate-900">{item.title}</h4>
                  <p className="text-slate-500 text-sm leading-relaxed px-4">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Preparation Tracks Section */}
      <section className="py-24 bg-teal-900 text-white overflow-hidden relative">
        <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-teal-800 to-transparent" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-16">
            <div className="space-y-4 max-w-2xl">
              <h2 className="text-sm font-black text-teal-400 uppercase tracking-[0.2em]">Our Curriculum</h2>
              <h3 className="text-5xl font-bold tracking-tight">Master every preparation track.</h3>
              <p className="text-teal-100 text-lg leading-relaxed">
                Comprehensive coverage for all major standardized tests and academic levels. Built by subject matter experts.
              </p>
            </div>
            <Link href="/courses" className="inline-flex items-center gap-2 px-8 py-4 bg-white text-teal-900 font-bold rounded-2xl hover:bg-teal-50 transition-colors">
              Explore All Tracks <ArrowRight className="w-5 h-5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {(tracks.length > 0 ? tracks : [
              { icon: Calculator, title: 'Quantitative', count: '12,000+ Questions', tags: ['Algebra', 'Geometry', 'Logic'] },
              { icon: Share2, title: 'Verbal Ability', count: '8,500+ Questions', tags: ['Vocabulary', 'Grammar', 'RC'] },
              { icon: Brain, title: 'Logical Reasoning', count: '9,200+ Questions', tags: ['Patterns', 'Deductions', 'Cases'] },
              { icon: Activity, title: 'Physics', count: '6,400+ Questions', tags: ['Mechanics', 'Optics', 'Circuitry'] },
              { icon: Award, title: 'Chemistry', count: '5,800+ Questions', tags: ['Organic', 'Inorganic', 'Physical'] },
              { icon: Trophy, title: 'Mathematics', count: '15,000+ Questions', tags: ['Calculus', 'Trig', 'Stats'] }
            ]).map((track, i) => (
              <motion.div
                key={i}
                whileHover={{ scale: 1.02 }}
                className="p-8 bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl group hover:bg-white/20 transition-all cursor-pointer"
              >
                <div className="w-14 h-14 bg-teal-500/20 rounded-2xl flex items-center justify-center mb-6">
                  <track.icon className="w-7 h-7 text-teal-300" />
                </div>
                <h4 className="text-2xl font-bold mb-2">{track.title}</h4>
                <p className="text-teal-300 text-sm font-medium mb-6">{track.count}</p>
                <div className="flex flex-wrap gap-2">
                  {track.tags.map((tag: string, j: number) => (
                    <span key={j} className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] font-bold uppercase tracking-wider">
                      {tag}
                    </span>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-16">
            <div className="space-y-4">
              <h2 className="text-sm font-black text-teal-600 uppercase tracking-[0.2em]">Student Voices</h2>
              <h3 className="text-4xl font-bold text-slate-900 tracking-tight">Student Success Stories</h3>
            </div>
            <div className="hidden sm:flex gap-4">
              {/* Controls placeholder */}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {(feedbacks.length > 0 ? feedbacks : [
              {
                feedback_text: "Aptivo completely changed how I prepare for my finals. The analytics showed me exactly where I was falling behind.",
                rating: 5,
                users: { full_name: "Sarah Johnson", role: "Student", avatar_url: "https://i.pravatar.cc/100?img=32" }
              },
              {
                feedback_text: "The detailed solutions are a lifesaver. No more getting stuck on a problem for hours. Pure efficiency.",
                rating: 5,
                users: { full_name: "Michael Chen", role: "College Applicant", avatar_url: "https://i.pravatar.cc/100?img=12" }
              },
              {
                feedback_text: "Best platform for competitive exam prep. The user interface is so clean and easy to use.",
                rating: 4,
                users: { full_name: "Aman Gupta", role: "Student", avatar_url: "https://i.pravatar.cc/100?img=53" }
              }
            ]).map((f, i) => (
              <div key={i} className="bg-slate-50 p-8 rounded-[2.5rem] flex flex-col h-full border border-slate-100 hover:bg-white hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 group">
                <div className="flex gap-1 mb-6">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className={`w-4 h-4 ${s <= f.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`} />
                  ))}
                </div>
                <p className="text-slate-700 font-medium text-lg leading-relaxed italic mb-8 flex-1">
                  "{f.feedback_text}"
                </p>
                <div className="flex items-center gap-4 pt-6 border-t border-slate-200/50">
                  <div className="w-12 h-12 rounded-2xl overflow-hidden bg-white shadow-sm ring-2 ring-slate-100">
                    <img src={f.users?.avatar_url || `https://ui-avatars.com/api/?name=${f.users?.full_name || 'A'}&background=0D9488&color=fff`} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900">{f.users?.full_name || 'Anonymous'}</h4>
                    <span className="text-xs font-bold text-teal-600 uppercase tracking-widest">{f.users?.role || 'Verified Student'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* For Institutions Section */}
      <section id="institutions" className="py-24 bg-slate-900 overflow-hidden relative">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="bg-teal-600 rounded-[3rem] p-8 md:p-16 lg:p-24 overflow-hidden relative">
            <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-white/10 to-transparent pointer-events-none" />
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div className="space-y-8">
                <div className="inline-block px-4 py-2 bg-white/20 backdrop-blur-md rounded-full text-white text-xs font-black uppercase tracking-widest">
                  Academic Partnership
                </div>
                <h3 className="text-5xl font-black text-white leading-tight">
                  Empower Your Entire Student Body.
                </h3>
                <p className="text-teal-50 text-xl leading-relaxed">
                  Bulk licensing, custom dashboard for teachers, and detailed performance reports for your entire organization.
                </p>
                <div className="flex flex-wrap gap-4 pt-4">
                  <Link href="/register" className="px-8 py-4 bg-white text-teal-600 font-bold rounded-2xl hover:bg-teal-50 transition-all shadow-xl">
                    Register Your Institution
                  </Link>
                  <Link href="/register" className="px-8 py-4 bg-transparent text-white border-2 border-white/30 font-bold rounded-2xl hover:bg-white/10 transition-all">
                    Join as a Student
                  </Link>
                </div>
              </div>
              <div className="relative">
                <div className="grid grid-cols-2 gap-4 scale-110 rotate-3">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className={`aspect-square rounded-3xl bg-white/10 backdrop-blur-xl border border-white/20 p-4 flex flex-col items-center justify-center gap-1 ${i % 2 === 0 ? 'translate-y-8' : ''}`}>
                      <ShieldCheck className="w-10 h-10 text-teal-100 mb-2" />
                      <div className="h-2 w-16 bg-white/20 rounded-full" />
                      <div className="h-2 w-10 bg-white/10 rounded-full" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Banner */}
      <section className="py-24 bg-white">
        <div className="max-w-4xl mx-auto px-4 text-center space-y-12">
          <div className="space-y-4">
            <h2 className="text-sm font-black text-teal-600 uppercase tracking-[0.2em]">Ready to scale?</h2>
            <h3 className="text-5xl font-black text-slate-900 tracking-tight leading-tight">Join the next generation of top performers.</h3>
          </div>
          <div className="p-12 bg-slate-50 rounded-[3rem] border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-8 text-left">
            <div>
              <h4 className="text-2xl font-black text-slate-900 mb-2">Start Learning Today</h4>
              <p className="text-slate-500">Get unlimited access to all practice modules and analytics.</p>
              <ul className="mt-6 space-y-3">
                <li className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <CheckCircle className="w-4 h-4 text-teal-500" /> Unlimited Practice Questions
                </li>
                <li className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <CheckCircle className="w-4 h-4 text-teal-500" /> Pro Performance Tracking
                </li>
              </ul>
            </div>
            <div className="w-[1px] h-32 bg-slate-200 hidden md:block" />
            <div className="flex-1">
              <Link href="/register" className="block w-full text-center py-5 bg-teal-600 text-white font-bold rounded-2xl shadow-xl shadow-teal-600/20 hover:bg-teal-700 transition-all">
                Create Free Account
              </Link>
              <p className="text-center mt-4 text-[10px] uppercase font-bold text-slate-400 tracking-widest">No credit card required</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-50 pt-24 pb-12 border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-12 mb-20">
            <div className="col-span-2 space-y-6">
              <Link href="/" className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center text-white">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <span className="text-xl font-bold text-slate-900 tracking-tight">Aptivo</span>
              </Link>
              <p className="text-slate-500 text-sm leading-relaxed max-w-xs font-medium">
                The world's most advanced aptitude preparation platform. Built for students, loved by educators.
              </p>
              <div className="flex gap-4">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-teal-600 hover:border-teal-600 transition-colors cursor-pointer" />
                ))}
              </div>
            </div>

            <div className="space-y-6">
              <h5 className="font-black text-slate-900 text-xs uppercase tracking-widest">Platform</h5>
              <ul className="space-y-4 text-sm font-semibold text-slate-500">
                <li><Link href="/courses" className="hover:text-teal-600 transition-colors">Courses</Link></li>
                <li><Link href="#" className="hover:text-teal-600 transition-colors">Materials</Link></li>
                <li><Link href="#" className="hover:text-teal-600 transition-colors">Test Patterns</Link></li>
                <li><Link href="#" className="hover:text-teal-600 transition-colors">Analytics</Link></li>
              </ul>
            </div>

            <div className="space-y-6">
              <h5 className="font-black text-slate-900 text-xs uppercase tracking-widest">Support</h5>
              <ul className="space-y-4 text-sm font-semibold text-slate-500">
                <li><Link href="#" className="hover:text-teal-600 transition-colors">Help Center</Link></li>
                <li><Link href="#" className="hover:text-teal-600 transition-colors">FAQ</Link></li>
                <li><Link href="#" className="hover:text-teal-600 transition-colors">Contact Us</Link></li>
                <li><Link href="#" className="hover:text-teal-600 transition-colors">Status</Link></li>
              </ul>
            </div>

            <div className="space-y-6">
              <h5 className="font-black text-slate-900 text-xs uppercase tracking-widest">Legal</h5>
              <ul className="space-y-4 text-sm font-semibold text-slate-500">
                <li><Link href="/privacy" className="hover:text-teal-600 transition-colors">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-teal-600 transition-colors">Terms of Service</Link></li>
                <li><Link href="#" className="hover:text-teal-600 transition-colors">Cookie Policy</Link></li>
              </ul>
            </div>
          </div>

          <div className="pt-12 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center gap-6">
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">© 2026 Aptivo. All rights reserved.</p>
            <div className="flex gap-4">
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg shadow-sm">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Systems Operational</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
