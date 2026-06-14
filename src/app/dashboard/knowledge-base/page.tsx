'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Database, Upload, Plus, Loader, Trash2, 
  Check, AlertCircle, FileText, Globe, Search 
} from 'lucide-react';
import styles from './knowledge-base.module.css';

interface KnowledgeSource {
  id: string;
  type: 'url' | 'file';
  name: string;
  status: 'trained' | 'training';
  created_at: string;
  size?: string;
}

export default function KnowledgeBasePage() {
  const [sources, setSources] = useState<KnowledgeSource[]>([]);
  const [activeTab, setActiveTab] = useState<'url' | 'file'>('url');
  
  // URL form states
  const [urlInput, setUrlInput] = useState('');
  const [isScraping, setIsScraping] = useState(false);
  const [scrapeStep, setScrapeStep] = useState('');

  // File form states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Search/Filter state
  const [searchQuery, setSearchQuery] = useState('');

  // UI toast notification state
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. Load sources from localStorage on mount
  useEffect(() => {
    const localSources = localStorage.getItem('uipro_knowledge_sources');
    setTimeout(() => {
      if (localSources) {
        setSources(JSON.parse(localSources));
      } else {
        const defaultSources: KnowledgeSource[] = [
          {
            id: 'source-1',
            type: 'url',
            name: 'https://docs.acme-enterprise.com/faq',
            status: 'trained',
            created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
          },
          {
            id: 'source-2',
            type: 'file',
            name: 'product_refund_policy.pdf',
            status: 'trained',
            created_at: new Date(Date.now() - 86400000).toISOString(),
            size: '1.2 MB',
          }
        ];
        localStorage.setItem('uipro_knowledge_sources', JSON.stringify(defaultSources));
        setSources(defaultSources);
      }
    }, 0);
  }, []);

  // 2. Persist to local storage
  const saveSources = (updatedSources: KnowledgeSource[]) => {
    setSources(updatedSources);
    localStorage.setItem('uipro_knowledge_sources', JSON.stringify(updatedSources));
  };

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToastMessage(message);
    setToastType(type);
    setTimeout(() => {
      setToastMessage('');
    }, 3000);
  };

  // URL Scraping Handler
  const handleScrapeWebsite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;

    // Basic URL validation
    let formattedUrl = urlInput.trim();
    if (!/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = 'https://' + formattedUrl;
    }

    try {
      new URL(formattedUrl);
    } catch {
      showToast('Please enter a valid URL.', 'error');
      return;
    }

    // Check if source already exists
    if (sources.some(s => s.name.toLowerCase() === formattedUrl.toLowerCase())) {
      showToast('This URL is already trained.', 'error');
      return;
    }

    setIsScraping(true);
    setScrapeStep('Connecting to server...');

    // Simulate crawl progression steps
    setTimeout(() => {
      setScrapeStep('Fetching website HTML structure...');
      setTimeout(() => {
        setScrapeStep('Extracting relevant text details...');
        setTimeout(() => {
          setScrapeStep('Vectorizing knowledge content...');
          setTimeout(() => {
            const newSource: KnowledgeSource = {
              id: 'source-' + Math.random().toString(36).substring(2, 9),
              type: 'url',
              name: formattedUrl,
              status: 'trained',
              created_at: new Date().toISOString(),
            };
            saveSources([newSource, ...sources]);
            setUrlInput('');
            setIsScraping(false);
            setScrapeStep('');
            showToast('Website crawled and trained successfully.');
          }, 800);
        }, 800);
      }, 800);
    }, 600);
  };

  // File Change Handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const validExtensions = ['.pdf', '.txt'];
      const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
      
      if (!validExtensions.includes(fileExtension)) {
        showToast('Only PDF and TXT files are supported.', 'error');
        return;
      }
      setSelectedFile(file);
    }
  };

  // Drag-and-drop Handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      const validExtensions = ['.pdf', '.txt'];
      const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
      
      if (!validExtensions.includes(fileExtension)) {
        showToast('Only PDF and TXT files are supported.', 'error');
        return;
      }
      setSelectedFile(file);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  // File Upload Handler
  const handleUploadFile = () => {
    if (!selectedFile) return;

    // Check if source already exists
    if (sources.some(s => s.name.toLowerCase() === selectedFile.name.toLowerCase())) {
      showToast('This file has already been uploaded.', 'error');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    const fileSizeString = selectedFile.size > 1024 * 1024
      ? (selectedFile.size / (1024 * 1024)).toFixed(1) + ' MB'
      : (selectedFile.size / 1024).toFixed(0) + ' KB';

    // Simulate progress uploading
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            const newSource: KnowledgeSource = {
              id: 'source-' + Math.random().toString(36).substring(2, 9),
              type: 'file',
              name: selectedFile.name,
              status: 'trained',
              created_at: new Date().toISOString(),
              size: fileSizeString,
            };
            saveSources([newSource, ...sources]);
            setSelectedFile(null);
            setIsUploading(false);
            setUploadProgress(0);
            showToast('Document vectorized and trained successfully.');
          }, 500);
          return 100;
        }
        return prev + 10;
      });
    }, 200);
  };

  // Delete Handler
  const handleDeleteSource = (id: string, name: string) => {
    if (confirm(`Are you sure you want to remove the source "${name}"?`)) {
      const updated = sources.filter(s => s.id !== id);
      saveSources(updated);
      showToast('Knowledge source deleted.');
    }
  };

  // Filtered Sources based on Search
  const filteredSources = sources.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className={styles.container}>
      {toastMessage && (
        <div className={styles.toast} style={{ backgroundColor: toastType === 'error' ? 'var(--danger)' : 'var(--primary)' }}>
          {toastType === 'success' ? <Check size={16} /> : <AlertCircle size={16} />}
          <span>{toastMessage}</span>
        </div>
      )}

      <div className={styles.header}>
        <h1 className={styles.title}>Knowledge Base</h1>
        <p className={styles.desc}>
          Upload documents and crawl website URLs to feed trained information to your AI chatbot agents.
        </p>
      </div>

      <div className={styles.grid}>
        {/* LEFT COLUMN: SOURCE CONFIGURATOR */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>
            <Plus size={18} /> Add Training Source
          </h2>
          
          <div className={styles.tabs}>
            <button 
              className={`${styles.tabBtn} ${activeTab === 'url' ? styles.activeTabBtn : ''}`}
              onClick={() => setActiveTab('url')}
              disabled={isScraping || isUploading}
            >
              <Globe size={15} /> Website URL
            </button>
            <button 
              className={`${styles.tabBtn} ${activeTab === 'file' ? styles.activeTabBtn : ''}`}
              onClick={() => setActiveTab('file')}
              disabled={isScraping || isUploading}
            >
              <Upload size={15} /> Doc Upload
            </button>
          </div>

          {activeTab === 'url' ? (
            <form onSubmit={handleScrapeWebsite} className={styles.form}>
              <div className={styles.formGroup}>
                <label htmlFor="url-input">Website URL</label>
                <input 
                  id="url-input"
                  type="text"
                  className={styles.input}
                  placeholder="e.g. acme-enterprise.com/faq"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  disabled={isScraping}
                  required
                />
              </div>

              <button 
                type="submit" 
                className={styles.btnSubmit}
                disabled={isScraping || !urlInput.trim()}
              >
                {isScraping ? (
                  <>
                    <Loader size={16} className={styles.spinner} />
                    Scraping...
                  </>
                ) : (
                  'Scrape Website'
                )}
              </button>

              {isScraping && (
                <div className={styles.progressContainer}>
                  <div className={styles.progressLabel}>
                    <span>Web Crawler State</span>
                    <span>Active</span>
                  </div>
                  <p style={{ fontSize: '12.5px', color: 'var(--text-light)', fontStyle: 'italic' }}>
                    {scrapeStep}
                  </p>
                </div>
              )}
            </form>
          ) : (
            <div className={styles.form}>
              <div className={styles.formGroup}>
                <label>Document Upload</label>
                <input 
                  type="file"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  onChange={handleFileChange}
                  accept=".pdf,.txt"
                  disabled={isUploading}
                />
                
                <div 
                  className={styles.dropzone}
                  onClick={triggerFileSelect}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                >
                  <Upload size={28} className={styles.dropzoneIcon} />
                  <span className={styles.dropzoneText}>
                    Drag & drop file here, or <strong style={{ color: 'var(--primary)', textDecoration: 'underline' }}>browse</strong>
                  </span>
                  <span className={styles.dropzoneSubtext}>
                    Supports PDF, TXT (Max size 10MB)
                  </span>
                </div>
              </div>

              {selectedFile && (
                <div className={styles.filePreview}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                    <FileText size={16} className={styles.sourceIcon} />
                    <span className={styles.fileName}>{selectedFile.name}</span>
                  </div>
                  <button 
                    type="button" 
                    className={styles.removeFileBtn}
                    onClick={() => setSelectedFile(null)}
                    disabled={isUploading}
                  >
                    Remove
                  </button>
                </div>
              )}

              <button 
                type="button" 
                className={styles.btnSubmit}
                onClick={handleUploadFile}
                disabled={isUploading || !selectedFile}
              >
                {isUploading ? (
                  <>
                    <Loader size={16} className={styles.spinner} />
                    Vectorizing...
                  </>
                ) : (
                  'Upload & Train'
                )}
              </button>

              {isUploading && (
                <div className={styles.progressContainer}>
                  <div className={styles.progressLabel}>
                    <span>Parsing Document</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className={styles.progressBarTrack}>
                    <div 
                      className={styles.progressBarFill} 
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: TRAINED SOURCES LIST */}
        <div className={styles.card} style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <h2 className={styles.cardTitle} style={{ marginBottom: 0 }}>
              <Database size={18} /> Trained Sources ({filteredSources.length})
            </h2>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid var(--border)', borderRadius: '6px', padding: '6px 12px', width: '220px', backgroundColor: 'var(--background)' }}>
              <Search size={14} style={{ color: 'var(--text-light)' }} />
              <input 
                type="text" 
                placeholder="Search sources..." 
                style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '12.5px', color: 'var(--text)', width: '100%' }}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {filteredSources.length === 0 ? (
            <div className={styles.emptyState}>
              <Database size={32} style={{ marginBottom: '12px' }} />
              <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text)', marginBottom: '4px' }}>No training sources found</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                {searchQuery ? 'Try matching a different search term.' : 'Get started by adding a website URL or PDF file on the left.'}
              </p>
            </div>
          ) : (
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Source Name</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Added Date</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSources.map((source) => (
                    <tr key={source.id}>
                      <td>
                        <div className={styles.sourceNameCell} title={source.name}>
                          {source.type === 'url' ? (
                            <Globe size={15} className={styles.sourceIcon} />
                          ) : (
                            <FileText size={15} className={styles.sourceIcon} />
                          )}
                          <span className={styles.sourceName}>{source.name}</span>
                        </div>
                      </td>
                      <td>
                        <span style={{ textTransform: 'uppercase', fontSize: '10.5px', fontWeight: 600, color: 'var(--text-light)' }}>
                          {source.type === 'url' ? 'Link' : `File ${source.size ? `(${source.size})` : ''}`}
                        </span>
                      </td>
                      <td>
                        <span className={`${styles.statusBadge} ${styles.statusTrained}`}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--success)' }} />
                          Trained
                        </span>
                      </td>
                      <td>
                        {new Date(source.created_at).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button 
                          className={styles.deleteBtn}
                          onClick={() => handleDeleteSource(source.id, source.name)}
                          aria-label={`Delete ${source.name}`}
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
