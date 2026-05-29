// src/services/emailService.js
import emailjs from '@emailjs/browser';

const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID || '';
const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID || '';
const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || '';

/**
 * Sends a premium email notification via EmailJS.
 * Falls back gracefully to console logging if keys are missing.
 * 
 * @param {Object} params Template parameters for EmailJS
 * @returns {Promise} Resolves when sent or skipped
 */
export const sendEmail = async (params) => {
  if (!SERVICE_ID || !TEMPLATE_ID || !PUBLIC_KEY) {
    console.warn(
      '⚠️ EmailJS is not configured yet. Set VITE_EMAILJS_SERVICE_ID, ' +
      'VITE_EMAILJS_TEMPLATE_ID, and VITE_EMAILJS_PUBLIC_KEY in your .env file.'
    );
    return Promise.resolve({ status: 'simulated' });
  }

  try {
    // Format variables to match the dynamic template
    const templateParams = {
      subject: params.subject || 'ECP Notification',
      to_email: params.to_email || '',
      recipient_name: params.recipient_name || 'Citizen',
      title: params.title || 'Election Commission of Pakistan',
      message_body: params.message_body || '',
      detail_label_1: params.detail_label_1 || '',
      detail_value_1: params.detail_value_1 || '',
      detail_label_2: params.detail_label_2 || '',
      detail_value_2: params.detail_value_2 || '',
      detail_label_3: params.detail_label_3 || '',
      detail_value_3: params.detail_value_3 || '',
      rejection_reason: params.rejection_reason || '',
      action_url: params.action_url || '',
      action_text: params.action_text || 'Open Portal',
      // CSS display properties to toggle layout visibility in EmailJS
      detail_box_display: params.detail_label_1 ? 'display: block;' : 'display: none;',
      detail_row_1_display: params.detail_label_1 ? 'display: block;' : 'display: none;',
      detail_row_2_display: params.detail_label_2 ? 'display: block;' : 'display: none;',
      detail_row_3_display: params.detail_label_3 ? 'display: block;' : 'display: none;',
      rejection_box_display: params.rejection_reason ? 'display: block;' : 'display: none;'
    };

    const response = await emailjs.send(SERVICE_ID, TEMPLATE_ID, templateParams, PUBLIC_KEY);
    console.log('📬 Email successfully sent via EmailJS:', response);
    return response;
  } catch (error) {
    console.error('❌ EmailJS transmission failed:', error);
    throw error;
  }
};
