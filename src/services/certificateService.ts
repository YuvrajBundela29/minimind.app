import { supabase } from '@/integrations/supabase/client';

interface CertificateResult {
  created: boolean;
  certificateCode?: string;
  error?: string;
}

const buildCertificateCode = (userId: string, achievementRef: string): string => {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const userPart = userId.slice(0, 8).toUpperCase();
  const refPart = achievementRef.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase() || 'ACH';
  const nonce = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `MINI-CERT-${userPart}-${refPart}-${datePart}-${nonce}`;
};

export const ensureLearningPathCertificate = async (
  userId: string,
  learningPathId: string,
  learningPathName: string,
  masteryScore: number,
): Promise<CertificateResult> => {
  const { data: existing, error: existingError } = await supabase
    .from('certificates')
    .select('id, certificate_code')
    .eq('user_id', userId)
    .eq('learning_path_id', learningPathId)
    .limit(1)
    .maybeSingle();

  if (existingError) {
    return { created: false, error: existingError.message };
  }

  if (existing) {
    return { created: false, certificateCode: existing.certificate_code };
  }

  const certificateCode = buildCertificateCode(userId, learningPathId);

  const { error: insertError } = await supabase.from('certificates').insert({
    user_id: userId,
    learning_path_id: learningPathId,
    learning_path_name: learningPathName,
    mastery_score: masteryScore,
    certificate_code: certificateCode,
  });

  if (insertError) {
    return { created: false, error: insertError.message };
  }

  return { created: true, certificateCode };
};

export const ensureBadgeCertificate = async (
  userId: string,
  achievementId: string,
  achievementName: string,
): Promise<CertificateResult> => {
  const learningPathId = `badge:${achievementId}`;
  const learningPathName = achievementName.startsWith('Badge:')
    ? achievementName
    : `Badge: ${achievementName}`;

  return ensureLearningPathCertificate(userId, learningPathId, learningPathName, 100);
};
