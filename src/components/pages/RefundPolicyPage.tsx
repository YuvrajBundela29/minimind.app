import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ReceiptText } from 'lucide-react';

interface RefundPolicyPageProps {
  onBack: () => void;
}

const RefundPolicyPage: React.FC<RefundPolicyPageProps> = ({ onBack }) => {
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
          <ReceiptText className="w-5 h-5 text-primary" />
          <h1 className="text-xl font-bold text-foreground">Refund & Cancellation Policy</h1>
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
          <h2 className="text-base font-semibold text-foreground">1. Overview</h2>
          <p>
            This Refund & Cancellation Policy outlines the terms for subscription cancellations, refund eligibility, and credit-related policies for MiniMind. We strive to be fair and transparent in all refund matters.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">2. Subscription Cancellation</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>You may cancel your subscription at any time from your account settings</li>
            <li>Upon cancellation, your subscription benefits remain active until the end of the current billing period</li>
            <li>After the billing period ends, your account will revert to the Free plan</li>
            <li>No partial refunds are provided for unused days within a billing period</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">3. Refund Eligibility</h2>
          <p>Refunds may be granted in the following cases:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Duplicate Charges:</strong> If you were charged twice for the same subscription period</li>
            <li><strong>Technical Issues:</strong> If a payment was processed but the subscription was not activated due to a technical error on our side</li>
            <li><strong>Unauthorized Transactions:</strong> If a charge was made without your authorization</li>
            <li><strong>Within 48 Hours:</strong> If you request a refund within 48 hours of purchase AND have not used more than 10 credits from the subscription</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">4. Non-Refundable Items</h2>
          <p>The following are NOT eligible for refunds:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Credit top-up purchases once credits have been used</li>
            <li>Subscriptions after 48 hours of purchase or after significant credit usage</li>
            <li>Free daily credits (these have no monetary value)</li>
            <li>Referral bonus credits</li>
            <li>Credits consumed due to AI errors or unsatisfactory responses</li>
            <li>Subscriptions cancelled after the billing period has ended</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">5. Credit Top-Up Refunds</h2>
          <p>
            Credit top-up purchases are generally non-refundable once credits have been added to your account. In cases of technical failure where credits were not delivered despite successful payment, a full refund or credit restoration will be provided within 5-7 business days.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">6. How to Request a Refund</h2>
          <p>To request a refund:</p>
          <ol className="list-decimal pl-5 space-y-1">
            <li>Email us at <span className="font-medium text-foreground">feedback.minimind.app@gmail.com</span></li>
            <li>Include your registered email address</li>
            <li>Provide the transaction ID or payment receipt</li>
            <li>Describe the reason for your refund request</li>
          </ol>
          <p className="mt-2">
            We will review your request within 3-5 business days and respond with our decision.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">7. Refund Processing</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Approved refunds will be processed through the original payment method</li>
            <li>Refunds typically take 5-10 business days to appear in your account</li>
            <li>Processing times may vary depending on your bank or payment provider</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">8. Service Interruptions</h2>
          <p>
            In the event of extended service outages (exceeding 24 hours) affecting paid subscribers, we will either extend your subscription period or provide bonus credits as compensation, at our discretion.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">9. Changes to This Policy</h2>
          <p>
            We reserve the right to modify this policy at any time. Changes will be effective upon posting to the App. Continued use after changes constitutes acceptance.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">10. Contact Us</h2>
          <p>For refund requests or questions about this policy:</p>
          <p className="font-medium text-foreground">feedback.minimind.app@gmail.com</p>
        </section>
      </motion.div>
    </div>
  );
};

export default RefundPolicyPage;
