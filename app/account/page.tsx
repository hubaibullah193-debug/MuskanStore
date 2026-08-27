'use client';

/**
 * Customer Account Page
 * Profile management and order history
 */

import { useState, useEffect } from 'react';
import { getCurrentUser, updateUserProfile, deleteAccount } from '@/server/actions/auth';
import { getUserOrders } from '@/server/actions/orders';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Alert } from '@/app/components/ui/alert';
import { StatusBadge } from '@/app/components/ui/status-badge';
import Link from 'next/link';

interface User {
  id: string;
  email: string;
  name?: string;
  phone?: string;
  email_verified: boolean;
  created_at: string;
}

interface Order {
  id: string;
  order_number: string;
  total_amount: number;
  status: 'pending' | 'pending_payment' | 'confirmed' | 'shipped' | 'delivered' | 'refund_requested' | 'refunded' | 'cancelled';
  payment_status: 'pending' | 'paid' | 'failed' | 'awaiting_cod' | 'refunded';
  created_at: string;
  item_count: number;
}

export default function AccountPage() {
  const [user, setUser] = useState<User | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const currentUser = await getCurrentUser();
      if (currentUser) {
        setUser(currentUser);
        setFormData({
          name: currentUser.name || '',
          phone: currentUser.phone || '',
        });
        // Fetch user's orders
        const userOrders = await getUserOrders(currentUser.id);
        setOrders(userOrders);
      }
    } catch (err) {
      setError('Failed to load account data');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    try {
      setError(null);
      setSuccess(null);

      if (!formData.name) {
        setError('Name is required');
        return;
      }

      const result = await updateUserProfile({
        name: formData.name,
        phone: formData.phone || undefined,
      });

      if (!result.success) {
        setError(result.error || 'Failed to update profile');
        return;
      }

      setSuccess('Profile updated successfully');
      setEditMode(false);
      loadData();
    } catch (err: any) {
      setError(err?.message || 'Failed to update profile');
    }
  };

  const handleDeleteAccount = async () => {
    try {
      setDeleting(true);
      const result = await deleteAccount();
      if (result.success) {
        window.location.href = '/';
      } else {
        setError(result.error || 'Failed to delete account');
        setShowDeleteConfirm(false);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to delete account');
      setShowDeleteConfirm(false);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-paper py-12 px-4">
        <div className="max-w-4xl mx-auto text-center text-text-tertiary">
          Loading account...
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-paper py-12 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-text-secondary mb-4">Please log in to view your account</p>
          <Link href="/auth/login" className="underline" style={{ color: 'var(--color-accent)' }}>
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold text-foreground">My Account</h1>
          <p className="text-text-secondary mt-1">Manage your profile and view orders</p>
        </div>

        {/* Messages */}
        {error && (
          <Alert variant="error" className="mb-6">
            {error}
          </Alert>
        )}
        {success && (
          <Alert variant="success" className="mb-6">
            {success}
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Card */}
          <div className="lg:col-span-1">
            <div className="bg-card border border-border rounded-lg shadow-sm p-6">
              <h2 className="font-display text-xl font-bold text-foreground mb-4">Profile</h2>

              {editMode ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">
                      Name
                    </label>
                    <Input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">
                      Phone
                    </label>
                    <Input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={handleUpdate} disabled={false}>
                      Save
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setEditMode(false);
                        setFormData({
                          name: user.name || '',
                          phone: user.phone || '',
                        });
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <div className="text-sm text-text-secondary">Name</div>
                    <div className="text-lg font-medium text-foreground">{user.name || 'Not set'}</div>
                  </div>

                  <div>
                    <div className="text-sm text-text-secondary">Email</div>
                    <div className="text-lg font-medium text-foreground break-all">{user.email}</div>
                    {!user.email_verified && (
                      <p className="text-xs text-warning mt-1">⚠️ Unverified</p>
                    )}
                  </div>

                  <div>
                    <div className="text-sm text-text-secondary">Phone</div>
                    <div className="text-lg font-medium text-foreground">
                      {user.phone || 'Not set'}
                    </div>
                  </div>

                  <div>
                    <div className="text-sm text-text-secondary">Member Since</div>
                    <div className="text-lg font-medium text-foreground">
                      {new Date(user.created_at).toLocaleDateString()}
                    </div>
                  </div>

                  <Button variant="outline" className="w-full" onClick={() => setEditMode(true)}>
                    Edit Profile
                  </Button>
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="bg-card border border-border rounded-lg shadow-sm p-6 mt-6">
              <h3 className="font-display text-lg font-bold text-foreground mb-4">Quick Actions</h3>
              <div className="space-y-2">
                <Link
                  href="/auth/forgot-password"
                  className="block px-4 py-2 text-accent hover:bg-paper-2 rounded-lg transition-colors"
                >
                  Change Password
                </Link>
                <Button
                  variant="danger"
                  className="w-full justify-start"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  Delete Account
                </Button>
              </div>
            </div>
          </div>

          {/* Orders List */}
          <div className="lg:col-span-2">
            <div className="bg-card border border-border rounded-lg shadow-sm p-6">
              <h2 className="font-display text-xl font-bold text-foreground mb-4">Order History</h2>

              {orders.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-text-secondary mb-4">You haven&apos;t placed any orders yet</p>
                  <Button href="/products">Start Shopping</Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b border-border bg-paper-2">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">
                          Order #
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">
                          Date
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">
                          Amount
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">
                          Status
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">
                          Payment
                        </th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-foreground">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((order) => (
                        <tr key={order.id} className="border-b border-border hover:bg-paper-2">
                          <td className="px-4 py-3 text-sm font-medium text-foreground">
                            #{order.order_number}
                          </td>
                          <td className="px-4 py-3 text-sm text-text-secondary">
                            {new Date(order.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3 text-sm font-medium text-foreground">
                            Rs {(order.total_amount).toFixed(0)}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <StatusBadge status={order.status} />
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <StatusBadge status={order.payment_status} />
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Link
                              href={`/orders/${order.id}`}
                              className="text-accent hover:underline text-sm font-medium"
                            >
                              View
                            </Link>
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
      </div>

      {/* Delete Account Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-card border border-border rounded-lg shadow-lg p-6 max-w-md w-full mx-4">
            <h3 className="font-display text-lg font-bold text-foreground mb-2">Delete Account</h3>
            <p className="text-text-secondary mb-6">
              Are you sure you want to delete your account? This action cannot be undone.
              Your order history will be preserved, but you will lose access to your account.
            </p>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setShowDeleteConfirm(false)} disabled={deleting}>
                Cancel
              </Button>
              <Button variant="danger" onClick={handleDeleteAccount} disabled={deleting}>
                {deleting ? 'Deleting...' : 'Yes, Delete My Account'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
