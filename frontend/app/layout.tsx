import React from "react";
import "./globals.css";

export const metadata = {
  title: "VoiceFlow AI - Multi-Tenant AI Voice Calling Platform",
  description: "An open-source alternative to Vapi, Bland, and Retell AI using LiveKit and FreeSWITCH",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
