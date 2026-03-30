import React, { useState, useEffect } from 'react';
import { Award, Download, Share2, Linkedin } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import jsPDF from 'jspdf';

interface Certificate {
  id: string;
  learning_path_id: string;
  learning_path_name: string;
  mastery_score: number;
  certificate_code: string;
  issued_at: string;
}

const CertificatePage: React.FC = () => {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [displayName, setDisplayName] = useState('Learner');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCertificates = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const [{ data: certData }, { data: profileData }] = await Promise.all([
        supabase
          .from('certificates')
          .select('id, learning_path_id, learning_path_name, mastery_score, certificate_code, issued_at')
          .eq('user_id', user.id)
          .order('issued_at', { ascending: false }),
        supabase
          .from('profiles')
          .select('display_name')
          .eq('user_id', user.id)
          .maybeSingle(),
      ]);

      setDisplayName(
        profileData?.display_name?.trim() ||
        user.email?.split('@')[0] ||
        'Learner'
      );

      if (certData) {
        setCertificates(certData as Certificate[]);
      }

      setLoading(false);
    };

    loadCertificates();
  }, []);

  const handleDownloadPDF = (cert: Certificate) => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const isBadge = cert.learning_path_id.startsWith('badge:');
    const achievementLabel = isBadge
      ? cert.learning_path_name.replace(/^Badge:\s*/, '')
      : cert.learning_path_name;

    doc.setFillColor(249, 250, 255);
    doc.rect(0, 0, 297, 210, 'F');

    doc.setDrawColor(37, 99, 235);
    doc.setLineWidth(2);
    doc.rect(10, 10, 277, 190);
    doc.setLineWidth(0.4);
    doc.rect(14, 14, 269, 182);

    // Watermark
    doc.setFontSize(62);
    doc.setTextColor(229, 231, 245);
    doc.text('MiniMind', 148.5, 122, { align: 'center', angle: 35 });

    doc.setFontSize(28);
    doc.setTextColor(37, 99, 235);
    doc.text('MiniMind Achievement Certificate', 148.5, 42, { align: 'center' });

    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    doc.text('This proudly certifies that', 148.5, 64, { align: 'center' });

    doc.setFontSize(24);
    doc.setTextColor(20, 20, 20);
    doc.text(displayName, 148.5, 80, { align: 'center' });

    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    doc.text(
      isBadge ? 'has earned the achievement' : 'has successfully completed the learning path',
      148.5,
      94,
      { align: 'center' }
    );

    doc.setFontSize(20);
    doc.setTextColor(20, 20, 20);
    doc.text(achievementLabel, 148.5, 108, { align: 'center' });

    doc.setFontSize(12);
    doc.setTextColor(80, 80, 80);
    doc.text(`Mastery Score: ${cert.mastery_score}%`, 148.5, 122, { align: 'center' });

    doc.setFontSize(10);
    doc.setTextColor(90, 90, 90);
    doc.text(
      `Issued: ${new Date(cert.issued_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}`,
      148.5,
      136,
      { align: 'center' }
    );

    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text(`Certificate ID: ${cert.certificate_code}`, 148.5, 146, { align: 'center' });
    doc.text(`Verify: minimind.app/verify/${cert.certificate_code}`, 148.5, 154, { align: 'center' });

    doc.setFontSize(10);
    doc.setTextColor(37, 99, 235);
    doc.text('MiniMind · Made in India', 148.5, 170, { align: 'center' });

    doc.save(`MiniMind-Certificate-${cert.certificate_code}.pdf`);
    toast.success('Certificate downloaded!');
  };

  const handleShareLinkedIn = (cert: Certificate) => {
    const isBadge = cert.learning_path_id.startsWith('badge:');
    const label = isBadge ? cert.learning_path_name.replace(/^Badge:\s*/, '') : cert.learning_path_name;
    const text = `I earned a MiniMind certificate for ${label}! 🎓\nVerify: minimind.app/verify/${cert.certificate_code}`;
    window.open(
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(`https://minimind.app/verify/${cert.certificate_code}`)}&summary=${encodeURIComponent(text)}`,
      '_blank'
    );
  };

  const handleShareWhatsApp = (cert: Certificate) => {
    const isBadge = cert.learning_path_id.startsWith('badge:');
    const label = isBadge ? cert.learning_path_name.replace(/^Badge:\s*/, '') : cert.learning_path_name;
    const text = `I earned a MiniMind certificate for ${label}! 🎓\nMastery: ${cert.mastery_score}%\nVerify: minimind.app/verify/${cert.certificate_code}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-[40vh] text-muted-foreground">Loading certificates...</div>;
  }

  return (
    <div className="space-y-4 pb-24 max-w-lg mx-auto">
      <div className="text-center space-y-1 pt-2">
        <div className="flex items-center justify-center gap-2">
          <Award className="w-6 h-6 text-primary" />
          <h1 className="text-xl font-bold text-foreground font-[var(--font-heading)]">My Certificates</h1>
        </div>
        <p className="text-xs text-muted-foreground">Auto-generated for completed learning paths and unlocked badges</p>
      </div>

      {certificates.length === 0 && (
        <Card className="p-5 text-center space-y-2">
          <Award className="w-10 h-10 text-muted-foreground mx-auto opacity-50" />
          <p className="text-sm text-muted-foreground">No certificates yet</p>
          <p className="text-xs text-muted-foreground">
            Complete a learning path or unlock a badge to auto-generate your first certificate.
          </p>
        </Card>
      )}

      {certificates.map(cert => {
        const isBadge = cert.learning_path_id.startsWith('badge:');
        const achievementLabel = isBadge
          ? cert.learning_path_name.replace(/^Badge:\s*/, '')
          : cert.learning_path_name;

        return (
          <Card key={cert.id} className="relative overflow-hidden p-4 space-y-3">
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-5xl font-bold text-primary/5 select-none">
              MiniMind
            </div>

            <div className="relative flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-foreground text-sm">{achievementLabel}</h3>
                <p className="text-xs text-muted-foreground">Awarded to {displayName}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(cert.issued_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>
              <Badge className="bg-primary/10 text-primary text-xs">
                {isBadge ? 'Badge' : 'Learning Path'} · {cert.mastery_score}%
              </Badge>
            </div>

            <p className="relative text-xs text-muted-foreground font-mono">
              {cert.certificate_code}
            </p>

            <div className="relative flex gap-2">
              <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => handleDownloadPDF(cert)}>
                <Download className="w-3 h-3 mr-1" />
                PDF
              </Button>
              <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => handleShareLinkedIn(cert)}>
                <Linkedin className="w-3 h-3 mr-1" />
                LinkedIn
              </Button>
              <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => handleShareWhatsApp(cert)}>
                <Share2 className="w-3 h-3 mr-1" />
                WhatsApp
              </Button>
            </div>
          </Card>
        );
      })}
    </div>
  );
};

export default CertificatePage;
