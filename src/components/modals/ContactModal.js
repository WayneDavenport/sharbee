'use client';

import { useState } from 'react';
import ModalWrapper from './ModalWrapper';

const WEB3FORMS_ACCESS_KEY = '7ee27a00-4a85-457b-ab9f-30772639f846';
const CONTACT_EMAIL = 'wayne@mediaq.io';

export default function ContactModal({ onClose }) {
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const formData = new FormData(e.target);
        formData.append('access_key', WEB3FORMS_ACCESS_KEY);
        formData.append('subject', 'New Sharbee Contact Message');
        formData.append('from_name', 'Sharbee App');

        try {
            const response = await fetch('https://api.web3forms.com/submit', {
                method: 'POST',
                body: formData,
            });
            const data = await response.json();
            if (data.success) {
                setSubmitted(true);
            } else {
                setError(data.message || 'Something went wrong. Please try again.');
            }
        } catch (err) {
            // Likely offline — Sharbee runs on local networks, so this is common
            console.error('Web3Forms submit failed:', err);
            setError('Could not send. Check your internet connection and try again, or email us directly.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <ModalWrapper title="Contact" onClose={onClose}>
            <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
                <span>✉️</span>
                <a
                    href={`mailto:${CONTACT_EMAIL}`}
                    className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                >
                    {CONTACT_EMAIL}
                </a>
            </div>

            {submitted ? (
                <div className="text-center py-6">
                    <p className="text-3xl mb-2">✅</p>
                    <p className="font-semibold text-zinc-900 dark:text-zinc-100">Message sent!</p>
                    <p className="text-zinc-500 dark:text-zinc-400 mt-1">
                        Thanks for reaching out. We&apos;ll get back to you soon.
                    </p>
                    <button
                        onClick={() => setSubmitted(false)}
                        className="mt-4 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                    >
                        Send another message
                    </button>
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="space-y-3">
                    <div>
                        <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Name</label>
                        <input
                            name="name"
                            required
                            placeholder="Your Name"
                            className="w-full px-3 py-2 bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Your Email</label>
                        <input
                            name="email"
                            type="email"
                            required
                            placeholder="you@example.com"
                            className="w-full px-3 py-2 bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Message</label>
                        <textarea
                            name="message"
                            required
                            rows={4}
                            placeholder="Tell us what's on your mind..."
                            className="w-full px-3 py-2 bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        />
                    </div>

                    {/* Honeypot — hidden from humans, bots fill it and get silently dropped */}
                    <input
                        type="checkbox"
                        name="botcheck"
                        tabIndex={-1}
                        autoComplete="off"
                        className="hidden"
                        style={{ display: 'none' }}
                    />

                    {error && (
                        <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">
                            {error}
                        </p>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <>
                                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                <span>Sending...</span>
                                <span>Thank you for your message!</span>
                            </>
                        ) : (
                            'Send Message'
                        )}
                    </button>
                </form>
            )}
        </ModalWrapper>
    );
}
