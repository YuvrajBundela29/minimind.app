import React, { useState, useEffect } from 'react';
import { Award, Download, Share2, Linkedin, Eye, X } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import { motion, AnimatePresence } from 'framer-motion';

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
  const [viewingCert, setViewingCert] = useState<Certificate | null>(null);

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

  const buildPDF = (cert: Certificate): jsPDF => {
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
      148.5, 94, { align: 'center' }
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
      148.5, 136, { align: 'center' }
    );

    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text(`Certificate ID: ${cert.certificate_code}`, 148.5, 146, { align: 'center' });
    doc.text(`Verify: minimind.app/verify/${cert.certificate_code}`, 148.5, 154, { align: 'center' });

    doc.setFontSize(10);
    doc.setTextColor(37, 99, 235);
    doc.text('MiniMind · Made in India', 148.5, 170, { align: 'center' });

    return doc;
  };

  const handleDownloadPDF = (cert: Certificate) => {
    const doc = buildPDF(cert);
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

  const handleShareWhatsApp = async (cert: Certificate) => {
    try {
      const doc = buildPDF(cert);
      const pdfBlob = doc.output('blob');
      const isBadge = cert.learning_path_id.startsWith('badge:');
      const label = isBadge ? cert.learning_path_name.replace(/^Badge:\s*/, '') : cert.learning_path_name;
      const fileName = `MiniMind-Certificate-${cert.certificate_code}.pdf`;

      // Try native sharing with file (works on mobile)
      if (navigator.share && navigator.canShare) {
        const file = new File([pdfBlob], fileName, { type: 'application/pdf' });
        const shareData = {
          title: `MiniMind Certificate - ${label}`,
          text: `🎓 I earned a MiniMind certificate for ${label}! Mastery: ${cert.mastery_score}%`,
          files: [file],
        };

        if (navigator.canShare(shareData)) {
          await navigator.share(shareData);
          toast.success('Certificate shared!');
          return;
        }
      }

      // Fallback: download the PDF and tell user to share it
      doc.save(fileName);
      toast.info('PDF downloaded! Share it on WhatsApp from your file manager.', { duration: 4000 });
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        console.error('Share failed:', error);
        toast.error('Failed to share certificate');
      }
    }
  };

  // In-app certificate viewer
  const CertificateViewer: React.FC<{ cert: Certificate }> = ({ cert }) => {
    const isBadge = cert.learning_path_id.startsWith('badge:');
    const achievementLabel = isBadge
      ? cert.learning_path_name.replace(/^Badge:\s*/, '')
      : cert.learning_path_name;

    return (
      <AnimatePresence>
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setViewingCert(null)}
        >
          <motion.div
            className="relative w-full max-w-lg bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-900 dark:to-indigo-950 rounded-2xl border-2 border-primary/30 shadow-2xl overflow-hidden"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setViewingCert(null)}
              className="absolute top-3 right-3 p-1.5 rounded-full bg-muted/80 hover:bg-muted z-10"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>

            {/* Certificate content */}
            <div className="p-6 text-center space-y-4">
              {/* Decorative border */}
              <div className="border-2 border-primary/20 rounded-xl p-6 space-y-3 relative">
                {/* Watermark */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
                  <span className="text-6xl font-bold text-primary/5 rotate-[-20deg]">MiniMind</span>
                </div>

                <div className="relative">
                  <Award className="w-12 h-12 text-primary mx-auto mb-2" />

                  <h2 className="text-lg font-bold text-primary">
                    MiniMind Achievement Certificate
                  </h2>

                  <p className="text-xs text-muted-foreground mt-2">This proudly certifies that</p>

                  <p className="text-xl font-bold text-foreground mt-1 font-serif">{displayName}</p>

                  <p className="text-xs text-muted-foreground mt-2">
                    {isBadge ? 'has earned the achievement' : 'has successfully completed the learning path'}
                  </p>

                  <p className="text-lg font-bold text-foreground mt-1">{achievementLabel}</p>

                  <div className="flex items-center justify-center gap-3 mt-3">
                    <Badge className="bg-primary/10 text-primary text-xs">
                      Mastery: {cert.mastery_score}%
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {isBadge ? '🏅 Badge' : '📚 Learning Path'}
                    </Badge>
                  </div>

                  <p className="text-xs text-muted-foreground mt-3">
                    Issued: {new Date(cert.issued_at).toLocaleDateString('en-IN', {
                      day: 'numeric', month: 'long', year: 'numeric'
                    })}
                  </p>

                  <p className="text-[10px] text-muted-foreground font-mono mt-2">
                    {cert.certificate_code}
                  </p>

                  <p className="text-xs text-primary font-medium mt-2">
                    MiniMind · Made in India 🇮🇳
                  </p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => handleDownloadPDF(cert)}>
                  <Download className="w-3 h-3 mr-1" />
                  Download PDF
                </Button>
                <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => handleShareWhatsApp(cert)}>
                  <Share2 className="w-3 h-3 mr-1" />
                  Share PDF
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-[40vh] text-muted-foreground">Loading certificates...</div>;
  }

  return (
    <div className="space-y-4 pb-24 max-w-lg mx-auto">
      {/* In-app viewer */}
      {viewingCert && <CertificateViewer cert={viewingCert} />}

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
              <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => setViewingCert(cert)}>
                <Eye className="w-3 h-3 mr-1" />
                View
              </Button>
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
