'use client';

import { useState } from 'react';

interface Project {
  id: string;
  name: string;
  tagline: string;
  description?: string;
  website_url?: string;
  logo_url?: string;
  twitter_handle?: string;
  category: string;
  upvotes: number;
  created_at: string;
  submitted_by_twitter: string;
}

interface ProjectCardProps {
  project: Project;
  userHandle?: string;
  onUpvote?: (projectId: string) => void;
}

export default function ProjectCard({ project, userHandle, onUpvote }: ProjectCardProps) {
  const [upvotes, setUpvotes] = useState(project.upvotes);
  const [isUpvoting, setIsUpvoting] = useState(false);
  const [hasUpvoted, setHasUpvoted] = useState(false);

  const handleUpvote = async () => {
    if (!userHandle || isUpvoting) return;
    
    setIsUpvoting(true);
    try {
      const res = await fetch(`/api/projects/${project.id}/upvote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ twitter_handle: userHandle })
      });
      
      const data = await res.json();
      if (data.success) {
        setUpvotes(data.upvotes);
        setHasUpvoted(data.action === 'added');
        onUpvote?.(project.id);
      }
    } catch (error) {
      console.error('Upvote failed:', error);
    } finally {
      setIsUpvoting(false);
    }
  };

  const categoryColors: Record<string, string> = {
    defi: 'bg-green-100 text-green-800',
    agents: 'bg-purple-100 text-purple-800',
    infrastructure: 'bg-blue-100 text-blue-800',
    consumer: 'bg-pink-100 text-pink-800',
    gaming: 'bg-yellow-100 text-yellow-800',
    social: 'bg-orange-100 text-orange-800',
    tools: 'bg-gray-100 text-gray-800',
    other: 'bg-gray-100 text-gray-600'
  };

  return (
    <div className="flex items-start gap-4 p-4 bg-white rounded-lg border border-gray-200 hover:border-[#0052ff] hover:shadow-sm transition-all">
      {/* Logo */}
      <div className="flex-shrink-0">
        {project.logo_url ? (
          <img 
            src={project.logo_url} 
            alt={project.name}
            className="w-16 h-16 rounded-lg object-cover"
          />
        ) : (
          <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-[#0052ff] to-blue-400 flex items-center justify-center">
            <span className="text-white text-2xl font-bold">
              {project.name.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-grow min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <a 
              href={project.website_url || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="text-lg font-semibold text-gray-900 hover:text-[#0052ff] transition-colors"
            >
              {project.name}
            </a>
            <p className="text-gray-600 text-sm mt-0.5 line-clamp-2">
              {project.tagline}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-2">
          <span className={`text-xs px-2 py-0.5 rounded-full ${categoryColors[project.category] || categoryColors.other}`}>
            {project.category}
          </span>
          {project.twitter_handle && (
            <a 
              href={`https://x.com/${project.twitter_handle}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-gray-500 hover:text-[#0052ff]"
            >
              @{project.twitter_handle}
            </a>
          )}
          <span className="text-xs text-gray-400">
            by @{project.submitted_by_twitter}
          </span>
        </div>
      </div>

      {/* Upvote Button */}
      <button
        onClick={handleUpvote}
        disabled={!userHandle || isUpvoting}
        className={`flex-shrink-0 flex flex-col items-center justify-center w-14 h-16 rounded-lg border-2 transition-all ${
          hasUpvoted 
            ? 'border-[#0052ff] bg-[#0052ff] text-white' 
            : 'border-gray-200 hover:border-[#0052ff] text-gray-600 hover:text-[#0052ff]'
        } ${!userHandle ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <svg 
          className="w-4 h-4" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M5 15l7-7 7 7" 
          />
        </svg>
        <span className="text-sm font-semibold">{upvotes}</span>
      </button>
    </div>
  );
}
