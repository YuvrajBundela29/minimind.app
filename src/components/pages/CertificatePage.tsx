import React, { useState, useEffect } from 'react';
import { Award, Download, Share2, Linkedin, ExternalLink, Lock } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { toast } from 'sonner';
import jsPDF from 'jspdf';

interface Certificate {
  id: string;
  learning_path_name: string;
  mastery_score: number;
  certificate_code: string;
  issued_at: string;
}

const CertificatePage: React.FC = () => {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const { tier } = useSubscription();
  const isPaid = tier === 'plus' || tier === 'pro';

  useEffect(() => {
    const loadCertificates = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data } = await supabase
        .from('certificates')
        .select('*')
        .eq('user_id', user.id)
        .order('issued_at', { ascending: false });

      if (data) setCertificates(data as Certificate[]);
      setLoading(false);
    };
    loadCertificates();
  }, []);

  const handleDownloadPDF = (cert: Certificate) => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    // Background
    doc.setFillColor(250, 250, 255);
    doc.rect(0, 0, 297, 210, 'F');

    // Border
    doc.setDrawColor(59, 130, 246);
    doc.setLineWidth(2);
    doc.rect(10, 10, 277, 190);
    doc.setLineWidth(0.5);
    doc.rect(14, 14, 269, 182);

    // Header
    doc.setFontSize(28);
    doc.setTextColor(59, 130, 246);
    doc.text('MiniMind Learning Certificate', 148.5, 45, { align: 'center' });

    // Divider
    doc.setDrawColor(59, 130, 246);
    doc.setLineWidth(0.5);
    doc.line(80, 55, 217, 55);

    // Body
    doc.setFontSize(14);
    doc.setTextColor(100, 100, 100);
    doc.text('This certifies that', 148.5, 72, { align: 'center' });

    doc.setFontSize(24);
    doc.setTextColor(30, 30, 30);
    doc.text('Student', 148.5, 88, { align: 'center' }); // Would use display_name

    doc.setFontSize(14);
    doc.setTextColor(100, 100, 100);
    doc.text('has successfully completed', 148.5, 103, { align: 'center' });

    doc.setFontSize(20);
    doc.setTextColor(30, 30, 30);
    doc.text(cert.learning_path_name, 148.5, 118, { align: 'center' });

    doc.setFontSize(14);
    doc.setTextColor(100, 100, 100);
    doc.text(`with ${cert.mastery_score}% mastery score`, 148.5, 133, { align: 'center' });

    // Date
    doc.setFontSize(10);
    doc.text(`Issued: ${new Date(cert.issued_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}`, 148.5, 148, { align: 'center' });

    // Certificate ID
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Certificate ID: ${cert.certificate_code}`, 148.5, 158, { align: 'center' });

    // Footer
    doc.setFontSize(10);
    doc.setTextColor(59, 130, 246);
    doc.text('MiniMind AI · Made in India 🇮🇳', 148.5, 175, { align: 'center' });

    doc.save(`MiniMind-Certificate-${cert.certificate_code}.pdf`);
    toast.success('Certificate downloaded!');
  };

  const handleShareLinkedIn = (cert: Certificate) => {
    const text = `I just completed ${cert.learning_path_name} on MiniMind AI! 🎓\nCertificate: minimind.app/verify/${cert.certificate_code}`;
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(`https://minimind.app/verify/${cert.certificate_code}`)}&summary=${encodeURIComponent(text)}`, '_blank');
  };

  const handleShareWhatsApp = (cert: Certificate) => {
    const text = `I just completed ${cert.learning_path_name} on MiniMind AI! 🎓\nMastery Score: ${cert.mastery_score}%\nVerify: minimind.app/verify/${cert.certificate_code}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-[40vh] text-muted-foreground">Loading certificates...</div>;
  }

  return (
    <div className="space-y-4 pb-24 max-w-lg mx-auto">
      <div className="text-center space-y-1 pt-2">
        <div className="flex items-center justify-center gap-2">
          <Award className="w-6 h-6 text-amber-500" />
          <h1 className="text-xl font-bold text-foreground font-[var(--font-heading)]">My Certificates</h1>
        </div>
        <p className="text-xs text-muted-foreground">Earned by completing learning paths</p>
      </div>

      {!isPaid && (
        <Card className="p-5 text-center space-y-3 border-dashed">
          <Lock className="w-8 h-8 text-muted-foreground mx-auto" />
          <p className="text-sm text-muted-foreground">
            Certificates are available on Plus and Pro plans.
          </p>
          <p className="text-xs text-muted-foreground">
            Complete learning paths to earn shareable certificates!
          </p>
        </Card>
      )}

      {certificates.length === 0 && isPaid && (
        <Card className="p-5 text-center space-y-2">
          <Award className="w-10 h-10 text-muted-foreground mx-auto opacity-50" />
          <p className="text-sm text-muted-foreground">No certificates yet</p>
          <p className="text-xs text-muted-foreground">Complete a learning path to earn your first certificate!</p>
        </Card>
      )}

      {certificates.map(cert => (
        <Card key={cert.id} className="p-4 space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-foreground text-sm">{cert.learning_path_name}</h3>
              <p className="text-xs text-muted-foreground">
                {new Date(cert.issued_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            </div>
            <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-xs">
              {cert.mastery_score}% Mastery
            </Badge>
          </div>

          <p className="text-xs text-muted-foreground font-mono">
            {cert.certificate_code}
          </p>

          <div className="flex gap-2">
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
      ))}
    </div>
  );
};

export default CertificatePage;
