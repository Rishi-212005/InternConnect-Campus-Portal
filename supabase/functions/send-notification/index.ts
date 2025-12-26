import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  type: 'interview_invite' | 'application_status' | 'faculty_approved' | 'recruiter_approved' | 'mentor_approved' | 'student_approved' | 'job_verified' | 'exam_passed' | 'exam_failed' | 'interview_scheduled' | 'candidate_selected' | 'candidate_rejected' | 'mentor_rejected' | 'student_rejected';
  recipientEmail: string;
  recipientName: string;
  data: {
    jobTitle?: string;
    companyName?: string;
    status?: string;
    interviewDate?: string;
    interviewTime?: string;
    meetingLink?: string;
    duration?: string;
    message?: string;
    loginUrl?: string;
    mentorName?: string;
    studentName?: string;
    assessmentTitle?: string;
    score?: string;
    passingScore?: string;
    nextRoundInfo?: string;
    notes?: string;
  };
}

const getEmailContent = (type: string, recipientName: string, data: any) => {
  const templates: Record<string, { subject: string; html: string }> = {
    // Mentor/Faculty approval emails
    mentor_approved: {
      subject: '✅ Your Faculty/Mentor Account Has Been Approved - InternConnect',
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f8fafc;">
          <div style="background: linear-gradient(135deg, #22c55e, #16a34a); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">✅ Account Approved!</h1>
          </div>
          <div style="background: white; padding: 30px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            <p style="font-size: 18px; color: #334155;">Dear <strong>${recipientName}</strong>,</p>
            <p style="font-size: 16px; color: #475569; line-height: 1.6;">
              Great news! Your faculty/mentor account on <strong>InternConnect</strong> has been approved by the Placement Cell.
            </p>
            <div style="background: linear-gradient(135deg, #f0fdf4, #dcfce7); padding: 20px; border-radius: 12px; margin: 24px 0; border-left: 4px solid #22c55e;">
              <p style="margin: 0; color: #166534; font-size: 16px;">
                🎓 You can now log in and start mentoring students, reviewing applications, and guiding them through their placement journey.
              </p>
            </div>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.loginUrl || 'https://internconnect.lovable.app'}" style="background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 14px 40px; border-radius: 10px; text-decoration: none; font-weight: bold; display: inline-block; font-size: 16px;">
                Login to Dashboard
              </a>
            </div>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
            <p style="font-size: 14px; color: #64748b; margin-bottom: 0;">
              Best regards,<br><strong style="color: #334155;">InternConnect Placement Team</strong>
            </p>
          </div>
          <p style="text-align: center; font-size: 12px; color: #94a3b8; margin-top: 20px;">
            This email was sent from internconnectcampus@gmail.com
          </p>
        </div>
      `,
    },
    mentor_rejected: {
      subject: '❌ Account Approval Update - InternConnect',
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f8fafc;">
          <div style="background: linear-gradient(135deg, #ef4444, #dc2626); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Account Status Update</h1>
          </div>
          <div style="background: white; padding: 30px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            <p style="font-size: 18px; color: #334155;">Dear <strong>${recipientName}</strong>,</p>
            <p style="font-size: 16px; color: #475569; line-height: 1.6;">
              We regret to inform you that your faculty/mentor account application has not been approved at this time.
            </p>
            <p style="font-size: 14px; color: #64748b; line-height: 1.6;">
              If you believe this was an error or have additional documentation to provide, please contact the Placement Cell.
            </p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
            <p style="font-size: 14px; color: #64748b; margin-bottom: 0;">
              Best regards,<br><strong style="color: #334155;">InternConnect Placement Team</strong>
            </p>
          </div>
        </div>
      `,
    },
    // Student approval emails
    student_approved: {
      subject: '✅ Your Student Account Has Been Verified - InternConnect',
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f8fafc;">
          <div style="background: linear-gradient(135deg, #22c55e, #16a34a); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">🎉 Account Verified!</h1>
          </div>
          <div style="background: white; padding: 30px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            <p style="font-size: 18px; color: #334155;">Dear <strong>${recipientName}</strong>,</p>
            <p style="font-size: 16px; color: #475569; line-height: 1.6;">
              Great news! Your student account on <strong>InternConnect</strong> has been verified by the Placement Cell.
            </p>
            <div style="background: linear-gradient(135deg, #f0fdf4, #dcfce7); padding: 20px; border-radius: 12px; margin: 24px 0; border-left: 4px solid #22c55e;">
              <p style="margin: 0; color: #166534; font-size: 16px;">
                🚀 You can now browse job opportunities, apply to positions, request mentors, and track your placement journey.
              </p>
            </div>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.loginUrl || 'https://internconnect.lovable.app'}" style="background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 14px 40px; border-radius: 10px; text-decoration: none; font-weight: bold; display: inline-block; font-size: 16px;">
                Explore Jobs
              </a>
            </div>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
            <p style="font-size: 14px; color: #64748b; margin-bottom: 0;">
              Best regards,<br><strong style="color: #334155;">InternConnect Placement Team</strong>
            </p>
          </div>
        </div>
      `,
    },
    student_rejected: {
      subject: '❌ Account Verification Update - InternConnect',
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f8fafc;">
          <div style="background: linear-gradient(135deg, #ef4444, #dc2626); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Verification Status Update</h1>
          </div>
          <div style="background: white; padding: 30px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            <p style="font-size: 18px; color: #334155;">Dear <strong>${recipientName}</strong>,</p>
            <p style="font-size: 16px; color: #475569; line-height: 1.6;">
              We regret to inform you that your student account verification was not approved at this time.
            </p>
            <p style="font-size: 14px; color: #64748b; line-height: 1.6;">
              Please ensure your profile information is complete and contact the Placement Cell for more details.
            </p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
            <p style="font-size: 14px; color: #64748b; margin-bottom: 0;">
              Best regards,<br><strong style="color: #334155;">InternConnect Placement Team</strong>
            </p>
          </div>
        </div>
      `,
    },
    // Exam result emails
    exam_passed: {
      subject: `🎉 Congratulations! You Passed the Assessment - ${data.companyName}`,
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f8fafc;">
          <div style="background: linear-gradient(135deg, #22c55e, #10b981); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">🎉 Congratulations!</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">You Passed the Assessment</p>
          </div>
          <div style="background: white; padding: 30px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            <p style="font-size: 18px; color: #334155;">Dear <strong>${recipientName}</strong>,</p>
            <p style="font-size: 16px; color: #475569; line-height: 1.6;">
              We are thrilled to inform you that you have <strong style="color: #22c55e;">successfully passed</strong> the assessment for the position of <strong>${data.jobTitle}</strong> at <strong>${data.companyName}</strong>!
            </p>
            <div style="background: linear-gradient(135deg, #f0fdf4, #dcfce7); padding: 20px; border-radius: 12px; margin: 24px 0; border-left: 4px solid #22c55e;">
              <p style="margin: 0 0 10px 0; color: #166534;"><strong>📊 Your Score:</strong> ${data.score || 'N/A'}</p>
              <p style="margin: 0; color: #166534;"><strong>✅ Passing Score:</strong> ${data.passingScore || 'N/A'}</p>
            </div>
            <div style="background: linear-gradient(135deg, #eff6ff, #dbeafe); padding: 20px; border-radius: 12px; margin: 24px 0; border-left: 4px solid #3b82f6;">
              <p style="margin: 0; color: #1e40af; font-size: 16px;">
                <strong>📅 Next Step:</strong> ${data.nextRoundInfo || 'You will be scheduled for an interview soon. Stay tuned for further updates!'}
              </p>
            </div>
            <p style="font-size: 14px; color: #64748b; line-height: 1.6;">
              Please keep checking your email and dashboard for interview scheduling details.
            </p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
            <p style="font-size: 14px; color: #64748b; margin-bottom: 0;">
              Best of luck!<br><strong style="color: #334155;">InternConnect Placement Team</strong>
            </p>
          </div>
        </div>
      `,
    },
    exam_failed: {
      subject: `Assessment Result - ${data.companyName}`,
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f8fafc;">
          <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Assessment Result</h1>
          </div>
          <div style="background: white; padding: 30px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            <p style="font-size: 18px; color: #334155;">Dear <strong>${recipientName}</strong>,</p>
            <p style="font-size: 16px; color: #475569; line-height: 1.6;">
              Thank you for taking the assessment for <strong>${data.jobTitle}</strong> at <strong>${data.companyName}</strong>.
            </p>
            <p style="font-size: 16px; color: #475569; line-height: 1.6;">
              Unfortunately, you did not meet the passing criteria this time. However, we encourage you to keep learning and try again for future opportunities!
            </p>
            <div style="background: linear-gradient(135deg, #fef3c7, #fde68a); padding: 20px; border-radius: 12px; margin: 24px 0; border-left: 4px solid #f59e0b;">
              <p style="margin: 0; color: #92400e; font-size: 16px;">
                💪 Don't give up! Every experience is a learning opportunity. Keep preparing and explore other job opportunities on our platform.
              </p>
            </div>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
            <p style="font-size: 14px; color: #64748b; margin-bottom: 0;">
              Best regards,<br><strong style="color: #334155;">InternConnect Placement Team</strong>
            </p>
          </div>
        </div>
      `,
    },
    // Interview scheduled email
    interview_scheduled: {
      subject: `📅 Interview Scheduled - ${data.jobTitle} at ${data.companyName}`,
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f8fafc;">
          <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">📅 Interview Scheduled!</h1>
          </div>
          <div style="background: white; padding: 30px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            <p style="font-size: 18px; color: #334155;">Dear <strong>${recipientName}</strong>,</p>
            <p style="font-size: 16px; color: #475569; line-height: 1.6;">
              Great news! Your interview has been scheduled for the position of <strong>${data.jobTitle}</strong> at <strong>${data.companyName}</strong>.
            </p>
            <div style="background: linear-gradient(135deg, #eff6ff, #dbeafe); padding: 24px; border-radius: 12px; margin: 24px 0; border-left: 4px solid #3b82f6;">
              <h3 style="margin: 0 0 16px 0; color: #1e40af; font-size: 18px;">Interview Details</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #334155; font-weight: bold; width: 120px;">📅 Date:</td>
                  <td style="padding: 8px 0; color: #475569;">${data.interviewDate || 'TBA'}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #334155; font-weight: bold;">⏰ Time:</td>
                  <td style="padding: 8px 0; color: #475569;">${data.interviewTime || 'TBA'}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #334155; font-weight: bold;">⏱️ Duration:</td>
                  <td style="padding: 8px 0; color: #475569;">${data.duration || '60'} minutes</td>
                </tr>
                ${data.meetingLink ? `
                <tr>
                  <td style="padding: 8px 0; color: #334155; font-weight: bold;">🔗 Meeting:</td>
                  <td style="padding: 8px 0;"><a href="${data.meetingLink}" style="color: #3b82f6; text-decoration: none; font-weight: 500;">${data.meetingLink}</a></td>
                </tr>
                ` : ''}
              </table>
            </div>
            ${data.notes ? `
            <div style="background: #f1f5f9; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
              <p style="margin: 0; color: #475569; font-size: 14px;"><strong>📝 Notes:</strong> ${data.notes}</p>
            </div>
            ` : ''}
            ${data.meetingLink ? `
            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.meetingLink}" style="background: linear-gradient(135deg, #22c55e, #16a34a); color: white; padding: 14px 40px; border-radius: 10px; text-decoration: none; font-weight: bold; display: inline-block; font-size: 16px;">
                Join Meeting
              </a>
            </div>
            ` : ''}
            <div style="background: linear-gradient(135deg, #fef3c7, #fde68a); padding: 16px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0; color: #92400e; font-size: 14px;">
                ⚠️ <strong>Important:</strong> Please join the meeting 5 minutes before the scheduled time. Ensure you have a stable internet connection and a quiet environment.
              </p>
            </div>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
            <p style="font-size: 14px; color: #64748b; margin-bottom: 0;">
              Best of luck!<br><strong style="color: #334155;">InternConnect Placement Team</strong>
            </p>
          </div>
        </div>
      `,
    },
    // Interview invite (legacy support)
    interview_invite: {
      subject: `🎉 Interview Invitation - ${data.jobTitle} at ${data.companyName}`,
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f8fafc;">
          <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">🎉 Interview Invitation</h1>
          </div>
          <div style="background: white; padding: 30px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            <p style="font-size: 18px; color: #334155;">Dear <strong>${recipientName}</strong>,</p>
            <p style="font-size: 16px; color: #475569; line-height: 1.6;">
              Congratulations! You have been invited for an interview for the position of <strong>${data.jobTitle}</strong> at <strong>${data.companyName}</strong>.
            </p>
            <div style="background: linear-gradient(135deg, #eff6ff, #dbeafe); padding: 20px; border-radius: 12px; margin: 24px 0; border-left: 4px solid #3b82f6;">
              <p style="margin: 5px 0; color: #1e40af;"><strong>📅 Date:</strong> ${data.interviewDate}</p>
              <p style="margin: 5px 0; color: #1e40af;"><strong>⏰ Time:</strong> ${data.interviewTime}</p>
              ${data.meetingLink ? `<p style="margin: 5px 0; color: #1e40af;"><strong>🔗 Meeting:</strong> <a href="${data.meetingLink}" style="color: #3b82f6;">${data.meetingLink}</a></p>` : ''}
            </div>
            <p style="font-size: 14px; color: #64748b;">Please join on time. Good luck!</p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
            <p style="font-size: 14px; color: #64748b; margin-bottom: 0;">
              Best regards,<br><strong style="color: #334155;">InternConnect Placement Team</strong>
            </p>
          </div>
        </div>
      `,
    },
    // Selection/Rejection emails
    candidate_selected: {
      subject: `🎊 Congratulations! You've Been Selected - ${data.companyName}`,
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f8fafc;">
          <div style="background: linear-gradient(135deg, #22c55e, #10b981); padding: 40px; border-radius: 16px 16px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 32px;">🎊 Congratulations!</h1>
            <p style="color: rgba(255,255,255,0.95); margin: 15px 0 0 0; font-size: 18px;">You've Been Selected!</p>
          </div>
          <div style="background: white; padding: 30px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            <p style="font-size: 18px; color: #334155;">Dear <strong>${recipientName}</strong>,</p>
            <p style="font-size: 16px; color: #475569; line-height: 1.6;">
              We are absolutely delighted to inform you that you have been <strong style="color: #22c55e;">SELECTED</strong> for the position of <strong>${data.jobTitle}</strong> at <strong>${data.companyName}</strong>!
            </p>
            <div style="background: linear-gradient(135deg, #f0fdf4, #dcfce7); padding: 24px; border-radius: 12px; margin: 24px 0; text-align: center; border: 2px solid #22c55e;">
              <p style="margin: 0; color: #166534; font-size: 20px; font-weight: bold;">
                🏆 Welcome to ${data.companyName}!
              </p>
            </div>
            <p style="font-size: 16px; color: #475569; line-height: 1.6;">
              The recruiter will contact you soon with further details about the onboarding process, joining date, and other formalities.
            </p>
            <div style="background: linear-gradient(135deg, #eff6ff, #dbeafe); padding: 20px; border-radius: 12px; margin: 24px 0; border-left: 4px solid #3b82f6;">
              <p style="margin: 0; color: #1e40af; font-size: 14px;">
                <strong>📝 What's Next?</strong><br>
                • Keep checking your email for onboarding details<br>
                • Complete any pending documentation<br>
                • Prepare for your new journey!
              </p>
            </div>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
            <p style="font-size: 14px; color: #64748b; margin-bottom: 0;">
              Congratulations once again!<br><strong style="color: #334155;">InternConnect Placement Team</strong>
            </p>
          </div>
        </div>
      `,
    },
    candidate_rejected: {
      subject: `Interview Update - ${data.companyName}`,
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f8fafc;">
          <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Interview Update</h1>
          </div>
          <div style="background: white; padding: 30px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            <p style="font-size: 18px; color: #334155;">Dear <strong>${recipientName}</strong>,</p>
            <p style="font-size: 16px; color: #475569; line-height: 1.6;">
              Thank you for your interest in the <strong>${data.jobTitle}</strong> position at <strong>${data.companyName}</strong> and for taking the time to interview with us.
            </p>
            <p style="font-size: 16px; color: #475569; line-height: 1.6;">
              After careful consideration, we regret to inform you that we have decided to move forward with other candidates whose qualifications more closely match our current requirements.
            </p>
            <div style="background: linear-gradient(135deg, #eff6ff, #dbeafe); padding: 20px; border-radius: 12px; margin: 24px 0; border-left: 4px solid #3b82f6;">
              <p style="margin: 0; color: #1e40af; font-size: 16px;">
                💪 <strong>Keep Going!</strong> This is just one opportunity among many. Continue building your skills and applying to other positions. Your perfect opportunity is out there!
              </p>
            </div>
            <p style="font-size: 14px; color: #64748b; line-height: 1.6;">
              We encourage you to explore other opportunities on our platform and apply for positions that match your profile.
            </p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
            <p style="font-size: 14px; color: #64748b; margin-bottom: 0;">
              We wish you the best in your career journey!<br><strong style="color: #334155;">InternConnect Placement Team</strong>
            </p>
          </div>
        </div>
      `,
    },
    // Application status update
    application_status: {
      subject: `Application Update - ${data.jobTitle}`,
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f8fafc;">
          <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Application Status Update</h1>
          </div>
          <div style="background: white; padding: 30px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            <p style="font-size: 18px; color: #334155;">Dear <strong>${recipientName}</strong>,</p>
            <p style="font-size: 16px; color: #475569; line-height: 1.6;">
              Your application for <strong>${data.jobTitle}</strong> at <strong>${data.companyName}</strong> has been updated.
            </p>
            <div style="background: #f1f5f9; padding: 20px; border-radius: 12px; margin: 24px 0; border-left: 4px solid ${data.status === 'selected' ? '#22c55e' : data.status === 'rejected' ? '#ef4444' : '#6366f1'};">
              <p style="margin: 0; font-size: 18px;"><strong>Status:</strong> <span style="color: ${data.status === 'selected' ? '#22c55e' : data.status === 'rejected' ? '#ef4444' : '#6366f1'}; text-transform: uppercase; font-weight: bold;">${data.status?.replace(/_/g, ' ')}</span></p>
            </div>
            ${data.message ? `<p style="font-size: 14px; color: #64748b;">${data.message}</p>` : ''}
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
            <p style="font-size: 14px; color: #64748b; margin-bottom: 0;">
              Best regards,<br><strong style="color: #334155;">InternConnect Placement Team</strong>
            </p>
          </div>
        </div>
      `,
    },
    // Faculty approved application
    faculty_approved: {
      subject: `✅ Application Approved by Faculty - ${data.jobTitle}`,
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f8fafc;">
          <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">📋 Application Approved</h1>
          </div>
          <div style="background: white; padding: 30px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            <p style="font-size: 18px; color: #334155;">Dear <strong>${recipientName}</strong>,</p>
            <p style="font-size: 16px; color: #475569; line-height: 1.6;">
              Great news! Your application for <strong>${data.jobTitle}</strong> at <strong>${data.companyName}</strong> has been <strong style="color: #22c55e;">approved by your faculty mentor</strong>.
            </p>
            <div style="background: linear-gradient(135deg, #f0fdf4, #dcfce7); padding: 20px; border-radius: 12px; margin: 24px 0; border-left: 4px solid #22c55e;">
              <p style="margin: 0; color: #166534; font-size: 16px;">
                ✅ Your application has been forwarded to the recruiter for further processing.
              </p>
            </div>
            <p style="font-size: 14px; color: #64748b; line-height: 1.6;">
              Keep checking your dashboard for updates on your application status.
            </p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
            <p style="font-size: 14px; color: #64748b; margin-bottom: 0;">
              Best regards,<br><strong style="color: #334155;">InternConnect Placement Team</strong>
            </p>
          </div>
        </div>
      `,
    },
    // Recruiter verified
    recruiter_approved: {
      subject: '✅ Your Recruiter Account Has Been Verified - InternConnect',
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f8fafc;">
          <div style="background: linear-gradient(135deg, #22c55e, #16a34a); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">✅ Account Verified</h1>
          </div>
          <div style="background: white; padding: 30px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            <p style="font-size: 18px; color: #334155;">Dear <strong>${recipientName}</strong>,</p>
            <p style="font-size: 16px; color: #475569; line-height: 1.6;">
              Your recruiter account for <strong>${data.companyName}</strong> has been verified by the Placement Cell.
            </p>
            <p style="font-size: 16px; color: #475569; line-height: 1.6;">
              You can now post jobs and manage candidates on InternConnect.
            </p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
            <p style="font-size: 14px; color: #64748b; margin-bottom: 0;">
              Best regards,<br><strong style="color: #334155;">InternConnect Placement Team</strong>
            </p>
          </div>
        </div>
      `,
    },
    // Job verified
    job_verified: {
      subject: `✅ Job Posting Approved - ${data.jobTitle}`,
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f8fafc;">
          <div style="background: linear-gradient(135deg, #22c55e, #16a34a); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">✅ Job Posting Approved</h1>
          </div>
          <div style="background: white; padding: 30px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            <p style="font-size: 18px; color: #334155;">Dear <strong>${recipientName}</strong>,</p>
            <p style="font-size: 16px; color: #475569; line-height: 1.6;">
              Your job posting for <strong>${data.jobTitle}</strong> has been verified and is now live on InternConnect.
            </p>
            <p style="font-size: 16px; color: #475569; line-height: 1.6;">
              Students can now apply for this position.
            </p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
            <p style="font-size: 14px; color: #64748b; margin-bottom: 0;">
              Best regards,<br><strong style="color: #334155;">InternConnect Placement Team</strong>
            </p>
          </div>
        </div>
      `,
    },
  };

  return templates[type] || {
    subject: 'InternConnect Notification',
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
    console.log('Data:', JSON.stringify(data));

    const emailContent = getEmailContent(type, recipientName, data);

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "InternConnect <onboarding@resend.dev>",
        to: [recipientEmail],
        subject: emailContent.subject,
        html: emailContent.html,
      }),
    });

    const emailResult = await emailResponse.json();

    console.log("Email response:", JSON.stringify(emailResult));

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
        title: emailContent.subject.replace(/[🎉✅❌📅🎊📋💪🏆]/g, '').trim(),
        message: `${type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}: ${data.jobTitle || data.companyName || data.message || 'New notification'}`,
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
