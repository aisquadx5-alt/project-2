'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Settings, Users, UserPlus, Check, Plus } from 'lucide-react';
import styles from './settings.module.css';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'admin' | 'agent';
  joined_at: string;
}

function generateMemberId() {
  return 'member-' + Math.random().toString(36).substring(2, 9);
}

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'agent'>('agent');
  const [inviteName, setInviteName] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    async function loadSettings() {
      setLoading(true);
      const demoUserStr = localStorage.getItem('uipro_demo_user');
      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        const localTeam = localStorage.getItem('uipro_team_members');
        if (localTeam) {
          setTeamMembers(JSON.parse(localTeam));
        } else {
          const initialTeam: TeamMember[] = [
            { id: '1', name: session.user.email?.split('@')[0] || 'Owner', email: session.user.email || 'owner@example.com', role: 'owner', joined_at: '2026-01-15' }
          ];
          localStorage.setItem('uipro_team_members', JSON.stringify(initialTeam));
          setTeamMembers(initialTeam);
        }
      } else if (demoUserStr) {
        const localTeam = localStorage.getItem('uipro_team_members');
        if (localTeam) {
          setTeamMembers(JSON.parse(localTeam));
        } else {
          const initialTeam: TeamMember[] = [
            { id: '1', name: 'John Doe (You)', email: 'john.doe@acme.com', role: 'owner', joined_at: '2026-03-01' },
            { id: '2', name: 'Sarah Miller', email: 'sarah.m@acme.com', role: 'admin', joined_at: '2026-03-12' },
            { id: '3', name: 'Alex Kumar', email: 'alex.k@acme.com', role: 'agent', joined_at: '2026-04-05' }
          ];
          localStorage.setItem('uipro_team_members', JSON.stringify(initialTeam));
          setTeamMembers(initialTeam);
        }
      }
      setLoading(false);
    }

    loadSettings();
  }, []);

  const handleInviteMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !inviteName.trim()) return;

    const newMember: TeamMember = {
      id: generateMemberId(),
      name: inviteName,
      email: inviteEmail,
      role: inviteRole,
      joined_at: new Date().toISOString().split('T')[0]
    };

    const updatedTeam = [...teamMembers, newMember];
    localStorage.setItem('uipro_team_members', JSON.stringify(updatedTeam));
    setTeamMembers(updatedTeam);

    // Reset inputs
    setInviteEmail('');
    setInviteName('');
    setInviteRole('agent');
    showToast(`Invitation sent to ${inviteEmail}.`);
  };

  const handleDeleteMember = (id: string) => {
    const member = teamMembers.find(m => m.id === id);
    if (member?.role === 'owner') {
      alert('Cannot remove the workspace owner.');
      return;
    }
    if (!confirm(`Are you sure you want to remove ${member?.name} from this workspace?`)) return;

    const updatedTeam = teamMembers.filter(m => m.id !== id);
    localStorage.setItem('uipro_team_members', JSON.stringify(updatedTeam));
    setTeamMembers(updatedTeam);
    showToast('Team member removed.');
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  if (loading) {
    return <div style={{ padding: '24px' }}><p>Loading settings...</p></div>;
  }

  return (
    <div className={styles.container}>
      {toastMessage && (
        <div className={styles.toast}>
          <Check size={16} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* TEAM MEMBERS LIST */}
      <section className={styles.sectionCard}>
        <div className={styles.sectionHeader}>
          <Users size={20} className={styles.sectionIcon} />
          <div>
            <h3 className={styles.sectionTitle}>Team Management</h3>
            <p className={styles.sectionDesc}>Manage team access, permissions, and roles for this workspace.</p>
          </div>
        </div>

        <div className={styles.membersTableWrapper}>
          <table className={styles.membersTable}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Joined Date</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {teamMembers.map(member => (
                <tr key={member.id}>
                  <td>
                    <div className={styles.memberNameCell}>
                      <div className={styles.memberAvatar}>
                        {member.name.charAt(0).toUpperCase()}
                      </div>
                      <span className={styles.memberName}>{member.name}</span>
                    </div>
                  </td>
                  <td>{member.email}</td>
                  <td>
                    <span className={`${styles.roleBadge} ${styles['role_' + member.role]}`}>
                      {member.role}
                    </span>
                  </td>
                  <td>{member.joined_at}</td>
                  <td style={{ textAlign: 'right' }}>
                    {member.role !== 'owner' && (
                      <button 
                        onClick={() => handleDeleteMember(member.id)}
                        className={styles.deleteBtn}
                      >
                        Remove
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* INVITE NEW MEMBER */}
      <section className={styles.sectionCard}>
        <div className={styles.sectionHeader}>
          <UserPlus size={20} className={styles.sectionIcon} />
          <div>
            <h3 className={styles.sectionTitle}>Invite Team Member</h3>
            <p className={styles.sectionDesc}>Send an invitation link to grant access to this workspace.</p>
          </div>
        </div>

        <form onSubmit={handleInviteMember} className={styles.inviteForm}>
          <div className={styles.formGroup}>
            <label htmlFor="invite-name">Full Name</label>
            <div className={styles.inputWrapper}>
              <input 
                id="invite-name"
                type="text" 
                className={styles.input}
                placeholder="e.g. Sarah Connor"
                value={inviteName} 
                onChange={(e) => setInviteName(e.target.value)} 
                required
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="invite-email">Email Address</label>
            <div className={styles.inputWrapper}>
              <input 
                id="invite-email"
                type="email" 
                className={styles.input}
                placeholder="e.g. sarah@acme.com"
                value={inviteEmail} 
                onChange={(e) => setInviteEmail(e.target.value)} 
                required
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="invite-role">Workspace Role</label>
            <select 
              id="invite-role"
              className={styles.select}
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as 'admin' | 'agent')}
            >
              <option value="admin">Admin (Full Edit rights)</option>
              <option value="agent">Agent (Support inbox only)</option>
            </select>
          </div>

          <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-end', height: '40px' }}>
            <Plus size={16} />
            Send Invite
          </button>
        </form>
      </section>
    </div>
  );
}
