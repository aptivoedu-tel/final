'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Shield } from 'lucide-react';

export default function PrivacyPage() {
    return (
        <div className="min-h-screen bg-[#F8FAFC] py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <Link
                        href="/login"
                        className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-[#244D4D] transition-colors mb-6"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Login
                    </Link>

                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-16 h-16 bg-[#4CAF50] rounded-2xl flex items-center justify-center">
                            <Shield className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-4xl font-black text-[#1B3A3A] tracking-tight">Privacy Policy</h1>
                            <p className="text-sm text-slate-500 font-medium mt-1">Last Updated: February 5, 2026</p>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8 sm:p-12">
                    <div className="prose prose-slate max-w-none">

                        <h2>1. INTRODUCTION</h2>
                        <p>Aptivo ("we," "us," or "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our aptitude test preparation platform.</p>

                        <h2>2. INFORMATION WE COLLECT</h2>

                        <h3>2.1 Personal Information</h3>
                        <p>We collect the following personal information:</p>
                        <ul>
                            <li><strong>Name</strong> - Your full name as provided by your institution</li>
                            <li><strong>Email Address</strong> - Institutional email for communication</li>
                            <li><strong>Roll Number / Student ID</strong> - Your unique student identifier</li>
                            <li><strong>Institution Details</strong> - Name and type of your educational institution</li>
                        </ul>

                        <h3>2.2 Academic Performance Data</h3>
                        <ul>
                            <li>Test scores and results</li>
                            <li>Practice quiz performance</li>
                            <li>Study time and progress metrics</li>
                            <li>Subject-wise performance analytics</li>
                        </ul>

                        <h3>2.3 Technical Information</h3>
                        <ul>
                            <li>Device information (browser type, operating system)</li>
                            <li>IP address and location data</li>
                            <li>Login times and session duration</li>
                            <li>Usage patterns and navigation data</li>
                        </ul>

                        <h2>3. HOW WE USE YOUR INFORMATION</h2>
                        <p>We use your information to:</p>
                        <ul>
                            <li><strong>Provide Services</strong> - Deliver test preparation materials and track your progress</li>
                            <li><strong>Personalization</strong> - Customize your learning experience based on performance</li>
                            <li><strong>Communication</strong> - Send important updates, notifications, and support messages</li>
                            <li><strong>Analytics</strong> - Improve the Platform and develop new features</li>
                            <li><strong>Security</strong> - Prevent fraud and ensure Platform security</li>
                            <li><strong>Compliance</strong> - Meet legal and regulatory requirements</li>
                        </ul>

                        <h2>4. INFORMATION SHARING</h2>

                        <h3>4.1 With Your Institution</h3>
                        <p>Your educational institution has access to:</p>
                        <ul>
                            <li>Your academic performance and test scores</li>
                            <li>Study progress and engagement metrics</li>
                            <li>Attendance and participation data</li>
                        </ul>

                        <h3>4.2 With Third Parties</h3>
                        <p>We do NOT sell your personal information. We may share data with:</p>
                        <ul>
                            <li><strong>Service Providers</strong> - Companies that help us operate the Platform (e.g., hosting, analytics)</li>
                            <li><strong>Legal Authorities</strong> - When required by law or to protect our rights</li>
                        </ul>

                        <h3>4.3 Anonymized Data</h3>
                        <p>We may share aggregated, anonymized data for:</p>
                        <ul>
                            <li>Educational research</li>
                            <li>Statistical analysis</li>
                            <li>Platform improvement</li>
                        </ul>

                        <h2>5. DATA SECURITY</h2>
                        <p>We implement industry-standard security measures to protect your information:</p>
                        <ul>
                            <li>Encrypted data transmission (SSL/TLS)</li>
                            <li>Secure database storage</li>
                            <li>Access controls and authentication</li>
                            <li>Regular security audits</li>
                        </ul>
                        <p className="font-semibold text-amber-700">However, no online platform is 100% secure. Please use strong passwords and keep your credentials confidential.</p>

                        <h2>6. DATA RETENTION</h2>
                        <ul>
                            <li><strong>Active Accounts</strong> - We retain data while your account is active</li>
                            <li><strong>After Graduation/Closure</strong> - Data may be retained for up to 2 years for records</li>
                            <li><strong>Legal Requirements</strong> - Some data may be retained longer if required by law</li>
                        </ul>

                        <h2>7. YOUR RIGHTS</h2>
                        <p>Depending on your location, you may have the right to:</p>
                        <ul>
                            <li><strong>Access</strong> - Request a copy of your personal data</li>
                            <li><strong>Correction</strong> - Update inaccurate information</li>
                            <li><strong>Deletion</strong> - Request deletion of your data (subject to legal requirements)</li>
                            <li><strong>Object</strong> - Object to certain processing of your data</li>
                        </ul>
                        <p>To exercise these rights, contact your institution or email us at <a href="mailto:aptivo.edu@gmail.com" className="text-[#4CAF50] font-semibold hover:underline">aptivo.edu@gmail.com</a></p>

                        <h2>8. COOKIES AND TRACKING</h2>
                        <p>We use cookies and similar technologies to:</p>
                        <ul>
                            <li>Keep you logged in</li>
                            <li>Remember your preferences</li>
                            <li>Analyze Platform usage</li>
                            <li>Improve user experience</li>
                        </ul>
                        <p>You can control cookies through your browser settings, but this may affect Platform functionality.</p>

                        <h2>9. CHILDREN'S PRIVACY</h2>
                        <p>Our Platform is intended for students preparing for university entrance exams. If you are under 18, please ensure you have parental or guardian consent before using Aptivo. We do not knowingly collect data from children under 13.</p>

                        <h2>10. THIRD-PARTY LINKS</h2>
                        <p>The Platform may contain links to external websites. We are not responsible for the privacy practices of these third-party sites. Please review their privacy policies before providing any information.</p>

                        <h2>11. CHANGES TO THIS POLICY</h2>
                        <p>We may update this Privacy Policy from time to time. Changes will be posted on this page with an updated "Last Updated" date. Continued use of the Platform after changes constitutes acceptance of the updated policy.</p>

                        <h2>12. INTERNATIONAL DATA TRANSFERS</h2>
                        <p>Your data may be processed in countries other than your own. We ensure appropriate safeguards are in place to protect your information during international transfers.</p>

                        <h2>13. CONTACT US</h2>
                        <p>If you have questions or concerns about this Privacy Policy, please contact us:</p>
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 my-4">
                            <p className="font-bold text-[#1B3A3A]">Email:</p>
                            <p><a href="mailto:aptivo.edu@gmail.com" className="text-[#4CAF50] font-semibold hover:underline">aptivo.edu@gmail.com</a></p>
                        </div>

                        <div className="mt-12 p-6 bg-[#E3F2FD] rounded-2xl border-l-4 border-[#4CAF50]">
                            <p className="font-bold text-[#1B3A3A] text-lg mb-2">Your Privacy Matters</p>
                            <p className="text-slate-700">By using Aptivo, you acknowledge that you have read and understood this Privacy Policy and consent to the collection and use of your information as described.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
