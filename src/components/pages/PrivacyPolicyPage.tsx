import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Shield } from 'lucide-react';

interface PrivacyPolicyPageProps {
  onBack: () => void;
}

const PrivacyPolicyPage: React.FC<PrivacyPolicyPageProps> = ({ onBack }) => {
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
          <Shield className="w-5 h-5 text-primary" />
          <h1 className="text-xl font-bold text-foreground">Privacy Policy</h1>
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
          <h2 className="text-base font-semibold text-foreground">1. Introduction</h2>
          <p>
            MiniMind ("we," "us," or "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our AI-powered learning application.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">2. Information We Collect</h2>
          
          <h3 className="text-sm font-medium text-foreground mt-3">2.1 Information You Provide</h3>
          <ul className="list-disc pl-5 space-y-1">
            <li>Account information (email address, display name)</li>
            <li>Profile customization preferences (avatar, theme)</li>
            <li>Queries and topics you search for</li>
            <li>Saved notes and learning history</li>
            <li>Payment information (processed securely through Razorpay)</li>
            <li>Referral codes shared or used</li>
          </ul>

          <h3 className="text-sm font-medium text-foreground mt-3">2.2 Information Collected Automatically</h3>
          <ul className="list-disc pl-5 space-y-1">
            <li>Device information (device type, operating system, browser type)</li>
            <li>Usage data (features used, interaction patterns, session duration)</li>
            <li>Credit usage and subscription activity</li>
            <li>App performance and error logs</li>
            <li>IP address and general location (country/region level)</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">3. How We Use Your Information</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>To provide and improve the MiniMind learning experience</li>
            <li>To process AI queries and generate educational content</li>
            <li>To manage your account, credits, and subscriptions</li>
            <li>To personalize content based on your learning preferences</li>
            <li>To track usage statistics and learning streaks</li>
            <li>To process payments and prevent fraud</li>
            <li>To send important service updates and notifications</li>
            <li>To improve AI response quality and app performance</li>
            <li>To enforce our Terms of Service</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">4. Data Storage & Security</h2>
          <p>
            Your data is stored securely using industry-standard cloud infrastructure with encryption at rest and in transit. We implement appropriate technical and organizational measures to protect your personal data against unauthorized access, alteration, disclosure, or destruction.
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>All data transmissions are encrypted using TLS/SSL</li>
            <li>Database access is protected by Row Level Security (RLS) policies</li>
            <li>Payment data is handled exclusively by Razorpay and never stored on our servers</li>
            <li>API keys and sensitive credentials are stored in secure server-side environments</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">5. Data Sharing & Disclosure</h2>
          <p>We do NOT sell your personal data. We may share information with:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>AI Service Providers:</strong> Your queries are sent to AI models (Google Gemini, OpenAI) for processing. These queries are not linked to your personal identity.</li>
            <li><strong>Payment Processor:</strong> Razorpay processes your payment information securely under their own privacy policy.</li>
            <li><strong>Legal Requirements:</strong> When required by law, court order, or governmental authority.</li>
            <li><strong>Safety:</strong> To protect the rights, property, or safety of MiniMind, our users, or the public.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">6. AI Query Data</h2>
          <p>
            When you submit a query to MiniMind, it is processed by third-party AI models. We want you to know:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Queries are sent to AI providers without your personal identity information</li>
            <li>We log queries for usage tracking and service improvement</li>
            <li>AI providers may use anonymized data to improve their models per their respective policies</li>
            <li>Do not submit sensitive personal, medical, legal, or financial information in your queries</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">7. Your Rights</h2>
          <p>You have the right to:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Access:</strong> Request a copy of the personal data we hold about you</li>
            <li><strong>Correction:</strong> Update or correct inaccurate personal data</li>
            <li><strong>Deletion:</strong> Request deletion of your account and associated data</li>
            <li><strong>Data Portability:</strong> Request your data in a structured, machine-readable format</li>
            <li><strong>Withdraw Consent:</strong> Opt out of non-essential data processing</li>
          </ul>
          <p>
            To exercise any of these rights, contact us at <span className="font-medium text-foreground">feedback.minimind.app@gmail.com</span>.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">8. Cookies & Local Storage</h2>
          <p>
            MiniMind uses local storage and session storage to save your preferences (theme, language), maintain your session, and cache data for performance. We do not use third-party tracking cookies. Essential storage is necessary for the App to function properly.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">9. Children's Privacy</h2>
          <p>
            MiniMind is not intended for children under 13. We do not knowingly collect personal data from children under 13. If you are a parent or guardian and believe your child has provided us with personal data, please contact us to request deletion.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">10. Data Retention</h2>
          <p>
            We retain your data for as long as your account is active or as needed to provide services. Usage logs are retained for up to 12 months. Upon account deletion, your personal data will be removed within 30 days, except where retention is required by law.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">11. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy periodically. We will notify you of significant changes through the App or via email. The "Last updated" date at the top indicates the latest revision.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">12. Contact Us</h2>
          <p>
            For privacy-related inquiries or to exercise your data rights, contact us at:
          </p>
          <p className="font-medium text-foreground">feedback.minimind.app@gmail.com</p>
        </section>
      </motion.div>
    </div>
  );
};

export default PrivacyPolicyPage;
