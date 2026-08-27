'use client';

/**
 * Admin Dashboard - Audit Logs
 * View all system audit logs and admin actions
 */

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { statusTint, getAuditActionTone } from '@/lib/ui/status-colors';

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'order' | 'payment' | 'refund'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        let query = supabase
          .from('admin_audit_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100);

        if (filter !== 'all') {
          query = query.eq('entity_type', filter);
        }

        const { data, error: fetchError } = await query;

        if (fetchError) throw fetchError;
        setLogs(data || []);
      } catch (err: any) {
        setError(err.message || 'Failed to load audit logs');
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, [filter]);

  const filteredLogs = logs.filter((log) =>
    (log.entity_id ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (log.admin_id?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4"></div>
          <p>Loading audit logs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Audit Logs</h1>
        <p className="text-text-secondary mt-1">View all system activities and admin actions</p>
      </div>

      {/* Filters */}
      <div className="bg-card rounded-lg shadow-sm border border-border p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Search
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by ID, action, or user..."
              className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Entity Type
            </label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
            >
              <option value="all">All Activities</option>
              <option value="order">Order Activities</option>
              <option value="payment">Payment Activities</option>
              <option value="refund">Refund Activities</option>
            </select>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      {error ? (
        <div className="bg-[color-mix(in_oklch,var(--color-error)_12%,white)] border border-[color-mix(in_oklch,var(--color-error)_35%,transparent)] rounded-lg p-6">
          <p className="text-error">{error}</p>
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="bg-paper-2 border border-border rounded-lg p-6 text-center">
          <p className="text-text-secondary">No audit logs found</p>
        </div>
      ) : (
        <div className="bg-card rounded-lg shadow-sm border border-border overflow-x-auto">
          <table className="w-full">
            <thead className="bg-paper-2 border-b border-border">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Action
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Entity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Performed By
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Timestamp
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredLogs.map((log, idx) => (
                <tr key={idx} className="hover:bg-paper-2">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusTint[getAuditActionTone(log.action)]}`}>
                      {log.action.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <p className="text-sm font-medium text-foreground">{log.entity_type}</p>
                      <p className="text-xs text-text-secondary font-mono">{log.entity_id ?? "—"}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <p className="text-sm text-text-secondary">{log.admin_id || 'System'}</p>
                  </td>
                  <td className="px-6 py-4">
                    {log.changes && (
                      <details className="cursor-pointer">
                        <summary className="text-sm text-accent hover:text-accent-dark">
                          View Details
                        </summary>
                        <pre className="text-xs bg-paper-2 p-2 rounded mt-2 overflow-auto max-w-md">
                          {JSON.stringify(log.changes, null, 2)}
                        </pre>
                      </details>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card rounded-lg shadow-sm border border-border p-6">
          <p className="text-text-secondary text-sm">Total Activities</p>
          <p className="text-3xl font-bold text-foreground mt-2">{logs.length}</p>
        </div>
        <div className="bg-card rounded-lg shadow-sm border border-border p-6">
          <p className="text-text-secondary text-sm">Last 24 Hours</p>
          <p className="text-3xl font-bold text-foreground mt-2">
            {logs.filter((l) => {
              const date = new Date(l.created_at);
              const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
              return date > oneDayAgo;
            }).length}
          </p>
        </div>
        <div className="bg-card rounded-lg shadow-sm border border-border p-6">
          <p className="text-text-secondary text-sm">Unique Entities</p>
          <p className="text-3xl font-bold text-foreground mt-2">
            {new Set(logs.map((l) => l.entity_id ?? "")).size}
          </p>
        </div>
      </div>
    </div>
  );
}
