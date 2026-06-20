'use client';

import React, { useState, useEffect } from 'react';
import { 
  Key, Webhook, Copy, Check, Trash2, 
  AlertCircle, Plus, ExternalLink 
} from 'lucide-react';
import styles from './integrations.module.css';

interface ApiKey {
  id: string;
  name: string;
  key: string;
  created_at: string;
  status: 'active' | 'revoked';
}

interface WebhookEndpoint {
  id: string;
  url: string;
  created_at: string;
  status: 'active';
}

const generateApiKeyString = () => {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const randomChars = Array.from({ length: 22 }, () => {
    return chars.charAt(Math.floor(Math.random() * chars.length));
  }).join('');
  return `sk_live_${randomChars}`;
};

const generateId = (prefix: string) => {
  return `${prefix}-${Math.random().toString(36).substring(2, 9)}`;
};

export default function IntegrationsPage() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [webhooks, setWebhooks] = useState<WebhookEndpoint[]>([]);

  // Key generator states
  const [newKeyName, setNewKeyName] = useState('');
  const [latestGeneratedKey, setLatestGeneratedKey] = useState('');
  const [showKeyDisplay, setShowKeyDisplay] = useState(false);

  // Webhook states
  const [webhookUrl, setWebhookUrl] = useState('');

  // UI Toast notification state
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  // 1. Initial Load from Local Storage
  useEffect(() => {
    const localKeys = localStorage.getItem('uipro_api_keys');
    const localWebhooks = localStorage.getItem('uipro_webhooks');

    setTimeout(() => {
      if (localKeys) {
        setApiKeys(JSON.parse(localKeys));
      } else {
        setApiKeys([]);
      }

      if (localWebhooks) {
        setWebhooks(JSON.parse(localWebhooks));
      } else {
        setWebhooks([]);
      }
    }, 0);
  }, []);

  const saveKeys = (updatedKeys: ApiKey[]) => {
    setApiKeys(updatedKeys);
    localStorage.setItem('uipro_api_keys', JSON.stringify(updatedKeys));
  };

  const saveWebhooks = (updatedWebhooks: WebhookEndpoint[]) => {
    setWebhooks(updatedWebhooks);
    localStorage.setItem('uipro_webhooks', JSON.stringify(updatedWebhooks));
  };

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToastMessage(message);
    setToastType(type);
    setTimeout(() => {
      setToastMessage('');
    }, 3000);
  };

  // API Key Generator Logic
  const handleGenerateKey = (e: React.FormEvent) => {
    e.preventDefault();
    const label = newKeyName.trim() || 'Default API Key';

    const keyString = generateApiKeyString();

    const newKey: ApiKey = {
      id: generateId('key'),
      name: label,
      key: keyString,
      created_at: new Date().toISOString(),
      status: 'active',
    };

    saveKeys([newKey, ...apiKeys]);
    setLatestGeneratedKey(keyString);
    setShowKeyDisplay(true);
    setNewKeyName('');
    showToast('New API key generated.');
  };

  const handleCopyKey = () => {
    if (!latestGeneratedKey) return;
    navigator.clipboard.writeText(latestGeneratedKey);
    showToast('Copied API key to clipboard.');
  };

  const handleDeleteKey = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete and revoke the API Key "${name}"? This action cannot be undone.`)) {
      const updated = apiKeys.filter(k => k.id !== id);
      saveKeys(updated);
      showToast('API Key revoked.');
      if (latestGeneratedKey && apiKeys.find(k => k.id === id)?.key === latestGeneratedKey) {
        setShowKeyDisplay(false);
        setLatestGeneratedKey('');
      }
    }
  };

  // Webhook Endpoint Handler
  const handleAddWebhook = (e: React.FormEvent) => {
    e.preventDefault();
    const targetUrl = webhookUrl.trim();
    if (!targetUrl) return;
    
    // Quick validation check
    try {
      const parsed = new URL(targetUrl);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        showToast('Webhook endpoint must use HTTP or HTTPS.', 'error');
        return;
      }
    } catch {
      showToast('Please enter a valid endpoint URL.', 'error');
      return;
    }

    if (webhooks.some(w => w.url.toLowerCase() === targetUrl.toLowerCase())) {
      showToast('This Webhook URL is already registered.', 'error');
      return;
    }

    const newWebhook: WebhookEndpoint = {
      id: generateId('wh'),
      url: targetUrl,
      created_at: new Date().toISOString(),
      status: 'active',
    };

    saveWebhooks([newWebhook, ...webhooks]);
    setWebhookUrl('');
    showToast('Webhook endpoint added successfully.');
  };

  const handleDeleteWebhook = (id: string, url: string) => {
    if (confirm(`Are you sure you want to remove the Webhook endpoint "${url}"?`)) {
      const updated = webhooks.filter(w => w.id !== id);
      saveWebhooks(updated);
      showToast('Webhook endpoint deleted.');
    }
  };

  return (
    <div className={styles.container}>
      {toastMessage && (
        <div className={styles.toast} style={{ backgroundColor: toastType === 'error' ? 'var(--danger)' : 'var(--primary)' }}>
          {toastType === 'success' ? <Check size={16} /> : <AlertCircle size={16} />}
          <span>{toastMessage}</span>
        </div>
      )}

      <div className={styles.header}>
        <h1 className={styles.title}>API & Integrations</h1>
        <p className={styles.desc}>
          Authenticate your web widgets using Secret API keys, or stream real-time events to your external servers using webhooks.
        </p>
      </div>

      {/* SECTION 1: API KEYS SECTION */}
      <section className={styles.card}>
        <h2 className={styles.cardTitle}>
          <Key size={18} /> API Key Management
        </h2>
        <p className={styles.cardDesc}>
          Use live keys to query conversation data or embed chatbots inside custom web portals. Maintain security by revoking unused keys.
        </p>

        {/* Generate Key Form */}
        <form onSubmit={handleGenerateKey} className={styles.generatorRow}>
          <div style={{ display: 'flex', gap: '12px', flex: 1, minWidth: '280px' }}>
            <input 
              type="text" 
              className={styles.input}
              placeholder="e.g. Production Web Widget"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              style={{ flex: 1 }}
              required
            />
            <button type="submit" className={styles.btnPrimary}>
              <Plus size={14} /> Generate New API Key
            </button>
          </div>
        </form>

        {/* Show generated key container */}
        {showKeyDisplay && (
          <div style={{ marginBottom: '24px', padding: '16px', border: '1px solid var(--border)', borderRadius: '6px', backgroundColor: 'var(--background)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-muted)' }}>
                Newly Generated Key
              </span>
              <span style={{ fontSize: '11px', color: 'var(--warning-text)', backgroundColor: 'var(--warning-bg)', padding: '2px 6px', borderRadius: '4px', fontWeight: 500 }}>
                Copy now! You won&apos;t be able to see this key again.
              </span>
            </div>
            <div className={styles.inputGroup}>
              <input 
                type="text" 
                className={styles.keyInput} 
                value={latestGeneratedKey} 
                readOnly 
              />
              <button type="button" className={styles.copyBtn} onClick={handleCopyKey} title="Copy Key">
                <Copy size={16} />
              </button>
            </div>
          </div>
        )}

        {/* API Keys Table */}
        {apiKeys.length === 0 ? (
          <div className={styles.emptyState}>No API keys created yet. Generate one above.</div>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Key Label</th>
                  <th>Key Token Prefix</th>
                  <th>Status</th>
                  <th>Created Date</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {apiKeys.map((item) => (
                  <tr key={item.id}>
                    <td style={{ fontWeight: 500 }}>{item.name}</td>
                    <td>
                      <code style={{ fontFamily: 'monospace', fontSize: '12.5px', color: 'var(--text-muted)' }}>
                        {item.key.substring(0, 12)}...••••••••
                      </code>
                    </td>
                    <td>
                      <span className={styles.statusBadge}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--success)' }} />
                        Active
                      </span>
                    </td>
                    <td>
                      {new Date(item.created_at).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button 
                        className={styles.deleteBtn}
                        onClick={() => handleDeleteKey(item.id, item.name)}
                        aria-label={`Revoke ${item.name}`}
                        title="Revoke Key"
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
      </section>

      {/* SECTION 2: WEBHOOKS SECTION */}
      <section className={styles.card}>
        <h2 className={styles.cardTitle}>
          <Webhook size={18} /> Webhook Endpoints
        </h2>
        <p className={styles.cardDesc}>
          Register webhook URLs to receive real-time payload updates when visitor email contacts are captured or chatbot takeover events occur.
        </p>

        {/* Add Webhook Form */}
        <form onSubmit={handleAddWebhook} className={styles.webhookForm}>
          <div className={styles.formGroup}>
            <label htmlFor="webhook-url">Endpoint URL</label>
            <input 
              id="webhook-url"
              type="text" 
              className={styles.input}
              placeholder="e.g. https://api.yourdomain.com/v1/webhook-receiver"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              required
            />
          </div>
          <button type="submit" className={styles.btnPrimary} style={{ height: '40px' }}>
            <Plus size={14} /> Add Endpoint
          </button>
        </form>

        {/* Webhooks Table */}
        {webhooks.length === 0 ? (
          <div className={styles.emptyState}>No Webhook endpoints registered. Add one above.</div>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Endpoint URL</th>
                  <th>Status</th>
                  <th>Added Date</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {webhooks.map((wh) => (
                  <tr key={wh.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', maxWidth: '450px', overflow: 'hidden' }}>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>
                          {wh.url}
                        </span>
                        <a href={wh.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-light)', display: 'inline-flex' }}>
                          <ExternalLink size={12} />
                        </a>
                      </div>
                    </td>
                    <td>
                      <span className={styles.statusBadge}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--success)' }} />
                        Active
                      </span>
                    </td>
                    <td>
                      {new Date(wh.created_at).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button 
                        className={styles.deleteBtn}
                        onClick={() => handleDeleteWebhook(wh.id, wh.url)}
                        aria-label={`Remove webhook ${wh.url}`}
                        title="Remove Webhook"
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
      </section>
    </div>
  );
}
