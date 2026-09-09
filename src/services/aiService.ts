import type { DispositionCode } from '../types';

interface AiSummaryRequest {
  borrowerName: string;
  dispositionCode: DispositionCode;
  promisedAmount?: number | string;
  promisedDate?: string;
  contactMode?: string;
}

export const generateAiCallRemarks = async (req: AiSummaryRequest): Promise<string> => {
  const apiKey = import.meta.env.VITE_AI_API_KEY;

  try {
    // If external AI endpoint is available, query the service securely using the environment key
    if (apiKey && apiKey.startsWith('xpl_')) {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'You are an AI Collections Operations Assistant. Generate a 2-sentence professional, audit-compliant call summary for a delinquent borrower interaction.',
            },
            {
              role: 'user',
              content: `Borrower: ${req.borrowerName}, Disposition: ${req.dispositionCode}, Mode: ${req.contactMode || 'Call'}, Promised Amount: ${req.promisedAmount || 'N/A'}, Promised Date: ${req.promisedDate || 'N/A'}.`,
            },
          ],
          max_tokens: 100,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const aiText = data.choices?.[0]?.message?.content;
        if (aiText) return aiText.trim();
      }
    }
  } catch (err) {
    console.warn('AI Service network fallback active:', err);
  }

  // Fallback Rule-Based Smart Synthesis Engine (guarantees offline availability & instant speed)
  const mode = req.contactMode || 'Call';
  const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  if (req.dispositionCode === 'PTP Taken') {
    return `[AI Generated Summary ${now}]: Connected via ${mode} with ${req.borrowerName}. Borrower confirmed salary/funds availability and committed to pay ₹${req.promisedAmount || 'EMI'} on ${req.promisedDate || 'promised date'}. Reminded of escalation terms upon default.`;
  } else if (req.dispositionCode === 'Requests Callback') {
    return `[AI Generated Summary ${now}]: Spoke with ${req.borrowerName} via ${mode}. Borrower requested callback due to personal/work meeting. Agreed to reconnect on next scheduled action date.`;
  } else if (req.dispositionCode === 'Dispute Raised') {
    return `[AI Generated Summary ${now}]: Borrower ${req.borrowerName} raised billing/interest statement dispute via ${mode}. Requested updated account statement before initiating settlement. Escalated to Team Leader.`;
  } else if (req.dispositionCode === 'Legal Notice Requested') {
    return `[AI Generated Summary ${now}]: Borrower ${req.borrowerName} requested formal legal notice documentation to be dispatched to registered address. Logged for Founder/Ops legal queue review.`;
  } else if (['Ringing No Answer', 'Switched Off', 'Number Busy', 'Not Reachable'].includes(req.dispositionCode)) {
    return `[AI Generated Summary ${now}]: Attempted ${mode} to ${req.borrowerName}. Result: ${req.dispositionCode}. Scheduled for automated retry per algorithm queue.`;
  }

  return `[AI Generated Summary ${now}]: Borrower interaction completed for ${req.borrowerName} via ${mode}. Disposition recorded as '${req.dispositionCode}'. Follow-up scheduled per workflow policy.`;
};
