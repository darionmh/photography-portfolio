import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy",
  description: "Privacy and data use for The Places We Went.",
};

export default function PrivacyPage() {
  return (
    <div className="max-w-prose mx-auto py-8">
      <h1 className="text-2xl font-medium text-foreground mb-6 lowercase">privacy</h1>
      <div className="text-muted text-sm leading-relaxed space-y-4">
        <p>
          This site is a personal photography portfolio. We collect minimal data necessary to run the site and protect it from abuse.
        </p>
        <h2 className="text-lg font-medium text-foreground mt-6 lowercase">reCAPTCHA</h2>
        <p>
          We use Google reCAPTCHA v3 to help prevent automated scraping and abuse. reCAPTCHA may collect and process data (such as IP address and interaction behavior) in accordance with Google’s{" "}
          <a
            href="https://policies.google.com/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-foreground"
          >
            Privacy Policy
          </a>{" "}
          and{" "}
          <a
            href="https://policies.google.com/terms"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-foreground"
          >
            Terms of Service
          </a>
          .
        </p>
        <h2 className="text-lg font-medium text-foreground mt-6 lowercase">analytics</h2>
        <p>
          We use Vercel Analytics and Speed Insights for performance and usage metrics. This may include anonymized page views and performance data.
        </p>
        <p className="pt-4">
          <Link href="/" className="underline hover:text-foreground">
            Back to home
          </Link>
        </p>
      </div>
    </div>
  );
}
