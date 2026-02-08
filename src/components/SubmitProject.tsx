'use client';

import { useState } from 'react';

interface SubmitProjectProps {
  onSuccess?: () => void;
}

const CATEGORIES = [
  { id: 'agents', label: 'Agents & AI' },
  { id: 'defi', label: 'DeFi' },
  { id: 'infrastructure', label: 'Infrastructure' },
  { id: 'consumer', label: 'Consumer' },
  { id: 'gaming', label: 'Gaming' },
  { id: 'social', label: 'Social' },
  { id: 'tools', label: 'Tools' },
  { id: 'other', label: 'Other' }
];

export default function SubmitProject({ onSuccess }: SubmitProjectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<'verify' | 'submit'>('verify');
  const [twitterHandle, setTwitterHandle] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    name: '',
    tagline: '',
    description: '',
    website_url: '',
    demo_url: '',
    github_url: '',
    twitter_handle: '',
    category: 'agents'
  });

  const verifyTwitter = async () => {
    if (!twitterHandle) return;
    
    setIsVerifying(true);
    setError('');
    
    try {
      const res = await fetch('/api/verify-twitter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handle: twitterHandle })
      });
      
      const data = await res.json();
      
      if (data.verified) {
        setIsVerified(true);
        setStep('submit');
      } else {
        setError(data.error || 'Could not verify Twitter account');
      }
    } catch (err) {
      setError('Verification failed. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isVerified) return;
    
    setIsSubmitting(true);
    setError('');
    
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          submitted_by_twitter: twitterHandle
        })
      });
      
      const data = await res.json();
      
      if (data.success) {
        setSuccess(true);
        setTimeout(() => {
          setIsOpen(false);
          setSuccess(false);
          setStep('verify');
          setIsVerified(false);
          setTwitterHandle('');
          setForm({
            name: '',
            tagline: '',
            description: '',
            website_url: '',
            demo_url: '',
            github_url: '',
            twitter_handle: '',
            category: 'agents'
          });
          onSuccess?.();
        }, 2000);
      } else {
        setError(data.error || 'Failed to submit project');
      }
    } catch (err) {
      setError('Submission failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 bg-[#0052ff] text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
      >
        Submit Project
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  {step === 'verify' ? 'Verify Your Twitter' : 'Submit Project'}
                </h2>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {success ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="text-lg font-medium text-gray-900">Project submitted!</p>
                  <p className="text-gray-500 text-sm mt-1">Your project is now live</p>
                </div>
              ) : step === 'verify' ? (
                <div className="space-y-4">
                  <p className="text-gray-600 text-sm">
                    To prevent spam, please verify your Twitter account first.
                  </p>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Your Twitter Handle
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={twitterHandle}
                        onChange={(e) => setTwitterHandle(e.target.value.replace('@', ''))}
                        placeholder="yourhandle"
                        className="flex-grow px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0052ff] focus:border-transparent"
                      />
                      <button
                        onClick={verifyTwitter}
                        disabled={!twitterHandle || isVerifying}
                        className="px-4 py-2 bg-[#0052ff] text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isVerifying ? 'Verifying...' : 'Verify'}
                      </button>
                    </div>
                  </div>
                  {error && (
                    <p className="text-red-600 text-sm">{error}</p>
                  )}
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 px-3 py-2 rounded-lg">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Verified as @{twitterHandle}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Project Name *
                    </label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0052ff] focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tagline *
                    </label>
                    <input
                      type="text"
                      value={form.tagline}
                      onChange={(e) => setForm({ ...form, tagline: e.target.value })}
                      placeholder="A short description of your project"
                      required
                      maxLength={100}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0052ff] focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Category *
                    </label>
                    <select
                      value={form.category}
                      onChange={(e) => setForm({ ...form, category: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0052ff] focus:border-transparent"
                    >
                      {CATEGORIES.map((cat) => (
                        <option key={cat.id} value={cat.id}>{cat.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Website URL
                    </label>
                    <input
                      type="url"
                      value={form.website_url}
                      onChange={(e) => setForm({ ...form, website_url: e.target.value })}
                      placeholder="https://..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0052ff] focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Project Twitter
                    </label>
                    <input
                      type="text"
                      value={form.twitter_handle}
                      onChange={(e) => setForm({ ...form, twitter_handle: e.target.value.replace('@', '') })}
                      placeholder="projecthandle"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0052ff] focus:border-transparent"
                    />
                  </div>

                  {error && (
                    <p className="text-red-600 text-sm">{error}</p>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting || !form.name || !form.tagline}
                    className="w-full py-3 bg-[#0052ff] text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? 'Submitting...' : 'Submit Project'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
