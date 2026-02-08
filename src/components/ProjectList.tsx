'use client';

import { useState, useEffect } from 'react';
import ProjectCard from './ProjectCard';

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

const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'agents', label: 'Agents' },
  { id: 'defi', label: 'DeFi' },
  { id: 'infrastructure', label: 'Infrastructure' },
  { id: 'consumer', label: 'Consumer' },
  { id: 'gaming', label: 'Gaming' },
  { id: 'social', label: 'Social' },
  { id: 'tools', label: 'Tools' }
];

interface ProjectListProps {
  userHandle?: string;
}

export default function ProjectList({ userHandle }: ProjectListProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('all');
  const [sort, setSort] = useState<'newest' | 'upvotes'>('upvotes');

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        category,
        sort,
        limit: '50'
      });
      const res = await fetch(`/api/projects?${params}`);
      const data = await res.json();
      setProjects(data.projects || []);
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [category, sort]);

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        {/* Categories */}
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategory(cat.id)}
              className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                category === cat.id
                  ? 'bg-[#0052ff] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Sort */}
        <div className="flex gap-2">
          <button
            onClick={() => setSort('upvotes')}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              sort === 'upvotes'
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Top
          </button>
          <button
            onClick={() => setSort('newest')}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              sort === 'newest'
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            New
          </button>
        </div>
      </div>

      {/* Project List */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="flex gap-4 p-4 bg-gray-100 rounded-lg">
                <div className="w-16 h-16 bg-gray-200 rounded-lg" />
                <div className="flex-grow space-y-2">
                  <div className="h-5 bg-gray-200 rounded w-1/3" />
                  <div className="h-4 bg-gray-200 rounded w-2/3" />
                </div>
                <div className="w-14 h-16 bg-gray-200 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No projects yet</p>
          <p className="text-gray-400 text-sm mt-1">Be the first to submit!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              userHandle={userHandle}
              onUpvote={() => fetchProjects()}
            />
          ))}
        </div>
      )}
    </div>
  );
}
