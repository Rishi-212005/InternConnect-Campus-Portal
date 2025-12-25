import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  type: 'interview_invite' | 'application_status' | 'faculty_approved' | 'recruiter_approved' | 'mentor_approved' | 'job_verified';
  recipientEmail: string;
  recipientName: string;
  data: {
    jobTitle?: string;
    companyName?: string;
    status?: string;
    interviewDate?: string;
    interviewTime?: string;
    meetingLink?: string;
    message?: string;
  };
}

const getEmailContent = (type: string, recipientName: string, data: any) => {
  const templates: Record<string, { subject: string; html: string }> = {
    interview_invite: {
      subject: `Interview Invitation - ${data.jobTitle} at ${data.companyName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 20px; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">🎉 Interview Invitation</h1>
          </div>
          <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px;">Dear <strong>${recipientName}</strong>,</p>
            <p style="font-size: 16px;">Congratulations! You have been invited for an interview for the position of <strong>${data.jobTitle}</strong> at <strong>${data.companyName}</strong>.</p>
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #6366f1;">
              <p style="margin: 5px 0;"><strong>📅 Date:</strong> ${data.interviewDate}</p>
              <p style="margin: 5px 0;"><strong>⏰ Time:</strong> ${data.interviewTime}</p>
              ${data.meetingLink ? `<p style="margin: 5px 0;"><strong>🔗 Meeting Link:</strong> <a href="${data.meetingLink}" style="color: #6366f1;">${data.meetingLink}</a></p>` : ''}
            </div>
            <p style="font-size: 14px; color: #64748b;">Please make sure to join the interview on time. Good luck!</p>
            <p style="margin-top: 30px;">Best regards,<br><strong>CodeCrew Placement Team</strong></p>
          </div>
        </div>
      `,
    },
    application_status: {
      subject: `Application Update - ${data.jobTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 20px; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">Application Status Update</h1>
          </div>
          <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px;">Dear <strong>${recipientName}</strong>,</p>
            <p style="font-size: 16px;">Your application for <strong>${data.jobTitle}</strong> at <strong>${data.companyName}</strong> has been updated.</p>
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${data.status === 'selected' ? '#22c55e' : data.status === 'rejected' ? '#ef4444' : '#6366f1'};">
              <p style="margin: 0; font-size: 18px;"><strong>Status:</strong> <span style="color: ${data.status === 'selected' ? '#22c55e' : data.status === 'rejected' ? '#ef4444' : '#6366f1'}; text-transform: uppercase;">${data.status?.replace(/_/g, ' ')}</span></p>
            </div>
            ${data.message ? `<p style="font-size: 14px; color: #64748b;">${data.message}</p>` : ''}
            <p style="margin-top: 30px;">Best regards,<br><strong>CodeCrew Placement Team</strong></p>
          </div>
        </div>
      `,
    },
    mentor_approved: {
      subject: 'Your Faculty/Mentor Account Has Been Approved',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #22c55e, #16a34a); padding: 20px; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">✅ Account Approved</h1>
          </div>
          <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px;">Dear <strong>${recipientName}</strong>,</p>
            <p style="font-size: 16px;">Your faculty/mentor account on CodeCrew has been approved by the Placement Cell.</p>
            <p style="font-size: 16px;">You can now log in and access all features of the platform.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.loginUrl || '#'}" style="background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 12px 30px; border-radius: 8px; text-decoration: none; font-weight: bold;">Login to Dashboard</a>
            </div>
            <p style="margin-top: 30px;">Best regards,<br><strong>CodeCrew Placement Team</strong></p>
          </div>
        </div>
      `,
    },
    recruiter_approved: {
      subject: 'Your Recruiter Account Has Been Verified',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #22c55e, #16a34a); padding: 20px; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">✅ Account Verified</h1>
          </div>
          <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px;">Dear <strong>${recipientName}</strong>,</p>
            <p style="font-size: 16px;">Your recruiter account for <strong>${data.companyName}</strong> has been verified by the Placement Cell.</p>
            <p style="font-size: 16px;">You can now post jobs and manage candidates on CodeCrew.</p>
            <p style="margin-top: 30px;">Best regards,<br><strong>CodeCrew Placement Team</strong></p>
          </div>
        </div>
      `,
    },
    job_verified: {
      subject: `Job Posting Approved - ${data.jobTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #22c55e, #16a34a); padding: 20px; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">✅ Job Posting Approved</h1>
          </div>
          <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px;">Dear <strong>${recipientName}</strong>,</p>
            <p style="font-size: 16px;">Your job posting for <strong>${data.jobTitle}</strong> has been verified and is now live on CodeCrew.</p>
            <p style="font-size: 16px;">Students can now apply for this position.</p>
            <p style="margin-top: 30px;">Best regards,<br><strong>CodeCrew Placement Team</strong></p>
          </div>
        </div>
      `,
    },
    faculty_approved: {
      subject: `Application Approved by Faculty - ${data.jobTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 20px; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">📋 Application Approved</h1>
          </div>
          <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px;">Dear <strong>${recipientName}</strong>,</p>
            <p style="font-size: 16px;">Your application for <strong>${data.jobTitle}</strong> at <strong>${data.companyName}</strong> has been approved by faculty.</p>
            <p style="font-size: 16px;">Your application has been forwarded to the recruiter for further processing.</p>
            <p style="margin-top: 30px;">Best regards,<br><strong>CodeCrew Placement Team</strong></p>
          </div>
        </div>
      `,
    },
  };

  return templates[type] || {
    subject: 'CodeCrew Notification',
    html: `<p>Dear ${recipientName}, ${data.message || 'You have a new notification.'}</p>`,
  };
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, recipientEmail, recipientName, data }: NotificationRequest = await req.json();

    console.log(`Sending ${type} notification to ${recipientEmail}`);

    const emailContent = getEmailContent(type, recipientName, data);

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "CodeCrew <onboarding@resend.dev>",
        to: [recipientEmail],
        subject: emailContent.subject,
        html: emailContent.html,
      }),
    });

    const emailResult = await emailResponse.json();

    console.log("Email sent successfully:", emailResponse);

    // Also create in-app notification
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user ID from email
    const { data: userData } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('email', recipientEmail)
      .single();

    if (userData) {
      await supabase.from('notifications').insert({
        user_id: userData.user_id,
        title: emailContent.subject,
        message: `${type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}: ${data.jobTitle || data.message || 'New notification'}`,
        link: data.meetingLink || null,
      });
      console.log('In-app notification created');
    }

    return new Response(JSON.stringify({ success: true, emailResult }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-notification function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
