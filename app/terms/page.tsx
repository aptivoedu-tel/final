'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, FileText } from 'lucide-react';

export default function TermsPage() {
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
                        <div className="w-16 h-16 bg-[#244D4D] rounded-2xl flex items-center justify-center">
                            <FileText className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-4xl font-black text-[#1B3A3A] tracking-tight">Terms and Conditions</h1>
                            <p className="text-sm text-slate-500 font-medium mt-1">Last Updated: February 5, 2026</p>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8 sm:p-12">
                    <div className="space-y-8">

                        <section>
                            <h2 className="text-2xl font-black text-slate-900 mb-3">1. ACCEPTANCE OF TERMS</h2>
                            <p className="text-slate-600 leading-relaxed">By accessing and using Aptivo ("the Platform"), you agree to be bound by these Terms and Conditions. If you do not agree to these terms, please discontinue use immediately.</p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-black text-slate-900 mb-3">2. SERVICE DESCRIPTION</h2>
                            <p className="text-slate-600 leading-relaxed">Aptivo is an aptitude test preparation platform designed to help students prepare for university entry examinations. The Platform provides practice questions, study materials, and performance tracking to support your test preparation journey.</p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-black text-slate-900 mb-4">3. USER ACCOUNTS</h2>

                            <div className="space-y-4">
                                <div>
                                    <h3 className="text-lg font-bold text-slate-800 mb-2">3.1 Account Registration:</h3>
                                    <ul className="list-disc list-inside space-y-1 text-slate-600 ml-4">
                                        <li>Students must register through their educational institution</li>
                                        <li>You must provide accurate information during registration</li>
                                        <li>Your institution will provide your login credentials</li>
                                    </ul>
                                </div>

                                <div>
                                    <h3 className="text-lg font-bold text-slate-800 mb-2">3.2 Account Security:</h3>
                                    <ul className="list-disc list-inside space-y-1 text-slate-600 ml-4">
                                        <li>Keep your login credentials confidential</li>
                                        <li>Do not share your account with others</li>
                                        <li>Notify us immediately if you suspect unauthorized access</li>
                                        <li>Accounts are personal and non-transferable</li>
                                    </ul>
                                </div>
                            </div>
                        </section>

                        <section>
                            <h2 className="text-2xl font-black text-slate-900 mb-4">4. EDUCATIONAL CONTENT AND MATERIALS</h2>

                            <div className="space-y-4">
                                <div>
                                    <h3 className="text-lg font-bold text-slate-800 mb-2">4.1 Content Purpose:</h3>
                                    <ul className="list-disc list-inside space-y-1 text-slate-600 ml-4">
                                        <li>All content is for test preparation and educational purposes only</li>
                                        <li>Materials are designed to help you prepare for university entry examinations</li>
                                        <li>We strive for accuracy but cannot guarantee error-free content</li>
                                    </ul>
                                </div>

                                <div>
                                    <h3 className="text-lg font-bold text-slate-800 mb-2">4.2 Usage Restrictions:</h3>
                                    <ul className="list-disc list-inside space-y-1 text-slate-600 ml-4">
                                        <li>Content may not be copied, reproduced, or distributed</li>
                                        <li>Screenshots and sharing of questions are prohibited</li>
                                        <li>Materials are licensed to you for personal study only</li>
                                    </ul>
                                </div>

                                <div>
                                    <h3 className="text-lg font-bold text-slate-800 mb-2">4.3 No Guarantee of Results:</h3>
                                    <ul className="list-disc list-inside space-y-1 text-slate-600 ml-4">
                                        <li>We do not guarantee specific test scores or university admissions</li>
                                        <li>Your success depends on your personal effort and preparation</li>
                                    </ul>
                                </div>
                            </div>
                        </section>

                        <section>
                            <h2 className="text-2xl font-black text-slate-900 mb-3">5. USER CONDUCT</h2>
                            <p className="text-slate-600 mb-2">You agree NOT to:</p>
                            <ul className="list-disc list-inside space-y-1 text-slate-600 ml-4">
                                <li>Share or distribute test questions or materials</li>
                                <li>Use the Platform for commercial purposes</li>
                                <li>Attempt to access other users' accounts</li>
                                <li>Upload harmful or malicious content</li>
                                <li>Use automated tools or bots</li>
                                <li>Cheat or help others cheat on practice tests</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-black text-slate-900 mb-4">6. PRIVACY AND DATA</h2>

                            <div className="space-y-4">
                                <div>
                                    <h3 className="text-lg font-bold text-slate-800 mb-2">6.1 Information We Collect:</h3>
                                    <ul className="list-disc list-inside space-y-1 text-slate-600 ml-4">
                                        <li>Personal information (name, email, institution)</li>
                                        <li>Test performance and progress data</li>
                                        <li>Usage statistics and learning patterns</li>
                                    </ul>
                                </div>

                                <div>
                                    <h3 className="text-lg font-bold text-slate-800 mb-2">6.2 How We Use Your Data:</h3>
                                    <ul className="list-disc list-inside space-y-1 text-slate-600 ml-4">
                                        <li>To provide test preparation services</li>
                                        <li>To track your progress and performance</li>
                                        <li>To improve the Platform</li>
                                        <li>We do not sell your personal information</li>
                                    </ul>
                                </div>

                                <div>
                                    <h3 className="text-lg font-bold text-slate-800 mb-2">6.3 Data Sharing:</h3>
                                    <ul className="list-disc list-inside space-y-1 text-slate-600 ml-4">
                                        <li>Your institution can access your performance data</li>
                                        <li>We may share anonymized data for educational research</li>
                                        <li>We protect your data with industry-standard security</li>
                                    </ul>
                                </div>
                            </div>
                        </section>

                        <section>
                            <h2 className="text-2xl font-black text-slate-900 mb-4">7. INSTITUTIONAL ACCOUNTS</h2>

                            <div className="space-y-4">
                                <div>
                                    <h3 className="text-lg font-bold text-slate-800 mb-2">7.1 Institution Responsibilities:</h3>
                                    <ul className="list-disc list-inside space-y-1 text-slate-600 ml-4">
                                        <li>Institutions manage student enrollments</li>
                                        <li>Institutions ensure students comply with these Terms</li>
                                        <li>Contact your institution for account-related issues</li>
                                    </ul>
                                </div>

                                <div>
                                    <h3 className="text-lg font-bold text-slate-800 mb-2">7.2 Student Obligations:</h3>
                                    <ul className="list-disc list-inside space-y-1 text-slate-600 ml-4">
                                        <li>Follow your institution's rules and policies</li>
                                        <li>Use the Platform only as authorized by your institution</li>
                                    </ul>
                                </div>
                            </div>
                        </section>

                        <section>
                            <h2 className="text-2xl font-black text-slate-900 mb-4">8. FEES AND PAYMENT</h2>

                            <div className="space-y-4">
                                <div>
                                    <h3 className="text-lg font-bold text-slate-800 mb-2">8.1 Subscription Model:</h3>
                                    <ul className="list-disc list-inside space-y-1 text-slate-600 ml-4">
                                        <li>Access is provided through institutional subscriptions</li>
                                        <li>Students typically do not pay directly (check with your institution)</li>
                                        <li>Pricing and billing are managed between Aptivo and institutions</li>
                                    </ul>
                                </div>

                                <div>
                                    <h3 className="text-lg font-bold text-slate-800 mb-2">8.2 No Refunds:</h3>
                                    <ul className="list-disc list-inside space-y-1 text-slate-600 ml-4">
                                        <li>Subscription fees are generally non-refundable</li>
                                        <li>Contact us for specific circumstances</li>
                                    </ul>
                                </div>
                            </div>
                        </section>

                        <section>
                            <h2 className="text-2xl font-black text-slate-900 mb-4">9. INTELLECTUAL PROPERTY</h2>

                            <div className="space-y-4">
                                <div>
                                    <h3 className="text-lg font-bold text-slate-800 mb-2">9.1 Platform Ownership:</h3>
                                    <ul className="list-disc list-inside space-y-1 text-slate-600 ml-4">
                                        <li>Aptivo owns all rights to the Platform and its content</li>
                                        <li>Our name, logo, and brand are protected trademarks</li>
                                    </ul>
                                </div>

                                <div>
                                    <h3 className="text-lg font-bold text-slate-800 mb-2">9.2 Prohibited Actions:</h3>
                                    <ul className="list-disc list-inside space-y-1 text-slate-600 ml-4">
                                        <li>Do not copy or reproduce test questions</li>
                                        <li>Do not create derivative works from our materials</li>
                                        <li>Do not reverse-engineer the Platform</li>
                                    </ul>
                                </div>
                            </div>
                        </section>

                        <section>
                            <h2 className="text-2xl font-black text-slate-900 mb-4">10. DISCLAIMERS</h2>

                            <div className="space-y-4">
                                <div>
                                    <h3 className="text-lg font-bold text-slate-800 mb-2">10.1 Service Availability:</h3>
                                    <ul className="list-disc list-inside space-y-1 text-slate-600 ml-4">
                                        <li>The Platform is provided "AS IS"</li>
                                        <li>We may perform maintenance that temporarily limits access</li>
                                        <li>We do not guarantee uninterrupted service</li>
                                    </ul>
                                </div>

                                <div>
                                    <h3 className="text-lg font-bold text-slate-800 mb-2">10.2 Educational Outcomes:</h3>
                                    <ul className="list-disc list-inside space-y-1 text-slate-600 ml-4">
                                        <li>Aptivo is a study aid, not a guarantee of success</li>
                                        <li>Test scores depend on your effort and preparation</li>
                                        <li>We are not responsible for university admission decisions</li>
                                    </ul>
                                </div>
                            </div>
                        </section>

                        <section>
                            <h2 className="text-2xl font-black text-slate-900 mb-3">11. LIMITATION OF LIABILITY</h2>
                            <p className="text-slate-600 mb-2">To the fullest extent permitted by law:</p>
                            <ul className="list-disc list-inside space-y-1 text-slate-600 ml-4">
                                <li>Aptivo is not liable for indirect or consequential damages</li>
                                <li>Our total liability is limited to the fees paid for the service</li>
                                <li>We are not responsible for technical failures beyond our control</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-black text-slate-900 mb-4">12. ACCOUNT TERMINATION</h2>

                            <div className="space-y-4">
                                <div>
                                    <h3 className="text-lg font-bold text-slate-800 mb-2">12.1 By You:</h3>
                                    <ul className="list-disc list-inside space-y-1 text-slate-600 ml-4">
                                        <li>Contact your institution to close your account</li>
                                        <li>You may be unable to access your data after closure</li>
                                    </ul>
                                </div>

                                <div>
                                    <h3 className="text-lg font-bold text-slate-800 mb-2">12.2 By Us:</h3>
                                    <ul className="list-disc list-inside space-y-1 text-slate-600 ml-4">
                                        <li>We may suspend accounts for Terms violations</li>
                                        <li>We may terminate service with reasonable notice</li>
                                    </ul>
                                </div>
                            </div>
                        </section>

                        <section>
                            <h2 className="text-2xl font-black text-slate-900 mb-3">13. CHANGES TO TERMS</h2>
                            <ul className="list-disc list-inside space-y-1 text-slate-600 ml-4">
                                <li>We may update these Terms at any time</li>
                                <li>Continued use after changes means you accept the new Terms</li>
                                <li>Material changes will be announced via the Platform</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-black text-slate-900 mb-3">14. GOVERNING LAW</h2>
                            <p className="text-slate-600 leading-relaxed">These Terms are governed by applicable laws in your jurisdiction. Any disputes shall be resolved through negotiation or legal proceedings as required.</p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-black text-slate-900 mb-3">15. CONTACT INFORMATION</h2>
                            <p className="text-slate-600 mb-2">For questions, support, or concerns:</p>
                            <p className="font-bold text-slate-900">Email: <a href="mailto:aptivo.edu@gmail.com" className="text-[#4CAF50] hover:underline">aptivo.edu@gmail.com</a></p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-black text-slate-900 mb-3">16. GENERAL PROVISIONS</h2>
                            <div className="space-y-2 text-slate-600">
                                <p><strong className="text-slate-900">16.1</strong> If any provision is invalid, the rest remains in effect.</p>
                                <p><strong className="text-slate-900">16.2</strong> These Terms constitute the entire agreement between you and Aptivo.</p>
                                <p><strong className="text-slate-900">16.3</strong> You cannot transfer your rights under these Terms.</p>
                            </div>
                        </section>

                        <div className="mt-12 p-6 bg-[#EAF5E9] rounded-2xl border-l-4 border-[#4CAF50]">
                            <p className="font-bold text-[#1B3A3A] text-lg mb-2">Agreement Acknowledgment</p>
                            <p className="text-slate-700 leading-relaxed">By using Aptivo, you confirm that you have read, understood, and agree to these Terms and Conditions.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
