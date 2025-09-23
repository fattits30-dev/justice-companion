import React, { lazy, Suspense } from 'react';
import './App.css';

// Lazy load heavy components for better initial load performance
const Sidebar = lazy(() => import('./components/Sidebar'));
const ChatInterface = lazy(() => import('./components/ChatInterface'));
const CaseManager = lazy(() => import('./components/CaseManager'));
const Disclaimer = lazy(() => import('./components/Disclaimer'));

// Loading component with glass morphism style
const LoadingFallback = () => (
  <div className="loading-fallback">
    <div className="loading-spinner"></div>
    <p>Loading Justice Companion...</p>
  </div>
);

export {
  Sidebar,
  ChatInterface,
  CaseManager,
  Disclaimer,
  LoadingFallback,
  Suspense
};