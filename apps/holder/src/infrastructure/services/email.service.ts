import TranscriptionCompletedEmail from '@/src/components/emails/TranscriptionCompletedEmail';
import { sendEmail } from '@/src/utils/email/sendEmail';
import { render } from '@react-email/components';

export const sendTranscriptionCompleteNotificationEmail = async (
  linkToTranscribedFile: string,
  userName: string,
  fileName: string,
  email: string
) => {
  const subject = `Transcription completed for ${fileName}`;
  const html = render(
    TranscriptionCompletedEmail({
      linkToTranscribedFile,
      userName,
      fileName,
    })
  );

  await sendEmail({
    to: email,
    subject,
    html,
  });
};
