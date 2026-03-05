/**
 * EmailService.ts — Email service using Nodemailer
 */

import nodemailer from 'nodemailer';
import logger from '../utils/logger';

// Create transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

// Verify connection
transporter.verify((error, success) => {
  if (error) {
    logger.error(`Email configuration error: ${error}`);
  } else {
    logger.info('Email server is ready to send messages');
  }
});

class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = transporter;
  }
  
  /**
   * Send OTP email
   */
  async sendOTP(email: string, otp: string, purpose: 'registration' | 'login'): Promise<boolean> {
    try {
      const subject = purpose === 'registration' 
        ? 'Verify Your Email - Google Docs Clone'
        : 'Login Verification Code - Google Docs Clone';

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #4285f4; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
            .otp-box { background: white; border: 2px dashed #4285f4; padding: 20px; text-align: center; margin: 20px 0; border-radius: 5px; }
            .otp-code { font-size: 32px; font-weight: bold; color: #4285f4; letter-spacing: 5px; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📧 Email Verification</h1>
            </div>
            <div class="content">
              <h2>Hello!</h2>
              <p>You are receiving this email because you ${purpose === 'registration' ? 'registered for' : 'attempted to login to'} Google Docs Clone.</p>
              
              <p>Your verification code is:</p>
              
              <div class="otp-box">
                <div class="otp-code">${otp}</div>
              </div>
              
              <p><strong>This code will expire in 10 minutes.</strong></p>
              
              <p>If you didn't request this code, please ignore this email.</p>
              
              <div class="footer">
                <p>This is an automated email. Please do not reply.</p>
                <p>&copy; ${new Date().getFullYear()} Google Docs Clone. All rights reserved.</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `;

      await this.transporter.sendMail({
        from: `"Google Docs Clone" <${process.env.EMAIL_USER}>`,
        to: email,
        subject,
        html,
      });

      logger.info(`OTP email sent to ${email}`);
      return true;
    } catch (error) {
      logger.error(`Failed to send OTP email to ${email}:`, error);
      return false;
    }
  }

  /**
   * Send welcome email after successful registration
   */
  async sendWelcomeEmail(email: string, username: string): Promise<boolean> {
    try {
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #4285f4; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
            .button { display: inline-block; padding: 12px 30px; background: #4285f4; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Welcome to Google Docs Clone!</h1>
            </div>
            <div class="content">
              <h2>Hi ${username}!</h2>
              <p>Thank you for registering with Google Docs Clone. Your account has been successfully created.</p>
              
              <p>You can now:</p>
              <ul>
                <li>Create and edit documents</li>
                <li>Collaborate in real-time with others</li>
                <li>Share documents with custom permissions</li>
                <li>Add comments and replies</li>
              </ul>
              
              <div style="text-align: center;">
                <a href="${process.env.CLIENT_ORIGIN || 'http://localhost:5173'}" class="button">Get Started</a>
              </div>
              
              <div class="footer">
                <p>&copy; ${new Date().getFullYear()} Google Docs Clone. All rights reserved.</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `;

      await this.transporter.sendMail({
        from: `"Google Docs Clone" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Welcome to Google Docs Clone! 🎉',
        html,
      });

      logger.info(`Welcome email sent to ${email}`);
      return true;
    } catch (error) {
      logger.error(`Failed to send welcome email to ${email}:`, error);
      return false;
    }
  }

  /**
   * Send document sharing notification email
   */
  async sendDocumentShareEmail(
    recipientEmail: string,
    recipientName: string,
    sharedByName: string,
    documentTitle: string,
    documentId: string,
    permission: 'read' | 'write'
  ): Promise<boolean> {
    try {
      const documentUrl = `${process.env.CLIENT_ORIGIN || 'http://localhost:5173'}/docs/${documentId}`;
      const permissionText = permission === 'write' ? 'edit' : 'view';
      const permissionIcon = permission === 'write' ? '✏️' : '👁️';

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #4285f4; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
            .doc-info { background: white; border-left: 4px solid #4285f4; padding: 16px; margin: 20px 0; border-radius: 4px; }
            .button { display: inline-block; padding: 12px 30px; background: #4285f4; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .permission-badge { display: inline-block; padding: 6px 12px; background: ${permission === 'write' ? '#e0f2fe' : '#fef3c7'}; color: ${permission === 'write' ? '#0369a1' : '#92400e'}; border-radius: 4px; font-size: 13px; font-weight: 500; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📄 Document Shared With You</h1>
            </div>
            <div class="content">
              <h2>Hi ${recipientName}!</h2>
              <p><strong>${sharedByName}</strong> has shared a document with you.</p>
              
              <div class="doc-info">
                <h3 style="margin: 0 0 8px 0; font-size: 18px; color: #4285f4;">
                  ${documentTitle}
                </h3>
                <p style="margin: 0; color: #666;">
                  ${permissionIcon} You have <span class="permission-badge">${permissionText === 'edit' ? 'Can edit' : 'View only'}</span> access
                </p>
              </div>
              
              <p>Click the button below to open the document:</p>
              
              <div style="text-align: center;">
                <a href="${documentUrl}" class="button">Open Document</a>
              </div>
              
              <p style="font-size: 13px; color: #666;">
                Or copy this link: <a href="${documentUrl}" style="color: #4285f4;">${documentUrl}</a>
              </p>
              
              <div class="footer">
                <p>This is an automated email. Please do not reply.</p>
                <p>&copy; ${new Date().getFullYear()} Google Docs Clone. All rights reserved.</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `;

      await this.transporter.sendMail({
        from: `"Google Docs Clone" <${process.env.EMAIL_USER}>`,
        to: recipientEmail,
        subject: `${sharedByName} shared "${documentTitle}" with you`,
        html,
      });

      logger.info(`Document share notification sent to ${recipientEmail}`);
      return true;
    } catch (error) {
      logger.error(`Failed to send document share email to ${recipientEmail}:`, error);
      return false;
    }
  }
}

export default new EmailService();
