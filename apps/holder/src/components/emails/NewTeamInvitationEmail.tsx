import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Tailwind,
  Text,
} from '@react-email/components';
import * as React from 'react';

const QUALSEARCH_VERCEL_URL = process.env.QUALSEARCH_VERCEL_URL;

interface VercelInviteUserEmailProps {
  invitedByName?: string;
  invitedByEmail?: string;
  teamName?: string;
  inviteLink?: string;
}

export const NewTeamInvitationEmail = ({
  invitedByName,
  invitedByEmail,
  teamName,
  inviteLink,
}: VercelInviteUserEmailProps) => {
  const previewText = `Join ${invitedByName} on QualSearch`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Tailwind>
        <Body className="bg-white my-auto mx-auto font-sans">
          <Container className="border border-solid border-[#eaeaea] rounded my-[40px] mx-auto p-[20px] w-[465px]">
            <Heading className="text-black text-[24px] font-normal text-center p-0 my-[30px] mx-0">
              Join <strong>{teamName}</strong> on <strong>QualSearch</strong>
            </Heading>
            <Text className="text-black text-[14px] leading-[24px]">
              Hello,
            </Text>
            <Text className="text-black text-[14px] leading-[24px]">
              <strong>{invitedByName}</strong> (
              <Link
                href={`mailto:${invitedByEmail}`}
                className="text-blue-600 no-underline"
              >
                {invitedByEmail}
              </Link>
              ) has invited you to the <strong>{teamName}</strong> team on{' '}
              <strong>QualSearch</strong>.
            </Text>
            <Section className="text-center mt-[32px] mb-[32px]">
              <Button
                className="bg-[#000000] rounded text-white text-[12px] font-semibold no-underline text-center px-[20px] py-[12px]"
                href={inviteLink}
              >
                Join the team
              </Button>
            </Section>
            <Text className="text-black text-[14px] leading-[24px]">
              or copy and paste this URL into your browser:{' '}
              <Link href={inviteLink} className="text-blue-600 no-underline">
                {inviteLink}
              </Link>
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

NewTeamInvitationEmail.PreviewProps = {
  invitedByName: 'John Doe',
  invitedByEmail: 'john@doe.com',
  teamName: 'Team Name',
  inviteLink: `${QUALSEARCH_VERCEL_URL}/accept-invite`,
} as VercelInviteUserEmailProps;

export default NewTeamInvitationEmail;
