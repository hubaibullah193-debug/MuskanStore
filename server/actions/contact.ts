'use server';

/**
 * Server Action for Contact Form
 * Submit contact messages and notify admin
 */

import { supabaseAdmin } from '@/lib/supabase/client';
import { sendEmail } from '@/lib/email/service';
import { AppError, getErrorMessage } from '@/lib/utils/helpers';

interface ContactFormData {
  name: string;
  email: string;
  subject: string;
  message: string;
  orderId?: string;
}

export async function submitContactForm(data: ContactFormData) {
  try {
    if (!data.name || !data.email || !data.subject || !data.message) {
      throw new AppError('VALIDATION_ERROR', 'Name, email, subject, and message are required', 400);
    }

    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      throw new AppError('VALIDATION_ERROR', 'Invalid email address', 400);
    }

    // Insert contact message
    const { error } = await supabaseAdmin.from('contact_messages').insert({
      name: data.name,
      email: data.email,
      subject: data.subject,
      message: data.message,
      order_id: data.orderId || null,
    });

    if (error) {
      console.error('Contact form insert error:', error);
      throw new AppError('SUBMIT_FAILED', 'Failed to submit your message', 500);
    }

    // Send notification email to admin (best effort)
    try {
      await sendEmail({
        to: process.env.ADMIN_EMAIL || 'admin@muskancare.com',
        subject: `New Contact Message: ${data.subject}`,
        html: `
          <h2>New Contact Message</h2>
          <p><strong>From:</strong> ${data.name} (${data.email})</p>
          ${data.orderId ? `<p><strong>Order ID:</strong> ${data.orderId}</p>` : ''}
          <p><strong>Subject:</strong> ${data.subject}</p>
          <hr/>
          <p>${data.message.replace(/\n/g, '<br/>')}</p>
        `,
      });
    } catch (emailError) {
      // Don't fail the submission if email notification fails
      console.error('Contact form notification email failed:', emailError);
    }

    return { success: true };
  } catch (error) {
    if (error instanceof AppError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: getErrorMessage(error) };
  }
}
