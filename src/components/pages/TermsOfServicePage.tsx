import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, FileText } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface TermsOfServicePageProps {
  onBack: () => void;
}

const TermsOfServicePage: React.FC<TermsOfServicePageProps> = ({ onBack }) => {
  const lastUpdated = 'March 29, 2026';

  return (
    <div className="pb-24">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3 mb-6"
      >
        <button onClick={onBack} className="p-2 rounded-xl hover:bg-muted transition-colors">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          <h1 className="text-xl font-bold text-foreground">Terms of Service</h1>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="space-y-6 text-sm text-muted-foreground leading-relaxed"
      >
        <p className="text-xs">Last updated: {lastUpdated}</p>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">1. Acceptance of Terms</h2>
          <p>
            By accessing or using MiniMind ("the App"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, you may not use the App. These Terms constitute a legally binding agreement between you and MiniMind ("we," "us," or "our").
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">2. Description of Service</h2>
          <p>
            MiniMind is an AI-powered educational platform that provides explanations of topics in multiple modes (Beginner, Thinker, Story, Mastery, and others). The App uses artificial intelligence to generate educational content and is intended for informational and learning purposes only.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">3. User Accounts</h2>
          <p>
            To access certain features, you must create an account. You are responsible for maintaining the confidentiality of your account credentials and for all activities under your account. You must provide accurate and complete information during registration and keep your account information updated.
          </p>
          <p>
            You must be at least 13 years of age to use this App. If you are under 18, you must have parental or guardian consent.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">4. Credit System & Usage</h2>
          <p>
            MiniMind operates on a credit-based system. Each AI interaction consumes credits based on the feature used. Free users receive a daily allocation of credits that resets every 24 hours. Credits are non-transferable and have no monetary value.
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Credits are consumed per AI request, not per response quality</li>
            <li>Unused daily free credits do not roll over to the next day</li>
            <li>Purchased credits are valid as per the plan terms</li>
            <li>We reserve the right to modify credit costs and allocations with prior notice</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">5. Subscriptions & Payments</h2>
          <p>
            MiniMind offers paid subscription plans (Plus, Pro) with additional features and credits. Payments are processed through Razorpay, a third-party payment processor. By subscribing, you agree to:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Pay the applicable subscription fees as displayed at the time of purchase</li>
            <li>Subscriptions auto-renew unless cancelled before the renewal date</li>
            <li>Price changes will be communicated at least 7 days in advance</li>
            <li>All prices are in Indian Rupees (INR) unless stated otherwise</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">6. Acceptable Use</h2>
          <p>You agree NOT to:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Use the App for any unlawful or prohibited purpose</li>
            <li>Attempt to reverse-engineer, decompile, or extract source code</li>
            <li>Abuse the credit system through automated or fraudulent means</li>
            <li>Create multiple accounts to exploit free credit allocations</li>
            <li>Share, resell, or redistribute AI-generated content commercially without permission</li>
            <li>Upload harmful, offensive, or illegal content</li>
            <li>Attempt to bypass security measures or access restrictions</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">7. AI-Generated Content Disclaimer</h2>
          <p>
            All content generated by MiniMind is produced by artificial intelligence and is provided "as is" for educational purposes. We do not guarantee the accuracy, completeness, or reliability of AI-generated responses. AI-generated content should not be used as a substitute for professional advice (medical, legal, financial, or otherwise).
          </p>
          <p>
            You acknowledge that AI may occasionally produce incorrect, misleading, or biased information. Always verify important information from authoritative sources.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">8. Intellectual Property</h2>
          <p>
            The MiniMind brand, logo, design, and underlying technology are owned by us and protected by intellectual property laws. You retain rights to your input queries but grant us a non-exclusive license to process them for service delivery. AI-generated responses are provided for your personal use.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">9. Limitation of Liability</h2>
          <p>
            To the maximum extent permitted by law, MiniMind and its operators shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the App, including but not limited to loss of data, loss of profits, or reliance on AI-generated content.
          </p>
          <p>
            Our total liability shall not exceed the amount you paid to us in the 12 months preceding the claim.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">10. Termination</h2>
          <p>
            We reserve the right to suspend or terminate your account at any time for violation of these Terms, without prior notice. Upon termination, your right to use the App ceases immediately. Any remaining credits or subscription time may be forfeited.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">11. Changes to Terms</h2>
          <p>
            We may update these Terms from time to time. We will notify you of material changes via the App or email. Continued use of the App after changes constitutes acceptance of the revised Terms.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">12. Governing Law</h2>
          <p>
            These Terms are governed by and construed in accordance with the laws of India. Any disputes shall be subject to the exclusive jurisdiction of the courts in India.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">13. Contact Us</h2>
          <p>
            For questions about these Terms, please contact us at:
          </p>
          <p className="font-medium text-foreground">feedback.minimind.app@gmail.com</p>
        </section>
      </motion.div>
    </div>
  );
};

export default TermsOfServicePage;
