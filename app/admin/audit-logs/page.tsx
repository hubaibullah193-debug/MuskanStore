'use client';

/**
 * Admin Dashboard - Audit Logs
 * View all system audit logs and admin actions
 */

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';

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
    log.entity_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (log.performed_by?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
  );

  const getActionColor = (action: string) => {
    if (action.includes('created')) return 'bg-green-100 text-green-900';
    if (action.includes('updated')) return 'bg-blue-100 text-blue-900';
    if (action.includes('deleted')) return 'bg-red-100 text-red-900';
    if (action.includes('refund')) return 'bg-orange-100 text-orange-900';
    if (action.includes('payment')) return 'bg-purple-100 text-purple-900';
    return 'bg-gray-100 text-gray-900';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading audit logs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Audit Logs</h1>
        <p className="text-gray-600 mt-1">View all system activities and admin actions</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by ID, action, or user..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Entity Type
            </label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
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
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <p className="text-red-700">{error}</p>
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
          <p className="text-gray-600">No audit logs found</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Action
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Entity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Performed By
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Timestamp
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredLogs.map((log, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getActionColor(log.action)}`}>
                      {log.action.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{log.entity_type}</p>
                      <p className="text-xs text-gray-600 font-mono">{log.entity_id}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <p className="text-sm text-gray-600">{log.performed_by || 'System'}</p>
                  </td>
                  <td className="px-6 py-4">
                    {log.change_details && (
                      <details className="cursor-pointer">
                        <summary className="text-sm text-blue-600 hover:text-blue-900">
                          View Details
                        </summary>
                        <pre className="text-xs bg-gray-50 p-2 rounded mt-2 overflow-auto max-w-md">
                          {JSON.stringify(log.change_details, null, 2)}
                        </pre>
                      </details>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
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
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-600 text-sm">Total Activities</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{logs.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-600 text-sm">Last 24 Hours</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">
            {logs.filter((l) => {
              const date = new Date(l.created_at);
              const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
              return date > oneDayAgo;
            }).length}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-600 text-sm">Unique Entities</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">
            {new Set(logs.map((l) => l.entity_id)).size}
          </p>
        </div>
      </div>
    </div>
  );
}
