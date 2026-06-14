'use client';

import React from 'react';
import { Users, Download } from 'lucide-react';
import styles from '../placeholder.module.css';

export default function LeadsPlaceholder() {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Leads & Contacts</h1>
        <p className={styles.desc}>
          View captured visitor email addresses and contact information from your chatbot sessions.
        </p>
      </div>

      <div className={styles.emptyStateCard}>
        <div className={styles.iconWrapper}>
          <Users size={24} />
        </div>
        <h3 className={styles.emptyTitle}>No leads captured yet</h3>
        <p className={styles.emptyDesc}>
          When visitors provide email addresses or contact details in the chatbot widget, they will show up here.
        </p>
        <button className={styles.btnPrimary} disabled style={{ opacity: 0.6, cursor: 'not-allowed' }}>
          <Download size={14} />
          Export Leads (CSV)
        </button>
      </div>
    </div>
  );
}
