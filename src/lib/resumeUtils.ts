import { supabase } from '@/integrations/supabase/client';

/**
 * Opens a resume using a signed URL for the private resumes bucket
 * Handles both full Supabase URLs (legacy) and file paths (new format)
 */
export const openResume = async (resumeUrl: string): Promise<{ success: boolean; error?: string }> => {
  if (!resumeUrl) {
    return { success: false, error: 'No resume URL provided' };
  }

  try {
    let filePath = resumeUrl;
    
    // Extract file path if it's a full Supabase URL (legacy format)
    if (resumeUrl.includes('supabase.co/storage')) {
      // Handle both public and private URL formats
      const publicMatch = resumeUrl.match(/\/object\/public\/resumes\/(.+)$/);
      const signedMatch = resumeUrl.match(/\/object\/sign\/resumes\/(.+)\?/);
      const privateMatch = resumeUrl.match(/\/resumes\/(.+)$/);
      
      if (publicMatch) {
        filePath = publicMatch[1];
      } else if (signedMatch) {
        filePath = signedMatch[1];
      } else if (privateMatch) {
        filePath = privateMatch[1];
      }
    }
    
    // Decode URI components in case the path is encoded
    filePath = decodeURIComponent(filePath);
    
    // Always use signed URL since the bucket is private
    const { data, error } = await supabase.storage
      .from('resumes')
      .createSignedUrl(filePath, 3600); // 1 hour expiry
    
    if (error) {
      console.error('Error creating signed URL:', error);
      return { success: false, error: 'Failed to access resume. The file may have been moved or deleted.' };
    }
    
    if (data?.signedUrl) {
      window.open(data.signedUrl, '_blank');
      return { success: true };
    }
    
    return { success: false, error: 'Could not generate download link' };
  } catch (error) {
    console.error('Error opening resume:', error);
    return { success: false, error: 'Failed to open resume' };
  }
};

/**
 * Downloads a resume file
 */
export const downloadResume = async (resumeUrl: string, fileName?: string): Promise<{ success: boolean; error?: string }> => {
  if (!resumeUrl) {
    return { success: false, error: 'No resume URL provided' };
  }

  try {
    let filePath = resumeUrl;
    
    // Extract file path if it's a full Supabase URL
    if (resumeUrl.includes('supabase.co/storage')) {
      const match = resumeUrl.match(/\/resumes\/(.+)$/);
      if (match) {
        filePath = decodeURIComponent(match[1]);
      }
    }
    
    const { data, error } = await supabase.storage
      .from('resumes')
      .download(filePath);
    
    if (error) {
      console.error('Error downloading resume:', error);
      return { success: false, error: 'Failed to download resume' };
    }
    
    if (data) {
      // Create download link
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName || 'resume.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return { success: true };
    }
    
    return { success: false, error: 'No data received' };
  } catch (error) {
    console.error('Error downloading resume:', error);
    return { success: false, error: 'Failed to download resume' };
  }
};
